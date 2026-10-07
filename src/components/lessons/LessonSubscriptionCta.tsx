import Link from "next/link"
import { GAME_DOCTOR_PLANS_URL } from "@/lib/checkout-links"

export function LessonSubscriptionCta() {
  return (
    <Link
      href={GAME_DOCTOR_PLANS_URL}
      className="cta-shine relative inline-flex h-12 w-full max-w-md items-center justify-center overflow-hidden rounded-xl bg-emerald-400 px-5 text-center text-sm font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_26px_rgba(52,211,153,0.45)] transition hover:bg-emerald-300 hover:shadow-[0_0_34px_rgba(52,211,153,0.6)]"
    >
      <span className="relative z-10">ENTRAR PARA GAMEDOCTOR</span>
      <span
        aria-hidden
        className="cta-shine-pass pointer-events-none absolute inset-y-[-45%] left-[-60%] w-[52%] -skew-x-[20deg] bg-gradient-to-r from-white/0 via-white/65 to-white/0 blur-[0.5px]"
      />
    </Link>
  )
}