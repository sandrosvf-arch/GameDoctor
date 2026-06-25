import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildExcerptFromHtml, sanitizeHelpHtml, slugifyHelp } from "@/lib/help-content"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function POST(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId : ""
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const slugInput = typeof body?.slug === "string" ? body.slug.trim() : ""
  const content = typeof body?.content === "string" ? sanitizeHelpHtml(body.content) : ""
  const excerptInput = typeof body?.excerpt === "string" ? body.excerpt.trim() : ""
  const order = Number(body?.order ?? 0) || 0
  const status = body?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"

  if (!categoryId || !title || !content) {
    return NextResponse.json({ error: "Categoria, título e conteúdo são obrigatórios." }, { status: 400 })
  }

  const slug = slugifyHelp(slugInput || title)
  const excerpt = excerptInput || buildExcerptFromHtml(content)

  try {
    const article = await db.helpArticle.create({
      data: {
        categoryId,
        title,
        slug,
        excerpt: excerpt || null,
        content,
        order,
        status,
      },
    })

    return NextResponse.json(article, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Já existe um tópico com esse slug." }, { status: 400 })
  }
}
