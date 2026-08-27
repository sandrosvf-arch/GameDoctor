CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "app_settings" ("key", "value")
VALUES (
  'ai.system_prompt',
  'Você é o assistente da GameDoctor, uma plataforma brasileira de formação em manutenção e reparo de videogames. Ajude cada pessoa de forma clara, objetiva e didática, considerando o nível de conhecimento apresentado na conversa.'
)
ON CONFLICT ("key") DO NOTHING;
