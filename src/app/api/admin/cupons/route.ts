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
    } satisfies Prisma.CouponUncheckedCreateInput,
  }
}

export async function GET() {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [coupons, plans] = await Promise.all([
    db.coupon.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        planId: true,
        startsAt: true,
        expiresAt: true,
        maxUses: true,
        usesCount: true,
        maxUsesPerUser: true,
        status: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    }),
    db.plan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  return NextResponse.json({
    coupons: coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      planId: coupon.planId,
      startsAt: coupon.startsAt?.toISOString() ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      maxUses: coupon.maxUses,
      usesCount: coupon.usesCount,
      maxUsesPerUser: coupon.maxUsesPerUser,
      status: coupon.status,
      createdAt: coupon.createdAt.toISOString(),
      plan: coupon.plan,
      usage: {
        orders: coupon._count.orders,
      },
    })),
    plans,
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

  const payload = normalizeCouponPayload(body)
  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 })
  }

  const existing = await db.coupon.findUnique({
    where: { code: String(payload.data.code) },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "Já existe um cupom com esse código." }, { status: 409 })
  }

  const created = await db.coupon.create({
    data: payload.data,
    select: { id: true, code: true },
  })

  await db.adminLog.create({
    data: {
      adminUserId: session.user.id,
      action: "COUPON_CREATE",
      entityType: "COUPON",
      entityId: created.id,
      description: `Cupom ${created.code} criado`,
    },
  })

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}
