import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get("q")?.trim() ?? ""
  const now = new Date()
  const activePlanAccess = {
    planId: { not: null },
    status: "ACTIVE" as const,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }
  const conversations = await db.aiConversation.findMany({
    where: search
      ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { user: { name: { contains: search, mode: "insensitive" } } }, { user: { email: { contains: search, mode: "insensitive" } } }] }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          accessPermissions: {
            where: activePlanAccess,
            select: { id: true },
            take: 1,
          },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 100, select: { id: true, role: true, content: true, createdAt: true } },
    },
  })

  return NextResponse.json({
    conversations: conversations.map(({ user, ...conversation }) => ({
      ...conversation,
      user: {
        name: user.name,
        email: user.email,
        subscriptionActive: user.accessPermissions.length > 0,
      },
    })),
  })
}
