"use client"

import { FormEvent, useEffect, useState } from "react"
import { BellRing, CheckCircle2, Clock3, Loader2, Mail, Send, Trash2, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Broadcast = {
  id: string
  title: string
  body: string
  href: string | null
  sendEmail: boolean
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED"
  recipientCount: number
  emailSentCount: number
  emailFailedCount: number
  createdAt: string
  completedAt: string | null
}

const STATUS_LABELS: Record<Broadcast["status"], string> = {
  QUEUED: "Na fila",
  PROCESSING: "Processando",
  COMPLETED: "Concluído",
  PARTIAL: "Parcial",
  FAILED: "Falhou",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

function StatusIcon({ status }: { status: Broadcast["status"] }) {
  if (status === "COMPLETED") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />
  if (status === "FAILED" || status === "PARTIAL") return <XCircle className="h-4 w-4 text-rose-300" />
  return <Clock3 className="h-4 w-4 text-amber-300" />
}

export default function AdminNotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [kind, setKind] = useState("SIMPLE")
  const [href, setHref] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Broadcast | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function load() {
    const response = await fetch("/api/admin/notifications", { cache: "no-store" })
    const data = await response.json().catch(() => null)
    if (response.ok) setBroadcasts(data?.broadcasts ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(interval)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, kind, href, sendEmail }) })
    const data = await response.json().catch(() => null)
    setSaving(false)
    if (!response.ok) {
      setMessage({ type: "error", text: data?.error ?? "Não foi possível enfileirar o aviso." })
      return
    }
    setMessage({ type: "success", text: `Aviso enfileirado para ${data.created} usuários. O envio de e-mail continuará em segundo plano.` })
    setTitle(""); setBody(""); setHref(""); setKind("SIMPLE")
    await load()
  }

  async function removeBroadcast() {
    if (!confirming) return
    setDeleting(confirming.id)
    const response = await fetch("/api/admin/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: confirming.id }) })
    const data = await response.json().catch(() => null)
    setDeleting(null)
    setConfirming(null)
    setMessage(response.ok ? { type: "success", text: "Notificação removida da central dos usuários." } : { type: "error", text: data?.error ?? "Não foi possível remover a notificação." })
    if (response.ok) await load()
  }

  return (
    <div className="max-w-5xl space-y-8 p-6 md:p-8">
      <div><h1 className="text-2xl font-bold">Notificações</h1><p className="mt-1 text-sm text-muted-foreground">Envie avisos e acompanhe o processamento dos e-mails.</p></div>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card/50 p-5 md:p-6">
        <div className="flex items-start gap-3 border-b border-border pb-5"><span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300"><BellRing className="h-5 w-5" /></span><div><h2 className="font-semibold">Novo aviso</h2><p className="text-sm text-muted-foreground">A resposta é imediata; os e-mails não bloqueiam esta tela.</p></div></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-medium">Título<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} required className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-cyan-400/60" /></label><label className="block text-sm font-medium">Tipo<select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="SIMPLE">Mensagem simples</option><option value="RICH_TEXT">Rich text controlado</option><option value="LINK">Mensagem com link</option></select></label></div>
        <label className="block text-sm font-medium">Mensagem<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} required maxLength={20000} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-cyan-400/60" /></label>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><label className="block text-sm font-medium">Link de destino <span className="font-normal text-muted-foreground">(opcional)</span><input type="url" value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://..." className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-cyan-400/60" /></label><label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="accent-cyan-400" /> Enviar por e-mail</label></div>
        {message ? <p className={message.type === "success" ? "rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300" : "rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300"}>{message.text}</p> : null}
        <Button type="submit" disabled={saving} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{saving ? "Enfileirando..." : "Enviar aviso"}</Button>
      </form>

      <section className="space-y-3"><div><h2 className="text-lg font-semibold">Avisos enviados</h2><p className="text-sm text-muted-foreground">Excluir remove o aviso da central dos usuários. E-mails já entregues não podem ser des-enviados.</p></div>{loading ? <div className="flex justify-center rounded-xl border border-border p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : broadcasts.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nenhum aviso enviado.</div> : <div className="space-y-3">{broadcasts.map((broadcast) => <article key={broadcast.id} className="rounded-xl border border-border bg-card/40 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate font-semibold">{broadcast.title}</h3><span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"><StatusIcon status={broadcast.status} />{STATUS_LABELS[broadcast.status]}</span></div><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{broadcast.body}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{formatDate(broadcast.createdAt)}</span><span>{broadcast.recipientCount} destinatários</span>{broadcast.sendEmail ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {broadcast.emailSentCount} enviados{broadcast.emailFailedCount ? `, ${broadcast.emailFailedCount} falhos` : ""}</span> : <span>Sem e-mail</span>}</div></div><Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(broadcast)} className="self-start text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button></div></article>)}</div>}</section>

      {confirming ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-notification-title"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="delete-notification-title" className="font-semibold">Excluir notificação?</h2><p className="mt-2 text-sm text-muted-foreground">“{confirming.title}” será removida da central de todos os usuários. E-mails já enviados não podem ser cancelados.</p></div><button type="button" onClick={() => setConfirming(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar"><X className="h-5 w-5" /></button></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setConfirming(null)}>Cancelar</Button><Button type="button" disabled={deleting === confirming.id} onClick={() => void removeBroadcast()} className="bg-rose-500 text-white hover:bg-rose-400">{deleting === confirming.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Excluir aviso</Button></div></div></div> : null}
    </div>
  )
}
