import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { areCheckoutCouponsEnabled, buildCheckoutQuote, normalizeCheckoutPeriod } from "@/lib/checkout"
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient"
import { getMercadoPagoPayerEmail } from "@/lib/payment/providers/mercadopago"
import { isPagaleveEnabled } from "@/lib/payment/providers/pagaleve"

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
        billingAddress: {
          select: {
            postalCode: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
          },
        },
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
    <main className="relative min-h-screen overflow-hidden bg-[#070b12] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,0.22),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.14),transparent_30%)]" />

      <section className="relative mx-auto max-w-7xl px-6 pt-8 pb-4 text-center md:px-8">
        <Link href="/planos" className="inline-block">
          <Image src="/doctor-oficial.png" alt="GameDoctor" width={280} height={56} className="mx-auto h-12 w-auto" />
        </Link>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-10 md:px-8 md:pb-12">
        <CheckoutPageClient
          initialQuote={quote}
          couponsEnabled={areCheckoutCouponsEnabled()}
          pagaleveEnabled={isPagaleveEnabled()}
          profile={{
            name: profile.name ?? "Aluno",
            email: getMercadoPagoPayerEmail(profile.email),
            phone: profile.phone,
            cpf: profile.cpf,
            billingAddress: profile.billingAddress
              ? {
                  ...profile.billingAddress,
                  complement: profile.billingAddress.complement ?? "",
                }
              : null,
          }}
        />
      </section>
    </main>
  )
}
