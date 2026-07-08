DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
    CREATE TYPE "TicketStatus" AS ENUM ('ABERTO', 'AGUARDANDO_RESPOSTA', 'RESPONDIDO', 'FINALIZADO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketDepartmentStatus') THEN
    CREATE TYPE "TicketDepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketAuthorType') THEN
    CREATE TYPE "TicketAuthorType" AS ENUM ('STUDENT', 'STAFF');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ticket_departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" "TicketDepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_departments_slug_key" ON "ticket_departments"("slug");
CREATE INDEX IF NOT EXISTS "ticket_departments_status_order_idx" ON "ticket_departments"("status", "order");

CREATE TABLE IF NOT EXISTS "tickets" (
  "id" TEXT NOT NULL,
  "ticket_number" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "department_id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
  "last_message_at" TIMESTAMP(3) NOT NULL,
  "closed_at" TIMESTAMP(3),
  "closed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticket_number_key" ON "tickets"("ticket_number");
CREATE INDEX IF NOT EXISTS "tickets_status_department_id_last_message_at_idx"
  ON "tickets"("status", "department_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "tickets_student_id_last_message_at_idx"
  ON "tickets"("student_id", "last_message_at");

CREATE TABLE IF NOT EXISTS "ticket_messages" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "author_type" "TicketAuthorType" NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_created_at_idx"
  ON "ticket_messages"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "ticket_messages_author_id_created_at_idx"
  ON "ticket_messages"("author_id", "created_at");

CREATE TABLE IF NOT EXISTS "ticket_attachments" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_attachments_message_id_idx" ON "ticket_attachments"("message_id");
CREATE INDEX IF NOT EXISTS "ticket_attachments_uploaded_by_id_created_at_idx"
  ON "ticket_attachments"("uploaded_by_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_student_id_fkey'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_department_id_fkey'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "ticket_departments"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_closed_by_id_fkey'
  ) THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_closed_by_id_fkey"
      FOREIGN KEY ("closed_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_ticket_id_fkey'
  ) THEN
    ALTER TABLE "ticket_messages"
      ADD CONSTRAINT "ticket_messages_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_author_id_fkey'
  ) THEN
    ALTER TABLE "ticket_messages"
      ADD CONSTRAINT "ticket_messages_author_id_fkey"
      FOREIGN KEY ("author_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_attachments_message_id_fkey'
  ) THEN
    ALTER TABLE "ticket_attachments"
      ADD CONSTRAINT "ticket_attachments_message_id_fkey"
      FOREIGN KEY ("message_id") REFERENCES "ticket_messages"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ticket_attachments_uploaded_by_id_fkey'
  ) THEN
    ALTER TABLE "ticket_attachments"
      ADD CONSTRAINT "ticket_attachments_uploaded_by_id_fkey"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
