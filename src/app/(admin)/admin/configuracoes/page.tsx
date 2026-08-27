"use client"

import { useEffect, useState } from "react"
import { Bot, Loader2, MessageCircle, RotateCcw, Save, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

type AiSettingsResponse = {
  prompt: string
  defaultPrompt: string
  aboutVideoUrl: string
  whatsappUrl: string
  updatedAt: string | null
  error?: string
}

export default function AdminConfiguracoesPage() {
  const [prompt, setPrompt] = useState("")
  const [defaultPrompt, setDefaultPrompt] = useState("")
  const [aboutVideoUrl, setAboutVideoUrl] = useState("")
  const [whatsappUrl, setWhatsappUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/configuracoes/ai", { cache: "no-store" })
      const payload = await response.json().catch(() => null) as AiSettingsResponse | null

      if (!response.ok || !payload) {
        setError(payload?.error ?? "Não foi possível carregar as configurações.")
        setLoading(false)
        return
      }

      setPrompt(payload.prompt)
      setDefaultPrompt(payload.defaultPrompt)
      setAboutVideoUrl(payload.aboutVideoUrl)
      setWhatsappUrl(payload.whatsappUrl)
      setLoading(false)
    }

    void load()
  }, [])

  async function save() {
    setSaving(true)
    setMessage(null)
    setError(null)

    const response = await fetch("/api/admin/configuracoes/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aboutVideoUrl, whatsappUrl }),
    })
    const payload = await response.json().catch(() => null) as AiSettingsResponse | null
    setSaving(false)

    if (!response.ok) {
      setError(payload?.error ?? "Não foi possível salvar o prompt.")
      return
    }

    setMessage("Configurações salvas. As alterações já estão disponíveis na plataforma.")
  }

  return (
    <div className="max-w-5xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Centralize os comportamentos da plataforma que podem ser ajustados pela equipe.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card/50">
        <div className="flex items-start gap-3 border-b border-border p-5">
          <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-300">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Assistente GameDoctor</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina a personalidade, o objetivo e o tom das respostas da IA.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="ai-prompt" className="text-sm font-medium">Prompt-base</label>
                  <span className="text-xs text-muted-foreground">{prompt.length.toLocaleString("pt-BR")} / 12.000</span>
                </div>
                <textarea
                  id="ai-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={12}
                  maxLength={12_000}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  As regras de segurança, acesso por plano e uso das fontes são aplicadas automaticamente e não precisam ser repetidas aqui.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPrompt(defaultPrompt)} disabled={saving || prompt === defaultPrompt}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card/50">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-border p-5 md:border-b-0 md:border-r">
            <div className="flex items-start gap-3">
              <span className="rounded-lg border border-orange-400/20 bg-orange-400/10 p-2 text-orange-300">
                <Video className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="about-video-url" className="font-semibold">Vídeo de Quem somos</label>
                <p className="mt-1 text-sm text-muted-foreground">
                  URL incorporável usada no vídeo de apresentação da página.
                </p>
                <input
                  id="about-video-url"
                  type="url"
                  value={aboutVideoUrl}
                  onChange={(event) => setAboutVideoUrl(event.target.value)}
                  className="mt-4 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10"
                  placeholder="https://player.vimeo.com/video/..."
                />
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 text-emerald-300">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor="whatsapp-url" className="font-semibold">WhatsApp de atendimento</label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Link completo usado em atendimento, planos e cancelamento.
                </p>
                <input
                  id="whatsapp-url"
                  type="url"
                  value={whatsappUrl}
                  onChange={(event) => setWhatsappUrl(event.target.value)}
                  className="mt-4 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                  placeholder="https://wa.me/55..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-emerald-300">{message}</p>}
          </div>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || prompt.trim().length < 20 || !aboutVideoUrl || !whatsappUrl}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar configurações
          </Button>
        </div>
      </section>
    </div>
  )
}
