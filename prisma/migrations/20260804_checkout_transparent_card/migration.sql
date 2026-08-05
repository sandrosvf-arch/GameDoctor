DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'FAILED');
  END IF;
END
$$;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "subscription_id" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_key"
  ON "orders"("idempotency_key");

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "initial_order_id" TEXT NOT NULL,
  "gateway_subscription_id" TEXT NOT NULL,
  "period" "PlanCheckoutPeriod" NOT NULL DEFAULT 'ANNUAL',
  "amount" DECIMAL(10,2) NOT NULL,
  "access_duration_days" INTEGER NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "auto_renew" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "next_billing_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_initial_order_id_key"
  ON "subscriptions"("initial_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_gateway_subscription_id_key"
  ON "subscriptions"("gateway_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_status_idx"
  ON "subscriptions"("user_id", "status");
CREATE INDEX IF NOT EXISTS "subscriptions_next_billing_at_status_idx"
  ON "subscriptions"("next_billing_at", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subscription_id_fkey') THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_subscription_id_fkey"
      FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_fkey') THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_id_fkey') THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_plan_id_fkey"
      FOREIGN KEY ("plan_id") REFERENCES "plans"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_initial_order_id_fkey') THEN
    ALTER TABLE "subscriptions"
      ADD CONSTRAINT "subscriptions_initial_order_id_fkey"
      FOREIGN KEY ("initial_order_id") REFERENCES "orders"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;