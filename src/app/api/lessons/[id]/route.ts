/**
 * GET /api/lessons/[id]
 * Returns lesson data + sibling modules/lessons for the sidebar.
 * Public route — session is optional.
 * Video URLs are only returned when the user has access (paid or free lesson).
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasAccessToCourse } from "@/lib/access"
import { bunnySignedPlaylistUrl, bunnySignedEmbedUrl } from "@/lib/bunny"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id ?? null

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

  const courseAccess = userId ? await hasAccessToCourse(userId, lesson.courseId) : false
  const isAccessible = lesson.isFree || courseAccess

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
      description: lesson.description,
      durationSeconds: lesson.videoDurationSeconds ?? lesson.durationSeconds,
      // Video URL is always returned so the 7-second preview can play.
      // The paywall overlay is enforced client-side after the preview window.
      // For Bunny, generate signed URLs at serve time (CDN/embed token auth).
      videoEmbedUrl: lesson.videoProvider === "BUNNY" && lesson.videoProviderId
        ? bunnySignedEmbedUrl(lesson.videoProviderId)
        : lesson.videoEmbedUrl,
      videoPlaybackUrl: lesson.videoProvider === "BUNNY" && lesson.videoProviderId
        ? bunnySignedPlaylistUrl(lesson.videoProviderId)
        : lesson.videoPlaybackUrl,
      videoThumbnailUrl: lesson.videoThumbnailUrl,
      isFree: lesson.isFree,
      isAccessible,
      previewEnabled: lesson.previewEnabled,
      // Non-accessible lessons show a 7-second preview before the paywall.
      previewDurationSeconds: isAccessible ? null : 7,
      materials: isAccessible ? lesson.materials : [],
      progress: Array.isArray(lesson.lessonProgress) ? (lesson.lessonProgress[0] ?? null) : null,
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
