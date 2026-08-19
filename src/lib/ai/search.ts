import { db } from "@/lib/db"

export interface AiContextItem {
  source: "course" | "lesson" | "help" | "community"
  title: string
  text: string
  href: string
}

function getSearchTerms(question: string) {
  const stopWords = new Set([
    "para", "como", "qual", "quais", "onde", "quando", "sobre", "isso", "esta", "esse", "essa",
    "uma", "com", "dos", "das", "que", "por", "tem", "ser", "mais", "minha", "meu",
  ])

  return Array.from(new Set(
    question
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3 && !stopWords.has(term))
  )).slice(0, 6)
}

function containsTerms(terms: string[], fields: string[]) {
  return terms.flatMap((term) => fields.map((field) => ({ [field]: { contains: term, mode: "insensitive" as const } })))
}

export async function searchAiContext(question: string): Promise<AiContextItem[]> {
  const terms = getSearchTerms(question)
  if (terms.length === 0) return []

  const [courses, lessons, articles, topics] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED", OR: containsTerms(terms, ["title", "shortDescription", "description"]) },
      take: 4,
      orderBy: { displayOrder: "asc" },
      select: { title: true, slug: true, shortDescription: true, description: true },
    }),
    db.lesson.findMany({
      where: { status: "PUBLISHED", OR: containsTerms(terms, ["title", "description", "searchKeywords"]) },
      take: 6,
      orderBy: [{ course: { displayOrder: "asc" } }, { order: "asc" }],
      select: { id: true, title: true, description: true, searchKeywords: true, course: { select: { title: true } } },
    }),
    db.helpArticle.findMany({
      where: { status: "ACTIVE", OR: containsTerms(terms, ["title", "excerpt", "content"]) },
      take: 4,
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { title: true, slug: true, excerpt: true, content: true },
    }),
    db.communityTopic.findMany({
      where: { status: "APPROVED", OR: containsTerms(terms, ["title", "content"]) },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { title: true, slug: true, content: true },
    }),
  ])

  return [
    ...courses.map((course) => ({
      source: "course" as const,
      title: course.title,
      text: [course.shortDescription, course.description].filter(Boolean).join(" ").slice(0, 700),
      href: `/trilhas/${course.slug}`,
    })),
    ...lessons.map((lesson) => ({
      source: "lesson" as const,
      title: `${lesson.course.title} - ${lesson.title}`,
      text: [lesson.description, lesson.searchKeywords].filter(Boolean).join(" ").slice(0, 700),
      href: `/aula/${lesson.id}`,
    })),
    ...articles.map((article) => ({
      source: "help" as const,
      title: article.title,
      text: [article.excerpt, article.content].filter(Boolean).join(" ").slice(0, 700),
      href: `/ajuda/${article.slug}`,
    })),
    ...topics.map((topic) => ({
      source: "community" as const,
      title: topic.title,
      text: topic.content.slice(0, 700),
      href: `/comunidade/topico/${topic.slug}`,
    })),
  ].slice(0, 12)
}
