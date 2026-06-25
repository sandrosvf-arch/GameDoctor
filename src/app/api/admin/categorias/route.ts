import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildCatalogTree, slugifyCatalogName } from "@/lib/catalog"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const categories = await db.catalogCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
      order: true,
      status: true,
      showInMenu: true,
      _count: { select: { courseCategories: true, children: true } },
    },
  })

  return NextResponse.json(buildCatalogTree(categories))
}

export async function POST(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name = String(body?.name ?? "").trim()
  const slug = String(body?.slug ?? "").trim()
  const description = String(body?.description ?? "").trim()
  const parentId = body?.parentId ? String(body.parentId) : null
  const status = body?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"
  const showInMenu = body?.showInMenu === undefined ? true : Boolean(body.showInMenu)

  if (!name) {
    return NextResponse.json({ error: "Nome obrigatorio." }, { status: 400 })
  }

  if (parentId) {
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

  const siblingWhere = parentId ? { parentId } : { parentId: null }
  const agg = await db.catalogCategory.aggregate({
    where: siblingWhere,
    _max: { order: true },
  })

  const created = await db.catalogCategory.create({
    data: {
      name,
      slug: slug || slugifyCatalogName(name),
      description: description || null,
      parentId,
      status,
      showInMenu,
      order: (agg._max.order ?? -1) + 1,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
