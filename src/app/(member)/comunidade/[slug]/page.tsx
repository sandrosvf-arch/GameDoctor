import { notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { auth } from "@/lib/auth"
import { hasActivePlanAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { getCommunityActiveBanWhere, isCommunityWriterBanned } from "@/lib/community"
import { CommunityForumClient } from "@/components/community/CommunityForumClient"
import { getCommunityForumPage } from "@/lib/community-data"

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
  const { slug } = await params
  const [session, forum] = await Promise.all([
    auth(),
    getCommunityForumPage({ slug }),
  ])

  if (!forum) {
    notFound()
  }

  const isStaff = isAdminRole(session?.user?.role)
  const [hasPlanAccess, activeBan] = await Promise.all([
    !isStaff && session?.user?.id ? hasActivePlanAccess(session.user.id) : Promise.resolve(false),
    session?.user?.id
      ? db.communityBan.findFirst({
          where: getCommunityActiveBanWhere(session.user.id),
          orderBy: [{ createdAt: "desc" }],
          select: { status: true, endsAt: true, reason: true },
        })
      : Promise.resolve(null),
  ])
  const hasRepliesAccess = isStaff || hasPlanAccess
  let activeBanMessage: string | null = null

  if (
    activeBan &&
    isCommunityWriterBanned({ status: activeBan.status, endsAt: activeBan.endsAt })
  ) {
    activeBanMessage = activeBan.reason || "Sua conta está bloqueada para publicar na comunidade."
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
      initialTopics={forum.topics}
      initialTotal={forum.total}
      initialTotalPages={Math.max(1, Math.ceil(forum.total / 20))}
      canCreate={Boolean(session?.user?.id) && !activeBanMessage}
      requiresPlan={!hasRepliesAccess}
      banMessage={activeBanMessage}
      isAdminUser={isAdminRole(session?.user?.role)}
    />
  )
}
