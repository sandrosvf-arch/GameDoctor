CREATE TABLE "catalog_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "parent_id" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_categories" (
  "course_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "course_categories_pkey" PRIMARY KEY ("course_id", "category_id")
);

CREATE UNIQUE INDEX "catalog_categories_slug_key" ON "catalog_categories"("slug");
CREATE INDEX "catalog_categories_parent_id_order_idx" ON "catalog_categories"("parent_id", "order");
CREATE INDEX "course_categories_category_id_idx" ON "course_categories"("category_id");

ALTER TABLE "catalog_categories"
ADD CONSTRAINT "catalog_categories_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "catalog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "course_categories"
ADD CONSTRAINT "course_categories_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_categories"
ADD CONSTRAINT "course_categories_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
