import { db } from "@/lib/db"
import { getCommunityBadgeLabel, type CommunityAuthorStats } from "@/lib/community-stats"

type CommunityTopicBan = {
  id: string
  reason: string | null
  endsAt: string | null
  status: "ACTIVE" | "REVOKED" | "EXPIRED"
}

type CommunityTopicAuthor = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  activeBan: CommunityTopicBan | null
  communityStats: Omit<CommunityAuthorStats, "badgeLabel">
}

type CommunityTopicAttachment = {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string | null
  sizeBytes: number | null
}

type CommunityTopicPost = {
  id: string
  content: string
  createdAt: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"
  likesCount: number
  viewerLiked: boolean
  parentPost: { id: string; authorName: string } | null
  attachments: CommunityTopicAttachment[]
  author: CommunityTopicAuthor
}

type CommunityTopicRow = {
  id: string
  title: string
  slug: string
  content: string
  isPinned: boolean
  isLocked: boolean
  viewsCount: number
  repliesCount: number
  createdAt: string
  forum: {
    id: string
    name: string
    slug: string
    replyApprovalRequired: boolean
  }
  author: CommunityTopicAuthor
  attachments: CommunityTopicAttachment[]
  posts: CommunityTopicPost[]
  hasRepliesAccess: boolean
  viewerBan: { reason: string | null; endsAt: string | null; status: "ACTIVE" } | null
}

function withBadge(author: CommunityTopicAuthor) {
  return {
    ...author,
    communityStats: {
      ...author.communityStats,
      badgeLabel: getCommunityBadgeLabel(author.communityStats.score),
    },
  }
}

export async function getCommunityTopicPage({
  slug,
  viewerId,
  isAdmin,
}: {
  slug: string
  viewerId: string | null
  isAdmin: boolean
}) {
  const rows = await db.$queryRaw<CommunityTopicRow[]>`
    WITH target_topic AS (
      SELECT t.*, f."name" AS "forum_name", f."slug" AS "forum_slug",
        f."reply_approval_required"
      FROM "community_topics" t
      INNER JOIN "community_forums" f ON f."id" = t."forum_id"
      WHERE t."slug" = ${slug}
        AND (${isAdmin} OR t."status" = 'APPROVED')
      LIMIT 1
    ), viewer_access AS (
      SELECT ${isAdmin} OR EXISTS (
        SELECT 1
        FROM "access_permissions" access
        WHERE access."user_id" = ${viewerId}
          AND access."plan_id" IS NOT NULL
          AND access."status" = 'ACTIVE'
          AND access."starts_at" <= CURRENT_TIMESTAMP
          AND (access."expires_at" IS NULL OR access."expires_at" > CURRENT_TIMESTAMP)
      ) AS "has_access"
    ), visible_posts AS (
      SELECT p.*
      FROM "community_posts" p
      INNER JOIN target_topic t ON t."id" = p."topic_id"
      WHERE (SELECT "has_access" FROM viewer_access)
        AND (${isAdmin} OR p."status" = 'APPROVED')
    ), participant_ids AS (
      SELECT "author_id" AS "user_id" FROM target_topic
      UNION
      SELECT "author_id" AS "user_id" FROM visible_posts
    ), author_stats AS (
      SELECT
        participant."user_id",
        (SELECT COUNT(*)::int FROM "community_topics" ct WHERE ct."author_id" = participant."user_id" AND ct."status" = 'APPROVED') AS "topicsCount",
        (SELECT COUNT(*)::int FROM "community_posts" cp WHERE cp."author_id" = participant."user_id" AND cp."status" = 'APPROVED') AS "postsCount",
        COALESCE((SELECT SUM(cp."likes_count")::int FROM "community_posts" cp WHERE cp."author_id" = participant."user_id" AND cp."status" = 'APPROVED'), 0) AS "likesReceivedCount"
      FROM participant_ids participant
    ), updated_topic AS (
      UPDATE "community_topics"
      SET "views_count" = "views_count" + 1
      WHERE "id" = (SELECT "id" FROM target_topic)
      RETURNING "views_count"
    )
    SELECT
      t."id",
      t."title",
      t."slug",
      t."content",
      t."is_pinned" AS "isPinned",
      t."is_locked" AS "isLocked",
      COALESCE((SELECT "views_count" FROM updated_topic), t."views_count") AS "viewsCount",
      t."replies_count" AS "repliesCount",
      t."created_at" AS "createdAt",
      jsonb_build_object(
        'id', t."forum_id",
        'name', t."forum_name",
        'slug', t."forum_slug",
        'replyApprovalRequired', t."reply_approval_required"
      ) AS "forum",
      (
        SELECT jsonb_build_object(
          'id', u."id",
          'name', u."name",
          'email', u."email",
          'avatarUrl', u."avatar_url",
          'activeBan', (
            SELECT jsonb_build_object('id', b."id", 'reason', b."reason", 'endsAt', b."ends_at", 'status', b."status")
            FROM "community_bans" b
            WHERE b."user_id" = u."id" AND b."status" = 'ACTIVE'
              AND b."starts_at" <= CURRENT_TIMESTAMP
              AND (b."ends_at" IS NULL OR b."ends_at" > CURRENT_TIMESTAMP)
            ORDER BY b."created_at" DESC
            LIMIT 1
          ),
          'communityStats', jsonb_build_object(
            'topicsCount', stats."topicsCount",
            'postsCount', stats."postsCount",
            'likesReceivedCount', stats."likesReceivedCount",
            'score', stats."topicsCount" * 3 + stats."postsCount" * 2 + stats."likesReceivedCount"
          )
        )
        FROM "users" u
        INNER JOIN author_stats stats ON stats."user_id" = u."id"
        WHERE u."id" = t."author_id"
      ) AS "author",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', attachment."id",
          'fileName', attachment."file_name",
          'fileUrl', attachment."file_url",
          'mimeType', attachment."mime_type",
          'sizeBytes', attachment."size_bytes"
        ) ORDER BY attachment."created_at")
        FROM "community_attachments" attachment
        WHERE attachment."topic_id" = t."id"
      ), '[]'::jsonb) AS "attachments",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', post."id",
          'content', post."content",
          'createdAt', post."created_at",
          'status', post."status",
          'likesCount', post."likes_count",
          'viewerLiked', EXISTS (
            SELECT 1 FROM "community_post_likes" post_like
            WHERE post_like."post_id" = post."id" AND post_like."user_id" = ${viewerId}
          ),
          'parentPost', CASE WHEN post."parent_post_id" IS NULL THEN NULL ELSE (
            SELECT jsonb_build_object('id', parent."id", 'authorName', parent_author."name")
            FROM "community_posts" parent
            INNER JOIN "users" parent_author ON parent_author."id" = parent."author_id"
            WHERE parent."id" = post."parent_post_id"
          ) END,
          'attachments', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', attachment."id",
              'fileName', attachment."file_name",
              'fileUrl', attachment."file_url",
              'mimeType', attachment."mime_type",
              'sizeBytes', attachment."size_bytes"
            ) ORDER BY attachment."created_at")
            FROM "community_attachments" attachment
            WHERE attachment."post_id" = post."id"
          ), '[]'::jsonb),
          'author', (
            SELECT jsonb_build_object(
              'id', u."id",
              'name', u."name",
              'email', u."email",
              'avatarUrl', u."avatar_url",
              'activeBan', (
                SELECT jsonb_build_object('id', b."id", 'reason', b."reason", 'endsAt', b."ends_at", 'status', b."status")
                FROM "community_bans" b
                WHERE b."user_id" = u."id" AND b."status" = 'ACTIVE'
                  AND b."starts_at" <= CURRENT_TIMESTAMP
                  AND (b."ends_at" IS NULL OR b."ends_at" > CURRENT_TIMESTAMP)
                ORDER BY b."created_at" DESC
                LIMIT 1
              ),
              'communityStats', jsonb_build_object(
                'topicsCount', stats."topicsCount",
                'postsCount', stats."postsCount",
                'likesReceivedCount', stats."likesReceivedCount",
                'score', stats."topicsCount" * 3 + stats."postsCount" * 2 + stats."likesReceivedCount"
              )
            )
            FROM "users" u
            INNER JOIN author_stats stats ON stats."user_id" = u."id"
            WHERE u."id" = post."author_id"
          )
        ) ORDER BY post."created_at")
        FROM visible_posts post
      ), '[]'::jsonb) AS "posts",
      (SELECT "has_access" FROM viewer_access) AS "hasRepliesAccess",
      (
        SELECT jsonb_build_object('reason', viewer_ban."reason", 'endsAt', viewer_ban."ends_at", 'status', viewer_ban."status")
        FROM "community_bans" viewer_ban
        WHERE viewer_ban."user_id" = ${viewerId} AND viewer_ban."status" = 'ACTIVE'
          AND viewer_ban."starts_at" <= CURRENT_TIMESTAMP
          AND (viewer_ban."ends_at" IS NULL OR viewer_ban."ends_at" > CURRENT_TIMESTAMP)
        ORDER BY viewer_ban."created_at" DESC
        LIMIT 1
      ) AS "viewerBan"
    FROM target_topic t
  `

  const topic = rows[0]
  if (!topic) return null

  return {
    ...topic,
    author: withBadge(topic.author),
    posts: topic.posts.map((post) => ({ ...post, author: withBadge(post.author) })),
  }
}
