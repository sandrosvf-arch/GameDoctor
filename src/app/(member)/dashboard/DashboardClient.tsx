"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import {
  Award,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanInfo {
  name: string | null
  daysRemaining: number | null
  expiresAt: string | null
  isLifetime: boolean
}

interface Achievement {
  id: string
  label: string
  earned: boolean
}

interface Stats {
  totalCompleted: number
  totalStudySeconds: number
  totalCertificates: number
  totalLessonsAvailable: number
  overallProgress: number
  streak: number
  bestStreak: number
  earnedAchievements: number
  totalAchievements: number
  achievements: Achievement[]
}

interface DashboardData {
  user: { name: string; avatarUrl: string | null; email: string }
  plan: PlanInfo | null
  stats: Stats
}

const achievementVisuals: Record<string, { icon: React.ElementType; color: string; subtitle: string }> = {
  first: { icon: Star, color: "#F59E0B", subtitle: "Primeira aula concluída" },
  ten: { icon: Trophy, color: "#8B5CF6", subtitle: "10 aulas concluídas" },
  fifty: { icon: Zap, color: "#06B6D4", subtitle: "50 aulas concluídas" },
  course: { icon: Award, color: "#10B981", subtitle: "Curso finalizado em 100%" },
  streak7: { icon: Flame, color: "#F97316", subtitle: "7 dias em sequência" },
  streak30: { icon: Shield, color: "#EAB308", subtitle: "30 dias em sequência" },
}

function formatStudyTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
  return `${minutes}m`
}

function formatDays(plan: PlanInfo | null) {
  if (!plan) {
    return { value: "Sem assinatura ativa", subtitle: "Sem plano ativo" }
  }
  if (plan.isLifetime) {
    return { value: "Vitalício", subtitle: plan.name ?? "Plano ativo" }
  }
  if (plan.daysRemaining === null) {
    return { value: "Ativa", subtitle: plan.name ?? "Plano ativo" }
  }
  if (plan.daysRemaining === 0) {
    return { value: "Expira hoje", subtitle: plan.name ?? "Plano ativo" }
  }
  return {
    value: `${plan.daysRemaining} ${plan.daysRemaining === 1 ? "dia" : "dias"}`,
    subtitle: plan.name ?? "Plano ativo",
  }
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  extra,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  tone: string
  extra?: ReactNode
}) {
  return (
    <div className="rounded-[22px] border border-border bg-card/55 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-5 text-4xl font-bold leading-none tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-3 max-w-[22ch] text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", tone)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {extra && <div className="mt-5">{extra}</div>}
    </div>
  )
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetch("/api/member/dashboard", { cache: "no-store" })
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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Não foi possível carregar o dashboard.</p>
        <button onClick={load} className="cursor-pointer text-sm text-primary underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  const firstName = data.user.name.split(" ")[0]
  const planStatus = formatDays(data.plan)
  const earnedAchievements = data.stats.achievements.filter((achievement) => achievement.earned)
  const displayAchievements = (earnedAchievements.length > 0
    ? earnedAchievements
    : data.stats.achievements).slice(0, 6)

  return (
    <div className="max-w-[1380px] space-y-8 p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Olá, {firstName}</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Aqui está um resumo objetivo da sua evolução na plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <MetricCard
            title="Dias para expirar"
            value={planStatus.value}
            subtitle={planStatus.subtitle}
            icon={CalendarClock}
            tone="bg-amber-500/15 text-amber-400"
          />
        </div>

        <div className="xl:col-span-3">
          <MetricCard
            title="Progresso geral"
            value={`${data.stats.overallProgress}%`}
            subtitle={`${data.stats.totalCompleted} de ${data.stats.totalLessonsAvailable} aulas concluídas`}
            icon={Shield}
            tone="bg-cyan-500/15 text-cyan-400"
            extra={
              <div className="space-y-2">
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${data.stats.overallProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Baseado apenas nas trilhas liberadas para o aluno.
                </p>
              </div>
            }
          />
        </div>

        <div className="xl:col-span-3">
          <MetricCard
            title="Aulas concluídas"
            value={String(data.stats.totalCompleted)}
            subtitle="Total concluído até agora"
            icon={CheckCircle2}
            tone="bg-emerald-500/15 text-emerald-400"
          />
        </div>

        <div className="xl:col-span-3">
          <MetricCard
            title="Horas de estudo"
            value={formatStudyTime(data.stats.totalStudySeconds)}
            subtitle={
              data.stats.streak > 0
                ? `${data.stats.streak} dias em sequência • melhor marca ${data.stats.bestStreak}`
                : "Sem sequência ativa"
            }
            icon={Clock3}
            tone="bg-violet-500/15 text-violet-400"
          />
        </div>
      </div>

      <section className="rounded-[24px] border border-border bg-card/50 p-6 md:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Conquistas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.stats.earnedAchievements}/{data.stats.totalAchievements} desbloqueadas
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {earnedAchievements.length > 0
              ? "Você já começou a construir seu histórico."
              : "Continue estudando para liberar suas primeiras conquistas."}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {displayAchievements.map((achievement) => {
            const visual = achievementVisuals[achievement.id] ?? {
              icon: Trophy,
              color: "#06B6D4",
              subtitle: "Conquista disponível",
            }
            const Icon = visual.icon

            return (
              <div
                key={achievement.id}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  achievement.earned
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-border bg-background/35 opacity-55"
                )}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: achievement.earned ? `${visual.color}22` : "#ffffff10",
                    border: `1px solid ${achievement.earned ? `${visual.color}44` : "#ffffff12"}`,
                  }}
                >
                  <Icon
                    className="h-6 w-6"
                    style={{ color: achievement.earned ? visual.color : "#7d8596" }}
                  />
                </div>
                <p className="mt-4 text-sm font-semibold leading-snug">{achievement.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {visual.subtitle}
                </p>
                <div className="mt-4">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                      achievement.earned
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {achievement.earned ? "Desbloqueada" : "Em progresso"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
