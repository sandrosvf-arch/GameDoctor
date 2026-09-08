import { createHash } from "node:crypto"
import { PrismaClient } from "@prisma/client"
import {
  DEFAULT_AI_SYSTEM_PROMPT_FREE,
  DEFAULT_AI_SYSTEM_PROMPT_PAID,
  resolveAiSystemPrompt,
} from "../src/lib/ai/prompt"

const db = new PrismaClient()

const prompts = [
  {
    key: "ai.system_prompt_free",
    value: resolveAiSystemPrompt(DEFAULT_AI_SYSTEM_PROMPT_FREE, "FREE"),
  },
  {
    key: "ai.system_prompt_paid",
    value: resolveAiSystemPrompt(DEFAULT_AI_SYSTEM_PROMPT_PAID, "PAID"),
  },
]

async function main() {
  for (const prompt of prompts) {
    await db.appSetting.upsert({
      where: { key: prompt.key },
      create: prompt,
      update: { value: prompt.value },
    })
  }

  console.log(prompts.map((prompt) => ({
    key: prompt.key,
    length: prompt.value.length,
    hash: createHash("sha256").update(prompt.value).digest("hex").slice(0, 12),
  })))
}

main()
  .catch((error) => {
    console.error("Nao foi possivel sincronizar os prompts da IA.", error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
