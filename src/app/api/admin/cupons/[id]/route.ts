import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { CouponStatus, DiscountType, Prisma } from "@prisma/client"

async function requireAdminOrEditor() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
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

function parseDate(value: unknown) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeCouponPayload(body: Record<string, unknown>) {
  const code = String(body.code ?? "").trim().toUpperCase()
  const discountType = ["PERCENTAGE", "FIXED"].includes(String(body.discountType))
    ? (String(body.discountType) as DiscountType)
    : "PERCENTAGE"
  const discountValue = parseDecimal(body.discountValue)
  const planId = String(body.planId ?? "").trim() || null
  const startsAt = parseDate(body.startsAt)
  const expiresAt = parseDate(body.expiresAt)
  const maxUses = parseInteger(body.maxUses, null)
  const maxUsesPerUser = parseInteger(body.maxUsesPerUser, null)
  const status = ["ACTIVE", "INACTIVE", "EXPIRED"].includes(String(body.status))
    ? (String(body.status) as CouponStatus)
    : "ACTIVE"

  if (!code) {
    return { error: "Informe o código do cupom." }
  }

  if (discountValue === null || discountValue <= 0) {
    return { error: "Informe um valor de desconto válido." }
  }

  if (discountType === "PERCENTAGE" && discountValue > 100) {
    return { error: "O desconto percentual não pode ultrapassar 100%." }
  }

  if (startsAt && expiresAt && expiresAt < startsAt) {
    return { error: "A validade final não pode ser menor que a data inicial." }
  }

  return {
    data: {
      code,
      discountType,
      discountValue,
      planId,
      startsAt,
      expiresAt,
      maxUses: maxUses && maxUses > 0 ? maxUses : null,
      maxUsesPerUser: maxUsesPerUser && maxUsesPerUser > 0 ? maxUsesPerUser : null,
      status,
    } satisfies Prisma.CouponUncheckedUpdateInput,
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

  const target = await db.coupon.findUnique({
    where: { id },
    select: { id: true, code: true },
  })

  if (!target) {
    return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 })
  }

  const payload = normalizeCouponPayload(body)
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }

  const conflict = await db.coupon.findFirst({
    where: {
      id: { not: id },
      code: String(payload.data.code),
    },
    select: { id: true },
  })

  if (conflict) {
    return NextResponse.json({ error: "Já existe outro cupom com esse código." }, { status: 409 })
  }

  await db.coupon.update({
    where: { id },
    data: payload.data,
  })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "COUPON_UPDATE",
      entityType: "COUPON",
      entityId: id,
      description: `Cupom ${target.code} atualizado`,
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

  const target = await db.coupon.findUnique({
    where: { id },
    select: { id: true, code: true },
  })

  if (!target) {
    return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 })
  }

  const orders = await db.order.count({
    where: { couponId: id },
  })

  if (orders > 0) {
    return NextResponse.json(
      { error: "Este cupom já foi usado em pedidos. Inative em vez de excluir." },
      { status: 409 }
    )
  }

  await db.coupon.delete({
    where: { id },
  })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "COUPON_DELETE",
      entityType: "COUPON",
      entityId: id,
      description: `Cupom ${target.code} removido`,
    },
  })

  return NextResponse.json({ ok: true })
}
