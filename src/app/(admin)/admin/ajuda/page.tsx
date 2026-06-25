"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import { slugifyHelp } from "@/lib/help-content"

type EntityStatus = "ACTIVE" | "INACTIVE"

interface HelpArticle {
  id: string
  categoryId: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  order: number
  status: EntityStatus
}

interface HelpCategory {
  id: string
  name: string
  slug: string
  description: string | null
  order: number
  status: EntityStatus
  articles: HelpArticle[]
}

interface CategoryDraft {
  name: string
  description: string
  order: string
  status: EntityStatus
}

interface ArticleDraft {
  categoryId: string
  title: string
  slug: string
  excerpt: string
  content: string
  order: string
  status: EntityStatus
}

const EMPTY_CATEGORY: CategoryDraft = {
  name: "",
  description: "",
  order: "0",
  status: "ACTIVE",
}

const EMPTY_ARTICLE: ArticleDraft = {
  categoryId: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  order: "0",
  status: "ACTIVE",
}

export default function AdminAjudaPage() {
  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(EMPTY_CATEGORY)
  const [articleDraft, setArticleDraft] = useState<ArticleDraft>(EMPTY_ARTICLE)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  )

  async function load() {
    setLoading(true)
    const response = await fetch("/api/admin/ajuda", { cache: "no-store" })
    const data = await response.json().catch(() => [])
    if (response.ok) {
      setCategories(data)
      setSelectedCategoryId((current) => current || data[0]?.id || "")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function resetCategoryForm() {
    setEditingCategoryId(null)
    setCategoryDraft(EMPTY_CATEGORY)
    setShowCategoryForm(false)
  }

  function resetArticleForm() {
    setEditingArticleId(null)
    setArticleDraft({
      ...EMPTY_ARTICLE,
      categoryId: selectedCategoryId,
    })
    setShowArticleModal(false)
  }

  function startCategoryEdit(category: HelpCategory) {
    setEditingCategoryId(category.id)
    setCategoryDraft({
      name: category.name,
      description: category.description ?? "",
      order: String(category.order),
      status: category.status,
    })
    setShowCategoryForm(true)
  }

  function startArticleCreate() {
    setEditingArticleId(null)
    setArticleDraft({
      ...EMPTY_ARTICLE,
      categoryId: selectedCategoryId,
    })
    setShowArticleModal(true)
  }

  function startArticleEdit(article: HelpArticle) {
    setEditingArticleId(article.id)
    setArticleDraft({
      categoryId: article.categoryId,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? "",
      content: article.content,
      order: String(article.order),
      status: article.status,
    })
    setShowArticleModal(true)
  }

  async function saveCategory(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      name: categoryDraft.name.trim(),
      description: categoryDraft.description.trim(),
      order: Number(categoryDraft.order) || 0,
      status: categoryDraft.status,
    }

    const response = await fetch(
      editingCategoryId ? `/api/admin/ajuda/categorias/${editingCategoryId}` : "/api/admin/ajuda/categorias",
      {
        method: editingCategoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    setSaving(false)
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      alert(data?.error ?? "Não foi possível salvar a categoria.")
      return
    }

    resetCategoryForm()
    await load()
  }

  async function saveArticle(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      categoryId: articleDraft.categoryId,
      title: articleDraft.title.trim(),
      slug: slugifyHelp(articleDraft.slug || articleDraft.title),
      excerpt: articleDraft.excerpt.trim(),
      content: articleDraft.content,
      order: Number(articleDraft.order) || 0,
      status: articleDraft.status,
    }

    const response = await fetch(
      editingArticleId ? `/api/admin/ajuda/topicos/${editingArticleId}` : "/api/admin/ajuda/topicos",
      {
        method: editingArticleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    setSaving(false)
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      alert(data?.error ?? "Não foi possível salvar o tópico.")
      return
    }

    resetArticleForm()
    await load()
  }

  async function deleteCategory(id: string) {
    if (!confirm("Excluir esta categoria e todos os tópicos dela?")) return
    setDeletingId(id)
    await fetch(`/api/admin/ajuda/categorias/${id}`, { method: "DELETE" })
    setDeletingId(null)
    if (selectedCategoryId === id) setSelectedCategoryId("")
    await load()
  }

  async function deleteArticle(id: string) {
    if (!confirm("Excluir este tópico?")) return
    setDeletingId(id)
    await fetch(`/api/admin/ajuda/topicos/${id}`, { method: "DELETE" })
    setDeletingId(null)
    await load()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de ajuda</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organize categorias e tópicos de suporte exibidos para o aluno na área pública.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setShowCategoryForm((current) => !current)
              setEditingCategoryId(null)
              setCategoryDraft(EMPTY_CATEGORY)
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            <span className="inline-flex items-center gap-2">
              {showCategoryForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCategoryForm ? "Fechar categoria" : "Nova categoria"}
            </span>
          </button>

          <button
            onClick={startArticleCreate}
            disabled={!selectedCategoryId}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo tópico
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Categorias</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selecione uma categoria para gerenciar os tópicos.</p>
          </div>

          {showCategoryForm && (
            <form onSubmit={saveCategory} className="mb-5 space-y-3 rounded-2xl border border-border bg-background/40 p-4">
              <Field label="Nome">
                <input
                  value={categoryDraft.name}
                  onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  value={categoryDraft.description}
                  onChange={(event) => setCategoryDraft((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ordem">
                  <input
                    value={categoryDraft.order}
                    onChange={(event) => setCategoryDraft((current) => ({ ...current, order: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={categoryDraft.status}
                    onChange={(event) =>
                      setCategoryDraft((current) => ({ ...current, status: event.target.value as EntityStatus }))
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </Field>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : editingCategoryId ? "Salvar categoria" : "Criar categoria"}
                </button>
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma categoria criada ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => {
                const selected = selectedCategoryId === category.id
                return (
                  <div
                    key={category.id}
                    className={`rounded-2xl border p-4 transition ${
                      selected ? "border-cyan-500/40 bg-cyan-500/10" : "border-border bg-background/35"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(category.id)}
                      className="w-full cursor-pointer text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{category.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {category.articles.length} tópico{category.articles.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] ${
                            category.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-zinc-500/15 text-zinc-400"
                          }`}
                        >
                          {category.status === "ACTIVE" ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startCategoryEdit(category)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        disabled={deletingId === category.id}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === category.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Excluir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedCategory ? `Tópicos: ${selectedCategory.name}` : "Tópicos"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCategory
                  ? "Clique em um tópico para editar o conteúdo e a estrutura."
                  : "Selecione uma categoria para visualizar os tópicos."}
              </p>
            </div>

            <button
              onClick={startArticleCreate}
              disabled={!selectedCategoryId}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Adicionar tópico
              </span>
            </button>
          </div>

          {!selectedCategory ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
              Escolha uma categoria ao lado para começar.
            </div>
          ) : selectedCategory.articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-16 text-center text-sm text-muted-foreground">
              Essa categoria ainda não possui tópicos.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_180px] gap-4 border-b border-border bg-white/[0.03] px-4 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div>Tópico</div>
                <div>Status</div>
                <div>Ordem</div>
                <div className="text-right">Ações</div>
              </div>

              {selectedCategory.articles.map((article) => (
                <div
                  key={article.id}
                  className="grid grid-cols-[minmax(0,1fr)_120px_120px_180px] gap-4 border-b border-border px-4 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{article.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{article.slug}</p>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        article.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-zinc-500/15 text-zinc-400"
                      }`}
                    >
                      {article.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{article.order}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startArticleEdit(article)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => deleteArticle(article.id)}
                      disabled={deletingId === article.id}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deletingId === article.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/70 bg-card/95 px-6 py-5 backdrop-blur">
              <div>
                <h3 className="text-xl font-semibold">{editingArticleId ? "Editar tópico" : "Novo tópico"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escreva a resposta em rich text para exibição na central de ajuda do aluno.
                </p>
              </div>
              <button
                onClick={resetArticleForm}
                className="rounded-full border border-border p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveArticle} className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Categoria">
                  <select
                    value={articleDraft.categoryId}
                    onChange={(event) => setArticleDraft((current) => ({ ...current, categoryId: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  >
                    <option value="">Selecione</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Título">
                  <input
                    value={articleDraft.title}
                    onChange={(event) => setArticleDraft((current) => ({ ...current, title: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={articleDraft.slug}
                    onChange={(event) => setArticleDraft((current) => ({ ...current, slug: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="gerado automaticamente"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={articleDraft.status}
                    onChange={(event) =>
                      setArticleDraft((current) => ({ ...current, status: event.target.value as EntityStatus }))
                    }
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <Field label="Ordem">
                  <input
                    value={articleDraft.order}
                    onChange={(event) => setArticleDraft((current) => ({ ...current, order: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Resumo curto">
                  <input
                    value={articleDraft.excerpt}
                    onChange={(event) => setArticleDraft((current) => ({ ...current, excerpt: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Opcional. Se ficar vazio, será gerado a partir do conteúdo."
                  />
                </Field>
              </div>

              <Field label="Conteúdo">
                <RichTextEditor
                  value={articleDraft.content}
                  onChange={(content) => setArticleDraft((current) => ({ ...current, content }))}
                  placeholder="Escreva o conteúdo do tópico..."
                />
              </Field>

              <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
                <button
                  type="button"
                  onClick={resetArticleForm}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingArticleId ? "Salvar tópico" : "Criar tópico"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
