"use client"

import { type FormEvent, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  HeadphonesIcon,
  ImagePlus,
  Inbox,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react"

import { uploadTicketImage, type TicketUploadedImage } from "@/lib/ticket-image-upload"

type TicketStatus = "ABERTO" | "AGUARDANDO_RESPOSTA" | "RESPONDIDO" | "FINALIZADO"

interface DepartmentOption {
  id: string
  name: string
  description: string | null
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
  departments: DepartmentOption[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusLabel(status: TicketStatus) {
  if (status === "ABERTO") return "Aberto"
  if (status === "AGUARDANDO_RESPOSTA") return "Aguardando resposta"
  if (status === "RESPONDIDO") return "Respondido"
  return "Finalizado"
}

function statusTone(status: TicketStatus) {
  if (status === "ABERTO") return "border-sky-500/20 bg-sky-500/10 text-sky-300"
  if (status === "AGUARDANDO_RESPOSTA") return "border-amber-500/20 bg-amber-500/10 text-amber-300"
  if (status === "RESPONDIDO") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  return "border-slate-500/20 bg-slate-500/10 text-slate-400"
}

function authorLabel(authorType: "STUDENT" | "STAFF") {
  return authorType === "STAFF" ? "Equipe GameDoctor" : "Você"
}

function getInitials(name?: string | null) {
  if (!name) return "U"

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export default function MemberTicketsPage() {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [pagination, setPagination] = useState<TicketsResponse["pagination"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [subject, setSubject] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [content, setContent] = useState("")
  const [creating, setCreating] = useState(false)

  const [replying, setReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [createAttachments, setCreateAttachments] = useState<TicketUploadedImage[]>([])
  const [replyAttachments, setReplyAttachments] = useState<TicketUploadedImage[]>([])
  const [uploadingCreate, setUploadingCreate] = useState(false)
  const [uploadingReply, setUploadingReply] = useState(false)

  const pageNumbers = useMemo(() => {
    if (!pagination) return []

    const start = Math.max(1, pagination.page - 2)
    const end = Math.min(pagination.totalPages, pagination.page + 2)

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [pagination])

  const openTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "FINALIZADO").length,
    [tickets]
  )

  async function load(targetPage = page) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: "10",
      q: deferredSearch,
      status: statusFilter,
    })

    const response = await fetch(`/api/tickets?${params.toString()}`, {
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível carregar os tickets.")
      setLoading(false)
      return
    }

    const payload = data as TicketsResponse

    setTickets(payload.tickets)
    setDepartments(payload.departments)
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

    const response = await fetch(`/api/tickets/${ticketId}`, {
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)

    if (response.ok) {
      setDetail(data.ticket as TicketDetail)
    } else {
      setError(data?.error ?? "Não foi possível carregar o ticket.")
    }

    setDetailLoading(false)
  }

  useEffect(() => {
    void load(page)
  }, [page, deferredSearch, statusFilter])

  async function handleUpload(files: FileList | null, target: "create" | "reply") {
    if (!files?.length) return

    try {
      target === "create" ? setUploadingCreate(true) : setUploadingReply(true)

      const uploaded = await Promise.all(
        Array.from(files)
          .slice(0, 5)
          .map((file) => uploadTicketImage(file))
      )

      if (target === "create") {
        setCreateAttachments((current) => [...current, ...uploaded].slice(0, 5))
      } else {
        setReplyAttachments((current) => [...current, ...uploaded].slice(0, 5))
      }
    } catch (uploadError) {
      window.alert(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a imagem.")
    } finally {
      target === "create" ? setUploadingCreate(false) : setUploadingReply(false)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)

    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject,
        departmentId,
        content,
        attachments: createAttachments,
      }),
    })

    const data = await response.json().catch(() => null)

    setCreating(false)

    if (!response.ok) {
      window.alert(data?.error ?? "Não foi possível criar o ticket.")
      return
    }

    const createdTicket = data.ticket as TicketDetail

    setShowCreate(false)
    setSubject("")
    setDepartmentId("")
    setContent("")
    setCreateAttachments([])
    setSelectedId(createdTicket.id)
    setDetail(createdTicket)

    await load(1)
  }

  async function handleReply(event: FormEvent) {
    event.preventDefault()

    if (!detail) return

    setReplying(true)

    const response = await fetch(`/api/tickets/${detail.id}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: replyContent,
        attachments: replyAttachments,
      }),
    })

    const data = await response.json().catch(() => null)

    setReplying(false)

    if (!response.ok) {
      window.alert(data?.error ?? "Não foi possível responder o ticket.")
      return
    }

    setReplyContent("")
    setReplyAttachments([])

    await Promise.all([load(page), loadDetail(detail.id)])
  }

  async function finalizeTicket() {
    if (!detail) return
    if (!window.confirm("Deseja finalizar este ticket?")) return

    const response = await fetch(`/api/tickets/${detail.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "finalize",
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      window.alert(data?.error ?? "Não foi possível finalizar o ticket.")
      return
    }

    await Promise.all([load(page), loadDetail(detail.id)])
  }

  return (
    <div className="min-h-screen bg-[#090c11] text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-6 rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="flex flex-col gap-5 border-b border-white/[0.08] px-5 py-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
                Central de atendimento
              </div>

              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                Meus tickets
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Abra solicitações, acompanhe respostas da equipe e mantenha todo o histórico organizado em um só lugar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void load(1)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>

              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                <Ticket className="h-4 w-4" />
                Novo ticket
              </button>
            </div>
          </div>

          <div className="grid gap-px bg-white/[0.08] sm:grid-cols-3">
            <SummaryBox
              label="Tickets"
              value={pagination?.totalItems ?? tickets.length}
              description="Total encontrado"
            />

            <SummaryBox
              label="Em aberto"
              value={openTickets}
              description="Aguardando andamento"
            />

            <SummaryBox
              label="Departamentos"
              value={departments.length}
              description="Áreas de atendimento"
            />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
            <div className="border-b border-white/[0.08] p-4">
              <div className="grid gap-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Buscar por assunto ou número"
                    className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                  />
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setPage(1)
                  }}
                  className="h-10 rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="AGUARDANDO_RESPOSTA">Aguardando resposta</option>
                  <option value="RESPONDIDO">Respondido</option>
                  <option value="FINALIZADO">Finalizado</option>
                </select>
              </div>

              {error && (
                <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}
            </div>

            {loading ? (
              <LoadingState />
            ) : tickets.length === 0 ? (
              <EmptyTicketsState />
            ) : (
              <>
                <div className="divide-y divide-white/[0.08]">
                  {tickets.map((ticket) => (
                    <TicketListItem
                      key={ticket.id}
                      ticket={ticket}
                      active={selectedId === ticket.id}
                      onClick={() => {
                        setSelectedId(ticket.id)
                        void loadDetail(ticket.id)
                      }}
                    />
                  ))}
                </div>

                {pagination && (
                  <div className="border-t border-white/[0.08] px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        {pagination.totalItems} ticket{pagination.totalItems !== 1 ? "s" : ""}
                      </p>

                      <p className="text-xs text-slate-600">
                        Página {pagination.page} de {pagination.totalPages}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={!pagination.hasPreviousPage}
                        className="h-8 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Anterior
                      </button>

                      {pageNumbers.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          className={[
                            "h-8 min-w-8 rounded-md px-2 text-xs font-medium transition",
                            pagination.page === pageNumber
                              ? "bg-white text-slate-950"
                              : "border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                          ].join(" ")}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        onClick={() => setPage((current) => current + 1)}
                        disabled={!pagination.hasNextPage}
                        className="h-8 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>

          <main className="min-w-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
            {detailLoading ? (
              <LoadingState large />
            ) : !detail ? (
              <div className="flex min-h-[520px] items-center justify-center px-6 py-16 text-center">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500">
                    <Inbox className="h-5 w-5" />
                  </div>

                  <p className="mt-4 text-sm font-medium text-slate-300">
                    Selecione um ticket
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    A conversa e os detalhes do atendimento aparecerão aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[640px] flex-col">
                <TicketDetailHeader
                  detail={detail}
                  onFinalize={() => void finalizeTicket()}
                />

                <div className="flex-1 space-y-4 overflow-y-auto bg-[#080b10] px-5 py-5">
                  {detail.messages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>

                {detail.status === "FINALIZADO" ? (
                  <div className="border-t border-white/[0.08] bg-[#0c1017] px-5 py-4">
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-slate-400">
                      Este ticket foi finalizado e não aceita novas respostas.
                    </div>
                  </div>
                ) : (
                  <ReplyForm
                    value={replyContent}
                    onChange={setReplyContent}
                    attachments={replyAttachments}
                    uploading={uploadingReply}
                    replying={replying}
                    onUpload={(files) => void handleUpload(files, "reply")}
                    onRemoveAttachment={(url) =>
                      setReplyAttachments((current) => current.filter((item) => item.url !== url))
                    }
                    onSubmit={handleReply}
                  />
                )}
              </div>
            )}
          </main>
        </div>

        {showCreate && (
          <CreateTicketModal
            subject={subject}
            setSubject={setSubject}
            departmentId={departmentId}
            setDepartmentId={setDepartmentId}
            content={content}
            setContent={setContent}
            departments={departments}
            attachments={createAttachments}
            uploading={uploadingCreate}
            creating={creating}
            onUpload={(files) => void handleUpload(files, "create")}
            onRemoveAttachment={(url) =>
              setCreateAttachments((current) => current.filter((item) => item.url !== url))
            }
            onClose={() => setShowCreate(false)}
            onSubmit={handleCreate}
          />
        )}
      </div>
    </div>
  )
}

function TicketListItem({
  ticket,
  active,
  onClick,
}: {
  ticket: TicketSummary
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "block w-full px-4 py-4 text-left transition",
        active ? "bg-white/[0.05]" : "hover:bg-white/[0.025]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-slate-500">
              {ticket.ticketNumber}
            </p>

            {active && (
              <span className="rounded-sm bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                Selecionado
              </span>
            )}
          </div>

          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">
            {ticket.subject}
          </p>
        </div>

        <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium ${statusTone(ticket.status)}`}>
          {statusLabel(ticket.status)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        <span>{ticket.department.name}</span>
        <span>{ticket.messageCount} mensagem{ticket.messageCount !== 1 ? "s" : ""}</span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
        <CalendarDays className="h-3.5 w-3.5" />
        {formatDate(ticket.lastMessageAt)}
      </div>
    </button>
  )
}

function TicketDetailHeader({
  detail,
  onFinalize,
}: {
  detail: TicketDetail
  onFinalize: () => void
}) {
  return (
    <header className="border-b border-white/[0.08] bg-[#0c1017] px-5 py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-400">
              {detail.ticketNumber}
            </span>

            <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${statusTone(detail.status)}`}>
              {statusLabel(detail.status)}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white md:text-2xl">
            {detail.subject}
          </h2>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            <span>{detail.department.name}</span>
            <span>Criado em {formatDate(detail.createdAt)}</span>
            <span>Última atividade {formatDate(detail.lastMessageAt)}</span>
          </div>
        </div>

        {detail.status !== "FINALIZADO" && (
          <button
            onClick={onFinalize}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            Finalizar
          </button>
        )}
      </div>
    </header>
  )
}

function MessageCard({
  message,
}: {
  message: TicketDetail["messages"][number]
}) {
  const isStaff = message.authorType === "STAFF"

  return (
    <article className={["flex gap-3", isStaff ? "justify-start" : "justify-end"].join(" ")}>
      {isStaff && (
        <AvatarInitials name={message.author.name} tone="staff" />
      )}

      <div className={["max-w-[760px]", isStaff ? "mr-auto" : "ml-auto"].join(" ")}>
        <div
          className={[
            "rounded-lg border px-4 py-3",
            isStaff
              ? "border-white/[0.08] bg-[#0c1017]"
              : "border-sky-500/20 bg-sky-500/10",
          ].join(" ")}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">
              {authorLabel(message.authorType)}
            </p>

            <span className="text-xs text-slate-600">
              {formatDate(message.createdAt)}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {message.content}
          </p>

          {message.attachments.length > 0 && (
            <AttachmentGrid
              attachments={message.attachments.map((attachment) => ({
                url: attachment.fileUrl,
                fileName: attachment.fileName,
              }))}
            />
          )}
        </div>
      </div>

      {!isStaff && (
        <AvatarInitials name={message.author.name} tone="student" />
      )}
    </article>
  )
}

function ReplyForm({
  value,
  onChange,
  attachments,
  uploading,
  replying,
  onUpload,
  onRemoveAttachment,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  attachments: TicketUploadedImage[]
  uploading: boolean
  replying: boolean
  onUpload: (files: FileList | null) => void
  onRemoveAttachment: (url: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="border-t border-white/[0.08] bg-[#0c1017] px-5 py-5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Responder ticket
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Continue a conversa com a equipe de suporte.
          </p>
        </div>

        <UploadButton
          loading={uploading}
          label="Anexar imagem"
          onUpload={onUpload}
        />
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[120px] w-full resize-y rounded-md border border-white/[0.1] bg-[#080b10] px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
        placeholder="Escreva sua resposta..."
      />

      {attachments.length > 0 && (
        <AttachmentEditor
          attachments={attachments}
          onRemove={onRemoveAttachment}
        />
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={replying || uploading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Publicar resposta
        </button>
      </div>
    </form>
  )
}

function CreateTicketModal({
  subject,
  setSubject,
  departmentId,
  setDepartmentId,
  content,
  setContent,
  departments,
  attachments,
  uploading,
  creating,
  onUpload,
  onRemoveAttachment,
  onClose,
  onSubmit,
}: {
  subject: string
  setSubject: (value: string) => void
  departmentId: string
  setDepartmentId: (value: string) => void
  content: string
  setContent: (value: string) => void
  departments: DepartmentOption[]
  attachments: TicketUploadedImage[]
  uploading: boolean
  creating: boolean
  onUpload: (files: FileList | null) => void
  onRemoveAttachment: (url: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.1] bg-[#0c1017] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] bg-[#111722] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Novo ticket
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Informe o departamento e descreva sua solicitação com clareza.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-md border border-white/[0.1] p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[calc(92vh-82px)] space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <Field label="Assunto">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                required
              />
            </Field>

            <Field label="Departamento">
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                required
              >
                <option value="">Selecione</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Mensagem inicial">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[170px] w-full resize-y rounded-md border border-white/[0.1] bg-[#080b10] px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
              placeholder="Explique sua dúvida ou problema com o máximo de detalhes."
              required
            />
          </Field>

          <div className="rounded-md border border-white/[0.08] bg-white/[0.025] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500">
                  <HeadphonesIcon className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Anexos do ticket
                  </p>

                  <p className="text-xs text-slate-500">
                    Envie até 5 imagens para ajudar no atendimento.
                  </p>
                </div>
              </div>

              <UploadButton
                loading={uploading}
                label="Adicionar imagem"
                onUpload={onUpload}
              />
            </div>

            {attachments.length > 0 && (
              <AttachmentEditor
                attachments={attachments}
                onRemove={onRemoveAttachment}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.08] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={creating || uploading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Abrir ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SummaryBox({
  label,
  value,
  description,
}: {
  label: string
  value: number | string
  description: string
}) {
  return (
    <div className="bg-[#0c1017] px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}

function AvatarInitials({
  name,
  tone,
}: {
  name: string
  tone: "staff" | "student"
}) {
  return (
    <div
      className={[
        "hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xs font-semibold sm:flex",
        tone === "staff"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-sky-500/20 bg-sky-500/10 text-sky-300",
      ].join(" ")}
    >
      {getInitials(name)}
    </div>
  )
}

function UploadButton({
  loading,
  label,
  onUpload,
}: {
  loading: boolean
  label: string
  onUpload: (files: FileList | null) => void
}) {
  return (
    <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
      <ImagePlus className="h-4 w-4" />
      {loading ? "Enviando..." : label}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onUpload(event.target.files)}
      />
    </label>
  )
}

function AttachmentGrid({
  attachments,
}: {
  attachments: Array<{
    url: string
    fileName: string
  }>
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.url}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="group relative h-[68px] w-[68px] overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.03]"
          title={attachment.fileName}
        >
          <img
            src={attachment.url}
            alt={attachment.fileName}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />

          <span className="absolute bottom-1 right-1 rounded bg-black/70 p-1 text-white">
            <Paperclip className="h-3 w-3" />
          </span>
        </a>
      ))}
    </div>
  )
}

function AttachmentEditor({
  attachments,
  onRemove,
}: {
  attachments: TicketUploadedImage[]
  onRemove: (url: string) => void
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <button
          key={attachment.url}
          type="button"
          onClick={() => onRemove(attachment.url)}
          className="group relative h-[68px] w-[68px] overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.03]"
          title="Remover imagem"
        >
          <img
            src={attachment.url}
            alt={attachment.fileName}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />

          <span className="absolute inset-0 hidden items-center justify-center bg-black/60 text-white group-hover:flex">
            <X className="h-4 w-4" />
          </span>
        </button>
      ))}
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
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>

      {children}
    </div>
  )
}

function LoadingState({ large = false }: { large?: boolean }) {
  return (
    <div className={["flex justify-center", large ? "py-28" : "py-16"].join(" ")}>
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  )
}

function EmptyTicketsState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-300">
        Nenhum ticket encontrado
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Abra um novo ticket ou ajuste os filtros de busca.
      </p>
    </div>
  )
}