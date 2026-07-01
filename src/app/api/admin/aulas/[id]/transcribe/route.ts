/**
 * POST /api/admin/aulas/[id]/transcribe
 *   Baixa o vídeo do Bunny CDN (com header Referer para bypassar restrição) e faz
 *   upload em stream direto para o AssemblyAI — sem salvar em disco ou memória.
 *   Retorna imediatamente com jobId; status é consultado via GET (polling).
 *
 * GET /api/admin/aulas/[id]/transcribe
 *   Consulta status no AssemblyAI e persiste transcript no DB quando concluído.
 *
 * Requer no .env: ASSEMBLYAI_API_KEY, BUNNY_TOKEN_AUTH_KEY, NEXTAUTH_URL
 */
import { NextResponse } from "next/server"
import { AssemblyAI } from "assemblyai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { bunnySignedMp4Url } from "@/lib/bunny"

// Aumentar duração máxima — necessário para upload de vídeos grandes.
// No Vercel Free (Hobby) fica limitado a 10s; no Pro funciona até 300s.
export const maxDuration = 300

const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY ?? "" })

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

/**
 * Inicia transcrição:
 * 1. Baixa MP4 do Bunny CDN via nosso servidor (com header Referer — bypassa a restrição de acesso direto)
 * 2. Faz upload do stream diretamente ao AssemblyAI (sem buffer em memória)
 * 3. Submete job de transcrição e salva o jobId no banco
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { videoProviderId: true, transcriptionStatus: true },
  })

  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 })
  if (!lesson.videoProviderId) {
    return NextResponse.json({ error: "Aula sem vídeo Bunny cadastrado" }, { status: 400 })
  }
  if (lesson.transcriptionStatus === "PENDING" || lesson.transcriptionStatus === "PROCESSING") {
    return NextResponse.json({ error: "Transcrição já em andamento" }, { status: 409 })
  }

  // URL assinada com token (validade 4h)
  const signedUrl = bunnySignedMp4Url(lesson.videoProviderId)

  // Referer esperado pelo Bunny (o mesmo domínio configurado no pull zone)
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://localhost:3000"

  // Download do Bunny via servidor — adicionamos o Referer que o CDN exige
  let bunnyRes: Response
  try {
    bunnyRes = await fetch(signedUrl, {
      headers: { Referer: siteUrl },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[transcribe] Falha ao conectar ao Bunny CDN:", msg)
    return NextResponse.json({ error: `Não foi possível acessar o vídeo: ${msg}` }, { status: 502 })
  }

  if (!bunnyRes.ok || !bunnyRes.body) {
    console.error(`[transcribe] Bunny CDN retornou ${bunnyRes.status} para`, signedUrl)
    return NextResponse.json(
      { error: `Bunny CDN retornou ${bunnyRes.status}. Verifique se o MP4 Fallback está habilitado na biblioteca do Bunny Stream.` },
      { status: 502 }
    )
  }

  // Upload do stream direto ao AssemblyAI (pipe, sem buffer em memória)
  let uploadUrl: string
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uploadUrl = await aai.files.upload(bunnyRes.body as any)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[transcribe] Falha no upload ao AssemblyAI:", msg)
    return NextResponse.json({ error: `Upload para AssemblyAI falhou: ${msg}` }, { status: 502 })
  }

  // Submete job de transcrição
  let transcript
  try {
    transcript = await aai.transcripts.submit({
      audio_url: uploadUrl,
      language_detection: true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[transcribe] AssemblyAI submit error:", msg)
    return NextResponse.json({ error: `AssemblyAI rejeitou o arquivo: ${msg}` }, { status: 502 })
  }

  await db.lesson.update({
    where: { id },
    data: { transcriptionJobId: transcript.id, transcriptionStatus: "PENDING" },
  })

  return NextResponse.json({ jobId: transcript.id, status: "PENDING" })
}

/** Consulta status no AssemblyAI; persiste transcript no DB quando concluído */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { transcriptionJobId: true, transcriptionStatus: true, transcription: true },
  })

  if (!lesson) return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 })
  if (!lesson.transcriptionJobId) return NextResponse.json({ status: "NONE" })

  // Se já finalizado, retorna direto do banco sem chamar AssemblyAI
  if (lesson.transcriptionStatus === "DONE") {
    return NextResponse.json({ status: "DONE", text: lesson.transcription })
  }
  if (lesson.transcriptionStatus === "FAILED") {
    const storedErr = lesson.transcription?.startsWith("[ERR]") ? lesson.transcription.slice(5) : undefined
    return NextResponse.json({ status: "FAILED", error: storedErr })
  }

  // Poll AssemblyAI
  const result = await aai.transcripts.get(lesson.transcriptionJobId)

  if (result.status === "completed" && result.text) {
    await db.lesson.update({
      where: { id },
      data: { transcription: result.text, transcriptionStatus: "DONE" },
    })
    return NextResponse.json({ status: "DONE", text: result.text })
  }

  if (result.status === "error") {
    const errMsg = result.error ?? "Erro desconhecido no AssemblyAI"
    console.error(`[transcribe] job ${lesson.transcriptionJobId} failed:`, errMsg)
    await db.lesson.update({
      where: { id },
      data: { transcriptionStatus: "FAILED", transcription: `[ERR]${errMsg}` },
    })
    return NextResponse.json({ status: "FAILED", error: errMsg })
  }

  const status = result.status === "processing" ? "PROCESSING" : "PENDING"
  await db.lesson.update({ where: { id }, data: { transcriptionStatus: status } })
  return NextResponse.json({ status })
}
