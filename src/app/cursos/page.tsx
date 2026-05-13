export const dynamic = "force-dynamic"

import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Play, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"

interface CourseWithFirstLesson {
  id: string
  title: string
  coverImage: string | null
  isFree: boolean
  firstLessonId: string | null
  lessonCount: number
}

interface PlatformSection {
  id: string
  name: string
  courses: CourseWithFirstLesson[]
}

async function getData(): Promise<PlatformSection[]> {
  const platforms = await db.platform.findMany({
    where: { status: "ACTIVE" },
    orderBy: { order: "asc" },
    include: {
      courses: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          coverImage: true,
          modules: {
            where: { status: "ACTIVE" },
            orderBy: { order: "asc" },
            take: 1,
            select: {
              lessons: {
                where: { status: "PUBLISHED" },
                orderBy: { order: "asc" },
                take: 1,
                select: { id: true, isFree: true },
              },
            },
          },
          lessons: {
            where: { status: "PUBLISHED" },
            select: { id: true },
          },
        },
      },
    },
  })

  // Also fetch courses without a platform
  const noPlatformCourses = await db.course.findMany({
    where: { status: "PUBLISHED", platformId: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      coverImage: true,
      modules: {
        where: { status: "ACTIVE" },
        orderBy: { order: "asc" },
        take: 1,
        select: {
          lessons: {
            where: { status: "PUBLISHED" },
            orderBy: { order: "asc" },
            take: 1,
            select: { id: true, isFree: true },
          },
        },
      },
      lessons: {
        where: { status: "PUBLISHED" },
        select: { id: true },
      },
    },
  })

  const mapCourse = (c: {
    id: string
    title: string
    coverImage: string | null
    modules: { lessons: { id: string; isFree: boolean }[] }[]
    lessons: { id: string }[]
  }): CourseWithFirstLesson => {
    const firstLesson = c.modules[0]?.lessons[0] ?? null
    return {
      id: c.id,
      title: c.title,
      coverImage: c.coverImage,
      isFree: firstLesson?.isFree ?? false,
      firstLessonId: firstLesson?.id ?? null,
      lessonCount: c.lessons.length,
    }
  }

  const sections: PlatformSection[] = platforms
    .filter((p) => p.courses.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      courses: p.courses.map(mapCourse),
    }))

  if (noPlatformCourses.length > 0) {
    sections.push({
      id: "outros",
      name: "Outros",
      courses: noPlatformCourses.map(mapCourse),
    })
  }

  return sections
}

function CourseCard({ course }: { course: CourseWithFirstLesson }) {
  const href = course.firstLessonId ? `/aula/${course.firstLessonId}` : "/planos"

  return (
    <Link href={href} className="group block">
      <div className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden bg-zinc-900",
        "ring-0 group-hover:ring-2 ring-primary/60 transition-all duration-300"
      )}>
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          />
        )}

        {/* overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* badge */}
        {course.isFree && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
            GRÁTIS
          </span>
        )}

        {/* lock */}
        {!course.isFree && (
          <div className="absolute top-2 right-2">
            <Lock className="h-3.5 w-3.5 text-white/60" />
          </div>
        )}

        {/* play hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>

        {/* title bar */}
        <div className="absolute bottom-0 inset-x-0 px-2 pb-2">
          <p className="text-white text-xs font-medium leading-snug line-clamp-2">{course.title}</p>
          {course.lessonCount > 0 && (
            <p className="text-white/50 text-[10px] mt-0.5">{course.lessonCount} aula{course.lessonCount !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default async function CursosPage() {
  let sections: PlatformSection[] = []
  try {
    sections = await getData()
  } catch {
    // DB unreachable — render empty state
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Todos os cursos</h1>
          <p className="text-muted-foreground mt-2">
            Escolha por console ou fundamento e comece a aprender agora.
          </p>
        </div>

        {/* CTA upgrade */}
        <div className="mb-10 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-lg">Desbloqueie todos os cursos</p>
            <p className="text-muted-foreground text-sm mt-0.5">Acesso vitalício a todo o conteúdo por um único pagamento.</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/planos">Ver planos</Link>
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <p>Nenhum curso publicado ainda.</p>
            <p className="text-sm mt-1">Volte em breve — novos cursos chegando!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {sections.map((sec) => (
              <section key={sec.id}>
                <h2 className="text-xl font-semibold mb-5">{sec.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sec.courses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
