"use client"

import { type FormEvent, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  Building2,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Ticket,
  Trash2,
  X,
} from "lucide-react"

import { uploadTicketImage, type TicketUploadedImage } from "@/lib/ticket-image-upload"

type TicketStatus = "ABERTO" | "AGUARDANDO_RESPOSTA" | "RESPONDIDO" | "FINALIZADO"
type DepartmentStatus = "ACTIVE" | "INACTIVE"
type AdminTab = "tickets" | "departamentos"

interface DepartmentItem {
  id: string
  name: string
  slug: string
  description: string | null
  order: number
  status: DepartmentStatus
  createdAt: string
  ticketCount: number
}

interface TicketSummary {
  id: string
  ticketNumber: string
  subject: string
  status: TicketStatus
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  department: {
    id: string
    name: string
    status: string
  }
  student: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
  messageCount: number
}

interface TicketDetail {
  id: string
  ticketNumber: string
  subject: string
  status: TicketStatus
  lastMessageAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
  department: {
    id: string
    name: string
    slug: string
    status: string
  }
  student: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
  closedBy: {
    id: string
    name: string
    email: string
  } | null
  messages: Array<{
    id: string
    authorType: "STUDENT" | "STAFF"
    content: string
    createdAt: string
    author: {
      id: string
      name: string
      email: string
      avatarUrl: string | null
      role: string
    }
    attachments: Array<{
      id: string
      fileName: string
      fileUrl: string
      mimeType: string | null
      sizeBytes: number | null
      createdAt: string
    }>
  }>
}

interface TicketsResponse {
  tickets: TicketSummary[]
  departments: Array<{
    id: string
    name: string
    status: string
  }>
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

interface DepartmentsResponse {
  departments: DepartmentItem[]
}

interface DepartmentForm {
  name: string
  description: string
  order: string
  status: DepartmentStatus
}

const emptyDepartmentForm: DepartmentForm = {
  name: "",
  description: "",
  order: "0",
  status: "ACTIVE",
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ticketStatusLabel(status: TicketStatus) {
  if (status === "ABERTO") return "Aberto"
  if (status === "AGUARDANDO_RESPOSTA") return "Aguardando resposta"
  if (status === "RESPONDIDO") return "Respondido"
  return "Finalizado"
}

function ticketStatusTone(status: TicketStatus) {
  if (status === "ABERTO") return "border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
  if (status === "AGUARDANDO_RESPOSTA") return "border-amber-500/30 bg-amber-500/15 text-amber-300"
  if (status === "RESPONDIDO") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
  return "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
}

function departmentStatusLabel(status: DepartmentStatus) {
  return status === "ACTIVE" ? "Ativo" : "Inativo"
}

function departmentStatusTone(status: DepartmentStatus) {
  return status === "ACTIVE"
    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
    : "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
}

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("tickets")

  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [ticketDepartments, setTicketDepartments] = useState<TicketsResponse["departments"]>([])
  const [pagination, setPagination] = useState<TicketsResponse["pagination"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [replyAttachments, setReplyAttachments] = useState<TicketUploadedImage[]>([])
  const [uploadingReply, setUploadingReply] = useState(false)
  const [replying, setReplying] = useState(false)

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [departmentLoading, setDepartmentLoading] = useState(true)
  const [departmentError, setDepartmentError] = useState<string | null>(null)
  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>(emptyDepartmentForm)
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
  const [savingDepartment, setSavingDepartment] = useState(false)
  const [busyDepartmentId, setBusyDepartmentId] = useState<string | null>(null)

  const pageNumbers = useMemo(() => {
    if (!pagination) return []
    const start = Math.max(1, pagination.page - 2)
    const end = Math.min(pagination.totalPages, pagination.page + 2)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [pagination])

  async function loadTickets(targetPage = page) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: "12",
      q: deferredSearch,
      status: statusFilter,
      departmentId: departmentFilter,
    })

    const response = await fetch(`/api/admin/tickets?${params.toString()}`, { cache: "no-store" })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Nao foi possivel carregar os tickets.")
      setLoading(false)
      return
    }

    const payload = data as TicketsResponse
    setTickets(payload.tickets)
    setTicketDepartments(payload.departments)
    setPagination(payload.pagination)
    setPage(payload.pagination.page)

    if (!selectedId && payload.tickets[0]) {
      setSelectedId(payload.tickets[0].id)
      void loadDetail(payload.tickets[0].id)
    } else if (selectedId && !payload.tickets.some((ticket) => ticket.id === selectedId)) {
      const next = payload.tickets[0] ?? null
      setSelectedId(next?.id ?? null)
      setDetail(null)
      if (next) void loadDetail(next.id)
    }

    setLoading(false)
  }

  async function loadDetail(ticketId: string) {
    setDetailLoading(true)
    const response = await fetch(`/api/admin/tickets/${ticketId}`, { cache: "no-store" })
    const data = await response.json().catch(() => null)

    if (response.ok) {
      setDetail(data.ticket as TicketDetail)
    } else {
      setError(data?.error ?? "Nao foi possivel carregar o ticket.")
    }

    setDetailLoading(false)
  }

  async function loadDepartments() {
    setDepartmentLoading(true)
    setDepartmentError(null)

    const response = await fetch("/api/admin/tickets/departamentos", { cache: "no-store" })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setDepartmentError(data?.error ?? "Nao foi possivel carregar os departamentos.")
      setDepartmentLoading(false)
      return
    }

    setDepartments((data as DepartmentsResponse).departments)
    setDepartmentLoading(false)
  }

  useEffect(() => {
    void loadTickets(page)
  }, [page, deferredSearch, statusFilter, departmentFilter])

  useEffect(() => {
    void loadDepartments()
  }, [])

  async function handleReplyUpload(files: FileList | null) {
    if (!files?.length) return

    try {
      setUploadingReply(true)
      const uploaded = await Promise.all(Array.from(files).slice(0, 5).map((file) => uploadTicketImage(file)))
      setReplyAttachments((current) => [...current, ...uploaded].slice(0, 5))
    } catch (uploadError) {
      window.alert(uploadError instanceof Error ? uploadError.message : "Nao foi possivel enviar a imagem.")
    } finally {
      setUploadingReply(false)
    }
  }

  async function handleReply(event: FormEvent) {
    event.preventDefault()
    if (!detail) return

    setReplying(true)
    const response = await fetch(`/api/admin/tickets/${detail.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: replyContent,
        attachments: replyAttachments,
      }),
    })
    const data = await response.json().catch(() => null)
    setReplying(false)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel responder o ticket.")
      return
    }

    setReplyContent("")
    setReplyAttachments([])
    await Promise.all([loadTickets(page), loadDetail(detail.id)])
  }

  async function finalizeTicket() {
    if (!detail) return
    if (!window.confirm("Deseja finalizar este ticket?")) return

    const response = await fetch(`/api/admin/tickets/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finalize" }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel finalizar o ticket.")
      return
    }

    await Promise.all([loadTickets(page), loadDetail(detail.id)])
  }

  function startEditDepartment(department: DepartmentItem) {
    setEditingDepartmentId(department.id)
    setDepartmentForm({
      name: department.name,
      description: department.description ?? "",
      order: String(department.order),
      status: department.status,
    })
  }

  function resetDepartmentForm() {
    setEditingDepartmentId(null)
    setDepartmentForm(emptyDepartmentForm)
  }

  async function saveDepartment(event: FormEvent) {
    event.preventDefault()
    setSavingDepartment(true)

    const response = await fetch(
      editingDepartmentId
        ? `/api/admin/tickets/departamentos/${editingDepartmentId}`
        : "/api/admin/tickets/departamentos",
      {
        method: editingDepartmentId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: departmentForm.name,
          description: departmentForm.description,
          order: departmentForm.order,
          status: departmentForm.status,
        }),
      }
    )

    const data = await response.json().catch(() => null)
    setSavingDepartment(false)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel salvar o departamento.")
      return
    }

    resetDepartmentForm()
    await Promise.all([loadDepartments(), loadTickets(1)])
  }

  async function deleteDepartment(department: DepartmentItem) {
    if (!window.confirm(`Deseja excluir o departamento "${department.name}"?`)) return
    setBusyDepartmentId(department.id)
    const response = await fetch(`/api/admin/tickets/departamentos/${department.id}`, { method: "DELETE" })
    const data = await response.json().catch(() => null)
    setBusyDepartmentId(null)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel excluir o departamento.")
      return
    }

    if (editingDepartmentId === department.id) {
      resetDepartmentForm()
    }

    await Promise.all([loadDepartments(), loadTickets(1)])
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tickets</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Gerencie departamentos de suporte, acompanhe os chamados e responda os alunos sem sair do painel.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              void loadTickets(1)
              void loadDepartments()
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium transition hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "tickets"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          Tickets
        </button>
        <button
          onClick={() => setActiveTab("departamentos")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "departamentos"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          Departamentos
        </button>
      </div>

      {activeTab === "tickets" ? (
        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="grid gap-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Buscar por numero, assunto, nome ou e-mail"
                  className="h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none transition focus:border-cyan-500/40"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(1)
                  }}
                  className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-cyan-500/40"
                >
                  <option value="all">Todos os status</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="AGUARDANDO_RESPOSTA">Aguardando resposta</option>
                  <option value="RESPONDIDO">Respondido</option>
                  <option value="FINALIZADO">Finalizado</option>
                </select>

                <select
                  value={departmentFilter}
                  onChange={(event) => {
                    setDepartmentFilter(event.target.value)
                    setPage(1)
                  }}
                  className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-cyan-500/40"
                >
                  <option value="all">Todos os departamentos</option>
                  {ticketDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
                Nenhum ticket encontrado.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      setSelectedId(ticket.id)
                      void loadDetail(ticket.id)
                    }}
                    className={`block w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedId === ticket.id
                        ? "border-cyan-500/30 bg-cyan-500/10"
                        : "border-border bg-background/40 hover:bg-background/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {ticket.ticketNumber}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">{ticket.subject}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ticketStatusTone(ticket.status)}`}>
                        {ticketStatusLabel(ticket.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{ticket.student.name}</span>
                      <span>{ticket.department.name}</span>
                      <span>{ticket.messageCount} mensagem(ns)</span>
                      <span>{formatDate(ticket.lastMessageAt)}</span>
                    </div>
                  </button>
                ))}

                {pagination ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                    <p className="text-xs text-muted-foreground">{pagination.totalItems} ticket(s)</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={!pagination.hasPreviousPage}
                        className="rounded-full border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      {pageNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          className={`h-9 min-w-9 rounded-full px-3 text-xs font-medium transition ${
                            pagination.page === pageNumber
                              ? "bg-primary text-primary-foreground"
                              : "border border-border hover:bg-accent"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((current) => current + 1)}
                        disabled={!pagination.hasNextPage}
                        className="rounded-full border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent disabled:opacity-50"
                      >
                        Proxima
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            {detailLoading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !detail ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-20 text-center text-sm text-muted-foreground">
                Selecione um ticket para abrir o historico completo.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {detail.ticketNumber}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{detail.subject}</h2>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span>{detail.student.name}</span>
                      <span>{detail.student.email}</span>
                      <span>{detail.department.name}</span>
                      <span>Ultima atividade {formatDate(detail.lastMessageAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${ticketStatusTone(detail.status)}`}>
                      {ticketStatusLabel(detail.status)}
                    </span>
                    {detail.status !== "FINALIZADO" ? (
                      <button
                        onClick={() => void finalizeTicket()}
                        className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                      >
                        Finalizar
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4">
                  {detail.messages.map((message) => (
                    <article key={message.id} className="rounded-2xl border border-border bg-background/40 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {(message.author.name || "U")
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {message.authorType === "STAFF" ? "Equipe GameDoctor" : message.author.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">{message.content}</p>

                      {message.attachments.length ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {message.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-[60px] w-[60px] overflow-hidden rounded-xl border border-border"
                              title={attachment.fileName}
                            >
                              <img
                                src={attachment.fileUrl}
                                alt={attachment.fileName}
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                {detail.status === "FINALIZADO" ? (
                  <div className="rounded-2xl border border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                    Este ticket foi finalizado e nao aceita novas respostas.
                  </div>
                ) : (
                  <form onSubmit={handleReply} className="rounded-2xl border border-border bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Responder ticket</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Responda o aluno e mantenha o historico centralizado.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent">
                        <ImagePlus className="h-4 w-4" />
                        {uploadingReply ? "Enviando..." : "Anexar imagem"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => void handleReplyUpload(event.target.files)}
                        />
                      </label>
                    </div>

                    <textarea
                      value={replyContent}
                      onChange={(event) => setReplyContent(event.target.value)}
                      className="min-h-[140px] w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-cyan-500/40"
                      placeholder="Escreva sua resposta..."
                    />

                    {replyAttachments.length ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {replyAttachments.map((attachment) => (
                          <button
                            key={attachment.url}
                            type="button"
                            onClick={() => setReplyAttachments((current) => current.filter((item) => item.url !== attachment.url))}
                            className="group relative h-[60px] w-[60px] overflow-hidden rounded-xl border border-border"
                          >
                            <img src={attachment.url} alt={attachment.fileName} className="h-full w-full object-cover" />
                            <span className="absolute inset-0 hidden items-center justify-center bg-black/60 text-white group-hover:flex">
                              <X className="h-4 w-4" />
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={replying || uploadingReply}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                      >
                        {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar resposta
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastro de departamento</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie areas de atendimento para o aluno escolher na abertura do ticket.
              </p>
            </div>

            <form onSubmit={saveDepartment} className="space-y-4">
              <Field label="Nome">
                <input
                  value={departmentForm.name}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </Field>

              <Field label="Descricao">
                <textarea
                  value={departmentForm.description}
                  onChange={(event) => setDepartmentForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ordem">
                  <input
                    value={departmentForm.order}
                    onChange={(event) => setDepartmentForm((current) => ({ ...current, order: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={departmentForm.status}
                    onChange={(event) =>
                      setDepartmentForm((current) => ({ ...current, status: event.target.value as DepartmentStatus }))
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </Field>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingDepartment}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {savingDepartment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingDepartmentId ? "Salvar departamento" : "Criar departamento"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={resetDepartmentForm}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                >
                  Limpar
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Departamentos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Organize o atendimento e mantenha a triagem inicial do aluno mais objetiva.
              </p>
            </div>

            {departmentError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {departmentError}
              </div>
            ) : null}

            {departmentLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : departments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
                Nenhum departamento cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {departments.map((department) => (
                  <article key={department.id} className="rounded-2xl border border-border bg-background/35 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{department.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${departmentStatusTone(department.status)}`}>
                            {departmentStatusLabel(department.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-cyan-300/80">/{department.slug}</p>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                          {department.description || "Sem descricao cadastrada ainda."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                            Ordem {department.order}
                          </span>
                          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                            {department.ticketCount} ticket(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => startEditDepartment(department)}
                          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => void deleteDepartment(department)}
                          disabled={busyDepartmentId === department.id}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {busyDepartmentId === department.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
