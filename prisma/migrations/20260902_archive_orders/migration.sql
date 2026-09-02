ALTER TABLE "orders" ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE INDEX "orders_archived_at_idx" ON "orders"("archived_at");
