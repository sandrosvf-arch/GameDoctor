import { notFound } from "next/navigation"
import { normalizeCheckoutPeriod } from "@/lib/checkout"
import { PLAN_CHECKOUT_ALIASES } from "@/lib/checkout-links"
import { LiveCheckoutView } from "@/components/checkout/LiveCheckoutView"

export const dynamic = "force-dynamic"

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeMethods(value: string | undefined) {
  const allowed = new Set(["card", "pix", "pagaleve"])
  if (!value) return undefined
  const methods = value.split(",").map((method) => method.trim()).filter((method) => allowed.has(method))
  return methods.length > 0 ? methods as Array<"card" | "pix" | "pagaleve"> : undefined
}

export default async function PlanCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ plano: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ plano }, query] = await Promise.all([params, searchParams])
  const planSlug = PLAN_CHECKOUT_ALIASES[plano.toLowerCase()]
  if (!planSlug) notFound()

  return (
    <LiveCheckoutView
      planSlug={planSlug}
      period={normalizeCheckoutPeriod(single(query.period)) ?? "annual"}
      allowedMethods={normalizeMethods(single(query.methods))}
    />
  )
}
