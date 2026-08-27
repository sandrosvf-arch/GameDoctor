import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createZip } from "@/lib/zip"

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "aula"
}

function lessonDocument(lesson: {
  title: string
  description: string | null
  searchKeywords: string | null
  transcription: string | null
  transcriptionStatus: string | null
  course: { title: string } | null
  module: { title: string } | null
}) {
  return [
    `# ${lesson.title}`,
    "",
    `- Trilha: ${lesson.course?.title ?? "Sem trilha"}`,
    `- Módulo: ${lesson.module?.title ?? "Sem módulo"}`,
    `- Status da transcrição: ${lesson.transcriptionStatus ?? "NONE"}`,
    "",
    "## Descrição",
    "",
    lesson.description?.trim() || "Sem descrição cadastrada.",
    "",
    "## Palavras-chave",
    "",
    lesson.searchKeywords?.trim() || "Sem palavras-chave cadastradas.",
    "",
    "## Transcrição",
    "",
    lesson.transcription?.trim() || "Transcrição ainda não disponível.",
    "",
  ].join("\n")
}

export async function GET() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const lessons = await db.lesson.findMany({
    orderBy: [{ course: { title: "asc" } }, { module: { order: "asc" } }, { order: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      searchKeywords: true,
      transcription: true,
      transcriptionStatus: true,
      course: { select: { title: true } },
      module: { select: { title: true } },
    },
  })

  const completed = lessons.filter((lesson) => lesson.transcription?.trim()).length
  const generatedAt = new Date()
  const readme = [
    "# Exportação de transcrições do GameDoctor",
    "",
    `Gerado em: ${generatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    `Total de aulas: ${lessons.length}`,
    `Com transcrição: ${completed}`,
    `Sem transcrição: ${lessons.length - completed}`,
    "",
    "Cada aula possui um arquivo Markdown com seus dados e a transcrição disponível no momento da exportação.",
    "",
  ].join("\n")

  const entries = lessons.map((lesson, index) => ({
    name: `aulas/${String(index + 1).padStart(4, "0")}-${safeFileName(lesson.title)}-${lesson.id}.md`,
    content: lessonDocument(lesson),
  }))
  const archive = createZip([{ name: "README.md", content: readme }, ...entries])
  const date = generatedAt.toISOString().slice(0, 10)

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="transcricoes-gamedoctor-${date}.zip"`,
      "Cache-Control": "private, no-store",
    },
  })
}
