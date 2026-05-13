import { NextResponse } from "next/server"

const BUNNY_CDN = "vz-38444944-922.b-cdn.net"
const VIDEO_ID_RE = /^[0-9a-f-]{32,36}$/i

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get("videoId") ?? ""
  const time = Math.max(0, Math.round(Number(searchParams.get("time") ?? "0")))

  if (!VIDEO_ID_RE.test(videoId)) {
    return new NextResponse("Invalid videoId", { status: 400 })
  }

  const noHeaders = {
    "Cache-Control": "no-cache, no-store",
    "Pragma": "no-cache",
  }

  async function fetchThumb(url: string) {
    return fetch(url, { cache: "no-store", headers: noHeaders, redirect: "follow" })
  }

  try {
    // Try with specific time first; fall back to default thumbnail if that fails
    let res = await fetchThumb(`https://${BUNNY_CDN}/${videoId}/thumbnail.jpg?time=${time}`)
    if (!res.ok && time > 0) {
      res = await fetchThumb(`https://${BUNNY_CDN}/${videoId}/thumbnail.jpg`)
    }
    if (!res.ok) {
      return new NextResponse("Not found", { status: 404 })
    }
    const contentType = res.headers.get("Content-Type") ?? "image/jpeg"
    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    })
  } catch (err) {
    console.error("[bunny-frame]", err)
    return new NextResponse("Proxy error", { status: 502 })
  }
}
