UPDATE "help_categories"
SET
  "status" = 'INACTIVE',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'primeiros-passos'
  AND "status" <> 'INACTIVE';