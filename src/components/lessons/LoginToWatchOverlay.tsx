"use client"

import Link from "next/link"
import { UserPlus } from "lucide-react"

interface LoginToWatchOverlayProps {
  thumbnail: string | null
  title: string
  isFree: boolean
  callbackUrl: string
}

/** Overlay shown instead of the Play button until a guest creates an account. */
export function LoginToWatchOverlay({ thumbnail, title, isFree, callbackUrl }: LoginToWatchOverlayProps) {
  return (
    <div className="absolute inset-0">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover brightness-[0.3]"
          draggable={false}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center">
        <div className="max-w-sm space-y-3">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-2xl backdrop-blur">
            <UserPlus className="h-5 w-5" />
          </span>
          <p className="text-base sm:text-lg font-bold leading-snug text-white">
            {isFree ? (
              <><span className="text-emerald-400">AULA GRÁTIS</span> disponível! Cadastre-se para assistir.</>
            ) : (
              <><span className="text-emerald-400">PRÉVIA GRÁTIS</span> disponível! Cadastre-se para assistir.</>
            )}
          </p>
          <p className="text-xs leading-relaxed text-zinc-300">
            Cadastro rápido e grátis. Sem compromisso.
          </p>
          <Link
            href={`/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_8px_24px_rgba(16,185,129,0.28)]"
          >
            Criar cadastro grátis
          </Link>
        </div>
      </div>
    </div>
  )
}
