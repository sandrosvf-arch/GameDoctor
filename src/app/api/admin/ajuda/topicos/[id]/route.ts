import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildExcerptFromHtml, sanitizeHelpHtml, slugifyHelp } from "@/lib/help-content"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const data: {
    categoryId?: string
    title?: string
    slug?: string
    excerpt?: string | null
    content?: string
    order?: number
    status?: "ACTIVE" | "INACTIVE"
  } = {}

  if (typeof body?.categoryId === "string") data.categoryId = body.categoryId
  if (typeof body?.title === "string") data.title = body.title.trim()
  if (typeof body?.slug === "string") data.slug = slugifyHelp(body.slug)
  if (typeof body?.excerpt === "string") data.excerpt = body.excerpt.trim() || null
  if (body?.excerpt === null) data.excerpt = null
  if (typeof body?.content === "string") {
    data.content = sanitizeHelpHtml(body.content)
    if (data.excerpt === undefined) {
      data.excerpt = buildExcerptFromHtml(data.content)
    }
  }
  if (body?.order !== undefined) data.order = Number(body.order) || 0
  if (body?.status === "ACTIVE" || body?.status === "INACTIVE") data.status = body.status

  try {
    const article = await db.helpArticle.update({
      where: { id },
      data,
    })

    return NextResponse.json(article)
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o tópico." }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await db.helpArticle.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
