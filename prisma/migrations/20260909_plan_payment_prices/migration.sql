ALTER TABLE "plans" ADD COLUMN "annual_pix_price" DECIMAL(10,2);
ALTER TABLE "plans" ADD COLUMN "annual_card_price" DECIMAL(10,2);
ALTER TABLE "plans" ADD COLUMN "annual_boleto_price" DECIMAL(10,2);
ALTER TABLE "plans" ADD COLUMN "annual_pix_installment_price" DECIMAL(10,2);

UPDATE "plans"
SET
  "annual_pix_price" = CASE
    WHEN "slug" = 'plano-anual' THEN 697.00
    ELSE COALESCE("annual_price", "price")
  END,
  "annual_card_price" = CASE
    WHEN "slug" = 'plano-anual' THEN 614.40
    ELSE COALESCE("annual_price", "price")
  END,
  "annual_boleto_price" = COALESCE("annual_price", "price"),
  "annual_pix_installment_price" = COALESCE("card_installment_total", "annual_price", "price");
