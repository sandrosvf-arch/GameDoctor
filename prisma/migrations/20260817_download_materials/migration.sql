CREATE TABLE IF NOT EXISTS "download_materials" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "file_name" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "type" "MaterialType" NOT NULL DEFAULT 'OTHER',
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "download_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "download_materials_status_category_order_idx"
  ON "download_materials"("status", "category", "order");

CREATE INDEX IF NOT EXISTS "download_materials_created_at_idx"
  ON "download_materials"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'download_materials_created_by_id_fkey'
  ) THEN
    ALTER TABLE "download_materials"
      ADD CONSTRAINT "download_materials_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;