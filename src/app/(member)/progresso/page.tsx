import Link from "next/link"
import { redirect } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowRight, BookOpen, Clock3, PlayCircle, Sparkles, TrendingUp } from "lucide-react"
import { auth } from "@/lib/auth"
import { getMemberProgressSummary } from "@/lib/member-progress"
import { Button } from "@/components/ui/button"

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

  return formatDistanceToNow(new Date(date), {
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
  if (status === "COMPLETED") return "bg-emerald-500/15 text-emerald-400"
  if (status === "IN_PROGRESS") return "bg-cyan-500/15 text-cyan-400"
  return "bg-muted text-muted-foreground"
}

export default async function ProgressoPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const summary = await getMemberProgressSummary(session.user.id, { continueLimit: 6 })
  const hasAnyProgress = summary.courseProgress.some((course) => course.status !== "NOT_STARTED")

  return (
    <div className="max-w-[1380px] space-y-8 p-6 md:p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Progresso</h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          Acompanhe sua evolução por curso, veja a última atividade registrada e retome exatamente de onde parou.
        </p>
      </div>

      {summary.courseProgress.length === 0 ? (
        <section className="rounded-[24px] border border-border bg-card/50 p-8 md:p-10">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Você ainda não possui cursos liberados</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Escolha um plano para liberar trilhas, acompanhar seu progresso e continuar assistindo às aulas sem bloqueios.
              </p>
            </div>
            <Button asChild>
              <Link href="/planos">Ver planos</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          {!hasAnyProgress && (
            <section className="rounded-[24px] border border-border bg-card/50 p-6 md:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">Seu histórico ainda vai começar</h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Seus cursos já estão liberados. Assim que você iniciar a primeira aula, o progresso por curso e a retomada automática vão aparecer aqui.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/cursos">Explorar cursos</Link>
                </Button>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {summary.courseProgress.map((course) => {
              const continueLesson = course.nextLesson ?? course.lastLesson
              const thumbnail = course.coverImage ?? course.bannerImage ?? continueLesson?.thumbnailUrl ?? null

              return (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-[24px] border border-border bg-card/50 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
                >
                  <div className="flex flex-col gap-5 p-6 md:p-7">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start">
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-950 md:w-[240px]">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <BookOpen className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />
                        <div className="absolute left-4 top-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(course.status)}`}>
                            {statusLabel(course.status)}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {course.platformName && (
                              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-400">
                                {course.platformName}
                              </span>
                            )}
                            {course.categoryName && (
                              <span className="text-sm text-muted-foreground">{course.categoryName}</span>
                            )}
                          </div>
                          <h2 className="text-2xl font-semibold tracking-tight">{course.title}</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-border bg-background/35 p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              Progresso
                            </p>
                            <p className="mt-3 text-2xl font-bold">{course.progressPercent}%</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-background/35 p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              Aulas
                            </p>
                            <p className="mt-3 text-2xl font-bold">
                              {course.completedLessons}/{course.totalLessons}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-background/35 p-4">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              Estudo
                            </p>
                            <p className="mt-3 text-2xl font-bold">{formatStudyTime(course.studySeconds)}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-cyan-400 transition-all"
                              style={{ width: `${course.progressPercent}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              {course.completedLessons} de {course.totalLessons} aulas concluídas
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />
                              Última atividade {formatLastActivity(course.lastWatchedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-background/35 p-4">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Próxima aula sugerida
                          </p>
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold">
                                {continueLesson?.title ?? "Sem aula sugerida no momento"}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {course.status === "COMPLETED"
                                  ? "Curso concluído. Você pode revisar a última aula quando quiser."
                                  : course.status === "NOT_STARTED"
                                    ? "Comece pela primeira aula liberada deste curso."
                                    : "Retome o conteúdo mais relevante para seguir sua evolução."}
                              </p>
                            </div>
                            {continueLesson && (
                              <Button asChild className="shrink-0">
                                <Link href={continueLesson.href}>
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Continuar
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Link
                            href={`/trilhas/${course.slug}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                          >
                            Ver trilha
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
