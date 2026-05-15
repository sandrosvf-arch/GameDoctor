import BunnyAulaClient from "./BunnyAulaClient"
import { auth } from "@/lib/auth"
import { bunnyPlaybackUrl } from "@/lib/bunny"
import { hasAccessToCourse } from "@/lib/access"
import { db } from "@/lib/db"

interface Props {
  params: Promise<{ videoId: string }>
  searchParams: Promise<{ titulo?: string; legenda?: string }>
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} min ${s}s` : `${m} min`
}

async function getBunnyVideo(videoId: string) {
  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY ?? "" },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return null
    return await res.json() as { title: string; length: number }
  } catch {
    return null
  }
}

export default async function BunnyAulaPage({ params, searchParams }: Props) {
  const { videoId } = await params
  const { titulo, legenda } = await searchParams
  const session = await auth()
  const userId = session?.user?.id ?? null

  const meta = await getBunnyVideo(videoId)
  const lesson = await db.lesson.findFirst({
    where: {
      status: "PUBLISHED",
      OR: [
        { videoProviderId: videoId },
        { videoPlaybackUrl: { contains: videoId } },
        { videoEmbedUrl: { contains: videoId } },
      ],
    },
    select: {
      id: true,
      isFree: true,
      thumbnail: true,
      videoThumbnailUrl: true,
      courseId: true,
      course: { select: { title: true } },
    },
  })

  const courseAccess = userId && lesson ? await hasAccessToCourse(userId, lesson.courseId) : false
  const isAccessible = lesson ? lesson.isFree || !!courseAccess : true
  const title = titulo ?? meta?.title?.replace(/\.mp4$/i, "") ?? "Aula"
  const duration = meta?.length ? formatDuration(meta.length) : null
  const playbackUrl = bunnyPlaybackUrl(videoId)
  const courseTitle = lesson?.course.title ?? "Início da Jornada"
  const previewImage = lesson?.thumbnail ?? lesson?.videoThumbnailUrl ?? null

  return (
    <BunnyAulaClient
      videoId={videoId}
      title={title}
      subtitle={legenda ?? null}
      duration={duration}
      previewImage={previewImage}
      playbackUrl={playbackUrl}
      isAccessible={isAccessible}
      isFree={lesson?.isFree ?? true}
      courseTitle={courseTitle}
    />
  )
}

