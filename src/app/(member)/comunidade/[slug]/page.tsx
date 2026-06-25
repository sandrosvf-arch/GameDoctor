import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { CommunityForumClient } from "@/components/community/CommunityForumClient"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export default async function CommunityForumPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
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
      canCreate={Boolean(session?.user?.id)}
      isAdminUser={isAdminRole(session?.user?.role)}
    />
  )
}
