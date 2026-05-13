import { NextResponse } from "next/server"

const BUNNY_CDN = "vz-38444944-922.b-cdn.net"
// Allow only UUID-like video IDs to prevent SSRF
const VIDEO_ID_RE = /^[0-9a-f-]{32,36}$/i

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId") ?? ""
  const time = Number(searchParams.get("time") ?? "0")

  if (!VIDEO_ID_RE.test(videoId)) {
    return new NextResponse("Invalid videoId", { status: 400 })
  }

  const bunnyUrl = `https://${BUNNY_CDN}/${videoId}/thumbnail.jpg?time=${Math.round(time)}`

  let res: Response
  try {
    res = await fetch(bunnyUrl, {
      cache: "no-store",
      headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
    })
  } catch {
    return new NextResponse("Fetch failed", { status: 502 })
  }

  if (!res.ok) {
    return new NextResponse("Bunny error", { status: res.status })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  })
}
