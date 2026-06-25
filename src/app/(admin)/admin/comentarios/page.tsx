"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2, MessageSquareReply, Search, X } from "lucide-react"

interface AdminCommentReply {
  id: string
  content: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface AdminComment {
  id: string
  content: string
  status: string
  createdAt: string
  approvedAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
  lesson: {
    id: string
    title: string
    course: {
      id: string
      title: string
    }
  }
  replies: AdminCommentReply[]
}

export default function AdminComentariosPage() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: query,
        status,
      })

      const response = await fetch(`/api/admin/comentarios?${params.toString()}`, {
        cache: "no-store",
      })

      const data = await response.json().catch(() => [])
      if (!response.ok) {
        setError(data?.error ?? "Nao foi possivel carregar os comentarios.")
        setComments([])
        return
      }

      setComments(data)
    } catch {
      setError("Nao foi possivel carregar os comentarios.")
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [query, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load()
    }, 220)

    return () => window.clearTimeout(timer)
  }, [load])

  async function runAction(id: string, action: "approve" | "reject") {
    setBusyId(id)

    try {
      const response = await fetch(`/api/admin/comentarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        window.alert(data?.error ?? "Nao foi possivel processar o comentario.")
        return
      }

      setReplyingTo(null)
      setReplyText("")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function submitReply(id: string) {
    if (!replyText.trim()) return

    setBusyId(id)

    try {
      const response = await fetch(`/api/admin/comentarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          content: replyText.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        window.alert(data?.error ?? "Nao foi possivel enviar a resposta.")
        return
      }

      setReplyingTo(null)
      setReplyText("")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = useMemo(
    () => comments.filter((comment) => comment.status === "PENDING").length,
    [comments]
  )

  const approvedCount = useMemo(
    () => comments.filter((comment) => comment.status === "APPROVED").length,
    [comments]
  )

  const rejectedCount = useMemo(
    () => comments.filter((comment) => comment.status === "REJECTED").length,
    [comments]
  )

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comentarios</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Aprove, rejeite e responda os comentarios enviados nas aulas pelos alunos.
          </p>
        </div>

        <button
          onClick={load}
          className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-medium transition hover:bg-accent"
        >
          Atualizar
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">
            Pendentes
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{pendingCount}</p>
          <p className="mt-1 text-sm text-amber-100/80">Aguardando aprovacao nesta busca.</p>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">
            Aprovados
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{approvedCount}</p>
          <p className="mt-1 text-sm text-emerald-100/80">Comentarios liberados para os alunos.</p>
        </div>

        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300/80">
            Rejeitados
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{rejectedCount}</p>
          <p className="mt-1 text-sm text-red-100/80">Itens ocultados da area publica.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por comentario, aula, trilha, nome ou e-mail"
              className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="APPROVED">Aprovados</option>
            <option value="REJECTED">Rejeitados</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center text-sm text-destructive">{error}</div>
        ) : comments.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum comentario encontrado.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {comments.map((comment) => (
              <article key={comment.id} className="px-6 py-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{comment.user.name}</span>
                      <span className="text-xs text-muted-foreground">{comment.user.email}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          comment.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : comment.status === "REJECTED"
                              ? "bg-red-500/15 text-red-400"
                              : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {comment.status === "APPROVED"
                          ? "Aprovado"
                          : comment.status === "REJECTED"
                            ? "Rejeitado"
                            : "Pendente"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Aula: <span className="text-foreground">{comment.lesson.title}</span>
                      <span className="px-2 text-muted-foreground/50">/</span>
                      Trilha: <span className="text-foreground">{comment.lesson.course.title}</span>
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Enviado em {new Date(comment.createdAt).toLocaleString("pt-BR")}
                    </p>

                    <div className="mt-4 rounded-2xl border border-border bg-background/40 px-4 py-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">
                        {comment.content}
                      </p>
                    </div>

                    {comment.replies.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="ml-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] px-4 py-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/85">
                              Resposta da equipe
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                              {reply.content}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {reply.user.name} / {new Date(reply.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyingTo === comment.id && (
                      <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
                        <textarea
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          className="min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/40"
                          placeholder="Escreva a resposta da equipe..."
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => submitReply(comment.id)}
                            disabled={busyId === comment.id || !replyText.trim()}
                            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                          >
                            {busyId === comment.id ? "Enviando..." : "Responder"}
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText("")
                            }}
                            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {comment.status !== "APPROVED" && (
                      <button
                        onClick={() => runAction(comment.id, "approve")}
                        disabled={busyId === comment.id}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </button>
                    )}

                    {comment.status !== "REJECTED" && (
                      <button
                        onClick={() => runAction(comment.id, "reject")}
                        disabled={busyId === comment.id}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setReplyingTo((current) => (current === comment.id ? null : comment.id))
                        setReplyText("")
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                    >
                      <MessageSquareReply className="h-4 w-4" />
                      Responder
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
