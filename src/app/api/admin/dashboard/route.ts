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

  // Revenue last 12 months (parallel)
  const revenueChart = await Promise.all(
    Array.from({ length: 12 }, (_, i) => 11 - i).map(async (i) => {
      const start = startOfMonth(subMonths(now, i))
      const end = i === 0 ? now : startOfMonth(subMonths(now, i - 1))
      const res = await db.payment.aggregate({
        _sum: { amount: true },
        where: { paymentStatus: "APPROVED", createdAt: { gte: start, lt: end } },
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
    openComments,
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
    db.accessPermission.count({ where: { status: "ACTIVE" } }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "APPROVED", createdAt: { gte: startCurrent } },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "APPROVED", createdAt: { gte: startPrev, lt: startCurrent } },
    }),
    db.lessonProgress.count({ where: { completed: true } }),
    db.comment.count(),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { status: "DRAFT" } }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: { paymentStatus: "APPROVED" },
      select: {
        id: true, finalTotal: true, createdAt: true,
        user: { select: { name: true, email: true, avatarUrl: true } },
        orderItems: {
          take: 1,
          select: {
            plan: { select: { name: true } },
            course: { select: { title: true } },
          },
        },
      },
    }),
    db.lessonProgress.groupBy({
      by: ["courseId"],
      _count: { lessonId: true },
      orderBy: { _count: { lessonId: "desc" } },
      take: 5,
    }),
    db.accessPermission.groupBy({
      by: ["planId"],
      _count: { id: true },
      where: { status: "ACTIVE", planId: { not: null } },
      orderBy: { _count: { id: "desc" } },
    }),
    db.lesson.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
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
      openComments,
      publishedCourses,
      totalLessons,
      draftLessons,
    },
    revenueChart,
    topCourses,
    planDistribution,
    recentOrders: recentOrders.map(o => ({
      id: o.id,
      user: o.user,
      plan: o.orderItems[0]?.plan?.name ?? null,
      course: o.orderItems[0]?.course?.title ?? null,
      amount: Number(o.finalTotal),
      createdAt: o.createdAt.toISOString(),
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
