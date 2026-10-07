import { normalizeCheckoutPeriod } from "@/lib/checkout"
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

export default async function LiveCheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const planSlug = single(params.plan)?.trim() ?? ""
  const period = normalizeCheckoutPeriod(single(params.period)) ?? "annual"
  const allowedMethods = normalizeMethods(single(params.methods))
  if (!planSlug) {
    return <div className="min-h-screen bg-[#05080d] text-white"><main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 text-center"><div><h1 className="text-2xl font-semibold">Oferta não encontrada</h1><p className="mt-3 text-sm text-slate-400">O link desta live não informou um plano válido.</p></div></main></div>
  }

  return <LiveCheckoutView planSlug={planSlug} period={period} allowedMethods={allowedMethods} />
}
