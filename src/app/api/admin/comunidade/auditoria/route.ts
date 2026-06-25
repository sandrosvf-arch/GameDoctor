import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const pageParam = Number(request.nextUrl.searchParams.get("page") ?? "1")
  const pageSizeParam = Number(request.nextUrl.searchParams.get("pageSize") ?? "20")
  const moderatorEmail = request.nextUrl.searchParams.get("moderatorEmail")?.trim() ?? ""
  const targetEmail = request.nextUrl.searchParams.get("targetEmail")?.trim() ?? ""

  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(50, Math.floor(pageSizeParam))
      : 20

  const skip = (page - 1) * pageSize
  const where = {
    ...(moderatorEmail
      ? {
          moderator: {
            email: {
              contains: moderatorEmail,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
    ...(targetEmail
      ? {
          targetUser: {
            email: {
              contains: targetEmail,
              mode: "insensitive" as const,
            },
          },
        }
      : {}),
    NOT: {
      OR: [
        {
          actionType: "APPROVE_TOPIC" as const,
          reason: {
            contains: "automatic",
            mode: "insensitive" as const,
          },
        },
        {
          actionType: "APPROVE_POST" as const,
          reason: {
            contains: "automatic",
            mode: "insensitive" as const,
          },
        },
      ],
    },
  }

  const [total, items] = await Promise.all([
    db.communityModerationAction.count({ where }),
    db.communityModerationAction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        actionType: true,
        reason: true,
        createdAt: true,
        moderator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        forum: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        post: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  })
}
