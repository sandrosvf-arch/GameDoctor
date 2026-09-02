ALTER TABLE "plans" ADD COLUMN "card_installment_total" DECIMAL(10,2);

-- Preserve the current commercial configuration for the existing annual offer.
UPDATE "plans"
SET "card_installment_total" = 750.00
WHERE "annual_price" = 614.20
  AND "card_installment_total" IS NULL;
