ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "parent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT;

UPDATE "comments"
SET "status" = 'APPROVED'
WHERE "status" IS NULL OR "status" = '';

CREATE INDEX IF NOT EXISTS "comments_lesson_id_status_created_at_idx"
  ON "comments"("lesson_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "comments_parent_id_idx"
  ON "comments"("parent_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'comments_parent_id_fkey'
      AND table_name = 'comments'
  ) THEN
    ALTER TABLE "comments"
      ADD CONSTRAINT "comments_parent_id_fkey"
      FOREIGN KEY ("parent_id")
      REFERENCES "comments"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
