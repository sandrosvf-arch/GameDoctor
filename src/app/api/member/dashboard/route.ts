import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { differenceInCalendarDays, format } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const userId = session.user.id
  const now = new Date()

  const [user, activeAccess, accessPermissions, allProgress, totalCertificates] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true, email: true },
    }),
    db.accessPermission.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ expiresAt: "asc" }],
      include: { plan: { select: { name: true } } },
    }),
    db.accessPermission.findMany({
      where: {
        userId,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        courseId: true,
        plan: {
          select: {
            planCourses: {
              select: { courseId: true },
            },
          },
        },
      },
    }),
    db.lessonProgress.findMany({
      where: { userId },
      select: {
        courseId: true,
        completed: true,
        watchedSeconds: true,
        lastWatchedAt: true,
        completedAt: true,
      },
    }),
    db.certificate.count({
      where: { userId, status: "ISSUED" },
    }),
  ])

  const accessibleCourseIds = Array.from(new Set(
    accessPermissions.flatMap((permission) => [
      ...(permission.courseId ? [permission.courseId] : []),
      ...(permission.plan?.planCourses.map((item) => item.courseId) ?? []),
    ])
  ))

  const accessibleCourses = accessibleCourseIds.length > 0
    ? await db.course.findMany({
        where: { id: { in: accessibleCourseIds } },
        select: {
          id: true,
          title: true,
          trailColorRgb: true,
          platform: { select: { name: true } },
          lessons: {
            where: { status: "PUBLISHED" },
            select: { id: true },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      })
    : []

  const relevantProgress = allProgress.filter((progress) => accessibleCourseIds.includes(progress.courseId))

  const totalStudySeconds = relevantProgress.reduce((sum, progress) => sum + progress.watchedSeconds, 0)
  const totalCompleted = relevantProgress.filter((progress) => progress.completed).length

  const courseStats = accessibleCourses.map((course) => {
    const totalLessons = course.lessons.length
    const completedLessons = allProgress.filter(
      (progress) => progress.courseId === course.id && progress.completed
    ).length

    return {
      id: course.id,
      title: course.title,
      platformName: course.platform?.name ?? null,
      platformColor: course.trailColorRgb ?? null,
      totalLessons,
      completedLessons,
      progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    }
  })

  const totalLessonsAvailable = courseStats.reduce((sum, course) => sum + course.totalLessons, 0)
  const overallProgress = totalLessonsAvailable > 0
    ? Math.round((totalCompleted / totalLessonsAvailable) * 100)
    : 0

  const activityDays = new Set<string>()
  for (const progress of relevantProgress) {
    if (progress.lastWatchedAt) activityDays.add(format(progress.lastWatchedAt, "yyyy-MM-dd"))
    if (progress.completedAt) activityDays.add(format(progress.completedAt, "yyyy-MM-dd"))
  }

  const sortedDays = Array.from(activityDays).sort().reverse()
  let streak = 0
  let bestStreak = 0

  const todayStr = format(now, "yyyy-MM-dd")
  const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd")

  if (sortedDays.length > 0) {
    const firstDay = sortedDays[0]
    if (firstDay === todayStr || firstDay === yesterdayStr) {
      streak = 1
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1])
        const curr = new Date(sortedDays[i])
        if (differenceInCalendarDays(prev, curr) === 1) {
          streak++
        } else {
          break
        }
      }
    }

    let currentRun = 1
    bestStreak = 1
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      if (differenceInCalendarDays(prev, curr) === 1) {
        currentRun++
      } else {
        bestStreak = Math.max(bestStreak, currentRun)
        currentRun = 1
      }
    }
    bestStreak = Math.max(bestStreak, currentRun)
  }

  const achievements = [
    { id: "first", label: "Primeiro passo", earned: totalCompleted >= 1 },
    { id: "ten", label: "10 aulas concluídas", earned: totalCompleted >= 10 },
    { id: "fifty", label: "50 aulas concluídas", earned: totalCompleted >= 50 },
    { id: "course", label: "Curso 100%", earned: courseStats.some((course) => course.progress === 100) },
    { id: "streak7", label: "7 dias seguidos", earned: streak >= 7 || bestStreak >= 7 },
    { id: "streak30", label: "30 dias seguidos", earned: bestStreak >= 30 },
  ]

  const earnedAchievements = achievements.filter((achievement) => achievement.earned)

  let planInfo: {
    name: string | null
    daysRemaining: number | null
    expiresAt: string | null
    isLifetime: boolean
  } | null = null

  if (activeAccess) {
    const isLifetime = !activeAccess.expiresAt
    const daysRemaining = activeAccess.expiresAt
      ? Math.max(0, differenceInCalendarDays(activeAccess.expiresAt, now))
      : null

    planInfo = {
      name: activeAccess.plan?.name ?? null,
      daysRemaining,
      expiresAt: activeAccess.expiresAt?.toISOString() ?? null,
      isLifetime,
    }
  }

  return NextResponse.json({
    user: {
      name: user?.name ?? "Aluno",
      avatarUrl: user?.avatarUrl ?? null,
      email: user?.email ?? "",
    },
    plan: planInfo,
    stats: {
      totalCompleted,
      totalStudySeconds,
      totalCertificates,
      totalLessonsAvailable,
      overallProgress,
      streak,
      bestStreak,
      earnedAchievements: earnedAchievements.length,
      totalAchievements: achievements.length,
      achievements,
    },
    myCourses: courseStats,
  })
}
