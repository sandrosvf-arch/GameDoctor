"use client"

import { useEffect, useState } from "react"
import { Bot, Loader2, MessageCircle, RotateCcw, Save, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

type AiSettingsResponse = {
  promptFree: string
  promptPaid: string
  defaultPromptFree: string
  defaultPromptPaid: string
  aboutVideoUrl: string
  whatsappUrl: string
  updatedAt: string | null
  error?: string
}

export default function AdminConfiguracoesPage() {
  const [promptFree, setPromptFree] = useState("")
  const [promptPaid, setPromptPaid] = useState("")
  const [defaultPromptFree, setDefaultPromptFree] = useState("")
  const [defaultPromptPaid, setDefaultPromptPaid] = useState("")
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

      setPromptFree(payload.promptFree)
      setPromptPaid(payload.promptPaid)
      setDefaultPromptFree(payload.defaultPromptFree)
      setDefaultPromptPaid(payload.defaultPromptPaid)
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
      body: JSON.stringify({ promptFree, promptPaid, aboutVideoUrl, whatsappUrl }),
    })
    const payload = await response.json().catch(() => null) as AiSettingsResponse | null
    setSaving(false)

    if (!response.ok) {
      setError(payload?.error ?? "Não foi possível salvar os prompts.")
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
              Defina a personalidade, o objetivo e o tom das respostas da IA para cada perfil de usuário.
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
              <div className="rounded-lg border border-border bg-background/50 p-4 text-xs leading-5 text-muted-foreground">
                <p className="font-medium text-foreground">Fontes que a IA já consulta automaticamente</p>
                <p className="mt-1">
                  Central de ajuda (dúvidas frequentes), aulas e trilhas, planos e comunidade já são buscados por relevância a cada pergunta.
                  Você não precisa escrever #hashtags nem citar essas páginas no prompt para isso funcionar — é só para você saber o que já está disponível ao escrever o texto abaixo.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="ai-prompt-free" className="text-sm font-medium">Prompt para usuários gratuitos</label>
                  <span className="text-xs text-muted-foreground">{promptFree.length.toLocaleString("pt-BR")} / 12.000</span>
                </div>
                <textarea
                  id="ai-prompt-free"
                  value={promptFree}
                  onChange={(event) => setPromptFree(event.target.value)}
                  rows={12}
                  maxLength={12_000}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPromptFree(defaultPromptFree)} disabled={saving || promptFree === defaultPromptFree}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="ai-prompt-paid" className="text-sm font-medium">Prompt para assinantes ativos</label>
                  <span className="text-xs text-muted-foreground">{promptPaid.length.toLocaleString("pt-BR")} / 12.000</span>
                </div>
                <textarea
                  id="ai-prompt-paid"
                  value={promptPaid}
                  onChange={(event) => setPromptPaid(event.target.value)}
                  rows={12}
                  maxLength={12_000}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPromptPaid(defaultPromptPaid)} disabled={saving || promptPaid === defaultPromptPaid}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Restaurar padrão
                  </Button>
                </div>
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
            disabled={saving || promptFree.trim().length < 20 || promptPaid.trim().length < 20 || !aboutVideoUrl || !whatsappUrl}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar configurações
          </Button>
        </div>
      </section>
    </div>
  )
}
