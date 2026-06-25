"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  Eye,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Shield,
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
  banMessage,
  isAdminUser,
}: {
  initialForum: CommunityForumMeta
  canCreate: boolean
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
    if (!hasLoadedOnce || loading) return "Carregando topicos..."
    if (total === 0) return "Nenhum topico publicado."
    if (total === 1) return "1 topico publicado."
    return `${total} topicos publicados.`
  }, [hasLoadedOnce, loading, total])

  async function submitTopic(event: React.FormEvent) {
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
      setError(data?.error ?? "Nao foi possivel criar o topico.")
      return
    }

    setTitle("")
    setContent("")
    setAttachments([])
    setShowComposer(false)

    if (data?.pending) {
      setInfo(data.message ?? "Topico enviado para aprovacao.")
      return
    }

    setInfo("Topico publicado com sucesso.")
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

  return (
    <div className="min-h-screen bg-[#080b10] text-slate-100">
      <section className="border-b border-white/[0.08] bg-[#0b0f16]">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          <div className="mb-5 flex items-center gap-2 text-sm">
            <Link href="/comunidade" className="text-slate-400 transition hover:text-white">
              Comunidade
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300">{initialForum.name}</span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
                {initialForum.name}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                {initialForum.description || "Forum sem descricao cadastrada ainda."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{statsText}</span>

                {initialForum.topicApprovalRequired && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                    <Shield className="h-3.5 w-3.5" />
                    Topicos moderados
                  </span>
                )}

                {initialForum.replyApprovalRequired && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-300">
                    <Shield className="h-3.5 w-3.5" />
                    Respostas moderadas
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isAdminUser && (
                <Link
                  href="/admin/comunidade"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white"
                >
                  Gerenciar
                </Link>
              )}

              {canCreate ? (
                <button
                  onClick={() => {
                    setShowComposer(true)
                    setError(null)
                    setInfo(null)
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  Novo topico
                </button>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm text-slate-400">
                  {banMessage ? "Publicacao bloqueada" : "Entre para criar topicos"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-7 md:px-8">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-h-5">
            {info && (
              <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {info}
              </p>
            )}

            {error && (
              <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            {banMessage && (
              <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {banMessage}
              </p>
            )}
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no forum"
              className="h-10 w-full rounded-md border border-white/[0.1] bg-[#0d1118] pl-9 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_100px_170px] border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
            <div>Topico</div>
            <div className="text-center">Respostas</div>
            <div className="text-center">Views</div>
            <div>Ultima atividade</div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-300">Nenhum topico encontrado</p>
              <p className="mt-1 text-sm text-slate-500">Quando houver publicacoes, elas aparecerao aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {items.map((topic) => {
                const activityDate = formatCommunityDate(topic.lastReplyAt ?? topic.createdAt)
                const createdDate = formatCommunityDate(topic.createdAt)

                return (
                  <Link
                    key={topic.id}
                    href={`/comunidade/topico/${topic.slug}`}
                    className="group grid gap-4 px-5 py-4 transition hover:bg-white/[0.035] md:grid-cols-[minmax(0,1fr)_110px_100px_170px] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold text-slate-100 group-hover:text-white">
                          {topic.title}
                        </h2>

                        {topic.isPinned && (
                          <span className="shrink-0 rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                            Fixado
                          </span>
                        )}

                        {topic.isLocked && (
                          <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                            Fechado
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          {getCommunityFirstName(topic.author.name)}
                        </span>

                        <span className="hidden text-slate-700 sm:inline">•</span>

                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {createdDate}
                        </span>
                      </div>
                    </div>

                    <div className="hidden text-center md:block">
                      <div className="text-sm font-semibold text-slate-200">{topic.repliesCount}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">respostas</div>
                    </div>

                    <div className="hidden text-center md:block">
                      <div className="text-sm font-semibold text-slate-200">{topic.viewsCount}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">views</div>
                    </div>

                    <div className="hidden md:block">
                      <div className="text-sm font-medium text-slate-300">{activityDate}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600">atividade recente</div>
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
              })}
            </div>
          )}
        </div>

        {!loading && items.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Pagina {page} de {totalPages}
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
                Proxima
              </button>
            </div>
          </div>
        )}
      </section>

      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg border border-white/[0.1] bg-[#0c1017] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] bg-[#111722] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Novo topico</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Informe o problema, testes realizados e o contexto tecnico.
                </p>
              </div>

              <button
                onClick={() => setShowComposer(false)}
                className="rounded-md border border-white/[0.1] p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitTopic} className="max-h-[calc(92vh-82px)] space-y-5 overflow-y-auto px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Titulo</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                  placeholder="Ex.: PS5 liga e desliga apos alguns segundos"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Conteudo</label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Descreva o caso com o maximo de contexto possivel..."
                />
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

                <p className="text-xs text-slate-500">Ate 6 imagens por topico.</p>
              </div>

              {initialForum.topicApprovalRequired && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <span className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Este forum possui aprovacao de topicos antes da publicacao.
                  </span>
                </div>
              )}

              {error && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-white/[0.08] pt-5">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="h-10 rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Publicando..." : "Criar topico"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
