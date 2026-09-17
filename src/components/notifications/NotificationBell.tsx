"use client"

import Link from "next/link"
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  title: string
  body: string
  kind: "SIMPLE" | "RICH_TEXT" | "LINK"
  href: string | null
  readAt: string | null
  createdAt: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  async function load() {
    const response = await fetch("/api/notifications", { cache: "no-store" })
    if (response.ok) {
      const data = await response.json()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function markRead(id?: string) {
    setMarking(true)
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) })
    if (response.ok) {
      setNotifications((current) => current.map((notification) => id && notification.id !== id ? notification : { ...notification, readAt: new Date().toISOString() }))
    }
    setMarking(false)
  }

  return (
    <div className="relative" style={{ zIndex: 3 }}>
      <button type="button" onClick={() => setOpen((current) => !current)} className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground" aria-label="Notificações">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" /> : null}
      </button>
      {open ? createPortal(
        <div className="fixed bottom-auto left-2 right-2 top-[4.5rem] z-[1000] box-border flex max-h-[40vh] w-auto max-w-none min-w-0 flex-col overflow-x-hidden overflow-y-hidden rounded-2xl border border-border bg-card shadow-2xl md:left-auto md:right-4 md:top-16 md:max-h-[40vh] md:w-[min(24rem,calc(100vw-2rem))]" style={{ maxWidth: "calc(100vw - 1rem)" }}>
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div><p className="font-semibold">Notificações</p><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} não lida(s)` : "Tudo em dia"}</p></div>
            <button type="button" disabled={!unreadCount || marking} onClick={() => void markRead()} className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-cyan-300 disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" /> <span className="sm:hidden">Marcar</span><span className="hidden sm:inline">Marcar todas</span></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : notifications.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p> : notifications.map((notification) => (
               <div key={notification.id} className={cn("min-w-0 border-b border-border/60 p-4 last:border-0", !notification.readAt && "bg-cyan-400/[0.04]")}>
                 <div className="flex min-w-0 items-start gap-3"><span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", notification.readAt ? "bg-muted" : "bg-cyan-300 shadow-[0_0_7px_#67e8f9]")} /><div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]"><div className="flex min-w-0 items-start justify-between gap-2"><p className="min-w-0 flex-1 break-words font-medium leading-5">{notification.title}</p><time className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">{formatDate(notification.createdAt)}</time></div>{notification.kind === "RICH_TEXT" ? <div className="mt-1 text-sm text-muted-foreground [&_a]:text-cyan-300 [&_a]:underline" dangerouslySetInnerHTML={{ __html: notification.body }} /> : <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{notification.body}</p>}{notification.href ? <Link href={notification.href} onClick={() => { if (!notification.readAt) void markRead(notification.id); setOpen(false) }} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">Acessar <ExternalLink className="h-3 w-3" /></Link> : !notification.readAt ? <button type="button" onClick={() => void markRead(notification.id)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Marcar como lida</button> : null}</div></div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
