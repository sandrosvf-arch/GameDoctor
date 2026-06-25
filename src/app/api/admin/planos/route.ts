import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { BillingType, PlanStatus, Prisma } from "@prisma/client"

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
  const monthlyPrice = parseDecimal(body.monthlyPrice)
  const monthlyEnabled = Boolean(body.monthlyEnabled)
  const annualAccessDurationDays = Math.max(1, parseInteger(body.annualAccessDurationDays, 365) ?? 365)
  const monthlyAccessDurationDays = monthlyEnabled
    ? Math.max(1, parseInteger(body.monthlyAccessDurationDays, 30) ?? 30)
    : null
  const maxInstallments = Math.max(1, parseInteger(body.maxInstallments, 12) ?? 12)
  const maxInstallmentsNoInterest = Math.max(
    0,
    Math.min(maxInstallments, parseInteger(body.maxInstallmentsNoInterest, 1) ?? 1)
  )
  const highlighted = Boolean(body.highlighted)
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

  if (annualPrice === null || annualPrice < 0) {
    return { error: "Informe um valor anual válido." }
  }

  if (monthlyEnabled && (monthlyPrice === null || monthlyPrice < 0)) {
    return { error: "Informe um valor mensal válido para ativar o plano mensal." }
  }

  return {
    data: {
      name,
      slug,
      description,
      annualPrice,
      monthlyPrice: monthlyEnabled ? monthlyPrice : null,
      monthlyEnabled,
      annualAccessDurationDays,
      monthlyAccessDurationDays,
      maxInstallments,
      maxInstallmentsNoInterest,
      highlighted,
      status,
      benefits,
      // Compatibility with the current checkout/access flow.
      price: annualPrice,
      billingType: "YEARLY" as BillingType,
      accessDurationDays: annualAccessDurationDays,
    } satisfies Prisma.PlanUncheckedCreateInput,
  }
}

export async function GET() {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const plans = await db.plan.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      annualPrice: true,
      monthlyPrice: true,
      monthlyEnabled: true,
      annualAccessDurationDays: true,
      monthlyAccessDurationDays: true,
      maxInstallments: true,
      maxInstallmentsNoInterest: true,
      benefits: true,
      status: true,
      highlighted: true,
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
      annualPrice: Number(plan.annualPrice ?? 0),
      monthlyPrice: plan.monthlyPrice === null ? null : Number(plan.monthlyPrice),
      monthlyEnabled: plan.monthlyEnabled,
      annualAccessDurationDays: plan.annualAccessDurationDays,
      monthlyAccessDurationDays: plan.monthlyAccessDurationDays,
      maxInstallments: plan.maxInstallments,
      maxInstallmentsNoInterest: plan.maxInstallmentsNoInterest,
      benefits: plan.benefits,
      status: plan.status,
      highlighted: plan.highlighted,
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
