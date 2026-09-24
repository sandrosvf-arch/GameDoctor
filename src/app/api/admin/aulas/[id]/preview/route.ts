import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import ffmpegPath from "ffmpeg-static"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { bunnySignedMp4Url, isBunnyVideoId } from "@/lib/bunny"

export const runtime = "nodejs"
export const maxDuration = 300

const BUNNY_API_URL = "https://video.bunnycdn.com"
const MAX_PREVIEW_SECONDS = 300

type BunnyVideo = {
  guid: string
  length?: number
  status?: number
  encodeProgress?: number
  availableResolutions?: string | null
  transcodingMessages?: Array<{ message?: string | null }> | null
}

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

async function bunnyRequest<T>(pathname: string, init: RequestInit = {}) {
  const response = await fetch(`${BUNNY_API_URL}/library/${process.env.BUNNY_LIBRARY_ID}${pathname}`, {
    ...init,
    headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY ?? "", ...init.headers },
  })
  const text = await response.text()
  let payload: unknown = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  if (!response.ok) {
    const details = typeof payload === "string" ? payload : JSON.stringify(payload)
    throw new Error(`Bunny (${response.status}): ${details || response.statusText}`)
  }
  return payload as T
}

function chooseResolution(availableResolutions: string | null | undefined) {
  const resolutions = Array.from(new Set(
    (availableResolutions?.match(/\d+p/g) ?? [])
      .map(value => Number.parseInt(value, 10))
      .filter(Number.isFinite),
  )).sort((a, b) => a - b)
  return `${resolutions.find(value => value >= 480) ?? resolutions.at(-1) ?? 480}p` as "480p" | "720p" | "1080p"
}

async function runFfmpeg(sourceUrl: string, outputPath: string, durationSeconds: number) {
  const packagedPath = ffmpegPath ? String(ffmpegPath) : ""
  const executablePath = packagedPath && existsSync(packagedPath)
    ? packagedPath
    : path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg")
  if (!existsSync(executablePath)) throw new Error("FFmpeg não está disponível no servidor.")

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executablePath, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-headers", `Referer: ${process.env.NEXTAUTH_URL ?? ""}\r\nUser-Agent: Mozilla/5.0\r\n`,
      "-i", sourceUrl,
      "-t", String(durationSeconds),
      "-vf", "scale=min(1920\\,iw):min(1080\\,ih):force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath,
    ], { windowsHide: true })
    let stderr = ""
    child.stderr.on("data", chunk => { stderr = `${stderr}${String(chunk)}`.slice(-8000) })
    child.on("error", reject)
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`FFmpeg falhou: ${stderr.trim()}`)))
  })
}


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { previewVideoProviderId: true },
  })
  if (!lesson?.previewVideoProviderId) {
    return NextResponse.json({ status: "NONE" })
  }

  try {
    const video = await bunnyRequest<BunnyVideo>(`/videos/${lesson.previewVideoProviderId}`)
    if (video.status === 4 && (video.encodeProgress ?? 0) >= 100) {
      const previewDurationSeconds = Math.ceil(video.length ?? 0)
      await db.lesson.update({
        where: { id },
        data: { previewEnabled: true, previewDurationSeconds: previewDurationSeconds || null },
      })
      return NextResponse.json({ status: "READY", previewDurationSeconds })
    }
    if (video.status === 5 || video.status === 8) {
      const message = video.transcodingMessages?.map(item => item.message).filter(Boolean).join("; ")
      return NextResponse.json({ status: "FAILED", error: message || "O Bunny não conseguiu processar a prévia." }, { status: 502 })
    }
    return NextResponse.json({ status: "PROCESSING", progress: video.encodeProgress ?? 0 })
  } catch (error) {
    return NextResponse.json({ status: "FAILED", error: error instanceof Error ? error.message : "Não foi possível consultar a prévia." }, { status: 502 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({})) as { durationSeconds?: number }
  const durationSeconds = Number(body.durationSeconds ?? 60)

  if (!Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > MAX_PREVIEW_SECONDS) {
    return NextResponse.json({ error: `A duração deve estar entre 5 e ${MAX_PREVIEW_SECONDS} segundos.` }, { status: 400 })
  }
  if (!process.env.BUNNY_LIBRARY_ID || !process.env.BUNNY_STREAM_API_KEY || !process.env.BUNNY_CDN_HOSTNAME) {
    return NextResponse.json({ error: "As configurações do Bunny não estão completas no servidor." }, { status: 500 })
  }

  const lesson = await db.lesson.findUnique({
    where: { id },
    select: { title: true, videoProvider: true, videoProviderId: true },
  })
  if (!lesson || lesson.videoProvider !== "BUNNY" || !lesson.videoProviderId || !isBunnyVideoId(lesson.videoProviderId)) {
    return NextResponse.json({ error: "A aula não possui um vídeo Bunny válido para gerar a prévia." }, { status: 400 })
  }

  const workdir = path.join(os.tmpdir(), `gamedoctor-preview-${randomUUID()}`)
  const outputPath = path.join(workdir, "preview.mp4")

  try {
    await mkdir(workdir, { recursive: true })
    const source = await bunnyRequest<BunnyVideo>(`/videos/${lesson.videoProviderId}`)
    const resolution = chooseResolution(source.availableResolutions)
    await runFfmpeg(bunnySignedMp4Url(lesson.videoProviderId, resolution), outputPath, durationSeconds)

    const created = await bunnyRequest<BunnyVideo>("/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Prévia - ${lesson.title}` }),
    })
    const file = await readFile(outputPath)
    await bunnyRequest(`/videos/${created.guid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(file),
    })
    await db.lesson.update({
      where: { id },
      data: { previewEnabled: false, previewVideoProviderId: created.guid, previewDurationSeconds: null },
    })

    return NextResponse.json({ previewVideoProviderId: created.guid, status: "PROCESSING" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível gerar a prévia." }, { status: 502 })
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {})
  }
}
