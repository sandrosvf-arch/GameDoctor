/**
 * POST /api/admin/aulas/[id]/captions
 * Gera o arquivo VTT da transcrição concluída e envia como legenda para o Bunny Stream.
 */
import { Buffer } from "node:buffer"
import { NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY ?? "" })
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? ""
const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY ?? ""

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

async function deleteCaption(videoId: string, srclang: string) {
  const url = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}/captions/${srclang}`
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      AccessKey: BUNNY_API_KEY,
    },
  })
  return res
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  if (!process.env.ASSEMBLYAI_API_KEY) {
    return NextResponse.json({ error: "ASSEMBLYAI_API_KEY não configurada" }, { status: 500 })
  }
  if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY) {
    return NextResponse.json({ error: "BUNNY_LIBRARY_ID ou BUNNY_STREAM_API_KEY não configurados" }, { status: 500 })
  }

  const body = await request.json().catch(() => ({})) as {
    srclang?: string
    label?: string
    charsPerCaption?: number
  }

  const srclang = (body.srclang?.trim() || "pt")
  const label = (body.label?.trim() || "Português (Auto)")
  const charsPerCaption = Number.isFinite(body.charsPerCaption)
    ? Number(body.charsPerCaption)
    : 42

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: {
      title: true,
      videoProviderId: true,
      transcriptionJobId: true,
      transcriptionStatus: true,
    },
  })

  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 })
  if (!lesson.videoProviderId) {
    return NextResponse.json({ error: "Aula sem vídeo Bunny vinculado" }, { status: 400 })
  }
  if (!lesson.transcriptionJobId || lesson.transcriptionStatus !== "DONE") {
    return NextResponse.json({ error: "A transcrição da aula ainda não foi concluída" }, { status: 409 })
  }

  let vtt: string
  try {
    vtt = await aai.transcripts.subtitles(lesson.transcriptionJobId, "vtt", charsPerCaption)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[captions] failed to export VTT:", message)
    return NextResponse.json({ error: `Não foi possível gerar o VTT: ${message}` }, { status: 502 })
  }

  const captionsFile = Buffer.from(vtt, "utf8").toString("base64")
  const url = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${lesson.videoProviderId}/captions/${srclang}`

  // Tenta remover a legenda existente no mesmo idioma para tornar a operação idempotente.
  try {
    await deleteCaption(lesson.videoProviderId, srclang)
  } catch (err) {
    console.warn("[captions] failed deleting previous caption", err)
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      AccessKey: BUNNY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      srclang,
      label,
      captionsFile,
    }),
  })

  const text = await res.text().catch(() => "")
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!res.ok) {
    console.error("[captions] Bunny API error", res.status, payload)
    return NextResponse.json(
      { error: "Falha ao enviar legenda para o Bunny", status: res.status, detail: payload },
      { status: 502 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: "Legenda enviada para o Bunny com sucesso",
    srclang,
    label,
    data: payload,
  })
}
