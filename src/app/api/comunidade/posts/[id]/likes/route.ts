import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { hasActivePlanAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { getCommunityActiveBanWhere, isCommunityWriterBanned } from "@/lib/community"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

async function validateLikeRequest(postId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const [post, activeBan, hasPlan] = await Promise.all([
    db.communityPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        status: true,
        likesCount: true,
        topic: { select: { status: true } },
      },
    }),
    db.communityBan.findFirst({
      where: getCommunityActiveBanWhere(session.user.id),
      orderBy: [{ createdAt: "desc" }],
      select: { status: true, endsAt: true, reason: true },
    }),
    isAdminRole(session.user.role) ? Promise.resolve(true) : hasActivePlanAccess(session.user.id),
  ])

  if (!post || post.status !== "APPROVED" || post.topic.status !== "APPROVED") {
    return { error: NextResponse.json({ error: "Resposta não encontrada." }, { status: 404 }) }
  }

  if (!hasPlan) {
    return {
      error: NextResponse.json(
        {
          error: "Você precisa de um plano ativo para interagir na comunidade.",
          requiresPlan: true,
          upgradeUrl: "/planos",
        },
        { status: 403 }
      ),
    }
  }

  if (post.authorId === session.user.id) {
    return { error: NextResponse.json({ error: "Você não pode curtir a própria resposta." }, { status: 400 }) }
  }

  if (
    activeBan &&
    isCommunityWriterBanned({
      status: activeBan.status,
      endsAt: activeBan.endsAt,
    })
  ) {
    return {
      error: NextResponse.json(
        { error: activeBan.reason || "Sua conta está bloqueada para interagir na comunidade." },
        { status: 403 }
      ),
    }
  }

  return { session, post }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateLikeRequest(id)

  if ("error" in validation) return validation.error

  try {
    const [, updatedPost] = await db.$transaction([
      db.communityPostLike.create({
        data: {
          postId: validation.post.id,
          userId: validation.session.user.id,
        },
      }),
      db.communityPost.update({
        where: { id: validation.post.id },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      }),
    ])

    return NextResponse.json({ liked: true, likesCount: updatedPost.likesCount })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const currentPost = await db.communityPost.findUnique({
        where: { id: validation.post.id },
        select: { likesCount: true },
      })

      return NextResponse.json({ liked: true, likesCount: currentPost?.likesCount ?? validation.post.likesCount })
    }

    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const validation = await validateLikeRequest(id)

  if ("error" in validation) return validation.error

  const existing = await db.communityPostLike.findUnique({
    where: {
      userId_postId: {
        userId: validation.session.user.id,
        postId: validation.post.id,
      },
    },
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json({ liked: false, likesCount: validation.post.likesCount })
  }

  const [, updatedPost] = await db.$transaction([
    db.communityPostLike.delete({ where: { id: existing.id } }),
    db.communityPost.update({
      where: { id: validation.post.id },
      data: { likesCount: { decrement: 1 } },
      select: { likesCount: true },
    }),
  ])

  return NextResponse.json({ liked: false, likesCount: Math.max(0, updatedPost.likesCount) })
}
