"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronDown,
  CreditCard,
  FileBadge2,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react"

type UserStatus = "ACTIVE" | "BLOCKED" | "INACTIVE" | "PENDING"
type DetailView = "purchases" | "accesses" | "progress" | "certificates"

interface StudentItem {
  id: string
  name: string
  email: string
  status: UserStatus
  createdAt: string
  lastLoginAt: string | null
  subscription: {
    active: boolean
    planName: string | null
    expiresAt: string | null
    daysRemaining: number | null
    label: string
  }
}

interface Summary {
  totalStudents: number
  activeStudents: number
  blockedStudents: number
  activeSubscriptions: number
}

interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

interface StudentDetails {
  student: {
    id: string
    name: string
    email: string
    status: UserStatus
    createdAt: string
    lastLoginAt: string | null
  }
  purchases: Array<{
    id: string
    paymentStatus: string
    amount: number
    createdAt: string
    items: string[]
  }>
  activeAccesses: Array<{
    id: string
    label: string
    accessType: string
    startsAt: string
    expiresAt: string | null
    daysRemaining: number | null
  }>
  progress: {
    totalCompletedLessons: number
    totalStudySeconds: number
    courses: Array<{
      courseId: string
      title: string
      totalLessons: number
      completedLessons: number
      progress: number
    }>
  }
  certificates: Array<{
    id: string
    code: string
    courseTitle: string
    issuedAt: string
    status: string
  }>
}

interface ApiResponse {
  summary: Summary
  students: StudentItem[]
  pagination: Pagination
}

function statusLabel(status: UserStatus) {
  if (status === "ACTIVE") return "Ativo"
  if (status === "BLOCKED") return "Bloqueado"
  if (status === "INACTIVE") return "Inativo"
  return "Pendente"
}

function statusTone(status: UserStatus) {
  if (status === "ACTIVE") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
  if (status === "BLOCKED") return "border-red-500/30 bg-red-500/15 text-red-400"
  if (status === "INACTIVE") return "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
  return "border-amber-500/30 bg-amber-500/15 text-amber-400"
}

function subscriptionTone(student: StudentItem) {
  if (student.subscription.active) {
    return "border-cyan-500/30 bg-cyan-500/15 text-cyan-400"
  }

  if (student.subscription.label === "Expirado") {
    return "border-amber-500/30 bg-amber-500/15 text-amber-400"
  }

  return "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
}

function formatDate(date: string | null) {
  if (!date) return "Nunca"
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatStudyTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
  return `${minutes}m`
}

function detailTitle(view: DetailView) {
  if (view === "purchases") return "Histórico de compras"
  if (view === "accesses") return "Acessos ativos"
  if (view === "progress") return "Progresso"
  return "Certificados"
}

export default function AdminAlunosPage() {
  const [items, setItems] = useState<StudentItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [passwordModalUser, setPasswordModalUser] = useState<StudentItem | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [detailsUser, setDetailsUser] = useState<StudentItem | null>(null)
  const [detailsView, setDetailsView] = useState<DetailView>("purchases")
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [details, setDetails] = useState<StudentDetails | null>(null)

  const pageNumbers = useMemo(() => {
    if (!pagination) return []
    const start = Math.max(1, pagination.page - 2)
    const end = Math.min(pagination.totalPages, pagination.page + 2)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [pagination])

  async function load(targetPage = page) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: "10",
      q: deferredSearch,
      status: statusFilter,
      subscription: subscriptionFilter,
    })

    const response = await fetch(`/api/admin/alunos?${params.toString()}`, { cache: "no-store" })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível carregar os alunos.")
      setLoading(false)
      return
    }

    const payload = data as ApiResponse
    setItems(payload.students)
    setSummary(payload.summary)
    setPagination(payload.pagination)
    setPage(payload.pagination.page)
    setLoading(false)
  }

  useEffect(() => {
    load(page)
  }, [page, deferredSearch, statusFilter, subscriptionFilter])

  async function updateStudent(id: string, payload: Record<string, unknown>) {
    setBusyId(id)
    const response = await fetch(`/api/admin/alunos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    setBusyId(null)

    if (!response.ok) {
      alert(data?.error ?? "Não foi possível atualizar este aluno.")
      return false
    }

    await load(page)

    if (detailsUser?.id === id) {
      await openDetails(detailsUser, detailsView)
    }

    return true
  }

  async function openDetails(student: StudentItem, view: DetailView) {
    setOpenActionMenuId(null)
    setDetailsUser(student)
    setDetailsView(view)
    setDetailsLoading(true)
    setDetailsError(null)

    const response = await fetch(`/api/admin/alunos/${student.id}`, { cache: "no-store" })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setDetailsError(data?.error ?? "Não foi possível carregar os detalhes do aluno.")
      setDetails(null)
      setDetailsLoading(false)
      return
    }

    setDetails(data as StudentDetails)
    setDetailsLoading(false)
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!passwordModalUser) return

    setPasswordLoading(true)
    const success = await updateStudent(passwordModalUser.id, {
      action: "set-password",
      password,
      confirmPassword,
    })
    setPasswordLoading(false)

    if (!success) return

    setPassword("")
    setConfirmPassword("")
    setPasswordModalUser(null)
  }

  return (
    <div className="max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte usuários da plataforma, acompanhe assinatura por prazo e acesse rapidamente o histórico do aluno.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Total de alunos</p>
          <p className="mt-1 text-2xl font-bold">{summary ? summary.totalStudents : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Ativos</p>
          <p className="mt-1 text-2xl font-bold">{summary ? summary.activeStudents : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Bloqueados</p>
          <p className="mt-1 text-2xl font-bold">{summary ? summary.blockedStudents : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Assinaturas ativas</p>
          <p className="mt-1 text-2xl font-bold">{summary ? summary.activeSubscriptions : "—"}</p>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome ou e-mail"
              className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="BLOCKED">Bloqueados</option>
            <option value="INACTIVE">Inativos</option>
            <option value="PENDING">Pendentes</option>
          </select>

          <select
            value={subscriptionFilter}
            onChange={(event) => {
              setSubscriptionFilter(event.target.value)
              setPage(1)
            }}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="all">Todas assinaturas</option>
            <option value="active">Com assinatura ativa</option>
            <option value="inactive">Sem assinatura ativa</option>
          </select>

          <button
            onClick={() => load(page)}
            className="h-11 rounded-lg border border-border px-4 text-sm hover:bg-accent"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum aluno encontrado para os filtros aplicados.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border">
              <div className=" rounded-xl">
                <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-background/70">
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-4 py-3">Aluno</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assinatura</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3">Último login</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((student) => {
                      const isBusy = busyId === student.id
                      const actionLabel = student.status === "BLOCKED" ? "Ativar" : "Inativar"

                      return (
                        <tr key={student.id} className="bg-card/20 align-top">
                          <td className="px-4 py-4">
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{student.email}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusTone(student.status)}`}>
                              {statusLabel(student.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${subscriptionTone(student)}`}
                              >
                                {student.subscription.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(student.createdAt)}</td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">{formatDate(student.lastLoginAt)}</td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end">
                              <div className="relative">
                                <button
                                  disabled={isBusy}
                                  onClick={() =>
                                    setOpenActionMenuId((current) => (current === student.id ? null : student.id))
                                  }
                                  className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-60"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                    Ações
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </span>
                                </button>

                                {openActionMenuId === student.id ? (
                                  <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-background p-2 shadow-2xl">
                                    <button
                                      onClick={() => {
                                        setOpenActionMenuId(null)
                                        if (confirm(`Deseja ${actionLabel.toLowerCase()} ${student.email}?`)) {
                                          updateStudent(student.id, { action: "toggle-status" })
                                        }
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                                    >
                                      {student.status === "BLOCKED" ? (
                                        <UserCheck className="h-4 w-4 text-emerald-400" />
                                      ) : (
                                        <ShieldAlert className="h-4 w-4 text-amber-400" />
                                      )}
                                      {actionLabel}
                                    </button>

                                    <button
                                      onClick={() => {
                                        setOpenActionMenuId(null)
                                        setPassword("")
                                        setConfirmPassword("")
                                        setPasswordModalUser(student)
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                                    >
                                      <KeyRound className="h-4 w-4 text-cyan-400" />
                                      Alterar senha
                                    </button>

                                    <button
                                      onClick={() => openDetails(student, "purchases")}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                                    >
                                      <CreditCard className="h-4 w-4 text-emerald-400" />
                                      Histórico de compras
                                    </button>

                                    <button
                                      onClick={() => openDetails(student, "accesses")}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                                    >
                                      <ShieldAlert className="h-4 w-4 text-blue-400" />
                                      Acessos ativos
                                    </button>

                                    <button
                                      onClick={() => openDetails(student, "progress")}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                                    >
                                      <TrendingUp className="h-4 w-4 text-violet-400" />
                                      Progresso
                                    </button>

                                    <button
                                      onClick={() => openDetails(student, "certificates")}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                                    >
                                      <FileBadge2 className="h-4 w-4 text-amber-400" />
                                      Certificados
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {isBusy ? (
                              <p className="mt-2 text-right text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Salvando...
                                </span>
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {items.length} de {pagination.totalItems} alunos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        pageNumber === pagination.page
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:bg-accent"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {passwordModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Alterar senha</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Defina uma nova senha para <strong>{passwordModalUser.email}</strong>.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nova senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  placeholder="Mínimo de 8 caracteres"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  placeholder="Repita a nova senha"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!passwordLoading) {
                      setPasswordModalUser(null)
                      setPassword("")
                      setConfirmPassword("")
                    }
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {passwordLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando
                    </span>
                  ) : (
                    "Salvar senha"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailsUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{detailTitle(detailsView)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detailsUser.name} • {detailsUser.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailsUser(null)
                  setDetails(null)
                  setDetailsError(null)
                }}
                className="rounded-lg border border-border p-2 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {([
                ["purchases", "Histórico de compras"],
                ["accesses", "Acessos ativos"],
                ["progress", "Progresso"],
                ["certificates", "Certificados"],
              ] as Array<[DetailView, string]>).map(([view, label]) => (
                <button
                  key={view}
                  onClick={() => {
                    if (detailsUser) {
                      openDetails(detailsUser, view)
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    detailsView === view
                      ? "bg-primary text-primary-foreground"
                      : "border border-border hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 min-h-[320px] rounded-xl border border-border bg-card/40 p-4">
              {detailsLoading ? (
                <div className="flex h-[280px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
              ) : detailsError ? (
                <p className="text-sm text-destructive">{detailsError}</p>
              ) : !details ? null : detailsView === "purchases" ? (
                details.purchases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma compra encontrada.</p>
                ) : (
                  <div className="space-y-3">
                    {details.purchases.map((purchase) => (
                      <div key={purchase.id} className="rounded-xl border border-border bg-background/60 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-medium">{purchase.items.join(", ")}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Pedido em {formatDate(purchase.createdAt)} • Status {purchase.paymentStatus}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-emerald-400">{formatCurrency(purchase.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : detailsView === "accesses" ? (
                details.activeAccesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum acesso ativo no momento.</p>
                ) : (
                  <div className="space-y-3">
                    {details.activeAccesses.map((access) => (
                      <div key={access.id} className="rounded-xl border border-border bg-background/60 p-4">
                        <p className="text-sm font-medium">{access.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tipo {access.accessType} • Início {formatDate(access.startsAt)} •{" "}
                          {access.expiresAt
                            ? `Expira em ${access.daysRemaining ?? 0} dias`
                            : "Sem expiração"}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ) : detailsView === "progress" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background/60 p-4">
                      <p className="text-xs text-muted-foreground">Aulas concluídas</p>
                      <p className="mt-1 text-2xl font-bold">{details.progress.totalCompletedLessons}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-4">
                      <p className="text-xs text-muted-foreground">Tempo de estudo</p>
                      <p className="mt-1 text-2xl font-bold">{formatStudyTime(details.progress.totalStudySeconds)}</p>
                    </div>
                  </div>

                  {details.progress.courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum progresso registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {details.progress.courses.map((course) => (
                        <div key={course.courseId} className="rounded-xl border border-border bg-background/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{course.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {course.completedLessons} de {course.totalLessons} aulas concluídas
                              </p>
                            </div>
                            <p className="text-sm font-semibold">{course.progress}%</p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : details.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum certificado emitido.</p>
              ) : (
                <div className="space-y-3">
                  {details.certificates.map((certificate) => (
                    <div key={certificate.id} className="rounded-xl border border-border bg-background/60 p-4">
                      <p className="text-sm font-medium">{certificate.courseTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Código {certificate.code} • Emitido em {formatDate(certificate.issuedAt)} • Status{" "}
                        {certificate.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
