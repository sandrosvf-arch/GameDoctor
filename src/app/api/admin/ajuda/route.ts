import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const categories = await db.helpCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        articles: {
          orderBy: [{ order: "asc" }, { title: "asc" }],
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "As tabelas da central de ajuda ainda não existem no banco. Rode a migration da central de ajuda." },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Não foi possível carregar a central de ajuda." }, { status: 400 })
  }
}
