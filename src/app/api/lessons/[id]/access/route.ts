/**
 * GET /api/lessons/[id]/access
 *
 * CRITICAL endpoint — validates backend access and returns video playback info.
 * The video URL is NEVER exposed without this server-side check.
 *
 * Response 200: { embedUrl, playbackUrl, thumbnailUrl, durationSeconds, isPreview, previewDurationSeconds }
 * Response 403: { error: "NO_ACCESS" }
 * Response 404: { error: "NOT_FOUND" }
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

  const lessonAccess = await hasAccessToLesson(userId, id, { isStaff })
  const { hasAccess, isPreview, previewDurationSeconds } = lessonAccess

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: lessonAccess.isReleaseLocked ? "RELEASE_LOCKED" : "NO_ACCESS",
        releaseAt: lessonAccess.releaseAt,
        releaseDaysRemaining: lessonAccess.releaseDaysRemaining,
        message:
          "Você não tem acesso disponível a esta aula neste momento.",
      },
      { status: 403 }
    )
  }

  const lesson = await db.lesson.findUnique({
    where: { id, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      videoProvider: true,
      videoProviderId: true,
      videoEmbedUrl: true,
      videoPlaybackUrl: true,
      videoThumbnailUrl: true,
      videoDurationSeconds: true,
      durationSeconds: true,
    },
  })

  if (!lesson) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  // For Bunny, generate signed URLs at serve time (CDN/embed token auth).
  const isBunny = lesson.videoProvider === "BUNNY" && !!lesson.videoProviderId

  return NextResponse.json({
    lessonId: lesson.id,
    embedUrl: isBunny
      ? bunnySignedEmbedUrl(lesson.videoProviderId!, 4 * 3600, { autoplay: true, muted: true })
      : lesson.videoEmbedUrl,
    playbackUrl: isBunny
      ? bunnySignedPlaylistUrl(lesson.videoProviderId!)
      : lesson.videoPlaybackUrl,
    thumbnailUrl: lesson.videoThumbnailUrl,
    durationSeconds: lesson.videoDurationSeconds ?? lesson.durationSeconds,
    isReleaseLocked: lessonAccess.isReleaseLocked,
    releaseAt: lessonAccess.releaseAt,
    releaseDaysRemaining: lessonAccess.releaseDaysRemaining,
    isPreview,
    previewDurationSeconds,
  })
}
