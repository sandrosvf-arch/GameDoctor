import { notFound } from "next/navigation"
import Link from "next/link"
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

  const heroImage = "/thumbs/t08.jpg"

  return (
    <>
      <Header />
      <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(120%_80%_at_10%_0%,rgba(16,185,129,0.18),transparent_45%),radial-gradient(120%_90%_at_90%_10%,rgba(34,211,238,0.18),transparent_42%),#09090b] text-white">

        {/* Course Header - fixed banner style */}
        <div className="px-4 pb-12 pt-4 md:px-8 lg:px-14">
          <div className="relative overflow-hidden rounded-[22px] border border-emerald-500/25 bg-zinc-900 shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            {course.coverImage && (
              // Blend the trail image lightly over Xbox background to keep context while preserving requested Xbox visual.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverImage}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/72 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
            <div className="absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl" />

            <div className="relative z-10 flex min-h-[360px] flex-col justify-between p-6 md:min-h-[430px] md:p-10 lg:p-12">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/35 hover:text-white"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Voltar
                </Link>
              </div>

              <div>
              <span className="mb-3 inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300 backdrop-blur-sm">
                Trilha de aprendizado
              </span>

              <h1 className="mb-3 max-w-4xl text-3xl font-black leading-tight md:text-5xl">{course.title}</h1>

              {course.shortDescription && (
                <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-200/95 md:text-base">
                  {course.shortDescription}
                </p>
              )}

              <div className="mb-6 flex flex-wrap gap-3">
                <Link
                  href="/planos"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-all hover:from-emerald-300 hover:to-cyan-300"
                >
                  Ver planos
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-xl border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Voltar para home
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-2xl">
                <div className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Total de aulas</p>
                  <p className="mt-1 text-xl font-bold text-cyan-300">{allLessons.length}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Duração total</p>
                  <p className="mt-1 text-xl font-bold text-cyan-300">{handleDurationFormat(totalDuration)}</p>
                </div>
                {userId && (
                  <div className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm col-span-2 md:col-span-1">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Seu progresso</p>
                    <p className="mt-1 text-xl font-bold text-emerald-300">{progressMap.size}/{allLessons.length}</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

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
