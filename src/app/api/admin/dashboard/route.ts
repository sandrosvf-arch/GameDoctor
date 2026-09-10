import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()

  function saoPauloParts(referenceDate: Date) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .formatToParts(referenceDate)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    )

    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
    }
  }

  function saoPauloDayRange(referenceDate: Date) {
    const parts = saoPauloParts(referenceDate)
    const wallClock = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second))
    const offset = referenceDate.getTime() - wallClock.getTime()
    const start = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) + offset)
    const end = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1) + offset)
    return { start, end }
  }

  function saoPauloMonthStart(monthOffset = 0) {
    const parts = saoPauloParts(now)
    const wallClock = new Date(Date.UTC(parts.year, parts.month - 1 - monthOffset, 1, 12))
    return saoPauloDayRange(wallClock).start
  }

  const currentDay = saoPauloDayRange(now)
  const currentMonthStart = saoPauloMonthStart()
  const previousMonthStart = saoPauloMonthStart(1)
  const activeAccessWhere = {
    status: "ACTIVE" as const,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }
  const approvedPaymentWhere = {
    paymentStatus: "APPROVED" as const,
    order: { archivedAt: null },
  }

  function approvedPaymentInPeriod(start: Date, end: Date) {
    return {
      ...approvedPaymentWhere,
      OR: [
        { paidAt: { gte: start, lt: end } },
        { paidAt: null, createdAt: { gte: start, lt: end } },
      ],
    }
  }

  const monthlyRevenueChart = await Promise.all(
    Array.from({ length: 12 }, (_, index) => 11 - index).map(async (monthOffset) => {
      const start = saoPauloMonthStart(monthOffset)
      const end = monthOffset === 0 ? now : saoPauloMonthStart(monthOffset - 1)
      const res = await db.payment.aggregate({
        _sum: { amount: true },
        where: approvedPaymentInPeriod(start, end),
      })
      return {
        label: format(start, "MMM", { locale: ptBR }),
        value: Number(res._sum.amount ?? 0),
        start: start.toISOString(),
        end: end.toISOString(),
      }
    })
  )

  const currentDateParts = saoPauloParts(now)
  const dailyRevenueChart = await Promise.all(
    Array.from({ length: currentDateParts.day }, (_, index) => index + 1).map(async (day) => {
      const dayReference = new Date(Date.UTC(currentDateParts.year, currentDateParts.month - 1, day, 12))
      const range = saoPauloDayRange(dayReference)
      const res = await db.payment.aggregate({
        _sum: { amount: true },
        where: approvedPaymentInPeriod(range.start, day === currentDateParts.day ? now : range.end),
      })
      return {
        label: `${String(day).padStart(2, "0")}/${String(currentDateParts.month).padStart(2, "0")}`,
        value: Number(res._sum.amount ?? 0),
        start: range.start.toISOString(),
        end: (day === currentDateParts.day ? now : range.end).toISOString(),
      }
    })
  )

  const [
    totalStudents,
    activeAccesses,
    approvedRevenue,
    monthlyRevenue,
    prevMonthRevenue,
    completedLessons,
    totalComments,
    publishedCourses,
    totalLessons,
    draftLessons,
    salesToday,
    recentOrders,
    topCoursesRaw,
    planDistRaw,
    recentLessons,
    recentLogs,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    db.accessPermission.count({ where: activeAccessWhere }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: approvedPaymentWhere,
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: approvedPaymentInPeriod(currentMonthStart, now),
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: approvedPaymentInPeriod(previousMonthStart, currentMonthStart),
    }),
    db.lessonProgress.count({ where: { completed: true } }),
    db.comment.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: "DRAFT" } }),
    db.payment.count({ where: approvedPaymentInPeriod(currentDay.start, now) }),
    db.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: approvedPaymentWhere,
      select: {
        id: true,
        amount: true,
        paidAt: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            user: { select: { name: true, email: true, avatarUrl: true } },
            orderItems: {
              take: 1,
              select: {
                plan: { select: { name: true } },
                course: { select: { title: true } },
              },
            },
          },
        },
      },
    }),
    db.lessonProgress.groupBy({
      by: ["courseId"],
      where: { completed: true },
      _count: { lessonId: true },
      orderBy: { _count: { lessonId: "desc" } },
      take: 5,
    }),
    db.accessPermission.groupBy({
      by: ["planId"],
      _count: { id: true },
      where: { ...activeAccessWhere, planId: { not: null } },
      orderBy: { _count: { id: "desc" } },
    }),
    db.lesson.findMany({
      take: 3,
      orderBy: { updatedAt: "desc" },
      select: {
        title: true, status: true, updatedAt: true,
        course: { select: { title: true } },
        module: { select: { title: true } },
      },
    }),
    db.adminLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        action: true, entityType: true, description: true, createdAt: true,
        adminUser: { select: { name: true } },
      },
    }),
  ])

  // Fetch course names for top courses
  const courseIds = topCoursesRaw.map(c => c.courseId)
  const courses = courseIds.length > 0 ? await db.course.findMany({
    where: { id: { in: courseIds } },
    select: { id: true, title: true, trailColorRgb: true },
  }) : []

  const topCourses = topCoursesRaw.map(c => ({
    id: c.courseId,
    count: c._count.lessonId,
    title: courses.find(co => co.id === c.courseId)?.title ?? "—",
    color: courses.find(co => co.id === c.courseId)?.trailColorRgb ?? null,
  }))

  // Fetch plan names for distribution
  const planIds = planDistRaw.filter(p => p.planId).map(p => p.planId!)
  const plans = planIds.length > 0 ? await db.plan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, name: true },
  }) : []

  const planDistribution = planDistRaw.map(p => ({
    name: plans.find(pl => pl.id === p.planId)?.name ?? "Outro",
    count: p._count.id,
  }))

  const mrr = Number(monthlyRevenue._sum.amount ?? 0)
  const prevMrr = Number(prevMonthRevenue._sum.amount ?? 0)
  const mrrChange = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0

  return NextResponse.json({
    stats: {
      totalStudents,
      activeAccesses,
      approvedRevenue: Number(approvedRevenue._sum.amount ?? 0),
       monthlyRevenue: mrr,
       mrrChange,
       salesToday,
      completedLessons,
      totalComments,
      publishedCourses,
      totalLessons,
      draftLessons,
    },
    monthlyRevenueChart,
    dailyRevenueChart,
    topCourses,
    planDistribution,
    recentOrders: recentOrders.map((payment) => ({
      id: payment.order.id,
      user: payment.order.user,
      plan: payment.order.orderItems[0]?.plan?.name ?? null,
      course: payment.order.orderItems[0]?.course?.title ?? null,
      amount: Number(payment.amount),
      approvedAt: payment.paidAt?.toISOString() ?? payment.createdAt.toISOString(),
    })),
    recentLessons: recentLessons.map(l => ({
      title: l.title,
      course: l.course?.title ?? "—",
      module: l.module?.title ?? null,
      status: l.status,
      updatedAt: l.updatedAt.toISOString(),
    })),
    recentLogs: recentLogs.map(l => ({
      action: l.action,
      entityType: l.entityType,
      description: l.description,
      adminName: l.adminUser?.name ?? "Sistema",
      createdAt: l.createdAt.toISOString(),
    })),
  })
}
