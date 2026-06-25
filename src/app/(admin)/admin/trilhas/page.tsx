"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Plus, Pencil, Trash2, Loader2, BookOpen, ChevronRight, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadAdminImage } from "@/lib/admin-image-upload"

interface Trilha {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  status: string
  displayOrder: number
  createdAt: string
  _count: { lessons: number }
  courseCategories?: {
    category: {
      id: string
      name: string
      slug: string
      parentId: string | null
    }
  }[]
}

interface CatalogCategoryNode {
  id: string
  name: string
  slug: string
  parentId: string | null
  status: string
  children: CatalogCategoryNode[]
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

// ── Color helpers ────────────────────────────────────────────────────────────

function clampColor(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function rgbStringToHex(value: string): string {
  const raw = value.trim()
  const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  const plainRegex = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/
  const m = raw.match(rgbRegex) ?? raw.match(plainRegex)
  if (!m) return "#00cfff"
  const r = clampColor(Number(m[1])); const g = clampColor(Number(m[2])); const b = clampColor(Number(m[3]))
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

// ── Shared form components ───────────────────────────────────────────────────

function RgbPickerField({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string; hint: string
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

function CoverUploadField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState("")

  async function handlePickFile(file: File | null) {
    if (!file) return
    if (!file.type.startsWith("image/")) { alert("Selecione uma imagem válida."); return }
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
      </div>
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="URL da imagem da capa"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
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

function CategoryMultiSelect({
  categories,
  selectedIds,
  onToggle,
}: {
  categories: CatalogCategoryNode[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/70 p-3">
      {categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        categories.map((root) => (
          <div key={root.id} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selectedIds.includes(root.id)}
                onChange={() => onToggle(root.id)}
                className="rounded"
              />
              {root.name}
            </label>
            {root.children.length > 0 && (
              <div className="grid gap-2 pl-6 sm:grid-cols-2">
                {root.children.map((child) => (
                  <label key={child.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(child.id)}
                      onChange={() => onToggle(child.id)}
                      className="rounded"
                    />
                    {child.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTrilhasPage() {
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [categories, setCategories] = useState<CatalogCategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newStatus, setNewStatus] = useState("PUBLISHED")
  const [newDesc, setNewDesc] = useState("")
  const [newCoverImage, setNewCoverImage] = useState("")
  const [newTrailColorRgb, setNewTrailColorRgb] = useState("")
  const [newBadgeTextColorRgb, setNewBadgeTextColorRgb] = useState("")
  const [newBadgeLabel, setNewBadgeLabel] = useState("")
  const [newSelectedCategoryIds, setNewSelectedCategoryIds] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  // Drag state
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const [trilhasRes, categoriesRes] = await Promise.all([
      fetch("/api/admin/trilhas"),
      fetch("/api/admin/categorias"),
    ])
    if (trilhasRes.ok) {
      const data: Trilha[] = await trilhasRes.json()
      setTrilhas(data.sort((a, b) => a.displayOrder - b.displayOrder))
    }
    if (categoriesRes.ok) {
      const data: CatalogCategoryNode[] = await categoriesRes.json()
      setCategories(data)
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
      body: JSON.stringify({
        title: newTitle.trim(),
        status: newStatus,
        shortDescription: newDesc.trim() || undefined,
        coverImage: newCoverImage.trim() || undefined,
        trailColorRgb: newTrailColorRgb.trim() || undefined,
        badgeTextColorRgb: newBadgeTextColorRgb.trim() || undefined,
        badgeLabel: newBadgeLabel.trim() || undefined,
        selectedCategoryIds: newSelectedCategoryIds,
      }),
    })
    setCreating(false)
    if (res.ok) {
      setNewTitle(""); setNewStatus("PUBLISHED"); setNewDesc("")
      setNewCoverImage(""); setNewTrailColorRgb(""); setNewBadgeTextColorRgb(""); setNewBadgeLabel("")
      setNewSelectedCategoryIds([])
      setShowForm(false)
      load()
    }
  }

  function toggleNewCategory(id: string) {
    setNewSelectedCategoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
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
        <form onSubmit={createTrilha} className="mb-8 rounded-xl border border-border bg-muted/30 p-5 space-y-4">
          <h2 className="font-semibold text-sm">Nova trilha</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <select
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </div>
            <div>
              <RgbPickerField
                label="Cor da trilha (RGB)"
                value={newTrailColorRgb}
                onChange={setNewTrailColorRgb}
                placeholder="rgb(16, 124, 16)"
                hint="Use a paleta ao lado ou digite no formato rgb(r, g, b)."
              />
            </div>
            <div>
              <RgbPickerField
                label="Cor do texto do badge (RGB)"
                value={newBadgeTextColorRgb}
                onChange={setNewBadgeTextColorRgb}
                placeholder="rgb(255, 255, 255)"
                hint="Ex.: branco para badges escuros."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Descrição da trilha (aparece na capa)</label>
            <textarea
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              rows={3}
              placeholder="Ex.: Aprenda a diagnosticar e reparar o PlayStation 5 do zero ao avançado."
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Imagem da capa da trilha</label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Usada como banner de fundo na página da trilha. Envie uma imagem ou cole a URL.
            </p>
            <CoverUploadField value={newCoverImage} onChange={setNewCoverImage} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Badge dos cards de aula</label>
            <input
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ex: Grátis, Xbox, PS5, Novo..."
              value={newBadgeLabel}
              onChange={e => setNewBadgeLabel(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Texto exibido como badge em todos os cards de aula desta trilha. Deixe vazio para não exibir.
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-2">Categorias da trilha</label>
            <CategoryMultiSelect
              categories={categories}
              selectedIds={newSelectedCategoryIds}
              onToggle={toggleNewCategory}
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
                {!!t.courseCategories?.length && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.courseCategories.slice(0, 4).map(({ category }) => (
                      <span key={category.id} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
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
