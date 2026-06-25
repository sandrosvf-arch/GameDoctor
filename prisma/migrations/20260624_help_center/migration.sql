CREATE TABLE IF NOT EXISTS "help_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "help_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "help_articles" (
  "id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT,
  "content" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "help_categories_slug_key" ON "help_categories"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "help_articles_slug_key" ON "help_articles"("slug");
CREATE INDEX IF NOT EXISTS "help_articles_category_id_order_idx" ON "help_articles"("category_id", "order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'help_articles_category_id_fkey'
      AND table_name = 'help_articles'
  ) THEN
    ALTER TABLE "help_articles"
      ADD CONSTRAINT "help_articles_category_id_fkey"
      FOREIGN KEY ("category_id")
      REFERENCES "help_categories"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
