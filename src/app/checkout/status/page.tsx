import { CheckoutStatusClient } from "@/components/checkout/CheckoutStatusClient"

type CheckoutStatusPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export const dynamic = "force-dynamic"

export default async function CheckoutStatusPage({ searchParams }: CheckoutStatusPageProps) {
  const params = (await searchParams) ?? {}
  const orderId = getSingleParam(params.orderId)?.trim() ?? ""

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <section className="border-b border-white/8 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),transparent_26%),linear-gradient(180deg,#0b1120_0%,#070b12_100%)]">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">Status do checkout</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              Acompanhe a confirmação do seu pedido.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
              Assim que o Mercado Pago confirmar o pagamento, seu acesso será liberado automaticamente.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-12">
        <CheckoutStatusClient orderId={orderId} />
      </section>
    </main>
  )
}
