ALTER TABLE "download_materials"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "download_materials"
  ADD COLUMN IF NOT EXISTS "source_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "download_materials_source_key_key"
  ON "download_materials"("source_key")
  WHERE "source_key" IS NOT NULL;
