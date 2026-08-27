ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PIX_INSTALLMENTS';
ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'PAGALEVE';

ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "gateway_checkout_url" TEXT;

ALTER TABLE "payment_webhooks"
ADD COLUMN IF NOT EXISTS "external_event_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhooks_external_event_id_key"
ON "payment_webhooks"("external_event_id");

CREATE TABLE IF NOT EXISTS "user_billing_addresses" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "complement" TEXT,
  "neighborhood" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_billing_addresses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_billing_addresses_user_id_key"
ON "user_billing_addresses"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_billing_addresses_user_id_fkey'
  ) THEN
    ALTER TABLE "user_billing_addresses"
    ADD CONSTRAINT "user_billing_addresses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
