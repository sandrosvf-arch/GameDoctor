import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { Prisma } from "@prisma/client"
import type { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { buildCheckoutQuote, createPendingPlanCheckout } from "@/lib/checkout"
import { isValidBrazilianPhone, normalizeBrazilianPhone } from "@/lib/phone"

const PUBLIC_TOKEN_DURATION_MS = 48 * 60 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const MAX_IP_ATTEMPTS = 10
const MAX_EMAIL_ATTEMPTS = 3
export const LIVE_CHECKOUT_COOKIE = "gd_live_checkout"

export type LiveCheckoutIdentity = {
  name: string
  email: string
  phone: string
}

function getRateLimitSecret() {
  const secret = process.env.LIVE_CHECKOUT_RATE_LIMIT_SECRET?.trim()
    || process.env.AUTH_SECRET?.trim()
    || process.env.NEXTAUTH_SECRET?.trim()
  if (!secret) throw new Error("Configure LIVE_CHECKOUT_RATE_LIMIT_SECRET.")
  return secret
}

export function hashLiveCheckoutToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export function setLiveCheckoutCookie(response: NextResponse, token: string) {
  response.cookies.set(LIVE_CHECKOUT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PUBLIC_TOKEN_DURATION_MS / 1000,
  })
  return response
}

export function validateLiveCheckoutToken(token: unknown) {
  const normalized = String(token ?? "").trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("Sessão de checkout inválida.")
  }
  return normalized
}

export function normalizeLiveCheckoutIdentity(value: unknown): LiveCheckoutIdentity {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const name = String(data.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120)
  const email = String(data.email ?? "").trim().toLowerCase().slice(0, 200)
  const phone = normalizeBrazilianPhone(String(data.phone ?? ""))

  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !isValidBrazilianPhone(phone)) {
    throw new Error("Informe nome, e-mail e celular válidos.")
  }

  return { name, email, phone }
}

function getClientFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
  return createHmac("sha256", getRateLimitSecret()).update(address).digest("hex")
}

async function findOrCreateLiveUser(identity: LiveCheckoutIdentity) {
  const existing = await db.user.findUnique({ where: { email: identity.email } })
  if (existing) {
    if (existing.status === "BLOCKED") {
      throw new Error("Não foi possível continuar com este cadastro. Fale com o suporte.")
    }
    return { user: existing, created: false }
  }

  try {
    const user = await db.user.create({
      data: {
        name: identity.name,
        email: identity.email,
        phone: identity.phone,
        authProvider: "EMAIL",
        role: "STUDENT",
        status: "ACTIVE",
      },
    })
    return { user, created: true }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error
    const concurrentUser = await db.user.findUnique({ where: { email: identity.email } })
    if (!concurrentUser || concurrentUser.status === "BLOCKED") {
      throw new Error("Não foi possível continuar com este cadastro. Fale com o suporte.")
    }
    return { user: concurrentUser, created: false }
  }
}

async function enforceLiveCheckoutRateLimit(input: {
  userId: string | null
  clientFingerprintHash: string
}) {
  const createdAt = { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) }
  const [ipAttempts, emailAttempts] = await Promise.all([
    db.order.count({
      where: {
        checkoutChannel: "LIVE",
        clientFingerprintHash: input.clientFingerprintHash,
        createdAt,
      },
    }),
    input.userId
      ? db.order.count({ where: { checkoutChannel: "LIVE", userId: input.userId, createdAt } })
      : Promise.resolve(0),
  ])

  if (ipAttempts >= MAX_IP_ATTEMPTS || emailAttempts >= MAX_EMAIL_ATTEMPTS) {
    throw new Error("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.")
  }
}

export async function getLiveCheckoutQuote(planSlug: string) {
  const normalizedPlanSlug = planSlug.trim()
  if (!normalizedPlanSlug) throw new Error("Plano da oferta não informado.")

  return buildCheckoutQuote({
    userId: null,
    planSlug: normalizedPlanSlug,
    period: "annual",
  })
}

export async function prepareLiveCheckout(input: {
  request: Request
  identity: unknown
  planSlug: string
  accessToken: unknown
  idempotencyKey: string
  gateway: "MERCADOPAGO" | "PAGALEVE"
  paymentMethod: "PIX" | "PIX_INSTALLMENTS" | "CREDIT_CARD"
}) {
  const identity = normalizeLiveCheckoutIdentity(input.identity)
  const planSlug = input.planSlug.trim()
  if (!planSlug) throw new Error("Plano da oferta não informado.")
  const accessToken = validateLiveCheckoutToken(input.accessToken)
  const publicTokenHash = hashLiveCheckoutToken(accessToken)
  const clientFingerprintHash = getClientFingerprint(input.request)

  const existingOrder = await db.order.findFirst({
    where: {
      idempotencyKey: input.idempotencyKey,
      checkoutChannel: "LIVE",
      gateway: input.gateway,
    },
    include: {
      user: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (existingOrder) {
    const received = Buffer.from(publicTokenHash, "hex")
    const stored = Buffer.from(existingOrder.publicTokenHash ?? "", "hex")
    if (received.length !== stored.length || !timingSafeEqual(received, stored)) {
      throw new Error("Sessão de checkout inválida.")
    }
    return {
      user: existingOrder.user,
      createdUser: false,
      checkout: {
        orderId: existingOrder.id,
        paymentId: existingOrder.payments[0]?.id ?? null,
        quote: await buildCheckoutQuote({
          userId: existingOrder.userId,
          planSlug,
          period: "annual",
        }),
      },
      accessToken,
      reused: true,
    }
  }

  const existingUser = await db.user.findUnique({ where: { email: identity.email } })
  await enforceLiveCheckoutRateLimit({
    userId: existingUser?.id ?? null,
    clientFingerprintHash,
  })
  const userResult = await findOrCreateLiveUser(identity)
  const user = userResult.user
  const checkout = await createPendingPlanCheckout({
    userId: user.id,
    planSlug,
    period: "annual",
    idempotencyKey: input.idempotencyKey,
    gateway: input.gateway,
    paymentMethod: input.paymentMethod,
    checkoutChannel: "LIVE",
    publicTokenHash,
    publicTokenExpiresAt: new Date(Date.now() + PUBLIC_TOKEN_DURATION_MS),
    clientFingerprintHash,
  })

  return { user, checkout, accessToken, reused: false, createdUser: userResult.created }
}

export async function findLiveOrderByToken(orderId: string, token: unknown) {
  const normalizedToken = validateLiveCheckoutToken(token)
  const publicTokenHash = hashLiveCheckoutToken(normalizedToken)
  return db.order.findFirst({
    where: {
      id: orderId,
      checkoutChannel: "LIVE",
      publicTokenHash,
      publicTokenExpiresAt: { gt: new Date() },
    },
  })
}
