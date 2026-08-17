"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, FileArchive, FileText, FolderOpen, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

type MaterialType = "PDF" | "SPREADSHEET" | "IMAGE" | "LINK" | "CHECKLIST" | "ARCHIVE" | "OTHER"
type MaterialStatus = "ACTIVE" | "INACTIVE"

interface DownloadItem {
  id: string
  title: string
  description: string | null
  category: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  type: MaterialType
  order: number
  status: MaterialStatus
  createdAt: string
  updatedAt: string
}

interface FormState {
  title: string
  description: string
  category: string
  type: MaterialType
  order: string
  status: MaterialStatus
  file: File | null
}

const emptyForm: FormState = {
  title: "",
  description: "",
  category: "",
  type: "OTHER",
  order: "0",
  status: "ACTIVE",
  file: null,
}

const typeOptions: { value: MaterialType; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "SPREADSHEET", label: "Planilha" },
  { value: "IMAGE", label: "Imagem" },
  { value: "CHECKLIST", label: "Checklist" },
  { value: "ARCHIVE", label: "Arquivo compactado" },
  { value: "OTHER", label: "Outro" },
]

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value))
}

function MaterialIcon({ type }: { type: MaterialType }) {
  if (type === "PDF" || type === "CHECKLIST") return <FileText className="h-4 w-4" />
  if (type === "ARCHIVE") return <FileArchive className="h-4 w-4" />
  return <FolderOpen className="h-4 w-4" />
}

export default function DownloadsAdminClient() {
  const [materials, setMaterials] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "", type: "OTHER" as MaterialType, order: "0", status: "ACTIVE" as MaterialStatus })
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    const response = await fetch(`/api/admin/downloads?${params.toString()}`, { cache: "no-store" })
    if (response.ok) {
      const data = await response.json() as { materials: DownloadItem[] }
      setMaterials(data.materials)
      setError("")
    } else {
      setError("Não foi possível carregar os materiais.")
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.file) {
      setError("Selecione o arquivo do material.")
      return
    }

    setSaving(true)
    setError("")
    try {
      const uploadUrlResponse = await fetch("/api/admin/downloads/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: form.file.name,
          mimeType: form.file.type || "application/octet-stream",
          sizeBytes: form.file.size,
          category: form.category,
        }),
      })
      const uploadData = await uploadUrlResponse.json().catch(() => ({})) as { signedUrl?: string; path?: string; error?: string }
      if (!uploadUrlResponse.ok || !uploadData.signedUrl || !uploadData.path) throw new Error(uploadData.error ?? "Não foi possível preparar o upload.")

      const uploadBody = new FormData()
      uploadBody.append("cacheControl", "3600")
      uploadBody.append("", form.file)
      const uploadResponse = await fetch(uploadData.signedUrl, { method: "PUT", body: uploadBody })
      if (!uploadResponse.ok) throw new Error("O arquivo não foi enviado ao Storage.")

      const createResponse = await fetch("/api/admin/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          type: form.type,
          order: Number(form.order) || 0,
          status: form.status,
          fileName: form.file.name,
          storagePath: uploadData.path,
          mimeType: form.file.type || "application/octet-stream",
          sizeBytes: form.file.size,
        }),
      })
      const createData = await createResponse.json().catch(() => ({})) as { error?: string }
      if (!createResponse.ok) throw new Error(createData.error ?? "Não foi possível cadastrar o material.")

      setForm(emptyForm)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cadastrar o material.")
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(material: DownloadItem) {
    setEditingId(material.id)
    setEditForm({
      title: material.title,
      description: material.description ?? "",
      category: material.category ?? "",
      type: material.type,
      order: String(material.order),
      status: material.status,
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError("")
    const response = await fetch(`/api/admin/downloads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, order: Number(editForm.order) || 0 }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) setError(data.error ?? "Não foi possível salvar o material.")
    else {
      setEditingId(null)
      await load()
    }
    setSaving(false)
  }

  async function deleteMaterial(material: DownloadItem) {
    if (!window.confirm(`Excluir o material \"${material.title}\"? O arquivo também será removido.`)) return
    setDeleting(material.id)
    const response = await fetch(`/api/admin/downloads/${material.id}`, { method: "DELETE" })
    if (response.ok) setMaterials((current) => current.filter((item) => item.id !== material.id))
    else setError("Não foi possível excluir o material.")
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Biblioteca</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Downloads</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Publique materiais didáticos, softwares e diagramas em um espaço seguro para os assinantes.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><FolderOpen className="h-4 w-4 text-cyan-300" /> {materials.length} materiais cadastrados</div>
        </header>

        {error && <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <section className="rounded-2xl border border-border bg-card/45 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-lg font-semibold">Adicionar material</h2><p className="mt-1 text-sm text-muted-foreground">O arquivo será enviado diretamente para o Storage privado do Supabase.</p></div>
            <Upload className="h-5 w-5 text-cyan-300" />
          </div>
          <form onSubmit={handleCreate} className="mt-6 grid gap-4 lg:grid-cols-12">
            <Field label="Título" className="lg:col-span-4"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="Ex.: Diagrama HDMI PlayStation 4" className={inputClass} /></Field>
            <Field label="Categoria" className="lg:col-span-3"><input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Ex.: PlayStation" className={inputClass} /></Field>
            <Field label="Tipo" className="lg:col-span-2"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MaterialType })} className={inputClass}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label="Ordem" className="lg:col-span-1"><input type="number" min="0" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} className={inputClass} /></Field>
            <Field label="Arquivo (até 250 MB)" className="lg:col-span-2"><label className="flex h-10 cursor-pointer items-center gap-2 overflow-hidden rounded-lg border border-dashed border-border bg-background/40 px-3 text-sm text-muted-foreground hover:border-cyan-400/50"><Upload className="h-4 w-4 shrink-0" /><span className="truncate">{form.file?.name ?? "Selecionar arquivo"}</span><input type="file" className="hidden" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] ?? null })} /></label></Field>
            <Field label="Descrição" className="lg:col-span-8"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} placeholder="Explique rapidamente o que o aluno encontrará neste material." className={`${inputClass} h-auto py-2`} /></Field>
            <div className="flex items-end lg:col-span-4"><button type="submit" disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? "Enviando..." : "Adicionar material"}</button></div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card/45">
          <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-semibold">Materiais cadastrados</h2><p className="mt-1 text-sm text-muted-foreground">Inative ou organize os arquivos sem precisar reenviar.</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." className="h-9 rounded-lg border border-border bg-background/40 px-3 text-sm outline-none focus:border-cyan-400/50" /><button onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-cyan-400/50"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</button></div></div>
          {loading ? <div className="flex justify-center p-14"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div> : materials.length === 0 ? <div className="p-14 text-center text-sm text-muted-foreground">Nenhum material cadastrado.</div> : <div className="divide-y divide-border/70">{materials.map((material) => {
            const isEditing = editingId === material.id
            return <div key={material.id} className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", material.status === "ACTIVE" ? "bg-cyan-400/10 text-cyan-300" : "bg-muted text-muted-foreground")}><MaterialIcon type={material.type} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{material.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{material.category || "Sem categoria"} · {material.fileName}</p></div></div><div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4 xl:w-[430px]"><span><b className="block text-foreground">{formatFileSize(material.sizeBytes)}</b>Tamanho</span><span><b className="block text-foreground">{material.type}</b>Tipo</span><span><b className={cn("block", material.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300")}>{material.status === "ACTIVE" ? "Ativo" : "Inativo"}</b>Status</span><span><b className="block text-foreground">{formatDate(material.createdAt)}</b>Cadastro</span></div><div className="flex gap-2 xl:justify-end"><button onClick={() => beginEdit(material)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:border-cyan-400/50"><Pencil className="h-3.5 w-3.5" /> Editar</button><button onClick={() => void deleteMaterial(material)} disabled={deleting === material.id} className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-400/20 px-3 text-xs font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50">{deleting === material.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Excluir</button></div></div>{isEditing && <div className="mt-5 grid gap-3 rounded-xl border border-cyan-400/15 bg-background/35 p-4 md:grid-cols-2 lg:grid-cols-6"><Field label="Título" className="lg:col-span-2"><input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className={inputClass} /></Field><Field label="Categoria"><input value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })} className={inputClass} /></Field><Field label="Tipo"><select value={editForm.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value as MaterialType })} className={inputClass}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Ordem"><input type="number" min="0" value={editForm.order} onChange={(event) => setEditForm({ ...editForm, order: event.target.value })} className={inputClass} /></Field><Field label="Status"><select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as MaterialStatus })} className={inputClass}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></Field><Field label="Descrição" className="md:col-span-2 lg:col-span-5"><textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} rows={2} className={`${inputClass} h-auto py-2`} /></Field><div className="flex items-end gap-2"><button onClick={() => void saveEdit(material.id)} disabled={saving} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}Salvar</button><button onClick={() => setEditingId(null)} className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-3"><X className="h-4 w-4" /></button></div></div>}</div>
          })}</div>}
        </section>
      </div>
    </div>
  )
}

const inputClass = "h-10 w-full rounded-lg border border-border bg-background/50 px-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-cyan-400/50"

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("block", className)}><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>
}