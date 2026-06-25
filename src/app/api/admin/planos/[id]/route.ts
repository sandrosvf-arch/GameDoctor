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
      price: annualPrice,
      billingType: "YEARLY" as BillingType,
      accessDurationDays: annualAccessDurationDays,
    } satisfies Prisma.PlanUncheckedUpdateInput,
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const target = await db.plan.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!target) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 })
  }

  const payload = normalizePlanPayload(body)
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }

  const conflict = await db.plan.findFirst({
    where: {
      id: { not: id },
      OR: [{ slug: String(payload.data.slug) }, { name: String(payload.data.name) }],
    },
    select: { id: true },
  })

  if (conflict) {
    return NextResponse.json({ error: "Já existe outro plano com este nome ou slug." }, { status: 409 })
  }

  await db.plan.update({
    where: { id },
    data: payload.data,
  })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "PLAN_UPDATE",
      entityType: "PLAN",
      entityId: id,
      description: `Plano ${target.name} atualizado`,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const target = await db.plan.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!target) {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 })
  }

  const [orderItems, accessPermissions, coupons, requiredByLessons, planCourses, planLessons] = await Promise.all([
    db.orderItem.count({ where: { planId: id } }),
    db.accessPermission.count({ where: { planId: id } }),
    db.coupon.count({ where: { planId: id } }),
    db.lesson.count({ where: { requiredPlanId: id } }),
    db.planCourse.count({ where: { planId: id } }),
    db.planLesson.count({ where: { planId: id } }),
  ])

  if (orderItems || accessPermissions || coupons || requiredByLessons || planCourses || planLessons) {
    return NextResponse.json(
      { error: "Este plano já possui vínculos. Inative ou arquive em vez de excluir." },
      { status: 409 }
    )
  }

  await db.plan.delete({ where: { id } })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "PLAN_DELETE",
      entityType: "PLAN",
      entityId: id,
      description: `Plano ${target.name} removido`,
    },
  })

  return NextResponse.json({ ok: true })
}
