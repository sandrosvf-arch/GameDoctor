import { NextResponse } from "next/server"
import { auth } from "@/auth"

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID
const API_KEY = process.env.BUNNY_STREAM_API_KEY
const CDN_HOST = process.env.BUNNY_CDN_HOSTNAME ?? "vz-38444944-922.b-cdn.net"

const VIDEO_ID_RE = /^[0-9a-f-]{32,36}$/i

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId") ?? ""
  const timeSecs = Math.max(0, Math.round(Number(searchParams.get("time") ?? "0")))

  if (!VIDEO_ID_RE.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 })
  }
  if (!LIBRARY_ID || !API_KEY) {
    return NextResponse.json({ error: "Bunny not configured" }, { status: 500 })
  }

  // Bunny Stream API: set video thumbnail to a specific time (thumbnailTime in milliseconds)
  const timeMs = timeSecs * 1000
  const apiUrl = `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}/thumbnail?thumbnailTime=${timeMs}`

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      AccessKey: API_KEY,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    console.error("[set-thumbnail] Bunny API error", res.status, body)
    return NextResponse.json({ error: "Bunny API error", detail: body }, { status: 502 })
  }

  // Add cache-busting version so browser/CDN serves the newly-set thumbnail
  const thumbnailUrl = `https://${CDN_HOST}/${videoId}/thumbnail.jpg?v=${Date.now()}`
  return NextResponse.json({ thumbnailUrl })
}
