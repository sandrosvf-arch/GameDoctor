/**
 * GET /api/admin/aulas/[id]/subtitles?format=vtt
 * Retorna o arquivo de legendas da transcrição no formato WebVTT ou SRT.
 *
 * Usa o export nativo do AssemblyAI, preservando timestamps por bloco.
 */
import { NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY ?? "" })

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(request.url)

  const format = searchParams.get("format") === "srt" ? "srt" : "vtt"
  const charsPerCaption = Number(searchParams.get("charsPerCaption") ?? "42")

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: {
      title: true,
      transcriptionJobId: true,
      transcriptionStatus: true,
    },
  })

  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 })
  if (!lesson.transcriptionJobId) {
    return NextResponse.json({ error: "Aula sem transcrição gerada" }, { status: 400 })
  }
  if (lesson.transcriptionStatus !== "DONE") {
    return NextResponse.json({ error: "A transcrição ainda não foi concluída" }, { status: 409 })
  }

  let subtitles: string
  try {
    subtitles = await aai.transcripts.subtitles(
      lesson.transcriptionJobId,
      format,
      Number.isFinite(charsPerCaption) ? charsPerCaption : 42,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[subtitles] failed to export subtitles:", message)
    return NextResponse.json({ error: `Não foi possível gerar as legendas: ${message}` }, { status: 502 })
  }

  const safeTitle = (lesson.title || "aula")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()

  return new NextResponse(subtitles, {
    status: 200,
    headers: {
      "Content-Type": format === "vtt" ? "text/vtt; charset=utf-8" : "application/x-subrip; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeTitle || "aula"}.${format}"`,
      "Cache-Control": "no-store",
    },
  })
}
