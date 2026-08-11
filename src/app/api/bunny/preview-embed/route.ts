/**
 * GET /api/bunny/preview-embed?videoId=[id]
 *
 * Returns a short-lived signed Bunny embed URL sized to the lesson's configured
 * preview duration. Token is generated at request time so it doesn't expire
 * before the user clicks play. Public endpoint — no auth required for previews.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasAccessToLesson } from "@/lib/access"
import { bunnySignedEmbedUrl } from "@/lib/bunny"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId")

  if (!videoId || !/^[0-9a-f-]{36}$/i.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 })
  }

  const lesson = await db.lesson.findFirst({
    where: { videoProvider: "BUNNY", videoProviderId: videoId, status: "PUBLISHED" },
    select: { id: true },
  })

  // Default teaser length when the lesson has no explicit previewDurationSeconds configured
  let previewDurationSeconds = 7

  if (lesson) {
    const session = await auth()
    const access = await hasAccessToLesson(
      session?.user?.id ?? null,
      lesson.id,
      { isStaff: session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR" },
    )

    if (access.isReleaseLocked) {
      return NextResponse.json(
        { error: "RELEASE_LOCKED", releaseAt: access.releaseAt },
        { status: 403 },
      )
    }

    // Already fully accessible — no need for a time-boxed preview token
    if (access.hasAccess && !access.isPreview) {
      return NextResponse.json({ error: "ALREADY_ACCESSIBLE" }, { status: 403 })
    }

    // Admin explicitly disabled preview for this lesson (see /admin/aulas)
    if (!access.isPreview) {
      return NextResponse.json({ error: "PREVIEW_DISABLED" }, { status: 403 })
    }

    previewDurationSeconds = access.previewDurationSeconds ?? 7
  }

  // Token TTL matches the preview length + small buffer, not an arbitrary flat value
  const embedUrl = bunnySignedEmbedUrl(videoId, previewDurationSeconds + 5, {
    autoplay: true,
    muted: true,
  })

  return NextResponse.json({ embedUrl, previewDurationSeconds })
}
