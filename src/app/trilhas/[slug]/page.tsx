import { notFound } from "next/navigation"
import Link from "next/link"
import { existsSync } from "fs"
import { join } from "path"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TrailViewClient } from "./TrailViewClient"

interface TrailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function TrailPage({ params }: TrailPageProps) {
  const session = await auth()
  const userId = session?.user?.id

  // Find course by slug
  const { slug } = await params
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      modules: {
        include: {
          lessons: {
            where: { status: "PUBLISHED" },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      lessons: {
        where: { 
          moduleId: null, 
          status: "PUBLISHED" 
        },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!course) {
    notFound()
  }

  // Get user's progress for this course
  const userProgress = userId
    ? await db.lessonProgress.findMany({
        where: {
          userId,
          lesson: {
            courseId: course.id,
          },
        },
        select: {
          lessonId: true,
          watchedSeconds: true,
          completedAt: true,
        },
      })
    : []

  // Calculate stats
  const allLessons = [
    ...course.lessons,
    ...course.modules.flatMap((m) => m.lessons),
  ]
  const totalDuration = allLessons.reduce(
    (sum, l) => sum + (l.videoDurationSeconds || l.durationSeconds || 0),
    0
  )
  const progressMap = new Map(userProgress.map((p) => [p.lessonId, p]))

  // Check access to course
  let courseAccess = false
  if (course.lessons.some((l) => l.isFree) || course.modules.some((m) => m.lessons.some((l) => l.isFree))) {
    courseAccess = true
  } else if (userId) {
    const { hasAccessToCourse } = await import("@/lib/access")
    courseAccess = await hasAccessToCourse(userId, course.id)
  }

  const handleDurationFormat = (seconds: number | null | undefined): string => {
    if (!seconds) return "Sem duração"
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
    }
    return `${Math.floor(seconds / 60)} min`
  }

  const trailHeroImages: Record<string, string> = {
    "inicio-da-jornada": "/thumbs/t01.jpg",
    "playstation-5": "/thumbs/ps5.jpg",
    "xbox-series-xs": "/thumbs/t08.jpg",
    "nintendo-switch": "/thumbs/t13.jpg",
    "fundamentos-de-eletronica": "/thumbs/t18.jpg",
  }

  // Fallback to t02.jpg if the target image file doesn't exist on disk
  const trailHeroImagesFallback: Record<string, string> = {
    "playstation-5": "/thumbs/t02.jpg",
  }

  const resolveHeroImage = (path: string): string => {
    const filename = path.replace("/thumbs/", "")
    const fullPath = join(process.cwd(), "public", "thumbs", filename)
    if (!existsSync(fullPath)) {
      return trailHeroImagesFallback[slug] ?? "/thumbs/t01.jpg"
    }
    return path
  }

  const heroImage = resolveHeroImage(
    trailHeroImages[slug] ??
    course.bannerImage ??
    course.coverImage ??
    "/thumbs/t01.jpg"
  )

  const firstLesson = allLessons[0]
  const firstLessonHref = firstLesson
    ? firstLesson.videoProviderId
      ? `/aula/bunny/${firstLesson.videoProviderId}?titulo=${encodeURIComponent(firstLesson.title)}${firstLesson.description ? `&legenda=${encodeURIComponent(firstLesson.description)}` : ""}`
      : `/aula/${firstLesson.id}`
    : "/cursos"

  return (
    <>
      <Header />
      <main className="bg-zinc-950 text-white overflow-x-hidden">

        {/* Course Header - full banner like home */}
        <section className="relative min-h-[54vh] md:min-h-[62vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/40 to-black/10" />

          <div className="relative z-10 px-4 md:px-8 lg:px-14 h-full min-h-[54vh] md:min-h-[62vh] flex flex-col justify-end pb-10 md:pb-14">
            <Link
              href="/"
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/35 hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>

            <span className="mb-3 inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur-sm">
              Trilha de aprendizado
            </span>

            <h1 className="mb-3 max-w-4xl text-3xl font-black leading-tight md:text-5xl [text-shadow:0_2px_12px_rgba(0,0,0,1),0_4px_32px_rgba(0,0,0,0.9)]">{course.title}</h1>

            {course.shortDescription && (
              <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-200/95 md:text-base [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
                {course.shortDescription}
              </p>
            )}

            <div className="mb-6 flex flex-wrap gap-3">
              <Link
                href={firstLessonHref}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-all hover:from-emerald-300 hover:to-cyan-300"
              >
                Começar trilha
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/planos"
                className="inline-flex items-center rounded-xl border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Ver planos
              </Link>
            </div>

            <div className="grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              <div className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Total de aulas</p>
                <p className="mt-1 text-xl font-bold text-cyan-300">{allLessons.length}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Duração total</p>
                <p className="mt-1 text-xl font-bold text-cyan-300">{handleDurationFormat(totalDuration)}</p>
              </div>
              {userId && (
                <div className="col-span-2 rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm md:col-span-1">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Seu progresso</p>
                  <p className="mt-1 text-xl font-bold text-emerald-300">{progressMap.size}/{allLessons.length}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <TrailViewClient
          course={course}
          modules={course.modules}
          lessons={course.lessons}
          progressMap={progressMap}
          courseAccess={courseAccess}
          userHasAccess={!!userId}
        />
      </main>
      <Footer />
    </>
  )
}
