import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const categories = await db.helpCategory.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        articles: {
          where: { status: "ACTIVE" },
          orderBy: [{ order: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json({ error: "Central de ajuda ainda não configurada." }, { status: 400 })
    }

    return NextResponse.json({ error: "Não foi possível carregar a central de ajuda." }, { status: 400 })
  }
}
