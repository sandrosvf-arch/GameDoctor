"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Play, Award, Clock, Flame, CheckCircle2, TrendingUp,
  TrendingDown, Loader2, Calendar, BookMarked, BarChart3,
  Star, ChevronRight, CalendarCheck2, Trophy,
  Shield, Zap, Target, Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PlanInfo {
  name: string | null
  daysRemaining: number | null
  expiresAt: string | null
  isLifetime: boolean
}

interface HeroLesson {
  id: string
  title: string
  courseId: string
  courseTitle: string
  platformName: string | null
  thumbnail: string | null
  videoProviderId: string | null
  durationSeconds: number | null
  watchedSeconds: number
  progressPct: number
}

interface ContinueLesson {
  id: string
  title: string
  courseId: string
  courseTitle: string
  platformName: string | null
  platformColor: string | null
  thumbnail: string | null
  videoProviderId: string | null
  durationSeconds: number | null
  watchedSeconds: number
  progressPct: number
}

interface Stats {
  totalCompleted: number
  weekCompleted: number
  prevWeekCompleted: number
  totalStudySeconds: number
  weekStudySeconds: number
  prevWeekStudySeconds: number
  streak: number
  bestStreak: number
  totalCertificates: number
  totalLessonsAvailable: number
  overallProgress: number
  avgProgress: number
}

interface CourseProgress {
  id: string
  title: string
  platformName: string | null
  platformColor: string | null
  totalLessons: number
  completedLessons: number
  progress: number
}

interface UpcomingLesson {
  id: string
  title: string
  courseTitle: string
  platformName: string | null
  durationSeconds: number | null
}

interface Certificate {
  courseTitle: string
  issuedAt: string
}

interface DashboardData {
  user: { name: string; avatarUrl: string | null; email: string }
  plan: PlanInfo | null
  heroLesson: HeroLesson | null
  continueWatching: ContinueLesson[]
  stats: Stats
  myCourses: CourseProgress[]
  weeklyChart: { label: string; seconds: number }[]
  upcomingLessons: UpcomingLesson[]
  certificates: Certificate[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim()
  return `${m} min`
}

function fmtStudyTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m > 0 ? `${m.toString().padStart(2, "0")}m` : ""}`.trim()
  return `${m}m`
}

function getThumbnailUrl(lesson: { thumbnail: string | null; videoProviderId: string | null }): string | null {
  if (lesson.thumbnail) return lesson.thumbnail
  if (lesson.videoProviderId) {
    return `https://vz-38444944-922.b-cdn.net/${lesson.videoProviderId}/thumbnail.jpg`
  }
  return null
}

function platformColor(name: string | null, custom?: string | null): string {
  if (custom) {
    if (custom.startsWith("#")) return custom
    const m = custom.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
    if (m) return `#${((parseInt(m[1]) << 16) | (parseInt(m[2]) << 8) | parseInt(m[3])).toString(16).padStart(6, "0")}`
  }
  const lower = (name ?? "").toLowerCase()
  if (lower.includes("playstation") || lower.includes("ps5") || lower.includes("ps4")) return "#006FCD"
  if (lower.includes("xbox")) return "#107C10"
  if (lower.includes("nintendo")) return "#E4000F"
  if (lower.includes("eletrônica") || lower.includes("eletronica") || lower.includes("reparo")) return "#F59E0B"
  return "#06b6d4"
}

// ─── Donut Progress ────────────────────────────────────────────────────────────
function DonutProgress({ pct, size = 80, strokeWidth = 8, color = "#06b6d4" }: {
  pct: number; size?: number; strokeWidth?: number; color?: string
}) {
  const R = (size - strokeWidth) / 2
  const C = 2 * Math.PI * R
  const dash = (pct / 100) * C
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#ffffff15" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

// ─── Line Chart ────────────────────────────────────────────────────────────────
function StudyChart({ data }: { data: { label: string; seconds: number }[] }) {
  if (!data.length) return null
  const maxVal = Math.max(...data.map(d => d.seconds), 1)
  const W = 500, H = 110, PX = 10, PY = 12
  const w = W - PX * 2, h = H - PY * 2
  const pts = data.map((d, i) => ({
    x: PX + (i / (data.length - 1)) * w,
    y: PY + h - (d.seconds / maxVal) * h,
    ...d,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H} L${PX},${H} Z`

  // Y-axis labels (hours)
  const maxHours = Math.ceil(maxVal / 3600)
  const yLabels = [0, Math.round(maxHours / 2), maxHours]

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[110px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line key={i} x1={PX} y1={PY + h * r} x2={W - PX} y2={PY + h * r}
            stroke="#ffffff08" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={areaPath} fill="url(#studyGrad)" />
        <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0a1628" stroke="#06b6d4"
            strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] text-muted-foreground">{d.label}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Plan Badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: PlanInfo }) {
  if (plan.isLifetime) {
    return (
      <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
        <Shield className="h-3 w-3" /> {plan.name ?? "Acesso Vitalício"} — Vitalício
      </span>
    )
  }
  if (plan.daysRemaining !== null) {
    const isWarning = plan.daysRemaining <= 30
    const isUrgent = plan.daysRemaining <= 7
    return (
      <span className={cn(
        "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium",
        isUrgent
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : isWarning
          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
          : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
      )}>
        <CalendarCheck2 className="h-3 w-3" />
        {plan.name ?? "Plano"} — {plan.daysRemaining} {plan.daysRemaining === 1 ? "dia restante" : "dias restantes"}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-medium">
      <Shield className="h-3 w-3" /> {plan.name ?? "Plano ativo"}
    </span>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, progress, progressColor }: {
  label: string; value: string; sub?: string; icon: React.ElementType
  color: string; progress?: number; progressColor?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground leading-tight">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0", color)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      {progress !== undefined ? (
        <div className="flex items-center gap-2">
          <DonutProgress pct={progress} size={40} strokeWidth={5} color={progressColor ?? "#06b6d4"} />
          <div>
            <p className="text-lg font-bold leading-none">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Achievement Badges ────────────────────────────────────────────────────────
function computeAchievements(stats: Stats, courses: CourseProgress[]) {
  const badges = [
    {
      id: "first",
      label: "Primeiro Passo",
      sub: "1 aula concluída",
      icon: Star,
      color: "#F59E0B",
      earned: stats.totalCompleted >= 1,
    },
    {
      id: "streak7",
      label: "Persistente",
      sub: `${stats.streak} dias seguidos`,
      icon: Flame,
      color: "#EF4444",
      earned: stats.streak >= 7,
    },
    {
      id: "lessons10",
      label: "Detetive",
      sub: "10 aulas concluídas",
      icon: Trophy,
      color: "#8B5CF6",
      earned: stats.totalCompleted >= 10,
    },
    {
      id: "lessons50",
      label: "Soldador",
      sub: "50 aulas concluídas",
      icon: Zap,
      color: "#06B6D4",
      earned: stats.totalCompleted >= 50,
    },
    {
      id: "course100",
      label: "Mestre",
      sub: "Curso 100% concluído",
      icon: Award,
      color: "#10B981",
      earned: courses.some(c => c.progress === 100),
    },
    {
      id: "streak30",
      label: "Lendário",
      sub: "30 dias seguidos",
      icon: Shield,
      color: "#F59E0B",
      earned: stats.bestStreak >= 30,
    },
  ]
  return badges
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetch("/api/member/dashboard")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <p className="text-muted-foreground text-sm">Não foi possível carregar o dashboard.</p>
      <button onClick={load} className="text-sm text-primary underline">Tentar novamente</button>
    </div>
  )

  const {
    user, plan, heroLesson, continueWatching, stats,
    myCourses, weeklyChart, upcomingLessons, certificates,
  } = data

  const achievements = computeAchievements(stats, myCourses)
  const earnedBadges = achievements.filter(a => a.earned)
  const displayBadges = earnedBadges.length > 0 ? earnedBadges : achievements.slice(0, 4)

  const firstName = user.name.split(" ")[0]

  return (
    <div className="p-5 md:p-7 space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Olá, {firstName}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Continue evoluindo e domine a manutenção de videogames.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {plan && <PlanBadge plan={plan} />}
        </div>
      </div>

      {/* ── Row 1: Hero + Stats ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Hero "Continue" card */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card/40 overflow-hidden">
          {heroLesson ? (
            <>
              <div className="relative h-44 bg-muted overflow-hidden">
                {getThumbnailUrl(heroLesson) ? (
                  <img
                    src={getThumbnailUrl(heroLesson)!}
                    alt={heroLesson.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Play className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Platform badge */}
                {heroLesson.platformName && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white border border-white/20">
                    {heroLesson.platformName}
                  </span>
                )}
                {/* Play button */}
                <Link href={heroLesson.videoProviderId ? `/aula/bunny/${heroLesson.videoProviderId}` : `/curso/${heroLesson.courseId}`}
                  className="absolute inset-0 flex items-center justify-center group">
                  <div className="h-14 w-14 rounded-full bg-white/10 border-2 border-white/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Play className="h-6 w-6 text-white ml-0.5" />
                  </div>
                </Link>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{heroLesson.courseTitle}</p>
                  <p className="font-semibold text-sm leading-tight mt-0.5">{heroLesson.title}</p>
                </div>
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{heroLesson.progressPct}% concluído</span>
                    {heroLesson.durationSeconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {fmtDuration(Math.max(0, heroLesson.durationSeconds - heroLesson.watchedSeconds))} restantes
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${heroLesson.progressPct}%` }}
                    />
                  </div>
                </div>
                <Link href={heroLesson.videoProviderId ? `/aula/bunny/${heroLesson.videoProviderId}` : `/curso/${heroLesson.courseId}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Play className="h-4 w-4" /> Continuar Aula
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[280px] gap-3 p-6 text-center">
              <BookMarked className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Nenhuma aula iniciada ainda</p>
              <p className="text-xs text-muted-foreground">Escolha uma trilha e comece sua jornada!</p>
              <Link href="/meus-cursos" className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                Ver trilhas disponíveis
              </Link>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="xl:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Progresso Geral"
            value={`${stats.overallProgress}%`}
            sub={`de ${stats.totalLessonsAvailable} aulas`}
            icon={BarChart3}
            color="bg-cyan-500/15 text-cyan-400"
            progress={stats.overallProgress}
            progressColor="#06b6d4"
          />
          <StatCard
            label="Aulas Concluídas"
            value={stats.totalCompleted.toString()}
            sub={stats.weekCompleted > 0 ? `+${stats.weekCompleted} esta semana` : "total"}
            icon={CheckCircle2}
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            label="Horas de Estudo"
            value={fmtStudyTime(stats.totalStudySeconds)}
            sub={stats.weekStudySeconds > 0 ? `+${fmtStudyTime(stats.weekStudySeconds)} esta semana` : "total"}
            icon={Clock}
            color="bg-violet-500/15 text-violet-400"
          />
          <StatCard
            label="Sequência de Dias"
            value={stats.streak.toString()}
            sub={`Melhor: ${stats.bestStreak} dias`}
            icon={Flame}
            color="bg-orange-500/15 text-orange-400"
          />
          <StatCard
            label="Certificados"
            value={stats.totalCertificates.toString()}
            sub={stats.totalCertificates === 1 ? "certificado emitido" : "certificados emitidos"}
            icon={Award}
            color="bg-amber-500/15 text-amber-400"
          />
          <StatCard
            label="Aproveitamento"
            value={`${stats.avgProgress}%`}
            sub="média geral"
            icon={TrendingUp}
            color="bg-blue-500/15 text-blue-400"
            progress={stats.avgProgress}
            progressColor="#3b82f6"
          />
        </div>
      </div>

      {/* ── Row 2: Continue watching + Chart & Trails ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Continue watching */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Play className="h-4 w-4 text-muted-foreground" /> Continuar assistindo
            </h2>
            <Link href="/meus-cursos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              Ver tudo <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {continueWatching.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center">
              <Play className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma aula em andamento</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {continueWatching.map(lesson => {
                const color = platformColor(lesson.platformName, lesson.platformColor)
                const thumb = getThumbnailUrl(lesson)
                const remaining = lesson.durationSeconds
                  ? Math.max(0, lesson.durationSeconds - lesson.watchedSeconds)
                  : null
                return (
                  <Link
                    key={lesson.id}
                    href={lesson.videoProviderId ? `/aula/bunny/${lesson.videoProviderId}` : `/curso/${lesson.courseId}`}
                    className="group rounded-xl border border-border bg-card/40 overflow-hidden hover:border-border/80 hover:bg-card/60 transition-all"
                  >
                    <div className="relative h-24 bg-muted overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {/* Platform tag */}
                      {lesson.platformName && (
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${color}cc`, color: "#fff" }}>
                          {lesson.platformName}
                        </span>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-9 w-9 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">
                          <Play className="h-4 w-4 text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-2.5 space-y-1.5">
                      <p className="text-xs font-medium leading-tight line-clamp-2">{lesson.title}</p>
                      {/* Progress bar */}
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${lesson.progressPct}%`, backgroundColor: color }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">{lesson.progressPct}%</span>
                        {remaining !== null && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {fmtDuration(remaining)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Chart + My Trails */}
        <div className="xl:col-span-2 space-y-4">
          {/* Study chart */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Evolução do aprendizado</h2>
              <span className="text-xs text-muted-foreground">Últimas 8 semanas</span>
            </div>
            {weeklyChart.every(w => w.seconds === 0) ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                Nenhuma atividade registrada
              </div>
            ) : (
              <StudyChart data={weeklyChart} />
            )}
          </div>

          {/* My courses/trails */}
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Minhas Trilhas</h2>
              <Link href="/meus-cursos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {myCourses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma trilha iniciada ainda</p>
            ) : (
              <div className="space-y-3">
                {myCourses.slice(0, 4).map(course => {
                  const color = platformColor(course.platformName, course.platformColor)
                  return (
                    <Link key={course.id} href={`/curso/${course.id}`} className="flex items-center gap-3 group">
                      <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}20`, color }}>
                        <BookMarked className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium truncate">{course.title}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {course.completedLessons}/{course.totalLessons}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${course.progress}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold shrink-0 w-8 text-right" style={{ color }}>
                        {course.progress}%
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Conquistas + Próximas aulas + Meta semanal + Certificados ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* Conquistas */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" /> Conquistas
            </h2>
            <span className="text-xs text-muted-foreground">
              {earnedBadges.length}/{achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {achievements.slice(0, 6).map(badge => {
              const Icon = badge.icon
              return (
                <div key={badge.id} className="flex flex-col items-center gap-1 text-center">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all",
                    badge.earned
                      ? "shadow-lg"
                      : "opacity-30 grayscale"
                  )}
                    style={badge.earned ? { backgroundColor: `${badge.color}20`, border: `2px solid ${badge.color}40` } : { backgroundColor: "#ffffff10", border: "2px solid #ffffff15" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: badge.earned ? badge.color : "#888" }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-tight">{badge.label}</p>
                  <p className="text-[8px] text-muted-foreground/60 leading-tight">{badge.sub}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Próximas aulas */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Próximas aulas
            </h2>
          </div>
          {upcomingLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              <p className="text-xs text-muted-foreground text-center">Incrível! Você já assistiu todas as aulas disponíveis.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingLessons.slice(0, 4).map(lesson => {
                const color = platformColor(lesson.platformName)
                return (
                  <div key={lesson.id} className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}20` }}>
                      <Play className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{lesson.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{lesson.courseTitle}</p>
                    </div>
                    {lesson.durationSeconds && (
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {fmtDuration(lesson.durationSeconds)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Meta semanal */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" /> Meta semanal
            </h2>
          </div>
          {/* Goal: 12h per week */}
          {(() => {
            const goalSeconds = 12 * 3600
            const pct = Math.min(100, Math.round((stats.weekStudySeconds / goalSeconds) * 100))
            const remaining = Math.max(0, goalSeconds - stats.weekStudySeconds)
            return (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <DonutProgress pct={pct} size={100} strokeWidth={10} color={pct >= 100 ? "#10b981" : "#06b6d4"} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold leading-none">{fmtStudyTime(stats.weekStudySeconds)}</span>
                    <span className="text-[9px] text-muted-foreground">de 12h</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", pct >= 100 ? "text-emerald-400" : "")}>
                    {pct}% da meta
                  </p>
                  {pct < 100 ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Faltam {fmtStudyTime(remaining)} para completar a meta semanal!
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-400 mt-0.5">Meta semanal atingida! 🎉</p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Certificados recentes */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" /> Certificados recentes
            </h2>
            {certificates.length > 0 && (
              <Link href="/certificados" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver todos
              </Link>
            )}
          </div>
          {certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <Award className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground text-center">
                Complete um curso para ganhar seu primeiro certificado!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {certificates.map((cert, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 p-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Award className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{cert.courseTitle}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Emitido em {format(new Date(cert.issuedAt), "dd/MM/yyyy", { locale: ptBR })}
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
