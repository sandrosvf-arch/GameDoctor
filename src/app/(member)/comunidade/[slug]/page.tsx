import { notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCommunityActiveBanWhere, isCommunityWriterBanned } from "@/lib/community"
import { CommunityForumClient } from "@/components/community/CommunityForumClient"

export const dynamic = "force-dynamic"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export default async function CommunityForumPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  noStore()
  const session = await auth()
  const { slug } = await params

  const forum = await db.communityForum.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      topicApprovalRequired: true,
      replyApprovalRequired: true,
      status: true,
    },
  })

  if (!forum || forum.status !== "ACTIVE") {
    notFound()
  }

  let activeBanMessage: string | null = null

  if (session?.user?.id) {
    const activeBan = await db.communityBan.findFirst({
      where: getCommunityActiveBanWhere(session.user.id),
      orderBy: [{ createdAt: "desc" }],
      select: {
        status: true,
        endsAt: true,
        reason: true,
      },
    })

    if (
      activeBan &&
      isCommunityWriterBanned({
        status: activeBan.status,
        endsAt: activeBan.endsAt,
      })
    ) {
      activeBanMessage = activeBan.reason || "Sua conta esta bloqueada para publicar na comunidade."
    }
  }

  return (
    <CommunityForumClient
      initialForum={{
        id: forum.id,
        name: forum.name,
        slug: forum.slug,
        description: forum.description,
        topicApprovalRequired: forum.topicApprovalRequired,
        replyApprovalRequired: forum.replyApprovalRequired,
      }}
      canCreate={Boolean(session?.user?.id) && !activeBanMessage}
      banMessage={activeBanMessage}
      isAdminUser={isAdminRole(session?.user?.role)}
    />
  )
}
