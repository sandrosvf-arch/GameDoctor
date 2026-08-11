"use client"

import { type ChangeEvent, type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import { formatCommunityDate, getCommunityFirstName } from "@/lib/community"
import { uploadCommunityImage, type CommunityUploadedImage } from "@/lib/community-image-upload"

interface CommunityTopicListItem {
  id: string
  title: string
  slug: string
  repliesCount: number
  viewsCount: number
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  lastReplyAt: string | null
  author: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

interface CommunityForumMeta {
  id: string
  name: string
  slug: string
  description: string | null
  topicApprovalRequired: boolean
  replyApprovalRequired: boolean
}

interface ForumResponse {
  forum: CommunityForumMeta
  items: CommunityTopicListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function CommunityForumClient({
  initialForum,
  canCreate,
  requiresPlan,
  banMessage,
  isAdminUser,
}: {
  initialForum: CommunityForumMeta
  canCreate: boolean
  requiresPlan: boolean
  banMessage?: string | null
  isAdminUser: boolean
}) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [items, setItems] = useState<CommunityTopicListItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showComposer, setShowComposer] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<CommunityUploadedImage[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)

    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
      })

      const response = await fetch(`/api/comunidade/forums/${initialForum.slug}/topics?${params.toString()}`, {
        cache: "no-store",
      })

      const data: ForumResponse | null = await response.json().catch(() => null)

      if (response.ok && data) {
        setItems(data.items)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        setItems([])
        setTotal(0)
        setTotalPages(1)
      }

      setHasLoadedOnce(true)
      setLoading(false)
    }, 220)

    return () => window.clearTimeout(timer)
  }, [initialForum.slug, page, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const statsText = useMemo(() => {
    if (!hasLoadedOnce || loading) return "Carregando discussões..."
    if (total === 0) return "Nenhuma discussão publicada."
    if (total === 1) return "1 discussão publicada."
    return `${total} discussões publicadas.`
  }, [hasLoadedOnce, loading, total])

  async function submitTopic(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSaving(true)

    const response = await fetch(`/api/comunidade/forums/${initialForum.slug}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        attachments,
      }),
    })

    setSaving(false)
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível criar a discussão.")
      return
    }

    setTitle("")
    setContent("")
    setAttachments([])
    setShowComposer(false)

    if (data?.pending) {
      setInfo(data.message ?? "Discussão enviada para aprovação.")
      return
    }

    setInfo("Discussão publicada com sucesso.")
    setPage(1)
    setQuery("")
    setLoading(true)

    const params = new URLSearchParams({ q: "", page: "1" })
    const reload = await fetch(`/api/comunidade/forums/${initialForum.slug}/topics?${params.toString()}`, {
      cache: "no-store",
    })

    const reloadData: ForumResponse | null = await reload.json().catch(() => null)

    if (reload.ok && reloadData) {
      setItems(reloadData.items)
      setTotal(reloadData.total)
      setTotalPages(reloadData.totalPages)
    }

    setHasLoadedOnce(true)
    setLoading(false)
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

  function openComposer() {
    setShowComposer(true)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="min-h-screen bg-[#080b10] text-slate-100">
      <main className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-8">
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1017] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <div className="px-5 py-6 md:px-6 md:py-7">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              <Link href="/comunidade" className="font-medium text-slate-500 transition hover:text-slate-200">
                Comunidade
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-700" />
              <span className="font-medium text-slate-300">{initialForum.name}</span>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-400">
                    Espaço da comunidade
                  </span>

                  {initialForum.topicApprovalRequired && (
                    <StatusPill tone="warning" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                      Discussões moderadas
                    </StatusPill>
                  )}

                  {initialForum.replyApprovalRequired && (
                    <StatusPill tone="info" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                      Respostas moderadas
                    </StatusPill>
                  )}
                </div>

                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                  {initialForum.name}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  {initialForum.description || "Espaço sem descrição cadastrada ainda."}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span>{statsText}</span>
                  <span className="hidden text-slate-700 sm:inline">•</span>
                  <span>Organizado para dúvidas, diagnósticos e troca de experiências.</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isAdminUser && (
                  <Link
                    href="/admin/comunidade"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Gerenciar
                  </Link>
                )}

                {canCreate ? (
                  <button
                    onClick={openComposer}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" />
                    Nova discussão
                  </button>
                ) : (
                  <DisabledActionLabel banMessage={banMessage} requiresPlan={requiresPlan} />
                )}
              </div>
            </div>
          </div>

          {(requiresPlan || banMessage || info || error) && (
            <div className="border-t border-white/[0.07] bg-[#090d13] px-5 py-4 md:px-6">
              <div className="space-y-3">
                {requiresPlan && !banMessage && (
                  <AccessNotice
                    title="Participe com acesso ativo"
                    description="Você pode navegar pela comunidade. Para publicar discussões, responder e acompanhar todo o histórico técnico, ative um plano."
                    ctaLabel="Ver planos"
                    href="/planos"
                  />
                )}

                {banMessage && (
                  <AlertMessage tone="danger">
                    {banMessage}
                  </AlertMessage>
                )}

                {info && (
                  <AlertMessage tone="success">
                    {info}
                  </AlertMessage>
                )}

                {error && (
                  <AlertMessage tone="danger">
                    {error}
                  </AlertMessage>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Discussões</h2>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe os assuntos recentes e encontre respostas da comunidade.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar discussões"
              className="h-10 w-full rounded-md border border-white/[0.1] bg-[#0c1017] pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c1017]">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px_180px_36px] border-b border-white/[0.07] bg-white/[0.018] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
            <div>Discussão</div>
            <div className="text-center">Respostas</div>
            <div className="text-center">Visualizações</div>
            <div>Última atividade</div>
            <div />
          </div>

          {loading ? (
            <LoadingState />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhuma discussão encontrada"
              description={query ? "Tente buscar por outro termo." : "Quando houver publicações, elas aparecerão aqui."}
            />
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {items.map((topic) => (
                <TopicRow key={topic.id} topic={topic} />
              ))}
            </div>
          )}
        </section>

        {!loading && items.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Página {page} de {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="h-9 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="h-9 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </main>

      {showComposer && (
        <ComposerModal
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          attachments={attachments}
          setAttachments={setAttachments}
          uploading={uploading}
          saving={saving}
          error={error}
          topicApprovalRequired={initialForum.topicApprovalRequired}
          onUpload={handleAttachmentChange}
          onClose={() => setShowComposer(false)}
          onSubmit={submitTopic}
        />
      )}
    </div>
  )
}

function TopicRow({ topic }: { topic: CommunityTopicListItem }) {
  const activityDate = formatCommunityDate(topic.lastReplyAt ?? topic.createdAt)
  const createdDate = formatCommunityDate(topic.createdAt)

  return (
    <Link
      href={`/comunidade/topico/${topic.slug}`}
      className="group grid gap-4 px-5 py-4 transition hover:bg-white/[0.025] md:grid-cols-[minmax(0,1fr)_110px_120px_180px_36px] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-slate-100 transition group-hover:text-white">
            {topic.title}
          </h3>

          {topic.isPinned && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
              <Pin className="h-3 w-3" />
              Fixada
            </span>
          )}

          {topic.isLocked && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              <LockKeyhole className="h-3 w-3" />
              Encerrada
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-slate-600" />
            {getCommunityFirstName(topic.author.name)}
          </span>

          <span className="hidden text-slate-700 sm:inline">•</span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-slate-600" />
            {createdDate}
          </span>
        </div>
      </div>

      <MetricCell value={topic.repliesCount} label="respostas" />
      <MetricCell value={topic.viewsCount} label="visualizações" />

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-medium text-slate-300">{activityDate}</p>
        <p className="mt-0.5 text-[11px] text-slate-600">atividade recente</p>
      </div>

      <div className="hidden justify-end md:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition group-hover:bg-white/[0.05] group-hover:text-slate-300">
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 md:hidden">
        <span className="inline-flex items-center gap-1">
          <MessageSquareText className="h-3.5 w-3.5" />
          {topic.repliesCount}
        </span>

        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {topic.viewsCount}
        </span>

        <span>{activityDate}</span>
      </div>
    </Link>
  )
}

function ComposerModal({
  title,
  setTitle,
  content,
  setContent,
  attachments,
  setAttachments,
  uploading,
  saving,
  error,
  topicApprovalRequired,
  onUpload,
  onClose,
  onSubmit,
}: {
  title: string
  setTitle: (value: string) => void
  content: string
  setContent: (value: string) => void
  attachments: CommunityUploadedImage[]
  setAttachments: Dispatch<SetStateAction<CommunityUploadedImage[]>>
  uploading: boolean
  saving: boolean
  error: string | null
  topicApprovalRequired: boolean
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0c1017] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 md:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Comunidade
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">
              Nova discussão
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Descreva o caso com clareza para receber respostas mais úteis da comunidade.
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
              <Field label="Título da discussão">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                  placeholder="Ex.: PS5 liga e desliga após alguns segundos"
                  required
                />
              </Field>

              <Field label="Descrição do caso">
                <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10]">
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Informe sintomas, testes realizados, contexto e o que você já tentou fazer..."
                    enableEmojiPicker
                  />
                </div>
              </Field>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Anexos</p>
                    <p className="mt-1 text-xs text-slate-500">Até 6 imagens para ajudar no diagnóstico.</p>
                  </div>

                  <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {uploading ? "Enviando..." : "Adicionar imagens"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onUpload}
                      disabled={uploading || attachments.length >= 6}
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {attachments.map((attachment) => (
                      <AttachmentPreview
                        key={attachment.url}
                        attachment={attachment}
                        onRemove={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {topicApprovalRequired && (
                <AlertMessage tone="warning">
                  Esta comunidade revisa novas discussões antes da publicação.
                </AlertMessage>
              )}

              {error && (
                <AlertMessage tone="danger">
                  {error}
                </AlertMessage>
              )}
            </div>

            <aside className="border-t border-white/[0.08] bg-[#090d13] px-5 py-5 lg:border-l lg:border-t-0 md:px-6">
              <div className="sticky top-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Para uma boa resposta</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Quanto mais objetivo for o relato, mais fácil será para outros alunos entenderem e ajudarem.
                  </p>
                </div>

                <div className="space-y-3 text-sm text-slate-400">
                  <GuideItem>Informe o modelo do aparelho.</GuideItem>
                  <GuideItem>Descreva exatamente o sintoma.</GuideItem>
                  <GuideItem>Liste testes já realizados.</GuideItem>
                  <GuideItem>Anexe fotos claras quando fizer sentido.</GuideItem>
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] bg-[#0c1017] px-5 py-4 sm:flex-row sm:items-center sm:justify-end md:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] sm:w-auto"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Publicando..." : "Publicar discussão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MetricCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="hidden text-center md:block">
      <p className="text-sm font-semibold text-slate-200">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-600">{label}</p>
    </div>
  )
}

function StatusPill({
  tone,
  icon,
  children,
}: {
  tone: "warning" | "info"
  icon: ReactNode
  children: ReactNode
}) {
  const className =
    tone === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-sky-500/20 bg-sky-500/10 text-sky-300"

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${className}`}>
      {icon}
      {children}
    </span>
  )
}

function DisabledActionLabel({
  banMessage,
  requiresPlan,
}: {
  banMessage?: string | null
  requiresPlan: boolean
}) {
  if (banMessage) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 px-4 text-sm font-medium text-red-300">
        Publicação bloqueada
      </span>
    )
  }

  if (requiresPlan) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-400">
        Acesso necessário
      </span>
    )
  }

  return (
    <Link
      href="/login"
      className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
    >
      Entrar para publicar
    </Link>
  )
}

function AccessNotice({
  title,
  description,
  ctaLabel,
  href,
}: {
  title: string
  description: string
  ctaLabel: string
  href: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <Link
        href={href}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

function AlertMessage({ tone, children }: { tone: "success" | "danger" | "warning"; children: ReactNode }) {
  const className =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : "border-red-500/20 bg-red-500/10 text-red-300"

  return (
    <div className={`rounded-md border px-4 py-3 text-sm leading-6 ${className}`}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      {children}
    </div>
  )
}

function GuideItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
      <span className="leading-6">{children}</span>
    </div>
  )
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: CommunityUploadedImage
  onRemove: () => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10]">
      <img src={attachment.url} alt={attachment.fileName} className="h-28 w-full object-cover" />
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="truncate text-xs text-slate-500">{attachment.fileName}</p>
        <button type="button" onClick={onRemove} className="text-xs font-medium text-red-300 transition hover:text-red-200">
          Remover
        </button>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}
