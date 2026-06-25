import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatCommunityDate, getCommunityFirstName } from "@/lib/community"
import {
  ChevronRight,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react"

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "EDITOR"
}

export default async function ComunidadePage() {
  const session = await auth()

  const forums = await db.communityForum.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      topicApprovalRequired: true,
      replyApprovalRequired: true,
      _count: {
        select: {
          topics: true,
        },
      },
      topics: {
        where: { status: "APPROVED" },
        orderBy: [{ isPinned: "desc" }, { lastReplyAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          title: true,
          slug: true,
          repliesCount: true,
          createdAt: true,
          lastReplyAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  const isAdminUser = isAdminRole(session?.user?.role)
  const firstForumHref = forums[0] ? `/comunidade/${forums[0].slug}` : "/comunidade"

  return (
    <div className="min-h-screen bg-[#090c11] text-slate-100">
      <section className="border-b border-white/[0.08] bg-[#0c111a]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
                Comunidade GameDoctor
              </div>

              <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-white md:text-[42px] md:leading-[1.08]">
                Uma comunidade técnica para alunos trocarem diagnósticos e soluções reais.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-[15px]">
                Participe das discussões, compartilhe dúvidas de bancada e encontre respostas construídas por quem vive manutenção no dia a dia.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={firstForumHref}
                className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Explorar comunidade
              </Link>

              {isAdminUser && (
                <Link
                  href="/admin/comunidade"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-slate-300 transition hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white"
                >
                  Gerenciar
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Espaços da comunidade
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Escolha uma área para acompanhar discussões ou compartilhar uma dúvida.
            </p>
          </div>

          <span className="hidden text-sm text-slate-500 sm:inline">
            {forums.length} {forums.length === 1 ? "área ativa" : "áreas ativas"}
          </span>
        </div>

        {forums.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/[0.12] bg-[#0c1017] px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-300">
              Nenhuma área ativa ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Assim que a comunidade for publicada, os espaços aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1017]">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_190px_44px] border-b border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
              <div>Espaço</div>
              <div className="text-center">Discussões</div>
              <div>Última atividade</div>
              <div />
            </div>

            <div className="divide-y divide-white/[0.08]">
              {forums.map((forum) => {
                const latestTopic = forum.topics[0] ?? null
                const latestDate = latestTopic?.lastReplyAt ?? latestTopic?.createdAt

                return (
                  <Link
                    key={forum.id}
                    href={`/comunidade/${forum.slug}`}
                    className="group grid gap-4 px-5 py-5 transition hover:bg-white/[0.035] md:grid-cols-[minmax(0,1fr)_110px_190px_44px] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-slate-400">
                          <MessageSquareText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-slate-100 transition group-hover:text-white">
                            {forum.name}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {forum.topicApprovalRequired && (
                              <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                                <ShieldCheck className="h-3 w-3" />
                                Discussões moderadas
                              </span>
                            )}

                            {forum.replyApprovalRequired && (
                              <span className="inline-flex items-center gap-1 rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                                <LockKeyhole className="h-3 w-3" />
                                Respostas moderadas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                        {forum.description || "Fórum sem descrição cadastrada ainda."}
                      </p>

                      {latestTopic && (
                        <div className="mt-3 rounded-md border border-white/[0.08] bg-black/10 px-3 py-2 md:hidden">
                          <p className="truncate text-sm font-medium text-slate-200">
                            {latestTopic.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            por {getCommunityFirstName(latestTopic.author.name)} · {latestTopic.repliesCount} resposta{latestTopic.repliesCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="hidden text-center md:block">
                      <div className="text-base font-semibold text-slate-100">
                        {forum._count.topics}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        discussão{forum._count.topics !== 1 ? "ões" : ""}
                      </div>
                    </div>

                    <div className="hidden min-w-0 md:block">
                      {latestTopic ? (
                        <>
                          <p className="truncate text-sm font-medium text-slate-200">
                            {latestTopic.title}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>{latestDate ? formatCommunityDate(latestDate) : "Sem atividade"}</span>
                            <span>·</span>
                            <span>
                              {latestTopic.repliesCount} resposta{latestTopic.repliesCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-600">
                            por {getCommunityFirstName(latestTopic.author.name)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-400">
                            Sem atividade
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                             Nenhuma discussão publicada
                          </p>
                        </>
                      )}
                    </div>

                    <div className="hidden justify-end md:flex">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition group-hover:bg-white/[0.06] group-hover:text-slate-300">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 md:hidden">
                      <span>
                        {forum._count.topics} discussão{forum._count.topics !== 1 ? "ões" : "ão"}
                      </span>

                      <span>
                        {latestDate ? formatCommunityDate(latestDate) : "Sem atividade"}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
