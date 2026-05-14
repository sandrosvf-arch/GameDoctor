"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Plus, Trash2, Loader2, ChevronLeft, GripVertical,
  Play, Save, ExternalLink, Eye, EyeOff, Film, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const BUNNY_CDN = "vz-38444944-922.b-cdn.net"
const BUNNY_LIBRARY_ID = "659969"

interface Lesson {
  id: string
  title: string
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

interface Trilha {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  description: string | null
  status: string
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

function FramePicker({
  bunnyId,
  durationSecs,
  onSelect,
  onClose,
}: {
  bunnyId: string
  durationSecs: number
  onSelect: (url: string) => void
  onClose: () => void
}) {
  // currentTime is captured from the Bunny player via postMessage, or set manually
  const [currentTime, setCurrentTime] = useState(Math.round((durationSecs || 60) / 4))
  const [hasEvent, setHasEvent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Listen for timeupdate / pause events from the Bunny iframe player
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== "https://iframe.mediadelivery.net") return
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data
        if (data && typeof data.time === "number") {
          setCurrentTime(Math.round(data.time))
          setHasEvent(true)
        }
      } catch { /* ignore malformed messages */ }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  async function handleUseFrame() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/set-thumbnail?videoId=${encodeURIComponent(bunnyId)}&time=${currentTime}`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Falha")
      const { thumbnailUrl } = await res.json()
      onSelect(thumbnailUrl)
    } catch {
      setError("Erro ao salvar thumbnail. Tente novamente.")
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Escolher frame da capa</p>

      <p className="text-xs text-muted-foreground">
        Reproduza o vídeo e <strong>pause</strong> no frame desejado. O tempo é capturado automaticamente.
      </p>

      {/* Bunny embed player */}
      <div className="relative w-full rounded-lg overflow-hidden bg-zinc-900" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyId}?autoplay=false&responsive=true`}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* Time indicator + manual fallback */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {hasEvent ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Posição atual: </span>
              <span className="font-mono font-medium">{fmtTime(currentTime)}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Pause o vídeo para capturar o frame automaticamente
            </p>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          Ou insira (seg):
          <input
            type="number"
            min={0}
            max={durationSecs || 9999}
            step={1}
            value={currentTime}
            onChange={(e) => { setCurrentTime(Number(e.target.value)); setHasEvent(true) }}
            className="w-20 h-7 rounded border border-input bg-background px-2 text-sm text-center font-mono"
          />
        </label>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleUseFrame}
          className="inline-flex items-center gap-1.5 justify-center rounded-md text-sm font-medium h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Usar este frame
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
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
  const [savingTrilha, setSavingTrilha] = useState(false)

  // New lesson form
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newBunnyId, setNewBunnyId] = useState("")
  const [newThumbnail, setNewThumbnail] = useState("")
  const [newIsFree, setNewIsFree] = useState(true)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [newFramePickerOpen, setNewFramePickerOpen] = useState(false)

  // Lesson inline edit
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [lessonEdits, setLessonEdits] = useState<Record<string, Partial<Lesson & { bunnyVideoId: string; thumbnail: string }>>>({})
  const [savingLesson, setSavingLesson] = useState<string | null>(null)
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null)
  const [framePickerOpen, setFramePickerOpen] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/trilhas/${id}`)
    if (res.ok) {
      const data: Trilha = await res.json()
      setTrilha(data)
      setEditTitle(data.title)
      setEditStatus(data.status)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    params.then(p => { setTrilhaId(p.id); load(p.id) })
  }, [params, load])

  async function saveTrilha(e: React.FormEvent) {
    e.preventDefault()
    setSavingTrilha(true)
    await fetch(`/api/admin/trilhas/${trilhaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, status: editStatus }),
    })
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
    setNewFramePickerOpen(false)
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
    setFramePickerOpen(null)
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
    setFramePickerOpen(null)
    setLessonEdits(prev => ({
      ...prev,
      [lesson.id]: {
        title: lesson.title,
        bunnyVideoId: lesson.videoProviderId ?? "",
        thumbnail: lesson.thumbnail ?? "",
        isFree: lesson.isFree,
        status: lesson.status,
      },
    }))
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
                  value={newBunnyId} onChange={e => { setNewBunnyId(e.target.value); setNewFramePickerOpen(false); setNewThumbnail("") }} />
              </div>
            </div>

            {/* Capa */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Capa</label>
                {newBunnyId.trim() && (
                  <button type="button" onClick={() => setNewFramePickerOpen(o => !o)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                    <Film className="h-3 w-3" /> Escolher frame do vídeo
                  </button>
                )}
              </div>
              {newFramePickerOpen && newBunnyId.trim() ? (
                <FramePicker
                  bunnyId={newBunnyId.trim()}
                  durationSecs={300}
                  onSelect={url => { setNewThumbnail(url); setNewFramePickerOpen(false) }}
                  onClose={() => setNewFramePickerOpen(false)}
                />
              ) : (
                <div className="flex gap-2 items-center">
                  <input className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="URL da imagem (ou escolha um frame acima)"
                    value={newThumbnail} onChange={e => setNewThumbnail(e.target.value)} />
                  {newThumbnail && (
                    <img src={newThumbnail} alt="preview" className="w-20 aspect-video rounded object-cover bg-zinc-800 shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                  )}
                </div>
              )}
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
            const editThumb = (edits.thumbnail as string) ?? lesson.thumbnail ?? ""
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
                          onChange={e => { patchEdit(lesson.id, "bunnyVideoId", e.target.value); setFramePickerOpen(null) }} />
                      </div>
                    </div>

                    {/* Capa */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Capa</label>
                        {editBunnyId && (
                          <button type="button"
                            onClick={() => setFramePickerOpen(framePickerOpen === lesson.id ? null : lesson.id)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                            <Film className="h-3 w-3" /> Escolher frame do vídeo
                          </button>
                        )}
                      </div>
                      {framePickerOpen === lesson.id ? (
                        <FramePicker
                          bunnyId={editBunnyId}
                          durationSecs={editDuration}
                          onSelect={url => { patchEdit(lesson.id, "thumbnail", url); setFramePickerOpen(null) }}
                          onClose={() => setFramePickerOpen(null)}
                        />
                      ) : (
                        <div className="flex gap-2 items-center">
                          <input className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="URL da imagem (ou escolha um frame acima)"
                            value={editThumb}
                            onChange={e => patchEdit(lesson.id, "thumbnail", e.target.value)} />
                          {editThumb && (
                            <img src={editThumb} alt="preview" className="w-20 aspect-video rounded object-cover bg-zinc-800 shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                          )}
                        </div>
                      )}
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
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveLesson(lesson.id)} disabled={savingLesson === lesson.id}>
                        {savingLesson === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingLesson(null); setFramePickerOpen(null) }}>Cancelar</Button>
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
