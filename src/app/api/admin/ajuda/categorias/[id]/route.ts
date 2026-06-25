import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugifyHelp } from "@/lib/help-content"

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
    name?: string
    slug?: string
    description?: string | null
    order?: number
    status?: "ACTIVE" | "INACTIVE"
  } = {}

  if (typeof body?.name === "string") data.name = body.name.trim()
  if (typeof body?.slug === "string") data.slug = slugifyHelp(body.slug)
  if (typeof body?.description === "string") data.description = body.description.trim() || null
  if (body?.description === null) data.description = null
  if (body?.order !== undefined) data.order = Number(body.order) || 0
  if (body?.status === "ACTIVE" || body?.status === "INACTIVE") data.status = body.status

  try {
    const category = await db.helpCategory.update({
      where: { id },
      data,
    })

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a categoria." }, { status: 400 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await db.helpCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
