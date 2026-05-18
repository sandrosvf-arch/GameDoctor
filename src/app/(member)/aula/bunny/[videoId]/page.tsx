import BunnyAulaClient, { type CourseLessonInfo, type LessonMaterial } from "./BunnyAulaClient"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
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
      description: true,
      courseId: true,
      course: { select: { title: true } },
    },
  })

  const courseAccess = userId && lesson ? await hasAccessToCourse(userId, lesson.courseId) : false
  const isAccessible = lesson ? lesson.isFree || !!courseAccess : true

  // ── Block non-authorized users server-side ──────────────────────────────────
  // The video URL (playbackUrl) is NEVER sent to the client unless access is confirmed.
  if (lesson && !isAccessible) {
    redirect(
      userId
        ? "/planos"
        : `/login?callbackUrl=/aula/bunny/${encodeURIComponent(videoId)}`
    )
  }
  const title = titulo ?? meta?.title?.replace(/\.mp4$/i, "") ?? "Aula"
  const duration = meta?.length ? formatDuration(meta.length) : null
  const playbackUrl = bunnyPlaybackUrl(videoId)
  const courseTitle = lesson?.course.title ?? "Início da Jornada"
  const previewImage = lesson?.thumbnail ?? lesson?.videoThumbnailUrl ?? null
  const description = lesson?.description ?? null

  // All published lessons for the same course, ordered by module then lesson
  let courseLessons: CourseLessonInfo[] = []
  if (lesson?.courseId) {
    courseLessons = await db.lesson.findMany({
      where: { courseId: lesson.courseId, status: "PUBLISHED" },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        title: true,
        videoProviderId: true,
        thumbnail: true,
        videoThumbnailUrl: true,
        isFree: true,
        videoDurationSeconds: true,
        durationSeconds: true,
        moduleId: true,
        module: { select: { id: true, title: true } },
      },
    }) as CourseLessonInfo[]
  }

  const currentIndex = courseLessons.findIndex(l => l.videoProviderId === videoId)
  const nextLesson = currentIndex >= 0 && currentIndex < courseLessons.length - 1
    ? courseLessons[currentIndex + 1]
    : null

  // Materials (files) for this lesson
  const materials: LessonMaterial[] = lesson?.id ? await db.material.findMany({
    where: { lessonId: lesson.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, fileUrl: true, externalUrl: true, type: true },
  }) as LessonMaterial[] : []

  // Completion status for the current user
  const completionRecord = userId && lesson?.id
    ? await db.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        select: { completed: true },
      })
    : null
  const initialCompleted = completionRecord?.completed ?? false

  return (
    <BunnyAulaClient
      videoId={videoId}
      lessonId={lesson?.id ?? null}
      title={title}
      subtitle={legenda ?? null}
      duration={duration}
      previewImage={previewImage}
      playbackUrl={playbackUrl}
      isAccessible={isAccessible}
      isFree={lesson?.isFree ?? true}
      courseTitle={courseTitle}
      description={description}
      courseLessons={courseLessons}
      nextLesson={nextLesson}
      materials={materials}
      initialCompleted={initialCompleted}
    />
  )
}

