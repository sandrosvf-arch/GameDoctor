import Link from "next/link"
import { redirect } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  PlayCircle,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { getMemberProgressSummary } from "@/lib/member-progress"

type ProgressSummary = Awaited<ReturnType<typeof getMemberProgressSummary>>
type CourseProgressItem = ProgressSummary["courseProgress"][number]

function formatStudyTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
  }

  return `${minutes}m`
}

function formatLastActivity(date: string | null) {
  if (!date) return "Sem atividade"

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sem atividade"
  }

  return formatDistanceToNow(parsedDate, {
    addSuffix: true,
    locale: ptBR,
  })
}

function statusLabel(status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED") {
  if (status === "COMPLETED") return "Concluído"
  if (status === "IN_PROGRESS") return "Em andamento"
  return "Não iniciado"
}

function statusTone(status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED") {
  if (status === "COMPLETED") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  }

  if (status === "IN_PROGRESS") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-300"
  }

  return "border-white/[0.08] bg-white/[0.03] text-slate-400"
}

function progressWidth(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`
}

export default async function ProgressoPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const summary = await getMemberProgressSummary(session.user.id, {
    continueLimit: 6,
    role: session.user.role,
  })

  const totalCourses = summary.courseProgress.length
  const completedCourses = summary.courseProgress.filter((course) => course.status === "COMPLETED").length
  const totalLessons = summary.courseProgress.reduce((sum, course) => sum + course.totalLessons, 0)
  const completedLessons = summary.courseProgress.reduce((sum, course) => sum + course.completedLessons, 0)
  const totalStudySeconds = summary.courseProgress.reduce((sum, course) => sum + course.studySeconds, 0)
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  const hasAnyProgress = summary.courseProgress.some((course) => course.status !== "NOT_STARTED")

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 md:px-8 md:py-8">
      <header className="rounded-lg border border-white/[0.08] bg-[#0c1017]">
        <div className="flex flex-col gap-5 border-b border-white/[0.08] px-5 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
              Área do aluno
            </div>

            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
              Progresso
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Acompanhe sua evolução, veja as aulas concluídas e continue seus estudos de onde parou.
            </p>
          </div>

          <Link
            href="/cursos"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            Explorar cursos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-px bg-white/[0.08] sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Cursos"
            value={totalCourses}
            description={`${completedCourses} concluído${completedCourses !== 1 ? "s" : ""}`}
          />

          <SummaryCard
            label="Progresso geral"
            value={`${overallProgress}%`}
            description={`${completedLessons} de ${totalLessons} aulas`}
          />

          <SummaryCard
            label="Aulas concluídas"
            value={completedLessons}
            description="Total assistido"
          />

          <SummaryCard
            label="Tempo de estudo"
            value={formatStudyTime(totalStudySeconds)}
            description="Registrado na plataforma"
          />
        </div>
      </header>

      {summary.courseProgress.length === 0 ? (
        <section className="rounded-lg border border-white/[0.08] bg-[#0c1017] px-6 py-16 text-center">
          <div className="mx-auto max-w-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-500">
              <Sparkles className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-white">
              Você ainda não possui cursos liberados
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Escolha um plano para liberar as trilhas, acompanhar seu progresso e continuar assistindo às aulas.
            </p>

            <Link
              href="/planos"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Ver planos
            </Link>
          </div>
        </section>
      ) : (
        <>
          {!hasAnyProgress && (
            <section className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-5 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Seus cursos já estão liberados
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                    Assim que você iniciar a primeira aula, seu progresso será registrado automaticamente.
                  </p>
                </div>

                <Link
                  href="/cursos"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-white px-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Começar agora
                </Link>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-1">
            {summary.courseProgress.map((course) => (
              <CourseProgressCard key={course.id} course={course} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function CourseProgressCard({ course }: { course: CourseProgressItem }) {
  const continueLesson = course.nextLesson ?? course.lastLesson
  const thumbnail = course.coverImage ?? course.bannerImage ?? continueLesson?.thumbnailUrl ?? null
  const lastActivity = formatLastActivity(course.lastWatchedAt)

  return (
    <article className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017] transition hover:border-white/[0.14]">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-[#080b10] md:w-[210px]">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-600">
              <BookOpen className="h-7 w-7" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

          <div className="absolute left-3 top-3">
            <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${statusTone(course.status)}`}>
              {statusLabel(course.status)}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {course.platformName && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-300">
                    {course.platformName}
                  </span>
                )}

                {course.categoryName && (
                  <span className="text-xs text-slate-500">
                    {course.categoryName}
                  </span>
                )}
              </div>

              <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-6 text-white">
                {course.title}
              </h2>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {continueLesson && (
                <Link
                  href={continueLesson.href}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  <PlayCircle className="h-4 w-4" />
                  Continuar
                </Link>
              )}

              <Link
                href={`/trilhas/${course.slug}`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                Ver trilha
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MiniMetric
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Progresso"
              value={`${course.progressPercent}%`}
            />

            <MiniMetric
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Aulas"
              value={`${course.completedLessons}/${course.totalLessons}`}
            />

            <MiniMetric
              icon={<Timer className="h-3.5 w-3.5" />}
              label="Estudo"
              value={formatStudyTime(course.studySeconds)}
            />
          </div>

          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: progressWidth(course.progressPercent) }}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                {course.completedLessons} de {course.totalLessons} aulas concluídas
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {lastActivity === "Sem atividade" ? "Sem atividade" : `Última atividade ${lastActivity}`}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-white/[0.08] bg-[#080b10] px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
              Próxima aula
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {continueLesson?.title ?? "Nenhuma aula sugerida no momento"}
                </p>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {course.status === "COMPLETED"
                    ? "Curso concluído. Você pode revisar o conteúdo quando quiser."
                    : course.status === "NOT_STARTED"
                      ? "Comece pela primeira aula liberada deste curso."
                      : "Retome o conteúdo para continuar sua evolução."}
                </p>
              </div>

              {continueLesson && (
                <Link
                  href={continueLesson.href}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Abrir aula
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string
  value: string | number
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

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
        {icon}
        {label}
      </div>

      <p className="mt-1 text-base font-semibold text-white">
        {value}
      </p>
    </div>
  )
}