"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Users, CreditCard, BookOpen, MessageSquare,
  TrendingUp, TrendingDown, Loader2,
  Play, ExternalLink, Activity,
  CheckCircle2, BookMarked, LayoutDashboard,
  UserCog, ShoppingCart, BarChart3, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ─── Types ────────────────────────────────────────────────
interface Stats {
  totalStudents: number
  activeAccesses: number
  monthlyRevenue: number
  mrrChange: number
  completedLessons: number
  openComments: number
  publishedCourses: number
  totalLessons: number
  draftLessons: number
}
interface ChartPoint { month: string; value: number }
interface TopCourse { id: string; title: string; count: number; color: string | null }
interface PlanSlice { name: string; count: number }
interface RecentOrder {
  id: string
  user: { name: string; email: string; avatarUrl: string | null }
  plan: string | null
  course: string | null
  amount: number
  createdAt: string
}
interface RecentLesson { title: string; course: string; module: string | null; status: string; updatedAt: string }
interface RecentLog { action: string; entityType: string; description: string | null; adminName: string; createdAt: string }

interface DashboardData {
  stats: Stats
  revenueChart: ChartPoint[]
  topCourses: TopCourse[]
  planDistribution: PlanSlice[]
  recentOrders: RecentOrder[]
  recentLessons: RecentLesson[]
  recentLogs: RecentLog[]
}

// ─── Helpers ──────────────────────────────────────────────
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const fmtNum = (v: number) =>
  new Intl.NumberFormat("pt-BR").format(v)

const PIE_COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"]

// ─── Line Chart ───────────────────────────────────────────
function LineChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 400, H = 100, PX = 8, PY = 10
  const w = W - PX * 2, h = H - PY * 2
  const pts = data.map((d, i) => ({
    x: PX + (i / (data.length - 1)) * w,
    y: PY + h - (d.value / max) * h,
    ...d,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H} L${PX},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[100px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#lineGrad)" />
      <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#06b6d4" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

// ─── Donut Chart ──────────────────────────────────────────
function DonutChart({ data }: { data: PlanSlice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">Sem dados</div>
  const R = 36, C = 2 * Math.PI * R
  let offset = 0
  const segments = data.map((d, i) => {
    const pct = d.count / total
    const dash = pct * C
    const rotate = (offset / total) * 360 - 90
    offset += d.count
    return { ...d, dash, rotate, color: PIE_COLORS[i % PIE_COLORS.length] }
  })
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
        {segments.map((s, i) => (
          <circle key={i} cx="50" cy="50" r={R}
            fill="none" stroke={s.color} strokeWidth="14"
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            transform={`rotate(${s.rotate} 50 50)`}
          />
        ))}
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{fmtNum(total)}</text>
        <text x="50" y="58" textAnchor="middle" fill="#888" fontSize="7">Acessos</text>
      </svg>
      <div className="space-y-2 min-w-0 flex-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate text-sm">{s.name}</span>
            <span className="ml-auto text-xs text-muted-foreground shrink-0">
              {fmtNum(s.count)} ({Math.round(s.count / total * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, iconColor, trend,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconColor)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        {trend && (
          <p className={cn("mt-1.5 flex items-center gap-1 text-xs", trend.value >= 0 ? "text-emerald-400" : "text-red-400")}>
            {trend.value >= 0
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />
            }
            {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}% {trend.label}
          </p>
        )}
        {sub && !trend && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetch("/api/admin/dashboard")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-96 gap-3">
      <p className="text-muted-foreground text-sm">Não foi possível carregar o dashboard.</p>
      <Button size="sm" onClick={load}>Tentar novamente</Button>
    </div>
  )

  const { stats, revenueChart, topCourses, planDistribution, recentOrders, recentLessons, recentLogs } = data

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da plataforma</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total de Alunos"
          value={fmtNum(stats.totalStudents)}
          icon={Users}
          iconColor="bg-blue-500/15 text-blue-400"
          sub="alunos ativos"
        />
        <KpiCard
          label="Acessos Ativos"
          value={fmtNum(stats.activeAccesses)}
          icon={CreditCard}
          iconColor="bg-emerald-500/15 text-emerald-400"
          sub="com acesso vigente"
        />
        <KpiCard
          label="Receita Mensal"
          value={fmtCurrency(stats.monthlyRevenue)}
          icon={TrendingUp}
          iconColor="bg-cyan-500/15 text-cyan-400"
          trend={{ value: stats.mrrChange, label: "vs mês anterior" }}
        />
        <KpiCard
          label="Aulas Concluídas"
          value={fmtNum(stats.completedLessons)}
          icon={CheckCircle2}
          iconColor="bg-violet-500/15 text-violet-400"
          sub="total de conclusões"
        />
        <KpiCard
          label="Cursos Publicados"
          value={fmtNum(stats.publishedCourses)}
          icon={BookMarked}
          iconColor="bg-amber-500/15 text-amber-400"
          sub={`${fmtNum(stats.draftLessons)} aulas rascunho`}
        />
        <KpiCard
          label="Comentários"
          value={fmtNum(stats.openComments)}
          icon={MessageSquare}
          iconColor="bg-rose-500/15 text-rose-400"
          sub="total de comentários"
        />
      </div>

      {/* Revenue Chart + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm">Receita recorrente (MRR)</h2>
              <p className="text-2xl font-bold mt-1">{fmtCurrency(stats.monthlyRevenue)}</p>
              {stats.mrrChange !== 0 && (
                <p className={cn("flex items-center gap-1 text-xs mt-0.5", stats.mrrChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {stats.mrrChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stats.mrrChange >= 0 ? "+" : ""}{stats.mrrChange.toFixed(1)}% vs mês anterior
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">Últimos 12 meses</span>
          </div>
          <LineChart data={revenueChart} />
          <div className="mt-2 flex justify-between">
            {revenueChart.map((p, i) => (
              <span key={i} className="text-[10px] text-muted-foreground capitalize">{p.month}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="font-semibold text-sm mb-4">Distribuição de Acessos</h2>
          {planDistribution.length > 0
            ? <DonutChart data={planDistribution} />
            : <p className="text-xs text-muted-foreground text-center py-12">Nenhum dado disponível</p>
          }
        </div>
      </div>

      {/* Top Courses + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Trilhas mais acessadas</h2>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/admin/trilhas">Ver todas <ExternalLink className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {topCourses.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            : (
              <div className="space-y-3">
                {topCourses.map((c, i) => {
                  const hex = (() => {
                    if (!c.color) return "#06b6d4"
                    const m = c.color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
                    if (!m) return c.color.startsWith("#") ? c.color : "#06b6d4"
                    return `#${((parseInt(m[1]) << 16) | (parseInt(m[2]) << 8) | parseInt(m[3])).toString(16).padStart(6, "0")}`
                  })()
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}</span>
                      <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: `${hex}20`, color: hex }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{fmtNum(c.count)} conclusões de aula</p>
                      </div>
                      <Link href={`/admin/trilhas/${c.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Matrículas recentes</h2>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/admin/pedidos">Ver todas <ExternalLink className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {recentOrders.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-8">Nenhum pedido aprovado recente</p>
            : (
              <div className="space-y-3">
                {recentOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {o.user.avatarUrl
                        ? <img src={o.user.avatarUrl} alt="" className="h-8 w-8 object-cover" />
                        : <Users className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.plan ?? o.course ?? o.user.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-400">{fmtCurrency(o.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(o.createdAt), "dd/MM/yy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Bottom row: Content stats + Recent lessons + Quick actions + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Gestão de Conteúdo
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Cursos Publicados", value: fmtNum(stats.publishedCourses), color: "text-cyan-400" },
              { label: "Aulas Publicadas", value: fmtNum(stats.totalLessons), color: "text-emerald-400" },
              { label: "Rascunhos", value: fmtNum(stats.draftLessons), color: "text-amber-400" },
              { label: "Comentários", value: fmtNum(stats.openComments), color: "text-violet-400" },
            ].map(item => (
              <div key={item.label} className="rounded-lg bg-background/40 p-3 text-center">
                <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" /> Aulas recentes
            </h2>
            <Button size="sm" variant="ghost" asChild className="text-xs">
              <Link href="/admin/aulas">Ver <ExternalLink className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {recentLessons.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-8">Nenhuma aula cadastrada</p>
            : (
              <div className="space-y-3">
                {recentLessons.map((l, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Play className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{l.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{l.course}{l.module ? ` · ${l.module}` : ""}</p>
                    </div>
                    <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border",
                      l.status === "PUBLISHED"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                    )}>
                      {l.status === "PUBLISHED" ? "Pub." : "Rascunho"}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-muted-foreground" /> Ações Rápidas
          </h2>
          <div className="space-y-1">
            {[
              { href: "/admin/trilhas", icon: BookMarked, label: "Gerenciar Trilhas", color: "text-cyan-400" },
              { href: "/admin/aulas", icon: Play, label: "Todas as Aulas", color: "text-blue-400" },
              { href: "/admin/alunos", icon: UserCog, label: "Gerenciar Alunos", color: "text-violet-400" },
              { href: "/admin/pedidos", icon: ShoppingCart, label: "Ver Pedidos", color: "text-emerald-400" },
              { href: "/admin/pagamentos", icon: CreditCard, label: "Pagamentos", color: "text-amber-400" },
              { href: "/admin/relatorios", icon: BarChart3, label: "Relatórios", color: "text-rose-400" },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted/60 transition-colors group">
                <a.icon className={cn("h-4 w-4 shrink-0", a.color)} />
                <span className="truncate">{a.label}</span>
                <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-muted-foreground" /> Atividade Recente
          </h2>
          {recentLogs.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-8">Nenhuma atividade registrada</p>
            : (
              <div className="space-y-3">
                {recentLogs.map((l, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Activity className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {l.adminName} — <span className="text-muted-foreground font-normal">{l.action}</span>
                      </p>
                      {l.description && <p className="text-[11px] text-muted-foreground truncate">{l.description}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {format(new Date(l.createdAt), "dd/MM/yy · HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

    </div>
  )
}
