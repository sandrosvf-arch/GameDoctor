DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanCheckoutPeriod') THEN
    CREATE TYPE "PlanCheckoutPeriod" AS ENUM ('ANNUAL', 'MONTHLY');
  END IF;
END $$;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "plan_period" "PlanCheckoutPeriod";

ALTER TABLE "payments"
  ALTER COLUMN "payment_method" DROP NOT NULL;
