import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS_PER_IP = 10
const MAX_ATTEMPTS_PER_EMAIL = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

// Keeps the response generic while still doing a password hash comparison
// when the e-mail does not exist.
const DUMMY_PASSWORD_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.3QqG8u4VQfF4hZqH7hC7xQ7yJ6wQ6eO"

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown"
}

function consumeAttempt(key: string, limit: number) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (current.count >= limit) return false
  current.count += 1
  return true
}

function clearExpiredAttempts() {
  const now = Date.now()
  for (const [key, value] of attempts) {
    if (value.resetAt <= now) attempts.delete(key)
  }
}

export async function POST(request: Request) {
  clearExpiredAttempts()

  const body = await request.json().catch(() => null) as {
    email?: unknown
    password?: unknown
  } | null
  const email = String(body?.email ?? "").trim().toLowerCase()
  const password = String(body?.password ?? "")
  const ipKey = `ip:${getClientIp(request)}`
  const emailKey = `email:${email || "empty"}`

  if (!consumeAttempt(ipKey, MAX_ATTEMPTS_PER_IP) || !consumeAttempt(emailKey, MAX_ATTEMPTS_PER_EMAIL)) {
    return NextResponse.json(
      { success: false, status: "rate_limited", error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": "600" } }
    )
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
    return NextResponse.json(
      { success: false, status: "invalid_credentials", error: "E-mail ou senha inválidos." },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
      accessPermissions: {
        where: {
          status: "ACTIVE",
          startsAt: { lte: new Date() },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          accessType: true,
          startsAt: true,
          expiresAt: true,
          plan: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  })

  const passwordMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !passwordMatch) {
    return NextResponse.json(
      { success: false, status: "invalid_credentials", error: "E-mail ou senha inválidos." },
      { status: 401 }
    )
  }

  if (user.status === "BLOCKED") {
    return NextResponse.json(
      { success: false, status: "blocked", error: "A conta não está disponível para acesso." },
      { status: 403 }
    )
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  return NextResponse.json({
    success: true,
    status: "authenticated",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.status,
    },
    access: {
      active: user.accessPermissions.length > 0,
      permissions: user.accessPermissions.map((permission) => ({
        id: permission.id,
        type: permission.accessType,
        startsAt: permission.startsAt.toISOString(),
        expiresAt: permission.expiresAt?.toISOString() ?? null,
        plan: permission.plan,
        course: permission.course,
      })),
    },
  })
}
