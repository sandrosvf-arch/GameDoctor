"use client"

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"
import {
  Ban,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  History,
  Layers3,
  Loader2,
  Lock,
  Pencil,
  Pin,
  Plus,
  Save,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react"
import { formatCommunityDate, getCommunityFirstName } from "@/lib/community"

type ForumStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
type AdminSection = "moderation" | "spaces" | "audit"
type ModerationTab = "all" | "topics" | "posts"

type ModerationActionType =
  | "APPROVE_TOPIC"
  | "REJECT_TOPIC"
  | "APPROVE_POST"
  | "REJECT_POST"
  | "PIN_TOPIC"
  | "UNPIN_TOPIC"
  | "LOCK_TOPIC"
  | "UNLOCK_TOPIC"
  | "DELETE_TOPIC"
  | "DELETE_POST"
  | "BAN_USER"
  | "UNBAN_USER"

interface CommunityForumItem {
  id: string
  name: string
  slug: string
  description: string | null
  order: number
  status: ForumStatus
  topicApprovalRequired: boolean
  replyApprovalRequired: boolean
  _count: {
    topics: number
  }
}

interface PendingTopicItem {
  id: string
  title: string
  slug: string
  content: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"
  createdAt: string
  isPinned: boolean
  isLocked: boolean
  forum: {
    id: string
    name: string
    slug: string
  }
  author: {
    id: string
    name: string
    email: string
    communityBans: Array<{
      id: string
      reason: string | null
      endsAt: string | null
      status: "ACTIVE"
    }>
  }
}

interface PendingPostItem {
  id: string
  content: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"
  createdAt: string
  topic: {
    id: string
    title: string
    slug: string
    forumId: string
    forum: {
      id: string
      name: string
      slug: string
    }
  }
  author: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    communityBans: Array<{
      id: string
      reason: string | null
      endsAt: string | null
      status: "ACTIVE"
    }>
  }
}

interface ForumDraft {
  name: string
  description: string
  order: string
  status: ForumStatus
  topicApprovalRequired: boolean
  replyApprovalRequired: boolean
}

interface AuditItem {
  id: string
  actionType: ModerationActionType
  reason: string | null
  createdAt: string
  moderator: {
    id: string
    name: string | null
    email: string
  }
  targetUser: {
    id: string
    name: string | null
    email: string
  } | null
  forum: {
    id: string
    name: string
    slug: string
  } | null
  topic: {
    id: string
    title: string
    slug: string
  } | null
  post: {
    id: string
    createdAt: string
  } | null
}

interface AuditResponse {
  items: AuditItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const EMPTY_FORUM: ForumDraft = {
  name: "",
  description: "",
  order: "0",
  status: "ACTIVE",
  topicApprovalRequired: false,
  replyApprovalRequired: false,
}

const ACTION_LABELS: Record<ModerationActionType, string> = {
  APPROVE_TOPIC: "Discussão aprovada",
  REJECT_TOPIC: "Discussão rejeitada",
  APPROVE_POST: "Resposta aprovada",
  REJECT_POST: "Resposta rejeitada",
  PIN_TOPIC: "Discussão fixada",
  UNPIN_TOPIC: "Discussão desafixada",
  LOCK_TOPIC: "Discussão encerrada",
  UNLOCK_TOPIC: "Discussão reaberta",
  DELETE_TOPIC: "Discussão removida",
  DELETE_POST: "Resposta removida",
  BAN_USER: "Usuário banido",
  UNBAN_USER: "Usuário desbanido",
}

export default function AdminComunidadePage() {
  const [forums, setForums] = useState<CommunityForumItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<ForumDraft>(EMPTY_FORUM)

  const [pendingTopics, setPendingTopics] = useState<PendingTopicItem[]>([])
  const [pendingPosts, setPendingPosts] = useState<PendingPostItem[]>([])
  const [moderatingId, setModeratingId] = useState<string | null>(null)

  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotalPages, setAuditTotalPages] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditModeratorEmail, setAuditModeratorEmail] = useState("")
  const [auditTargetEmail, setAuditTargetEmail] = useState("")

  const [activeSection, setActiveSection] = useState<AdminSection>("moderation")
  const [moderationTab, setModerationTab] = useState<ModerationTab>("all")
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const activeCount = useMemo(
    () => forums.filter((forum) => forum.status === "ACTIVE").length,
    [forums]
  )

  const totalTopics = useMemo(
    () => forums.reduce((sum, forum) => sum + forum._count.topics, 0),
    [forums]
  )

  const pendingTotal = pendingTopics.length + pendingPosts.length

  async function loadAudit(
    page = 1,
    filters?: {
      moderatorEmail?: string
      targetEmail?: string
    }
  ) {
    setAuditLoading(true)

    const moderatorEmail = filters?.moderatorEmail ?? auditModeratorEmail
    const targetEmail = filters?.targetEmail ?? auditTargetEmail

    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: "12",
    })

    if (moderatorEmail.trim()) {
      searchParams.set("moderatorEmail", moderatorEmail.trim())
    }

    if (targetEmail.trim()) {
      searchParams.set("targetEmail", targetEmail.trim())
    }

    const response = await fetch(`/api/admin/comunidade/auditoria?${searchParams.toString()}`, {
      cache: "no-store",
    })

    const data = (await response.json().catch(() => null)) as AuditResponse | null

    if (response.ok && data) {
      setAuditItems(data.items)
      setAuditPage(data.pagination.page)
      setAuditTotalPages(data.pagination.totalPages)
      setAuditTotal(data.pagination.total)
    }

    setAuditLoading(false)
  }

  async function load() {
    setLoading(true)

    const [forumsResponse, moderationResponse, pendingPostsResponse] = await Promise.all([
      fetch("/api/admin/comunidade/forums", { cache: "no-store" }),
      fetch("/api/admin/comunidade/topicos?status=PENDING", { cache: "no-store" }),
      fetch("/api/admin/comunidade/posts?status=PENDING", { cache: "no-store" }),
    ])

    const forumsData = await forumsResponse.json().catch(() => [])
    const moderationData = await moderationResponse.json().catch(() => [])
    const pendingPostsData = await pendingPostsResponse.json().catch(() => [])

    if (forumsResponse.ok) setForums(forumsData)
    if (moderationResponse.ok) setPendingTopics(moderationData)
    if (pendingPostsResponse.ok) setPendingPosts(pendingPostsData)

    setLoading(false)
    await loadAudit(auditPage)
  }

  useEffect(() => {
    void load()
  }, [])

  function resetForm() {
    setEditingId(null)
    setDraft(EMPTY_FORUM)
    setShowForm(false)
  }

  function startEdit(forum: CommunityForumItem) {
    setEditingId(forum.id)
    setDraft({
      name: forum.name,
      description: forum.description ?? "",
      order: String(forum.order),
      status: forum.status,
      topicApprovalRequired: forum.topicApprovalRequired,
      replyApprovalRequired: forum.replyApprovalRequired,
    })
    setShowForm(true)
    setActiveSection("spaces")
  }

  async function saveForum(event: FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      order: Number(draft.order) || 0,
      status: draft.status,
      topicApprovalRequired: draft.topicApprovalRequired,
      replyApprovalRequired: draft.replyApprovalRequired,
    }

    const response = await fetch(
      editingId ? `/api/admin/comunidade/forums/${editingId}` : "/api/admin/comunidade/forums",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    setSaving(false)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Não foi possível salvar o espaço.")
      return
    }

    resetForm()
    await load()
  }

  async function deleteForum(id: string) {
    if (!window.confirm("Excluir este espaço? Se houver discussões, tudo será removido junto.")) {
      return
    }

    setDeletingId(id)

    const response = await fetch(`/api/admin/comunidade/forums/${id}`, {
      method: "DELETE",
    })

    setDeletingId(null)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Não foi possível excluir o espaço.")
      return
    }

    await load()
  }

  async function moderateTopic(
    id: string,
    action: "approve" | "reject" | "togglePin" | "toggleLock" | "delete"
  ) {
    setModeratingId(id)

    const response = await fetch(`/api/admin/comunidade/topicos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })

    setModeratingId(null)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Não foi possível processar a discussão.")
      return
    }

    setExpandedItem(null)
    await load()
  }

  async function moderatePost(id: string, action: "approve" | "reject" | "delete") {
    setModeratingId(id)

    const response = await fetch(`/api/admin/comunidade/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })

    setModeratingId(null)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Não foi possível processar a resposta.")
      return
    }

    setExpandedItem(null)
    await load()
  }

  async function toggleBanUser(userId: string, currentlyBanned: boolean) {
    if (currentlyBanned) {
      if (!window.confirm("Remover o banimento deste usuário na comunidade?")) return

      setModeratingId(userId)

      const response = await fetch(`/api/admin/comunidade/bans/${userId}`, {
        method: "DELETE",
      })

      setModeratingId(null)

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        window.alert(data?.error ?? "Não foi possível remover o banimento.")
        return
      }

      await load()
      return
    }

    const reason = window.prompt("Motivo do banimento na comunidade:")
    if (reason === null) return

    const durationInput = window.prompt("Duração em dias? Deixe vazio para permanente.", "")
    const durationDays = durationInput?.trim() ? Number(durationInput) : null

    setModeratingId(userId)

    const response = await fetch("/api/admin/comunidade/bans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        reason,
        durationDays,
      }),
    })

    setModeratingId(null)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Não foi possível banir o usuário.")
      return
    }

    await load()
  }

  function getAuditContext(item: AuditItem) {
    if (item.topic) return item.topic.title
    if (item.forum) return item.forum.name
    if (item.targetUser) return getCommunityFirstName(item.targetUser.name ?? item.targetUser.email)
    return "Registro sem contexto"
  }

  function applyAuditFilters(event: FormEvent) {
    event.preventDefault()
    void loadAudit(1)
  }

  return (
    <div className="min-h-screen bg-[#090c11] text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-6 rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="border-b border-white/[0.08] px-5 py-6 md:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
                  Administração
                </div>

                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                  Comunidade
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Gerencie espaços, revise publicações, acompanhe banimentos e mantenha o histórico de moderação organizado.
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveSection("spaces")

                  if (showForm) {
                    resetForm()
                    return
                  }

                  setEditingId(null)
                  setDraft(EMPTY_FORUM)
                  setShowForm(true)
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Fechar cadastro" : "Novo espaço"}
              </button>
            </div>
          </div>

          <div className="grid gap-px bg-white/[0.08] md:grid-cols-4">
            <StatCard label="Pendências" value={pendingTotal} description="Itens aguardando revisão" />
            <StatCard label="Espaços" value={forums.length} description="Áreas criadas na comunidade" />
            <StatCard label="Ativos" value={activeCount} description="Visíveis para os alunos" />
            <StatCard label="Discussões" value={totalTopics} description="Total registrado nos espaços" />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-white/[0.08] bg-[#0c1017] p-2">
            <AdminNavButton
              active={activeSection === "moderation"}
              icon={<ClipboardList className="h-4 w-4" />}
              label="Moderação"
              description={`${pendingTotal} pendência${pendingTotal !== 1 ? "s" : ""}`}
              onClick={() => setActiveSection("moderation")}
            />

            <AdminNavButton
              active={activeSection === "spaces"}
              icon={<Layers3 className="h-4 w-4" />}
              label="Espaços"
              description="Estrutura da comunidade"
              onClick={() => setActiveSection("spaces")}
            />

            <AdminNavButton
              active={activeSection === "audit"}
              icon={<History className="h-4 w-4" />}
              label="Histórico"
              description={`${auditTotal} registro${auditTotal !== 1 ? "s" : ""}`}
              onClick={() => setActiveSection("audit")}
            />
          </aside>

          <main className="min-w-0">
            {activeSection === "moderation" && (
              <section className="space-y-5">
                <PanelHeader
                  title="Pendências de moderação"
                  description="Revise discussões e respostas antes de liberar a exibição para a comunidade."
                  right={
                    <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
                      {pendingTotal} pendente{pendingTotal !== 1 ? "s" : ""}
                    </div>
                  }
                />

                <div className="flex flex-wrap gap-2">
                  <ModerationFilterButton
                    active={moderationTab === "all"}
                    onClick={() => setModerationTab("all")}
                  >
                    Tudo
                  </ModerationFilterButton>

                  <ModerationFilterButton
                    active={moderationTab === "topics"}
                    onClick={() => setModerationTab("topics")}
                  >
                    Discussões {pendingTopics.length}
                  </ModerationFilterButton>

                  <ModerationFilterButton
                    active={moderationTab === "posts"}
                    onClick={() => setModerationTab("posts")}
                  >
                    Respostas {pendingPosts.length}
                  </ModerationFilterButton>
                </div>

                {(moderationTab === "all" || moderationTab === "topics") && (
                  <ModerationPanel
                    title="Discussões aguardando revisão"
                    description="Novas publicações enviadas pelos alunos."
                    count={pendingTopics.length}
                  >
                    {loading ? (
                      <LoadingState />
                    ) : pendingTopics.length === 0 ? (
                      <EmptyState
                        title="Nenhuma discussão pendente"
                        description="Quando uma discussão precisar de aprovação, ela aparecerá aqui."
                      />
                    ) : (
                      <div className="divide-y divide-white/[0.08]">
                        {pendingTopics.map((topic) => {
                          const activeBan = topic.author.communityBans[0] ?? null
                          const itemKey = `topic:${topic.id}`
                          const expanded = expandedItem === itemKey

                          return (
                            <ModerationItem
                              key={topic.id}
                              expanded={expanded}
                              title={topic.title}
                              badge="Discussão pendente"
                              createdAt={topic.createdAt}
                              authorName={topic.author.name}
                              authorEmail={topic.author.email}
                              spaceName={topic.forum.name}
                              preview={createPreview(topic.content)}
                              activeBan={activeBan}
                              onToggle={() => setExpandedItem(expanded ? null : itemKey)}
                              actions={
                                <>
                                  <ActionButton
                                    variant="success"
                                    disabled={moderatingId === topic.id}
                                    onClick={() => moderateTopic(topic.id, "approve")}
                                  >
                                    <Check className="h-4 w-4" />
                                    Aprovar
                                  </ActionButton>

                                  <ActionButton
                                    variant="danger"
                                    disabled={moderatingId === topic.id}
                                    onClick={() => moderateTopic(topic.id, "reject")}
                                  >
                                    <X className="h-4 w-4" />
                                    Rejeitar
                                  </ActionButton>

                                  <ActionButton
                                    disabled={moderatingId === topic.id}
                                    onClick={() => moderateTopic(topic.id, "togglePin")}
                                  >
                                    <Pin className="h-4 w-4" />
                                    {topic.isPinned ? "Desafixar" : "Fixar"}
                                  </ActionButton>

                                  <ActionButton
                                    disabled={moderatingId === topic.id}
                                    onClick={() => moderateTopic(topic.id, "toggleLock")}
                                  >
                                    <Lock className="h-4 w-4" />
                                    {topic.isLocked ? "Reabrir" : "Encerrar"}
                                  </ActionButton>

                                  <ActionButton
                                    variant="danger"
                                    disabled={moderatingId === topic.id}
                                    onClick={() => moderateTopic(topic.id, "delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remover
                                  </ActionButton>

                                  <ActionButton
                                    variant={activeBan ? "success" : "danger"}
                                    disabled={moderatingId === topic.id || moderatingId === topic.author.id}
                                    onClick={() => toggleBanUser(topic.author.id, Boolean(activeBan))}
                                  >
                                    {activeBan ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                    {activeBan ? "Desbanir" : "Banir usuário"}
                                  </ActionButton>
                                </>
                              }
                            >
                              <ContentPreview html={topic.content} />
                            </ModerationItem>
                          )
                        })}
                      </div>
                    )}
                  </ModerationPanel>
                )}

                {(moderationTab === "all" || moderationTab === "posts") && (
                  <ModerationPanel
                    title="Respostas aguardando revisão"
                    description="Comentários enviados dentro das discussões da comunidade."
                    count={pendingPosts.length}
                  >
                    {loading ? (
                      <LoadingState />
                    ) : pendingPosts.length === 0 ? (
                      <EmptyState
                        title="Nenhuma resposta aguardando revisão"
                        description="Quando uma resposta precisar de aprovação, ela aparecerá aqui."
                      />
                    ) : (
                      <div className="divide-y divide-white/[0.08]">
                        {pendingPosts.map((post) => {
                          const activeBan = post.author.communityBans[0] ?? null
                          const itemKey = `post:${post.id}`
                          const expanded = expandedItem === itemKey

                          return (
                            <ModerationItem
                              key={post.id}
                              expanded={expanded}
                              title={post.topic.title}
                              badge="Resposta pendente"
                              createdAt={post.createdAt}
                              authorName={post.author.name}
                              authorEmail={post.author.email}
                              spaceName={post.topic.forum.name}
                              preview={createPreview(post.content)}
                              activeBan={activeBan}
                              onToggle={() => setExpandedItem(expanded ? null : itemKey)}
                              actions={
                                <>
                                  <ActionButton
                                    variant="success"
                                    disabled={moderatingId === post.id}
                                    onClick={() => moderatePost(post.id, "approve")}
                                  >
                                    <Check className="h-4 w-4" />
                                    Aprovar
                                  </ActionButton>

                                  <ActionButton
                                    variant="danger"
                                    disabled={moderatingId === post.id}
                                    onClick={() => moderatePost(post.id, "reject")}
                                  >
                                    <X className="h-4 w-4" />
                                    Rejeitar
                                  </ActionButton>

                                  <ActionButton
                                    variant="danger"
                                    disabled={moderatingId === post.id}
                                    onClick={() => moderatePost(post.id, "delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remover
                                  </ActionButton>

                                  <ActionButton
                                    variant={activeBan ? "success" : "danger"}
                                    disabled={moderatingId === post.id || moderatingId === post.author.id}
                                    onClick={() => toggleBanUser(post.author.id, Boolean(activeBan))}
                                  >
                                    {activeBan ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                    {activeBan ? "Desbanir" : "Banir usuário"}
                                  </ActionButton>
                                </>
                              }
                            >
                              <ContentPreview html={post.content} />
                            </ModerationItem>
                          )
                        })}
                      </div>
                    )}
                  </ModerationPanel>
                )}
              </section>
            )}

            {activeSection === "spaces" && (
              <section className="space-y-5">
                <PanelHeader
                  title="Espaços da comunidade"
                  description="Crie, organize e configure as áreas onde os alunos participam das discussões."
                  right={
                    <button
                      onClick={() => {
                        if (showForm) {
                          resetForm()
                          return
                        }

                        setEditingId(null)
                        setDraft(EMPTY_FORUM)
                        setShowForm(true)
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                    >
                      {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {showForm ? "Fechar" : "Novo espaço"}
                    </button>
                  }
                />

                {showForm && (
                  <section className="rounded-lg border border-white/[0.08] bg-[#0c1017]">
                    <div className="border-b border-white/[0.08] px-5 py-4">
                      <h2 className="text-base font-semibold text-white">
                        {editingId ? "Editar espaço" : "Cadastrar espaço"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        O slug é gerado automaticamente a partir do nome.
                      </p>
                    </div>

                    <form onSubmit={saveForum} className="space-y-4 p-5">
                      <Field label="Nome do espaço">
                        <input
                          value={draft.name}
                          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                          className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                          required
                        />
                      </Field>

                      <Field label="Descrição">
                        <textarea
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, description: event.target.value }))
                          }
                          className="min-h-[110px] w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                        />
                      </Field>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Ordem">
                          <input
                            value={draft.order}
                            onChange={(event) => setDraft((current) => ({ ...current, order: event.target.value }))}
                            className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                          />
                        </Field>

                        <Field label="Status">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, status: event.target.value as ForumStatus }))
                            }
                            className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                          >
                            <option value="ACTIVE">Ativo</option>
                            <option value="INACTIVE">Inativo</option>
                            <option value="ARCHIVED">Arquivado</option>
                          </select>
                        </Field>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.08] bg-white/[0.025] px-4 py-3">
                          <input
                            type="checkbox"
                            checked={draft.topicApprovalRequired}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                topicApprovalRequired: event.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              Exigir aprovação de discussões
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Novas discussões só aparecem publicamente depois da moderação.
                            </p>
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.08] bg-white/[0.025] px-4 py-3">
                          <input
                            type="checkbox"
                            checked={draft.replyApprovalRequired}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                replyApprovalRequired: event.target.checked,
                              }))
                            }
                            className="mt-1 h-4 w-4"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              Exigir aprovação de respostas
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Respostas dos alunos aguardam moderação antes de serem exibidas.
                            </p>
                          </div>
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {editingId ? "Salvar espaço" : "Criar espaço"}
                        </button>

                        <button
                          type="button"
                          onClick={resetForm}
                          className="inline-flex h-10 items-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
                  <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_150px] border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
                    <div>Espaço</div>
                    <div className="text-center">Ordem</div>
                    <div className="text-center">Discussões</div>
                    <div>Ações</div>
                  </div>

                  {loading ? (
                    <LoadingState />
                  ) : forums.length === 0 ? (
                    <EmptyState
                      title="Nenhum espaço criado"
                      description="Crie o primeiro espaço para organizar a comunidade."
                    />
                  ) : (
                    <div className="divide-y divide-white/[0.08]">
                      {forums.map((forum) => (
                        <article
                          key={forum.id}
                          className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_100px_120px_150px] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-white">
                                {forum.name}
                              </h3>
                              <StatusBadge status={forum.status} />
                            </div>

                            <p className="mt-1 text-xs text-slate-600">/{forum.slug}</p>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                              {forum.description || "Sem descrição cadastrada ainda."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <SmallBadge>
                                Discussões {forum.topicApprovalRequired ? "moderadas" : "livres"}
                              </SmallBadge>
                              <SmallBadge>
                                Respostas {forum.replyApprovalRequired ? "moderadas" : "livres"}
                              </SmallBadge>
                            </div>
                          </div>

                          <div className="hidden text-center text-sm font-medium text-slate-300 md:block">
                            {forum.order}
                          </div>

                          <div className="hidden text-center md:block">
                            <div className="text-sm font-semibold text-slate-200">
                              {forum._count.topics}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              discussão{forum._count.topics !== 1 ? "ões" : ""}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <button
                              onClick={() => startEdit(forum)}
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </button>

                            <button
                              onClick={() => deleteForum(forum.id)}
                              disabled={deletingId === forum.id}
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                            >
                              {deletingId === forum.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Excluir
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </section>
            )}

            {activeSection === "audit" && (
              <section className="space-y-5">
                <PanelHeader
                  title="Histórico de moderação"
                  description="Consulte aprovações, rejeições, remoções, bloqueios e banimentos realizados na comunidade."
                  right={
                    <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-400">
                      {auditTotal} registro{auditTotal !== 1 ? "s" : ""}
                    </div>
                  }
                />

                <section className="rounded-lg border border-white/[0.08] bg-[#0c1017] p-5">
                  <form onSubmit={applyAuditFilters} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
                    <Field label="E-mail do moderador">
                      <input
                        value={auditModeratorEmail}
                        onChange={(event) => setAuditModeratorEmail(event.target.value)}
                        placeholder="Ex.: admin@gamedoctor.com"
                        className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </Field>

                    <Field label="E-mail do usuário alvo">
                      <input
                        value={auditTargetEmail}
                        onChange={(event) => setAuditTargetEmail(event.target.value)}
                        placeholder="Ex.: aluno@email.com"
                        className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                      />
                    </Field>

                    <button
                      type="submit"
                      className="h-10 self-end rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      Filtrar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuditModeratorEmail("")
                        setAuditTargetEmail("")
                        void loadAudit(1, { moderatorEmail: "", targetEmail: "" })
                      }}
                      className="h-10 self-end rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                    >
                      Limpar
                    </button>
                  </form>
                </section>

                <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
                  {auditLoading ? (
                    <LoadingState />
                  ) : auditItems.length === 0 ? (
                    <EmptyState
                      title="Nenhuma ação registrada"
                      description="As ações de moderação aparecerão aqui conforme forem executadas."
                    />
                  ) : (
                    <>
                      <div className="divide-y divide-white/[0.08]">
                        {auditItems.map((item) => (
                          <article key={item.id} className="px-5 py-4 transition hover:bg-white/[0.025]">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300">
                                    {ACTION_LABELS[item.actionType]}
                                  </span>

                                  <span className="text-xs text-slate-500">
                                    {formatCommunityDate(item.createdAt)}
                                  </span>
                                </div>

                                <p className="mt-3 truncate text-sm font-medium text-slate-200">
                                  {item.topic ? (
                                    <a
                                      href={`/comunidade/topico/${item.topic.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="transition hover:text-white"
                                    >
                                      {item.topic.title}
                                    </a>
                                  ) : (
                                    getAuditContext(item)
                                  )}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span>
                                    Moderador{" "}
                                    <span className="text-slate-300">
                                      {getCommunityFirstName(item.moderator.name ?? item.moderator.email)}
                                    </span>
                                  </span>

                                  {item.targetUser && (
                                    <span>
                                      Alvo{" "}
                                      <span className="text-slate-300">
                                        {getCommunityFirstName(item.targetUser.name ?? item.targetUser.email)}
                                      </span>
                                    </span>
                                  )}

                                  {item.forum && (
                                    <span>
                                      Espaço <span className="text-slate-300">{item.forum.name}</span>
                                    </span>
                                  )}
                                </div>

                                {item.reason && (
                                  <p className="mt-3 rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-sm text-slate-400">
                                    Motivo: <span className="text-slate-200">{item.reason}</span>
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-slate-500">
                                {item.topic
                                  ? "Discussão"
                                  : item.post
                                    ? "Resposta"
                                    : item.forum
                                      ? "Espaço"
                                      : "Usuário"}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                          Página {auditPage} de {auditTotalPages}
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={() => loadAudit(auditPage - 1)}
                            disabled={auditLoading || auditPage <= 1}
                            className="h-9 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-40"
                          >
                            Anterior
                          </button>

                          <button
                            onClick={() => loadAudit(auditPage + 1)}
                            disabled={auditLoading || auditPage >= auditTotalPages}
                            className="h-9 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-40"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
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

function AdminNavButton({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition",
        active
          ? "bg-white text-slate-950"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          active ? "bg-slate-950/10" : "bg-white/[0.04]",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-semibold">
          {label}
        </span>
        <span className={["block truncate text-xs", active ? "text-slate-600" : "text-slate-600"].join(" ")}>
          {description}
        </span>
      </span>
    </button>
  )
}

function PanelHeader({
  title,
  description,
  right,
}: {
  title: string
  description: string
  right?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0c1017] px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        {right}
      </div>
    </div>
  )
}

function ModerationFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "h-9 rounded-md px-3 text-sm font-medium transition",
        active
          ? "bg-white text-slate-950"
          : "border border-white/[0.1] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function ModerationPanel({
  title,
  description,
  count,
  children,
}: {
  title: string
  description: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
      <div className="flex flex-col gap-2 border-b border-white/[0.08] bg-white/[0.025] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <span className="text-sm text-slate-500">
          {count} item{count !== 1 ? "s" : ""}
        </span>
      </div>

      {children}
    </section>
  )
}

function ModerationItem({
  expanded,
  title,
  badge,
  createdAt,
  authorName,
  authorEmail,
  spaceName,
  preview,
  activeBan,
  actions,
  children,
  onToggle,
}: {
  expanded: boolean
  title: string
  badge: string
  createdAt: string
  authorName: string
  authorEmail: string
  spaceName: string
  preview: string
  activeBan: {
    id: string
    reason: string | null
    endsAt: string | null
    status: "ACTIVE"
  } | null
  actions: ReactNode
  children: ReactNode
  onToggle: () => void
}) {
  return (
    <article className="px-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
              {badge}
            </span>

            <span className="text-xs text-slate-500">
              {formatCommunityDate(createdAt)}
            </span>

            {activeBan && (
              <span className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300">
                Usuário banido
              </span>
            )}
          </div>

          <div className="mt-3 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500">
              <FileText className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <h4 className="line-clamp-1 text-sm font-semibold text-white">
                {title}
              </h4>

              <p className="mt-1 text-xs text-slate-500">
                {spaceName} · {getCommunityFirstName(authorName)} · {authorEmail}
              </p>

              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-400">
                {preview || "Sem prévia disponível."}
              </p>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[430px] xl:justify-end">
          {actions}

          <button
            onClick={onToggle}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            <ChevronDown className={["h-4 w-4 transition", expanded ? "rotate-180" : ""].join(" ")} />
            {expanded ? "Ocultar" : "Revisar"}
          </button>
        </div>
      </div>

      {activeBan && (
        <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Banimento ativo
          {activeBan.endsAt
            ? ` até ${new Date(activeBan.endsAt).toLocaleDateString("pt-BR")}`
            : " por tempo indeterminado"}
          {activeBan.reason ? ` · ${activeBan.reason}` : ""}
        </p>
      )}

      {expanded && (
        <div className="mt-4 rounded-md border border-white/[0.08] bg-[#080b10] p-4">
          {children}
        </div>
      )}
    </article>
  )
}

function ActionButton({
  variant = "neutral",
  disabled,
  onClick,
  children,
}: {
  variant?: "neutral" | "success" | "danger"
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const className =
    variant === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
      : variant === "danger"
        ? "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"
        : "border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

function ContentPreview({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm prose-invert max-w-none prose-headings:text-white prose-a:text-sky-300 prose-strong:text-white prose-p:leading-7 prose-p:text-slate-300 prose-li:text-slate-300 prose-blockquote:border-slate-600 prose-blockquote:text-slate-400"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function StatusBadge({ status }: { status: ForumStatus }) {
  const label =
    status === "ACTIVE"
      ? "Ativo"
      : status === "INACTIVE"
        ? "Inativo"
        : "Arquivado"

  const className =
    status === "ACTIVE"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : status === "INACTIVE"
        ? "border-slate-500/20 bg-slate-500/10 text-slate-400"
        : "border-amber-500/20 bg-amber-500/10 text-amber-300"

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function SmallBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-xs text-slate-500">
      {children}
    </span>
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

function LoadingState() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-300">
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}

function createPreview(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220)
}