import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ChevronLeft } from "lucide-react"
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

  const heroImage = course.bannerImage || course.coverImage || "/thumbs/t01.jpg"

  return (
    <>
      <Header />
      <main className="bg-zinc-950 text-white min-h-screen">
        {/* Breadcrumb */}
        <div className="px-4 md:px-8 lg:px-14 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>

        {/* Course Header - fixed banner style */}
        <div className="px-4 md:px-8 lg:px-14 pb-12">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={course.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            <div className="relative z-10 p-6 md:p-10 lg:p-12 min-h-[280px] md:min-h-[340px] flex flex-col justify-end">
              <span className="mb-3 inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300 backdrop-blur-sm">
                Trilha de aprendizado
              </span>

              <h1 className="text-3xl md:text-5xl font-black leading-tight mb-3 max-w-4xl">{course.title}</h1>

              {course.shortDescription && (
                <p className="text-sm md:text-base text-zinc-200/95 mb-6 max-w-3xl leading-relaxed">
                  {course.shortDescription}
                </p>
              )}

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
