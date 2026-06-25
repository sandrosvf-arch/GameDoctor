DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityForumStatus') THEN
    CREATE TYPE "CommunityForumStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityTopicStatus') THEN
    CREATE TYPE "CommunityTopicStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityPostStatus') THEN
    CREATE TYPE "CommunityPostStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityBanStatus') THEN
    CREATE TYPE "CommunityBanStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityModerationActionType') THEN
    CREATE TYPE "CommunityModerationActionType" AS ENUM (
      'APPROVE_TOPIC',
      'REJECT_TOPIC',
      'APPROVE_POST',
      'REJECT_POST',
      'PIN_TOPIC',
      'UNPIN_TOPIC',
      'LOCK_TOPIC',
      'UNLOCK_TOPIC',
      'DELETE_TOPIC',
      'DELETE_POST',
      'BAN_USER',
      'UNBAN_USER'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "community_forums" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" "CommunityForumStatus" NOT NULL DEFAULT 'ACTIVE',
  "topic_approval_required" BOOLEAN NOT NULL DEFAULT false,
  "reply_approval_required" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_forums_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_forums_slug_key" ON "community_forums"("slug");
CREATE INDEX IF NOT EXISTS "community_forums_status_order_idx" ON "community_forums"("status", "order");

CREATE TABLE IF NOT EXISTS "community_topics" (
  "id" TEXT NOT NULL,
  "forum_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "approved_by_id" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "CommunityTopicStatus" NOT NULL DEFAULT 'PENDING',
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "is_locked" BOOLEAN NOT NULL DEFAULT false,
  "views_count" INTEGER NOT NULL DEFAULT 0,
  "replies_count" INTEGER NOT NULL DEFAULT 0,
  "last_reply_at" TIMESTAMP(3),
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_topics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_topics_slug_key" ON "community_topics"("slug");
CREATE INDEX IF NOT EXISTS "community_topics_forum_status_pinned_last_reply_idx"
  ON "community_topics"("forum_id", "status", "is_pinned", "last_reply_at");
CREATE INDEX IF NOT EXISTS "community_topics_author_created_idx"
  ON "community_topics"("author_id", "created_at");

CREATE TABLE IF NOT EXISTS "community_posts" (
  "id" TEXT NOT NULL,
  "topic_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "approved_by_id" TEXT,
  "parent_post_id" TEXT,
  "content" TEXT NOT NULL,
  "status" "CommunityPostStatus" NOT NULL DEFAULT 'PENDING',
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "community_posts_topic_status_created_idx"
  ON "community_posts"("topic_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "community_posts_parent_post_id_idx"
  ON "community_posts"("parent_post_id");
CREATE INDEX IF NOT EXISTS "community_posts_author_created_idx"
  ON "community_posts"("author_id", "created_at");

CREATE TABLE IF NOT EXISTS "community_attachments" (
  "id" TEXT NOT NULL,
  "topic_id" TEXT,
  "post_id" TEXT,
  "uploaded_by_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "community_attachments_topic_id_idx" ON "community_attachments"("topic_id");
CREATE INDEX IF NOT EXISTS "community_attachments_post_id_idx" ON "community_attachments"("post_id");
CREATE INDEX IF NOT EXISTS "community_attachments_uploaded_by_created_idx"
  ON "community_attachments"("uploaded_by_id", "created_at");

CREATE TABLE IF NOT EXISTS "community_bans" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "revoked_by_id" TEXT,
  "reason" TEXT,
  "status" "CommunityBanStatus" NOT NULL DEFAULT 'ACTIVE',
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_bans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "community_bans_user_status_ends_at_idx"
  ON "community_bans"("user_id", "status", "ends_at");

CREATE TABLE IF NOT EXISTS "community_moderation_actions" (
  "id" TEXT NOT NULL,
  "moderator_id" TEXT NOT NULL,
  "target_user_id" TEXT,
  "forum_id" TEXT,
  "topic_id" TEXT,
  "post_id" TEXT,
  "action_type" "CommunityModerationActionType" NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "community_moderation_actions_moderator_created_idx"
  ON "community_moderation_actions"("moderator_id", "created_at");
CREATE INDEX IF NOT EXISTS "community_moderation_actions_topic_id_idx"
  ON "community_moderation_actions"("topic_id");
CREATE INDEX IF NOT EXISTS "community_moderation_actions_post_id_idx"
  ON "community_moderation_actions"("post_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_topics_forum_id_fkey'
  ) THEN
    ALTER TABLE "community_topics"
      ADD CONSTRAINT "community_topics_forum_id_fkey"
      FOREIGN KEY ("forum_id") REFERENCES "community_forums"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_topics_author_id_fkey'
  ) THEN
    ALTER TABLE "community_topics"
      ADD CONSTRAINT "community_topics_author_id_fkey"
      FOREIGN KEY ("author_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_topics_approved_by_id_fkey'
  ) THEN
    ALTER TABLE "community_topics"
      ADD CONSTRAINT "community_topics_approved_by_id_fkey"
      FOREIGN KEY ("approved_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_topic_id_fkey'
  ) THEN
    ALTER TABLE "community_posts"
      ADD CONSTRAINT "community_posts_topic_id_fkey"
      FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_author_id_fkey'
  ) THEN
    ALTER TABLE "community_posts"
      ADD CONSTRAINT "community_posts_author_id_fkey"
      FOREIGN KEY ("author_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_approved_by_id_fkey'
  ) THEN
    ALTER TABLE "community_posts"
      ADD CONSTRAINT "community_posts_approved_by_id_fkey"
      FOREIGN KEY ("approved_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_parent_post_id_fkey'
  ) THEN
    ALTER TABLE "community_posts"
      ADD CONSTRAINT "community_posts_parent_post_id_fkey"
      FOREIGN KEY ("parent_post_id") REFERENCES "community_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_attachments_topic_id_fkey'
  ) THEN
    ALTER TABLE "community_attachments"
      ADD CONSTRAINT "community_attachments_topic_id_fkey"
      FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_attachments_post_id_fkey'
  ) THEN
    ALTER TABLE "community_attachments"
      ADD CONSTRAINT "community_attachments_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "community_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_attachments_uploaded_by_id_fkey'
  ) THEN
    ALTER TABLE "community_attachments"
      ADD CONSTRAINT "community_attachments_uploaded_by_id_fkey"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_bans_user_id_fkey'
  ) THEN
    ALTER TABLE "community_bans"
      ADD CONSTRAINT "community_bans_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_bans_created_by_id_fkey'
  ) THEN
    ALTER TABLE "community_bans"
      ADD CONSTRAINT "community_bans_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_bans_revoked_by_id_fkey'
  ) THEN
    ALTER TABLE "community_bans"
      ADD CONSTRAINT "community_bans_revoked_by_id_fkey"
      FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_moderation_actions_moderator_id_fkey'
  ) THEN
    ALTER TABLE "community_moderation_actions"
      ADD CONSTRAINT "community_moderation_actions_moderator_id_fkey"
      FOREIGN KEY ("moderator_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_moderation_actions_target_user_id_fkey'
  ) THEN
    ALTER TABLE "community_moderation_actions"
      ADD CONSTRAINT "community_moderation_actions_target_user_id_fkey"
      FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_moderation_actions_forum_id_fkey'
  ) THEN
    ALTER TABLE "community_moderation_actions"
      ADD CONSTRAINT "community_moderation_actions_forum_id_fkey"
      FOREIGN KEY ("forum_id") REFERENCES "community_forums"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_moderation_actions_topic_id_fkey'
  ) THEN
    ALTER TABLE "community_moderation_actions"
      ADD CONSTRAINT "community_moderation_actions_topic_id_fkey"
      FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_moderation_actions_post_id_fkey'
  ) THEN
    ALTER TABLE "community_moderation_actions"
      ADD CONSTRAINT "community_moderation_actions_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "community_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
