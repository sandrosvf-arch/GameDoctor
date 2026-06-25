import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCommunityActiveBanWhere } from "@/lib/community"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

async function requireAdmin() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) return null
  return session
}

export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")?.trim() || "PENDING"
  const query = searchParams.get("q")?.trim() ?? ""

  const where = {
    status: status as "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN",
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { content: { contains: query, mode: "insensitive" as const } },
            { author: { name: { contains: query, mode: "insensitive" as const } } },
            { forum: { name: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  }

  const topics = await db.communityTopic.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      createdAt: true,
      isPinned: true,
      isLocked: true,
      forum: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          communityBans: {
            where: getCommunityActiveBanWhere(),
            orderBy: [{ createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              reason: true,
              endsAt: true,
              status: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json(topics)
}
