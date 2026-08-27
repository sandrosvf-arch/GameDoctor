import { db } from "@/lib/db"
import { DEFAULT_AI_SYSTEM_PROMPT, resolveAiSystemPrompt } from "@/lib/ai/prompt"

export const AI_SYSTEM_PROMPT_KEY = "ai.system_prompt"

export async function getAiSystemPrompt() {
  try {
    const settings = await db.$queryRaw<Array<{ value: string }>>`
      SELECT "value"
      FROM "app_settings"
      WHERE "key" = ${AI_SYSTEM_PROMPT_KEY}
      LIMIT 1
    `

    return resolveAiSystemPrompt(settings[0]?.value)
  } catch (error) {
    console.error("[ai/settings] Não foi possível carregar o prompt configurado.", error)
    return DEFAULT_AI_SYSTEM_PROMPT
  }
}
