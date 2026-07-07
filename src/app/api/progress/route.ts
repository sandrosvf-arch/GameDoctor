/**
 * POST /api/progress
 *
 * Save lesson progress for the authenticated user.
 * Called periodically by the video player.
 *
 * Body: { lessonId, watchedSeconds, completed? }
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasAccessToLesson } from "@/lib/access"
import { z } from "zod"

const schema = z.object({
  lessonId: z.string().min(1),
  watchedSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
  }

  const { lessonId, watchedSeconds, completed } = result.data
  const userId = session.user.id

  // Validate user has access before saving progress
  const { hasAccess, isPreview } = await hasAccessToLesson(userId, lessonId)
  if (!hasAccess) {
    return NextResponse.json({ error: "NO_ACCESS" }, { status: 403 })
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true, durationSeconds: true, videoDurationSeconds: true },
  })
  if (!lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const existingProgress = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: {
      watchedSeconds: true,
      completed: true,
      completedAt: true,
    },
  })

  const totalDuration = lesson.videoDurationSeconds ?? lesson.durationSeconds ?? 0
  const nextWatchedSeconds = Math.max(existingProgress?.watchedSeconds ?? 0, watchedSeconds ?? 0)
  const shouldCompleteAutomatically = totalDuration > 0 && nextWatchedSeconds >= totalDuration * 0.9
  const isCompleted = Boolean(existingProgress?.completed || completed || shouldCompleteAutomatically)
  const completedAt = existingProgress?.completedAt ?? (isCompleted ? new Date() : null)

  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      watchedSeconds: nextWatchedSeconds,
      completed: isCompleted,
      completedAt,
      lastWatchedAt: new Date(),
    },
    create: {
      userId,
      lessonId,
      courseId: lesson.courseId,
      watchedSeconds: nextWatchedSeconds,
      completed: isCompleted,
      completedAt,
      lastWatchedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, progress })
}
