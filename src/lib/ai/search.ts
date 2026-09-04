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
const MIN_FAQ_SCORE = 0.6
const MIN_FAQ_MARGIN = 0.04
const MIN_LEARNING_SCORE = 0.58
const MAX_CONTEXT_ITEMS = 6

function getSearchTerms(question: string) {
  const stopWords = new Set([
    "para", "como", "qual", "quais", "onde", "quando", "sobre", "isso", "esta", "esse", "essa",
    "uma", "com", "dos", "das", "que", "por", "tem", "ser", "mais", "minha", "meu", "estou", "nao",
    "aula", "aulas", "conteudo", "conteudos", "gamedoctor", "site",
  ])

  const terms = Array.from(new Set(
    question
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3 && !stopWords.has(term)),
  )).slice(0, 8)

  const normalizedQuestion = normalizeText(question)
  if (/\bps4\b/.test(normalizedQuestion) && !terms.includes("playstation")) terms.unshift("playstation")
  if (/\b(conclu|assistir|continuar)/.test(normalizedQuestion) && !terms.includes("progresso")) terms.unshift("progresso")
  if (/(convers|pergunt|duvid|forum)/.test(normalizedQuestion) && !terms.includes("comunidade")) {
    terms.unshift("comunidade")
  }

  return terms.slice(0, 8)
}

function containsTerms(terms: string[], fields: string[]) {
  return terms.flatMap((term) => fields.map((field) => ({
    [field]: { contains: term, mode: "insensitive" as const },
  })))
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function lexicalScore(terms: string[], fields: string[]) {
  const text = normalizeText(fields.join(" "))
  const matchedTerms = terms.filter((term) => text.includes(normalizeText(term)))
  return {
    matchedTerms,
    score: terms.length > 0 ? matchedTerms.length / terms.length : 0,
  }
}

function isPlatformQuestion(question: string) {
  const normalized = normalizeText(question)
  const hasTechnicalSubject = /\b(ps[345]|xbox|nintendo|controle|reparo|defeito|erro|bga|drift|hdmi|fonte|anal[oó]gico)\b/.test(normalized)
  return !hasTechnicalSubject && /\b(planos?|progresso|downloads?|materia(?:l|is)|comunidade|suporte|ajuda|trilhas?|cursos?|m[oó]dulos?|organiza|conversar|perguntar|d[uú]vida)\b/.test(normalized)
}

function isCatalogQuestion(question: string) {
  const normalized = normalizeText(question)
  return /\b(tem|existe|quais|qual|onde|encontrar|disponiveis?|oferece|ensinam?)\b/.test(normalized)
    && /\b(aulas?|cursos?|trilhas?|conteudo|material|ps[345]|xbox|nintendo|controle)\b/.test(normalized)
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
        AND (
          ${sourceGroup !== "faq"}
          OR EXISTS (
            SELECT 1
            FROM "help_articles" AS article
            INNER JOIN "help_categories" AS category ON category."id" = article."category_id"
            WHERE article."id" = "ai_knowledge_chunks"."source_id"
              AND article."status" = 'ACTIVE'
              AND category."slug" = 'duvidas-frequentes'
              AND category."status" = 'ACTIVE'
          )
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

async function searchFaqContext(question: string, embedding: number[] | null) {
  const normalizedQuestion = normalizeText(question)
  if (normalizedQuestion) {
    const exactArticles = await db.helpArticle.findMany({
      where: {
        status: "ACTIVE",
        category: { slug: "duvidas-frequentes", status: "ACTIVE" },
      },
      select: { title: true, slug: true, content: true },
    })
    const exact = exactArticles.find((article) => {
      const title = normalizeText(article.title)
      return title === normalizedQuestion || title.includes(normalizedQuestion) || normalizedQuestion.includes(title)
    })

    if (exact) {
      return [{
        source: "help" as const,
        title: exact.title,
        text: stripHtml(exact.content),
        href: `/suporte/topico/${exact.slug}`,
        score: 1,
      }]
    }
  }

  if (embedding) {
    try {
      const semantic = await searchSemanticContext(question, embedding, true, "faq")
      const top = semantic[0]
      const second = semantic[1]
      const margin = (top?.score ?? 0) - (second?.score ?? 0)

      if (top?.source === "help" && (top.score ?? 0) >= MIN_FAQ_SCORE && margin >= MIN_FAQ_MARGIN) {
        return [top]
      }
    } catch (error) {
      console.error("[ai/search] FAQ semÃ¢ntico indisponÃ­vel; usando tÃ­tulos do FAQ.", error)
    }
  }

  const terms = getSearchTerms(question)
  if (terms.length === 0) return []

  const articles = await db.helpArticle.findMany({
    where: {
      status: "ACTIVE",
      category: { slug: "duvidas-frequentes", status: "ACTIVE" },
      OR: containsTerms(terms, ["title", "excerpt", "content"]),
    },
    take: 30,
    select: { title: true, slug: true, content: true },
  })

  const ranked = articles
    .map((article) => {
      const title = normalizeText(article.title)
      const titleMatch = title === normalizedQuestion || title.includes(normalizedQuestion) || normalizedQuestion.includes(title)
      const lexical = lexicalScore(terms, [article.title])
      return {
        source: "help" as const,
        title: article.title,
        text: stripHtml(article.content),
        href: `/suporte/topico/${article.slug}`,
        score: titleMatch ? 1 : lexical.score,
        titleMatch,
        matchedTerms: lexical.matchedTerms,
      }
    })
    .filter((article) => article.titleMatch || (article.matchedTerms.length >= 2 && article.score >= 0.5))
    .sort((left, right) => right.score - left.score)

  return ranked.length > 0 ? [ranked[0]] : []
}

async function searchLexicalContext(question: string, technicalMode: boolean): Promise<AiContextItem[]> {
  const terms = getSearchTerms(question)
  if (terms.length === 0) return []
  const platformQuestion = isPlatformQuestion(question)

  const [platformChunks, courses, lessons] = await Promise.all([
    db.aiKnowledgeChunk.findMany({
      where: { sourceType: "platform", OR: containsTerms(terms, ["title", "content"]) },
      take: 20,
      select: { title: true, content: true, href: true },
    }),
    db.course.findMany({
      where: { status: "PUBLISHED", OR: containsTerms(terms, ["title", "shortDescription", "description"]) },
      take: 30,
      orderBy: { displayOrder: "asc" },
      select: { title: true, slug: true, shortDescription: true, description: true },
    }),
    db.lesson.findMany({
      where: { status: "PUBLISHED", OR: containsTerms(terms, ["title", "description", "searchKeywords", "transcription"]) },
      take: 30,
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
  ])

  const rankedPlatform = platformChunks
    .map((chunk) => ({ chunk, match: lexicalScore(terms, [chunk.title, chunk.content]) }))
    .filter(({ match }) => match.matchedTerms.length > 0)
    .sort((left, right) => right.match.score - left.match.score)
    .map(({ chunk }) => chunk)

  const rankedCourses = courses
    .map((course) => ({ course, match: lexicalScore(terms, [course.title, course.shortDescription ?? "", course.description ?? ""]) }))
    .filter(({ match }) => match.matchedTerms.length >= Math.min(2, terms.length))
    .sort((left, right) => right.match.score - left.match.score)
    .map(({ course }) => course)

  const rankedLessons = lessons
    .map((lesson) => ({ lesson, match: lexicalScore(terms, [lesson.title, lesson.description ?? "", lesson.searchKeywords ?? "", lesson.transcription ?? ""]) }))
    .filter(({ match }) => match.matchedTerms.length >= Math.min(2, terms.length))
    .sort((left, right) => right.match.score - left.match.score)
    .map(({ lesson }) => lesson)

  const relevantCourses = !platformQuestion && !isCatalogQuestion(question) && rankedLessons.length > 0 ? [] : rankedCourses

  return [
    ...(platformQuestion || (rankedCourses.length === 0 && rankedLessons.length === 0) ? rankedPlatform : []).map((chunk) => ({
      source: "platform" as const,
      title: chunk.title,
      text: stripHtml(chunk.content).slice(0, 1_200),
      href: chunk.href,
    })),
    ...relevantCourses.map((course) => ({
      source: "course" as const,
      title: course.title,
      text: stripHtml([course.shortDescription, course.description].filter(Boolean).join(" ")).slice(0, 1_200),
      href: `/trilhas/${course.slug}`,
    })),
    ...rankedLessons.map((lesson) => ({
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

export async function searchAiContext(
  question: string,
  technicalMode: boolean,
  options?: { embedding?: number[] | null; skipFaq?: boolean },
): Promise<AiContextItem[]> {
  let embedding: number[] | null = null
  try {
    embedding = options?.embedding === undefined
      ? await createQuestionEmbedding(question)
      : options.embedding
    if (!options?.skipFaq) {
      const faq = await searchFaqContext(question, embedding)
      if (faq.length > 0) return faq
    }

    if (embedding) {
      const semantic = await searchSemanticContext(question, embedding, technicalMode, "learning")
      const hasSpecificLearning = semantic.some((item) => item.source === "course" || item.source === "lesson")
      const relevantSemantic = hasSpecificLearning && !isPlatformQuestion(question) && !isCatalogQuestion(question)
        ? semantic.filter((item) => item.source !== "platform" && item.source !== "course")
        : semantic
      if ((relevantSemantic[0]?.score ?? 0) >= MIN_LEARNING_SCORE) return relevantSemantic

      const community = await searchSemanticContext(question, embedding, technicalMode, "community")
      if ((community[0]?.score ?? 0) >= MIN_LEARNING_SCORE) return community
    }
  } catch (error) {
    console.error("[ai/search] Busca semântica indisponível; usando busca textual.", error)
  }

  const lexical = await searchLexicalContext(question, technicalMode)
  if (lexical.length > 0) return lexical

  return searchCommunityContext(question, technicalMode)
}

export async function searchAiFaqContext(question: string) {
  try {
    const embedding = await createQuestionEmbedding(question)
    const context = await searchFaqContext(question, embedding)
    return { context, embedding }
  } catch (error) {
    console.error("[ai/search] Busca do FAQ indisponÃ­vel.", error)
    return { context: [] as AiContextItem[], embedding: null }
  }
}
