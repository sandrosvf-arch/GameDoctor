import { NextResponse } from "next/server"
import { differenceInCalendarDays, format } from "date-fns"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getMemberProgressSummary } from "@/lib/member-progress"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const userId = session.user.id
  const now = new Date()

  const [user, activeAccess, totalCertificates, progressSummary, allProgress] = await Promise.all([
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
    db.certificate.count({
      where: { userId, status: "ISSUED" },
    }),
    getMemberProgressSummary(userId, {
      continueLimit: 6,
      role: session.user.role,
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
  ])

  const relevantProgress = allProgress.filter((progress) =>
    progressSummary.accessibleCourseIds.includes(progress.courseId)
  )

  const totalStudySeconds = relevantProgress.reduce((sum, progress) => sum + progress.watchedSeconds, 0)
  const totalCompleted = relevantProgress.filter((progress) => progress.completed).length
  const totalLessonsAvailable = progressSummary.courseProgress.reduce(
    (sum, course) => sum + course.totalLessons,
    0
  )
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
      for (let index = 1; index < sortedDays.length; index++) {
        const prev = new Date(sortedDays[index - 1])
        const curr = new Date(sortedDays[index])
        if (differenceInCalendarDays(prev, curr) === 1) {
          streak++
        } else {
          break
        }
      }
    }

    let currentRun = 1
    bestStreak = 1
    for (let index = 1; index < sortedDays.length; index++) {
      const prev = new Date(sortedDays[index - 1])
      const curr = new Date(sortedDays[index])
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
    {
      id: "course",
      label: "Curso 100%",
      earned: progressSummary.courseProgress.some((course) => course.progressPercent === 100),
    },
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
    continueWatching: progressSummary.continueWatching,
    courseProgress: progressSummary.courseProgress,
    myCourses: progressSummary.courseProgress.map((course) => ({
      id: course.id,
      title: course.title,
      platformName: course.platformName,
      platformColor: null,
      totalLessons: course.totalLessons,
      completedLessons: course.completedLessons,
      progress: course.progressPercent,
    })),
  })
}
