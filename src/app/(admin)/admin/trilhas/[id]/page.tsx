"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Plus, Trash2, Loader2, ChevronLeft, GripVertical,
  Play, Save, ExternalLink, Eye, EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

export default function EditarTrilhaPage({ params }: { params: Promise<{ id: string }> }) {
  const [trilhaId, setTrilhaId] = useState("")
  const [trilha, setTrilha] = useState<Trilha | null>(null)
  const [loading, setLoading] = useState(true)

  // Trilha edit state
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editShortDesc, setEditShortDesc] = useState("")
  const [editStatus, setEditStatus] = useState("DRAFT")
  const [savingTrilha, setSavingTrilha] = useState(false)

  // New lesson form
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newLessonDesc, setNewLessonDesc] = useState("")
  const [newBunnyId, setNewBunnyId] = useState("")
  const [newIsFree, setNewIsFree] = useState(true)
  const [creatingLesson, setCreatingLesson] = useState(false)

  // Lesson inline edit
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [lessonEdits, setLessonEdits] = useState<Record<string, Partial<Lesson & { bunnyVideoId: string }>>>({})
  const [savingLesson, setSavingLesson] = useState<string | null>(null)
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/trilhas/${id}`)
    if (res.ok) {
      const data: Trilha = await res.json()
      setTrilha(data)
      setEditTitle(data.title)
      setEditDesc(data.description ?? "")
      setEditShortDesc(data.shortDescription ?? "")
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
      body: JSON.stringify({ title: editTitle, shortDescription: editShortDesc, description: editDesc, status: editStatus }),
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
        description: newLessonDesc.trim() || undefined,
        bunnyVideoId: newBunnyId.trim() || undefined,
        isFree: newIsFree,
      }),
    })
    setCreatingLesson(false)
    setNewLessonTitle(""); setNewLessonDesc(""); setNewBunnyId(""); setNewIsFree(true)
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
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição curta</label>
            <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Uma linha que aparece nos carrosséis"
              value={editShortDesc} onChange={e => setEditShortDesc(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição completa</label>
            <textarea rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              value={editDesc} onChange={e => setEditDesc(e.target.value)} />
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
                  placeholder="ex: Introdução" value={newLessonTitle}
                  onChange={e => setNewLessonTitle(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bunny Video ID</label>
                <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={newBunnyId} onChange={e => setNewBunnyId(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Legenda / Descrição</label>
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="ex: Início da Jornada"
                value={newLessonDesc} onChange={e => setNewLessonDesc(e.target.value)} />
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

            return (
              <div key={lesson.id} className={cn(
                "rounded-xl border transition-colors",
                isEditing ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
              )}>
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 opacity-30" />
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  {lesson.videoThumbnailUrl
                    ? <img src={lesson.videoThumbnailUrl} alt="" className="w-16 aspect-video rounded object-cover shrink-0 bg-zinc-800" />
                    : <div className="w-16 aspect-video rounded bg-zinc-800 flex items-center justify-center shrink-0"><Play className="h-4 w-4 opacity-20" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lesson.description && <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>}
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
                          value={(edits.bunnyVideoId as string) ?? lesson.videoProviderId ?? ""}
                          onChange={e => patchEdit(lesson.id, "bunnyVideoId", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Legenda / Descrição</label>
                      <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="ex: Início da Jornada"
                        value={(edits.description as string) ?? lesson.description ?? ""}
                        onChange={e => patchEdit(lesson.id, "description", e.target.value)} />
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
