"use client"

import { FormEvent, useState } from "react"
import { BellRing, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [kind, setKind] = useState("SIMPLE")
  const [href, setHref] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!window.confirm("Enviar este aviso para todos os usuários ativos?")) return
    setSaving(true); setMessage(null); setError(null)
    const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, kind, href, sendEmail }) })
    const data = await response.json().catch(() => null)
    setSaving(false)
    if (!response.ok) { setError(data?.error ?? "Não foi possível enviar o aviso."); return }
    setMessage(`Aviso enviado para ${data.created} usuários. E-mails enviados: ${data.emailed}.`)
    setTitle(""); setBody(""); setHref("")
  }

  return <div className="max-w-3xl space-y-6 p-6 md:p-8"><div><h1 className="text-2xl font-bold">Notificações</h1><p className="mt-1 text-sm text-muted-foreground">Envie um aviso interno e, opcionalmente, por e-mail para todos os usuários ativos.</p></div><form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card/50 p-5 md:p-6"><div className="flex items-start gap-3 border-b border-border pb-5"><span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300"><BellRing className="h-5 w-5" /></span><div><h2 className="font-semibold">Novo aviso</h2><p className="text-sm text-muted-foreground">O indicador do sino será atualizado imediatamente.</p></div></div><label className="block text-sm font-medium">Título<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} required className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-cyan-400/60" /></label><label className="block text-sm font-medium">Tipo<select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3"><option value="SIMPLE">Mensagem simples</option><option value="RICH_TEXT">Rich text controlado</option><option value="LINK">Mensagem com link</option></select></label><label className="block text-sm font-medium">Mensagem<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={7} required maxLength={20000} className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-cyan-400/60" /></label><label className="block text-sm font-medium">Link de destino <span className="font-normal text-muted-foreground">(opcional)</span><input type="url" value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://..." className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-cyan-400/60" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="accent-cyan-400" /> Enviar também por e-mail</label>{error ? <p className="text-sm text-red-300">{error}</p> : null}{message ? <p className="text-sm text-emerald-300">{message}</p> : null}<Button type="submit" disabled={saving} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar para todos</Button></form></div>
}
