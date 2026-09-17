CREATE TYPE "NotificationKind" AS ENUM ('SIMPLE', 'RICH_TEXT', 'LINK');

CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL DEFAULT 'SIMPLE',
    "href" TEXT,
    "read_at" TIMESTAMP(3),
    "email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_notifications_user_id_read_at_created_at_idx"
ON "user_notifications"("user_id", "read_at", "created_at");

ALTER TABLE "user_notifications"
ADD CONSTRAINT "user_notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
