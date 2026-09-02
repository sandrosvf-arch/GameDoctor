ALTER TABLE "certificates" ALTER COLUMN "course_id" DROP NOT NULL;

ALTER TABLE "certificates" ADD COLUMN "global_key" TEXT;

CREATE UNIQUE INDEX "certificates_global_key_key" ON "certificates"("global_key");
