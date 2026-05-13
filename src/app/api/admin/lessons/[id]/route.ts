/**
 * POST /api/admin/lessons/[id]/bunny
 *
 * Linka um vídeo do Bunny Stream a uma aula.
 * Body: { "bunnyVideoId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
 *
 * Requer: BUNNY_LIBRARY_ID e BUNNY_CDN_HOSTNAME no .env
 * Segurança: só funciona em modo dev OU com header x-admin-key = ADMIN_SECRET
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bunnyVideoFields } from "@/lib/bunny"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Proteção básica por secret
  const adminKey = request.headers.get("x-admin-key")
  const expectedKey = process.env.ADMIN_SECRET ?? "dev-only"
  if (process.env.NODE_ENV !== "development" && adminKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { bunnyVideoId } = body as { bunnyVideoId?: string }

  if (!bunnyVideoId || typeof bunnyVideoId !== "string") {
    return NextResponse.json({ error: "bunnyVideoId é obrigatório" }, { status: 400 })
  }

  if (!process.env.BUNNY_LIBRARY_ID || !process.env.BUNNY_CDN_HOSTNAME) {
    return NextResponse.json(
      { error: "BUNNY_LIBRARY_ID e BUNNY_CDN_HOSTNAME devem estar configurados no .env" },
      { status: 500 }
    )
  }

  const fields = bunnyVideoFields(bunnyVideoId)

  const lesson = await db.lesson.update({
    where: { id },
    data: fields,
    select: { id: true, title: true, videoEmbedUrl: true, videoPlaybackUrl: true, videoThumbnailUrl: true },
  })

  return NextResponse.json({ ok: true, lesson })
}
