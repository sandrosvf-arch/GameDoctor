"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

interface SuggestLessonCtaProps {
  initialLesson?: string
  initiallyOpen?: boolean
}

export function SuggestLessonCta({
  initialLesson = "",
  initiallyOpen = false,
}: SuggestLessonCtaProps) {
  const [showForm, setShowForm] = useState(initiallyOpen)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", lesson: initialLesson })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const previousInitialLesson = useRef(initialLesson)

  useEffect(() => {
    setFormData((current) => (
      !current.lesson || current.lesson === previousInitialLesson.current
        ? { ...current, lesson: initialLesson }
        : current
    ))
    previousInitialLesson.current = initialLesson
  }, [initialLesson])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const response = await fetch("/api/sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          lesson: formData.lesson,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error ?? "Erro ao enviar. Tente novamente.")
      } else {
        setSubmitted(true)
      }
    } catch {
      setFormError("Erro de conexão. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-white/10 px-5 py-10 text-center sm:px-8">
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-lg font-semibold">Não encontrou o conteúdo que procura?</p>
        <p className="text-sm leading-relaxed text-white">
          Essa plataforma é viva! Subimos aulas novas toda semana. Qual aula você gostaria de ver por aqui?
        </p>

        {!showForm && !submitted && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sugerir uma aula
          </button>
        )}

        {showForm && !submitted && (
          <form onSubmit={handleSubmit} className="mx-auto mt-4 max-w-md space-y-3 text-left">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome *</label>
              <input
                type="text"
                required
                placeholder="Seu nome"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">E-mail *</label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Telefone (opcional)</label>
              <input
                type="tel"
                placeholder="(11) 9 0000-0000"
                value={formData.phone}
                onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Aula que você quer ver *</label>
              <input
                type="text"
                required
                placeholder="Ex: como consertar joystick drift PS5"
                value={formData.lesson}
                onChange={(event) => setFormData((current) => ({ ...current, lesson: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Enviando..." : "Enviar sugestão"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {submitted && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-sm font-medium text-emerald-400">
            Sugestão enviada! Obrigado - vamos analisar em breve.
          </div>
        )}
      </div>
    </div>
  )
}