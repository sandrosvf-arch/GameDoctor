"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import {
  Ban,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Eye,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserRound,
} from "lucide-react"
import { formatCommunityDate, getCommunityFirstName, getCommunityInitials } from "@/lib/community"
import { uploadCommunityImage, type CommunityUploadedImage } from "@/lib/community-image-upload"

interface ActiveBanMeta {
  id: string
  reason: string | null
  endsAt: string | null
}

interface TopicAuthor {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  activeBan: ActiveBanMeta | null
}

interface TopicPost {
  id: string
  content: string
  createdAt: string
  attachments: CommunityUploadedImage[]
  author: TopicAuthor
}

interface TopicMeta {
  id: string
  title: string
  content: string
  createdAt: string
  isPinned: boolean
  isLocked: boolean
  viewsCount: number
  repliesCount: number
  forumName: string
  forumSlug: string
  author: TopicAuthor
  replyApprovalRequired: boolean
  attachments: CommunityUploadedImage[]
}

export function CommunityTopicClient({
  topic,
  initialPosts,
  canReply,
  canViewReplies,
  requiresPlan,
  banMessage,
  isAdminUser,
  topicSlug,
}: {
  topic: TopicMeta
  initialPosts: TopicPost[]
  canReply: boolean
  canViewReplies: boolean
  requiresPlan: boolean
  banMessage?: string | null
  isAdminUser: boolean
  topicSlug: string
}) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [replyCount, setReplyCount] = useState(topic.repliesCount)
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<CommunityUploadedImage[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [adminActionId, setAdminActionId] = useState<string | null>(null)

  async function sendReply(event: React.FormEvent) {
    event.preventDefault()

    setError(null)
    setInfo(null)
    setSaving(true)

    const response = await fetch(`/api/comunidade/topicos/${topicSlug}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, attachments }),
    })

    setSaving(false)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Nao foi possivel publicar a resposta.")
      return
    }

    setContent("")
    setAttachments([])

    if (data?.pending) {
      setInfo(data.message ?? "Resposta enviada para aprovacao.")
      return
    }

    setPosts((current) => [
      ...current,
      {
        id: data.post.id,
        content: data.post.content,
        createdAt: data.post.createdAt,
        attachments: Array.isArray(data.post.attachments)
          ? data.post.attachments.map((attachment: {
              id?: string
              fileName: string
              fileUrl?: string
              url?: string
              mimeType?: string | null
              sizeBytes?: number | null
            }) => ({
              id: attachment.id,
              url: attachment.url ?? attachment.fileUrl ?? "",
              fileName: attachment.fileName,
              mimeType: attachment.mimeType ?? "image/jpeg",
              sizeBytes: attachment.sizeBytes ?? 0,
            }))
          : [],
        author: {
          id: data.post.author.id,
          name: data.post.author.name,
          email: null,
          avatarUrl: data.post.author.avatarUrl,
          activeBan: null,
        },
      },
    ])
    setReplyCount((current) => current + 1)
    setInfo("Resposta publicada com sucesso.")
  }

  async function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    setError(null)
    setUploading(true)

    try {
      const nextUploads: CommunityUploadedImage[] = []
      for (const file of files.slice(0, Math.max(0, 6 - attachments.length))) {
        nextUploads.push(await uploadCommunityImage(file))
      }
      setAttachments((current) => [...current, ...nextUploads].slice(0, 6))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nao foi possivel enviar o anexo.")
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  async function toggleBanUser(author: TopicAuthor) {
    const authorLabel = author.email
      ? `${getCommunityFirstName(author.name)} (${author.email})`
      : getCommunityFirstName(author.name)

    if (author.activeBan) {
      if (!window.confirm(`Remover o banimento da comunidade de ${authorLabel}?`)) {
        return
      }

      setAdminActionId(`ban:${author.id}`)

      const response = await fetch(`/api/admin/comunidade/bans/${author.id}`, {
        method: "DELETE",
      })

      setAdminActionId(null)

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        window.alert(data?.error ?? "Nao foi possivel remover o banimento.")
        return
      }

      router.refresh()
      return
    }

    const reason = window.prompt(`Motivo do banimento para ${authorLabel}:`)
    if (reason === null) return

    const durationInput = window.prompt("Duracao em dias? Deixe vazio para permanente.", "")
    const durationDays = durationInput?.trim() ? Number(durationInput) : null

    setAdminActionId(`ban:${author.id}`)

    const response = await fetch("/api/admin/comunidade/bans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: author.id,
        reason,
        durationDays,
      }),
    })

    setAdminActionId(null)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel banir este usuario.")
      return
    }

    router.refresh()
  }

  async function deleteTopic() {
    if (!window.confirm("Apagar este topico inteiro? Essa acao remove a publicação principal e todas as respostas.")) {
      return
    }

    setAdminActionId(`topic:${topic.id}`)

    const response = await fetch(`/api/admin/comunidade/topicos/${topic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete" }),
    })

    setAdminActionId(null)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel apagar este topico.")
      return
    }

    router.push(`/comunidade/${topic.forumSlug}`)
    router.refresh()
  }

  async function deleteReply(postId: string) {
    if (!window.confirm("Apagar esta resposta da comunidade?")) {
      return
    }

    setAdminActionId(`post:${postId}`)

    const response = await fetch(`/api/admin/comunidade/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete" }),
    })

    setAdminActionId(null)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      window.alert(data?.error ?? "Nao foi possivel apagar esta resposta.")
      return
    }

    setPosts((current) => current.filter((post) => post.id !== postId))
    setReplyCount((current) => Math.max(0, current - 1))
  }

  const views = topic.viewsCount + 1
  const replies = replyCount

  return (
    <div className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="border-b border-white/[0.08] bg-[#0f141d] px-5 py-5">
          <Link
            href={`/comunidade/${topic.forumSlug}`}
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para {topic.forumName}
          </Link>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-400">
                  discussão da comunidade
                </span>

                {topic.isPinned && (
                  <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                    Fixada
                  </span>
                )}

                {topic.isLocked && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Encerrada
                  </span>
                )}
              </div>

              <h1 className="max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                {topic.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <MetaItem icon={UserRound} label={getCommunityFirstName(topic.author.name)} />
                <MetaItem icon={CalendarDays} label={formatCommunityDate(topic.createdAt)} />
                <MetaItem icon={MessageSquareText} label={plural(replies, "resposta", "respostas")} />
                <MetaItem icon={Eye} label={plural(views, "visualização", "visualizações")} />
              </div>
            </div>

            {topic.replyApprovalRequired && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Respostas moderadas
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <CommunityPostCard
        author={topic.author}
        authorRole="Autor da discussão"
        createdAt={topic.createdAt}
        content={topic.content}
        attachments={topic.attachments}
        highlight
        isAdminUser={isAdminUser}
        actionBusy={adminActionId === `topic:${topic.id}` || adminActionId === `ban:${topic.author.id}`}
        onDelete={deleteTopic}
        onToggleBan={() => toggleBanUser(topic.author)}
      />

      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] bg-white/[0.025] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Respostas da comunidade</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe os complementos, diagnósticose soluções compartilhadas.
            </p>
          </div>

          <span className="text-sm text-slate-500">{plural(replies, "resposta", "respostas")}</span>
        </div>

        {!canViewReplies ? (
          <div className="px-6 py-8">
            <PlanRequiredCard
              title="Respostas exclusivas para assinantes"
              description="Ative um plano para liberar as respostas técnicas, acompanhar os diagnósticos completos e participar da conversa da comunidade."
              ctaLabel="Quero ver os planos"
            />
          </div>
        ) : posts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhuma resposta publicada ainda.</p>
            <p className="mt-1 text-sm text-slate-500">Seja o primeiro a contribuir com essa discussão.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.08]">
            {posts.map((post) => (
              <div key={post.id} className="p-5">
                <CommunityPostCard
                  author={post.author}
                  authorRole="Membro da comunidade"
                  createdAt={post.createdAt}
                  content={post.content}
                  attachments={post.attachments}
                  compact
                  isAdminUser={isAdminUser}
                  actionBusy={adminActionId === `post:${post.id}` || adminActionId === `ban:${post.author.id}`}
                  onDelete={() => deleteReply(post.id)}
                  onToggleBan={() => toggleBanUser(post.author)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="border-b border-white/[0.08] bg-white/[0.025] px-5 py-4">
          <h2 className="text-base font-semibold text-white">Participar da discussão</h2>
          <p className="mt-1 text-sm text-slate-500">
            Compartilhe seu diagnostico, teste realizado ou complemento para ajudar a comunidade.
          </p>
        </div>

        <div className="p-5">
          {!canReply ? (
            requiresPlan ? (
              <PlanRequiredCard
                title="Participe da comunidade com um plano ativo"
                description="Assine para responder tópicos, trocar experiências com outros alunos e acessar todo o histórico das respostas."
                ctaLabel="Ver planos de assinatura"
              />
            ) : (
              <div className="rounded-md border border-dashed border-white/[0.12] px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-300">
                  {banMessage ? "Sua participação está temporariamente bloqueada." : "Entre na sua conta para participar."}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {banMessage ? banMessage : "Apenas membros autenticados podem responder discussões."}
                </p>
              </div>
            )
          ) : topic.isLocked ? (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
              Esta discussão esta encerrada para novas respostas.
            </div>
          ) : (
            <form onSubmit={sendReply} className="space-y-4">
              <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10]">
                <RichTextEditor value={content} onChange={setContent} placeholder="Escreva sua resposta..." />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-300">Anexos</label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Adicionar imagens
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAttachmentChange}
                      disabled={uploading || attachments.length >= 6}
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.url} className="overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10]">
                        <img src={attachment.url} alt={attachment.fileName} className="h-32 w-full object-cover" />
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <p className="truncate text-xs text-slate-400">{attachment.fileName}</p>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((current) => current.filter((item) => item.url !== attachment.url))
                            }
                            className="text-xs text-red-300 transition hover:text-red-200"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {topic.replyApprovalRequired && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    As respostas desta comunidade passam por aprovacao antes da publicação.
                  </span>
                </div>
              )}

              {error && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {info && (
                <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {info}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {saving ? "Enviando..." : "Publicar resposta"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}

function CommunityPostCard({
  author,
  authorRole,
  createdAt,
  content,
  attachments,
  highlight = false,
  compact = false,
  isAdminUser = false,
  actionBusy = false,
  onDelete,
  onToggleBan,
}: {
  author: TopicAuthor
  authorRole: string
  createdAt: string
  content: string
  attachments: CommunityUploadedImage[]
  highlight?: boolean
  compact?: boolean
  isAdminUser?: boolean
  actionBusy?: boolean
  onDelete?: () => void
  onToggleBan?: () => void
}) {
  const isBanned = Boolean(author.activeBan)

  return (
    <article
      className={[
        "overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]",
        highlight ? "border-white/[0.12]" : "",
        compact ? "bg-[#0a0e14]" : "",
      ].join(" ")}
    >
      <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="border-b border-white/[0.08] bg-white/[0.025] p-4 md:border-b-0 md:border-r md:border-white/[0.08]">
          <div className="flex items-center gap-3 md:block md:text-center">
            <Avatar className="h-11 w-11 border border-white/[0.1] md:mx-auto md:h-14 md:w-14">
              <AvatarImage src={author.avatarUrl ?? ""} />
              <AvatarFallback className="bg-white/[0.06] text-sm font-semibold text-slate-200">
                {getCommunityInitials(author.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 md:mt-3">
              <p className="truncate text-sm font-semibold text-white">{getCommunityFirstName(author.name)}</p>
              <p className="mt-0.5 text-xs text-slate-500">{authorRole}</p>
              {isAdminUser && author.email && (
                <p className="mt-1 break-all text-[11px] text-slate-500">{author.email}</p>
              )}
              {isBanned && (
                <p className="mt-2 text-[11px] font-medium text-amber-300">Banido da comunidade</p>
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3">
            <MetaItem icon={CalendarDays} label={formatCommunityDate(createdAt)} />

            <div className="flex flex-wrap items-center gap-2">
              {highlight && (
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-400">
                  Publicação principal
                </span>
              )}

              {isAdminUser && (
                <details className="group relative">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]">
                    {actionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
                    Ações
                    <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                  </summary>

                  <div className="absolute right-0 top-full z-20 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0e14] p-1 shadow-2xl shadow-black/40">
                    <button
                      type="button"
                      onClick={onToggleBan}
                      disabled={actionBusy}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBanned ? <ShieldOff className="h-4 w-4 text-emerald-300" /> : <Ban className="h-4 w-4 text-amber-300" />}
                      {isBanned ? "Desbanir usuario" : "Banir usuario"}
                    </button>

                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={actionBusy}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Apagar publicação
                    </button>
                  </div>
                </details>
              )}
            </div>
          </div>

          <div className="px-5 py-5">
            <div
              className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-sky-300 prose-strong:text-white prose-p:leading-7 prose-p:text-slate-300 prose-li:text-slate-300 prose-blockquote:border-slate-600 prose-blockquote:text-slate-400"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {attachments.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id ?? attachment.url}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-[60px] w-[60px] overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10] transition hover:border-white/[0.16]"
                  >
                    <img src={attachment.url} alt={attachment.fileName} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function MetaItem({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
      <Icon className="h-4 w-4 text-slate-600" />
      {label}
    </span>
  )
}

function plural(value: number, singular: string, pluralText: string) {
  return `${value} ${value === 1 ? singular : pluralText}`
}

function PlanRequiredCard({
  title,
  description,
  ctaLabel,
}: {
  title: string
  description: string
  ctaLabel: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(8,11,16,0.96)_48%,rgba(8,11,16,1))]">
      <div className="flex flex-col gap-5 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300">Acesso premium</p>
          <h3 className="mt-3 text-xl font-semibold text-white md:text-2xl">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-3">
          <Link
            href="/planos"
            className="inline-flex h-11 items-center justify-center rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {ctaLabel}
          </Link>
          <p className="text-center text-xs text-slate-400">Desbloqueie a comunidade completa</p>
        </div>
      </div>
    </div>
  )
}
