ALTER TABLE "plans"
ADD COLUMN "offer_order" TEXT[] NOT NULL DEFAULT ARRAY['annual', 'monthly']::TEXT[];
