/**
 * GET /api/lessons/[id]
 * Returns lesson data + sibling modules/lessons for the sidebar.
 * Public route — session is optional.
 * Video URLs are only returned when the user has access (paid or free lesson).
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasAccessToLesson } from "@/lib/access"
import { bunnySignedPlaylistUrl, bunnySignedEmbedUrl } from "@/lib/bunny"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id ?? null
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR"

  const { id } = await params

  const lesson = await db.lesson.findUnique({
    where: { id, status: "PUBLISHED" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          modules: {
            where: { status: "ACTIVE" },
            orderBy: { order: "asc" },
            include: {
              lessons: {
                where: { status: "PUBLISHED" },
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  durationSeconds: true,
                  videoDurationSeconds: true,
                  isFree: true,
                  order: true,
                  lessonProgress: userId
                    ? {
                        where: { userId },
                        select: { completedAt: true, watchedSeconds: true },
                      }
                    : false,
                },
              },
            },
          },
        },
      },
      materials: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          fileUrl: true,
          externalUrl: true,
          type: true,
        },
      },
      lessonProgress: userId
        ? {
            where: { userId },
            select: { completedAt: true, watchedSeconds: true },
          }
        : false,
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const lessonAccess = await hasAccessToLesson(userId, id, { isStaff })
  const isAccessible = lessonAccess.hasAccess && !lessonAccess.isPreview
  const canExposeVideo = isAccessible || lessonAccess.isPreview

  // Find prev/next lessons flat across all modules
  const allLessons = lesson.course.modules.flatMap((m) => m.lessons)
  const currentIndex = allLessons.findIndex((l) => l.id === id)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  return NextResponse.json({
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: isAccessible ? lesson.description : null,
      durationSeconds: lesson.videoDurationSeconds ?? lesson.durationSeconds,
      // Only full access or the short preview may receive a video URL.
      // Scheduled lessons never expose a signed URL before release.
      videoEmbedUrl: canExposeVideo && lesson.videoProvider === "BUNNY" && lesson.videoProviderId
        ? bunnySignedEmbedUrl(lesson.videoProviderId, 4 * 3600, { autoplay: true, muted: true })
        : canExposeVideo ? lesson.videoEmbedUrl : null,
      videoPlaybackUrl: canExposeVideo && lesson.videoProvider === "BUNNY" && lesson.videoProviderId
        ? bunnySignedPlaylistUrl(lesson.videoProviderId)
        : canExposeVideo ? lesson.videoPlaybackUrl : null,
      videoThumbnailUrl: lesson.videoThumbnailUrl,
      isFree: lesson.isFree,
      isAccessible,
      previewEnabled: lesson.previewEnabled,
      releaseAfterDays: lesson.releaseAfterDays,
      isReleaseLocked: lessonAccess.isReleaseLocked,
      releaseAt: lessonAccess.releaseAt,
      releaseDaysRemaining: lessonAccess.releaseDaysRemaining,
      previewDurationSeconds: lessonAccess.isPreview ? lessonAccess.previewDurationSeconds : null,
      materials: isAccessible ? lesson.materials : [],
      progress: isAccessible && Array.isArray(lesson.lessonProgress) ? (lesson.lessonProgress[0] ?? null) : null,
    },
    course: {
      id: lesson.course.id,
      title: lesson.course.title,
      slug: lesson.course.slug,
      modules: lesson.course.modules,
    },
    prevLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
    nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
  })
}
