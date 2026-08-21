export const revalidate = 300

import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Play, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { resolveCatalogCategoryTargetCourseSlug } from "@/lib/catalog"

interface CourseWithFirstLesson {
  id: string
  title: string
  slug: string
  coverImage: string | null
  shortDescription: string | null
  isFree: boolean
  firstLessonId: string | null
  lessonCount: number
  displayOrder: number
}

interface CategorySection {
  id: string
  name: string
  slug: string
  description: string | null
  courses: CourseWithFirstLesson[]
  children: { id: string; name: string; slug: string; count: number; targetCourseSlug: string | null }[]
}

const childCategoryOrder = [
  "inicio-da-jornada",
  "eletronica-basica",
  "ferramental",
  "micro-solda",
  "softwares",
  "administracao",
  "manutencao-geral",
  "conhecendo-professor-e-ferramentas",
]

function sortChildCategories<T extends { slug: string; name: string }>(children: T[]) {
  return [...children].sort((a, b) => {
    const aIndex = childCategoryOrder.indexOf(a.slug)
    const bIndex = childCategoryOrder.indexOf(b.slug)
    return (aIndex === -1 ? childCategoryOrder.length : aIndex) - (bIndex === -1 ? childCategoryOrder.length : bIndex) || a.name.localeCompare(b.name)
  })
}

function isPaidTrafficCourse(course: CourseWithFirstLesson) {
  return course.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("trafego pago")
}

function mapCourse(c: {
  id: string
  title: string
  slug: string
  coverImage: string | null
  shortDescription: string | null
  displayOrder: number
  modules: { lessons: { id: string; isFree: boolean }[] }[]
  lessons: { id: string }[]
}): CourseWithFirstLesson {
  const firstLesson = c.modules[0]?.lessons[0] ?? null
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    coverImage: c.coverImage,
    shortDescription: c.shortDescription,
    isFree: firstLesson?.isFree ?? false,
    firstLessonId: firstLesson?.id ?? null,
    lessonCount: c.lessons.length,
    displayOrder: c.displayOrder,
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
                  shortDescription: true,
                  displayOrder: true,
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
              shortDescription: true,
              displayOrder: true,
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
        courses: Array.from(courseMap.values()).sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title)),
        children: sortChildCategories(root.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          count: child.courseCategories.length,
          targetCourseSlug: resolveCatalogCategoryTargetCourseSlug(child),
        }))),
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
        shortDescription: true,
        displayOrder: true,
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
    <Link href={href} className="group block h-full">
      <article className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-card/80 shadow-lg shadow-black/10",
        "transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-xl hover:shadow-black/20"
      )}>
        <div className="relative aspect-video shrink-0 overflow-hidden bg-zinc-900">
        {course.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImage}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover brightness-110 transition duration-500 group-hover:scale-105"
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

        </div>
        <div className="flex min-h-[142px] flex-1 flex-col p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {course.title}
            </h3>
            <span className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5">-&gt;</span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {course.shortDescription || "Aprenda no seu ritmo com aulas praticas e organizadas."}
          </p>
        </div>
      </article>
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

  const catalogCourses = sections.flatMap((section) => section.courses)
  const courses = [
    ...catalogCourses.filter((course) => !isPaidTrafficCourse(course)),
    ...catalogCourses.filter(isPaidTrafficCourse),
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Catálogo GameDoctor</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {currentCategoryName ? `Trilhas em ${currentCategoryName}` : "Conheça todas as trilhas de aprendizado"}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {currentCategoryName
              ? "Explore as aulas desta categoria e avance passo a passo no seu ritmo."
              : "Saia do zero e avance no seu ritmo até se tornar um técnico profissional."}
          </p>
          {currentCategoryName && (
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link href="/cursos">Limpar filtro</Link>
              </Button>
            </div>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <p>Nenhuma trilha publicada para essa categoria ainda.</p>
            <p className="text-sm mt-1">Volte em breve ou escolha outra categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
