import crypto from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import OpenAI from "openai"
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536
const CHUNK_SIZE = 1_800
const CHUNK_OVERLAP = 250
const BATCH_SIZE = 40

type SourceType = "course" | "lesson" | "help" | "platform" | "community"

interface SourceDocument {
  sourceType: SourceType
  sourceId: string
  title: string
  content: string
  href: string
}

interface KnowledgeChunk extends SourceDocument {
  chunkIndex: number
  contentHash: string
}

interface ExistingChunk {
  sourceType: string
  sourceId: string
  chunkIndex: number
  contentHash: string
}

function stripHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function buildLessonHref(lesson: {
  id: string
  videoProviderId: string | null
}) {
  if (!lesson.videoProviderId) return `/aula/${lesson.id}`
  return `/aula/bunny/${lesson.videoProviderId}`
}

function splitIntoChunks(document: SourceDocument): KnowledgeChunk[] {
  const content = stripHtml(document.content)
  if (!content) return []

  const chunks: KnowledgeChunk[] = []
  let start = 0
  let chunkIndex = 0

  while (start < content.length) {
    let end = Math.min(start + CHUNK_SIZE, content.length)
    if (end < content.length) {
      const boundary = content.lastIndexOf(" ", end)
      if (boundary > start + Math.floor(CHUNK_SIZE * 0.65)) end = boundary
    }

    const chunkContent = content.slice(start, end).trim()
    const contentHash = crypto
      .createHash("sha256")
      .update([document.title, chunkContent, document.href].join("\n"))
      .digest("hex")

    chunks.push({ ...document, content: chunkContent, chunkIndex, contentHash })
    if (end >= content.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP)
    chunkIndex += 1
  }

  return chunks
}

const platformDocuments: SourceDocument[] = [
  {
    sourceType: "platform",
    sourceId: "courses",
    title: "Cursos, trilhas e aulas",
    content: "Os conteúdos da GameDoctor são organizados em trilhas, cursos, módulos e aulas. O aluno pode pesquisar conteúdos, acessar a trilha e continuar estudando pelo dashboard.",
    href: "/cursos",
  },
  {
    sourceType: "platform",
    sourceId: "community",
    title: "Comunidade GameDoctor",
    content: "A comunidade é o fórum da GameDoctor. Alunos podem acessar fóruns, criar tópicos, responder discussões e compartilhar experiências. Algumas interações exigem plano ativo.",
    href: "/comunidade",
  },
  {
    sourceType: "platform",
    sourceId: "support",
    title: "Central de ajuda e tickets",
    content: "A central de ajuda reúne respostas oficiais. Quando a dúvida não for resolvida, o aluno pode abrir um ticket e acompanhar as respostas da equipe.",
    href: "/suporte",
  },
  {
    sourceType: "platform",
    sourceId: "plans",
    title: "Plano e assinatura",
    content: "A página de planos apresenta o acesso disponível, benefícios, período e condições de pagamento. A contratação libera os conteúdos vinculados ao plano após a confirmação do pagamento.",
    href: "/planos",
  },
  {
    sourceType: "platform",
    sourceId: "progress",
    title: "Progresso e continuar assistindo",
    content: "O dashboard registra aulas assistidas, progresso dos cursos, tempo de estudo e conteúdos recentes para continuar assistindo.",
    href: "/progresso",
  },
  {
    sourceType: "platform",
    sourceId: "materials",
    title: "Materiais para download",
    content: "Assinantes podem acessar materiais didáticos, softwares, diagramas e outros arquivos disponibilizados pela equipe na área de materiais.",
    href: "/downloads",
  },
  {
    sourceType: "platform",
    sourceId: "lesson-suggestion",
    title: "Solicitar uma nova aula",
    content: "Quando a plataforma ainda não possui uma aula sobre o assunto procurado, o usuário pode enviar uma sugestão de nova aula para a equipe GameDoctor.",
    href: "/busca?sugerir=1",
  },
]

async function loadDocuments(): Promise<SourceDocument[]> {
  const [courses, lessons, articles, communityTopics] = await Promise.all([
    db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, slug: true, shortDescription: true, description: true },
    }),
    db.lesson.findMany({
      where: { status: "PUBLISHED" },
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
      where: { status: "ACTIVE" },
      select: { id: true, title: true, slug: true, excerpt: true, content: true },
    }),
    db.communityTopic.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        posts: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "asc" },
          select: { content: true },
        },
      },
    }),
  ])

  const knowledgebaseDocuments = await loadKnowledgebaseDocuments()

  return [
    ...platformDocuments,
    ...courses.map((course) => ({
      sourceType: "course" as const,
      sourceId: course.id,
      title: course.title,
      content: [course.shortDescription, course.description].filter(Boolean).join("\n"),
      href: `/trilhas/${course.slug}`,
    })),
    ...lessons.map((lesson) => ({
      sourceType: "lesson" as const,
      sourceId: lesson.id,
      title: `${lesson.course.title} - ${lesson.title}`,
      content: [lesson.description, lesson.searchKeywords, lesson.transcription].filter(Boolean).join("\n"),
      href: buildLessonHref(lesson),
    })),
    ...articles.map((article) => ({
      sourceType: "help" as const,
      sourceId: article.id,
      title: article.title,
      content: [article.excerpt, article.content].filter(Boolean).join("\n"),
      href: `/suporte/topico/${article.slug}`,
    })),
    ...communityTopics.map((topic) => ({
      sourceType: "community" as const,
      sourceId: topic.id,
      title: topic.title,
      content: [topic.content, ...topic.posts.map((post) => post.content)].join("\n"),
      href: `/comunidade/topico/${topic.slug}`,
    })),
    ...knowledgebaseDocuments,
  ]
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listJsonFiles(fullPath))
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) files.push(fullPath)
  }
  return files
}

function jsonTitle(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  for (const key of ["titulo", "título", "title", "nome", "name", "arquivo"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim()
  }
  return fallback
}

function jsonText(value: unknown, label = ""): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return label ? `${label}: ${String(value)}` : String(value)
  }
  if (Array.isArray(value)) return value.map((item) => jsonText(item)).filter(Boolean).join("\n")
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["embedding", "vector"].includes(key.toLowerCase()))
      .map(([key, item]) => jsonText(item, key))
      .filter(Boolean)
      .join("\n")
  }
  return ""
}

async function loadKnowledgebaseDocuments(): Promise<SourceDocument[]> {
  const root = path.resolve(process.cwd(), "knowledgebase")
  let files: string[]
  try {
    files = await listJsonFiles(root)
  } catch {
    return []
  }

  const documents: SourceDocument[] = []
  for (const file of files) {
    try {
      const parsed: unknown = JSON.parse(await readFile(file, "utf8"))
      const values = Array.isArray(parsed) ? parsed : [parsed]
      const relative = path.relative(root, file).replaceAll(path.sep, "/")
      values.forEach((value, index) => {
        const fallback = relative.replace(/\.json$/i, "")
        const title = values.length > 1 ? `${jsonTitle(value, fallback)} (${index + 1})` : jsonTitle(value, fallback)
        const content = jsonText(value).slice(0, 50_000)
        if (!content.trim()) return
        documents.push({
          sourceType: "lesson",
          sourceId: `knowledgebase:${relative}:${index}`,
          title,
          content,
          href: "/cursos",
        })
      })
    } catch (error) {
      console.warn(`JSON ignorado no knowledgebase: ${file}`, error)
    }
  }
  return documents
}

function chunkKey(chunk: Pick<KnowledgeChunk, "sourceType" | "sourceId" | "chunkIndex">) {
  return `${chunk.sourceType}:${chunk.sourceId}:${chunk.chunkIndex}`
}

function vectorLiteral(embedding: number[]) {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding com ${embedding.length} dimensões; esperado: ${EMBEDDING_DIMENSIONS}.`)
  }
  return `[${embedding.join(",")}]`
}

async function main() {
  const apply = process.argv.includes("--apply")
  const documents = await loadDocuments()
  const chunks = documents.flatMap(splitIntoChunks)
  const existing = await db.$queryRaw<ExistingChunk[]>`
    SELECT
      "source_type" AS "sourceType",
      "source_id" AS "sourceId",
      "chunk_index" AS "chunkIndex",
      "content_hash" AS "contentHash"
    FROM "ai_knowledge_chunks"
  `
  const existingByKey = new Map(existing.map((item) => [chunkKey(item as KnowledgeChunk), item]))
  const changed = chunks.filter((chunk) => existingByKey.get(chunkKey(chunk))?.contentHash !== chunk.contentHash)
  const desiredKeys = new Set(chunks.map(chunkKey))
  const stale = existing.filter((item) => !desiredKeys.has(chunkKey(item as KnowledgeChunk)))

  console.log(`${documents.length} documento(s), ${chunks.length} trecho(s).`)
  console.log(`${changed.length} novo(s)/alterado(s), ${stale.length} removido(s), ${chunks.length - changed.length} inalterado(s).`)
  if (!apply) {
    console.log("Simulação concluída. Use --apply para atualizar o índice.")
    return
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.")
  const openai = new OpenAI({ apiKey })

  for (let offset = 0; offset < changed.length; offset += BATCH_SIZE) {
    const batch = changed.slice(offset, offset + BATCH_SIZE)
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch.map((chunk) => `${chunk.title}\n${chunk.content}`),
    })

    const records = batch.map((chunk, index) => {
      const embedding = response.data[index]?.embedding
      if (!embedding) throw new Error(`Embedding ausente para ${chunk.title}.`)

      return {
        id: crypto.randomUUID(),
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        chunkIndex: chunk.chunkIndex,
        title: chunk.title,
        content: chunk.content,
        href: chunk.href,
        contentHash: chunk.contentHash,
        embedding: vectorLiteral(embedding),
      }
    })

    await db.$executeRaw`
      WITH incoming AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb) AS item(
          "id" text,
          "sourceType" text,
          "sourceId" text,
          "chunkIndex" integer,
          "title" text,
          "content" text,
          "href" text,
          "contentHash" text,
          "embedding" text
        )
      )
      INSERT INTO "ai_knowledge_chunks" (
        "id", "source_type", "source_id", "chunk_index", "title", "content",
        "href", "content_hash", "embedding", "created_at", "updated_at"
      )
      SELECT
        "id", "sourceType", "sourceId", "chunkIndex", "title", "content",
        "href", "contentHash", "embedding"::vector, NOW(), NOW()
      FROM incoming
      ON CONFLICT ("source_type", "source_id", "chunk_index") DO UPDATE SET
        "title" = EXCLUDED."title",
        "content" = EXCLUDED."content",
        "href" = EXCLUDED."href",
        "content_hash" = EXCLUDED."content_hash",
        "embedding" = EXCLUDED."embedding",
        "updated_at" = NOW()
    `

    console.log(`Indexados ${Math.min(offset + batch.length, changed.length)}/${changed.length}.`)
  }

  for (const item of stale) {
    await db.$executeRaw`
      DELETE FROM "ai_knowledge_chunks"
      WHERE "source_type" = ${item.sourceType}
        AND "source_id" = ${item.sourceId}
        AND "chunk_index" = ${item.chunkIndex}
    `
  }

  console.log("Índice semântico atualizado.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => db.$disconnect())
