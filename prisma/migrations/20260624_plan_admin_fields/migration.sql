ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "annual_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "monthly_price" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "annual_access_duration_days" INTEGER NOT NULL DEFAULT 365,
  ADD COLUMN IF NOT EXISTS "monthly_access_duration_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "monthly_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "max_installments" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "max_installments_no_interest" INTEGER NOT NULL DEFAULT 1;

UPDATE "plans"
SET
  "annual_price" = COALESCE("annual_price", "price"),
  "annual_access_duration_days" = COALESCE("access_duration_days", 365);
