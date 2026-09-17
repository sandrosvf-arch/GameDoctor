"use client"

import Link from "next/link"
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground" aria-label="Notificações">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><p className="font-semibold">Notificações</p><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} não lida(s)` : "Tudo em dia"}</p></div>
            <button type="button" disabled={!unreadCount || marking} onClick={() => void markRead()} className="flex items-center gap-1 text-xs text-cyan-300 disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" /> Marcar todas</button>
          </div>
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {loading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : notifications.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p> : notifications.map((notification) => (
              <div key={notification.id} className={cn("border-b border-border/60 p-4 last:border-0", !notification.readAt && "bg-cyan-400/[0.04]")}>
                <div className="flex items-start gap-3"><span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", notification.readAt ? "bg-muted" : "bg-cyan-300 shadow-[0_0_7px_#67e8f9]")} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-medium leading-5">{notification.title}</p><time className="shrink-0 text-[10px] text-muted-foreground">{formatDate(notification.createdAt)}</time></div>{notification.kind === "RICH_TEXT" ? <div className="mt-1 text-sm text-muted-foreground [&_a]:text-cyan-300 [&_a]:underline" dangerouslySetInnerHTML={{ __html: notification.body }} /> : <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{notification.body}</p>}{notification.href ? <Link href={notification.href} onClick={() => { if (!notification.readAt) void markRead(notification.id); setOpen(false) }} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200">Acessar <ExternalLink className="h-3 w-3" /></Link> : !notification.readAt ? <button type="button" onClick={() => void markRead(notification.id)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Marcar como lida</button> : null}</div></div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
