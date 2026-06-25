export const revalidate = 300

import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Play, Lock, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"

interface CourseWithFirstLesson {
  id: string
  title: string
  slug: string
  coverImage: string | null
  isFree: boolean
  firstLessonId: string | null
  lessonCount: number
}

interface CategorySection {
  id: string
  name: string
  slug: string
  description: string | null
  courses: CourseWithFirstLesson[]
  children: { id: string; name: string; slug: string; count: number }[]
}

function mapCourse(c: {
  id: string
  title: string
  slug: string
  coverImage: string | null
  modules: { lessons: { id: string; isFree: boolean }[] }[]
  lessons: { id: string }[]
}): CourseWithFirstLesson {
  const firstLesson = c.modules[0]?.lessons[0] ?? null
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    coverImage: c.coverImage,
    isFree: firstLesson?.isFree ?? false,
    firstLessonId: firstLesson?.id ?? null,
    lessonCount: c.lessons.length,
  }
}

async function getSections(categorySlug?: string): Promise<{
  sections: CategorySection[]
  currentCategoryName: string | null
}> {
  const selectedCategory = categorySlug
    ? await db.catalogCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true, name: true, parentId: true },
      })
    : null

  const roots = await db.catalogCategory.findMany({
    where: {
      status: "ACTIVE",
      parentId: null,
      ...(selectedCategory?.parentId
        ? { id: selectedCategory.parentId }
        : selectedCategory
          ? { id: selectedCategory.id }
          : {}),
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: {
          status: "ACTIVE",
          ...(selectedCategory?.parentId ? { id: selectedCategory.id } : {}),
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        include: {
          courseCategories: {
            where: { course: { status: "PUBLISHED" } },
            select: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
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
          },
        },
      },
      courseCategories: {
        where: {
          course: { status: "PUBLISHED" },
          ...(selectedCategory?.parentId ? { categoryId: selectedCategory.id } : {}),
        },
        select: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
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
      },
    },
  })

  const sections = roots
    .map((root) => {
      const courseMap = new Map<string, CourseWithFirstLesson>()

      for (const entry of root.courseCategories) {
        courseMap.set(entry.course.id, mapCourse(entry.course))
      }

      for (const child of root.children) {
        for (const entry of child.courseCategories) {
          courseMap.set(entry.course.id, mapCourse(entry.course))
        }
      }

      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        description: root.description,
        courses: Array.from(courseMap.values()).sort((a, b) => a.title.localeCompare(b.title)),
        children: root.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          count: child.courseCategories.length,
        })),
      }
    })
    .filter((section) => section.courses.length > 0)

  if (!selectedCategory) {
    const uncategorizedCourses = await db.course.findMany({
      where: {
        status: "PUBLISHED",
        courseCategories: { none: {} },
      },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
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

    if (uncategorizedCourses.length > 0) {
      sections.push({
        id: "sem-categoria",
        name: "Sem categoria",
        slug: "sem-categoria",
        description: "Trilhas ainda nao classificadas na nova taxonomia.",
        courses: uncategorizedCourses.map(mapCourse),
        children: [],
      })
    }
  }

  return {
    sections,
    currentCategoryName: selectedCategory?.name ?? null,
  }
}

function CourseCard({ course }: { course: CourseWithFirstLesson }) {
  const href = course.firstLessonId ? `/aula/${course.firstLessonId}` : `/trilhas/${course.slug}`

  return (
    <Link href={href} className="group block">
      <div className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden bg-zinc-900",
        "ring-0 group-hover:ring-2 ring-primary/60 transition-all duration-300"
      )}>
        {course.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImage}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {course.isFree && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white">
            GRATIS
          </span>
        )}

        {!course.isFree && (
          <div className="absolute top-2 right-2">
            <Lock className="h-3.5 w-3.5 text-white/60" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>

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

export default async function CursosPage({
  searchParams,
}: {
  searchParams?: Promise<{ categoria?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const categorySlug = resolvedSearchParams?.categoria?.trim() || undefined

  let sections: CategorySection[] = []
  let currentCategoryName: string | null = null

  try {
    const data = await getSections(categorySlug)
    sections = data.sections
    currentCategoryName = data.currentCategoryName
  } catch {
    sections = []
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">
            {currentCategoryName ? `Cursos em ${currentCategoryName}` : "Todos os cursos"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Escolha por especialidade, console ou fundamento e comece a aprender agora.
          </p>
          {currentCategoryName && (
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link href="/cursos">Limpar filtro</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mb-10 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-lg">Desbloqueie todos os cursos</p>
            <p className="text-muted-foreground text-sm mt-0.5">Acesso vitalicio a todo o conteudo por um unico pagamento.</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/planos">Ver planos</Link>
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <p>Nenhum curso publicado para essa categoria ainda.</p>
            <p className="text-sm mt-1">Volte em breve ou escolha outra categoria.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.id}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{section.name}</h2>
                    {section.description && (
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    )}
                  </div>
                  {section.children.length > 0 && !categorySlug && (
                    <div className="flex flex-wrap gap-2">
                      {section.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/cursos?categoria=${child.slug}`}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                        >
                          <Tag className="h-3 w-3" />
                          {child.name}
                          <span className="opacity-60">({child.count})</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {section.courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
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
