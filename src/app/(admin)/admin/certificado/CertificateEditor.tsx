"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Plus, Save, Upload } from "lucide-react"
import { uploadAdminImage } from "@/lib/admin-image-upload"
import { Button } from "@/components/ui/button"
import { DEFAULT_CERTIFICATE_TEMPLATE, type CertificateElement, type CertificateTemplate } from "@/lib/certificate"

export default function CertificateEditor() {
  const [template, setTemplate] = useState<CertificateTemplate>(DEFAULT_CERTIFICATE_TEMPLATE)
  const [selectedId, setSelectedId] = useState("name")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewed, setPreviewed] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; x: number; y: number } | null>(null)

  useEffect(() => {
    fetch("/api/admin/certificado", { cache: "no-store" }).then(async (response) => {
      if (response.ok) {
        const data = await response.json()
        if (data.template) setTemplate(data.template)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selected = template.elements.find((element) => element.id === selectedId) ?? template.elements[0]
  const updateSelected = (patch: Partial<CertificateElement>) => {
    if (!selected) return
    setPreviewed(false)
    setTemplate((current) => ({ ...current, elements: current.elements.map((element) => element.id === selected.id ? { ...element, ...patch } : element) }))
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>, element: CertificateElement) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setSelectedId(element.id)
    dragRef.current = { id: element.id, x: event.clientX - rect.left, y: event.clientY - rect.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!drag || !rect) return
    updateElementPosition(drag.id, (event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100)
  }

  function updateElementPosition(id: string, x: number, y: number) {
    setPreviewed(false)
    setTemplate((current) => ({ ...current, elements: current.elements.map((element) => element.id === id ? { ...element, x: Math.max(0, Math.min(100 - element.width, x)), y: Math.max(0, Math.min(100 - element.height, y)) } : element) }))
  }

  async function save() {
    if (!previewed) { setMessage("Gere a prévia antes de salvar o modelo."); return }
    setSaving(true); setMessage(null)
    const response = await fetch("/api/admin/certificado", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template }) })
    setSaving(false)
    setMessage(response.ok ? "Modelo salvo." : "Não foi possível salvar o modelo.")
  }

  async function preview() {
    setPreviewing(true); setMessage(null)
    const response = await fetch("/api/admin/certificado/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template }) })
    setPreviewing(false)
    if (!response.ok) { setMessage("Não foi possível gerar a prévia."); return }
    const url = URL.createObjectURL(await response.blob())
    window.open(url, "_blank", "noopener,noreferrer")
    setPreviewed(true)
  }

  async function uploadBackground(file: File) {
    setMessage(null)
    try {
      const backgroundUrl = await uploadAdminImage(file, "certificates")
      setTemplate((current) => ({ ...current, backgroundUrl }))
      setPreviewed(false)
      setMessage("Fundo carregado. Salve o modelo para confirmar.")
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Falha no upload.") }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando editor...</div>

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 md:p-8">
      <header><p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Certificação</p><h1 className="mt-2 text-3xl font-semibold">Modelo do certificado</h1><p className="mt-2 text-sm text-muted-foreground">Arraste os textos no certificado e use os campos dinâmicos para personalizar a emissão.</p></header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-border bg-card/50 p-5">
          <div ref={canvasRef} className="mx-auto aspect-[1.414/1] w-full max-w-4xl overflow-hidden border border-border bg-white shadow-2xl" onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null }}>
            <div className="relative h-full w-full bg-white bg-cover bg-center" style={{ backgroundImage: template.backgroundUrl ? `url(${template.backgroundUrl})` : undefined }}>
              {template.elements.map((element) => <div key={element.id} onPointerDown={(event) => startDrag(event, element)} className={`absolute cursor-move select-none overflow-hidden p-1 ${selectedId === element.id ? "outline outline-2 outline-cyan-500" : ""}`} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, color: element.color, fontSize: `${element.fontSize / 2.2}px`, fontWeight: element.bold ? 700 : 400, textAlign: element.align }}>{element.text}</div>)}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Upload className="h-4 w-4" /> Fundo<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBackground(file) }} /></label>
            <Button variant="outline" onClick={() => { setPreviewed(false); setTemplate((current) => ({ ...current, elements: [...current.elements, { id: `text-${Date.now()}`, text: "Texto livre", x: 35, y: 65, width: 30, height: 7, fontSize: 14, color: "#163047", align: "center", bold: false }] })) }}><Plus className="mr-2 h-4 w-4" />Texto livre</Button>
            <Button variant="outline" onClick={() => void preview()} disabled={previewing}>{previewing ? "Gerando..." : "Pré-visualizar PDF"}</Button>
            <Button onClick={() => void save()} disabled={saving || !previewed}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar modelo"}</Button>
          </div>
          {message && <p className="mt-3 text-sm text-cyan-300">{message}</p>}
        </section>
        <aside className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
          <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Elemento</label><select value={selected?.id} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">{template.elements.map((element) => <option key={element.id} value={element.id}>{element.id}</option>)}</select></div>
          {selected && <><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Texto</label><textarea value={selected.text} onChange={(event) => updateSelected({ text: event.target.value })} className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm" /><div className="grid grid-cols-2 gap-3">{(["x", "y", "width", "height", "fontSize"] as const).map((key) => <label key={key} className="text-xs text-muted-foreground">{key}<input type="number" value={selected[key]} onChange={(event) => updateSelected({ [key]: Number(event.target.value) })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground" /></label>)}</div><label className="text-xs text-muted-foreground">Cor<input type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background" /></label><div className="flex gap-2"><Button variant={selected.align === "left" ? "default" : "outline"} onClick={() => updateSelected({ align: "left" })}>Esq.</Button><Button variant={selected.align === "center" ? "default" : "outline"} onClick={() => updateSelected({ align: "center" })}>Centro</Button><Button variant={selected.align === "right" ? "default" : "outline"} onClick={() => updateSelected({ align: "right" })}>Dir.</Button><Button variant={selected.bold ? "default" : "outline"} onClick={() => updateSelected({ bold: !selected.bold })}>Bold</Button></div></>}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs leading-5 text-muted-foreground"><ImagePlus className="mb-2 h-4 w-4 text-cyan-300" />Use <code>{"{{nome}}"}</code>, <code>{"{{titulo}}"}</code>, <code>{"{{data}}"}</code> e <code>{"{{codigo}}"}</code> nos textos.</div>
        </aside>
      </div>
    </div>
  )
}
