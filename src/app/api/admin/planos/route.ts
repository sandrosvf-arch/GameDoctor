import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { BillingType, PlanStatus, Prisma } from "@prisma/client"

type PeriodAvailability = "ANNUAL" | "MONTHLY" | "BOTH"
type OfferPeriod = "annual" | "monthly"

function normalizeOfferOrder(value: unknown, activePeriods: OfferPeriod[]) {
  const requested = Array.isArray(value)
    ? value.filter((period): period is OfferPeriod => period === "annual" || period === "monthly")
    : []
  return [...new Set([...requested, ...activePeriods])].filter((period) => activePeriods.includes(period))
}

async function requireAdminOrEditor() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseDecimal(value: unknown) {
  const normalized = String(value ?? "").trim().replace(",", ".")
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: unknown, fallback: number | null = null) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

function normalizePlanPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim()
  const slug = slugify(String(body.slug ?? name))
  const description = String(body.description ?? "").trim() || null
  const annualPrice = parseDecimal(body.annualPrice)
  const annualPixPrice = parseDecimal(body.annualPixPrice)
  const annualCardPrice = parseDecimal(body.annualCardPrice)
  const annualBoletoPrice = parseDecimal(body.annualBoletoPrice)
  const annualPixInstallmentPrice = parseDecimal(body.annualPixInstallmentPrice)
  const rawCardInstallmentTotal = parseDecimal(body.cardInstallmentTotal)
  const annualInstallmentAmount = parseDecimal(body.annualInstallmentAmount)
  const monthlyPrice = parseDecimal(body.monthlyPrice)
  const requestedAvailability = String(body.periodAvailability ?? "").toUpperCase()
  const periodAvailability = (["ANNUAL", "MONTHLY", "BOTH"].includes(requestedAvailability)
    ? requestedAvailability
    : annualPrice === null && Boolean(body.monthlyEnabled)
      ? "MONTHLY"
      : Boolean(body.monthlyEnabled)
        ? "BOTH"
        : "ANNUAL") as PeriodAvailability
  const annualEnabled = periodAvailability !== "MONTHLY"
  const monthlyEnabled = periodAvailability !== "ANNUAL"
  const annualDisplayOrder = Math.max(1, Math.min(999, parseInteger(body.annualDisplayOrder, 2) ?? 2))
  const monthlyDisplayOrder = Math.max(1, Math.min(999, parseInteger(body.monthlyDisplayOrder, 1) ?? 1))
  const planOrder = Math.max(0, Math.min(999999, parseInteger(body.planOrder, 0) ?? 0))
  const activePeriods: OfferPeriod[] = [
    ...(annualEnabled ? ["annual" as const] : []),
    ...(monthlyEnabled ? ["monthly" as const] : []),
  ]
  const offerOrder = normalizeOfferOrder(body.offerOrder, activePeriods)
  const annualAccessDurationDays = Math.max(1, parseInteger(body.annualAccessDurationDays, 365) ?? 365)
  const monthlyAccessDurationDays = monthlyEnabled
    ? Math.max(1, parseInteger(body.monthlyAccessDurationDays, 30) ?? 30)
    : null
  const maxInstallments = Math.min(12, Math.max(1, parseInteger(body.maxInstallments, 12) ?? 12))
  const cardInstallmentTotal = annualInstallmentAmount !== null
    ? Number((annualInstallmentAmount * maxInstallments).toFixed(2))
    : rawCardInstallmentTotal
  const maxInstallmentsNoInterest = Math.max(
    0,
    Math.min(maxInstallments, parseInteger(body.maxInstallmentsNoInterest, 1) ?? 1)
  )
  const highlighted = Boolean(body.highlighted)
  const showOnPlans = body.showOnPlans !== false
  const status = ["ACTIVE", "INACTIVE", "ARCHIVED"].includes(String(body.status))
    ? (String(body.status) as PlanStatus)
    : "ACTIVE"
  const benefits = Array.isArray(body.benefits)
    ? body.benefits.map((item) => String(item).trim()).filter(Boolean)
    : []

  if (!name) {
    return { error: "O nome do plano é obrigatório." }
  }

  if (!slug) {
    return { error: "Não foi possível gerar um slug válido para o plano." }
  }

  if (annualEnabled && (annualPrice === null || annualPrice <= 0)) {
    return { error: "Informe um valor anual válido." }
  }

  if ([annualPixPrice, annualCardPrice, annualBoletoPrice, annualPixInstallmentPrice]
    .some((value) => value !== null && value < 0)) {
    return { error: "Os valores por forma de pagamento devem ser vÃ¡lidos." }
  }

  const annualCardBasePrice = annualCardPrice ?? annualPrice
  if (annualEnabled && annualCardBasePrice !== null && cardInstallmentTotal !== null && cardInstallmentTotal < annualCardBasePrice) {
    return { error: "O valor total parcelado deve ser igual ou maior que o valor anual no cartÃ£o." }
  }

  if (monthlyEnabled && (monthlyPrice === null || monthlyPrice <= 0)) {
    return { error: "Informe um valor mensal válido para ativar o plano mensal." }
  }

  return {
    data: {
      name,
      slug,
      description,
      annualPrice: annualEnabled ? annualPrice : null,
      annualPixPrice: annualEnabled ? annualPixPrice ?? annualPrice : null,
      annualCardPrice: annualEnabled ? annualCardPrice ?? annualPrice : null,
      annualBoletoPrice: annualEnabled ? annualBoletoPrice ?? annualPrice : null,
      annualPixInstallmentPrice: annualEnabled ? annualPixInstallmentPrice ?? cardInstallmentTotal ?? annualPrice : null,
      cardInstallmentTotal: annualEnabled ? cardInstallmentTotal ?? annualPixInstallmentPrice ?? annualPrice : null,
      monthlyPrice: monthlyEnabled ? monthlyPrice : null,
      monthlyEnabled,
      offerOrder,
      annualDisplayOrder,
      monthlyDisplayOrder,
      planOrder,
      annualAccessDurationDays,
      monthlyAccessDurationDays,
      maxInstallments,
      maxInstallmentsNoInterest,
      highlighted,
      showOnPlans,
      status,
      benefits,
      // Compatibility with the current checkout/access flow.
      price: annualEnabled ? annualPrice : monthlyPrice,
      billingType: (annualEnabled ? "YEARLY" : "MONTHLY") as BillingType,
      accessDurationDays: annualEnabled ? annualAccessDurationDays : monthlyAccessDurationDays,
    } satisfies Prisma.PlanUncheckedCreateInput,
  }
}

export async function GET() {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const plans = await db.plan.findMany({
    orderBy: [{ planOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      annualPrice: true,
      annualPixPrice: true,
      annualCardPrice: true,
      annualBoletoPrice: true,
      annualPixInstallmentPrice: true,
      cardInstallmentTotal: true,
      monthlyPrice: true,
      monthlyEnabled: true,
      offerOrder: true,
      annualDisplayOrder: true,
      monthlyDisplayOrder: true,
      planOrder: true,
      annualAccessDurationDays: true,
      monthlyAccessDurationDays: true,
      maxInstallments: true,
      maxInstallmentsNoInterest: true,
      benefits: true,
      status: true,
      highlighted: true,
      showOnPlans: true,
      createdAt: true,
      _count: {
        select: {
          orderItems: true,
          accessPermissions: true,
          coupons: true,
        },
      },
    },
  })

  return NextResponse.json({
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      annualPrice: plan.annualPrice === null ? null : Number(plan.annualPrice),
      annualPixPrice: plan.annualPixPrice === null ? null : Number(plan.annualPixPrice),
      annualCardPrice: plan.annualCardPrice === null ? null : Number(plan.annualCardPrice),
      annualBoletoPrice: plan.annualBoletoPrice === null ? null : Number(plan.annualBoletoPrice),
      annualPixInstallmentPrice: plan.annualPixInstallmentPrice === null ? null : Number(plan.annualPixInstallmentPrice),
      cardInstallmentTotal: plan.cardInstallmentTotal === null ? null : Number(plan.cardInstallmentTotal),
      annualInstallmentAmount: plan.cardInstallmentTotal === null
        ? null
        : Number((Number(plan.cardInstallmentTotal) / plan.maxInstallments).toFixed(2)),
      monthlyPrice: plan.monthlyPrice === null ? null : Number(plan.monthlyPrice),
      monthlyEnabled: plan.monthlyEnabled,
      offerOrder: plan.offerOrder,
      annualDisplayOrder: plan.annualDisplayOrder,
      monthlyDisplayOrder: plan.monthlyDisplayOrder,
      planOrder: plan.planOrder,
      periodAvailability: plan.annualPrice === null ? "MONTHLY" : plan.monthlyEnabled ? "BOTH" : "ANNUAL",
      annualAccessDurationDays: plan.annualAccessDurationDays,
      monthlyAccessDurationDays: plan.monthlyAccessDurationDays,
      maxInstallments: plan.maxInstallments,
      maxInstallmentsNoInterest: plan.maxInstallmentsNoInterest,
      benefits: plan.benefits,
      status: plan.status,
      highlighted: plan.highlighted,
      showOnPlans: plan.showOnPlans,
      createdAt: plan.createdAt.toISOString(),
      usage: {
        orderItems: plan._count.orderItems,
        accessPermissions: plan._count.accessPermissions,
        coupons: plan._count.coupons,
      },
    })),
  })
}

export async function POST(request: Request) {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const payload = normalizePlanPayload(body)
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }

  const existing = await db.plan.findFirst({
    where: {
      OR: [{ slug: payload.data.slug }, { name: payload.data.name }],
    },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "Já existe um plano com este nome ou slug." }, { status: 409 })
  }

  const created = await db.plan.create({
    data: payload.data,
    select: { id: true, name: true },
  })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "PLAN_CREATE",
      entityType: "PLAN",
      entityId: created.id,
      description: `Plano ${created.name} criado`,
    },
  })

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
