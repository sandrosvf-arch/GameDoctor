"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Award,
  CalendarClock,
  CreditCard,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  PlayCircle,
  Shield,
  Star,
  Trophy,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanInfo {
  planId: string
  name: string | null
  daysRemaining: number | null
  expiresAt: string | null
  isLifetime: boolean
  subscription: {
    status: string
    autoRenew: boolean
    period: string
    amount: number
    nextBillingAt: string | null
    cancelledAt: string | null
  } | null
}

interface Achievement {
  id: string
  label: string
  earned: boolean
}

interface ContinueWatchingItem {
  id: string
  title: string
  href: string
  thumbnailUrl: string | null
  durationSeconds: number | null
  courseTitle: string
  watchedSeconds: number
  progressPercent: number
  completed: boolean
  lastWatchedAt: string | null
}

interface CourseProgressSummary {
  id: string
  title: string
  slug: string
  totalLessons: number
  completedLessons: number
  progressPercent: number
  studySeconds: number
  lastWatchedAt: string | null
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
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
  continueWatching: ContinueWatchingItem[]
  courseProgress: CourseProgressSummary[]
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

function formatDuration(seconds: number | null) {
  if (!seconds) return "Sem duração"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}min${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`
  }

  return `${remainingSeconds}s`
}

function formatRelativeDate(date: string | null) {
  if (!date) return "Sem atividade recente"

  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ptBR,
  })
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

function formatPlanDate(date: string | null) {
  if (!date) return "Acesso vitalício"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date(date))
}

const subscriptionCancelUrl =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_CANCEL_WHATSAPP_URL?.trim() ?? ""
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
          <p className="mt-5 text-2xl font-bold leading-none tracking-tight">{value}</p>
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
            extra={!data.plan ? (
              <Link
                href="/planos"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Assinar agora
              </Link>
            ) : undefined}
          />
        </div>

        <div className="xl:col-span-3">
          <MetricCard
            title="Progresso geral"
            value={`${data.stats.overallProgress}%`}
            subtitle={`${data.stats.totalCompleted} de ${data.stats.totalLessonsAvailable} aulas concluídas`}
            icon={Shield}
            tone="bg-cyan-500/15 text-cyan-400"
            extra={(
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
            )}
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

      <section id="plano" className="rounded-[24px] border border-border bg-card/50 p-6 md:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-400">
              Assinatura
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Meu plano</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulte seu acesso e encontre o canal para solicitar o cancelamento.
            </p>
          </div>
          <Link
            href="/planos"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-cyan-400/50 hover:text-cyan-300"
          >
            Ver planos
          </Link>
        </div>

        {!data.plan ? (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-background/35 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-semibold">Você ainda não possui um plano ativo.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Libere as trilhas, acompanhe seu progresso e aproveite todos os recursos da plataforma.
              </p>
            </div>
            <Link
              href="/planos"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Conhecer planos
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Plano ativo
                </span>
                {data.plan.subscription?.autoRenew && (
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                    Renovação automática
                  </span>
                )}
              </div>
              <h3 className="mt-5 text-2xl font-bold">{data.plan.name ?? "Plano ativo"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.plan.isLifetime
                  ? "Acesso vitalício"
                  : `Acesso liberado até ${formatPlanDate(data.plan.expiresAt)}`}
              </p>
              {data.plan.subscription && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {data.plan.subscription.autoRenew
                    ? data.plan.subscription.nextBillingAt
                      ? `Próxima renovação em ${formatPlanDate(data.plan.subscription.nextBillingAt)}.`
                      : "Sua renovação automática está ativa."
                    : "A renovação automática está desativada."}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background/35 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                Gerenciar acesso
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Precisa cancelar ou falar sobre sua assinatura? Nossa equipe ajuda você pelo WhatsApp.
              </p>
              <div className="mt-5 space-y-3">
                {subscriptionCancelUrl ? (
                  <a
                    href={subscriptionCancelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Solicitar cancelamento
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-3 text-xs leading-relaxed text-amber-200">
                    O canal para cancelamento será configurado em breve.
                  </div>
                )}
                <Link
                  href="/planos"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  Ver detalhes dos planos
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
      <section id="continuar" className="rounded-[24px] border border-border bg-card/50 p-6 md:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Continuar assistindo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Retome rapidamente as aulas mais recentes do seu histórico.
            </p>
          </div>
          <Link
            href="/progresso"
            className="text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
          >
            Ver progresso completo
          </Link>
        </div>

        {data.continueWatching.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/35 p-8 text-center">
            <p className="text-base font-medium">Você ainda não iniciou nenhuma aula.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando começar a estudar, suas retomadas mais recentes vão aparecer aqui.
            </p>
            <div className="mt-5">
              <Link
                href="/cursos"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Explorar trilhas
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {data.continueWatching.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-background/35 transition-colors hover:border-cyan-500/30"
              >
                <div className="relative aspect-video overflow-hidden bg-zinc-950">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium",
                      item.completed ? "bg-emerald-500/15 text-emerald-400" : "bg-cyan-500/15 text-cyan-400"
                    )}>
                      {item.completed ? "Concluída" : `${item.progressPercent}% assistido`}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-400">
                      {item.courseTitle}
                    </p>
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Última atividade {formatRelativeDate(item.lastWatchedAt)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatStudyTime(item.watchedSeconds)} estudados</span>
                      <span>{formatDuration(item.durationSeconds)}</span>
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Continuar aula
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
