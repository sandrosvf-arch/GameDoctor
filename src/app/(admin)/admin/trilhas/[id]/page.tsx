"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Plus, Trash2, Loader2, ChevronLeft, GripVertical,
  Play, Save, ExternalLink, Eye, EyeOff,
  Paperclip, FileText, FileSpreadsheet, Link2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadAdminImage } from "@/lib/admin-image-upload"

const BUNNY_CDN = "vz-38444944-922.b-cdn.net"
const BUNNY_LIBRARY_ID = "659969"

interface Lesson {
  id: string
  title: string
  description: string | null
  videoDurationSeconds: number | null
  durationSeconds: number | null
  videoProvider: string | null
  videoProviderId: string | null
  videoEmbedUrl: string | null
  videoThumbnailUrl: string | null
  thumbnail: string | null
  isFree: boolean
  status: string
  order: number
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

interface Trilha {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  description: string | null
  status: string
  coverImage: string | null
  trailColorRgb: string | null
  badgeTextColorRgb: string | null
  badgeLabel: string | null
  modules: { id: string; title: string; lessons: Lesson[] }[]
}

function formatSecs(s: number | null | undefined) {
  if (!s) return ""
  const m = Math.floor(s / 60); const r = s % 60
  return r > 0 ? `${m} min ${r}s` : `${m} min`
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}

function clampColor(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function rgbStringToHex(value: string): string {
  const raw = value.trim()
  const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  const plainRegex = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/
  const m = raw.match(rgbRegex) ?? raw.match(plainRegex)
  if (!m) return "#00cfff"

  const r = clampColor(Number(m[1]))
  const g = clampColor(Number(m[2]))
  const b = clampColor(Number(m[3]))
  const toHex = (v: number) => v.toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToRgbString(hex: string): string {
  const clean = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "rgb(0, 207, 255)"
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

function RgbPickerField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  hint: string
}) {
  const hexValue = rgbStringToHex(value)
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <label className="h-10 w-12 shrink-0 rounded-lg border border-border overflow-hidden cursor-pointer bg-zinc-900 relative">
          <input
            type="color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={hexValue}
            onChange={(e) => onChange(hexToRgbString(e.target.value))}
            aria-label={label}
          />
          <span className="block h-full w-full" style={{ backgroundColor: hexValue }} />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function CoverUploadField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState("")

  async function handlePickFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("Selecione uma imagem válida.")
      return
    }
    setUploading(true)
    setFileName(file.name)
    try {
      const url = await uploadAdminImage(file, "trails")
      onChange(url)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível carregar a imagem.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
          {uploading ? "Enviando..." : "Selecionar imagem"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              void handlePickFile(e.target.files?.[0] ?? null)
              e.currentTarget.value = ""
            }}
          />
        </label>
        {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
        {value && value.startsWith("data:") && (
          <span className="text-xs text-emerald-500">Arquivo pronto para salvar</span>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="URL da imagem da capa"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <img
            src={value}
            alt="preview"
            className="w-20 aspect-video rounded object-cover bg-zinc-800 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
          />
        )}
      </div>
    </div>
  )
}

export default function EditarTrilhaPage({ params }: { params: Promise<{ id: string }> }) {
  const [trilhaId, setTrilhaId] = useState("")
  const [trilha, setTrilha] = useState<Trilha | null>(null)
  const [loading, setLoading] = useState(true)

  // Trilha edit state
  const [editTitle, setEditTitle] = useState("")
  const [editStatus, setEditStatus] = useState("DRAFT")
  const [editShortDescription, setEditShortDescription] = useState("")
  const [editCoverImage, setEditCoverImage] = useState("")
  const [editTrailColorRgb, setEditTrailColorRgb] = useState("")
  const [editBadgeTextColorRgb, setEditBadgeTextColorRgb] = useState("")
  const [editBadgeLabel, setEditBadgeLabel] = useState("")
  const [savingTrilha, setSavingTrilha] = useState(false)

  // New lesson form
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newBunnyId, setNewBunnyId] = useState("")
  const [newThumbnail, setNewThumbnail] = useState("")
  const [newIsFree, setNewIsFree] = useState(true)
  const [creatingLesson, setCreatingLesson] = useState(false)

  // Lesson inline edit
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [lessonEdits, setLessonEdits] = useState<Record<string, Partial<Lesson & { bunnyVideoId: string; thumbnail: string }>>>({})
  const [savingLesson, setSavingLesson] = useState<string | null>(null)
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null)

  // Materials
  const [lessonMaterials, setLessonMaterials] = useState<Record<string, MaterialItem[]>>({})
  const [loadingMaterials, setLoadingMaterials] = useState<string | null>(null)
  const [deletingMaterial, setDeletingMaterial] = useState<string | null>(null)
  const [materialDrafts, setMaterialDrafts] = useState<Record<string, NewMaterialDraft>>({})
  const [addingMaterial, setAddingMaterial] = useState<string | null>(null)

  // Default cover images per trail slug (shown when no DB value is set)
  const trailDefaultImages: Record<string, string> = {
    "inicio-da-jornada": "/thumbs/t01.jpg",
    "playstation-5": "/thumbs/ps5.png",
    "xbox-series-xs": "/thumbs/t08.jpg",
    "nintendo-switch": "/thumbs/t13.jpg",
    "fundamentos-de-eletronica": "/thumbs/t18.jpg",
  }

  const load = useCallback(async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/trilhas/${id}`)
    if (res.ok) {
      const data: Trilha = await res.json()
      setTrilha(data)
      setEditTitle(data.title)
      setEditStatus(data.status)
      setEditShortDescription(data.shortDescription ?? "")
      setEditCoverImage(data.coverImage ?? trailDefaultImages[data.slug] ?? "")
      setEditTrailColorRgb(data.trailColorRgb ?? "")
      setEditBadgeTextColorRgb(data.badgeTextColorRgb ?? "")
      setEditBadgeLabel(data.badgeLabel ?? "")
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    params.then(p => { setTrilhaId(p.id); load(p.id) })
  }, [params, load])

  async function saveTrilha(e: React.FormEvent) {
    e.preventDefault()
    setSavingTrilha(true)
    const res = await fetch(`/api/admin/trilhas/${trilhaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        status: editStatus,
        shortDescription: editShortDescription || undefined,
        coverImage: editCoverImage || undefined,
        trailColorRgb: editTrailColorRgb,
        badgeTextColorRgb: editBadgeTextColorRgb,
        badgeLabel: editBadgeLabel || undefined,
      }),
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      alert(payload?.error ?? "Não foi possível salvar as cores da trilha.")
      setSavingTrilha(false)
      return
    }
    setSavingTrilha(false)
    load(trilhaId)
  }

  async function createLesson(e: React.FormEvent) {
    e.preventDefault()
    if (!newLessonTitle.trim()) return
    setCreatingLesson(true)
    await fetch(`/api/admin/trilhas/${trilhaId}/aulas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newLessonTitle.trim(),
        bunnyVideoId: newBunnyId.trim() || undefined,
        thumbnail: newThumbnail.trim() || undefined,
        isFree: newIsFree,
      }),
    })
    setCreatingLesson(false)
    setNewLessonTitle(""); setNewBunnyId(""); setNewThumbnail(""); setNewIsFree(true)
    setShowLessonForm(false)
    load(trilhaId)
  }

  async function saveLesson(lessonId: string) {
    setSavingLesson(lessonId)
    const edits = lessonEdits[lessonId] ?? {}
    await fetch(`/api/admin/trilhas/${trilhaId}/aulas/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits),
    })
    setSavingLesson(null)
    setEditingLesson(null)
    load(trilhaId)
  }

  async function deleteLesson(lessonId: string) {
    if (!confirm("Excluir esta aula?")) return
    setDeletingLesson(lessonId)
    await fetch(`/api/admin/trilhas/${trilhaId}/aulas/${lessonId}`, { method: "DELETE" })
    setDeletingLesson(null)
    load(trilhaId)
  }

  function startEdit(lesson: Lesson) {
    setEditingLesson(lesson.id)
    setLessonEdits(prev => ({
      ...prev,
      [lesson.id]: {
        title: lesson.title,
        description: lesson.description ?? "",
        bunnyVideoId: lesson.videoProviderId ?? "",
        thumbnail: lesson.thumbnail ?? "",
        isFree: lesson.isFree,
        status: lesson.status,
      },
    }))
    if (!lessonMaterials[lesson.id]) {
      setLoadingMaterials(lesson.id)
      fetch(`/api/admin/aulas/${lesson.id}/materials`)
        .then(r => r.ok ? r.json() : [])
        .then((data: MaterialItem[]) => setLessonMaterials(prev => ({ ...prev, [lesson.id]: data })))
        .finally(() => setLoadingMaterials(null))
    }
  }

  async function addMaterial(lessonId: string) {
    const draft = materialDrafts[lessonId] ?? INITIAL_DRAFT
    if (!draft.title.trim() || !draft.url.trim()) return
    setAddingMaterial(lessonId)
    const res = await fetch(`/api/admin/aulas/${lessonId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title.trim(), externalUrl: draft.url.trim(), type: draft.type }),
    })
    if (res.ok) {
      const created: MaterialItem = await res.json()
      setLessonMaterials(prev => ({ ...prev, [lessonId]: [...(prev[lessonId] ?? []), created] }))
      setMaterialDrafts(prev => ({ ...prev, [lessonId]: INITIAL_DRAFT }))
    }
    setAddingMaterial(null)
  }

  async function deleteMaterial(lessonId: string, materialId: string) {
    setDeletingMaterial(materialId)
    await fetch(`/api/admin/aulas/${lessonId}/materials/${materialId}`, { method: "DELETE" })
    setLessonMaterials(prev => ({ ...prev, [lessonId]: (prev[lessonId] ?? []).filter(m => m.id !== materialId) }))
    setDeletingMaterial(null)
  }

  function patchEdit(lessonId: string, field: string, value: unknown) {
    setLessonEdits(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], [field]: value } }))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (!trilha) return (
    <div className="p-8 text-muted-foreground">Trilha não encontrada.</div>
  )

  const allLessons = trilha.modules.flatMap(m => m.lessons)

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" asChild>
          <Link href="/admin/trilhas">
            <ChevronLeft className="h-4 w-4 mr-1" /> Trilhas
          </Link>
        </Button>
        <h1 className="text-xl font-bold truncate">{trilha.title}</h1>
      </div>

      {/* ── Trilha settings ── */}
      <section className="rounded-xl border border-border bg-muted/20 p-5">
        <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Configurações da trilha</h2>
        <form onSubmit={saveTrilha} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Título *</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </div>
            <div>
              <RgbPickerField
                label="Cor da trilha (RGB)"
                value={editTrailColorRgb}
                onChange={setEditTrailColorRgb}
                placeholder="rgb(16, 124, 16)"
                hint="Use a paleta ao lado ou digite no formato rgb(r, g, b)."
              />
            </div>
            <div>
              <RgbPickerField
                label="Cor do texto do badge (RGB)"
                value={editBadgeTextColorRgb}
                onChange={setEditBadgeTextColorRgb}
                placeholder="rgb(255, 255, 255)"
                hint="Ex.: branco para badges escuros."
              />
            </div>
          </div>

          {/* Descrição da capa */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição da trilha (aparece na capa)</label>
            <textarea
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              rows={3}
              placeholder="Ex.: Aprenda a diagnosticar e reparar o PlayStation 5 do zero ao avançado."
              value={editShortDescription}
              onChange={e => setEditShortDescription(e.target.value)}
            />
          </div>

          {/* Imagem da capa da trilha */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Imagem da capa da trilha</label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Usada como banner de fundo na página da trilha. Envie uma imagem ou cole a URL.
            </p>
            <CoverUploadField value={editCoverImage} onChange={setEditCoverImage} />
          </div>

          {/* Badge das aulas */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Badge dos cards de aula</label>
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ex: Grátis, Xbox, PS5, Novo..."
              value={editBadgeLabel}
              onChange={e => setEditBadgeLabel(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Texto exibido como badge em todos os cards de aula desta trilha. Deixe vazio para não exibir.
            </p>
          </div>

          <Button type="submit" size="sm" disabled={savingTrilha}>
            {savingTrilha ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Salvar alterações
          </Button>
        </form>
      </section>

      {/* ── Aulas ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Aulas ({allLessons.length})
          </h2>
          <Button size="sm" onClick={() => setShowLessonForm(!showLessonForm)}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova aula
          </Button>
        </div>

        {/* New lesson form */}
        {showLessonForm && (
          <form onSubmit={createLesson} className="mb-4 rounded-xl border border-border bg-muted/30 p-5 space-y-3">
            <h3 className="font-medium text-sm">Nova aula</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Título *</label>
                <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="ex: Introdução ao PS5" value={newLessonTitle}
                  onChange={e => setNewLessonTitle(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bunny Video ID</label>
                <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={newBunnyId} onChange={e => { setNewBunnyId(e.target.value); setNewThumbnail("") }} />
              </div>
            </div>

            {/* Capa */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Capa pronta
              </label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Envie uma imagem pronta ou cole a URL da capa.
              </p>
              <CoverUploadField value={newThumbnail} onChange={setNewThumbnail} />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={newIsFree} onChange={e => setNewIsFree(e.target.checked)} className="rounded" />
              Aula gratuita (visível sem assinatura)
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={creatingLesson}>
                {creatingLesson && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Criar aula
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowLessonForm(false)}>Cancelar</Button>
            </div>
          </form>
        )}

        {/* Lessons list */}
        <div className="space-y-2">
          {allLessons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhuma aula ainda. Clique em &quot;Nova aula&quot; para começar.</p>
          )}
          {allLessons.map((lesson, i) => {
            const isEditing = editingLesson === lesson.id
            const edits = lessonEdits[lesson.id] ?? {}
            const dur = formatSecs(lesson.videoDurationSeconds ?? lesson.durationSeconds)
            const displayThumb = lesson.thumbnail
              ?? (lesson.videoProviderId ? `https://${BUNNY_CDN}/${lesson.videoProviderId}/thumbnail.jpg` : null)
              ?? lesson.videoThumbnailUrl

            const editBunnyId = (edits.bunnyVideoId as string) ?? lesson.videoProviderId ?? ""
            const editThumb = (edits.thumbnail as string | undefined) !== undefined
              ? (edits.thumbnail as string)
              : (lesson.thumbnail ?? "")
            const editDuration = lesson.videoDurationSeconds ?? lesson.durationSeconds ?? 300

            return (
              <div key={lesson.id} className={cn(
                "rounded-xl border transition-colors",
                isEditing ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
              )}>
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 opacity-30" />
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  {displayThumb
                    ? <img src={displayThumb} alt="" className="w-16 aspect-video rounded object-cover shrink-0 bg-zinc-800" />
                    : <div className="w-16 aspect-video rounded bg-zinc-800 flex items-center justify-center shrink-0"><Play className="h-4 w-4 opacity-20" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {dur && <span className="text-xs text-muted-foreground shrink-0">{dur}</span>}
                      {lesson.isFree && <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 rounded-full shrink-0">Grátis</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {lesson.videoEmbedUrl && (
                      <Button size="sm" variant="ghost" asChild title="Visualizar">
                        <Link href={`/aula/bunny/${lesson.videoProviderId}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => isEditing ? setEditingLesson(null) : startEdit(lesson)} title="Editar">
                      {isEditing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                      onClick={() => deleteLesson(lesson.id)} disabled={deletingLesson === lesson.id}>
                      {deletingLesson === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Título</label>
                        <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={(edits.title as string) ?? lesson.title}
                          onChange={e => patchEdit(lesson.id, "title", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Bunny Video ID</label>
                        <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          value={editBunnyId}
                          onChange={e => patchEdit(lesson.id, "bunnyVideoId", e.target.value)} />
                      </div>
                    </div>

                    {/* Descrição */}
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Descrição</label>
                      <textarea
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        rows={2}
                        value={(edits.description as string) ?? lesson.description ?? ""}
                        onChange={e => patchEdit(lesson.id, "description", e.target.value)}
                      />
                    </div>

                    {/* Capa */}
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Capa pronta
                      </label>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Envie uma imagem pronta ou cole a URL da capa.
                      </p>
                      <CoverUploadField
                        value={editThumb}
                        onChange={(value) => patchEdit(lesson.id, "thumbnail", value)}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox"
                          checked={(edits.isFree as boolean) ?? lesson.isFree}
                          onChange={e => patchEdit(lesson.id, "isFree", e.target.checked)} className="rounded" />
                        Aula gratuita
                      </label>
                      <select className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        value={(edits.status as string) ?? lesson.status}
                        onChange={e => patchEdit(lesson.id, "status", e.target.value)}>
                        <option value="PUBLISHED">Publicado</option>
                        <option value="DRAFT">Rascunho</option>
                      </select>
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

                      {(lessonMaterials[lesson.id] ?? []).map(m => (
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

                      <div className="flex gap-2 flex-wrap">
                        <input
                          className="flex-1 min-w-[140px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="Nome do arquivo"
                          value={(materialDrafts[lesson.id] ?? INITIAL_DRAFT).title}
                          onChange={ev => setMaterialDrafts(prev => ({ ...prev, [lesson.id]: { ...(prev[lesson.id] ?? INITIAL_DRAFT), title: ev.target.value } }))}
                        />
                        <input
                          className="flex-[2] min-w-[200px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                          placeholder="URL do arquivo"
                          value={(materialDrafts[lesson.id] ?? INITIAL_DRAFT).url}
                          onChange={ev => setMaterialDrafts(prev => ({ ...prev, [lesson.id]: { ...(prev[lesson.id] ?? INITIAL_DRAFT), url: ev.target.value } }))}
                        />
                        <select
                          className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          value={(materialDrafts[lesson.id] ?? INITIAL_DRAFT).type}
                          onChange={ev => setMaterialDrafts(prev => ({ ...prev, [lesson.id]: { ...(prev[lesson.id] ?? INITIAL_DRAFT), type: ev.target.value } }))}
                        >
                          {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <Button size="sm" variant="outline" onClick={() => addMaterial(lesson.id)} disabled={addingMaterial === lesson.id}>
                          {addingMaterial === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => saveLesson(lesson.id)} disabled={savingLesson === lesson.id}>
                        {savingLesson === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingLesson(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
