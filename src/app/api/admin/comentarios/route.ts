import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) return null
  return session
}

export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  const status = searchParams.get("status")?.trim() ?? "all"

  const where = {
    parentId: null,
    ...(status !== "all" ? { status } : {}),
    ...(query
      ? {
          OR: [
            { content: { contains: query, mode: "insensitive" as const } },
            { user: { name: { contains: query, mode: "insensitive" as const } } },
            { user: { email: { contains: query, mode: "insensitive" as const } } },
            { lesson: { title: { contains: query, mode: "insensitive" as const } } },
            { lesson: { course: { title: { contains: query, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  }

  const comments = await db.comment.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      lesson: {
        select: {
          id: true,
          title: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      replies: {
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json(comments)
}
