"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import {
  CalendarDays,
  ChevronLeft,
  Eye,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { getCommunityFirstName, getCommunityInitials } from "@/lib/community"

interface TopicAuthor {
  name: string
  avatarUrl: string | null
}

interface TopicPost {
  id: string
  content: string
  createdAt: string
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
}

export function CommunityTopicClient({
  topic,
  initialPosts,
  canReply,
  topicSlug,
}: {
  topic: TopicMeta
  initialPosts: TopicPost[]
  canReply: boolean
  topicSlug: string
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function sendReply(event: React.FormEvent) {
    event.preventDefault()

    setError(null)
    setInfo(null)
    setSaving(true)

    const response = await fetch(`/api/comunidade/topicos/${topicSlug}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    setSaving(false)

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível publicar a resposta.")
      return
    }

    setContent("")

    if (data?.pending) {
      setInfo(data.message ?? "Resposta enviada para aprovação.")
      return
    }

    setPosts((current) => [...current, data.post])
    setInfo("Resposta publicada com sucesso.")
  }

  const views = topic.viewsCount + 1
  const replies = posts.length

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
                  Discussão da comunidade
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
                <MetaItem icon={CalendarDays} label={formatDate(topic.createdAt)} />
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
        highlight
      />

      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="flex flex-col gap-2 border-b border-white/[0.08] bg-white/[0.025] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Respostas da comunidade
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe os complementos, diagnósticos e soluções compartilhadas.
            </p>
          </div>

          <span className="text-sm text-slate-500">
            {plural(replies, "resposta", "respostas")}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-300">
              Nenhuma resposta publicada ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Seja o primeiro a contribuir com essa discussão.
            </p>
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
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="border-b border-white/[0.08] bg-white/[0.025] px-5 py-4">
          <h2 className="text-base font-semibold text-white">
            Participar da discussão
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compartilhe seu diagnóstico, teste realizado ou complemento para ajudar a comunidade.
          </p>
        </div>

        <div className="p-5">
          {!canReply ? (
            <div className="rounded-md border border-dashed border-white/[0.12] px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-300">
                Entre na sua conta para participar.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Apenas membros autenticados podem responder discussões.
              </p>
            </div>
          ) : topic.isLocked ? (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
              Esta discussão está encerrada para novas respostas.
            </div>
          ) : (
            <form onSubmit={sendReply} className="space-y-4">
              <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10]">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Escreva sua resposta..."
                />
              </div>

              {topic.replyApprovalRequired && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    As respostas desta comunidade passam por aprovação antes da publicação.
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
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

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
  highlight = false,
  compact = false,
}: {
  author: TopicAuthor
  authorRole: string
  createdAt: string
  content: string
  highlight?: boolean
  compact?: boolean
}) {
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
              <p className="truncate text-sm font-semibold text-white">
                {getCommunityFirstName(author.name)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {authorRole}
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3">
            <MetaItem icon={CalendarDays} label={formatDate(createdAt)} />

            {highlight && (
              <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-400">
                Publicação principal
              </span>
            )}
          </div>

          <div className="px-5 py-5">
            <div
              className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-sky-300 prose-strong:text-white prose-p:leading-7 prose-p:text-slate-300 prose-li:text-slate-300 prose-blockquote:border-slate-600 prose-blockquote:text-slate-400"
              dangerouslySetInnerHTML={{ __html: content }}
            />
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

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "Sem data"

  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function plural(value: number, singular: string, pluralText: string) {
  return `${value} ${value === 1 ? singular : pluralText}`
}