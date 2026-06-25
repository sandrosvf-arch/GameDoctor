"use client"

import { useEffect, useState } from "react"
import { Loader2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react"

type PlanStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

interface PlanItem {
  id: string
  name: string
  slug: string
  description: string | null
  annualPrice: number
  monthlyPrice: number | null
  monthlyEnabled: boolean
  annualAccessDurationDays: number
  monthlyAccessDurationDays: number | null
  maxInstallments: number
  maxInstallmentsNoInterest: number
  benefits: string[]
  status: PlanStatus
  highlighted: boolean
  createdAt: string
  usage: {
    orderItems: number
    accessPermissions: number
    coupons: number
  }
}

interface ApiResponse {
  plans: PlanItem[]
}

interface FormState {
  name: string
  description: string
  annualPrice: string
  annualAccessDurationDays: string
  monthlyEnabled: boolean
  monthlyPrice: string
  monthlyAccessDurationDays: string
  maxInstallments: string
  maxInstallmentsNoInterest: string
  highlighted: boolean
  status: PlanStatus
  benefitsText: string
}

const emptyForm: FormState = {
  name: "",
  description: "",
  annualPrice: "",
  annualAccessDurationDays: "365",
  monthlyEnabled: false,
  monthlyPrice: "",
  monthlyAccessDurationDays: "30",
  maxInstallments: "12",
  maxInstallmentsNoInterest: "1",
  highlighted: false,
  status: "ACTIVE",
  benefitsText: "",
}

function formatCurrency(value: number | null) {
  if (value === null) return "-"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function statusLabel(status: PlanStatus) {
  if (status === "ACTIVE") return "Ativo"
  if (status === "INACTIVE") return "Inativo"
  return "Arquivado"
}

function statusTone(status: PlanStatus) {
  if (status === "ACTIVE") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
  if (status === "INACTIVE") return "border-amber-500/30 bg-amber-500/15 text-amber-400"
  return "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
}

export default function AdminPlanosPage() {
  const [items, setItems] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)

    const response = await fetch("/api/admin/planos", { cache: "no-store" })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Nao foi possivel carregar os planos.")
      setLoading(false)
      return
    }

    setItems((data as ApiResponse).plans)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function closeModal() {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function openCreateModal() {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  function startEdit(plan: PlanItem) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      annualPrice: String(plan.annualPrice),
      annualAccessDurationDays: String(plan.annualAccessDurationDays),
      monthlyEnabled: plan.monthlyEnabled,
      monthlyPrice: plan.monthlyPrice === null ? "" : String(plan.monthlyPrice),
      monthlyAccessDurationDays: String(plan.monthlyAccessDurationDays ?? 30),
      maxInstallments: String(plan.maxInstallments),
      maxInstallmentsNoInterest: String(plan.maxInstallmentsNoInterest),
      highlighted: plan.highlighted,
      status: plan.status,
      benefitsText: plan.benefits.join("\n"),
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name),
      description: form.description,
      annualPrice: form.annualPrice,
      annualAccessDurationDays: form.annualAccessDurationDays,
      monthlyEnabled: form.monthlyEnabled,
      monthlyPrice: form.monthlyPrice,
      monthlyAccessDurationDays: form.monthlyAccessDurationDays,
      maxInstallments: form.maxInstallments,
      maxInstallmentsNoInterest: form.maxInstallmentsNoInterest,
      highlighted: form.highlighted,
      status: form.status,
      benefits: form.benefitsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    }

    const response = await fetch(editingId ? `/api/admin/planos/${editingId}` : "/api/admin/planos", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)
    setSaving(false)

    if (!response.ok) {
      alert(data?.error ?? "Nao foi possivel salvar o plano.")
      return
    }

    closeModal()
    await load()
  }

  async function handleDelete(plan: PlanItem) {
    if (!confirm(`Deseja excluir o plano "${plan.name}"?`)) return

    setBusyId(plan.id)
    const response = await fetch(`/api/admin/planos/${plan.id}`, { method: "DELETE" })
    const data = await response.json().catch(() => null)
    setBusyId(null)

    if (!response.ok) {
      alert(data?.error ?? "Nao foi possivel excluir o plano.")
      return
    }

    if (editingId === plan.id) {
      closeModal()
    }

    await load()
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Planos de assinatura</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Gerencie a vitrine comercial dos planos com valores, parcelamento e status de exibicao.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={load}
            className="rounded-full border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-accent"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </span>
          </button>

          <button
            onClick={openCreateModal}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Adicionar plano
            </span>
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/70 px-6 py-5">
          <h2 className="text-xl font-semibold text-foreground">Planos cadastrados</h2>
          <p className="mt-1 text-sm text-muted-foreground">Listagem completa dos planos com dados comerciais essenciais.</p>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-6 py-6 text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhum plano cadastrado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="grid grid-cols-[minmax(220px,2fr)_1.35fr_1.1fr_1.2fr_1.2fr_180px] gap-4 border-b border-border/70 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span>Plano</span>
                <span>Valores</span>
                <span>Parcelamento</span>
                <span>Assinaturas</span>
                <span>Status</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-border/70">
                {items.map((plan) => (
                  <div
                    key={plan.id}
                    className="grid grid-cols-[minmax(220px,2fr)_1.35fr_1.1fr_1.2fr_1.2fr_180px] gap-4 px-6 py-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-foreground">{plan.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Criado em {new Date(plan.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-semibold text-foreground">{formatCurrency(plan.annualPrice)} /ano</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {plan.monthlyEnabled && plan.monthlyPrice !== null
                            ? `${formatCurrency(plan.monthlyPrice)} /mes`
                            : "Mensal desativado"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-foreground">Maximo: {plan.maxInstallments}x</p>
                      <p className="text-muted-foreground">Sem juros: {plan.maxInstallmentsNoInterest}x</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-foreground">{plan.usage.accessPermissions} ativas</p>
                      <p className="text-muted-foreground">{plan.usage.orderItems} contratações</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone(plan.status)}`}>
                          {statusLabel(plan.status)}
                        </span>
                        {plan.highlighted ? (
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-1 text-[11px] text-cyan-400">
                            Destaque
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">
                        {plan.monthlyEnabled ? "Anual e mensal visiveis" : "Somente anual visivel"}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(plan)}
                        className="rounded-full border border-border p-2.5 transition hover:bg-accent"
                        title="Editar plano"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        disabled={busyId === plan.id}
                        className="rounded-full border border-red-500/30 p-2.5 text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                        title="Excluir plano"
                      >
                        {busyId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/70 bg-card/95 px-6 py-5 backdrop-blur">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-foreground">{editingId ? "Editar plano" : "Novo plano"}</h3>
                <p className="text-sm text-muted-foreground">Preencha apenas os dados comerciais importantes do plano.</p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-full border border-border p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Nome do plano</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-border/80 bg-background px-4 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder="Plano anual"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Descricao curta</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[96px] w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder="Texto curto para o plano"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Valor anual</label>
                  <input
                    value={form.annualPrice}
                    onChange={(event) => setForm((current) => ({ ...current, annualPrice: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder="997.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Dias de acesso anual</label>
                  <input
                    value={form.annualAccessDurationDays}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, annualAccessDurationDays: event.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder="365"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/40 p-4 md:col-span-2">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.monthlyEnabled}
                      onChange={(event) => setForm((current) => ({ ...current, monthlyEnabled: event.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-border bg-background"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Habilitar opcao mensal</span>
                      <span className="block text-xs text-muted-foreground">Ative apenas se o plano puder ser vendido tambem no mensal.</span>
                    </span>
                  </label>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Valor mensal</label>
                      <input
                        value={form.monthlyPrice}
                        onChange={(event) => setForm((current) => ({ ...current, monthlyPrice: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-45"
                        placeholder="97.00"
                        disabled={!form.monthlyEnabled}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Dias de acesso mensal</label>
                      <input
                        value={form.monthlyAccessDurationDays}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, monthlyAccessDurationDays: event.target.value }))
                        }
                        className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60 disabled:cursor-not-allowed disabled:opacity-45"
                        placeholder="30"
                        disabled={!form.monthlyEnabled}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Parcelamento maximo</label>
                  <input
                    value={form.maxInstallments}
                    onChange={(event) => setForm((current) => ({ ...current, maxInstallments: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder="12"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Maximo sem juros</label>
                  <input
                    value={form.maxInstallmentsNoInterest}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxInstallmentsNoInterest: event.target.value }))
                    }
                    className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PlanStatus }))}
                    className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm outline-none transition focus:border-cyan-500/60"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Destaque</label>
                  <label className="flex h-11 cursor-pointer items-center gap-3 rounded-2xl border border-border/80 bg-background px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.highlighted}
                      onChange={(event) => setForm((current) => ({ ...current, highlighted: event.target.checked }))}
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                    Destacar este plano
                  </label>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Beneficios do card</label>
                  <textarea
                    value={form.benefitsText}
                    onChange={(event) => setForm((current) => ({ ...current, benefitsText: event.target.value }))}
                    className="min-h-[120px] w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm outline-none transition focus:border-cyan-500/60"
                    placeholder={"Vitalicio\nAcesso ilimitado\nCertificado incluso"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-accent"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando
                    </span>
                  ) : editingId ? (
                    "Salvar alterações"
                  ) : (
                    "Criar plano"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
