ALTER TABLE "community_posts"
ADD COLUMN IF NOT EXISTS "likes_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "community_post_likes" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_post_likes_user_id_post_id_key"
  ON "community_post_likes"("user_id", "post_id");

CREATE INDEX IF NOT EXISTS "community_post_likes_post_id_idx"
  ON "community_post_likes"("post_id");

CREATE INDEX IF NOT EXISTS "community_post_likes_user_id_created_at_idx"
  ON "community_post_likes"("user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_post_likes_post_id_fkey'
  ) THEN
    ALTER TABLE "community_post_likes"
      ADD CONSTRAINT "community_post_likes_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "community_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_post_likes_user_id_fkey'
  ) THEN
    ALTER TABLE "community_post_likes"
      ADD CONSTRAINT "community_post_likes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "community_posts" post
SET "likes_count" = COALESCE(likes.total, 0)
FROM (
  SELECT "post_id", COUNT(*)::INTEGER AS total
  FROM "community_post_likes"
  GROUP BY "post_id"
) likes
WHERE post."id" = likes."post_id";