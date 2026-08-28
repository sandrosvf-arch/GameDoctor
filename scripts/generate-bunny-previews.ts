import crypto from "node:crypto"
import { spawn } from "node:child_process"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import ffmpegPath from "ffmpeg-static"

const BUNNY_API_URL = "https://video.bunnycdn.com"
const PREVIEW_SECONDS = 60
const POLL_INTERVAL_MS = 10_000
const PROCESSING_TIMEOUT_MS = 30 * 60_000
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo"

type RunStatus =
  | "pending"
  | "generating"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"

type ManifestItem = {
  lessonId: string
  lessonTitle: string
  courseTitle: string
  originalVideoId: string
  previousPreviewVideoId: string | null
  newPreviewVideoId: string | null
  durationSeconds: number | null
  outputFile: string | null
  status: RunStatus
  error: string | null
  updatedAt: string
}

type Manifest = {
  date: string
  collectionName: string
  collectionId: string | null
  createdAt: string
  updatedAt: string
  items: Record<string, ManifestItem>
}

type BunnyVideo = {
  guid: string
  length: number
  status: number
  encodeProgress: number
  hasMP4Fallback: boolean
  availableResolutions: string | null
  transcodingMessages?: Array<{ message?: string | null }> | null
}

type BunnyCollection = {
  guid: string
  name: string
}

const db = new PrismaClient()

function parseArguments() {
  const args = process.argv.slice(2)
  const lessonIdArgument = args.find((argument) => argument.startsWith("--lesson-id="))

  return {
    apply: args.includes("--apply"),
    help: args.includes("--help") || args.includes("-h"),
    lessonId: lessonIdArgument?.slice("--lesson-id=".length).trim() || undefined,
  }
}

function showHelp() {
  console.log(`Uso:
  npm run bunny:previews
  npm run bunny:previews -- --apply
  npm run bunny:previews -- --apply --lesson-id=<id>

Sem --apply, o comando apenas lista as aulas que seriam processadas.`)
}

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`)
  return value
}

function getSaoPauloDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function signedMp4Url(
  hostname: string,
  tokenKey: string,
  videoId: string,
  resolution: string,
): string {
  const pathname = `/${videoId}/play_${resolution}.mp4`
  const expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60
  const token = crypto
    .createHash("md5")
    .update(tokenKey + pathname + expires)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  return `https://${hostname}${pathname}?token=${token}&expires=${expires}`
}

function chooseSourceResolution(availableResolutions: string | null): string {
  const resolutions = Array.from(
    new Set(
      (availableResolutions?.match(/\d+p/g) ?? [])
        .map((resolution) => Number.parseInt(resolution, 10))
        .filter(Number.isFinite),
    ),
  ).sort((left, right) => left - right)

  const preferred = resolutions.filter((resolution) => resolution <= 720).at(-1)
  const fallback = resolutions[0]
  const selected = preferred ?? fallback

  if (!selected) {
    throw new Error("O Bunny não informou uma resolução MP4 disponível para o vídeo.")
  }

  return `${selected}p`
}

async function bunnyRequest<T>(
  libraryId: string,
  apiKey: string,
  pathname: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BUNNY_API_URL}/library/${libraryId}${pathname}`, {
    ...init,
    headers: {
      AccessKey: apiKey,
      ...init.headers,
    },
  })

  const responseText = await response.text()
  let payload: unknown = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      payload = responseText
    }
  }

  if (!response.ok) {
    const details = typeof payload === "string" ? payload : JSON.stringify(payload)
    throw new Error(`Bunny (${response.status}): ${details || response.statusText}`)
  }

  return payload as T
}

async function getVideo(libraryId: string, apiKey: string, videoId: string) {
  return bunnyRequest<BunnyVideo>(libraryId, apiKey, `/videos/${videoId}`)
}

async function findOrCreateCollection(
  libraryId: string,
  apiKey: string,
  collectionName: string,
): Promise<BunnyCollection> {
  const query = new URLSearchParams({
    page: "1",
    itemsPerPage: "100",
    search: collectionName,
  })
  const response = await bunnyRequest<{ items?: BunnyCollection[] } | BunnyCollection[]>(
    libraryId,
    apiKey,
    `/collections?${query}`,
  )
  const collections = Array.isArray(response) ? response : response.items ?? []
  const existing = collections.find((collection) => collection.name === collectionName)

  if (existing) return existing

  return bunnyRequest<BunnyCollection>(libraryId, apiKey, "/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: collectionName }),
  })
}

async function createVideo(
  libraryId: string,
  apiKey: string,
  title: string,
  collectionId: string,
): Promise<BunnyVideo> {
  return bunnyRequest<BunnyVideo>(libraryId, apiKey, "/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, collectionId }),
  })
}

async function uploadVideo(
  libraryId: string,
  apiKey: string,
  videoId: string,
  filePath: string,
) {
  const file = await readFile(filePath)
  await bunnyRequest<unknown>(libraryId, apiKey, `/videos/${videoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Uint8Array(file),
  })
}

async function waitUntilProcessed(
  libraryId: string,
  apiKey: string,
  videoId: string,
): Promise<BunnyVideo> {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS

  while (Date.now() < deadline) {
    const video = await getVideo(libraryId, apiKey, videoId)

    if (video.status === 4 && video.encodeProgress >= 100) return video

    if (video.status === 5 || video.status === 8) {
      const details = video.transcodingMessages
        ?.map((message) => message.message)
        .filter(Boolean)
        .join("; ")
      throw new Error(details || `O processamento da prévia falhou com status ${video.status}.`)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error("Tempo limite excedido aguardando o processamento da prévia no Bunny.")
}

async function generatePreview(
  sourceUrl: string,
  outputPath: string,
  durationSeconds: number,
  referer: string,
) {
  if (!ffmpegPath) throw new Error("Executável do FFmpeg não encontrado.")
  const executablePath = ffmpegPath

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      executablePath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-headers",
        `Referer: ${referer}\r\n`,
        "-i",
        sourceUrl,
        "-t",
        String(durationSeconds),
        "-vf",
        "scale=min(1280\\,iw):min(720\\,ih):force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { windowsHide: true },
    )
    let stderr = ""

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += String(chunk)
      if (stderr.length > 12_000) stderr = stderr.slice(-12_000)
    })
    child.on("error", reject)
    child.on("close", (code: number | null) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg encerrou com código ${code}: ${stderr.trim()}`))
    })
  })
}

async function loadManifest(filePath: string, date: string, collectionName: string): Promise<Manifest> {
  try {
    const manifest = JSON.parse(await readFile(filePath, "utf8")) as Manifest
    if (manifest.date === date) return manifest
  } catch {
    // Um manifesto ausente inicia um novo lote.
  }

  const now = new Date().toISOString()
  return {
    date,
    collectionName,
    collectionId: null,
    createdAt: now,
    updatedAt: now,
    items: {},
  }
}

async function saveManifest(filePath: string, manifest: Manifest) {
  manifest.updatedAt = new Date().toISOString()
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  await rename(temporaryPath, filePath)
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

async function saveReport(filePath: string, manifest: Manifest) {
  const header = [
    "lesson_id",
    "lesson_title",
    "course_title",
    "original_video_id",
    "previous_preview_video_id",
    "new_preview_video_id",
    "duration_seconds",
    "status",
    "error",
    "output_file",
  ]
  const rows = Object.values(manifest.items).map((item) => [
    item.lessonId,
    item.lessonTitle,
    item.courseTitle,
    item.originalVideoId,
    item.previousPreviewVideoId,
    item.newPreviewVideoId,
    item.durationSeconds,
    item.status,
    item.error,
    item.outputFile,
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
  await writeFile(filePath, `${csv}\n`, "utf8")
}

async function main() {
  const options = parseArguments()
  if (options.help) {
    showHelp()
    return
  }

  requireEnvironment("DATABASE_URL")
  const libraryId = requireEnvironment("BUNNY_LIBRARY_ID")
  const apiKey = requireEnvironment("BUNNY_STREAM_API_KEY")
  const cdnHostname = requireEnvironment("BUNNY_CDN_HOSTNAME").replace(/^https?:\/\//, "").replace(/\/$/, "")
  const tokenKey = requireEnvironment("BUNNY_TOKEN_AUTH_KEY")
  const bunnyReferer = process.env.NEXTAUTH_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || "http://localhost:3000"

  const lessons = await db.lesson.findMany({
    where: {
      status: "PUBLISHED",
      videoProvider: "BUNNY",
      videoProviderId: { not: null },
      ...(options.lessonId ? { id: options.lessonId } : {}),
    },
    orderBy: [{ course: { title: "asc" } }, { order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      videoProviderId: true,
      previewVideoProviderId: true,
      course: { select: { title: true, slug: true } },
    },
  })

  if (options.lessonId && lessons.length === 0) {
    throw new Error(`Aula publicada com vídeo Bunny não encontrada: ${options.lessonId}`)
  }

  console.log(`${options.apply ? "Execução" : "Simulação"}: ${lessons.length} aula(s) encontrada(s).`)
  for (const lesson of lessons) {
    console.log(`- ${lesson.course.title} / ${lesson.title} (${lesson.id})`)
  }

  if (!options.apply || lessons.length === 0) return

  const date = getSaoPauloDate()
  const outputDirectory = path.resolve(process.cwd(), ".local", "bunny-previews", date)
  const manifestPath = path.join(outputDirectory, "manifest.json")
  const reportPath = path.join(outputDirectory, "report.csv")
  const collectionName = `Prévias automáticas - ${date}`
  await mkdir(outputDirectory, { recursive: true })

  const manifest = await loadManifest(manifestPath, date, collectionName)
  if (!manifest.collectionId) {
    const collection = await findOrCreateCollection(libraryId, apiKey, collectionName)
    manifest.collectionId = collection.guid
    await saveManifest(manifestPath, manifest)
  }

  let completed = 0
  let failed = 0
  let skipped = 0

  for (const lesson of lessons) {
    const originalVideoId = lesson.videoProviderId
    if (!originalVideoId) continue

    const previousItem = manifest.items[lesson.id]
    if (previousItem?.status === "completed") {
      skipped += 1
      console.log(`[ignorada] ${lesson.title}: concluída neste lote.`)
      continue
    }

    const outputFileName = `${sanitizeFileName(lesson.course.slug || lesson.course.title)}--${lesson.id}.mp4`
    const outputPath = path.join(outputDirectory, outputFileName)
    const item: ManifestItem = {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseTitle: lesson.course.title,
      originalVideoId,
      previousPreviewVideoId: lesson.previewVideoProviderId,
      newPreviewVideoId: previousItem?.newPreviewVideoId ?? null,
      durationSeconds: null,
      outputFile: outputPath,
      status: "pending",
      error: null,
      updatedAt: new Date().toISOString(),
    }
    manifest.items[lesson.id] = item

    try {
      const sourceVideo = await getVideo(libraryId, apiKey, originalVideoId)
      if (sourceVideo.status !== 4) {
        throw new Error(`O vídeo original ainda não está pronto no Bunny (status ${sourceVideo.status}).`)
      }
      if (!sourceVideo.hasMP4Fallback) {
        throw new Error("O vídeo original não possui MP4 fallback habilitado no Bunny.")
      }

      const durationSeconds = Math.max(1, Math.min(PREVIEW_SECONDS, Math.ceil(sourceVideo.length)))
      const resolution = chooseSourceResolution(sourceVideo.availableResolutions)
      item.durationSeconds = durationSeconds
      item.status = "generating"
      item.updatedAt = new Date().toISOString()
      await saveManifest(manifestPath, manifest)

      await generatePreview(
        signedMp4Url(cdnHostname, tokenKey, originalVideoId, resolution),
        outputPath,
        durationSeconds,
        bunnyReferer,
      )

      item.status = "uploading"
      item.updatedAt = new Date().toISOString()
      await saveManifest(manifestPath, manifest)

      const previewVideo = await createVideo(
        libraryId,
        apiKey,
        `Prévia | ${lesson.course.title} | ${lesson.title} | ${date}`,
        manifest.collectionId,
      )
      item.newPreviewVideoId = previewVideo.guid
      await saveManifest(manifestPath, manifest)

      await uploadVideo(libraryId, apiKey, previewVideo.guid, outputPath)
      item.status = "processing"
      item.updatedAt = new Date().toISOString()
      await saveManifest(manifestPath, manifest)

      const processedVideo = await waitUntilProcessed(libraryId, apiKey, previewVideo.guid)
      if (processedVideo.length <= 0 || processedVideo.length > PREVIEW_SECONDS + 5) {
        throw new Error(`A prévia processada possui duração inesperada: ${processedVideo.length}s.`)
      }

      try {
        await db.lesson.update({
          where: { id: lesson.id },
          data: {
            previewVideoProviderId: previewVideo.guid,
            previewEnabled: true,
            previewDurationSeconds: Math.ceil(processedVideo.length),
          },
        })
      } catch (error) {
        throw new Error(
          `Prévia ${previewVideo.guid} enviada, mas não vinculada no banco: ${errorMessage(error)}`,
        )
      }

      item.durationSeconds = Math.ceil(processedVideo.length)
      item.status = "completed"
      item.updatedAt = new Date().toISOString()
      completed += 1
      console.log(`[concluída] ${lesson.title}: ${previewVideo.guid}`)
    } catch (error) {
      item.status = "failed"
      item.error = errorMessage(error)
      item.updatedAt = new Date().toISOString()
      failed += 1
      console.error(`[falha] ${lesson.title}: ${item.error}`)
    }

    await saveManifest(manifestPath, manifest)
    await saveReport(reportPath, manifest)
  }

  await saveReport(reportPath, manifest)
  console.log(`Resumo: ${completed} concluída(s), ${failed} falha(s), ${skipped} ignorada(s).`)
  console.log(`Manifesto: ${manifestPath}`)
  console.log(`Relatório: ${reportPath}`)

  if (failed > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(errorMessage(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
