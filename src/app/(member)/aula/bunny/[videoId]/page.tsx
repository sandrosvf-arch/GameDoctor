import { notFound } from "next/navigation"
import BunnyAulaClient, { type CourseLessonInfo, type LessonMaterial } from "./BunnyAulaClient"
import { auth } from "@/lib/auth"
import { bunnySignedEmbedUrl } from "@/lib/bunny"
import { hasAccessToLesson } from "@/lib/access"
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

  // Phase 1: parallel — session + Bunny API + lesson lookup
  const [session, meta, lesson] = await Promise.all([
    auth(),
    getBunnyVideo(videoId),
    db.lesson.findFirst({
      where: {
        status: "PUBLISHED",
        videoProviderId: videoId,
      },
      select: {
        id: true,
        title: true,
        isFree: true,
        thumbnail: true,
        videoThumbnailUrl: true,
        description: true,
        courseId: true,
        videoDurationSeconds: true,
        durationSeconds: true,
        previewEnabled: true,
        previewVideoProviderId: true,
        course: { select: { title: true, slug: true } },
      },
    }),
  ]) 

  if (!lesson) notFound()

  const userId = session?.user?.id ?? null
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR"

  // Phase 2: parallel — all queries that depend on lesson + userId
  const [lessonAccess, courseLessons, materials, completionRecord] = await Promise.all([
    lesson ? hasAccessToLesson(userId, lesson.id, { isStaff }) : Promise.resolve(null),
    lesson?.courseId
      ? db.lesson.findMany({
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
        }) as Promise<CourseLessonInfo[]>
      : Promise.resolve([] as CourseLessonInfo[]),
    lesson?.id
      ? db.material.findMany({
          where: { lessonId: lesson.id, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, fileUrl: true, externalUrl: true, type: true },
        }) as Promise<LessonMaterial[]>
      : Promise.resolve([] as LessonMaterial[]),
    userId && lesson?.id
      ? db.lessonProgress.findUnique({
          where: { userId_lessonId: { userId, lessonId: lesson.id } },
          select: { completed: true, watchedSeconds: true },
        })
      : Promise.resolve(null),
  ])

  const isAccessible = lesson.isFree || Boolean(lessonAccess?.hasAccess && !lessonAccess.isPreview)
  const isReleaseLocked = lessonAccess?.isReleaseLocked ?? false
  const hasRestrictedContentAccess = isAccessible
  // previewEnabled is now admin-editable per lesson (see /admin/aulas) and defaults to true for existing paid lessons
  const canPreview = Boolean(lessonAccess?.isPreview && lesson?.previewVideoProviderId)
  const title = titulo ?? lesson?.title ?? meta?.title?.replace(/\.mp4$/i, "") ?? "Aula"
  const durationSeconds = meta?.length ?? lesson.videoDurationSeconds ?? lesson.durationSeconds ?? null
  const duration = durationSeconds ? formatDuration(durationSeconds) : null
  const embedUrl = isAccessible ? bunnySignedEmbedUrl(videoId) : ""
  const previewEmbedUrl = canPreview && lesson?.previewVideoProviderId
    ? bunnySignedEmbedUrl(lesson.previewVideoProviderId, 15 * 60, { autoplay: true, muted: false })
    : ""
  const courseTitle = lesson?.course.title ?? "Início da Jornada"
  const courseSlug = lesson?.course.slug ?? null
  const previewImage = lesson?.thumbnail ?? lesson?.videoThumbnailUrl ?? null
  const description = isReleaseLocked ? null : (lesson?.description ?? null)

  const currentIndex = courseLessons.findIndex(l => l.videoProviderId === videoId)
  const nextLesson = currentIndex >= 0 && currentIndex < courseLessons.length - 1
    ? courseLessons[currentIndex + 1]
    : null
  const initialCompleted = completionRecord?.completed ?? false

  return (
    <BunnyAulaClient
      videoId={videoId}
      lessonId={lesson?.id ?? null}
      title={title}
      subtitle={isReleaseLocked ? null : (legenda ?? null)}
      duration={duration}
      durationSeconds={durationSeconds}
      previewImage={previewImage}
      embedUrl={embedUrl}
      isAccessible={isAccessible}
      isReleaseLocked={isReleaseLocked}
      releaseAt={lessonAccess?.releaseAt ?? null}
      canViewRestrictedContent={hasRestrictedContentAccess}
      canPreview={canPreview}
      previewEmbedUrl={previewEmbedUrl}
      isFree={lesson?.isFree ?? true}
      courseTitle={courseTitle}
      courseSlug={courseSlug}
      description={description}
      courseLessons={courseLessons}
      nextLesson={nextLesson}
      materials={isAccessible ? materials : []}
      initialCompleted={initialCompleted}
      initialWatchedSeconds={completionRecord?.watchedSeconds ?? 0}
    />
  )
}
