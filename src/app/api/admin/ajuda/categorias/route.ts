import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugifyHelp } from "@/lib/help-content"

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
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const order = Number(body?.order ?? 0) || 0
  const status = body?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"

  if (!name) {
    return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 })
  }

  const slug = slugifyHelp(name)
  if (!slug) {
    return NextResponse.json({ error: "Não foi possível gerar o slug da categoria." }, { status: 400 })
  }

  try {
    const category = await db.helpCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        order,
        status,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "As tabelas da central de ajuda ainda não existem no banco. Rode a migration da central de ajuda." },
        { status: 400 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 400 })
    }

    return NextResponse.json({ error: "Não foi possível criar a categoria." }, { status: 400 })
  }
}
