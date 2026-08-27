import { db } from "@/lib/db"

export type CommunityForumTopicItem = {
  id: string
  title: string
  slug: string
  repliesCount: number
  viewsCount: number
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  lastReplyAt: string | null
  author: { id: string; name: string; avatarUrl: string | null }
}

export type CommunityForumPageData = {
  id: string
  name: string
  slug: string
  description: string | null
  topicApprovalRequired: boolean
  replyApprovalRequired: boolean
  topics: CommunityForumTopicItem[]
  total: number
}

export async function getCommunityForumPage({
  slug,
  query = "",
  page = 1,
  pageSize = 20,
}: {
  slug: string
  query?: string
  page?: number
  pageSize?: number
}) {
  const search = `%${query}%`
  const offset = (page - 1) * pageSize
  const rows = await db.$queryRaw<CommunityForumPageData[]>`
    WITH target_forum AS (
      SELECT *
      FROM "community_forums"
      WHERE "slug" = ${slug} AND "status" = 'ACTIVE'
      LIMIT 1
    ), filtered_topics AS (
      SELECT
        t."id",
        t."title",
        t."slug",
        t."replies_count" AS "repliesCount",
        t."views_count" AS "viewsCount",
        t."is_pinned" AS "isPinned",
        t."is_locked" AS "isLocked",
        t."created_at" AS "createdAt",
        t."last_reply_at" AS "lastReplyAt",
        jsonb_build_object(
          'id', u."id",
          'name', u."name",
          'avatarUrl', u."avatar_url"
        ) AS "author"
      FROM "community_topics" t
      INNER JOIN target_forum f ON f."id" = t."forum_id"
      INNER JOIN "users" u ON u."id" = t."author_id"
      WHERE t."status" = 'APPROVED'
        AND (
          ${query} = ''
          OR t."title" ILIKE ${search}
          OR t."content" ILIKE ${search}
          OR u."name" ILIKE ${search}
        )
    ), paged_topics AS (
      SELECT *
      FROM filtered_topics
      ORDER BY "isPinned" DESC, COALESCE("lastReplyAt", "createdAt") DESC
      LIMIT ${pageSize} OFFSET ${offset}
    )
    SELECT
      f."id",
      f."name",
      f."slug",
      f."description",
      f."topic_approval_required" AS "topicApprovalRequired",
      f."reply_approval_required" AS "replyApprovalRequired",
      COALESCE((SELECT jsonb_agg(paged_topics) FROM paged_topics), '[]'::jsonb) AS "topics",
      (SELECT COUNT(*)::int FROM filtered_topics) AS "total"
    FROM target_forum f
  `

  return rows[0] ?? null
}
