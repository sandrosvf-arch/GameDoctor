import crypto from "node:crypto"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"

const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function getAppUrl() {
  const appUrl = process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim()
    : process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()

  return (appUrl || "http://localhost:3000").replace(/\/$/, "")
}

export async function createPasswordSetupUrl(userId: string, durationMs = RESET_TOKEN_DURATION_MS) {
  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + durationMs)

  await db.passwordResetToken.deleteMany({ where: { userId } })
  await db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } })

  return `${getAppUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true },
  })

  if (!user) return

  const recentToken = await db.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      createdAt: { gt: new Date(Date.now() - 60_000) },
    },
    select: { id: true },
  })
  if (recentToken) return

  const resetUrl = await createPasswordSetupUrl(user.id)

  try {
    await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl })
  } catch (error) {
    await db.passwordResetToken.deleteMany({ where: { userId: user.id } }).catch(() => undefined)
    throw error
  }
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(token)
  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return false
  }

  const passwordHash = await bcrypt.hash(password, 12)

  return db.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })

    if (consumed.count !== 1) return false

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, authProvider: "EMAIL" },
    })
    await tx.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId, id: { not: resetToken.id } },
    })

    return true
  })
}
