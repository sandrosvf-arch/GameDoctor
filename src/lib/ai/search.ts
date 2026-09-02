import OpenAI from "openai"
import { db } from "@/lib/db"

export interface AiContextItem {
  source: "course" | "lesson" | "help" | "platform" | "community"
  title: string
  text: string
  href: string
  score?: number
}

interface SemanticRow {
  source: AiContextItem["source"]
  sourceId: string
  title: string
  text: string
  href: string
  score: number
}

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small"
const MIN_SEMANTIC_SCORE = 0.54
const MAX_CONTEXT_ITEMS = 6

function getSearchTerms(question: string) {
  const stopWords = new Set([
    "para", "como", "qual", "quais", "onde", "quando", "sobre", "isso", "esta", "esse", "essa",
    "uma", "com", "dos", "das", "que", "por", "tem", "ser", "mais", "minha", "meu", "estou", "nao",
    "aula", "aulas", "conteudo", "conteudos", "gamedoctor", "site",
  ])

  return Array.from(new Set(
    question
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3 && !stopWords.has(term)),
  )).slice(0, 8)
}

function containsTerms(terms: string[], fields: string[]) {
  return terms.flatMap((term) => fields.map((field) => ({
    [field]: { contains: term, mode: "insensitive" as const },
  })))
}

function containsAllTerms(terms: string[], fields: string[]) {
  return terms.map((term) => ({ OR: containsTerms([term], fields) }))
}

function stripHtml(value: string | null | undefined) {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function buildLessonHref(lesson: {
  id: string
  videoProviderId: string | null
}) {
  if (!lesson.videoProviderId) return `/aula/${lesson.id}`
  return `/aula/bunny/${lesson.videoProviderId}`
}

function vectorLiteral(embedding: number[]) {
  if (embedding.length !== 1536) throw new Error("Dimensão de embedding incompatível com o índice.")
  return `[${embedding.join(",")}]`
}

async function createQuestionEmbedding(question: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const openai = new OpenAI({ apiKey })
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: question })
  return response.data[0]?.embedding ?? null
}

async function searchSemanticContext(
  question: string,
  embedding: number[],
  technicalMode: boolean,
  sourceGroup: "faq" | "learning" | "community",
) {
  const rows = await db.$queryRaw<SemanticRow[]>`
    WITH scored AS (
      SELECT
      "source_type" AS "source",
      "source_id" AS "sourceId",
      "title",
      CASE
        WHEN "source_type" IN ('lesson', 'community') AND NOT ${technicalMode}
          THEN 'Conteúdo disponível para alunos com plano ativo.'
        ELSE LEFT("content", 1200)
      END AS "text",
      "href",
      (
        (1 - ("embedding" <=> ${vectorLiteral(embedding)}::vector)) * 0.85
        + LEAST(
            ts_rank(
              to_tsvector('portuguese', "title" || ' ' || "content"),
              plainto_tsquery('portuguese', ${question})
            ),
            1
          ) * 0.15
      )::double precision AS "score"
      FROM "ai_knowledge_chunks"
      WHERE (
        (${sourceGroup === "community"} AND "source_type" = 'community')
        OR (${sourceGroup === "faq"} AND "source_type" = 'help')
        OR (${sourceGroup === "learning"} AND "source_type" IN ('course', 'lesson', 'platform'))
      )
        AND (
        1 - ("embedding" <=> ${vectorLiteral(embedding)}::vector) >= ${MIN_SEMANTIC_SCORE}
        OR to_tsvector('portuguese', "title" || ' ' || "content")
          @@ plainto_tsquery('portuguese', ${question})
        )
    ), deduplicated AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY "href" ORDER BY "score" DESC) AS "position"
      FROM scored
    )
    SELECT "source", "sourceId", "title", "text", "href", "score"
    FROM deduplicated
    WHERE "position" = 1
    ORDER BY "score" DESC
    LIMIT ${MAX_CONTEXT_ITEMS}
  `

  const faqIds = rows.filter((row) => row.source === "help").map((row) => row.sourceId)
  const faqArticles = faqIds.length > 0
    ? await db.helpArticle.findMany({ where: { id: { in: faqIds }, status: "ACTIVE" }, select: { id: true, content: true } })
    : []
  const faqContent = new Map(faqArticles.map((article) => [article.id, stripHtml(article.content)]))

  return rows.map((row) => ({
    ...row,
    text: row.source === "help" ? faqContent.get(row.sourceId) ?? stripHtml(row.text) : stripHtml(row.text),
  }))
}

async function searchLexicalContext(question: string, technicalMode: boolean): Promise<AiContextItem[]> {
  const terms = getSearchTerms(question)
  if (terms.length === 0) return []

  const [courses, lessons, articles] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED", OR: containsTerms(terms, ["title", "shortDescription", "description"]) },
      take: 4,
      orderBy: { displayOrder: "asc" },
      select: { title: true, slug: true, shortDescription: true, description: true },
    }),
    db.lesson.findMany({
      where: { status: "PUBLISHED", OR: containsTerms(terms, ["title", "description", "searchKeywords", "transcription"]) },
      take: 6,
      orderBy: [{ course: { displayOrder: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        searchKeywords: true,
        transcription: true,
        videoProviderId: true,
        course: { select: { title: true } },
      },
    }),
    db.helpArticle.findMany({
      where: { status: "ACTIVE", AND: containsAllTerms(terms, ["title", "excerpt", "content"]) },
      take: 4,
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { title: true, slug: true, excerpt: true, content: true },
    }),
  ])

  return [
    ...articles.map((article) => ({
      source: "help" as const,
      title: article.title,
      text: stripHtml(article.content),
      href: `/suporte/topico/${article.slug}`,
    })),
    ...courses.map((course) => ({
      source: "course" as const,
      title: course.title,
      text: stripHtml([course.shortDescription, course.description].filter(Boolean).join(" ")).slice(0, 1_200),
      href: `/trilhas/${course.slug}`,
    })),
    ...lessons.map((lesson) => ({
      source: "lesson" as const,
      title: `${lesson.course.title} - ${lesson.title}`,
      text: technicalMode
        ? stripHtml([lesson.description, lesson.searchKeywords, lesson.transcription].filter(Boolean).join(" ")).slice(0, 1_200)
        : "Conteúdo técnico disponível para alunos com plano ativo.",
      href: buildLessonHref(lesson),
    })),
  ].slice(0, MAX_CONTEXT_ITEMS)
}

async function searchCommunityContext(question: string, technicalMode: boolean): Promise<AiContextItem[]> {
  const terms = getSearchTerms(question)
  if (terms.length === 0) return []

  const topics = await db.communityTopic.findMany({
    where: {
      status: "APPROVED",
      AND: terms.map((term) => ({
        OR: [
          ...containsTerms([term], ["title", "content"]),
          { posts: { some: { status: "APPROVED", OR: containsTerms([term], ["content"]) } } },
        ],
      })),
    },
    take: MAX_CONTEXT_ITEMS,
    orderBy: { lastReplyAt: "desc" },
    select: {
      title: true,
      slug: true,
      content: true,
      posts: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        take: 8,
        select: { content: true },
      },
    },
  })

  return topics.map((topic) => ({
    source: "community" as const,
    title: topic.title,
    text: technicalMode
      ? stripHtml([topic.content, ...topic.posts.map((post) => post.content)].join(" ")).slice(0, 1_200)
      : "Discussão da comunidade disponível para alunos com plano ativo.",
    href: `/comunidade/topico/${topic.slug}`,
  }))
}

export async function searchAiContext(question: string, technicalMode: boolean): Promise<AiContextItem[]> {
  let embedding: number[] | null = null
  try {
    embedding = await createQuestionEmbedding(question)
    if (embedding) {
      const faq = await searchSemanticContext(question, embedding, technicalMode, "faq")
      if (faq.length > 0) return faq

      const semantic = await searchSemanticContext(question, embedding, technicalMode, "learning")
      if (semantic.length > 0) return semantic

      const community = await searchSemanticContext(question, embedding, technicalMode, "community")
      if (community.length > 0) return community
    }
  } catch (error) {
    console.error("[ai/search] Busca semântica indisponível; usando busca textual.", error)
  }

  const lexical = await searchLexicalContext(question, technicalMode)
  if (lexical.length > 0) return lexical

  return searchCommunityContext(question, technicalMode)
}
