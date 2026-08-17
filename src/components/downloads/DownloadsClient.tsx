"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Download, FileArchive, FileText, Filter, FolderOpen, LockKeyhole, Search } from "lucide-react"

type DownloadType = "PDF" | "SPREADSHEET" | "IMAGE" | "LINK" | "CHECKLIST" | "ARCHIVE" | "OTHER"

export interface DownloadMaterialItem {
  id: string
  title: string
  description: string | null
  category: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  type: DownloadType
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function typeLabel(type: DownloadType) {
  const labels: Record<DownloadType, string> = {
    PDF: "PDF",
    SPREADSHEET: "Planilha",
    IMAGE: "Imagem",
    LINK: "Link",
    CHECKLIST: "Checklist",
    ARCHIVE: "Arquivo",
    OTHER: "Material",
  }
  return labels[type]
}

function MaterialIcon({ type }: { type: DownloadType }) {
  if (type === "PDF" || type === "CHECKLIST") return <FileText className="h-5 w-5" />
  if (type === "ARCHIVE") return <FileArchive className="h-5 w-5" />
  return <FolderOpen className="h-5 w-5" />
}

export function DownloadsClient({
  isLoggedIn,
  canAccess,
  totalMaterials,
  materials,
}: {
  isLoggedIn: boolean
  canAccess: boolean
  totalMaterials: number
  materials: DownloadMaterialItem[]
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const categories = useMemo(
    () => Array.from(new Set(materials.map((item) => item.category).filter(Boolean))) as string[],
    [materials]
  )
  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR")
    return materials.filter((item) => {
      const matchesCategory = category === "all" || item.category === category
      const matchesSearch = !normalizedSearch || [item.title, item.description, item.fileName, item.category]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(normalizedSearch))
      return matchesCategory && matchesSearch
    })
  }, [category, materials, search])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.12] via-card/80 to-card/30 p-7 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Biblioteca exclusiva</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Materiais para evoluir na prática.</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Diagramas, softwares, apostilas e arquivos selecionados para acelerar seus diagnósticos e reparos.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="h-4 w-4 text-cyan-300" />
              <span>{totalMaterials} material{totalMaterials === 1 ? " disponível" : "is disponíveis"}</span>
            </div>
          </div>
        </header>

        {!canAccess ? (
          <section className="relative overflow-hidden rounded-[28px] border border-amber-400/20 bg-card/60 p-8 md:p-12">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative max-w-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Acesso para assinantes</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">Pare de procurar arquivos espalhados.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Existem {totalMaterials} materiais organizados esperando por você. Assine o GameDoctor para liberar a biblioteca completa e estudar com as ferramentas certas.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={isLoggedIn ? "/planos" : "/login?callbackUrl=/downloads"} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  {isLoggedIn ? "Liberar meus materiais" : "Entrar para ver como liberar"}
                </Link>
                {!isLoggedIn && <Link href="/planos" className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold transition hover:border-cyan-400/50 hover:text-cyan-300">Conhecer o acesso</Link>}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Biblioteca de materiais</h2>
                <p className="mt-1 text-sm text-muted-foreground">Tudo organizado em um só lugar para você consultar quando precisar.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar material..." className="h-10 w-full rounded-xl border border-border bg-card/60 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-400/50" />
                </label>
                {categories.length > 0 && (
                  <label className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-border bg-card/60 pl-9 pr-8 text-sm outline-none transition focus:border-cyan-400/50">
                      <option value="all">Todas as categorias</option>
                      {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Nenhum material encontrado.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredMaterials.map((material) => (
                  <article key={material.id} className="flex min-h-52 flex-col rounded-2xl border border-border bg-card/45 p-5 transition hover:border-cyan-400/30 hover:bg-card/70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><MaterialIcon type={material.type} /></div>
                      <span className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] text-muted-foreground">{typeLabel(material.type)}</span>
                    </div>
                    <div className="mt-5 flex-1">
                      {material.category && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{material.category}</p>}
                      <h3 className="mt-1 text-base font-semibold leading-snug">{material.title}</h3>
                      {material.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{material.description}</p>}
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                      <span className="truncate text-xs text-muted-foreground" title={material.fileName}>{formatFileSize(material.sizeBytes)}</span>
                      <a href={`/api/downloads/${material.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"><Download className="h-3.5 w-3.5" /> Baixar</a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}