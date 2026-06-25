"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Lock, Pencil, Pin, Plus, Save, Trash2, X } from "lucide-react"
import { getCommunityFirstName } from "@/lib/community"

type ForumStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

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

const EMPTY_FORUM: ForumDraft = {
  name: "",
  description: "",
  order: "0",
  status: "ACTIVE",
  topicApprovalRequired: false,
  replyApprovalRequired: false,
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

  const activeCount = useMemo(
    () => forums.filter((forum) => forum.status === "ACTIVE").length,
    [forums]
  )

  async function load() {
    setLoading(true)
    const response = await fetch("/api/admin/comunidade/forums", { cache: "no-store" })
    const data = await response.json().catch(() => [])
    if (response.ok) {
      setForums(data)
    }

    const moderationResponse = await fetch("/api/admin/comunidade/topicos?status=PENDING", {
      cache: "no-store",
    })
    const moderationData = await moderationResponse.json().catch(() => [])
    if (moderationResponse.ok) {
      setPendingTopics(moderationData)
    }

    const pendingPostsResponse = await fetch("/api/admin/comunidade/posts?status=PENDING", {
      cache: "no-store",
    })
    const pendingPostsData = await pendingPostsResponse.json().catch(() => [])
    if (pendingPostsResponse.ok) {
      setPendingPosts(pendingPostsData)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
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
  }

  async function saveForum(event: React.FormEvent) {
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
      window.alert(data?.error ?? "Nao foi possivel salvar o forum.")
      return
    }

    resetForm()
    await load()
  }

  async function deleteForum(id: string) {
    if (!window.confirm("Excluir este forum? Quando houver topicos, tudo sera removido junto.")) {
      return
    }

    setDeletingId(id)
    const response = await fetch(`/api/admin/comunidade/forums/${id}`, { method: "DELETE" })
    setDeletingId(null)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Nao foi possivel excluir o forum.")
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
      window.alert(data?.error ?? "Nao foi possivel processar o topico.")
      return
    }

    await load()
  }

  async function moderatePost(
    id: string,
    action: "approve" | "reject" | "delete"
  ) {
    setModeratingId(id)
    const response = await fetch(`/api/admin/comunidade/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setModeratingId(null)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      window.alert(data?.error ?? "Nao foi possivel processar a resposta.")
      return
    }

    await load()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunidade</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Estruture os foruns da comunidade, configure aprovacao e prepare o ambiente para os topicos dos alunos.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
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
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <span className="inline-flex items-center gap-2">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Fechar formulario" : "Novo forum"}
            </span>
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">Foruns</p>
          <p className="mt-3 text-3xl font-semibold">{forums.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Estruturas criadas para a comunidade.</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Ativos</p>
          <p className="mt-3 text-3xl font-semibold">{activeCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">Visiveis para a area publica.</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">Topicos</p>
          <p className="mt-3 text-3xl font-semibold">
            {forums.reduce((sum, forum) => sum + forum._count.topics, 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Contagem total atual dos foruns.</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Cadastro do forum</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O slug e gerado automaticamente a partir do nome.
            </p>
          </div>

          {showForm ? (
            <form onSubmit={saveForum} className="space-y-4">
              <Field label="Nome do forum">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </Field>

              <Field label="Descricao">
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ordem">
                  <input
                    value={draft.order}
                    onChange={(event) => setDraft((current) => ({ ...current, order: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ForumStatus }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </Field>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
                <input
                  type="checkbox"
                  checked={draft.topicApprovalRequired}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, topicApprovalRequired: event.target.checked }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium">Exigir aprovacao de topicos</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Novos topicos so aparecem publicamente depois da moderacao.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
                <input
                  type="checkbox"
                  checked={draft.replyApprovalRequired}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, replyApprovalRequired: event.target.checked }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="text-sm font-medium">Exigir aprovacao de respostas</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Respostas de alunos aguardam moderacao antes de serem exibidas.
                  </p>
                </div>
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingId ? "Salvar forum" : "Criar forum"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Abra o formulario para criar o primeiro forum da comunidade.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Foruns cadastrados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta e a base estrutural da comunidade. Os topicos vao nascer dentro desses foruns.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : forums.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
              Nenhum forum criado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {forums.map((forum) => (
                <article key={forum.id} className="rounded-2xl border border-border bg-background/35 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{forum.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] ${
                            forum.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : forum.status === "INACTIVE"
                                ? "bg-zinc-500/15 text-zinc-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {forum.status === "ACTIVE"
                            ? "Ativo"
                            : forum.status === "INACTIVE"
                              ? "Inativo"
                              : "Arquivado"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-cyan-300/80">/{forum.slug}</p>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {forum.description || "Sem descricao cadastrada ainda."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          Ordem {forum.order}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          {forum._count.topics} topico{forum._count.topics !== 1 ? "s" : ""}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          Topicos {forum.topicApprovalRequired ? "com aprovacao" : "livres"}
                        </span>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          Respostas {forum.replyApprovalRequired ? "com aprovacao" : "livres"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => startEdit(forum)}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => deleteForum(forum.id)}
                        disabled={deletingId === forum.id}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === forum.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Fila de moderacao</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Topicos aguardando aprovacao antes de aparecerem para os alunos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingTopics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
            Nenhum topico pendente no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTopics.map((topic) => (
              <article key={topic.id} className="rounded-2xl border border-border bg-background/35 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{topic.title}</h3>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-300">
                        Pendente
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Forum: <span className="text-foreground">{topic.forum.name}</span>
                      <span className="px-2 text-muted-foreground/50">/</span>
                      Autor: <span className="text-foreground">{getCommunityFirstName(topic.author.name)}</span>
                      <span className="px-2 text-muted-foreground/50">/</span>
                      {topic.author.email}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Enviado em {new Date(topic.createdAt).toLocaleString("pt-BR")}
                    </p>

                    <div
                      className="prose prose-sm prose-invert mt-4 max-w-none prose-headings:text-white prose-a:text-cyan-300 prose-strong:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-blockquote:border-cyan-500/30 prose-blockquote:text-slate-400"
                      dangerouslySetInnerHTML={{ __html: topic.content }}
                    />
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => moderateTopic(topic.id, "approve")}
                      disabled={moderatingId === topic.id}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => moderateTopic(topic.id, "reject")}
                      disabled={moderatingId === topic.id}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Rejeitar
                    </button>
                    <button
                      onClick={() => moderateTopic(topic.id, "togglePin")}
                      disabled={moderatingId === topic.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
                    >
                      <Pin className="h-4 w-4" />
                      {topic.isPinned ? "Desafixar" : "Fixar"}
                    </button>
                    <button
                      onClick={() => moderateTopic(topic.id, "toggleLock")}
                      disabled={moderatingId === topic.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
                    >
                      <Lock className="h-4 w-4" />
                      {topic.isLocked ? "Destrancar" : "Trancar"}
                    </button>
                    <button
                      onClick={() => moderateTopic(topic.id, "delete")}
                      disabled={moderatingId === topic.id}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold">Respostas pendentes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Respostas aguardando aprovacao antes de aparecerem dentro dos topicos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
            Nenhuma resposta pendente no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPosts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-border bg-background/35 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{post.topic.title}</h3>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] text-amber-300">
                        Resposta pendente
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      Forum: <span className="text-foreground">{post.topic.forum.name}</span>
                      <span className="px-2 text-muted-foreground/50">/</span>
                      Autor: <span className="text-foreground">{getCommunityFirstName(post.author.name)}</span>
                      <span className="px-2 text-muted-foreground/50">/</span>
                      {post.author.email}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Enviado em {new Date(post.createdAt).toLocaleString("pt-BR")}
                    </p>

                    <div
                      className="prose prose-sm prose-invert mt-4 max-w-none prose-headings:text-white prose-a:text-cyan-300 prose-strong:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-blockquote:border-cyan-500/30 prose-blockquote:text-slate-400"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => moderatePost(post.id, "approve")}
                      disabled={moderatingId === post.id}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => moderatePost(post.id, "reject")}
                      disabled={moderatingId === post.id}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Rejeitar
                    </button>
                    <button
                      onClick={() => moderatePost(post.id, "delete")}
                      disabled={moderatingId === post.id}
                      className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
