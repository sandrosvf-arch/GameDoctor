import { db } from "@/lib/db"
import { DEFAULT_AI_SYSTEM_PROMPT_FREE, DEFAULT_AI_SYSTEM_PROMPT_PAID, resolveAiSystemPrompt } from "@/lib/ai/prompt"

export const AI_SYSTEM_PROMPT_FREE_KEY = "ai.system_prompt_free"
export const AI_SYSTEM_PROMPT_PAID_KEY = "ai.system_prompt_paid"

export async function getAiSystemPrompts() {
  try {
    const settings = await db.$queryRaw<Array<{ key: string; value: string }>>`
      SELECT "key", "value"
      FROM "app_settings"
      WHERE "key" IN (${AI_SYSTEM_PROMPT_FREE_KEY}, ${AI_SYSTEM_PROMPT_PAID_KEY})
    `

    const byKey = new Map(settings.map((row) => [row.key, row.value]))
    return {
      free: resolveAiSystemPrompt(byKey.get(AI_SYSTEM_PROMPT_FREE_KEY), "FREE"),
      paid: resolveAiSystemPrompt(byKey.get(AI_SYSTEM_PROMPT_PAID_KEY), "PAID"),
    }
  } catch (error) {
    console.error("[ai/settings] Não foi possível carregar os prompts configurados.", error)
    return { free: DEFAULT_AI_SYSTEM_PROMPT_FREE, paid: DEFAULT_AI_SYSTEM_PROMPT_PAID }
  }
}

