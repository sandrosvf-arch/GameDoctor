"use client"

import { useEffect, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Loader2,
  Mail,
  UserCog,
  Copy,
  Shield,
  ShieldAlert,
  UserMinus,
  UserCheck,
  RefreshCw,
} from "lucide-react"

type AdminRole = "ADMIN" | "EDITOR"
type UserStatus = "ACTIVE" | "BLOCKED" | "PENDING"

interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: UserStatus
  createdAt: string
  lastLoginAt: string | null
  invitedPending: boolean
  inviteUrl: string | null
}

interface ApiResponse {
  admins: AdminUser[]
}

function statusLabel(status: UserStatus) {
  if (status === "ACTIVE") return "Ativo"
  if (status === "BLOCKED") return "Bloqueado"
  return "Pendente"
}

function roleLabel(role: AdminRole) {
  return role === "ADMIN" ? "Administrador" : "Editor"
}

export default function AdminPerfilPage() {
  const [items, setItems] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<AdminRole>("ADMIN")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const [busyId, setBusyId] = useState<string | null>(null)

  const adminCount = useMemo(() => items.filter((i) => i.role === "ADMIN").length, [items])

  async function load() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/admin/perfil/admins", { cache: "no-store" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? "Não foi possível carregar os administradores.")
      setLoading(false)
      return
    }
    setItems((data as ApiResponse).admins)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMessage(null)
    setInviteLink(null)

    const res = await fetch("/api/admin/perfil/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })

    const data = await res.json().catch(() => null)
    setInviteLoading(false)

    if (!res.ok) {
      setInviteMessage(data?.error ?? "Falha ao enviar convite.")
      if (data?.inviteUrl) setInviteLink(data.inviteUrl)
      return
    }

    setInviteEmail("")
    setInviteRole("ADMIN")
    setInviteMessage("Convite criado com sucesso.")
    setInviteLink(data?.inviteUrl ?? null)
    await load()
  }

  async function patchUser(id: string, payload: Record<string, unknown>) {
    setBusyId(id)
    const res = await fetch(`/api/admin/perfil/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    setBusyId(null)

    if (!res.ok) {
      alert(data?.error ?? "Não foi possível atualizar este administrador.")
      return
    }

    await load()
  }

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setInviteMessage("Link de convite copiado.")
    } catch {
      setInviteMessage("Não foi possível copiar automaticamente. Copie manualmente abaixo.")
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Perfil Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure quem tem acesso administrativo e convide novos membros por e-mail.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Total na equipe admin</p>
          <p className="text-2xl font-bold mt-1">{items.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Administradores</p>
          <p className="text-2xl font-bold mt-1">{adminCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Convites pendentes</p>
          <p className="text-2xl font-bold mt-1">{items.filter((i) => i.invitedPending).length}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Convidar novo administrador
        </h2>

        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="email"
            placeholder="email@empresa.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="md:col-span-3 h-10 rounded-lg border border-border bg-background px-3 text-sm"
            required
            disabled={inviteLoading}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as AdminRole)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            disabled={inviteLoading}
          >
            <option value="ADMIN">Administrador</option>
            <option value="EDITOR">Editor</option>
          </select>
          <button
            type="submit"
            disabled={inviteLoading}
            className="h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {inviteLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Convidando...
              </span>
            ) : (
              "Enviar convite"
            )}
          </button>
        </form>

        {inviteMessage && (
          <p className="text-sm text-muted-foreground">{inviteMessage}</p>
        )}

        {inviteLink && (
          <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Link de convite:</p>
            <div className="flex gap-2">
              <input
                value={inviteLink}
                readOnly
                className="flex-1 h-9 rounded-md border border-border bg-background px-2 text-xs"
              />
              <button
                type="button"
                onClick={() => copyInvite(inviteLink)}
                className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent"
              >
                <span className="inline-flex items-center gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </span>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            Administradores da plataforma
          </h2>
          <button
            onClick={load}
            className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent"
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </span>
          </button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum administrador encontrado.</p>
        ) : (
          <div className="space-y-3">
            {items.map((user) => {
              const isBusy = busyId === user.id
              return (
                <div key={user.id} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40">
                          {roleLabel(user.role)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          user.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                            : user.status === "BLOCKED"
                            ? "border-red-500/30 bg-red-500/15 text-red-400"
                            : "border-amber-500/30 bg-amber-500/15 text-amber-400"
                        }`}>
                          {statusLabel(user.status)}
                        </span>
                        {user.invitedPending && user.inviteUrl && (
                          <button
                            onClick={() => copyInvite(user.inviteUrl!)}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 text-cyan-400"
                          >
                            Copiar convite
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Último acesso: {user.lastLoginAt
                          ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: ptBR })
                          : "nunca"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={user.role}
                        disabled={isBusy}
                        onChange={(e) => patchUser(user.id, { action: "set-role", role: e.target.value })}
                        className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                      >
                        <option value="ADMIN">Administrador</option>
                        <option value="EDITOR">Editor</option>
                      </select>

                      <button
                        disabled={isBusy}
                        onClick={() => patchUser(user.id, { action: "toggle-status" })}
                        className="h-9 px-3 rounded-md border border-border text-xs hover:bg-accent"
                      >
                        <span className="inline-flex items-center gap-1">
                          {user.status === "BLOCKED" ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" /> Desbloquear
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3.5 w-3.5" /> Bloquear
                            </>
                          )}
                        </span>
                      </button>

                      <button
                        disabled={isBusy}
                        onClick={() => {
                          if (confirm(`Remover acesso administrativo de ${user.email}?`)) {
                            patchUser(user.id, { action: "revoke" })
                          }
                        }}
                        className="h-9 px-3 rounded-md border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10"
                      >
                        <span className="inline-flex items-center gap-1">
                          <UserMinus className="h-3.5 w-3.5" /> Remover admin
                        </span>
                      </button>
                    </div>
                  </div>

                  {isBusy && (
                    <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando alterações...
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-cyan-400" />
          Dica: convites pendentes ficam com status "Pendente". O usuário completa o cadastro no link enviado.
        </p>
      </div>
    </div>
  )
}
