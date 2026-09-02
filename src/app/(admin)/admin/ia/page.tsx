"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Bot, Clock3, Loader2, MessageSquare, RefreshCw, Search, UserRound, X } from "lucide-react"

type Conversation = {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  user: { name: string | null; email: string }
  messages: { id: string; role: "USER" | "ASSISTANT"; content: string; createdAt: string }[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function initials(name: string | null, email: string) {
  const value = name?.trim() || email
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

export default function AdminAiHistoryPage() {
  const [items, setItems] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const response = await fetch(`/api/admin/ia/conversas?q=${encodeURIComponent(query)}`, { cache: "no-store" })
    const data = await response.json().catch(() => null)
    const conversations = response.ok ? data?.conversations ?? [] : []
    setItems(conversations)
    setSelectedId((current) => conversations.some((item: Conversation) => item.id === current) ? current : conversations[0]?.id ?? null)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
  const lastMessage = (item: Conversation) => item.messages[item.messages.length - 1]?.content || "Nenhuma mensagem"

  return (
    <main className="flex min-h-full flex-col bg-background p-4 md:p-8">
      <header className="mx-auto flex w-full max-w-7xl items-end justify-between gap-5 pb-6">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-300"><Bot className="h-4 w-4" /> Central de conversas</div><h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Histórico da IA</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe as dúvidas e respostas do assistente.</p></div>
        <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:border-cyan-400/40 hover:text-foreground"><RefreshCw className="h-4 w-4" /> Atualizar</button>
      </header>
      <section className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
        <aside className={`${selected ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-border md:w-[350px] lg:w-[390px]`}>
          <div className="border-b border-border p-4"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load() }} placeholder="Buscar conversa ou usuário" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-cyan-400/50" /></div><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{items.length} conversa{items.length === 1 ? "" : "s"}</span><button type="button" onClick={() => { setQuery(""); void load() }} className="inline-flex items-center gap-1 hover:text-foreground"><X className="h-3.5 w-3.5" /> Limpar</button></div></div>
          <div className="min-h-0 flex-1 overflow-y-auto">{loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : items.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</div> : items.map((item) => { const active = item.id === selectedId; return <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full border-b border-border/70 p-4 text-left transition ${active ? "bg-cyan-400/[0.08]" : "hover:bg-background/70"}`}><div className="flex gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-cyan-300 text-slate-950" : "bg-muted text-muted-foreground"}`}>{initials(item.user.name, item.user.email)}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="truncate text-sm text-foreground">{item.user.name || item.user.email}</strong><time className="shrink-0 text-[11px] text-muted-foreground">{formatTime(item.updatedAt)}</time></span><span className="mt-1 block truncate text-xs font-medium text-muted-foreground">{item.title || "Conversa sem título"}</span><span className="mt-1 block truncate text-xs text-muted-foreground/70">{lastMessage(item)}</span></span></div></button> })}</div>
        </aside>
        <div className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
          {selected ? <><header className="flex items-center justify-between border-b border-border px-4 py-4 md:px-6"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-background hover:text-foreground md:hidden" aria-label="Voltar para conversas"><ArrowLeft className="h-5 w-5" /></button><span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300"><MessageSquare className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate font-semibold text-foreground">{selected.title || "Conversa sem título"}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{selected.user.name || "Sem nome"} · {selected.user.email}</p></div></div><div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Clock3 className="h-3.5 w-3.5" /> {formatDate(selected.updatedAt)} às {formatTime(selected.updatedAt)}</div></header><div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-background/35 p-4 md:p-7">{selected.messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "USER" ? "justify-end" : "justify-start"}`}><span className={`mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full sm:flex ${message.role === "USER" ? "order-2 bg-cyan-300/15 text-cyan-300" : "bg-muted text-muted-foreground"}`}>{message.role === "USER" ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span><div className={`max-w-[min(720px,88%)] rounded-2xl px-4 py-3 shadow-sm ${message.role === "USER" ? "order-1 rounded-tr-md bg-cyan-300 text-slate-950" : "rounded-tl-md border border-border bg-card text-foreground"}`}><div className={`mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${message.role === "USER" ? "text-slate-700/70" : "text-muted-foreground"}`}><span>{message.role === "USER" ? "Usuário" : "Assistente"}</span><time className="font-normal normal-case tracking-normal opacity-70">{formatTime(message.createdAt)}</time></div><p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p></div></div>)}</div></> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300"><MessageSquare className="h-7 w-7" /></span><h2 className="mt-4 font-semibold text-foreground">Selecione uma conversa</h2><p className="mt-1 max-w-xs text-sm text-muted-foreground">Escolha uma conversa na lista para visualizar o histórico completo.</p></div>}
        </div>
      </section>
    </main>
  )
}
