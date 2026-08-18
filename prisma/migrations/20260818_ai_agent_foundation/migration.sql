DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AiMessageRole') THEN
    CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "AiMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "credits" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_usage_months" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "period_start" DATE NOT NULL,
  "credits_used" INTEGER NOT NULL DEFAULT 0,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_months_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_months_user_id_period_start_key"
  ON "ai_usage_months"("user_id", "period_start");
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_updated_at_idx"
  ON "ai_conversations"("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_created_at_idx"
  ON "ai_messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_messages_user_id_created_at_idx"
  ON "ai_messages"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_months_period_start_idx"
  ON "ai_usage_months"("period_start");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_user_id_fkey') THEN
    ALTER TABLE "ai_conversations"
      ADD CONSTRAINT "ai_conversations_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_conversation_id_fkey') THEN
    ALTER TABLE "ai_messages"
      ADD CONSTRAINT "ai_messages_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_user_id_fkey') THEN
    ALTER TABLE "ai_messages"
      ADD CONSTRAINT "ai_messages_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_months_user_id_fkey') THEN
    ALTER TABLE "ai_usage_months"
      ADD CONSTRAINT "ai_usage_months_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
