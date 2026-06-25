import { NextResponse } from "next/server"
import { differenceInCalendarDays } from "date-fns"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma, UserStatus } from "@prisma/client"

async function requireAdminOrEditor() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: Request) {
  const session = await requireAdminOrEditor()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const now = new Date()

  const page = parsePositiveInt(url.searchParams.get("page"), 1)
  const pageSize = Math.min(parsePositiveInt(url.searchParams.get("pageSize"), 10), 50)
  const query = String(url.searchParams.get("q") ?? "").trim()
  const statusParam = String(url.searchParams.get("status") ?? "all").toUpperCase()
  const subscriptionParam = String(url.searchParams.get("subscription") ?? "all").toLowerCase()

  const activePlanAccessWhere: Prisma.AccessPermissionWhereInput = {
    planId: { not: null },
    status: "ACTIVE",
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }

  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  if (["ACTIVE", "BLOCKED", "INACTIVE", "PENDING"].includes(statusParam)) {
    where.status = statusParam as UserStatus
  }

  if (subscriptionParam === "active") {
    where.accessPermissions = { some: activePlanAccessWhere }
  } else if (subscriptionParam === "inactive") {
    where.accessPermissions = { none: activePlanAccessWhere }
  }

  const totalItems = await db.user.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)

  const [students, totalStudents, activeStudents, blockedStudents, activeSubscriptions] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        accessPermissions: {
          where: { planId: { not: null } },
          orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
          take: 3,
          select: {
            status: true,
            startsAt: true,
            expiresAt: true,
            plan: { select: { name: true } },
          },
        },
      },
    }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.user.count({ where: { role: "STUDENT", status: "BLOCKED" } }),
    db.user.count({
      where: {
        role: "STUDENT",
        accessPermissions: { some: activePlanAccessWhere },
      },
    }),
  ])

  return NextResponse.json({
    summary: {
      totalStudents,
      activeStudents,
      blockedStudents,
      activeSubscriptions,
    },
    students: students.map((student) => {
      const activePlan = student.accessPermissions.find((access) => {
        if (access.status !== "ACTIVE") return false
        if (access.startsAt > now) return false
        if (!access.expiresAt) return true
        return access.expiresAt > now
      }) ?? null
      const latestPlan = student.accessPermissions[0] ?? null
      const expiresAt = activePlan?.expiresAt ?? null
      const daysRemaining = expiresAt ? Math.max(0, differenceInCalendarDays(expiresAt, now)) : null
      const hasExpiredPlan = !activePlan && latestPlan?.expiresAt ? latestPlan.expiresAt <= now : false

      let label = "Sem assinatura ativa"
      if (activePlan) {
        label = expiresAt ? `Expira em ${daysRemaining ?? 0} dias` : "Assinatura ativa"
      } else if (hasExpiredPlan) {
        label = "Expirado"
      }

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
        createdAt: student.createdAt.toISOString(),
        lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
        subscription: {
          active: Boolean(activePlan),
          planName: activePlan?.plan?.name ?? latestPlan?.plan?.name ?? null,
          expiresAt: (activePlan?.expiresAt ?? latestPlan?.expiresAt)?.toISOString() ?? null,
          daysRemaining: activePlan ? daysRemaining : null,
          label,
        },
      }
    }),
    pagination: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: safePage > 1,
      hasNextPage: safePage < totalPages,
    },
    filters: {
      q: query,
      status: ["ACTIVE", "BLOCKED", "INACTIVE", "PENDING"].includes(statusParam) ? statusParam : "all",
      subscription: ["active", "inactive"].includes(subscriptionParam) ? subscriptionParam : "all",
    },
  })
}
