import { db } from "@/lib/db"
import { BUNNY_CDN_HOST } from "@/lib/constants"
import type { UserRole } from "@prisma/client"

export interface MemberLessonLinkSummary {
  id: string
  title: string
  href: string
  thumbnailUrl: string | null
  videoProviderId: string | null
  durationSeconds: number | null
}

export interface ContinueWatchingItem extends MemberLessonLinkSummary {
  courseId: string
  courseTitle: string
  courseSlug: string
  watchedSeconds: number
  progressPercent: number
  completed: boolean
  lastWatchedAt: string | null
}

export interface CourseProgressSummary {
  id: string
  title: string
  slug: string
  coverImage: string | null
  bannerImage: string | null
  platformName: string | null
  categoryName: string | null
  totalLessons: number
  completedLessons: number
  progressPercent: number
  studySeconds: number
  lastWatchedAt: string | null
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  nextLesson: MemberLessonLinkSummary | null
  lastLesson: MemberLessonLinkSummary | null
}

interface AccessPermissionRecord {
  courseId: string | null
  plan: {
    planCourses: Array<{ courseId: string }>
  } | null
}

interface ProgressRecord {
  courseId: string
  lessonId: string
  watchedSeconds: number
  completed: boolean
  completedAt: Date | null
  lastWatchedAt: Date | null
}

interface CourseRecord {
  id: string
  title: string
  slug: string
  coverImage: string | null
  bannerImage: string | null
  displayOrder: number
  platform: { name: string } | null
  category: { name: string } | null
}

interface LessonRecord {
  id: string
  courseId: string
  title: string
  videoProviderId: string | null
  thumbnail: string | null
  videoThumbnailUrl: string | null
  videoDurationSeconds: number | null
  durationSeconds: number | null
  order: number
  moduleId: string | null
  module: { id: string; order: number } | null
}

function buildLessonHref(lesson: LessonRecord): string {
  return lesson.videoProviderId
    ? `/aula/bunny/${lesson.videoProviderId}`
    : `/aula/${lesson.id}`
}

function buildLessonThumbnail(lesson: LessonRecord): string | null {
  return (
    lesson.thumbnail ??
    lesson.videoThumbnailUrl ??
    (lesson.videoProviderId ? `https://${BUNNY_CDN_HOST}/${lesson.videoProviderId}/thumbnail.jpg` : null)
  )
}

function sortLessons(a: LessonRecord, b: LessonRecord) {
  const aModuleOrder = a.module?.order ?? -1
  const bModuleOrder = b.module?.order ?? -1

  if (aModuleOrder !== bModuleOrder) return aModuleOrder - bModuleOrder
  if (a.order !== b.order) return a.order - b.order
  return a.title.localeCompare(b.title, "pt-BR")
}

function toLessonSummary(lesson: LessonRecord | null): MemberLessonLinkSummary | null {
  if (!lesson) return null

  return {
    id: lesson.id,
    title: lesson.title,
    href: buildLessonHref(lesson),
    thumbnailUrl: buildLessonThumbnail(lesson),
    videoProviderId: lesson.videoProviderId,
    durationSeconds: lesson.videoDurationSeconds ?? lesson.durationSeconds,
  }
}

function toIsoDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null
}

async function getAccessibleCourseIds(userId: string, role?: UserRole) {
  if (role === "ADMIN" || role === "EDITOR") {
    const courses = await db.course.findMany({
      where: {
        status: "PUBLISHED",
        lessons: {
          some: {
            status: "PUBLISHED",
          },
        },
      },
      select: { id: true },
    })

    return courses.map((course) => course.id)
  }

  const now = new Date()

  const accessPermissions = await db.accessPermission.findMany({
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
  }) as AccessPermissionRecord[]

  return Array.from(new Set(
    accessPermissions.flatMap((permission) => [
      ...(permission.courseId ? [permission.courseId] : []),
      ...(permission.plan?.planCourses.map((item) => item.courseId) ?? []),
    ])
  ))
}

export async function getMemberProgressSummary(
  userId: string,
  options?: { continueLimit?: number; role?: UserRole }
) {
  const continueLimit = options?.continueLimit ?? 6
  const accessibleCourseIds = await getAccessibleCourseIds(userId, options?.role)

  if (accessibleCourseIds.length === 0) {
    return {
      accessibleCourseIds,
      continueWatching: [] as ContinueWatchingItem[],
      courseProgress: [] as CourseProgressSummary[],
    }
  }

  const [courses, lessons, allProgress] = await Promise.all([
    db.course.findMany({
      where: { id: { in: accessibleCourseIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        bannerImage: true,
        displayOrder: true,
        platform: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }) as Promise<CourseRecord[]>,
    db.lesson.findMany({
      where: {
        courseId: { in: accessibleCourseIds },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        videoProviderId: true,
        thumbnail: true,
        videoThumbnailUrl: true,
        videoDurationSeconds: true,
        durationSeconds: true,
        order: true,
        moduleId: true,
        module: {
          select: {
            id: true,
            order: true,
          },
        },
      },
    }) as Promise<LessonRecord[]>,
    db.lessonProgress.findMany({
      where: {
        userId,
        courseId: { in: accessibleCourseIds },
      },
      select: {
        courseId: true,
        lessonId: true,
        watchedSeconds: true,
        completed: true,
        completedAt: true,
        lastWatchedAt: true,
      },
    }) as Promise<ProgressRecord[]>,
  ])

  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const progressByLessonId = new Map(allProgress.map((progress) => [progress.lessonId, progress]))
  const lessonsByCourse = new Map<string, LessonRecord[]>()

  for (const lesson of lessons) {
    const items = lessonsByCourse.get(lesson.courseId) ?? []
    items.push(lesson)
    lessonsByCourse.set(lesson.courseId, items)
  }

  for (const items of lessonsByCourse.values()) {
    items.sort(sortLessons)
  }

  const courseProgress = courses.map((course) => {
    const courseLessons = lessonsByCourse.get(course.id) ?? []
    const courseProgressItems = allProgress.filter((item) => item.courseId === course.id)
    const totalLessons = courseLessons.length
    const completedLessons = courseProgressItems.filter((item) => item.completed).length
    const studySeconds = courseProgressItems.reduce((sum, item) => sum + item.watchedSeconds, 0)

    const lastActivity = courseProgressItems.reduce<Date | null>((latest, item) => {
      const candidate = item.lastWatchedAt ?? item.completedAt
      if (!candidate) return latest
      if (!latest || candidate > latest) return candidate
      return latest
    }, null)

    const inProgressLessons = courseProgressItems
      .filter((item) => item.watchedSeconds > 0 && !item.completed)
      .sort((a, b) => {
        const aDate = a.lastWatchedAt?.getTime() ?? 0
        const bDate = b.lastWatchedAt?.getTime() ?? 0
        return bDate - aDate
      })

    const nextIncompleteLesson = courseLessons.find((lesson) => {
      const progress = progressByLessonId.get(lesson.id)
      return !progress?.completed
    }) ?? null

    const lastCompletedLesson = [...courseLessons].reverse().find((lesson) => {
      const progress = progressByLessonId.get(lesson.id)
      return Boolean(progress?.completed)
    }) ?? null

    const inProgressLesson = inProgressLessons.length > 0
      ? lessonsById.get(inProgressLessons[0].lessonId) ?? null
      : null

    const nextLesson = inProgressLesson ?? nextIncompleteLesson ?? lastCompletedLesson

    const lastLesson = courseProgressItems
      .slice()
      .sort((a, b) => {
        const aDate = (a.lastWatchedAt ?? a.completedAt)?.getTime() ?? 0
        const bDate = (b.lastWatchedAt ?? b.completedAt)?.getTime() ?? 0
        return bDate - aDate
      })
      .map((item) => lessonsById.get(item.lessonId) ?? null)
      .find(Boolean) ?? null

    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

    const status: CourseProgressSummary["status"] =
      totalLessons > 0 && completedLessons === totalLessons
        ? "COMPLETED"
        : courseProgressItems.some((item) => item.watchedSeconds > 0 || item.completed)
          ? "IN_PROGRESS"
          : "NOT_STARTED"

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      coverImage: course.coverImage,
      bannerImage: course.bannerImage,
      platformName: course.platform?.name ?? null,
      categoryName: course.category?.name ?? null,
      totalLessons,
      completedLessons,
      progressPercent,
      studySeconds,
      lastWatchedAt: toIsoDate(lastActivity),
      status,
      nextLesson: toLessonSummary(nextLesson),
      lastLesson: toLessonSummary(lastLesson),
    }
  }).sort((a, b) => {
    const rank = (status: CourseProgressSummary["status"]) => {
      if (status === "IN_PROGRESS") return 0
      if (status === "COMPLETED") return 1
      return 2
    }

    const rankDiff = rank(a.status) - rank(b.status)
    if (rankDiff !== 0) return rankDiff

    const aDate = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0
    const bDate = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0
    if (aDate !== bDate) return bDate - aDate

    return a.title.localeCompare(b.title, "pt-BR")
  })

  const progressCandidates = allProgress
    .filter((item) => Boolean(item.lastWatchedAt) && lessonsById.has(item.lessonId))
    .sort((a, b) => (b.lastWatchedAt?.getTime() ?? 0) - (a.lastWatchedAt?.getTime() ?? 0))

  const inProgressCandidates = progressCandidates.filter(
    (item) => item.watchedSeconds > 0 && !item.completed
  )
  const continueSource = inProgressCandidates.length > 0
    ? inProgressCandidates
    : progressCandidates.filter((item) => item.completed || item.watchedSeconds > 0)

  const continueWatching = continueSource.slice(0, continueLimit).map((item) => {
    const lesson = lessonsById.get(item.lessonId)!
    const course = courses.find((entry) => entry.id === item.courseId)!
    const durationSeconds = lesson.videoDurationSeconds ?? lesson.durationSeconds
    const progressPercent = durationSeconds && durationSeconds > 0
      ? Math.min(100, Math.round((item.watchedSeconds / durationSeconds) * 100))
      : item.completed
        ? 100
        : 0

    return {
      id: lesson.id,
      title: lesson.title,
      href: buildLessonHref(lesson),
      thumbnailUrl: buildLessonThumbnail(lesson),
      videoProviderId: lesson.videoProviderId,
      durationSeconds,
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      watchedSeconds: item.watchedSeconds,
      progressPercent,
      completed: item.completed,
      lastWatchedAt: toIsoDate(item.lastWatchedAt ?? item.completedAt),
    }
  })

  return {
    accessibleCourseIds,
    continueWatching,
    courseProgress,
  }
}
