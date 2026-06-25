"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Loader2,
  Play,
  ExternalLink,
  Activity,
  CheckCircle2,
  BookMarked,
  LayoutDashboard,
  UserCog,
  ShoppingCart,
  BarChart3,
  Zap,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Stats {
  totalStudents: number
  activeAccesses: number
  monthlyRevenue: number
  mrrChange: number
  completedLessons: number
  totalComments: number
  publishedCourses: number
  totalLessons: number
  draftLessons: number
}

interface ChartPoint {
  month: string
  value: number
}

interface TopCourse {
  id: string
  title: string
  count: number
  color: string | null
}

interface PlanSlice {
  name: string
  count: number
}

interface RecentOrder {
  id: string
  user: { name: string; email: string; avatarUrl: string | null }
  plan: string | null
  course: string | null
  amount: number
  approvedAt: string
}

interface RecentLesson {
  title: string
  course: string
  module: string | null
  status: string
  updatedAt: string
}

interface RecentLog {
  action: string
  entityType: string
  description: string | null
  adminName: string
  createdAt: string
}

interface DashboardData {
  stats: Stats
  revenueChart: ChartPoint[]
  topCourses: TopCourse[]
  planDistribution: PlanSlice[]
  recentOrders: RecentOrder[]
  recentLessons: RecentLesson[]
  recentLogs: RecentLog[]
}

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const fmtNum = (value: number) => new Intl.NumberFormat("pt-BR").format(value)

const PIE_COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"]

function LineChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return null

  const max = Math.max(...data.map((item) => item.value), 1)
  const width = 400
  const height = 100
  const paddingX = 8
  const paddingY = 10
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2

  const points = data.map((item, index) => ({
    x: paddingX + (index / Math.max(data.length - 1, 1)) * innerWidth,
    y: paddingY + innerHeight - (item.value / max) * innerHeight,
    ...item,
  }))

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ")
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height} L${paddingX},${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[100px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#lineGrad)" />
      <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="3"
          fill="#06b6d4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

function DonutChart({ data }: { data: PlanSlice[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  if (!total) {
    return <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">Sem dados</div>
  }

  const radius = 36
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = data.map((item, index) => {
    const percentage = item.count / total
    const dash = percentage * circumference
    const rotate = (offset / total) * 360 - 90
    offset += item.count

    return { ...item, dash, rotate, color: PIE_COLORS[index % PIE_COLORS.length] }
  })

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0">
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="14"
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            transform={`rotate(${segment.rotate} 50 50)`}
          />
        ))}
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
          {fmtNum(total)}
        </text>
        <text x="50" y="58" textAnchor="middle" fill="#888" fontSize="7">
          Acessos
        </text>
      </svg>

      <div className="min-w-0 flex-1 space-y-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="truncate text-sm">{segment.name}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {fmtNum(segment.count)} ({Math.round((segment.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconColor)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        {trend ? (
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs",
              trend.value >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}% {trend.label}
          </p>
        ) : null}
        {sub && !trend ? <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  )
}

function parseColor(color: string | null) {
  if (!color) return "#06b6d4"

  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
  if (rgbMatch) {
    return `#${((parseInt(rgbMatch[1], 10) << 16) | (parseInt(rgbMatch[2], 10) << 8) | parseInt(rgbMatch[3], 10))
      .toString(16)
      .padStart(6, "0")}`
  }

  return color.startsWith("#") ? color : "#06b6d4"
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)

    fetch("/api/admin/dashboard")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Nao foi possivel carregar o dashboard.</p>
        <Button size="sm" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const { stats, revenueChart, topCourses, planDistribution, recentOrders, recentLessons, recentLogs } = data

  return (
    <div className="max-w-[1400px] space-y-6 p-6 md:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          Dashboard
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Visao geral da plataforma</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total de alunos"
          value={fmtNum(stats.totalStudents)}
          icon={Users}
          iconColor="bg-blue-500/15 text-blue-400"
          sub="alunos ativos"
        />
        <KpiCard
          label="Acessos ativos"
          value={fmtNum(stats.activeAccesses)}
          icon={CreditCard}
          iconColor="bg-emerald-500/15 text-emerald-400"
          sub="vigentes neste momento"
        />
        <KpiCard
          label="Receita aprovada"
          value={fmtCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          iconColor="bg-cyan-500/15 text-cyan-400"
          trend={{ value: stats.mrrChange, label: "vs mes anterior" }}
        />
        <KpiCard
          label="Aulas concluidas"
          value={fmtNum(stats.completedLessons)}
          icon={CheckCircle2}
          iconColor="bg-violet-500/15 text-violet-400"
          sub="total de conclusoes"
        />
        <KpiCard
          label="Cursos publicados"
          value={fmtNum(stats.publishedCourses)}
          icon={BookMarked}
          iconColor="bg-amber-500/15 text-amber-400"
          sub={`${fmtNum(stats.draftLessons)} aulas em rascunho`}
        />
        <KpiCard
          label="Comentarios"
          value={fmtNum(stats.totalComments)}
          icon={MessageSquare}
          iconColor="bg-rose-500/15 text-rose-400"
          sub="comentarios cadastrados"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/20 p-5 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Receita aprovada por mes</h2>
              <p className="mt-1 text-2xl font-bold">{fmtCurrency(stats.monthlyRevenue)}</p>
              {stats.mrrChange !== 0 ? (
                <p
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-xs",
                    stats.mrrChange >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {stats.mrrChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.mrrChange >= 0 ? "+" : ""}
                  {stats.mrrChange.toFixed(1)}% vs mes anterior
                </p>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">Ultimos 12 meses</span>
          </div>

          <LineChart data={revenueChart} />

          <div className="mt-2 flex justify-between">
            {revenueChart.map((point, index) => (
              <span key={index} className="text-[10px] capitalize text-muted-foreground">
                {point.month}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="mb-4 text-sm font-semibold">Distribuicao de acessos ativos</h2>
          {planDistribution.length > 0 ? (
            <DonutChart data={planDistribution} />
          ) : (
            <p className="py-12 text-center text-xs text-muted-foreground">Nenhum dado disponivel</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Trilhas com mais aulas concluidas</h2>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/admin/trilhas">
                Ver todas <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          {topCourses.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhum dado disponivel</p>
          ) : (
            <div className="space-y-3">
              {topCourses.map((course, index) => {
                const hex = parseColor(course.color)

                return (
                  <div key={course.id} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-right text-xs text-muted-foreground">{index + 1}</span>
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                      style={{ backgroundColor: `${hex}20`, color: hex }}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtNum(course.count)} aulas concluidas</p>
                    </div>
                    <Link
                      href={`/admin/trilhas/${course.id}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pagamentos aprovados recentes</h2>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/admin/pedidos">
                Ver todas <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhum pagamento aprovado recente</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {order.user.avatarUrl ? (
                      <img src={order.user.avatarUrl} alt="" className="h-8 w-8 object-cover" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{order.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.plan ?? order.course ?? order.user.email}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-emerald-400">{fmtCurrency(order.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.approvedAt), "dd/MM/yy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Gestao de conteudo
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cursos publicados", value: fmtNum(stats.publishedCourses), color: "text-cyan-400" },
              { label: "Aulas publicadas", value: fmtNum(stats.totalLessons), color: "text-emerald-400" },
              { label: "Rascunhos", value: fmtNum(stats.draftLessons), color: "text-amber-400" },
              { label: "Comentarios", value: fmtNum(stats.totalComments), color: "text-violet-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-background/40 p-3 text-center">
                <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Play className="h-4 w-4 text-muted-foreground" /> Aulas atualizadas recentemente
            </h2>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/admin/aulas">
                Ver <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          {recentLessons.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma aula cadastrada</p>
          ) : (
            <div className="space-y-3">
              {recentLessons.map((lesson, index) => (
                <div key={`${lesson.title}-${index}`} className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Play className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{lesson.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {lesson.course}
                      {lesson.module ? ` - ${lesson.module}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px]",
                      lesson.status === "PUBLISHED"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        : "border-zinc-500/30 bg-zinc-500/15 text-zinc-400"
                    )}
                  >
                    {lesson.status === "PUBLISHED" ? "Pub." : "Rascunho"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-muted-foreground" /> Ações rápidas
          </h2>

          <div className="space-y-1">
            {[
              { href: "/admin/trilhas", icon: BookMarked, label: "Gerenciar Trilhas", color: "text-cyan-400" },
              { href: "/admin/aulas", icon: Play, label: "Todas as Aulas", color: "text-blue-400" },
              { href: "/admin/alunos", icon: UserCog, label: "Gerenciar Alunos", color: "text-violet-400" },
              { href: "/admin/pedidos", icon: ShoppingCart, label: "Ver Pedidos", color: "text-emerald-400" },
              { href: "/admin/pagamentos", icon: CreditCard, label: "Pagamentos", color: "text-amber-400" },
              { href: "/admin/relatorios", icon: BarChart3, label: "Relatorios", color: "text-rose-400" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                <action.icon className={cn("h-4 w-4 shrink-0", action.color)} />
                <span className="truncate">{action.label}</span>
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" /> Atividade recente
          </h2>

          {recentLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma atividade registrada</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log, index) => (
                <div key={`${log.action}-${index}`} className="flex items-start gap-2.5 text-xs">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Activity className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {log.adminName} - <span className="font-normal text-muted-foreground">{log.action}</span>
                    </p>
                    {log.description ? (
                      <p className="truncate text-[11px] text-muted-foreground">{log.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      {format(new Date(log.createdAt), "dd/MM/yy - HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
