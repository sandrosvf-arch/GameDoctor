/**
 * GET /api/bunny/preview-embed?videoId=[id]
 *
 * Returns a short-lived (20s) signed Bunny embed URL for the 7-second preview.
 * Token is generated at request time so it doesn't expire before the user clicks play.
 * Public endpoint — no auth required (it's just a preview, not full access).
 */
import { NextResponse } from "next/server"
import { bunnySignedEmbedUrl } from "@/lib/bunny"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId")

  if (!videoId || !/^[0-9a-f-]{36}$/i.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 })
  }

  // 20 seconds: enough for the 7s preview + buffer, useless if copied afterward
  // autoplay=true so it starts immediately; muted=true for browser autoplay policy
  const embedUrl = bunnySignedEmbedUrl(videoId, 20, { autoplay: true, muted: true })

  return NextResponse.json({ embedUrl })
}
