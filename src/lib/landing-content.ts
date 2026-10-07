import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

export const getLandingFaq = unstable_cache(
  () =>
    db.helpArticle.findMany({
      where: { status: "ACTIVE", category: { status: "ACTIVE" } },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }, { title: "asc" }],
      select: { title: true, slug: true, excerpt: true },
    }),
  ["landing-faq"],
  { revalidate: 300 }
)

export const getLandingCurriculum = unstable_cache(
  async () => {
    const courses = await db.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        shortDescription: true,
        lessons: {
          where: { status: "PUBLISHED" },
          select: { title: true, order: true, moduleId: true, module: { select: { order: true } } },
        },
      },
    })

    return courses
      .map((course) => ({
        id: course.id,
        title: course.title,
        description: course.shortDescription,
        lessons: course.lessons
          .sort((a, b) => {
            const moduleA = a.moduleId ? (a.module?.order ?? 0) + 1 : 0
            const moduleB = b.moduleId ? (b.module?.order ?? 0) + 1 : 0
            return moduleA - moduleB || a.order - b.order
          })
          .map((lesson) => lesson.title),
      }))
      .filter((course) => course.lessons.length > 0)
  },
  ["landing-curriculum"],
  { revalidate: 300 }
)
