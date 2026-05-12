"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  X,
  Save,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Banner {
  id: string
  title: string
  subtitle: string | null
  badge: string | null
  videoUrl: string | null
  imageUrl: string | null
  ctaText: string | null
  ctaHref: string | null
  secondaryCtaText: string | null
  secondaryCtaHref: string | null
  consoles: string[]
  order: number
  isActive: boolean
}

const empty: Omit<Banner, "id" | "order"> = {
  title: "",
  subtitle: "",
  badge: "",
  videoUrl: "",
  imageUrl: "",
  ctaText: "Ver aulas grátis",
  ctaHref: "/cursos",
  secondaryCtaText: "Ver planos",
  secondaryCtaHref: "/planos",
  consoles: [],
  isActive: true,
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        {label}
      </label>
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors",
        className,
      )}
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
    />
  )
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Omit<Banner, "id" | "order">>(empty)
  const [saving, setSaving] = useState(false)
  const [consolesInput, setConsolesInput] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/banners")
    const data = await res.json()
    setBanners(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setForm(empty)
    setConsolesInput("")
    setEditing(null)
    setCreating(true)
  }

  function openEdit(b: Banner) {
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      badge: b.badge ?? "",
      videoUrl: b.videoUrl ?? "",
      imageUrl: b.imageUrl ?? "",
      ctaText: b.ctaText ?? "",
      ctaHref: b.ctaHref ?? "",
      secondaryCtaText: b.secondaryCtaText ?? "",
      secondaryCtaHref: b.secondaryCtaHref ?? "",
      consoles: b.consoles,
      isActive: b.isActive,
    })
    setConsolesInput(b.consoles.join(", "))
    setEditing(b)
    setCreating(false)
  }

  function closeForm() {
    setEditing(null)
    setCreating(false)
  }

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || null,
      badge: form.badge?.trim() || null,
      videoUrl: form.videoUrl?.trim() || null,
      imageUrl: form.imageUrl?.trim() || null,
      ctaText: form.ctaText?.trim() || null,
      ctaHref: form.ctaHref?.trim() || null,
      secondaryCtaText: form.secondaryCtaText?.trim() || null,
      secondaryCtaHref: form.secondaryCtaHref?.trim() || null,
      consoles: consolesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }

    if (creating) {
      await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, order: banners.length }),
      })
    } else if (editing) {
      await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...payload }),
      })
    }
    await load()
    setSaving(false)
    closeForm()
  }

  async function toggleActive(b: Banner) {
    await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, isActive: !b.isActive }),
    })
    await load()
  }

  async function remove(b: Banner) {
    if (!confirm(`Excluir banner "${b.title}"?`)) return
    await fetch("/api/admin/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id }),
    })
    await load()
  }

  async function moveOrder(b: Banner, dir: -1 | 1) {
    const newOrder = b.order + dir
    if (newOrder < 0 || newOrder >= banners.length) return
    const other = banners.find((x) => x.order === newOrder)
    if (!other) return
    await Promise.all([
      fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, order: newOrder }),
      }),
      fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: other.id, order: b.order }),
      }),
    ])
    await load()
  }

  const isFormOpen = creating || !!editing

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">Banners da Home</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os slides do hero rotativo da página inicial.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver home
            </a>
          </Button>
          <Button
            size="sm"
            className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-bold"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo banner
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : banners.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500 mb-4">Nenhum banner cadastrado ainda.</p>
          <Button
            size="sm"
            className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-bold"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Criar primeiro banner
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border px-4 py-3 bg-zinc-900/40",
                b.isActive
                  ? "border-zinc-700"
                  : "border-zinc-800 opacity-60",
              )}
            >
              {/* Drag handle + order */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  onClick={() => moveOrder(b, -1)}
                  disabled={b.order === 0}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors text-xs"
                >
                  ▲
                </button>
                <GripVertical className="h-4 w-4 text-zinc-700" />
                <button
                  onClick={() => moveOrder(b, 1)}
                  disabled={b.order === banners.length - 1}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors text-xs"
                >
                  ▼
                </button>
              </div>

              {/* Preview thumbnail */}
              <div className="w-20 h-11 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                {b.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : b.videoUrl ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[9px] text-zinc-500 text-center px-1">
                      {b.videoUrl.split("/").pop()}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[9px] text-zinc-600">sem mídia</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{b.title}</p>
                {b.subtitle && (
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {b.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {b.badge && (
                    <span className="text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                      {b.badge}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full border",
                      b.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700",
                    )}
                  >
                    {b.isActive ? "ativo" : "inativo"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(b)}
                  className="h-8 w-8 rounded-lg border border-zinc-700 hover:border-zinc-500 flex items-center justify-center transition-colors"
                  title={b.isActive ? "Desativar" : "Ativar"}
                >
                  {b.isActive ? (
                    <Eye className="h-3.5 w-3.5 text-zinc-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-zinc-600" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(b)}
                  className="h-8 w-8 rounded-lg border border-zinc-700 hover:border-cyan-500/50 flex items-center justify-center transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                <button
                  onClick={() => remove(b)}
                  className="h-8 w-8 rounded-lg border border-zinc-700 hover:border-red-500/50 flex items-center justify-center transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5 text-zinc-500 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <h2 className="font-bold text-lg">
                {creating ? "Novo banner" : "Editar banner"}
              </h2>
              <button
                onClick={closeForm}
                className="h-8 w-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <Field label="Título" hint='Use \n para quebras de linha. Ex: "Aprenda\nsolda BGA"'>
                <Input
                  value={form.title}
                  onChange={(v) => set("title", v)}
                  placeholder="Título principal do banner"
                />
              </Field>

              <Field label="Subtítulo">
                <Textarea
                  value={form.subtitle ?? ""}
                  onChange={(v) => set("subtitle", v)}
                  placeholder="Descrição curta exibida abaixo do título"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Badge / Etiqueta">
                  <Input
                    value={form.badge ?? ""}
                    onChange={(v) => set("badge", v)}
                    placeholder="Ex: Técnico profissional"
                  />
                </Field>
                <Field
                  label="Consoles"
                  hint="Separados por vírgula"
                >
                  <Input
                    value={consolesInput}
                    onChange={setConsolesInput}
                    placeholder="PS5, Xbox, Nintendo Switch"
                  />
                </Field>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Mídia de fundo
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <Field
                    label="URL do vídeo"
                    hint="Caminho público (ex: /hero-bg.mp4) ou URL externa. Tem prioridade sobre imagem."
                  >
                    <Input
                      value={form.videoUrl ?? ""}
                      onChange={(v) => set("videoUrl", v)}
                      placeholder="/hero-bg.mp4"
                    />
                  </Field>
                  <Field
                    label="URL da imagem"
                    hint="Usado se não houver vídeo. Ex: /banners/slide2.jpg"
                  >
                    <Input
                      value={form.imageUrl ?? ""}
                      onChange={(v) => set("imageUrl", v)}
                      placeholder="/banners/slide2.jpg"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Botões de ação
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Texto CTA principal">
                    <Input
                      value={form.ctaText ?? ""}
                      onChange={(v) => set("ctaText", v)}
                      placeholder="Ver aulas grátis"
                    />
                  </Field>
                  <Field label="Link CTA principal">
                    <Input
                      value={form.ctaHref ?? ""}
                      onChange={(v) => set("ctaHref", v)}
                      placeholder="/cursos"
                    />
                  </Field>
                  <Field label="Texto CTA secundário">
                    <Input
                      value={form.secondaryCtaText ?? ""}
                      onChange={(v) => set("secondaryCtaText", v)}
                      placeholder="Ver planos"
                    />
                  </Field>
                  <Field label="Link CTA secundário">
                    <Input
                      value={form.secondaryCtaHref ?? ""}
                      onChange={(v) => set("secondaryCtaHref", v)}
                      placeholder="/planos"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => set("isActive", !form.isActive)}
                    className={cn(
                      "relative w-10 h-6 rounded-full transition-colors",
                      form.isActive ? "bg-cyan-500" : "bg-zinc-700",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        form.isActive ? "translate-x-5" : "translate-x-1",
                      )}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {form.isActive ? "Banner ativo (visível na home)" : "Banner inativo (oculto)"}
                  </span>
                </label>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" onClick={closeForm} size="sm">
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-bold"
                onClick={save}
                disabled={saving || !form.title.trim()}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
