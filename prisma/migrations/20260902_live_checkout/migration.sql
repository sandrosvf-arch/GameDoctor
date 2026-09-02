CREATE TYPE "CheckoutChannel" AS ENUM ('STANDARD', 'LIVE');

ALTER TABLE "orders"
ADD COLUMN "checkout_channel" "CheckoutChannel" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "public_token_hash" TEXT,
ADD COLUMN "public_token_expires_at" TIMESTAMP(3),
ADD COLUMN "client_fingerprint_hash" TEXT,
ADD COLUMN "access_granted_at" TIMESTAMP(3),
ADD COLUMN "access_email_sent_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "orders_public_token_hash_key" ON "orders"("public_token_hash");
CREATE INDEX "orders_checkout_channel_client_fingerprint_hash_created_at_idx"
ON "orders"("checkout_channel", "client_fingerprint_hash", "created_at");
