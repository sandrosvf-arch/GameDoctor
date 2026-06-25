import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { startOfMonth, subMonths, format } from "date-fns"
import { ptBR } from "date-fns/locale"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const startCurrent = startOfMonth(now)
  const startPrev = startOfMonth(subMonths(now, 1))
  const activeAccessWhere = {
    status: "ACTIVE" as const,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }

  // Revenue last 12 months (parallel)
  const revenueChart = await Promise.all(
    Array.from({ length: 12 }, (_, i) => 11 - i).map(async (i) => {
      const start = startOfMonth(subMonths(now, i))
      const end = i === 0 ? now : startOfMonth(subMonths(now, i - 1))
      const res = await db.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentStatus: "APPROVED",
          paidAt: { gte: start, lt: end },
        },
      })
      return { month: format(start, "MMM", { locale: ptBR }), value: Number(res._sum.amount ?? 0) }
    })
  )

  const [
    totalStudents,
    activeAccesses,
    monthlyRevenue,
    prevMonthRevenue,
    completedLessons,
    totalComments,
    publishedCourses,
    totalLessons,
    draftLessons,
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
      where: {
        paymentStatus: "APPROVED",
        paidAt: { gte: startCurrent, lte: now },
      },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentStatus: "APPROVED",
        paidAt: { gte: startPrev, lt: startCurrent },
      },
    }),
    db.lessonProgress.count({ where: { completed: true } }),
    db.comment.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: "DRAFT" } }),
    db.payment.findMany({
      take: 5,
      orderBy: { paidAt: "desc" },
      where: { paymentStatus: "APPROVED", paidAt: { not: null } },
      select: {
        id: true,
        amount: true,
        paidAt: true,
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
      monthlyRevenue: mrr,
      mrrChange,
      completedLessons,
      totalComments,
      publishedCourses,
      totalLessons,
      draftLessons,
    },
    revenueChart,
    topCourses,
    planDistribution,
    recentOrders: recentOrders.map((payment) => ({
      id: payment.order.id,
      user: payment.order.user,
      plan: payment.order.orderItems[0]?.plan?.name ?? null,
      course: payment.order.orderItems[0]?.course?.title ?? null,
      amount: Number(payment.amount),
      approvedAt: payment.paidAt?.toISOString() ?? new Date().toISOString(),
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
