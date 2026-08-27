"use client"

import { useState, type ChangeEvent, type ComponentType, type FormEvent } from "react"
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
  Heart,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Reply,
  Send,
  ShieldCheck,
  ShieldOff,
  Sparkles,
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

interface CommunityAuthorStats {
  topicsCount: number
  postsCount: number
  likesReceivedCount: number
  score: number
  badgeLabel: string
}

interface TopicAuthor {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  communityStats: CommunityAuthorStats
  activeBan: ActiveBanMeta | null
}

interface TopicPost {
  id: string
  content: string
  createdAt: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"
  likesCount: number
  viewerLiked: boolean
  parentPost: { id: string; authorName: string } | null
  attachments: CommunityUploadedImage[]
  author: TopicAuthor
}

const DEFAULT_COMMUNITY_STATS: CommunityAuthorStats = {
  topicsCount: 0,
  postsCount: 0,
  likesReceivedCount: 0,
  score: 0,
  badgeLabel: "Novo membro",
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
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null)
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null)

  async function sendReply(event: FormEvent) {
    event.preventDefault()

    setError(null)
    setInfo(null)
    setSaving(true)

    const response = await fetch(`/api/comunidade/topicos/${topicSlug}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, attachments, parentPostId: replyTarget?.id ?? null }),
    })

    setSaving(false)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível publicar a resposta.")
      return
    }

    setContent("")
    setAttachments([])
    setReplyTarget(null)

    if (data?.pending) {
      setInfo(data.message ?? "Resposta enviada para aprovação.")
      return
    }

    setPosts((current) => [
      ...current,
      {
        id: data.post.id,
        content: data.post.content,
        createdAt: data.post.createdAt,
        status: data.post.status ?? "APPROVED",
        likesCount: Number(data.post.likesCount ?? 0),
        viewerLiked: Boolean(data.post.viewerLiked),
        parentPost: data.post.parentPost ?? null,
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
          communityStats: data.post.author.communityStats ?? DEFAULT_COMMUNITY_STATS,
          activeBan: null,
        },
      },
    ])
    setReplyCount((current) => current + 1)
    setInfo("Resposta publicada com sucesso.")
  }

  async function toggleLike(post: TopicPost) {
    if (likeBusyId) return

    setError(null)
    setLikeBusyId(post.id)

    const response = await fetch(`/api/comunidade/posts/${post.id}/likes`, {
      method: post.viewerLiked ? "DELETE" : "POST",
    })

    setLikeBusyId(null)
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível atualizar a curtida.")
      return
    }

    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              likesCount: Number(data?.likesCount ?? item.likesCount),
              viewerLiked: Boolean(data?.liked),
            }
          : item
      )
    )
  }

  function selectReplyTarget(post: TopicPost) {
    setReplyTarget({ id: post.id, authorName: getCommunityFirstName(post.author.name) })
    window.setTimeout(() => {
      document.getElementById("community-reply-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
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
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o anexo.")
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
        window.alert(data?.error ?? "Não foi possível remover o banimento.")
        return
      }

      router.refresh()
      return
    }

    const reason = window.prompt(`Motivo do banimento para ${authorLabel}:`)
    if (reason === null) return

    const durationInput = window.prompt("Duração em dias? Deixe vazio para permanente.", "")
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
      window.alert(data?.error ?? "Não foi possível banir este usuário.")
      return
    }

    router.refresh()
  }

  async function deleteTopic() {
    if (!window.confirm("Apagar este tópico? Essa ação remove a publicação principal e todas as respostas.")) {
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
      window.alert(data?.error ?? "Não foi possível apagar este tópico.")
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
      window.alert(data?.error ?? "Não foi possível apagar esta resposta.")
      return
    }

    setPosts((current) => current.filter((post) => post.id !== postId))
    setReplyCount((current) => Math.max(0, current - 1))
  }

  const views = topic.viewsCount
  const replies = replyCount
  const shouldShowAccessBanner = requiresPlan && !banMessage && (!canViewReplies || !canReply)
  const shouldShowComposer = !requiresPlan || canReply || Boolean(banMessage)

  return (
    <div className="gd-topic-shell">
      <section className="gd-topic-heading">
        <div className="gd-topic-heading__topline">
          <Link href={`/comunidade/${topic.forumSlug}`} className="gd-back-link">
            <ChevronLeft className="gd-icon" />
            Voltar para {topic.forumName}
          </Link>

          {topic.replyApprovalRequired && (
            <span className="gd-status gd-status--warning">
              <ShieldCheck className="gd-status__icon" />
              Respostas moderadas
            </span>
          )}
        </div>

        <div className="gd-topic-heading__content">
          <div className="gd-topic-tags">
            <span className="gd-topic-tag">Tópico da comunidade</span>
            {topic.isPinned && <span className="gd-topic-tag gd-topic-tag--info">Fixada</span>}
            {topic.isLocked && (
              <span className="gd-topic-tag gd-topic-tag--warning">
                <LockKeyhole className="gd-tag-icon" />
                Encerrada
              </span>
            )}
          </div>

          <h1>{topic.title}</h1>

          <div className="gd-meta-row">
            <MetaItem icon={UserRound} label={getCommunityFirstName(topic.author.name)} />
            <MetaItem icon={CalendarDays} label={formatCommunityDate(topic.createdAt)} />
            <MetaItem icon={MessageSquareText} label={plural(replies, "resposta", "respostas")} />
            <MetaItem icon={Eye} label={plural(views, "visualização", "visualizações")} />
          </div>
        </div>
      </section>

      <CommunityPostCard
        author={topic.author}
        authorRole="Autor do tópico"
        createdAt={topic.createdAt}
        content={topic.content}
        attachments={topic.attachments}
        highlight
        isAdminUser={isAdminUser}
        actionBusy={adminActionId === `topic:${topic.id}` || adminActionId === `ban:${topic.author.id}`}
        onDelete={deleteTopic}
        onToggleBan={() => toggleBanUser(topic.author)}
      />

      {shouldShowAccessBanner && (
        <CommunityAccessBanner repliesCount={replies} canViewReplies={canViewReplies} canReply={canReply} />
      )}

      {canViewReplies && (
        <section className="gd-thread-section">
          <header className="gd-thread-section__header">
            <div>
              <h2>Respostas da comunidade</h2>
              <p>Acompanhe complementos, diagnósticos e soluções compartilhadas.</p>
            </div>
            <span>{plural(replies, "resposta", "respostas")}</span>
          </header>

          {posts.length === 0 ? (
            <div className="gd-empty-state">
              <p>Nenhuma resposta publicada ainda.</p>
              <span>Seja o primeiro a contribuir com este tópico.</span>
            </div>
          ) : (
            <div className="gd-replies-list">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  author={post.author}
                  authorRole="Membro da comunidade"
                  createdAt={post.createdAt}
                  content={post.content}
                  attachments={post.attachments}
                  parentPost={post.parentPost}
                  likesCount={post.likesCount}
                  viewerLiked={post.viewerLiked}
                  canInteract={canReply && post.status === "APPROVED"}
                  canReplyAction={canReply && !topic.isLocked && post.status === "APPROVED"}
                  likeBusy={likeBusyId === post.id}
                  onToggleLike={() => toggleLike(post)}
                  onReply={() => selectReplyTarget(post)}
                  compact
                  isAdminUser={isAdminUser}
                  actionBusy={adminActionId === `post:${post.id}` || adminActionId === `ban:${post.author.id}`}
                  onDelete={() => deleteReply(post.id)}
                  onToggleBan={() => toggleBanUser(post.author)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {shouldShowComposer && (
        <section className="gd-composer-card">
          <header className="gd-composer-card__header">
            <div>
              <h2>Participar do tópico</h2>
              <p>Compartilhe seu diagnóstico, teste realizado ou complemento para ajudar a comunidade.</p>
            </div>
          </header>

          <div className="gd-composer-card__body">
            {!canReply ? (
              <ParticipationBlockedNotice banMessage={banMessage} />
            ) : topic.isLocked ? (
              <div className="gd-alert gd-alert--warning">Este tópico está encerrado para novas respostas.</div>
            ) : (
              <form id="community-reply-form" onSubmit={sendReply} className="gd-reply-form">
                {replyTarget && (
                  <div className="gd-reply-target">
                    <span>Respondendo a {replyTarget.authorName}</span>
                    <button type="button" onClick={() => setReplyTarget(null)}>
                      Cancelar
                    </button>
                  </div>
                )}

                <div className="gd-editor-wrap">
                  <RichTextEditor value={content} onChange={setContent} placeholder="Escreva sua resposta..." enableEmojiPicker />
                </div>

                <div className="gd-attachment-toolbar">
                  <div>
                    <strong>Anexos</strong>
                    <span>Até 6 imagens por resposta.</span>
                  </div>

                  <label className="gd-upload-button">
                    {uploading ? <Loader2 className="gd-button-icon gd-spin" /> : <ImagePlus className="gd-button-icon" />}
                    Adicionar imagens
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="gd-hidden-input"
                      onChange={handleAttachmentChange}
                      disabled={uploading || attachments.length >= 6}
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <AttachmentPreviewGrid
                    attachments={attachments}
                    onRemove={(url) => setAttachments((current) => current.filter((item) => item.url !== url))}
                  />
                )}

                {topic.replyApprovalRequired && (
                  <div className="gd-alert gd-alert--warning">
                    <ShieldCheck className="gd-alert__icon" />
                    As respostas desta comunidade passam por aprovação antes da publicação.
                  </div>
                )}

                {error && <div className="gd-alert gd-alert--error">{error}</div>}
                {info && <div className="gd-alert gd-alert--success">{info}</div>}

                <div className="gd-form-actions">
                  <button type="submit" disabled={saving || uploading} className="gd-primary-button">
                    {saving ? <Loader2 className="gd-button-icon gd-spin" /> : <Send className="gd-button-icon" />}
                    {saving ? "Enviando..." : "Publicar resposta"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      <style jsx global>{`
        .gd-topic-shell {
          --gd-bg: #080b10;
          --gd-surface: #0d1118;
          --gd-surface-soft: #101620;
          --gd-surface-raised: #111821;
          --gd-line: rgba(148, 163, 184, 0.14);
          --gd-line-soft: rgba(148, 163, 184, 0.09);
          --gd-text: #f8fafc;
          --gd-muted: #94a3b8;
          --gd-faint: #64748b;
          --gd-accent: #fb923c;
          --gd-accent-soft: rgba(249, 115, 22, 0.11);
          --gd-technical: #22d3ee;
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 0 56px;
          color: var(--gd-text);
        }

        .gd-topic-heading,
        .gd-thread-post,
        .gd-thread-section,
        .gd-composer-card {
          background: linear-gradient(180deg, rgba(15, 21, 31, 0.96), rgba(10, 14, 20, 0.98));
          border: 1px solid var(--gd-line-soft);
          border-radius: 12px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
        }

        .gd-topic-heading {
          overflow: hidden;
          margin-bottom: 18px;
          border-color: rgba(249, 115, 22, 0.18);
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(15, 21, 31, 0.97) 42%, rgba(34, 211, 238, 0.05));
        }

        .gd-topic-heading__topline {
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 22px;
          border-bottom: 1px solid var(--gd-line-soft);
          background: rgba(255, 255, 255, 0.015);
        }

        .gd-back-link,
        .gd-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .gd-back-link {
          color: var(--gd-muted);
          font-size: 13px;
          font-weight: 500;
          transition: color 0.18s ease;
        }

        .gd-back-link:hover {
          color: var(--gd-text);
        }

        .gd-icon,
        .gd-meta-icon,
        .gd-status__icon,
        .gd-tag-icon,
        .gd-button-icon,
        .gd-alert__icon {
          width: 16px;
          height: 16px;
          flex: none;
        }

        .gd-topic-heading__content {
          padding: 24px 22px 26px;
        }

        .gd-topic-tags,
        .gd-meta-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }

        .gd-topic-tags {
          gap: 8px;
          margin-bottom: 12px;
        }

        .gd-topic-tag,
        .gd-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--gd-muted);
          font-size: 11px;
          font-weight: 600;
        }

        .gd-topic-tag:first-child {
          background: var(--gd-accent-soft);
          color: #fdba74;
        }

        .gd-topic-tag--info {
          background: rgba(14, 165, 233, 0.12);
          color: #7dd3fc;
        }

        .gd-topic-tag--warning,
        .gd-status--warning {
          background: rgba(245, 158, 11, 0.12);
          color: #fcd34d;
        }

        .gd-topic-heading h1 {
          max-width: 860px;
          margin: 0;
          color: #fff;
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 700;
        }

        .gd-meta-row {
          gap: 14px;
          margin-top: 16px;
        }

        .gd-meta-item {
          color: var(--gd-faint);
          font-size: 13px;
        }

        .gd-meta-icon {
          color: #526176;
        }

        .gd-thread-post {
          overflow: hidden;
          margin-bottom: 18px;
        }

        .gd-thread-post--reply {
          margin: 0;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          background: transparent;
        }

        .gd-thread-post--reply + .gd-thread-post--reply {
          border-top: 1px solid var(--gd-line-soft);
        }

        .gd-post-grid {
          display: grid;
          grid-template-columns: 165px minmax(0, 1fr);
        }

        .gd-post-author {
          padding: 22px 18px;
          border-right: 1px solid var(--gd-line-soft);
          background: rgba(255, 255, 255, 0.018);
        }

        .gd-author-profile {
          text-align: center;
        }

        .gd-avatar {
          width: 58px;
          height: 58px;
          margin: 0 auto;
          border: 2px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
        }

        .gd-avatar-fallback {
          background: rgba(255, 255, 255, 0.06);
          color: #e5e7eb;
          font-size: 14px;
          font-weight: 700;
        }

        .gd-author-name {
          margin-top: 10px;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.2;
        }

        .gd-author-role {
          margin-top: 4px;
          color: var(--gd-faint);
          font-size: 12px;
        }

        .gd-author-email {
          margin-top: 6px;
          color: #556174;
          font-size: 11px;
          word-break: break-all;
        }

        .gd-banned-label {
          margin-top: 8px;
          color: #fbbf24;
          font-size: 11px;
          font-weight: 700;
        }

        .gd-author-rank {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--gd-line-soft);
          text-align: center;
        }

        .gd-author-rank strong {
          display: block;
          color: #dbeafe;
          font-size: 11px;
          line-height: 1.35;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .gd-author-rank span,
        .gd-author-rank small {
          display: block;
          color: var(--gd-faint);
          font-size: 11px;
          line-height: 1.5;
        }

        .gd-author-rank span {
          margin-top: 4px;
        }

        .gd-author-rank small {
          margin-top: 6px;
        }

        .gd-post-main {
          min-width: 0;
        }

        .gd-post-topbar {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 20px;
          border-bottom: 1px solid var(--gd-line-soft);
          background: rgba(255, 255, 255, 0.012);
        }

        .gd-post-tools {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gd-post-label,
        .gd-admin-summary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 26px;
          border-radius: 999px;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.045);
          color: var(--gd-muted);
          font-size: 11px;
          font-weight: 600;
        }

        .gd-admin-menu {
          position: relative;
        }

        .gd-admin-summary {
          cursor: pointer;
          list-style: none;
          border: 0;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .gd-admin-summary::-webkit-details-marker {
          display: none;
        }

        .gd-admin-summary:hover {
          background: rgba(255, 255, 255, 0.075);
          color: #fff;
        }

        .gd-admin-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 40;
          width: 220px;
          padding: 6px;
          border-radius: 12px;
          background: #090d13;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .gd-admin-dropdown button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          border-radius: 9px;
          padding: 9px 10px;
          background: transparent;
          color: #d8dee9;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: background 0.18s ease;
        }

        .gd-admin-dropdown button:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .gd-admin-dropdown button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .gd-admin-dropdown__danger {
          color: #fca5a5 !important;
        }

        .gd-content-area {
          padding: 22px 20px;
        }

        .gd-reply-reference {
          display: inline-flex;
          margin-bottom: 16px;
          border-left: 3px solid rgba(34, 211, 238, 0.55);
          padding: 8px 12px;
          background: rgba(34, 211, 238, 0.075);
          color: #cffafe;
          font-size: 12px;
          font-weight: 600;
        }

        .gd-content {
          color: #e2e8f0;
          font-size: 15px;
          line-height: 1.75;
        }

        .gd-content p {
          margin: 0 0 0.9em;
        }

        .gd-content p:last-child {
          margin-bottom: 0;
        }

        .gd-content strong,
        .gd-content b {
          color: #fff;
          font-weight: 800;
        }

        .gd-content a {
          color: var(--gd-accent);
          text-decoration: none;
        }

        .gd-content ul,
        .gd-content ol {
          margin: 0.8em 0;
          padding-left: 1.4em;
        }

        .gd-content blockquote {
          margin: 1em 0;
          border-left: 3px solid rgba(148, 163, 184, 0.28);
          padding-left: 1em;
          color: var(--gd-muted);
        }

        .gd-attachments {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .gd-attachment-thumb,
        .gd-attachment-preview {
          display: block;
          overflow: hidden;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.035);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.09);
        }

        .gd-attachment-thumb {
          width: 68px;
          height: 68px;
          transition: box-shadow 0.18s ease, transform 0.18s ease;
        }

        .gd-attachment-thumb:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
        }

        .gd-attachment-thumb img,
        .gd-attachment-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gd-post-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--gd-line-soft);
        }

        .gd-action-button,
        .gd-upload-button,
        .gd-secondary-button,
        .gd-primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 36px;
          border: 0;
          border-radius: 999px;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .gd-action-button,
        .gd-upload-button,
        .gd-secondary-button {
          background: rgba(255, 255, 255, 0.045);
          color: #cbd5e1;
        }

        .gd-action-button:hover,
        .gd-upload-button:hover,
        .gd-secondary-button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .gd-action-button--active {
          background: rgba(34, 211, 238, 0.11);
          color: #a5f3fc;
        }

        .gd-primary-button {
          min-height: 40px;
          background: linear-gradient(90deg, #f97316, #fbbf24);
          color: #0f172a;
          padding: 0 18px;
          font-size: 13px;
        }

        .gd-primary-button:hover {
          background: linear-gradient(90deg, #fb923c, #fcd34d);
        }

        .gd-primary-button:disabled,
        .gd-action-button:disabled,
        .gd-upload-button:has(input:disabled) {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .gd-thread-section,
        .gd-composer-card {
          overflow: hidden;
          margin-top: 18px;
        }

        .gd-thread-section__header,
        .gd-composer-card__header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          padding: 19px 22px;
          border-bottom: 1px solid var(--gd-line-soft);
          background: linear-gradient(90deg, rgba(249, 115, 22, 0.045), rgba(34, 211, 238, 0.025));
        }

        .gd-thread-section__header h2,
        .gd-composer-card__header h2 {
          margin: 0;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .gd-thread-section__header p,
        .gd-composer-card__header p {
          margin: 6px 0 0;
          color: var(--gd-faint);
          font-size: 13px;
        }

        .gd-thread-section__header span {
          color: var(--gd-faint);
          font-size: 13px;
          white-space: nowrap;
        }

        .gd-empty-state {
          padding: 46px 22px;
          text-align: center;
        }

        .gd-empty-state p,
        .gd-empty-state span {
          display: block;
        }

        .gd-empty-state p {
          margin: 0;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 700;
        }

        .gd-empty-state span {
          margin-top: 6px;
          color: var(--gd-faint);
          font-size: 13px;
        }

        .gd-replies-list {
          background: rgba(255, 255, 255, 0.008);
        }

        .gd-access-banner {
          margin-top: 18px;
          overflow: hidden;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(12, 16, 23, 0.97) 48%, rgba(8, 11, 16, 1));
          box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.18);
        }

        .gd-access-banner__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          padding: 26px;
        }

        .gd-access-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #a5f3fc;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .gd-access-banner h2 {
          margin: 12px 0 0;
          color: #fff;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.025em;
          font-weight: 750;
        }

        .gd-access-banner p {
          max-width: 680px;
          margin: 12px 0 0;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.75;
        }

        .gd-access-flags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .gd-access-flags span {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          padding: 5px 10px;
          color: #b6c2d2;
          font-size: 11px;
          font-weight: 600;
        }

        .gd-access-action {
          flex: none;
          text-align: center;
        }

        .gd-access-action a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 999px;
          padding: 0 20px;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 800;
          transition: background 0.18s ease;
        }

        .gd-access-action a:hover {
          background: #e5e7eb;
        }

        .gd-access-action small {
          display: block;
          margin-top: 9px;
          color: #94a3b8;
          font-size: 11px;
        }

        .gd-composer-card__body {
          padding: 22px;
        }

        .gd-reply-form {
          display: grid;
          gap: 16px;
        }

        .gd-reply-target,
        .gd-alert {
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.55;
        }

        .gd-reply-target {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: rgba(14, 165, 233, 0.1);
          color: #dff7ff;
        }

        .gd-reply-target button {
          border: 0;
          background: transparent;
          color: #a5f3fc;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .gd-editor-wrap {
          overflow: hidden;
          border-radius: 14px;
          background: var(--gd-bg);
          box-shadow: inset 0 0 0 1px var(--gd-line);
        }

        .gd-attachment-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .gd-attachment-toolbar strong,
        .gd-attachment-toolbar span {
          display: block;
        }

        .gd-attachment-toolbar strong {
          color: #dbe4ef;
          font-size: 13px;
        }

        .gd-attachment-toolbar span {
          margin-top: 3px;
          color: var(--gd-faint);
          font-size: 12px;
        }

        .gd-hidden-input {
          display: none;
        }

        .gd-attachment-preview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .gd-attachment-preview {
          position: relative;
          height: 132px;
        }

        .gd-attachment-preview button {
          position: absolute;
          right: 8px;
          top: 8px;
          border: 0;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.72);
          color: #fff;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .gd-alert {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gd-alert--warning {
          background: rgba(245, 158, 11, 0.1);
          color: #fde68a;
        }

        .gd-alert--error {
          background: rgba(239, 68, 68, 0.12);
          color: #fecaca;
        }

        .gd-alert--success {
          background: rgba(16, 185, 129, 0.11);
          color: #a7f3d0;
        }

        .gd-form-actions {
          display: flex;
          justify-content: flex-end;
        }

        .gd-blocked-notice {
          padding: 42px 20px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
          text-align: center;
        }

        .gd-blocked-notice p {
          margin: 0;
          color: #dbe4ef;
          font-size: 14px;
          font-weight: 700;
        }

        .gd-blocked-notice span {
          display: block;
          max-width: 480px;
          margin: 7px auto 0;
          color: var(--gd-faint);
          font-size: 13px;
          line-height: 1.65;
        }

        .gd-blocked-notice a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          margin-top: 18px;
          border-radius: 999px;
          padding: 0 18px;
          background: #fff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 800;
        }

        .gd-spin {
          animation: gd-spin 0.8s linear infinite;
        }

        @keyframes gd-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 820px) {
          .gd-topic-shell {
            padding-inline: 0;
          }

          .gd-topic-heading__topline,
          .gd-topic-heading__content,
          .gd-thread-section__header,
          .gd-composer-card__header,
          .gd-composer-card__body {
            padding-left: 16px;
            padding-right: 16px;
          }

          .gd-post-grid {
            grid-template-columns: 1fr;
          }

          .gd-post-author {
            border-right: 0;
            border-bottom: 1px solid var(--gd-line-soft);
            padding: 16px;
          }

          .gd-author-profile {
            display: flex;
            align-items: center;
            gap: 12px;
            text-align: left;
          }

          .gd-avatar {
            width: 46px;
            height: 46px;
            margin: 0;
          }

          .gd-author-rank {
            text-align: left;
          }

          .gd-post-topbar,
          .gd-content-area {
            padding-left: 16px;
            padding-right: 16px;
          }

          .gd-thread-section__header,
          .gd-access-banner__inner,
          .gd-attachment-toolbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .gd-access-action {
            width: 100%;
          }

          .gd-access-action a {
            width: 100%;
          }

          .gd-attachment-preview-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function CommunityPostCard({
  author,
  authorRole,
  createdAt,
  content,
  attachments,
  parentPost = null,
  likesCount = 0,
  viewerLiked = false,
  canInteract = false,
  canReplyAction = canInteract,
  likeBusy = false,
  highlight = false,
  compact = false,
  isAdminUser = false,
  actionBusy = false,
  onDelete,
  onToggleBan,
  onToggleLike,
  onReply,
}: {
  author: TopicAuthor
  authorRole: string
  createdAt: string
  content: string
  attachments: CommunityUploadedImage[]
  parentPost?: { id: string; authorName: string } | null
  likesCount?: number
  viewerLiked?: boolean
  canInteract?: boolean
  canReplyAction?: boolean
  likeBusy?: boolean
  highlight?: boolean
  compact?: boolean
  isAdminUser?: boolean
  actionBusy?: boolean
  onDelete?: () => void
  onToggleBan?: () => void
  onToggleLike?: () => void
  onReply?: () => void
}) {
  const isBanned = Boolean(author.activeBan)
  const stats = author.communityStats ?? DEFAULT_COMMUNITY_STATS
  const canUseLike = !highlight && canInteract
  const canUseReply = !highlight && canReplyAction

  return (
    <article className={["gd-thread-post", compact ? "gd-thread-post--reply" : ""].join(" ") }>
      <div className="gd-post-grid">
        <aside className="gd-post-author">
          <div className="gd-author-profile">
            <Avatar className="gd-avatar">
              <AvatarImage src={author.avatarUrl ?? ""} />
              <AvatarFallback className="gd-avatar-fallback">{getCommunityInitials(author.name)}</AvatarFallback>
            </Avatar>

            <div>
              <div className="gd-author-name">{getCommunityFirstName(author.name)}</div>
              <div className="gd-author-role">{authorRole}</div>
              {isAdminUser && author.email && <div className="gd-author-email">{author.email}</div>}
              {isBanned && <div className="gd-banned-label">Banido da comunidade</div>}
            </div>
          </div>

          <div className="gd-author-rank">
            <strong>{stats.badgeLabel}</strong>
            <span>{stats.score} interações</span>
            <small>
              {stats.postsCount} respostas · {stats.likesReceivedCount} curtidas
            </small>
          </div>
        </aside>

        <div className="gd-post-main">
          <div className="gd-post-topbar">
            <MetaItem icon={CalendarDays} label={formatCommunityDate(createdAt)} />

            <div className="gd-post-tools">
              {highlight && <span className="gd-post-label">Publicação principal</span>}

              {isAdminUser && (
                <details className="gd-admin-menu">
                  <summary className="gd-admin-summary">
                    {actionBusy ? <Loader2 className="gd-icon gd-spin" /> : <MoreHorizontal className="gd-icon" />}
                    Ações
                    <ChevronDown className="gd-icon" />
                  </summary>

                  <div className="gd-admin-dropdown">
                    <button type="button" onClick={onToggleBan} disabled={actionBusy}>
                      {isBanned ? <ShieldOff className="gd-icon" /> : <Ban className="gd-icon" />}
                      {isBanned ? "Desbanir usuário" : "Banir usuário"}
                    </button>

                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={actionBusy}
                      className="gd-admin-dropdown__danger"
                    >
                      <Trash2 className="gd-icon" />
                      Apagar publicação
                    </button>
                  </div>
                </details>
              )}
            </div>
          </div>

          <div className="gd-content-area">
            {parentPost && (
              <div className="gd-reply-reference">Em resposta a {getCommunityFirstName(parentPost.authorName)}</div>
            )}

            <div className="gd-content" dangerouslySetInnerHTML={{ __html: content }} />

            {attachments.length > 0 && (
              <div className="gd-attachments">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id ?? attachment.url}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="gd-attachment-thumb"
                    title={attachment.fileName}
                  >
                    <img src={attachment.url} alt={attachment.fileName} />
                  </a>
                ))}
              </div>
            )}

            {!highlight && (
              <div className="gd-post-actions">
                <button
                  type="button"
                  onClick={onToggleLike}
                  disabled={!canUseLike || likeBusy}
                  className={["gd-action-button", viewerLiked ? "gd-action-button--active" : ""].join(" ")}
                >
                  {likeBusy ? (
                    <Loader2 className="gd-button-icon gd-spin" />
                  ) : (
                    <Heart className="gd-button-icon" fill={viewerLiked ? "currentColor" : "none"} />
                  )}
                  {likesCount}
                </button>

                {canUseReply && onReply && (
                  <button type="button" onClick={onReply} className="gd-action-button">
                    <Reply className="gd-button-icon" />
                    Responder
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function CommunityAccessBanner({
  repliesCount,
  canViewReplies,
  canReply,
}: {
  repliesCount: number
  canViewReplies: boolean
  canReply: boolean
}) {
  const hasRealReplies = repliesCount > 0

  return (
    <section className="gd-access-banner">
      <div className="gd-access-banner__inner">
        <div>
          <div className="gd-access-kicker">
            <Sparkles className="gd-icon" />
            Comunidade completa
          </div>

          <h2>Desbloqueie as respostas e participe do tópico</h2>

          <p>
            {hasRealReplies
              ? `Este tópico já tem ${plural(repliesCount, "resposta", "respostas")} da comunidade. Ative seu plano para visualizar os diagnósticos completos e contribuir com sua experiência.`
              : "Ative seu plano para visualizar respostas técnicas, acompanhar diagnósticos completos e contribuir com a comunidade."}
          </p>

          <div className="gd-access-flags">
            {!canViewReplies && <span>Respostas bloqueadas</span>}
            {!canReply && <span>Participação bloqueada</span>}
          </div>
        </div>

        <div className="gd-access-action">
          <Link href="/planos">Desbloquear agora</Link>
          <small>Libere a comunidade completa</small>
        </div>
      </div>
    </section>
  )
}

function ParticipationBlockedNotice({ banMessage }: { banMessage?: string | null }) {
  return (
    <div className="gd-blocked-notice">
      <p>{banMessage ? "Sua participação está temporariamente bloqueada." : "Entre na sua conta para participar."}</p>
      <span>{banMessage ? banMessage : "Apenas membros autenticados podem responder tópicos."}</span>
      {!banMessage && <Link href="/login">Entrar na conta</Link>}
    </div>
  )
}

function AttachmentPreviewGrid({
  attachments,
  onRemove,
}: {
  attachments: CommunityUploadedImage[]
  onRemove: (url: string) => void
}) {
  return (
    <div className="gd-attachment-preview-grid">
      {attachments.map((attachment) => (
        <div key={attachment.url} className="gd-attachment-preview">
          <img src={attachment.url} alt={attachment.fileName} />
          <button type="button" onClick={() => onRemove(attachment.url)}>
            Remover
          </button>
        </div>
      ))}
    </div>
  )
}

function MetaItem({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="gd-meta-item">
      <Icon className="gd-meta-icon" />
      {label}
    </span>
  )
}

function plural(value: number, singular: string, pluralText: string) {
  return `${value} ${value === 1 ? singular : pluralText}`
}
