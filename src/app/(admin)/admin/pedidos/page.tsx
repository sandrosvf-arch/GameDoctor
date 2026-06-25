"use client"

import { ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ChevronDown,
  CreditCard,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react"

type PaymentMethod = "PIX" | "CREDIT_CARD" | "BOLETO" | null
type PaymentGateway = "MERCADOPAGO" | "PAGARME" | "ASAAS" | "STRIPE" | "IUGU" | "PAGSEGURO" | "MANUAL" | null
type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REFUSED"
  | "CANCELLED"
  | "REFUNDED"
  | "CHARGEBACK"
  | "EXPIRED"
  | "FAILED"

interface OrderItem {
  id: string
  label: string
  type: "plan" | "course"
  price: number
}

interface OrderRow {
  id: string
  total: number
  discountTotal: number
  finalTotal: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  gateway: PaymentGateway
  gatewayReference: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  coupon: {
    code: string
  } | null
  items: OrderItem[]
  latestPayment: {
    id: string
    gateway: PaymentGateway
    paymentMethod: PaymentMethod
    paymentStatus: PaymentStatus
    amount: number
    installments: number
    paidAt: string | null
    expiresAt: string | null
    createdAt: string
  } | null
}

interface Summary {
  totalOrders: number
  approvedOrders: number
  pendingOrders: number
  cancelledOrders: number
  approvedRevenue: number
}

interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

interface ApiResponse {
  summary: Summary
  orders: OrderRow[]
  pagination: Pagination
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "-"

  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  })
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "APPROVED") return "Pago"
  if (status === "PENDING") return "Pendente"
  if (status === "REFUNDED") return "Reembolsado"
  if (status === "CHARGEBACK") return "Chargeback"
  if (status === "EXPIRED") return "Expirado"
  if (status === "FAILED") return "Falhou"
  if (status === "REFUSED") return "Recusado"
  return "Cancelado"
}

function paymentStatusTone(status: PaymentStatus) {
  if (status === "APPROVED") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  if (status === "PENDING") return "border-amber-500/20 bg-amber-500/10 text-amber-300"
  if (status === "REFUNDED") return "border-sky-500/20 bg-sky-500/10 text-sky-300"
  if (status === "CHARGEBACK") return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300"
  return "border-red-500/20 bg-red-500/10 text-red-300"
}

function paymentMethodLabel(method: PaymentMethod) {
  if (method === "PIX") return "Pix"
  if (method === "CREDIT_CARD") return "Cartão"
  if (method === "BOLETO") return "Boleto"
  return "-"
}

function gatewayLabel(gateway: PaymentGateway) {
  if (!gateway) return "-"
  if (gateway === "MERCADOPAGO") return "Mercado Pago"
  if (gateway === "PAGARME") return "Pagar.me"
  if (gateway === "PAGSEGURO") return "PagSeguro"
  return gateway
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export default function AdminPedidosPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const pageNumbers = useMemo(() => {
    if (!pagination) return []

    const start = Math.max(1, pagination.page - 2)
    const end = Math.min(pagination.totalPages, pagination.page + 2)

    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [pagination])

  async function load(targetPage = page) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: "15",
      q: deferredSearch,
      status: statusFilter,
    })

    const response = await fetch(`/api/admin/pedidos?${params.toString()}`, {
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível carregar os pedidos.")
      setLoading(false)
      return
    }

    const payload = data as ApiResponse

    setSummary(payload.summary)
    setOrders(payload.orders)
    setPagination(payload.pagination)
    setPage(payload.pagination.page)
    setLoading(false)
  }

  useEffect(() => {
    void load(page)
  }, [page, deferredSearch, statusFilter])

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
                Pedidos
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Acompanhe pagamentos, identifique pendências e consulte os itens comprados pelos alunos.
              </p>
            </div>

            <button
              onClick={() => load(1)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>

          <div className="grid gap-px bg-white/[0.08] sm:grid-cols-2 xl:grid-cols-4">
            <SummaryBox
              label="Pedidos"
              value={summary?.totalOrders ?? 0}
              description="Total encontrado no filtro atual"
            />

            <SummaryBox
              label="Pagos"
              value={summary?.approvedOrders ?? 0}
              description="Pagamentos confirmados"
            />

            <SummaryBox
              label="Pendentes"
              value={summary?.pendingOrders ?? 0}
              description="Aguardando confirmação"
            />

            <SummaryBox
              label="Recebido"
              value={formatCurrency(summary?.approvedRevenue ?? 0)}
              description="Receita aprovada"
            />
          </div>
        </header>

        <section className="mb-5 rounded-lg border border-white/[0.08] bg-[#0c1017] p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por comprador, e-mail, pedido ou item"
                className="h-10 w-full rounded-md border border-white/[0.1] bg-[#080b10] pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-500"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="h-10 rounded-md border border-white/[0.1] bg-[#080b10] px-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            >
              <option value="all">Todos os status</option>
              <option value="APPROVED">Pago</option>
              <option value="PENDING">Pendente</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="REFUNDED">Reembolsado</option>
              <option value="CHARGEBACK">Chargeback</option>
              <option value="FAILED">Falhou</option>
              <option value="REFUSED">Recusado</option>
              <option value="EXPIRED">Expirado</option>
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
          <div className="hidden grid-cols-[120px_minmax(0,1fr)_150px_150px_150px_44px] border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <div>Pedido</div>
            <div>Comprador</div>
            <div>Pagamento</div>
            <div>Status</div>
            <div className="text-right">Total</div>
            <div />
          </div>

          {loading ? (
            <LoadingState />
          ) : orders.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {orders.map((order) => {
                const expanded = expandedOrderId === order.id

                return (
                  <OrderItemRow
                    key={order.id}
                    order={order}
                    expanded={expanded}
                    onToggle={() => setExpandedOrderId(expanded ? null : order.id)}
                  />
                )
              })}
            </div>
          )}

          {pagination && orders.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                Mostrando {orders.length} de {pagination.totalItems} pedidos
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPreviousPage}
                  className="h-9 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={[
                      "h-9 min-w-9 rounded-md px-3 text-sm font-medium transition",
                      pageNumber === pagination.page
                        ? "bg-white text-slate-950"
                        : "border border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNextPage}
                  className="h-9 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function OrderItemRow({
  order,
  expanded,
  onToggle,
}: {
  order: OrderRow
  expanded: boolean
  onToggle: () => void
}) {
  const customerName = order.user.name?.trim() || "Aluno sem nome"
  const gateway = gatewayLabel(order.latestPayment?.gateway ?? order.gateway)
  const method = paymentMethodLabel(order.latestPayment?.paymentMethod ?? order.paymentMethod)

  return (
    <article className="transition hover:bg-white/[0.025]">
      <button
        onClick={onToggle}
        className="grid w-full gap-4 px-5 py-4 text-left lg:grid-cols-[120px_minmax(0,1fr)_150px_150px_150px_44px] lg:items-center"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300">
            <ReceiptText className="h-3.5 w-3.5 text-slate-500" />
            #{shortId(order.id)}
          </div>

          <p className="mt-2 text-xs text-slate-600 lg:hidden">
            {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500">
              <UserRound className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">
                {customerName}
              </h2>

              <p className="truncate text-xs text-slate-500">
                {order.user.email}
              </p>
            </div>
          </div>

          <p className="mt-2 line-clamp-1 text-xs text-slate-600">
            {order.items.map((item) => item.label).join(" · ")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:block">
          <p className="text-sm font-medium text-slate-200">
            {method}
          </p>

          <p className="text-xs text-slate-500">
            {gateway}
          </p>
        </div>

        <div>
          <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${paymentStatusTone(order.paymentStatus)}`}>
            {paymentStatusLabel(order.paymentStatus)}
          </span>
        </div>

        <div className="lg:text-right">
          <p className="text-sm font-semibold text-white">
            {formatCurrency(order.finalTotal)}
          </p>

          {order.discountTotal > 0 && (
            <p className="text-xs text-slate-500">
              {formatCurrency(order.discountTotal)} de desconto
            </p>
          )}
        </div>

        <div className="hidden justify-end lg:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500">
            <ChevronDown className={["h-4 w-4 transition", expanded ? "rotate-180" : ""].join(" ")} />
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs text-slate-500 lg:hidden">
          <span>{formatCurrency(order.finalTotal)}</span>
          <span>{expanded ? "Ocultar detalhes" : "Ver detalhes"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.08] bg-[#080b10] px-5 py-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <DetailSection title="Dados do pedido">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailItem label="Pedido" value={order.id} />
                  <DetailItem label="Criado em" value={formatDate(order.createdAt)} />
                  <DetailItem label="Atualizado em" value={formatDate(order.updatedAt)} />
                  <DetailItem label="Referência externa" value={order.gatewayReference || "-"} />
                </div>
              </DetailSection>

              <DetailSection title="Itens comprados">
                <div className="divide-y divide-white/[0.08] rounded-md border border-white/[0.08]">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {item.label}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.type === "plan" ? "Plano" : "Curso"}
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                  ))}
                </div>

                {order.coupon && (
                  <div className="mt-3 rounded-md border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-300">
                    Cupom aplicado: <span className="font-semibold">{order.coupon.code}</span>
                  </div>
                )}
              </DetailSection>

              {order.latestPayment && (
                <DetailSection title="Último pagamento">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailItem label="Status" value={paymentStatusLabel(order.latestPayment.paymentStatus)} />
                    <DetailItem label="Gateway" value={gatewayLabel(order.latestPayment.gateway)} />
                    <DetailItem label="Método" value={paymentMethodLabel(order.latestPayment.paymentMethod)} />
                    <DetailItem
                      label="Parcelamento"
                      value={order.latestPayment.installments > 1 ? `${order.latestPayment.installments}x` : "À vista"}
                    />
                    <DetailItem label="Valor" value={formatCurrency(order.latestPayment.amount)} />
                    <DetailItem label="Criado em" value={formatDate(order.latestPayment.createdAt)} />
                    <DetailItem label="Pago em" value={formatDate(order.latestPayment.paidAt)} />
                    <DetailItem label="Expira em" value={formatDate(order.latestPayment.expiresAt)} />
                  </div>
                </DetailSection>
              )}
            </div>

            <aside className="space-y-3">
              <FinancialCard
                label="Subtotal"
                value={formatCurrency(order.total)}
                icon={<ShoppingCart className="h-4 w-4" />}
              />

              <FinancialCard
                label="Desconto"
                value={formatCurrency(order.discountTotal)}
                icon={<CreditCard className="h-4 w-4" />}
              />

              <FinancialCard
                label="Total final"
                value={formatCurrency(order.finalTotal)}
                icon={<Wallet className="h-4 w-4" />}
                strong
              />
            </aside>
          </div>
        </div>
      )}
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

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-white">
        {title}
      </h3>

      {children}
    </section>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
        {label}
      </p>

      <p className="mt-1 break-words text-sm text-slate-300">
        {value}
      </p>
    </div>
  )
}

function FinancialCard({
  label,
  value,
  icon,
  strong = false,
}: {
  label: string
  value: string
  icon: ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={[
        "rounded-md border px-4 py-4",
        strong
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-white/[0.08] bg-white/[0.025]",
      ].join(" ")}
    >
      <div className={["flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em]", strong ? "text-emerald-300" : "text-slate-500"].join(" ")}>
        {icon}
        {label}
      </div>

      <p className="mt-3 text-xl font-semibold text-white">
        {value}
      </p>
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
        Nenhum pedido encontrado
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Ajuste os filtros ou tente uma nova busca.
      </p>
    </div>
  )
}