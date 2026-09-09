CREATE TYPE "AiMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "ai_messages"
  ADD COLUMN "status" "AiMessageStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "request_message_id" TEXT;

CREATE UNIQUE INDEX "ai_messages_request_id_key" ON "ai_messages"("request_id");
CREATE INDEX "ai_messages_conversation_id_status_idx" ON "ai_messages"("conversation_id", "status");
