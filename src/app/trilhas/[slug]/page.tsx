import { notFound } from "next/navigation"
import Link from "next/link"
import { existsSync } from "fs"
import { join } from "path"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ChevronLeft, Gamepad2, Play } from "lucide-react"
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
    "playstation-5": "/thumbs/ps5.png",
    "xbox-series-xs": "/thumbs/t08.jpg",
    "nintendo-switch": "/thumbs/t13.jpg",
    "fundamentos-de-eletronica": "/thumbs/t18.jpg",
  }

  // Fallback to t02.jpg if the target image file doesn't exist on disk
  const trailHeroImagesFallback: Record<string, string> = {
    "playstation-5": "/thumbs/t02.jpg",
  }

  const resolveHeroImage = (path: string): string => {
    // Skip filesystem check for absolute URLs (http, data:)
    if (path.startsWith("http") || path.startsWith("data:")) return path
    // Support both /thumbs/*.ext and root /public/*.ext paths
    const isThumbPath = path.startsWith("/thumbs/")
    const filename = isThumbPath ? path.replace("/thumbs/", "") : path.replace("/", "")
    const fullPath = isThumbPath
      ? join(process.cwd(), "public", "thumbs", filename)
      : join(process.cwd(), "public", filename)
    if (!existsSync(fullPath)) {
      return trailHeroImagesFallback[slug] ?? "/thumbs/t01.jpg"
    }
    return path
  }

  const heroImage = resolveHeroImage(
    course.coverImage ??
    course.bannerImage ??
    trailHeroImages[slug] ??
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

        {/* Course Header — same layout as home hero banner */}
        <section className="relative min-h-[60vh] md:min-h-[92vh] flex items-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Gradients — slightly lighter than home banner */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 from-[10%] via-zinc-950/45 via-[45%] to-transparent to-[70%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 from-[0%] via-zinc-950/30 via-[15%] to-transparent to-[35%]" />

          {/* Content */}
          <div className="relative z-10 w-full pt-10 px-10 md:pt-0 md:px-0 md:pl-44 lg:pl-64">
            <div className="max-w-[520px] space-y-4">
              <Link
                href="/"
                className="flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/35 hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar
              </Link>

              <div className="flex w-fit items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 bg-zinc-950/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Gamepad2 className="h-3.5 w-3.5" />
                Trilha de aprendizado
              </div>

              <h1 className="text-[2.4rem] sm:text-[2.8rem] md:text-[3.2rem] lg:text-[3.6rem] font-black tracking-tight leading-[1.05]">
                {course.title}
              </h1>

              {course.shortDescription && (
                <p className="text-zinc-300 leading-relaxed text-base md:text-lg max-w-[440px]">
                  {course.shortDescription}
                </p>
              )}

              <div className="pt-1">
                <Link
                  href={firstLessonHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold h-12 px-7 text-sm"
                >
                  <Play className="h-4 w-4 fill-zinc-950" />
                  Iniciar trilha
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Content — negative margin pulls the section up to overlap the banner bottom */}
        <div className="relative z-10 -mt-32">
          <TrailViewClient
            course={course}
            modules={course.modules}
            lessons={course.lessons}
            progressMap={progressMap}
            courseAccess={courseAccess}
            userHasAccess={!!userId}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
