CREATE TYPE "NotificationBroadcastStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

CREATE TABLE "notification_broadcasts" (
    "id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "href" TEXT,
    "send_email" BOOLEAN NOT NULL DEFAULT true,
    "status" "NotificationBroadcastStatus" NOT NULL DEFAULT 'QUEUED',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "email_sent_count" INTEGER NOT NULL DEFAULT 0,
    "email_failed_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "notification_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_broadcasts_created_at_idx" ON "notification_broadcasts"("created_at");
ALTER TABLE "notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_notifications" ADD COLUMN "broadcast_id" TEXT;
CREATE INDEX "user_notifications_broadcast_id_idx" ON "user_notifications"("broadcast_id");
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "notification_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
