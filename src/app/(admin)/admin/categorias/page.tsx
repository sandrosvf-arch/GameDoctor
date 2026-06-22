"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Wand2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CatalogCategoryNode {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  order: number
  status: "ACTIVE" | "INACTIVE"
  showInMenu: boolean
  children: CatalogCategoryNode[]
  _count?: { courseCategories: number; children: number }
}

interface CategoryDraft {
  name: string
  slug: string
  description: string
  parentId: string
  status: "ACTIVE" | "INACTIVE"
  showInMenu: boolean
}

const INITIAL_DRAFT: CategoryDraft = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  status: "ACTIVE",
  showInMenu: true,
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<CatalogCategoryNode[]>([])
  const [draft, setDraft] = useState<CategoryDraft>(INITIAL_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
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

  const rootOptions = useMemo(
    () => categories.map((root) => ({ id: root.id, name: root.name })),
    [categories]
  )

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
        showInMenu: draft.showInMenu,
      }),
    })
    setSaving(false)

    if (res.ok) {
      setDraft(INITIAL_DRAFT)
      setShowCreate(false)
      load()
    }
  }

  async function seedDefaults() {
    setSeeding(true)
    await fetch("/api/admin/categorias/seed", { method: "POST" })
    setSeeding(false)
    load()
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function startEditing(category: CatalogCategoryNode) {
    setEditingId(category.id)
    setEditing((current) => ({
      ...current,
      [category.id]: {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        parentId: category.parentId ?? "",
        order: category.order,
        status: category.status,
        showInMenu: category.showInMenu,
      },
    }))
  }

  function cancelEditing() {
    setEditingId(null)
  }

  function patchEditing(
    id: string,
    field: keyof CatalogCategoryNode,
    value: string | number | boolean
  ) {
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
    setEditingId(null)
    load()
  }

  async function deleteCategory(id: string) {
    if (!confirm("Excluir esta categoria?")) return
    setDeletingId(id)
    await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" })
    setDeletingId(null)
    if (editingId === id) setEditingId(null)
    load()
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estruture o menu em 2 níveis e escolha o que aparece no header.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Aplicar estrutura inicial
          </Button>
          <Button onClick={() => setShowCreate((current) => !current)}>
            {showCreate ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showCreate ? "Fechar" : "Criar categoria"}
          </Button>
        </div>
      </div>

      {showCreate && (
        <section className="rounded-2xl border border-border bg-card/70 shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Nova categoria</h2>
          </div>
          <form onSubmit={createCategory} className="space-y-4 px-5 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nome *">
                <input
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.name}
                  onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Slug">
                <input
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.slug}
                  onChange={(e) => setDraft((current) => ({ ...current, slug: e.target.value }))}
                  placeholder="gerado automaticamente"
                />
              </Field>
              <Field label="Categoria pai">
                <select
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.parentId}
                  onChange={(e) => setDraft((current) => ({ ...current, parentId: e.target.value }))}
                >
                  <option value="">Nível 1 (raiz)</option>
                  {rootOptions.map((root) => (
                    <option key={root.id} value={root.id}>{root.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.status}
                  onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as "ACTIVE" | "INACTIVE" }))}
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="INACTIVE">Inativa</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
              <Field label="Descrição">
                <textarea
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.description}
                  onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
                />
              </Field>
              <div className="flex items-end">
                <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.showInMenu}
                    onChange={(e) => setDraft((current) => ({ ...current, showInMenu: e.target.checked }))}
                    className="rounded"
                  />
                  Exibir no menu
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Criar categoria
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card/70 shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Listagem de categorias</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          <div className="p-5">
            <div className="overflow-hidden rounded-xl border border-border bg-background/40">
              <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_180px] gap-4 border-b border-border bg-white/[0.03] px-4 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div>Nome da categoria</div>
                <div>Status</div>
                <div>Menu</div>
                <div className="text-right">Ações</div>
              </div>

              {categories.map((root) => (
                <CategoryGroup
                  key={root.id}
                  category={root}
                  expanded={expandedIds.includes(root.id)}
                  editingId={editingId}
                  editing={editing}
                  rootOptions={rootOptions}
                  savingId={savingId}
                  deletingId={deletingId}
                  onToggleExpanded={toggleExpanded}
                  onStartEditing={startEditing}
                  onCancelEditing={cancelEditing}
                  onChange={patchEditing}
                  onSave={saveCategory}
                  onDelete={deleteCategory}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function CategoryGroup({
  category,
  expanded,
  editingId,
  editing,
  rootOptions,
  savingId,
  deletingId,
  onToggleExpanded,
  onStartEditing,
  onCancelEditing,
  onChange,
  onSave,
  onDelete,
}: {
  category: CatalogCategoryNode
  expanded: boolean
  editingId: string | null
  editing: Record<string, Partial<CatalogCategoryNode>>
  rootOptions: { id: string; name: string }[]
  savingId: string | null
  deletingId: string | null
  onToggleExpanded: (id: string) => void
  onStartEditing: (category: CatalogCategoryNode) => void
  onCancelEditing: () => void
  onChange: (id: string, field: keyof CatalogCategoryNode, value: string | number | boolean) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
}) {
  const isEditingRoot = editingId === category.id

  return (
    <div className="border-b border-border last:border-b-0">
      <CategoryListRow
        category={category}
        level={0}
        expanded={expanded}
        canExpand={category.children.length > 0}
        onToggleExpanded={onToggleExpanded}
        onEdit={onStartEditing}
        onDelete={onDelete}
        deletingId={deletingId}
      />

      {isEditingRoot && (
        <EditPanel
          category={category}
          values={editing[category.id]}
          rootOptions={rootOptions}
          savingId={savingId}
          onCancel={onCancelEditing}
          onChange={onChange}
          onSave={onSave}
        />
      )}

      {expanded && (
        <div className="border-t border-border/60 bg-zinc-950/45">
          <div className="ml-10 border-l border-cyan-500/20">
            {category.children.map((child) => {
              const isEditingChild = editingId === child.id
              return (
                <div key={child.id} className="border-b border-border/50 last:border-b-0">
                  <CategoryListRow
                    category={child}
                    level={1}
                    expanded={false}
                    canExpand={false}
                    onToggleExpanded={onToggleExpanded}
                    onEdit={onStartEditing}
                    onDelete={onDelete}
                    deletingId={deletingId}
                  />
                  {isEditingChild && (
                    <EditPanel
                      category={child}
                      values={editing[child.id]}
                      rootOptions={rootOptions}
                      savingId={savingId}
                      onCancel={onCancelEditing}
                      onChange={onChange}
                      onSave={onSave}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryListRow({
  category,
  level,
  expanded,
  canExpand,
  onToggleExpanded,
  onEdit,
  onDelete,
  deletingId,
}: {
  category: CatalogCategoryNode
  level: 0 | 1
  expanded: boolean
  canExpand: boolean
  onToggleExpanded: (id: string) => void
  onEdit: (category: CatalogCategoryNode) => void
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  return (
    <div className={cn(
      "grid grid-cols-[minmax(0,1fr)_140px_140px_180px] gap-4 px-4 py-4 items-center",
      level === 1 ? "bg-cyan-500/[0.04]" : "bg-transparent"
    )}>
      <div className="flex min-w-0 items-center gap-3">
        <GripVertical className={cn(
          "h-4 w-4 shrink-0",
          level === 1 ? "text-cyan-300/35" : "text-muted-foreground/55"
        )} />
        {level === 1 ? (
          <span className="shrink-0 text-cyan-300/60">└</span>
        ) : (
          <button
            type="button"
            onClick={() => canExpand && onToggleExpanded(category.id)}
            className={cn(
              "rounded p-1 transition-colors",
              canExpand ? "hover:bg-accent" : "opacity-30"
            )}
          >
            {canExpand ? (
              expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-0" />
            )}
          </button>
        )}
        <div className="min-w-0">
          <p className={cn(
            "truncate font-medium",
            level === 1 ? "text-sm text-cyan-50/95" : "text-sm"
          )}>
            {category.name}
          </p>
          <p className={cn(
            "truncate text-xs",
            level === 1 ? "text-cyan-200/45" : "text-muted-foreground"
          )}>
            {category.slug}
          </p>
        </div>
      </div>

      <div>
        <StatusBadge status={category.status} />
      </div>

      <div>
        <MenuBadge enabled={category.showInMenu} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => onEdit(category)}>
          <Pencil className="mr-1.5 h-4 w-4" />
          Editar
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
  )
}

function EditPanel({
  category,
  values,
  rootOptions,
  savingId,
  onCancel,
  onChange,
  onSave,
}: {
  category: CatalogCategoryNode
  values?: Partial<CatalogCategoryNode>
  rootOptions: { id: string; name: string }[]
  savingId: string | null
  onCancel: () => void
  onChange: (id: string, field: keyof CatalogCategoryNode, value: string | number | boolean) => void
  onSave: (id: string) => void
}) {
  const resolvedName = (values?.name as string | undefined) ?? category.name
  const resolvedSlug = (values?.slug as string | undefined) ?? category.slug
  const resolvedDescription = (values?.description as string | undefined) ?? category.description ?? ""
  const resolvedOrder = (values?.order as number | undefined) ?? category.order
  const resolvedParentId = (values?.parentId as string | undefined) ?? category.parentId ?? ""
  const resolvedStatus = (values?.status as CatalogCategoryNode["status"] | undefined) ?? category.status
  const resolvedShowInMenu = (values?.showInMenu as boolean | undefined) ?? category.showInMenu

  return (
    <div className="border-top border-border/60 bg-white/[0.02] px-4 pb-5 pt-1">
      <div className="rounded-xl border border-border bg-background/70 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Editar categoria</p>
            <p className="text-xs text-muted-foreground">
              Subcategorias: {category._count?.children ?? 0} • Trilhas vinculadas: {category._count?.courseCategories ?? 0}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="mr-1.5 h-4 w-4" />
            Fechar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Nome">
            <input
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={resolvedName}
              onChange={(e) => onChange(category.id, "name", e.target.value)}
            />
          </Field>
          <Field label="Slug">
            <input
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={resolvedSlug}
              onChange={(e) => onChange(category.id, "slug", e.target.value)}
            />
          </Field>
          <Field label="Ordem">
            <input
              type="number"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={resolvedOrder}
              onChange={(e) => onChange(category.id, "order", Number(e.target.value))}
            />
          </Field>
          <Field label="Status">
            <select
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={resolvedStatus}
              onChange={(e) => onChange(category.id, "status", e.target.value)}
            >
              <option value="ACTIVE">Ativa</option>
              <option value="INACTIVE">Inativa</option>
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px_200px]">
          <Field label="Descrição">
            <textarea
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={resolvedDescription}
              onChange={(e) => onChange(category.id, "description", e.target.value)}
            />
          </Field>
          <Field label="Categoria pai">
            <select
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={resolvedParentId}
              onChange={(e) => onChange(category.id, "parentId", e.target.value)}
            >
              <option value="">Nível 1 (raiz)</option>
              {rootOptions.filter((root) => root.id !== category.id).map((root) => (
                <option key={root.id} value={root.id}>{root.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Exibir no menu">
            <label className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={resolvedShowInMenu}
                onChange={(e) => onChange(category.id, "showInMenu", e.target.checked)}
                className="rounded"
              />
              Mostrar no header
            </label>
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(category.id)} disabled={savingId === category.id}>
            {savingId === category.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: "ACTIVE" | "INACTIVE" }) {
  const active = status === "ACTIVE"
  return (
    <span className={cn(
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm",
      active ? "text-emerald-400" : "text-zinc-400"
    )}>
      <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-emerald-400" : "bg-zinc-500")} />
      {active ? "Ativo" : "Inativo"}
    </span>
  )
}

function MenuBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={cn(
      "inline-flex rounded-full px-3 py-1 text-sm",
      enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
    )}>
      {enabled ? "Exibir" : "Ocultar"}
    </span>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
