/**
 * GET /api/bunny/preview-embed?videoId=[id]
 *
 * Returns a short-lived (20s) signed Bunny embed URL for the 7-second preview.
 * Token is generated at request time so it doesn't expire before the user clicks play.
 * Public endpoint — no auth required (it's just a preview, not full access).
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
  }

  // 20 seconds: enough for the 7s preview + buffer, useless if copied afterward
  // autoplay=true so it starts immediately; muted=true for browser autoplay policy
  const embedUrl = bunnySignedEmbedUrl(videoId, 20, { autoplay: true, muted: true })

  return NextResponse.json({ embedUrl })
}
