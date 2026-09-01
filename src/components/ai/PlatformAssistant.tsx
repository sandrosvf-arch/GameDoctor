"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { MessageCircle, Send, Sparkles, X } from "lucide-react"

interface AssistantMessage {
  role: "USER" | "ASSISTANT"
  content: string
}

interface UsageStatus {
  creditsRemaining: number
  monthlyCredits: number
  renewsAt?: string
}

const STORAGE_KEY = "gamedoctor_assistant_state"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.93L.1 24l6.33-1.66a11.88 11.88 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.18-1.24-6.17-3.45-8.42ZM12.09 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.76.99 1-3.67-.23-.38a9.82 9.82 0 0 1-1.5-5.18C2.22 6.46 6.64 2.04 12.08 2.04c2.64 0 5.12 1.03 6.98 2.9a9.81 9.81 0 0 1 2.9 6.97c0 5.44-4.42 9.86-9.87 9.86Zm5.41-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  )
}

function renderMessage(content: string) {
  return content.split(/(\[[^\]]+\]\([^\)]+\))/g).map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/)
    if (!match) return <span key={index}>{part}</span>
    return (
      <Link key={index} href={match[2]} className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200">
        {match[1]}
      </Link>
    )
  })
}

export function PlatformAssistant({
  page = false,
  whatsappUrl = "/suporte",
}: {
  page?: boolean
  whatsappUrl?: string
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [supportUrl, setSupportUrl] = useState(whatsappUrl)

  const limitReached = usage?.creditsRemaining === 0 || error?.toLowerCase().includes("limite mensal")
  const isLessonPage = pathname.startsWith("/aula/")

  if (!page && pathname === "/assistente") return null

  useEffect(() => {
    if (whatsappUrl !== "/suporte") {
      setSupportUrl(whatsappUrl)
      return
    }

    const controller = new AbortController()
    void fetch("/api/configuracoes/public", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (typeof payload?.whatsappUrl === "string" && payload.whatsappUrl) {
          setSupportUrl(payload.whatsappUrl)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [whatsappUrl])

  useEffect(() => {
    function handleOpenAssistant() {
      setOpen(true)
    }

    window.addEventListener("gamedoctor:open-assistant", handleOpenAssistant)
    return () => window.removeEventListener("gamedoctor:open-assistant", handleOpenAssistant)
  }, [])

  // Restore chat state after a page refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as {
          messages?: AssistantMessage[]
          conversationId?: string | null
          usage?: UsageStatus | null
        }
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages)
        if (parsed.conversationId) setConversationId(parsed.conversationId)
        if (parsed.usage) setUsage(parsed.usage)
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, conversationId, usage }))
  }, [hydrated, messages, conversationId, usage])

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    await submitMessage()
  }

  async function submitMessage() {
    const text = message.trim()
    if (!text || loading) return

    setMessage("")
    setError(null)
    setMessages((current) => [...current, { role: "USER", content: text }])
    setLoading(true)

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível falar com o assistente.")
        if (data?.usage) setUsage(data.usage)
        return
      }

      setConversationId(data.conversationId)
      setUsage(data.usage)
      setMessages((current) => [...current, { role: "ASSISTANT", content: data.answer }])
    } catch {
      setError("Não foi possível conectar ao assistente.")
    } finally {
      setLoading(false)
    }
  }

  function startNewConversation() {
    setConversationId(null)
    setMessages([])
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className={page
      ? "mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col px-4 py-6 md:px-8 md:py-10"
      : isLessonPage
        ? "fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-3 z-[70] flex flex-col items-end gap-3 md:bottom-5 md:right-5"
        : "fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3"
    }>
      {(page || open) && (
        <section className={page
          ? "flex min-h-[calc(100vh-9rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#15151d] shadow-2xl shadow-black/30"
          : isLessonPage
            ? "flex h-[min(560px,calc(100vh-11rem))] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#15151d] shadow-2xl shadow-black/40 md:h-[min(620px,calc(100vh-7rem))] md:w-[min(390px,calc(100vw-2rem))]"
            : "flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#15151d] shadow-2xl shadow-black/40"
        }>
          <header className="flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/80 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Assistente GameDoctor</p>
                <p className="text-[11px] text-white/50">Seu apoio para aprender e encontrar aulas</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={startNewConversation} className="px-2 py-1 text-[11px] text-white/50 transition hover:text-white" title="Nova conversa">
                Nova
              </button>
              {!page && (
                <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white" title="Fechar assistente">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {status === "loading" ? (
              <p className="text-sm text-white/50">Carregando...</p>
            ) : !session?.user ? (
              <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                <p className="text-sm font-semibold text-white">Entre para conversar</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">Faça login para perguntar sobre as trilhas, aulas e recursos da plataforma.</p>
                <Link href="/login" className="mt-4 inline-flex h-9 items-center rounded-lg bg-cyan-400 px-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-300">
                  Fazer login
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="pt-8 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-cyan-300/70" />
                <p className="mt-3 text-sm font-medium text-white">Qual a sua dúvida?</p>
                <p className="mx-auto mt-2 max-w-[260px] text-xs leading-relaxed text-white/50">Pergunte sobre uma trilha, uma aula ou como avançar nos seus estudos.</p>
              </div>
            ) : (
              messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={item.role === "USER" ? "ml-8 rounded-xl bg-cyan-400 px-3 py-2.5 text-sm text-zinc-950" : "mr-3 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2.5 text-sm leading-relaxed text-white/85"}>
                  {renderMessage(item.content)}
                </div>
              ))
            )}
            {loading && <div className="mr-12 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2.5 text-xs text-white/50">Pensando...</div>}
            {error && (
              <div className="space-y-3 rounded-lg bg-red-400/10 px-3 py-2.5 text-xs text-red-200">
                <p>{error}</p>
                {limitReached && (
                  <a
                    href={supportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-white transition hover:bg-emerald-400"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    Continuar com um humano no WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          <footer className="border-t border-white/[0.08] p-3">
            {usage && (
              <p className="mb-2 text-[10px] text-white/40">
                {usage.creditsRemaining} de {usage.monthlyCredits} perguntas restantes este mês
                {usage.renewsAt && ` · Renova em ${new Date(usage.renewsAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`}
              </p>
            )}
            {session?.user ? (
              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.ctrlKey && !event.shiftKey) {
                      event.preventDefault()
                      void submitMessage()
                    }
                  }}
                  placeholder="Digite sua pergunta..."
                  rows={2}
                  disabled={loading}
                  className="min-h-10 flex-1 resize-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                />
                <button type="submit" disabled={loading || !message.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40" title="Enviar pergunta">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <p className="text-center text-[11px] text-white/40">Login necessário para enviar mensagens.</p>
            )}
          </footer>
        </section>
      )}

      {!page && <div className="flex items-center gap-2">
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500 text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 ${isLessonPage ? "h-11 w-11 md:h-12 md:w-12" : "h-12 w-12"}`}
          title="Falar com um humano no WhatsApp"
          aria-label="Falar com um humano no WhatsApp"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </a>
        <button type="button" onClick={() => setOpen((value) => !value)} className={`flex items-center justify-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400 text-sm font-semibold text-zinc-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300 ${isLessonPage ? "h-11 w-11 px-0 md:h-12 md:w-auto md:px-4" : "h-12 px-4"}`} title="Abrir assistente">
          {open ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          <span className={isLessonPage ? "sr-only md:not-sr-only" : undefined}>Fale com nossa IA</span>
        </button>
      </div>}
    </div>
  )
}
