import Link from "next/link"
import { GAME_DOCTOR_CHECKOUT_URL } from "@/lib/checkout-links"

export function LessonSubscriptionCta() {
  return (
    <Link
      href={GAME_DOCTOR_CHECKOUT_URL}
      className="cta-shine relative inline-flex h-12 w-full max-w-md items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 to-emerald-400 px-5 text-center text-sm font-black uppercase tracking-wide text-zinc-950 shadow-[0_8px_24px_rgba(245,158,11,0.30)] transition hover:from-amber-200 hover:to-emerald-300"
    >
      <span className="relative z-10">Assinar GameDoctor - Oferta Especial</span>
      <span
        aria-hidden
        className="cta-shine-pass pointer-events-none absolute inset-y-[-45%] left-[-60%] w-[52%] -skew-x-[20deg] bg-gradient-to-r from-white/0 via-white/65 to-white/0 blur-[0.5px]"
      />
    </Link>
  )
}