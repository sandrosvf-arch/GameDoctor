"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CatalogCategoryNode {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  order: number
  status: "ACTIVE" | "INACTIVE"
  children: CatalogCategoryNode[]
  _count?: { courseCategories: number; children: number }
}

interface CategoryDraft {
  name: string
  slug: string
  description: string
  parentId: string
  status: "ACTIVE" | "INACTIVE"
}

const INITIAL_DRAFT: CategoryDraft = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  status: "ACTIVE",
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<CatalogCategoryNode[]>([])
  const [draft, setDraft] = useState<CategoryDraft>(INITIAL_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [editing, setEditing] = useState<Record<string, Partial<CatalogCategoryNode>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/categorias")
    if (res.ok) {
      const data: CatalogCategoryNode[] = await res.json()
      setCategories(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function createCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    const res = await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || undefined,
        parentId: draft.parentId || null,
        status: draft.status,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setDraft(INITIAL_DRAFT)
      load()
    }
  }

  async function seedDefaults() {
    setSeeding(true)
    await fetch("/api/admin/categorias/seed", { method: "POST" })
    setSeeding(false)
    load()
  }

  function patchEditing(id: string, field: keyof CatalogCategoryNode, value: string | number) {
    setEditing((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }))
  }

  async function saveCategory(id: string) {
    setSavingId(id)
    await fetch(`/api/admin/categorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing[id] ?? {}),
    })
    setSavingId(null)
    load()
  }

  async function deleteCategory(id: string) {
    if (!confirm("Excluir esta categoria?")) return
    setDeletingId(id)
    await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" })
    setDeletingId(null)
    load()
  }

  const rootOptions = categories.map((root) => ({ id: root.id, name: root.name }))

  return (
    <div className="max-w-5xl p-6 md:p-8 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estruture o menu do header em até 2 níveis e reaproveite categorias em quantas trilhas precisar.
          </p>
        </div>
        <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
          {seeding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
          Aplicar estrutura inicial
        </Button>
      </div>

      <form onSubmit={createCategory} className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
        <h2 className="text-sm font-semibold">Nova categoria</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nome *</label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={draft.name}
              onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Slug</label>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={draft.slug}
              onChange={(e) => setDraft((current) => ({ ...current, slug: e.target.value }))}
              placeholder="gerado automaticamente se ficar vazio"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Categoria pai</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={draft.parentId}
              onChange={(e) => setDraft((current) => ({ ...current, parentId: e.target.value }))}
            >
              <option value="">Nivel 1 (raiz)</option>
              {rootOptions.map((root) => (
                <option key={root.id} value={root.id}>{root.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={draft.status}
              onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as "ACTIVE" | "INACTIVE" }))}
            >
              <option value="ACTIVE">Ativa</option>
              <option value="INACTIVE">Inativa</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Descrição</label>
          <textarea
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
          />
        </div>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Criar categoria
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((root) => (
            <section key={root.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
              <CategoryEditor
                category={root}
                rootOptions={rootOptions}
                values={editing[root.id]}
                onChange={patchEditing}
                onSave={saveCategory}
                onDelete={deleteCategory}
                savingId={savingId}
                deletingId={deletingId}
              />
              {root.children.length > 0 && (
                <div className="grid gap-3 pl-4 md:grid-cols-2">
                  {root.children.map((child) => (
                    <CategoryEditor
                      key={child.id}
                      category={child}
                      rootOptions={rootOptions}
                      values={editing[child.id]}
                      onChange={patchEditing}
                      onSave={saveCategory}
                      onDelete={deleteCategory}
                      savingId={savingId}
                      deletingId={deletingId}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryEditor({
  category,
  rootOptions,
  values,
  onChange,
  onSave,
  onDelete,
  savingId,
  deletingId,
}: {
  category: CatalogCategoryNode
  rootOptions: { id: string; name: string }[]
  values?: Partial<CatalogCategoryNode>
  onChange: (id: string, field: keyof CatalogCategoryNode, value: string | number) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  savingId: string | null
  deletingId: string | null
}) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={(values?.name as string | undefined) ?? category.name}
            onChange={(e) => onChange(category.id, "name", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Slug</label>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={(values?.slug as string | undefined) ?? category.slug}
            onChange={(e) => onChange(category.id, "slug", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Categoria pai</label>
          <select
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={(values?.parentId as string | null | undefined) ?? category.parentId ?? ""}
            onChange={(e) => onChange(category.id, "parentId", e.target.value)}
          >
            <option value="">Nivel 1 (raiz)</option>
            {rootOptions.filter((root) => root.id !== category.id).map((root) => (
              <option key={root.id} value={root.id}>{root.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Ordem</label>
          <input
            type="number"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={(values?.order as number | undefined) ?? category.order}
            onChange={(e) => onChange(category.id, "order", Number(e.target.value))}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="mr-3">Status: {category.status === "ACTIVE" ? "Ativa" : "Inativa"}</span>
          {category._count && <span>Trilhas ligadas: {category._count.courseCategories}</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onSave(category.id)} disabled={savingId === category.id}>
            {savingId === category.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(category.id)}
            disabled={deletingId === category.id}
          >
            {deletingId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
