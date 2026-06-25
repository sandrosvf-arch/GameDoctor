import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { CalendarDays, Eye, MessageSquareText, UserRound } from "lucide-react"
import { getCommunityFirstName } from "@/lib/community"
import { CommunityTopicClient } from "@/components/community/CommunityTopicClient"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export default async function CommunityTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await auth()
  const { slug } = await params
  const isAdminUser = isAdminRole(session?.user?.role)

  const topic = await db.communityTopic.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      isPinned: true,
      isLocked: true,
      viewsCount: true,
      repliesCount: true,
      createdAt: true,
      forum: {
        select: {
          id: true,
          name: true,
          slug: true,
          replyApprovalRequired: true,
        },
      },
      author: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
      posts: {
        where: {
          parentPostId: null,
          ...(isAdminUser ? {} : { status: "APPROVED" as const }),
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  if (!topic) notFound()
  if (topic.status !== "APPROVED" && !isAdminUser) notFound()

  await db.communityTopic.update({
    where: { id: topic.id },
    data: {
      viewsCount: {
        increment: 1,
      },
    },
  }).catch(() => {})

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,1))]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/comunidade" className="text-cyan-300 transition hover:text-cyan-200">
              Comunidade
            </Link>
            <span className="text-slate-500">/</span>
            <Link href={`/comunidade/${topic.forum.slug}`} className="text-cyan-300 transition hover:text-cyan-200">
              {topic.forum.name}
            </Link>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-bold tracking-tight text-white">{topic.title}</h1>
              {topic.isPinned && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                  Fixado
                </span>
              )}
              {topic.isLocked && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                  Fechado
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-slate-500" />
                {getCommunityFirstName(topic.author.name)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                {new Date(topic.createdAt).toLocaleDateString("pt-BR")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="h-4 w-4 text-slate-500" />
                {topic.posts.length} resposta{topic.posts.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-slate-500" />
                {topic.viewsCount + 1} visualizacao{topic.viewsCount + 1 !== 1 ? "es" : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8">
        <CommunityTopicClient
          topic={{
            id: topic.id,
            title: topic.title,
            content: topic.content,
            createdAt: topic.createdAt.toISOString(),
            isPinned: topic.isPinned,
            isLocked: topic.isLocked,
            viewsCount: topic.viewsCount,
            repliesCount: topic.posts.length,
            forumName: topic.forum.name,
            forumSlug: topic.forum.slug,
            author: {
              name: topic.author.name,
              avatarUrl: topic.author.avatarUrl,
            },
            replyApprovalRequired: topic.forum.replyApprovalRequired,
          }}
          initialPosts={topic.posts.map((post) => ({
            id: post.id,
            content: post.content,
            createdAt: post.createdAt.toISOString(),
            author: {
              name: post.author.name,
              avatarUrl: post.author.avatarUrl,
            },
          }))}
          canReply={Boolean(session?.user?.id)}
          topicSlug={slug}
        />
      </section>
    </div>
  )
}
