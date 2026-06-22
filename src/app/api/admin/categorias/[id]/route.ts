import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugifyCatalogName } from "@/lib/catalog"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const name = body?.name === undefined ? undefined : String(body.name).trim()
  const slug = body?.slug === undefined ? undefined : String(body.slug).trim()
  const description = body?.description === undefined ? undefined : String(body.description).trim()
  const status = body?.status === "INACTIVE" ? "INACTIVE" : body?.status === "ACTIVE" ? "ACTIVE" : undefined
  const order = typeof body?.order === "number" ? body.order : undefined
  const parentId = body?.parentId === undefined ? undefined : body.parentId ? String(body.parentId) : null
  const current = await db.catalogCategory.findUnique({
    where: { id },
    select: { name: true },
  })

  if (!current) {
    return NextResponse.json({ error: "Categoria nao encontrada." }, { status: 404 })
  }

  if (parentId) {
    if (parentId === id) {
      return NextResponse.json({ error: "Uma categoria nao pode ser pai dela mesma." }, { status: 400 })
    }

    const parent = await db.catalogCategory.findUnique({
      where: { id: parentId },
      select: { id: true, parentId: true },
    })
    if (!parent) {
      return NextResponse.json({ error: "Categoria pai nao encontrada." }, { status: 404 })
    }
    if (parent.parentId) {
      return NextResponse.json({ error: "So sao permitidos 2 niveis de categorias." }, { status: 400 })
    }
  }

  const updated = await db.catalogCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug: slug || slugifyCatalogName(name ?? current.name) }),
      ...(description !== undefined && { description: description || null }),
      ...(status !== undefined && { status }),
      ...(order !== undefined && { order }),
      ...(parentId !== undefined && { parentId }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const category = await db.catalogCategory.findUnique({
    where: { id },
    select: {
      _count: { select: { children: true, courseCategories: true } },
    },
  })

  if (!category) {
    return NextResponse.json({ error: "Categoria nao encontrada." }, { status: 404 })
  }

  if (category._count.children > 0) {
    return NextResponse.json({ error: "Remova as subcategorias antes de excluir esta categoria." }, { status: 400 })
  }

  if (category._count.courseCategories > 0) {
    return NextResponse.json({ error: "Desvincule as trilhas antes de excluir esta categoria." }, { status: 400 })
  }

  await db.catalogCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
