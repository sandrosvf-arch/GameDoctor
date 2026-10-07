export const GAME_DOCTOR_PLANS_URL = "/planos"

// Links curtos de checkout (/checkout/trimestral etc.) -> slug do plano no banco.
export const PLAN_CHECKOUT_ALIASES: Record<string, string> = {
  trimestral: "mensal",
  semestral: "semestral",
  anual: "gamedoctor",
}

export function getPlanCheckoutPath(planSlug: string) {
  const alias = Object.entries(PLAN_CHECKOUT_ALIASES).find(([, slug]) => slug === planSlug)?.[0]
  return alias ? `/checkout/${alias}` : `/checkout/live?plan=${encodeURIComponent(planSlug)}`
}