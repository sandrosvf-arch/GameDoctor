"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react"

type DiscountType = "PERCENTAGE" | "FIXED"
type CouponStatus = "ACTIVE" | "INACTIVE" | "EXPIRED"

interface PlanOption {
  id: string
  name: string
}

interface CouponItem {
  id: string
  code: string
  discountType: DiscountType
  discountValue: number
  planId: string | null
  startsAt: string | null
  expiresAt: string | null
  maxUses: number | null
  usesCount: number
  maxUsesPerUser: number | null
  status: CouponStatus
  createdAt: string
  plan: PlanOption | null
  usage: {
    orders: number
  }
}

interface ApiResponse {
  coupons: CouponItem[]
  plans: PlanOption[]
}

interface FormState {
  code: string
  discountType: DiscountType
  discountValue: string
  planId: string
  startsAt: string
  expiresAt: string
  maxUses: string
  maxUsesPerUser: string
  status: CouponStatus
}

const emptyForm: FormState = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  planId: "",
  startsAt: "",
  expiresAt: "",
  maxUses: "",
  maxUsesPerUser: "",
  status: "ACTIVE",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDiscount(coupon: CouponItem) {
  if (coupon.discountType === "PERCENTAGE") return `${coupon.discountValue}%`
  return formatCurrency(coupon.discountValue)
}

function formatDateTime(value: string | null) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function statusLabel(status: CouponStatus) {
  if (status === "ACTIVE") return "Ativo"
  if (status === "INACTIVE") return "Inativo"
  return "Expirado"
}

function statusTone(status: CouponStatus) {
  if (status === "ACTIVE") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  if (status === "INACTIVE") return "border-slate-500/20 bg-slate-500/10 text-slate-400"
  return "border-amber-500/20 bg-amber-500/10 text-amber-300"
}

function discountTypeLabel(type: DiscountType) {
  if (type === "PERCENTAGE") return "Percentual"
  return "Valor fixo"
}

function usageText(coupon: CouponItem) {
  if (coupon.maxUses === null) {
    return `${coupon.usesCount} uso${coupon.usesCount !== 1 ? "s" : ""}`
  }

  return `${coupon.usesCount} de ${coupon.maxUses}`
}

function usagePercentage(coupon: CouponItem) {
  if (!coupon.maxUses || coupon.maxUses <= 0) return 0
  return Math.min(100, Math.round((coupon.usesCount / coupon.maxUses) * 100))
}

function toDatetimeLocal(value: string | null) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const pad = (input: number) => String(input).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function AdminCuponsPage() {
  const [items, setItems] = useState<CouponItem[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | CouponStatus>("all")

  const activeCount = useMemo(
    () => items.filter((coupon) => coupon.status === "ACTIVE").length,
    [items]
  )

  const totalUses = useMemo(
    () => items.reduce((sum, coupon) => sum + coupon.usesCount, 0),
    [items]
  )

  const totalOrders = useMemo(
    () => items.reduce((sum, coupon) => sum + coupon.usage.orders, 0),
    [items]
  )

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return items.filter((coupon) => {
      const matchesStatus = statusFilter === "all" || coupon.status === statusFilter

      const matchesSearch =
        !normalizedSearch ||
        coupon.code.toLowerCase().includes(normalizedSearch) ||
        coupon.plan?.name.toLowerCase().includes(normalizedSearch)

      return matchesStatus && matchesSearch
    })
  }, [items, search, statusFilter])

  async function load() {
    setLoading(true)
    setError(null)

    const response = await fetch("/api/admin/cupons", {
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível carregar os cupons.")
      setLoading(false)
      return
    }

    const payload = data as ApiResponse

    setItems(payload.coupons)
    setPlans(payload.plans)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  function closeModal() {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(false)
  }

  function openCreateModal() {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  function startEdit(coupon: CouponItem) {
    setEditingId(coupon.id)

    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      planId: coupon.planId ?? "",
      startsAt: toDatetimeLocal(coupon.startsAt),
      expiresAt: toDatetimeLocal(coupon.expiresAt),
      maxUses: coupon.maxUses === null ? "" : String(coupon.maxUses),
      maxUsesPerUser: coupon.maxUsesPerUser === null ? "" : String(coupon.maxUsesPerUser),
      status: coupon.status,
    })

    setIsModalOpen(true)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: form.discountValue,
      planId: form.planId,
      startsAt: form.startsAt,
      expiresAt: form.expiresAt,
      maxUses: form.maxUses,
      maxUsesPerUser: form.maxUsesPerUser,
      status: form.status,
    }

    const response = await fetch(editingId ? `/api/admin/cupons/${editingId}` : "/api/admin/cupons", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)

    setSaving(false)

    if (!response.ok) {
      alert(data?.error ?? "Não foi possível salvar o cupom.")
      return
    }

    closeModal()
    await load()
  }

  async function handleDelete(coupon: CouponItem) {
    if (!confirm(`Deseja excluir o cupom "${coupon.code}"?`)) return

    setBusyId(coupon.id)

    const response = await fetch(`/api/admin/cupons/${coupon.id}`, {
      method: "DELETE",
    })

    const data = await response.json().catch(() => null)

    setBusyId(null)

    if (!response.ok) {
      alert(data?.error ?? "Não foi possível excluir o cupom.")
      return
    }

    if (editingId === coupon.id) {
      closeModal()
    }

    await load()
  }

  async function copyCouponCode(code: string) {
    await navigator.clipboard.writeText(code)
  }

  return (
    <div className="min-h-screen bg-[#090c11] text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <header className="mb-6 rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="flex flex-col gap-5 border-b border-white/[0.08] px-5 py-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
                Administração
              </div>

              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                Cupons
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Crie, limite e acompanhe cupons promocionais vinculados a campanhas, planos ou alunos específicos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => load()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </button>

              <button
                onClick={openCreateModal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Novo cupom
              </button>
            </div>
          </div>

          <div className="grid gap-px bg-white/[0.08] sm:grid-cols-2 xl:grid-cols-4">
            <SummaryBox
              label="Cupons"
              value={items.length}
              description="Total cadastrado"
            />

            <SummaryBox
              label="Ativos"
              value={activeCount}
              description="Disponíveis para uso"
            />

            <SummaryBox
              label="Usos"
              value={totalUses}
              description="Utilizações registradas"
            />

            <SummaryBox
              label="Pedidos"
              value={totalOrders}
              description="Pedidos com cupom"
            />
          </div>
        </header>

        <section className="mb-5 rounded-lg border border-white/[0.08] bg-[#0c1017] p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código ou plano"
                className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | CouponStatus)}
              className="h-10 rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            >
              <option value="all">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
              <option value="EXPIRED">Expirados</option>
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="hidden grid-cols-[minmax(0,1fr)_140px_150px_140px_150px_150px] border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Cupom</div>
            <div>Desconto</div>
            <div>Uso</div>
            <div>Status</div>
            <div>Validade</div>
            <div className="text-right">Ações</div>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredItems.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {filteredItems.map((coupon) => (
                <CouponRow
                  key={coupon.id}
                  coupon={coupon}
                  busy={busyId === coupon.id}
                  onEdit={() => startEdit(coupon)}
                  onDelete={() => handleDelete(coupon)}
                  onCopy={() => copyCouponCode(coupon.code)}
                />
              ))}
            </div>
          )}
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.1] bg-[#0c1017] shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] bg-[#111722] px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editingId ? "Editar cupom" : "Novo cupom"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Configure desconto, validade, plano vinculado e limites de uso.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-md border border-white/[0.1] p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[calc(92vh-82px)] space-y-5 overflow-y-auto px-6 py-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Código">
                    <input
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Ex.: BEMVINDO10"
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                      required
                    />
                  </Field>

                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as CouponStatus,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                      <option value="EXPIRED">Expirado</option>
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
                  <Field label="Tipo de desconto">
                    <select
                      value={form.discountType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          discountType: event.target.value as DiscountType,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                    >
                      <option value="PERCENTAGE">Percentual</option>
                      <option value="FIXED">Valor fixo</option>
                    </select>
                  </Field>

                  <Field label={form.discountType === "PERCENTAGE" ? "Valor (%)" : "Valor (R$)"}>
                    <input
                      value={form.discountValue}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          discountValue: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                      required
                    />
                  </Field>
                </div>

                <Field label="Plano vinculado">
                  <select
                    value={form.planId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        planId: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  >
                    <option value="">Todos os planos</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Início da validade">
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startsAt: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Fim da validade">
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          expiresAt: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Limite total de uso">
                    <input
                      value={form.maxUses}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maxUses: event.target.value,
                        }))
                      }
                      placeholder="Vazio = ilimitado"
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                    />
                  </Field>

                  <Field label="Máximo por aluno">
                    <input
                      value={form.maxUsesPerUser}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maxUsesPerUser: event.target.value,
                        }))
                      }
                      placeholder="Vazio = livre"
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.08] pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                    {editingId ? "Salvar cupom" : "Criar cupom"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CouponRow({
  coupon,
  busy,
  onEdit,
  onDelete,
  onCopy,
}: {
  coupon: CouponItem
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
}) {
  const percentage = usagePercentage(coupon)

  return (
    <article className="grid gap-4 px-5 py-4 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(0,1fr)_140px_150px_140px_150px_150px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-sm font-semibold tracking-wide text-white">
              {coupon.code}
            </span>
          </div>

          <button
            onClick={onCopy}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
            title="Copiar código"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-2 truncate text-sm text-slate-500">
          {coupon.plan?.name ?? "Todos os planos"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
          <StatusBadge status={coupon.status} />
          <SmallBadge>{formatDiscount(coupon)}</SmallBadge>
          <SmallBadge>{usageText(coupon)}</SmallBadge>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">
          {formatDiscount(coupon)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {discountTypeLabel(coupon.discountType)}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-200">
          {usageText(coupon)}
        </p>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-white/40"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="mt-1 text-xs text-slate-600">
          {coupon.usage.orders} pedido{coupon.usage.orders !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="hidden lg:block">
        <StatusBadge status={coupon.status} />
      </div>

      <div className="text-sm text-slate-400">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-slate-600" />
          <span>{formatDateTime(coupon.expiresAt)}</span>
        </div>

        <p className="mt-1 text-xs text-slate-600">
          Início {formatDateTime(coupon.startsAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>

        <button
          onClick={onDelete}
          disabled={busy}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Excluir
        </button>
      </div>
    </article>
  )
}

function SummaryBox({
  label,
  value,
  description,
}: {
  label: string
  value: number | string
  description: string
}) {
  return (
    <div className="bg-[#0c1017] px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-white">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: CouponStatus }) {
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  )
}

function SmallBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-xs text-slate-500">
      {children}
    </span>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-300">
        Nenhum cupom encontrado
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Crie um novo cupom ou ajuste os filtros de busca.
      </p>
    </div>
  )
}