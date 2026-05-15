import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ChevronLeft, Lock, Play } from "lucide-react"
import { TrailViewClient } from "./TrailViewClient"

interface TrailPageProps {
  params: {
    slug: string
  }
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
          progressSeconds: true,
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

  const BUNNY_CDN = "vz-38444944-922.b-cdn.net"

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

        {/* Course Header */}
        <div className="px-4 md:px-8 lg:px-14 pb-12">
          <div className="mb-8">
            {course.coverImage && (
              <div className="relative w-full h-[300px] rounded-lg overflow-hidden mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{course.title}</h1>
            {course.shortDescription && (
              <p className="text-lg text-zinc-300 mb-6 max-w-3xl">{course.shortDescription}</p>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-zinc-500">Total de aulas</span>
                <span className="text-xl font-semibold text-cyan-400">
                  {allLessons.length} aulas
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-500">Duração total</span>
                <span className="text-xl font-semibold text-cyan-400">
                  {handleDurationFormat(totalDuration)}
                </span>
              </div>
              {userId && (
                <div className="flex flex-col">
                  <span className="text-zinc-500">Seu progresso</span>
                  <span className="text-xl font-semibold text-emerald-400">
                    {progressMap.size} de {allLessons.length} assistidas
                  </span>
                </div>
              )}
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
