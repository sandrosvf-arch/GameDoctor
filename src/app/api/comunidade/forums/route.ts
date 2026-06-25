import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const forums = await db.communityForum.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      topicApprovalRequired: true,
      replyApprovalRequired: true,
      _count: {
        select: {
          topics: true,
        },
      },
      topics: {
        where: { status: "APPROVED" },
        orderBy: [{ isPinned: "desc" }, { lastReplyAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          title: true,
          slug: true,
          repliesCount: true,
          lastReplyAt: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json(forums)
}
