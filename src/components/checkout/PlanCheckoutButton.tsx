"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function PlanCheckoutButton({
  href,
  label,
}: {
  href: string
  label: string
}) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setPressed(true)

    startTransition(() => {
      router.push(href)
    })
  }

  const loading = pressed || isPending

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-80"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {loading ? "Carregando..." : label}
    </button>
  )
}
