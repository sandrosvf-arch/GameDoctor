import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { slugifyCommunity } from "@/lib/community"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

async function requireAdmin() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const forums = await db.communityForum.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      order: true,
      status: true,
      topicApprovalRequired: true,
      replyApprovalRequired: true,
      createdAt: true,
      _count: {
        select: {
          topics: true,
        },
      },
    },
  })

  return NextResponse.json(forums)
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const order = Number(body?.order) || 0
  const status = body?.status === "INACTIVE" || body?.status === "ARCHIVED" ? body.status : "ACTIVE"
  const topicApprovalRequired = Boolean(body?.topicApprovalRequired)
  const replyApprovalRequired = Boolean(body?.replyApprovalRequired)
  const slugBase = typeof body?.slug === "string" && body.slug.trim() ? body.slug.trim() : name
  const slug = slugifyCommunity(slugBase)

  if (!name) {
    return NextResponse.json({ error: "Informe o nome do forum." }, { status: 400 })
  }

  if (!slug) {
    return NextResponse.json({ error: "Nao foi possivel gerar o slug do forum." }, { status: 400 })
  }

  const existing = await db.communityForum.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({ error: "Ja existe um forum com esse slug." }, { status: 409 })
  }

  const forum = await db.communityForum.create({
    data: {
      name,
      slug,
      description: description || null,
      order,
      status,
      topicApprovalRequired,
      replyApprovalRequired,
    },
  })

  return NextResponse.json(forum, { status: 201 })
}
