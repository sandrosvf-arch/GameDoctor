ALTER TABLE "plans"
ADD COLUMN "annual_display_order" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "monthly_display_order" INTEGER NOT NULL DEFAULT 1;
