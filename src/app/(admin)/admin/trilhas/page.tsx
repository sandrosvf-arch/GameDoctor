"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, Loader2, BookOpen, ChevronRight, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Trilha {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  status: string
  displayOrder: number
  createdAt: string
  _count: { lessons: number }
}

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
}
const statusColor: Record<string, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  PUBLISHED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ARCHIVED: "bg-red-500/15 text-red-400 border-red-500/30",
}

export default function AdminTrilhasPage() {
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  // Drag state
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/trilhas")
    if (res.ok) {
      const data: Trilha[] = await res.json()
      setTrilhas(data.sort((a, b) => a.displayOrder - b.displayOrder))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createTrilha(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await fetch("/api/admin/trilhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), shortDescription: newDesc.trim() || undefined }),
    })
    setCreating(false)
    if (res.ok) {
      setNewTitle(""); setNewDesc(""); setShowForm(false)
      load()
    }
  }

  async function deleteTrilha(id: string) {
    if (!confirm("Excluir esta trilha e todas as aulas?")) return
    setDeletingId(id)
    await fetch(`/api/admin/trilhas/${id}`, { method: "DELETE" })
    setDeletingId(null)
    load()
  }

  // ── Drag and Drop ──────────────────────────────────────────────────────────
  function handleDragStart(i: number) {
    dragIndex.current = i
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    setDragOver(i)
  }

  async function handleDrop(targetIndex: number) {
    setDragOver(null)
    const from = dragIndex.current
    dragIndex.current = null
    if (from === null || from === targetIndex) return

    const reordered = [...trilhas]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIndex, 0, moved)
    setTrilhas(reordered)

    setSavingOrder(true)
    await fetch("/api/admin/trilhas/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordered.map((t, idx) => ({ id: t.id, displayOrder: idx }))),
    })
    setSavingOrder(false)
  }

  function handleDragEnd() {
    dragIndex.current = null
    setDragOver(null)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Trilhas de Aprendizado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arraste para definir a ordem na home.
            {savingOrder && <span className="ml-2 text-primary animate-pulse">Salvando...</span>}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nova trilha
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={createTrilha} className="mb-8 rounded-xl border border-border bg-muted/30 p-5 space-y-3">
          <h2 className="font-semibold text-sm">Nova trilha</h2>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Título *</label>
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="ex: PlayStation 5 — Do básico ao avançado"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição curta</label>
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Uma linha descrevendo a trilha"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Criar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : trilhas.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhuma trilha criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trilhas.map((t, i) => (
            <div
              key={t.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-3 transition-all select-none",
                dragOver === i && dragIndex.current !== i
                  ? "border-primary/60 bg-primary/5 shadow-md"
                  : "border-border hover:bg-muted/40",
                dragIndex.current === i ? "opacity-40" : "opacity-100",
              )}
            >
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
                <GripVertical className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.title}</p>
                {t.shortDescription && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.shortDescription}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{t._count.lessons} aula{t._count.lessons !== 1 ? "s" : ""}</p>
              </div>
              <span className={cn("text-xs border px-2 py-0.5 rounded-full shrink-0", statusColor[t.status] ?? statusColor.DRAFT)}>
                {statusLabel[t.status] ?? t.status}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/admin/trilhas/${t.id}`}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTrilha(t.id)}
                  disabled={deletingId === t.id}
                >
                  {deletingId === t.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2 opacity-50">Arraste pelo ⠿ para reordenar</p>
        </div>
      )}
    </div>
  )
}
