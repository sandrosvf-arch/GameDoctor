import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getLiveCheckoutQuote } from "@/lib/live-checkout"
import { normalizeCheckoutPeriod } from "@/lib/checkout"
import { LiveCheckoutClient } from "@/components/checkout/LiveCheckoutClient"
import { isPagaleveEnabled } from "@/lib/payment/providers/pagaleve"

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
  const session = await auth()
  const [quote, profile] = await Promise.all([
    getLiveCheckoutQuote(planSlug, period),
    session?.user?.id
      ? db.user.findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            email: true,
            phone: true,
            cpf: true,
            billingAddress: true,
          },
        })
      : null,
  ])

  return (
    <div className="min-h-screen bg-[#05080d] text-white">
      <LiveCheckoutClient
        quote={quote}
        planSlug={planSlug}
        allowedMethods={allowedMethods}
        pagaleveEnabled={isPagaleveEnabled() || Boolean(allowedMethods?.includes("pagaleve"))}
        initialProfile={profile ? {
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "",
          cpf: profile.cpf ?? "",
          billingAddress: profile.billingAddress ? {
            postalCode: profile.billingAddress.postalCode,
            street: profile.billingAddress.street,
            number: profile.billingAddress.number,
            complement: profile.billingAddress.complement ?? "",
            neighborhood: profile.billingAddress.neighborhood,
            city: profile.billingAddress.city,
            state: profile.billingAddress.state,
          } : null,
        } : null}
      />
    </div>
  )
}
