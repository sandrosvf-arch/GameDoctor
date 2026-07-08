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
  const { id } = await params

  const { hasAccess, isPreview, previewDurationSeconds } =
    await hasAccessToLesson(userId, id)

  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "NO_ACCESS",
        message:
          "Você não tem acesso a esta aula. Escolha um plano para continuar assistindo.",
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
      ? bunnySignedEmbedUrl(lesson.videoProviderId!)
      : lesson.videoEmbedUrl,
    playbackUrl: isBunny
      ? bunnySignedPlaylistUrl(lesson.videoProviderId!)
      : lesson.videoPlaybackUrl,
    thumbnailUrl: lesson.videoThumbnailUrl,
    durationSeconds: lesson.videoDurationSeconds ?? lesson.durationSeconds,
    isPreview,
    previewDurationSeconds,
  })
}
