"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Play, Save, Loader2, Eye, EyeOff, ExternalLink,
  Search, Filter, Paperclip, Plus, Trash2, ChevronLeft, ChevronRight,
  FileText, FileSpreadsheet, Link2, Mic, BrainCircuit, CheckCircle,
  AlertCircle, RefreshCw, ChevronDown, ChevronUp, Check, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadAdminImage } from "@/lib/admin-image-upload"

const BUNNY_CDN = "vz-38444944-922.b-cdn.net"

interface LessonWithCourse {
  id: string
  title: string
  description: string | null
  searchKeywords: string | null
  videoProviderId: string | null
  videoThumbnailUrl: string | null
  thumbnail: string | null
  isFree: boolean
  status: string
  order: number
  videoDurationSeconds: number | null
  durationSeconds: number | null
  course: { id: string; title: string; slug: string; trailColorRgb: string | null } | null
  module: { id: string; title: string } | null
}

interface TrailOption {
  id: string
  title: string
}

interface LessonsResponse {
  lessons: LessonWithCourse[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  trails: TrailOption[]
}

type LessonEdits = {
  title?: string
  description?: string
  searchKeywords?: string
  bunnyVideoId?: string
  thumbnail?: string
  isFree?: boolean
  status?: string
}

function formatSecs(s: number | null | undefined) {
  if (!s) return ""
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}min ${r}s` : `${m}min`
}

function ThumbnailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("Selecione uma imagem válida."); return }
    setUploading(true)
    try { onChange(await uploadAdminImage(file, "lessons")) } catch (error) { alert(error instanceof Error ? error.message : "Não foi possível enviar a imagem.") } finally { setUploading(false) }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-3 border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
          {uploading ? "Enviando..." : "Imagem"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { e.stopPropagation(); void handleFile(e.target.files?.[0] ?? null); e.currentTarget.value = "" }} />
        </label>
        <input
          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
          placeholder="URL da imagem ou upload"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <img src={value} alt="" className="w-14 aspect-video rounded object-cover bg-zinc-800 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
        )}
      </div>
    </div>
  )
}

const MATERIAL_TYPES = [
  { value: "PDF", label: "PDF" },
  { value: "SPREADSHEET", label: "Planilha" },
  { value: "LINK", label: "Link" },
  { value: "IMAGE", label: "Imagem" },
  { value: "ARCHIVE", label: "Arquivo" },
  { value: "OTHER", label: "Outro" },
]

interface MaterialItem {
  id: string
  title: string
  fileUrl: string | null
  externalUrl: string | null
  type: string
}

type NewMaterialDraft = { title: string; url: string; type: string }

const INITIAL_DRAFT: NewMaterialDraft = { title: "", url: "", type: "PDF" }

function MaterialTypeIcon({ type }: { type: string }) {
  if (type === "PDF") return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  if (type === "SPREADSHEET") return <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  if (type === "LINK") return <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  return <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
}

export default function TodasAsAulasPage() {
  const [lessons, setLessons] = useState<LessonWithCourse[]>([])
  const [trails, setTrails] = useState<TrailOption[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState("")
  const [filterTrail, setFilterTrail] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, LessonEdits>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // Materials state
  const [materials, setMaterials] = useState<Record<string, MaterialItem[]>>({})
  const [loadingMaterials, setLoadingMaterials] = useState<string | null>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, NewMaterialDraft>>({})
  const [addingMaterial, setAddingMaterial] = useState<string | null>(null)

  // Transcription & AI state
  const [transcriptionState, setTranscriptionState] = useState<Record<string, { status: string; text?: string; error?: string }>>({})
  const [showTranscript, setShowTranscript] = useState<Record<string, boolean>>({})
  const [aiResults, setAiResults] = useState<Record<string, { description: string; keywords: string } | null>>({})
  const [generatingAi, setGeneratingAi] = useState<string | null>(null)
  const [startingTranscription, setStartingTranscription] = useState<string | null>(null)
  const [uploadingCaption, setUploadingCaption] = useState<string | null>(null)
  const [captionStatus, setCaptionStatus] = useState<Record<string, { ok: boolean; message: string }>>({})
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  // Clear all polling intervals on unmount
  useEffect(() => {
    const ref = pollingRef.current
    return () => { Object.values(ref).forEach(clearInterval) }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "30",
      search,
      trailId: filterTrail,
      status: filterStatus,
    })

    const res = await fetch(`/api/admin/aulas?${params.toString()}`)
    if (res.ok) {
      const data: LessonsResponse = await res.json()
      setLessons(data.lessons)
      setTrails(data.trails)
      setTotal(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    }
    setLoading(false)
  }, [filterStatus, filterTrail, page, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPage(1)
  }, [search, filterTrail, filterStatus])

  function startEdit(lesson: LessonWithCourse) {
    setEditingId(lesson.id)
    setEdits(prev => ({
      ...prev,
      [lesson.id]: {
        title: lesson.title,
        description: lesson.description ?? "",
        searchKeywords: lesson.searchKeywords ?? "",
        bunnyVideoId: lesson.videoProviderId ?? "",
        thumbnail: lesson.thumbnail ?? "",
        isFree: lesson.isFree,
        status: lesson.status,
      },
    }))
    // Load materials for this lesson
    if (!materials[lesson.id]) {
      setLoadingMaterials(lesson.id)
      fetch(`/api/admin/aulas/${lesson.id}/materials`)
        .then(r => r.ok ? r.json() : [])
        .then((data: MaterialItem[]) => setMaterials(prev => ({ ...prev, [lesson.id]: data })))
        .finally(() => setLoadingMaterials(null))
    }
    // Load transcription status
    if (!transcriptionState[lesson.id]) {
      fetch(`/api/admin/aulas/${lesson.id}/transcribe`)
        .then(r => r.ok ? r.json() : { status: "NONE" })
        .then((data: { status: string; text?: string; error?: string }) => {
          setTranscriptionState(prev => ({ ...prev, [lesson.id]: { status: data.status, text: data.text, error: data.error } }))
        })
    }
  }

  function pollTranscription(lessonId: string) {
    fetch(`/api/admin/aulas/${lessonId}/transcribe`)
      .then(r => r.ok ? r.json() : { status: "FAILED" })
      .then((data: { status: string; text?: string; error?: string }) => {
        setTranscriptionState(prev => ({ ...prev, [lessonId]: { status: data.status, text: data.text, error: data.error } }))
        if (data.status === "DONE" || data.status === "FAILED") {
          clearInterval(pollingRef.current[lessonId])
          delete pollingRef.current[lessonId]
        }
      })
  }

  async function startTranscription(lessonId: string) {
    setStartingTranscription(lessonId)
    // Reset any previous failed state so the user sees "uploading" feedback
    setTranscriptionState(prev => ({ ...prev, [lessonId]: { status: "UPLOADING" } }))
    const res = await fetch(`/api/admin/aulas/${lessonId}/transcribe`, { method: "POST" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert((err as { error?: string }).error ?? "Erro ao iniciar transcrição")
      setStartingTranscription(null)
      return
    }
    setTranscriptionState(prev => ({ ...prev, [lessonId]: { status: "PENDING" } }))
    setStartingTranscription(null)
    // Start polling every 6 seconds
    pollingRef.current[lessonId] = setInterval(() => pollTranscription(lessonId), 6000)
  }

  async function generateAi(lessonId: string) {
    setGeneratingAi(lessonId)
    setAiResults(prev => ({ ...prev, [lessonId]: null }))
    const res = await fetch(`/api/admin/aulas/${lessonId}/generate-ai`, { method: "POST" })
    if (res.ok) {
      const data = await res.json() as { description: string; keywords: string }
      setAiResults(prev => ({ ...prev, [lessonId]: data }))
    } else {
      const err = await res.json().catch(() => ({}))
      alert((err as { error?: string }).error ?? "Erro ao gerar conteúdo com IA")
    }
    setGeneratingAi(null)
  }

  async function uploadCaptionToBunny(lessonId: string) {
    setUploadingCaption(lessonId)
    setCaptionStatus(prev => {
      const next = { ...prev }
      delete next[lessonId]
      return next
    })

    const res = await fetch(`/api/admin/aulas/${lessonId}/captions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ srclang: "pt", label: "Português (Auto)", charsPerCaption: 42 }),
    })

    const data = await res.json().catch(() => ({})) as { message?: string; error?: string; detail?: unknown }

    if (res.ok) {
      setCaptionStatus(prev => ({
        ...prev,
        [lessonId]: { ok: true, message: data.message ?? "Legenda enviada com sucesso" },
      }))
    } else {
      const detail = typeof data.detail === "string" ? ` ${data.detail}` : ""
      setCaptionStatus(prev => ({
        ...prev,
        [lessonId]: { ok: false, message: `${data.error ?? "Falha ao enviar legenda"}${detail}` },
      }))
    }

    setUploadingCaption(null)
  }

  function applyAiField(lessonId: string, field: "description" | "keywords") {
    const result = aiResults[lessonId]
    if (!result) return
    if (field === "description") {
      patch(lessonId, "description", result.description)
      setAiResults(prev => prev[lessonId] ? { ...prev, [lessonId]: { ...prev[lessonId]!, description: "" } } : prev)
    } else {
      patch(lessonId, "searchKeywords", result.keywords)
      setAiResults(prev => prev[lessonId] ? { ...prev, [lessonId]: { ...prev[lessonId]!, keywords: "" } } : prev)
    }
  }

  async function addMaterial(lessonId: string) {
    const draft = drafts[lessonId] ?? INITIAL_DRAFT
    if (!draft.title.trim() || !draft.url.trim()) return
    setAddingMaterial(lessonId)
    const res = await fetch(`/api/admin/aulas/${lessonId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title.trim(), externalUrl: draft.url.trim(), type: draft.type }),
    })
    if (res.ok) {
      const created: MaterialItem = await res.json()
      setMaterials(prev => ({ ...prev, [lessonId]: [...(prev[lessonId] ?? []), created] }))
      setDrafts(prev => ({ ...prev, [lessonId]: INITIAL_DRAFT }))
    }
    setAddingMaterial(null)
  }

  async function deleteMaterial(lessonId: string, materialId: string) {
    setDeletingMaterial(materialId)
    await fetch(`/api/admin/aulas/${lessonId}/materials/${materialId}`, { method: "DELETE" })
    setMaterials(prev => ({ ...prev, [lessonId]: (prev[lessonId] ?? []).filter(m => m.id !== materialId) }))
    setDeletingMaterial(null)
  }

  function patch(id: string, field: keyof LessonEdits, value: unknown) {
    setEdits(prev => {
      if (!prev[id]) return prev
      return { ...prev, [id]: { ...prev[id], [field]: value } }
    })
  }

  async function save(id: string) {
    setSaving(id)
    await fetch(`/api/admin/aulas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits[id] ?? {}),
    })
    setSaving(null)
    setEditingId(null)
    load()
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Todas as aulas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Carregando..." : `${total} aula${total !== 1 ? "s" : ""} com vídeo Bunny Stream`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Buscar por título ou trilha..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            className="bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={filterTrail}
            onChange={e => setFilterTrail(e.target.value)}
          >
            <option value="all">Todas as trilhas</option>
            {trails.map((trail) => (
              <option key={trail.id} value={trail.id}>{trail.title}</option>
            ))}
          </select>
          <select
            className="bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="DRAFT">Rascunho</option>
          </select>
        </div>
      </div>

      {/* Lessons list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">Nenhuma aula encontrada.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, i) => {
            const isEditing = editingId === lesson.id
            const e = edits[lesson.id] ?? {}
            const thumb = lesson.thumbnail
              ?? (lesson.videoProviderId ? `https://${BUNNY_CDN}/${lesson.videoProviderId}/thumbnail.jpg` : null)
              ?? lesson.videoThumbnailUrl
            const dur = formatSecs(lesson.videoDurationSeconds ?? lesson.durationSeconds)

            const trailColor = (() => {
              const raw = lesson.course?.trailColorRgb?.trim()
              if (!raw) return null
              const m = raw.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
              if (!m) return raw.startsWith("#") ? raw : null
              const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3])
              return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
            })()

            return (
              <div
                key={lesson.id}
                className={cn(
                  "rounded-xl border transition-colors",
                  isEditing
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                )}
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs text-muted-foreground w-10 shrink-0 text-right">
                    {(page - 1) * 30 + i + 1}
                  </span>

                  {/* Thumbnail */}
                  {thumb
                    ? <img src={thumb} alt="" className="w-20 aspect-video rounded object-cover shrink-0 bg-zinc-800" />
                    : <div className="w-20 aspect-video rounded bg-zinc-800 flex items-center justify-center shrink-0">
                        <Play className="h-4 w-4 opacity-20" />
                      </div>
                  }

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {lesson.module && (
                        <span className="text-[11px] text-muted-foreground">{lesson.module.title}</span>
                      )}
                      {dur && <span className="text-[11px] text-muted-foreground">· {dur}</span>}
                      {lesson.isFree && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 rounded-full">
                          Grátis
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] border px-1.5 rounded-full",
                        lesson.status === "PUBLISHED"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                      )}>
                        {lesson.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                  </div>

                  {/* Trail badge */}
                  {lesson.course && (
                    <Link
                      href={`/admin/trilhas/${lesson.course.id}`}
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold border px-2.5 py-1 rounded-full transition-opacity hover:opacity-75"
                      style={trailColor
                        ? { color: trailColor, borderColor: `${trailColor}50`, backgroundColor: `${trailColor}18` }
                        : { color: "#00cfff", borderColor: "#00cfff50", backgroundColor: "#00cfff18" }
                      }
                      onClick={ev => ev.stopPropagation()}
                    >
                      {lesson.course.title}
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </Link>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {lesson.videoProviderId && (
                      <Button size="sm" variant="ghost" asChild title="Assistir">
                        <Link href={`/aula/bunny/${lesson.videoProviderId}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => isEditing ? setEditingId(null) : startEdit(lesson)}
                      title="Editar"
                    >
                      {isEditing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Título</label>
                        <input
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={(e.title as string) ?? lesson.title}
                          onChange={ev => patch(lesson.id, "title", ev.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Bunny Video ID</label>
                        <input
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={(e.bunnyVideoId as string) ?? lesson.videoProviderId ?? ""}
                          onChange={ev => patch(lesson.id, "bunnyVideoId", ev.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
                      <textarea
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        rows={2}
                        value={(e.description as string) ?? lesson.description ?? ""}
                        onChange={ev => patch(lesson.id, "description", ev.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Palavras-chave para busca
                        <span className="ml-1.5 text-muted-foreground/50 font-normal">(separadas por vírgula)</span>
                      </label>
                      <input
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="ps4, erro ce-34878-0, não liga, tela azul"
                        value={(e.searchKeywords as string) ?? lesson.searchKeywords ?? ""}
                        onChange={ev => patch(lesson.id, "searchKeywords", ev.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Thumbnail</label>
                      <ThumbnailField
                        value={(e.thumbnail as string) ?? lesson.thumbnail ?? ""}
                        onChange={v => patch(lesson.id, "thumbnail", v)}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={(e.isFree as boolean) ?? lesson.isFree}
                          onChange={ev => patch(lesson.id, "isFree", ev.target.checked)}
                          className="rounded"
                        />
                        Aula gratuita
                      </label>
                      <select
                        className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        value={(e.status as string) ?? lesson.status}
                        onChange={ev => patch(lesson.id, "status", ev.target.value)}
                      >
                        <option value="PUBLISHED">Publicado</option>
                        <option value="DRAFT">Rascunho</option>
                      </select>

                      {lesson.course && (
                        <Link
                          href={`/admin/trilhas/${lesson.course.id}`}
                          className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          Ver trilha <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>

                    {/* Materials section */}
                    <div className="border-t border-border/40 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                          Arquivos da aula
                        </h3>
                        {loadingMaterials === lesson.id && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>

                      {/* Existing materials */}
                      {(materials[lesson.id] ?? []).map(m => (
                        <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                          <MaterialTypeIcon type={m.type} />
                          <span className="flex-1 truncate text-xs">{m.title}</span>
                          <a href={m.externalUrl ?? m.fileUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => deleteMaterial(lesson.id, m.id)}
                            disabled={deletingMaterial === m.id}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          >
                            {deletingMaterial === m.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </button>
                        </div>
                      ))}

                      {/* Add new material */}
                      <div className="flex gap-2 flex-wrap">
                        <input
                          className="flex-1 min-w-[140px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="Nome do arquivo"
                          value={(drafts[lesson.id] ?? INITIAL_DRAFT).title}
                          onChange={ev => setDrafts(prev => ({ ...prev, [lesson.id]: { ...(prev[lesson.id] ?? INITIAL_DRAFT), title: ev.target.value } }))}
                        />
                        <input
                          className="flex-[2] min-w-[200px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="URL do arquivo"
                          value={(drafts[lesson.id] ?? INITIAL_DRAFT).url}
                          onChange={ev => setDrafts(prev => ({ ...prev, [lesson.id]: { ...(prev[lesson.id] ?? INITIAL_DRAFT), url: ev.target.value } }))}
                        />
                        <select
                          className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          value={(drafts[lesson.id] ?? INITIAL_DRAFT).type}
                          onChange={ev => setDrafts(prev => ({ ...prev, [lesson.id]: { ...(prev[lesson.id] ?? INITIAL_DRAFT), type: ev.target.value } }))}
                        >
                          {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={() => addMaterial(lesson.id)} disabled={addingMaterial === lesson.id}>
                          {addingMaterial === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* ── Transcrição & IA ── */}
                    {(() => {
                      const ts = transcriptionState[lesson.id]
                      const ai = aiResults[lesson.id]
                      const tsStatus = ts?.status ?? "NONE"
                      const isDone = tsStatus === "DONE"
                      const isRunning = tsStatus === "PENDING" || tsStatus === "PROCESSING" || tsStatus === "UPLOADING"
                      const isFailed = tsStatus === "FAILED"
                      const caption = captionStatus[lesson.id]

                      return (
                        <div className="border-t border-border/40 pt-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold flex items-center gap-1.5">
                              <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                              Transcrição & IA
                            </h3>

                            {/* Status badge */}
                            {isRunning && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-full px-2 py-0.5">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {tsStatus === "UPLOADING" ? "Enviando vídeo..." : tsStatus === "PENDING" ? "Na fila..." : "Processando..."}
                              </span>
                            )}
                            {isDone && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">
                                <CheckCircle className="h-3 w-3" />
                                Transcrição pronta
                              </span>
                            )}
                            {isFailed && (
                              <span className="flex items-center gap-1 text-[10px] text-destructive border border-destructive/30 bg-destructive/10 rounded-full px-2 py-0.5">
                                <AlertCircle className="h-3 w-3" />
                                Falhou
                              </span>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-1 ml-auto">
                              {!isDone && (
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => startTranscription(lesson.id)}
                                  disabled={isRunning || startingTranscription === lesson.id}
                                  className="h-7 text-xs"
                                >
                                  {(isRunning || startingTranscription === lesson.id)
                                    ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    : isFailed
                                      ? <RefreshCw className="h-3 w-3 mr-1" />
                                      : <Mic className="h-3 w-3 mr-1" />
                                  }
                                  {isFailed ? "Tentar novamente" : "Transcrever áudio"}
                                </Button>
                              )}
                              {isDone && (
                                <>
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => setShowTranscript(prev => ({ ...prev, [lesson.id]: !prev[lesson.id] }))}
                                    className="h-7 text-xs text-muted-foreground"
                                  >
                                    {showTranscript[lesson.id]
                                      ? <><ChevronUp className="h-3 w-3 mr-1" />Ocultar</>
                                      : <><ChevronDown className="h-3 w-3 mr-1" />Ver transcript</>
                                    }
                                  </Button>
                                  <Button size="sm" variant="ghost" asChild className="h-7 text-xs text-muted-foreground">
                                    <a href={`/api/admin/aulas/${lesson.id}/subtitles?format=vtt`}>
                                      <FileText className="h-3 w-3 mr-1" /> Baixar VTT
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    onClick={() => uploadCaptionToBunny(lesson.id)}
                                    disabled={uploadingCaption === lesson.id}
                                    className="h-7 text-xs text-muted-foreground"
                                  >
                                    {uploadingCaption === lesson.id
                                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      : <Mic className="h-3 w-3 mr-1" />
                                    }
                                    Enviar ao Bunny
                                  </Button>
                                  <Button
                                    size="sm" variant="outline"
                                    onClick={() => generateAi(lesson.id)}
                                    disabled={generatingAi === lesson.id}
                                    className="h-7 text-xs"
                                  >
                                    {generatingAi === lesson.id
                                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      : <BrainCircuit className="h-3 w-3 mr-1" />
                                    }
                                    Gerar com IA
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Error details */}
                          {isFailed && ts?.error && (
                            <p className="text-[10px] text-destructive/80 font-mono bg-destructive/5 border border-destructive/20 rounded px-2 py-1.5 break-all">
                              {ts.error}
                            </p>
                          )}

                          {caption && (
                            <p className={cn(
                              "text-[10px] rounded px-2 py-1.5 border",
                              caption.ok
                                ? "text-emerald-300 bg-emerald-500/5 border-emerald-500/20"
                                : "text-destructive/80 bg-destructive/5 border-destructive/20"
                            )}>
                              {caption.message}
                            </p>
                          )}

                          {/* Transcript viewer */}
                          {isDone && showTranscript[lesson.id] && ts?.text && (
                            <textarea
                              readOnly
                              rows={5}
                              className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-xs text-muted-foreground resize-none focus:outline-none font-mono leading-relaxed"
                              value={ts.text}
                            />
                          )}

                          {/* AI results preview */}
                          {ai && (
                            <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                              <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide flex items-center gap-1">
                                <BrainCircuit className="h-3 w-3" /> Sugestão da IA
                              </p>

                              {ai.description && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-muted-foreground font-medium">Descrição:</p>
                                  <p className="text-xs leading-relaxed">{ai.description}</p>
                                  <div className="flex gap-1.5 pt-0.5">
                                    <button
                                      onClick={() => applyAiField(lesson.id, "description")}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                      <Check className="h-3 w-3" /> Aplicar
                                    </button>
                                    <span className="text-muted-foreground/30">·</span>
                                    <button
                                      onClick={() => setAiResults(prev => prev[lesson.id] ? { ...prev, [lesson.id]: { ...prev[lesson.id]!, description: "" } } : prev)}
                                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <X className="h-3 w-3" /> Descartar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {ai.description && ai.keywords && <div className="border-t border-border/30" />}

                              {ai.keywords && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-muted-foreground font-medium">Palavras-chave:</p>
                                  <p className="text-xs font-mono text-muted-foreground">{ai.keywords}</p>
                                  <div className="flex gap-1.5 pt-0.5">
                                    <button
                                      onClick={() => applyAiField(lesson.id, "keywords")}
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                      <Check className="h-3 w-3" /> Aplicar
                                    </button>
                                    <span className="text-muted-foreground/30">·</span>
                                    <button
                                      onClick={() => setAiResults(prev => prev[lesson.id] ? { ...prev, [lesson.id]: { ...prev[lesson.id]!, keywords: "" } } : prev)}
                                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <X className="h-3 w-3" /> Descartar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => save(lesson.id)} disabled={saving === lesson.id}>
                        {saving === lesson.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          : <Save className="h-3.5 w-3.5 mr-1.5" />
                        }
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {total === 0 ? 0 : (page - 1) * 30 + 1} a {Math.min(page * 30, total)} de {total} aulas
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              <span className="min-w-[120px] text-center text-sm text-foreground">
                Página {page} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
