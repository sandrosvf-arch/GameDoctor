/**
 * GET /api/member/dashboard
 * Returns all data for the authenticated student's dashboard.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfDay,
  differenceInCalendarDays,
  differenceInDays,
  format,
} from "date-fns"
import { ptBR } from "date-fns/locale"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }
  const userId = session.user.id
  const now = new Date()
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const eightWeeksAgo = subWeeks(thisWeekStart, 7) // 8 weeks total

  // ── Parallel queries ────────────────────────────────────────────────────────
  const [
    user,
    activePlan,
    lastProgressRaw,
    inProgressRaw,
    allProgress,
    thisWeekCompleted,
    prevWeekCompleted,
    thisWeekProgress,
    prevWeekProgress,
    recentCompletions,
    certificates,
    upcomingLessonsRaw,
  ] = await Promise.all([
    // User
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true, email: true },
    }),

    // Active plan access
    db.accessPermission.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: [
        // lifetime/no expiry last, timed first so we show soonest expiry
        { expiresAt: "asc" },
      ],
      include: { plan: { select: { name: true } } },
    }),

    // Last watched lesson (in-progress, most recent)
    db.lessonProgress.findFirst({
      where: { userId, watchedSeconds: { gt: 0 } },
      orderBy: { lastWatchedAt: "desc" },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            videoProviderId: true,
            videoThumbnailUrl: true,
            durationSeconds: true,
            videoDurationSeconds: true,
            course: {
              select: {
                id: true,
                title: true,
                platform: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    // In-progress lessons (for "continue watching" rail)
    db.lessonProgress.findMany({
      where: { userId, completed: false, watchedSeconds: { gt: 0 } },
      orderBy: { lastWatchedAt: "desc" },
      take: 8,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            videoProviderId: true,
            videoThumbnailUrl: true,
            durationSeconds: true,
            videoDurationSeconds: true,
            course: {
              select: {
                id: true,
                title: true,
                trailColorRgb: true,
                platform: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    // All progress for total stats
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

    // This week completed lessons
    db.lessonProgress.count({
      where: {
        userId,
        completed: true,
        completedAt: { gte: thisWeekStart, lte: thisWeekEnd },
      },
    }),

    // Previous week completed lessons
    db.lessonProgress.count({
      where: {
        userId,
        completed: true,
        completedAt: { gte: prevWeekStart, lte: prevWeekEnd },
      },
    }),

    // This week watched seconds
    db.lessonProgress.aggregate({
      where: { userId, lastWatchedAt: { gte: thisWeekStart, lte: thisWeekEnd } },
      _sum: { watchedSeconds: true },
    }),

    // Previous week watched seconds
    db.lessonProgress.aggregate({
      where: { userId, lastWatchedAt: { gte: prevWeekStart, lte: prevWeekEnd } },
      _sum: { watchedSeconds: true },
    }),

    // Recent completions (last 8 weeks for chart)
    db.lessonProgress.findMany({
      where: { userId, completed: true, completedAt: { gte: eightWeeksAgo } },
      select: { completedAt: true, watchedSeconds: true },
      orderBy: { completedAt: "asc" },
    }),

    // Certificates
    db.certificate.findMany({
      where: { userId, status: "ISSUED" },
      orderBy: { issuedAt: "desc" },
      take: 3,
      select: {
        issuedAt: true,
        course: { select: { title: true } },
      },
    }),

    // Upcoming published lessons (not yet completed) - get next few from accessible courses
    db.lesson.findMany({
      where: {
        status: "PUBLISHED",
        lessonProgress: { none: { userId, completed: true } },
      },
      orderBy: [{ course: { displayOrder: "asc" } }, { order: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        durationSeconds: true,
        videoDurationSeconds: true,
        order: true,
        course: {
          select: {
            title: true,
            platform: { select: { name: true } },
          },
        },
      },
    }),
  ])

  // ── Compute streak ───────────────────────────────────────────────────────────
  const activityDays = new Set<string>()
  for (const p of allProgress) {
    if (p.lastWatchedAt) {
      activityDays.add(format(p.lastWatchedAt, "yyyy-MM-dd"))
    }
    if (p.completedAt) {
      activityDays.add(format(p.completedAt, "yyyy-MM-dd"))
    }
  }
  const sortedDays = Array.from(activityDays).sort().reverse()
  let streak = 0
  let bestStreak = 0
  let currentRun = 0
  const todayStr = format(now, "yyyy-MM-dd")
  const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd")

  if (sortedDays.length > 0) {
    // streak: consecutive days up to today/yesterday
    let checkDay = sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr ? sortedDays[0] : null
    if (checkDay) {
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
    // best streak
    currentRun = 1
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      if (differenceInCalendarDays(prev, curr) === 1) {
        currentRun++
      } else {
        if (currentRun > bestStreak) bestStreak = currentRun
        currentRun = 1
      }
    }
    if (currentRun > bestStreak) bestStreak = currentRun
  }

  // ── Compute study time ───────────────────────────────────────────────────────
  const totalStudySeconds = allProgress.reduce((s, p) => s + p.watchedSeconds, 0)
  const weekStudySeconds = thisWeekProgress._sum.watchedSeconds ?? 0
  const prevWeekStudySeconds = prevWeekProgress._sum.watchedSeconds ?? 0

  // ── Compute overall progress ─────────────────────────────────────────────────
  const totalCompleted = allProgress.filter((p) => p.completed).length
  const uniqueCourseIds = [...new Set(allProgress.map((p) => p.courseId))]

  const courseStats = await Promise.all(
    uniqueCourseIds.map(async (courseId) => {
      const [course, totalLessons] = await Promise.all([
        db.course.findUnique({
          where: { id: courseId },
          select: {
            id: true,
            title: true,
            trailColorRgb: true,
            platform: { select: { name: true } },
          },
        }),
        db.lesson.count({ where: { courseId, status: "PUBLISHED" } }),
      ])
      const completedInCourse = allProgress.filter(
        (p) => p.courseId === courseId && p.completed
      ).length
      return {
        id: courseId,
        title: course?.title ?? "Curso",
        platformName: course?.platform?.name ?? null,
        platformColor: course?.trailColorRgb ?? null,
        totalLessons,
        completedLessons: completedInCourse,
        progress: totalLessons > 0 ? Math.round((completedInCourse / totalLessons) * 100) : 0,
      }
    })
  )

  // total available lessons across accessible courses
  const totalLessonsAvailable = courseStats.reduce((s, c) => s + c.totalLessons, 0)
  const overallProgress =
    totalLessonsAvailable > 0 ? Math.round((totalCompleted / totalLessonsAvailable) * 100) : 0

  // avg progress across courses (aproveitamento)
  const avgProgress =
    courseStats.length > 0
      ? Math.round(courseStats.reduce((s, c) => s + c.progress, 0) / courseStats.length)
      : 0

  // ── Weekly chart (last 8 weeks) ──────────────────────────────────────────────
  const weeklyChart: { label: string; seconds: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const wStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const wEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const wSeconds = recentCompletions
      .filter((p) => p.completedAt && p.completedAt >= wStart && p.completedAt <= wEnd)
      .reduce((s, p) => s + p.watchedSeconds, 0)
    weeklyChart.push({
      label: format(wStart, "dd/MM", { locale: ptBR }),
      seconds: wSeconds,
    })
  }

  // ── Plan days remaining ──────────────────────────────────────────────────────
  let planInfo: {
    name: string | null
    daysRemaining: number | null
    expiresAt: string | null
    isLifetime: boolean
  } | null = null

  if (activePlan) {
    const isLifetime = !activePlan.expiresAt
    const daysRemaining =
      activePlan.expiresAt
        ? Math.max(0, differenceInDays(activePlan.expiresAt, now))
        : null
    planInfo = {
      name: activePlan.plan?.name ?? null,
      daysRemaining,
      expiresAt: activePlan.expiresAt?.toISOString() ?? null,
      isLifetime,
    }
  }

  // ── Hero lesson ──────────────────────────────────────────────────────────────
  const heroLesson = lastProgressRaw
    ? {
        id: lastProgressRaw.lesson.id,
        title: lastProgressRaw.lesson.title,
        courseId: lastProgressRaw.lesson.course.id,
        courseTitle: lastProgressRaw.lesson.course.title,
        platformName: lastProgressRaw.lesson.course.platform?.name ?? null,
        thumbnail:
          lastProgressRaw.lesson.thumbnail ??
          lastProgressRaw.lesson.videoThumbnailUrl ??
          null,
        videoProviderId: lastProgressRaw.lesson.videoProviderId ?? null,
        durationSeconds:
          lastProgressRaw.lesson.videoDurationSeconds ??
          lastProgressRaw.lesson.durationSeconds ??
          null,
        watchedSeconds: lastProgressRaw.watchedSeconds,
        progressPct:
          (lastProgressRaw.lesson.videoDurationSeconds ?? lastProgressRaw.lesson.durationSeconds ?? 0) > 0
            ? Math.min(
                100,
                Math.round(
                  (lastProgressRaw.watchedSeconds /
                    ((lastProgressRaw.lesson.videoDurationSeconds ??
                      lastProgressRaw.lesson.durationSeconds)!)) *
                    100
                )
              )
            : 0,
      }
    : null

  // ── Continue watching rail ───────────────────────────────────────────────────
  const continueWatching = inProgressRaw.map((p) => {
    const dur =
      p.lesson.videoDurationSeconds ?? p.lesson.durationSeconds ?? 0
    return {
      id: p.lesson.id,
      title: p.lesson.title,
      courseId: p.lesson.course.id,
      courseTitle: p.lesson.course.title,
      platformName: p.lesson.course.platform?.name ?? null,
      platformColor: p.lesson.course.trailColorRgb ?? null,
      thumbnail: p.lesson.thumbnail ?? p.lesson.videoThumbnailUrl ?? null,
      videoProviderId: p.lesson.videoProviderId ?? null,
      durationSeconds: dur || null,
      watchedSeconds: p.watchedSeconds,
      progressPct: dur > 0 ? Math.min(100, Math.round((p.watchedSeconds / dur) * 100)) : 0,
    }
  })

  // ── Format upcoming ──────────────────────────────────────────────────────────
  const upcomingLessons = upcomingLessonsRaw.map((l) => ({
    id: l.id,
    title: l.title,
    courseTitle: l.course.title,
    platformName: l.course.platform?.name ?? null,
    durationSeconds: l.videoDurationSeconds ?? l.durationSeconds ?? null,
  }))

  // ── Response ─────────────────────────────────────────────────────────────────
  return NextResponse.json({
    user: {
      name: user?.name ?? "Aluno",
      avatarUrl: user?.avatarUrl ?? null,
      email: user?.email ?? "",
    },
    plan: planInfo,
    heroLesson,
    continueWatching,
    stats: {
      totalCompleted,
      weekCompleted: thisWeekCompleted,
      prevWeekCompleted,
      totalStudySeconds,
      weekStudySeconds,
      prevWeekStudySeconds,
      streak,
      bestStreak,
      totalCertificates: certificates.length,
      totalLessonsAvailable,
      overallProgress,
      avgProgress,
    },
    myCourses: courseStats,
    weeklyChart,
    upcomingLessons,
    certificates: certificates.map((c) => ({
      courseTitle: c.course.title,
      issuedAt: c.issuedAt.toISOString(),
    })),
  })
}
