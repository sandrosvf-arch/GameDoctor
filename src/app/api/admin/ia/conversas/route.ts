import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

export async function GET(request: Request) {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = url.searchParams.get("q")?.trim() ?? ""
  const pageParam = Number(url.searchParams.get("page") ?? "1")
  const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "15")
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? Math.min(30, Math.floor(pageSizeParam)) : 15
  const now = new Date()
  const activePlanAccess = {
    planId: { not: null },
    status: "ACTIVE" as const,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }
  const where: Prisma.AiConversationWhereInput | undefined = search
    ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { user: { name: { contains: search, mode: "insensitive" } } }, { user: { email: { contains: search, mode: "insensitive" } } }] }
    : undefined
  const [totalItems, conversations] = await Promise.all([
    db.aiConversation.count({ where }),
    db.aiConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
  ])

  return NextResponse.json({
    conversations: conversations.map(({ user, ...conversation }) => ({
      ...conversation,
      user: {
        name: user.name,
        email: user.email,
        subscriptionActive: user.accessPermissions.length > 0,
      },
    })),
    pagination: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) },
  })
}
