import { db } from "@/lib/db"
import { DEFAULT_AI_SYSTEM_PROMPT_FREE, DEFAULT_AI_SYSTEM_PROMPT_PAID, resolveAiSystemPrompt } from "@/lib/ai/prompt"

export const AI_SYSTEM_PROMPT_FREE_KEY = "ai.system_prompt_free"
export const AI_SYSTEM_PROMPT_PAID_KEY = "ai.system_prompt_paid"
export const AI_RESPONSE_LIMIT_FREE_KEY = "ai.response_limit_free"
export const AI_RESPONSE_LIMIT_PAID_KEY = "ai.response_limit_paid"
export const DEFAULT_AI_RESPONSE_LIMIT_FREE = 1_200
export const DEFAULT_AI_RESPONSE_LIMIT_PAID = 2_400

function parseResponseLimit(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 200 && parsed <= 12_000 ? parsed : fallback
}

export async function getAiSystemPrompts() {
  try {
    const settings = await db.$queryRaw<Array<{ key: string; value: string }>>`
      SELECT "key", "value"
      FROM "app_settings"
      WHERE "key" IN (${AI_SYSTEM_PROMPT_FREE_KEY}, ${AI_SYSTEM_PROMPT_PAID_KEY}, ${AI_RESPONSE_LIMIT_FREE_KEY}, ${AI_RESPONSE_LIMIT_PAID_KEY})
    `

    const byKey = new Map(settings.map((row) => [row.key, row.value]))
    return {
      free: resolveAiSystemPrompt(byKey.get(AI_SYSTEM_PROMPT_FREE_KEY), "FREE"),
      paid: resolveAiSystemPrompt(byKey.get(AI_SYSTEM_PROMPT_PAID_KEY), "PAID"),
      responseLimitFree: parseResponseLimit(byKey.get(AI_RESPONSE_LIMIT_FREE_KEY), DEFAULT_AI_RESPONSE_LIMIT_FREE),
      responseLimitPaid: parseResponseLimit(byKey.get(AI_RESPONSE_LIMIT_PAID_KEY), DEFAULT_AI_RESPONSE_LIMIT_PAID),
    }
  } catch (error) {
    console.error("[ai/settings] Não foi possível carregar os prompts configurados.", error)
    return {
      free: DEFAULT_AI_SYSTEM_PROMPT_FREE,
      paid: DEFAULT_AI_SYSTEM_PROMPT_PAID,
      responseLimitFree: DEFAULT_AI_RESPONSE_LIMIT_FREE,
      responseLimitPaid: DEFAULT_AI_RESPONSE_LIMIT_PAID,
    }
  }
}

