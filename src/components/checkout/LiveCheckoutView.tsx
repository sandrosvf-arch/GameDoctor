import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getLiveCheckoutQuote } from "@/lib/live-checkout"
import type { CheckoutPeriod } from "@/lib/checkout"
import { LiveCheckoutClient } from "@/components/checkout/LiveCheckoutClient"
import { isPagaleveEnabled } from "@/lib/payment/providers/pagaleve"

type PaymentMethod = "card" | "pix" | "pagaleve"

export async function LiveCheckoutView({
  planSlug,
  period,
  allowedMethods,
}: {
  planSlug: string
  period: CheckoutPeriod
  allowedMethods?: PaymentMethod[]
}) {
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
        planSlug={quote.plan.slug}
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
