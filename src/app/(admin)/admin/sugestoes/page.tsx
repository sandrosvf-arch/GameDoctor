"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageSquarePlus, Mail, Phone, BookOpen } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Suggestion {
  id: string
  name: string
  email: string
  phone: string | null
  lesson: string
  createdAt: string
}

export default function AdminSugestoesPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/sugestoes")
      .then((r) => r.json())
      .then((data) => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquarePlus className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões de Aulas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pedidos enviados por usuários na página de busca
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="rounded-xl border border-border bg-card/40 px-8 py-16 text-center">
          <MessageSquarePlus className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma sugestão recebida ainda.</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {suggestions.length} sugestão{suggestions.length !== 1 ? "ões" : ""} recebida{suggestions.length !== 1 ? "s" : ""}
          </p>
          {suggestions.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-card/40 p-5 space-y-3"
            >
              {/* Lesson request — highlighted */}
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-semibold text-foreground leading-snug">{s.lesson}</p>
              </div>

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{s.name}</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${s.email}`} className="hover:text-primary transition-colors">
                    {s.email}
                  </a>
                </span>
                {s.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {s.phone}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground/60">
                  {format(new Date(s.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
