import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildCheckoutQuote, normalizeCheckoutPeriod } from "@/lib/checkout"
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient"

type CheckoutPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export const dynamic = "force-dynamic"

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = (await searchParams) ?? {}
  const planSlug = getSingleParam(params.plan)?.trim() ?? ""
  const period = normalizeCheckoutPeriod(getSingleParam(params.period))

  if (!planSlug || !period) {
    redirect("/planos")
  }

  const session = await auth()

  if (!session?.user?.id) {
    const callbackUrl = `/checkout?plan=${encodeURIComponent(planSlug)}&period=${period}`
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const [profile, quote] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        cpf: true,
      },
    }),
    buildCheckoutQuote({
      userId: session.user.id,
      planSlug,
      period,
    }),
  ]).catch(() => [null, null] as const)

  if (!profile || !quote) {
    redirect("/planos")
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <section className="border-b border-white/8 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,#0b1120_0%,#070b12_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">Checkout seguro</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              Revise seu plano e conclua o pagamento.
            </h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-12">
        <CheckoutPageClient
          initialQuote={quote}
          profile={{
            name: profile.name ?? "Aluno",
            email: profile.email,
            phone: profile.phone,
            cpf: profile.cpf,
          }}
        />
      </section>
    </main>
  )
}
