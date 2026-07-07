import { differenceInCalendarDays } from "date-fns"
import { db } from "@/lib/db"
import type { Coupon, DiscountType, Prisma } from "@prisma/client"

export type CheckoutPeriod = "annual" | "monthly"
type PlanCheckoutPeriodValue = "ANNUAL" | "MONTHLY"

export interface CheckoutQuote {
  plan: {
    id: string
    name: string
    slug: string
    description: string | null
    benefits: string[]
    highlighted: boolean
  }
  period: CheckoutPeriod
  periodLabel: string
  accessDurationDays: number
  subtotal: number
  discountTotal: number
  finalTotal: number
  installments: {
    max: number
    noInterest: number
  }
  coupon: {
    applied: boolean
    code: string | null
    discountType: DiscountType | null
    discountValue: number | null
    message: string | null
  }
  currentPlan: {
    active: boolean
    expiresAt: string | null
    daysRemaining: number | null
  } | null
}

type QuotePlan = {
  id: string
  name: string
  slug: string
  description: string | null
  benefits: string[]
  highlighted: boolean
  status: string
  annualPrice: Prisma.Decimal | null
  monthlyPrice: Prisma.Decimal | null
  monthlyEnabled: boolean
  annualAccessDurationDays: number
  monthlyAccessDurationDays: number | null
  maxInstallments: number
  maxInstallmentsNoInterest: number
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

export function normalizeCheckoutPeriod(value: string | null | undefined): CheckoutPeriod | null {
  if (value === "annual" || value === "monthly") return value
  return null
}

export function toPlanCheckoutPeriod(period: CheckoutPeriod): PlanCheckoutPeriodValue {
  return period === "monthly" ? "MONTHLY" : "ANNUAL"
}

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.NEXTAUTH_URL?.trim()
    || "http://localhost:3000"
  ).replace(/\/+$/, "")
}

function resolvePlanOffer(plan: QuotePlan, period: CheckoutPeriod) {
  if (period === "annual") {
    const subtotal = toNumber(plan.annualPrice)
    if (subtotal <= 0) {
      throw new Error("Este plano não possui preço anual válido.")
    }

    return {
      period,
      periodLabel: "Anual",
      subtotal,
      accessDurationDays: plan.annualAccessDurationDays,
    }
  }

  if (!plan.monthlyEnabled || plan.monthlyPrice === null || toNumber(plan.monthlyPrice) <= 0) {
    throw new Error("Este plano não possui oferta mensal disponível.")
  }

  return {
    period,
    periodLabel: "Mensal",
    subtotal: toNumber(plan.monthlyPrice),
    accessDurationDays: plan.monthlyAccessDurationDays ?? 30,
  }
}

function calculateDiscount(subtotal: number, coupon: Pick<Coupon, "discountType" | "discountValue">) {
  const rawValue = Number(coupon.discountValue)

  if (coupon.discountType === "PERCENTAGE") {
    return Math.min(subtotal, Number(((subtotal * rawValue) / 100).toFixed(2)))
  }

  return Math.min(subtotal, rawValue)
}

async function findCurrentPlanAccess(userId: string, planId: string) {
  const now = new Date()

  const access = await db.accessPermission.findFirst({
    where: {
      userId,
      planId,
      status: "ACTIVE",
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    select: {
      expiresAt: true,
    },
  })

  if (!access) return null

  return {
    active: true,
    expiresAt: access.expiresAt?.toISOString() ?? null,
    daysRemaining: access.expiresAt ? Math.max(0, differenceInCalendarDays(access.expiresAt, now)) : null,
  }
}

async function validateCouponForQuote(input: {
  userId: string
  planId: string
  code?: string | null
  subtotal: number
}) {
  const normalizedCode = input.code?.trim().toUpperCase()

  if (!normalizedCode) {
    return {
      coupon: null,
      discountTotal: 0,
      message: null,
    }
  }

  const now = new Date()
  const coupon = await db.coupon.findUnique({
    where: { code: normalizedCode },
    select: {
      id: true,
      code: true,
      planId: true,
      discountType: true,
      discountValue: true,
      startsAt: true,
      expiresAt: true,
      maxUses: true,
      usesCount: true,
      maxUsesPerUser: true,
      status: true,
    },
  })

  if (!coupon || coupon.status !== "ACTIVE") {
    throw new Error("Cupom inválido ou indisponível.")
  }

  if (coupon.planId && coupon.planId !== input.planId) {
    throw new Error("Esse cupom não é válido para o plano selecionado.")
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    throw new Error("Esse cupom ainda não está disponível.")
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new Error("Esse cupom expirou.")
  }

  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
    throw new Error("Esse cupom atingiu o limite total de usos.")
  }

  if (coupon.maxUsesPerUser !== null) {
    const approvedUsesByUser = await db.order.count({
      where: {
        userId: input.userId,
        couponId: coupon.id,
        paymentStatus: "APPROVED",
      },
    })

    if (approvedUsesByUser >= coupon.maxUsesPerUser) {
      throw new Error("Você já atingiu o limite de uso desse cupom.")
    }
  }

  return {
    coupon,
    discountTotal: calculateDiscount(input.subtotal, coupon),
    message: `Cupom ${coupon.code} aplicado.`,
  }
}

async function getPlanForQuote(planSlug: string) {
  const plan = await db.plan.findUnique({
    where: { slug: planSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      benefits: true,
      highlighted: true,
      status: true,
      annualPrice: true,
      monthlyPrice: true,
      monthlyEnabled: true,
      annualAccessDurationDays: true,
      monthlyAccessDurationDays: true,
      maxInstallments: true,
      maxInstallmentsNoInterest: true,
    },
  })

  if (!plan || plan.status !== "ACTIVE") {
    throw new Error("Plano não encontrado ou indisponível.")
  }

  return plan
}

export async function buildCheckoutQuote(input: {
  userId: string
  planSlug: string
  period: CheckoutPeriod
  couponCode?: string | null
}): Promise<CheckoutQuote> {
  const plan = await getPlanForQuote(input.planSlug)
  const offer = resolvePlanOffer(plan, input.period)
  const [couponResult, currentPlan] = await Promise.all([
    validateCouponForQuote({
      userId: input.userId,
      planId: plan.id,
      code: input.couponCode,
      subtotal: offer.subtotal,
    }),
    findCurrentPlanAccess(input.userId, plan.id),
  ])

  const finalTotal = Math.max(0, Number((offer.subtotal - couponResult.discountTotal).toFixed(2)))

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      benefits: plan.benefits,
      highlighted: plan.highlighted,
    },
    period: offer.period,
    periodLabel: offer.periodLabel,
    accessDurationDays: offer.accessDurationDays,
    subtotal: offer.subtotal,
    discountTotal: couponResult.discountTotal,
    finalTotal,
    installments: {
      max: plan.maxInstallments,
      noInterest: plan.maxInstallmentsNoInterest,
    },
    coupon: {
      applied: Boolean(couponResult.coupon),
      code: couponResult.coupon?.code ?? null,
      discountType: couponResult.coupon?.discountType ?? null,
      discountValue: couponResult.coupon ? Number(couponResult.coupon.discountValue) : null,
      message: couponResult.message,
    },
    currentPlan,
  }
}

export async function createPendingPlanCheckout(input: {
  userId: string
  planSlug: string
  period: CheckoutPeriod
  couponCode?: string | null
}) {
  const quote = await buildCheckoutQuote(input)
  const couponId = quote.coupon.applied
    ? (
      await db.coupon.findUnique({
        where: { code: quote.coupon.code! },
        select: { id: true },
      })
    )?.id ?? null
    : null

  const order = await db.order.create({
    data: {
      userId: input.userId,
      total: quote.subtotal,
      discountTotal: quote.discountTotal,
      finalTotal: quote.finalTotal,
      paymentStatus: "PENDING",
      gateway: "MERCADOPAGO",
      couponId,
      orderItems: {
        create: {
          planId: quote.plan.id,
          planPeriod: toPlanCheckoutPeriod(quote.period),
          price: quote.subtotal,
        },
      },
      payments: {
        create: {
          userId: input.userId,
          gateway: "MERCADOPAGO",
          paymentStatus: "PENDING",
          amount: quote.finalTotal,
          installments: 1,
        },
      },
    },
    select: {
      id: true,
      finalTotal: true,
      payments: {
        take: 1,
        select: {
          id: true,
        },
      },
    },
  })

  return {
    orderId: order.id,
    paymentId: order.payments[0]?.id ?? null,
    quote,
  }
}

export async function listPublicPlans(userId?: string | null) {
  const now = new Date()
  const [plans, activeAccesses] = await Promise.all([
    db.plan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ highlighted: "desc" }, { annualPrice: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        benefits: true,
        highlighted: true,
        annualPrice: true,
        monthlyPrice: true,
        monthlyEnabled: true,
        annualAccessDurationDays: true,
        monthlyAccessDurationDays: true,
        maxInstallments: true,
        maxInstallmentsNoInterest: true,
      },
    }),
    userId
      ? db.accessPermission.findMany({
          where: {
            userId,
            planId: { not: null },
            status: "ACTIVE",
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            planId: true,
            expiresAt: true,
          },
        })
      : Promise.resolve([]),
  ])

  const accessMap = new Map(
    activeAccesses.map((access) => [
      access.planId!,
      {
        active: true,
        expiresAt: access.expiresAt?.toISOString() ?? null,
        daysRemaining: access.expiresAt ? Math.max(0, differenceInCalendarDays(access.expiresAt, now)) : null,
      },
    ])
  )

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    benefits: plan.benefits,
    highlighted: plan.highlighted,
    installments: {
      max: plan.maxInstallments,
      noInterest: plan.maxInstallmentsNoInterest,
    },
    offers: [
      {
        period: "annual" as const,
        label: "Anual",
        price: toNumber(plan.annualPrice),
        accessDurationDays: plan.annualAccessDurationDays,
      },
      ...(plan.monthlyEnabled && plan.monthlyPrice !== null
        ? [{
            period: "monthly" as const,
            label: "Mensal",
            price: toNumber(plan.monthlyPrice),
            accessDurationDays: plan.monthlyAccessDurationDays ?? 30,
          }]
        : []),
    ],
    currentPlan: accessMap.get(plan.id) ?? null,
  }))
}
