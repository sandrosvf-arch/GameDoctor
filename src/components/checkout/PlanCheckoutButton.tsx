"use client"

import { useState, useTransition } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Phone } from "lucide-react"

export function PlanCheckoutButton({
  href,
  label,
  requiresPhone = false,
}: {
  href: string
  label: string
  requiresPhone?: boolean
}) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [savingPhone, setSavingPhone] = useState(false)

  function handleClick() {
    if (requiresPhone) {
      setPhoneError(null)
      setPhoneModalOpen(true)
      return
    }

    setPressed(true)
    startTransition(() => {
      router.push(href)
    })
  }

  const loading = pressed || isPending

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPhoneError(null)

    const digits = phone.replace(/\D/g, "")
    if (digits.length < 10 || digits.length > 15) {
      setPhoneError("Informe um telefone válido com DDD.")
      return
    }

    setSavingPhone(true)
    try {
      const response = await fetch("/api/member/profile/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setPhoneError(data?.error ?? "Não foi possível atualizar seu telefone.")
        return
      }

      setPhoneModalOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setPhoneError("Não foi possível atualizar seu telefone.")
    } finally {
      setSavingPhone(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-80"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Carregando..." : label}
      </button>

      {phoneModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#101722] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-white">Libere agora o preço do seu acesso</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Informe seu telefone para desbloquear as condições do GameDoctor e receber novidades, oportunidades e condições especiais.
                </p>
              </div>
            </div>

            <form onSubmit={handlePhoneSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-200">
                WhatsApp ou telefone
                <input
                  autoFocus
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  className="mt-2 h-12 w-full rounded-xl border border-white/[0.12] bg-[#080d15] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/15"
                />
              </label>

              {phoneError && <p className="text-sm text-rose-300">{phoneError}</p>}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPhoneModalOpen(false)}
                  disabled={savingPhone}
                  className="h-11 rounded-full border border-white/[0.12] px-5 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white disabled:opacity-60"
                >
                  Agora não
                </button>
                <button
                  type="submit"
                  disabled={savingPhone}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"
                >
                  {savingPhone && <Loader2 className="h-4 w-4 animate-spin" />}
                  {savingPhone ? "Salvando..." : "Liberar preço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
