/**
 * Sincroniza `videoDurationSeconds` de todas as aulas com a duração real do vídeo no Bunny Stream.
 * Corrige valores desatualizados/estimados que ficaram divergentes do vídeo de verdade.
 *
 * Uso: node --env-file=.env --import tsx scripts/sync-lesson-durations.ts
 */
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? ""
const API_KEY = process.env.BUNNY_STREAM_API_KEY ?? ""

async function fetchDuration(videoId: string): Promise<number | null> {
  try {
    const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${videoId}`, {
      headers: { AccessKey: API_KEY },
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as { length?: number } | null
    return typeof data?.length === "number" && data.length > 0 ? Math.round(data.length) : null
  } catch {
    return null
  }
}

async function main() {
  if (!LIBRARY_ID || !API_KEY) {
    console.error("BUNNY_LIBRARY_ID / BUNNY_STREAM_API_KEY não configurados no .env")
    process.exit(1)
  }

  const lessons = await db.lesson.findMany({
    where: { videoProvider: "BUNNY", videoProviderId: { not: null } },
    select: { id: true, title: true, videoProviderId: true, videoDurationSeconds: true },
  })

  console.log(`Encontradas ${lessons.length} aulas com vídeo Bunny.\n`)

  let updated = 0
  let unchanged = 0
  let failed = 0

  for (const lesson of lessons) {
    const videoId = lesson.videoProviderId!
    const realDuration = await fetchDuration(videoId)

    if (realDuration === null) {
      console.log(`⚠️  Falhou: ${lesson.title} (${videoId})`)
      failed++
      continue
    }

    if (realDuration === lesson.videoDurationSeconds) {
      unchanged++
      continue
    }

    await db.lesson.update({
      where: { id: lesson.id },
      data: { videoDurationSeconds: realDuration },
    })

    console.log(`✅ ${lesson.title}: ${lesson.videoDurationSeconds ?? "null"}s → ${realDuration}s`)
    updated++
  }

  console.log(`\nConcluído. Atualizadas: ${updated} | Já corretas: ${unchanged} | Falhas: ${failed}`)
  await db.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await db.$disconnect()
  process.exit(1)
})
