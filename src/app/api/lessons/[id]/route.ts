/**
 * GET /api/lessons/[id]
 * Returns full lesson data + sibling modules/lessons for the sidebar.
 * Requires authenticated session (member area).
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

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
                  lessonProgress: {
                    where: { userId: session.user.id },
                    select: { completedAt: true, watchedSeconds: true },
                  },
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
      lessonProgress: {
        where: { userId: session.user.id },
        select: { completedAt: true, watchedSeconds: true },
      },
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

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
      videoEmbedUrl: lesson.videoEmbedUrl,
      videoPlaybackUrl: lesson.videoPlaybackUrl,
      videoThumbnailUrl: lesson.videoThumbnailUrl,
      isFree: lesson.isFree,
      materials: lesson.materials,
      progress: lesson.lessonProgress[0] ?? null,
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
