import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const results = await db.helpArticle.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    take: 30,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  })

  return NextResponse.json({ results })
}
