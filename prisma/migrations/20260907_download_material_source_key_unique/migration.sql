DROP INDEX IF EXISTS "download_materials_source_key_key";

CREATE UNIQUE INDEX "download_materials_source_key_key"
  ON "download_materials"("source_key");
