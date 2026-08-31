CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "ai_knowledge_chunks" (
  "id" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "chunk_index" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_knowledge_chunks_source_type_source_id_chunk_index_key"
  ON "ai_knowledge_chunks"("source_type", "source_id", "chunk_index");

CREATE INDEX "ai_knowledge_chunks_source_type_idx"
  ON "ai_knowledge_chunks"("source_type");

CREATE INDEX "ai_knowledge_chunks_source_id_idx"
  ON "ai_knowledge_chunks"("source_id");

CREATE INDEX "ai_knowledge_chunks_embedding_idx"
  ON "ai_knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX "ai_knowledge_chunks_search_idx"
  ON "ai_knowledge_chunks" USING gin (
    to_tsvector('portuguese', "title" || ' ' || "content")
  );
