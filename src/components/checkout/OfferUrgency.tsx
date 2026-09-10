import { Flame } from "lucide-react"
import { OfferCountdown } from "@/components/checkout/OfferCountdown"

export function OfferUrgency() {
  return (
    <section
      aria-labelledby="checkout-offer-title"
      className="relative overflow-hidden rounded-2xl border border-rose-400/30 bg-[linear-gradient(135deg,rgba(57,18,29,.92),rgba(13,19,28,.98)_58%,rgba(8,35,45,.95))] p-4 shadow-[0_16px_45px_rgba(244,63,94,.12)] sm:p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(250px,0.9fr)] sm:items-center sm:gap-6">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            <Flame className="h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
            Oferta especial de lançamento
          </p>
          <h2 id="checkout-offer-title" className="mt-2 text-lg font-bold leading-tight text-white sm:text-xl">
            Garanta sua condição
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-rose-100/70">
            O preço promocional é válido apenas por tempo limitado.
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-amber-300/20 bg-black/20 p-3">
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/80">
            Encerra em
          </p>
          <OfferCountdown />
        </div>
      </div>
    </section>
  )
}
