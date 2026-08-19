import { db } from "@/lib/db"
import { hasActivePlanAccess } from "@/lib/access"
import type { UserRole } from "@prisma/client"

export type AiAccessTier = "FREE" | "PAID" | "STAFF"

export interface AiAccess {
  tier: AiAccessTier
  monthlyCredits: number
  technicalMode: boolean
  maxMessageCharacters: number
}

export interface AiUsageStatus {
  periodStart: Date
  creditsUsed: number
  creditsRemaining: number
  monthlyCredits: number
  requestCount: number
}

const AI_LIMITS = {
  free: {
    monthlyCredits: 3,
    maxMessageCharacters: 800,
    technicalMode: false,
  },
  paid: {
    monthlyCredits: 100,
    maxMessageCharacters: 2_000,
    technicalMode: true,
  },
  staff: {
    monthlyCredits: 1_000,
    maxMessageCharacters: 4_000,
    technicalMode: true,
  },
} as const

function getPeriodStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export async function resolveAiAccess(userId: string, role?: UserRole | null): Promise<AiAccess> {
  if (role === "ADMIN" || role === "EDITOR") {
    return { tier: "STAFF", ...AI_LIMITS.staff }
  }

  const paid = await hasActivePlanAccess(userId)
  return paid
    ? { tier: "PAID", ...AI_LIMITS.paid }
    : { tier: "FREE", ...AI_LIMITS.free }
}

export async function getAiUsageStatus(userId: string, access: AiAccess, date = new Date()): Promise<AiUsageStatus> {
  const periodStart = getPeriodStart(date)
  const usage = await db.aiUsageMonth.findUnique({
    where: { userId_periodStart: { userId, periodStart } },
    select: { creditsUsed: true, requestCount: true },
  })

  const creditsUsed = usage?.creditsUsed ?? 0
  return {
    periodStart,
    creditsUsed,
    creditsRemaining: Math.max(0, access.monthlyCredits - creditsUsed),
    monthlyCredits: access.monthlyCredits,
    requestCount: usage?.requestCount ?? 0,
  }
}

export async function consumeAiCredit(userId: string, access: AiAccess, credits = 1, date = new Date()) {
  if (!Number.isInteger(credits) || credits < 1) {
    throw new Error("Quantidade de créditos inválida.")
  }

  const periodStart = getPeriodStart(date)
  const usage = await db.$transaction(async (transaction) => {
    const current = await transaction.aiUsageMonth.upsert({
      where: { userId_periodStart: { userId, periodStart } },
      create: { userId, periodStart },
      update: {},
      select: { id: true },
    })

    const updated = await transaction.aiUsageMonth.updateMany({
      where: {
        id: current.id,
        creditsUsed: { lte: access.monthlyCredits - credits },
      },
      data: {
        creditsUsed: { increment: credits },
        requestCount: { increment: 1 },
      },
    })

    if (updated.count !== 1) {
      throw new Error("LIMITE_AI_EXCEDIDO")
    }

    return transaction.aiUsageMonth.findUniqueOrThrow({
      where: { id: current.id },
      select: { creditsUsed: true, requestCount: true },
    })
  })

  return {
    periodStart,
    creditsUsed: usage.creditsUsed,
    creditsRemaining: Math.max(0, access.monthlyCredits - usage.creditsUsed),
    monthlyCredits: access.monthlyCredits,
    requestCount: usage.requestCount,
  } satisfies AiUsageStatus
}
