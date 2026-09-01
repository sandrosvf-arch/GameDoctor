"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface HelpCategoryNav {
  id: string
  name: string
  slug: string
  articles: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string
  }[]
}

interface HelpArticlePage {
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: {
    name: string
    slug: string
  }
}

interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: {
    name: string
    slug: string
  }
}

function getPreviewText(topic: { excerpt: string | null; content: string }, maxLength = 110) {
  const plainContent = topic.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const source = topic.excerpt?.trim() || plainContent
  if (!source) return ""
  if (source.length <= maxLength) return `${source}...`

  const truncated = source.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(" ")
  return `${lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated}...`
}

export function HelpCenterClient({
  categories,
  initialCategorySlug,
  article,
}: {
  categories: HelpCategoryNav[]
  initialCategorySlug?: string
  article?: HelpArticlePage | null
}) {
  const [activeCategorySlug, setActiveCategorySlug] = useState(initialCategorySlug ?? categories[0]?.slug ?? "")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    setActiveCategorySlug(initialCategorySlug ?? categories[0]?.slug ?? "")
  }, [categories, initialCategorySlug])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setResults([])
      setSearching(false)
      return
    }

    const timer = window.setTimeout(async () => {
      setSearching(true)
      const response = await fetch(`/api/help/search?q=${encodeURIComponent(trimmedQuery)}`)
      const data = await response.json().catch(() => ({ results: [] }))
      setResults(data.results ?? [])
      setSearching(false)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [query])

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === activeCategorySlug) ?? categories[0] ?? null,
    [activeCategorySlug, categories]
  )

  const showingSearch = query.trim().length > 0

  // Keep the first question of the active category (or first search match) expanded by default.
  useEffect(() => {
    if (showingSearch) return
    setOpenId(activeCategory?.articles[0]?.id ?? null)
  }, [activeCategory, showingSearch])

  useEffect(() => {
    if (!showingSearch) return
    setOpenId(results[0]?.id ?? null)
  }, [results, showingSearch])

  return (
    <div className="min-h-screen bg-[#080b12] text-white">
      <div className="border-b border-white/6 bg-[radial-gradient(circle_at_top_left,_rgba(0,207,255,0.12),_transparent_28%),linear-gradient(180deg,#0b0f18_0%,#090d14_100%)]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 py-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-400/80">
              Central de Ajuda
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Respostas rápidas, organizadas e fáceis de encontrar.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">
              Encontre respostas para as dúvidas mais frequentes sem sair da sua área.
            </p>
          </div>

          <div className="relative w-full max-w-[480px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquise por assunto, dúvida ou recurso"
              className="h-14 w-full rounded-2xl border border-cyan-500/20 bg-white/[0.03] pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1320px] gap-6 px-6 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[30px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="border-b border-white/6 pb-4">
            <h2 className="text-2xl font-semibold text-white">Categorias</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Navegue pelos assuntos disponíveis e encontre o tópico certo com mais rapidez.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {categories.map((category) => {
              const active = activeCategory?.slug === category.slug && !showingSearch

              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setQuery("")
                    setActiveCategorySlug(category.slug)
                  }}
                  className={cn(
                    "group block w-full cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm transition",
                    active
                      ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
                      : "border-transparent bg-transparent text-slate-300 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <span className="block font-medium">{category.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {category.articles.length} tópico{category.articles.length !== 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur md:p-8 xl:p-10">
          {showingSearch ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-400/80">Pesquisa</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Resultados para "{query.trim()}"
              </h2>

              <div className="mt-8 space-y-4">
                {searching ? (
                  <p className="text-sm text-slate-400">Buscando tópicos...</p>
                ) : results.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum tópico encontrado para essa busca.</p>
                ) : (
                  results.map((result) => {
                    const open = openId === result.id

                    return (
                      <div
                        key={result.id}
                        className={cn(
                          "overflow-hidden rounded-3xl border transition-colors",
                          open
                            ? "border-cyan-400/50 bg-cyan-500/[0.12] shadow-[0_12px_32px_rgba(0,207,255,0.1)]"
                            : "border-white/15 bg-white/[0.05] hover:border-cyan-400/30 hover:bg-white/[0.08]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : result.id)}
                          aria-expanded={open}
                          className="flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="min-w-0">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
                              {result.category.name}
                            </span>
                            <span
                              className={cn(
                                "mt-1 block font-semibold",
                                open ? "text-xl text-white" : "text-lg font-medium text-slate-200"
                              )}
                            >
                              {result.title}
                            </span>
                            {!open ? (
                              <span className="mt-1 block line-clamp-2 text-sm text-slate-400">
                                {getPreviewText(result)}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                              open
                                ? "rotate-45 border-cyan-400/60 bg-cyan-400 text-[#080b12]"
                                : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                            )}
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                        </button>

                        <div
                          className={cn(
                            "grid transition-all duration-200 ease-in-out",
                            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-white/10 px-5 pb-5 pt-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                                Resposta
                              </p>
                              <div
                                className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-7 prose-p:text-slate-400 prose-li:text-slate-400 prose-strong:text-slate-200 prose-a:text-cyan-300 [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                                dangerouslySetInnerHTML={{ __html: result.content }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : article ? (
            <article>
              <p className="text-sm text-cyan-400/80">
                {article.category.name} {" > "} {article.title}
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">{article.title}</h2>
              {article.excerpt ? (
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-400">{article.excerpt}</p>
              ) : null}

              <div
                className="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-a:text-cyan-300 prose-strong:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-blockquote:border-cyan-500/30 prose-blockquote:text-slate-400"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </article>
          ) : activeCategory ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-400/80">Categoria</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">{activeCategory.name}</h2>

              <div className="mt-8 space-y-3">
                {activeCategory.articles.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum tópico ativo nessa categoria ainda.</p>
                ) : (
                  activeCategory.articles.map((topic) => {
                    const open = openId === topic.id

                    return (
                      <div
                        key={topic.id}
                        className={cn(
                          "overflow-hidden rounded-3xl border transition-colors",
                          open
                            ? "border-cyan-400/50 bg-cyan-500/[0.12] shadow-[0_12px_32px_rgba(0,207,255,0.1)]"
                            : "border-white/15 bg-white/[0.05] hover:border-cyan-400/30 hover:bg-white/[0.08]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : topic.id)}
                          aria-expanded={open}
                          className="flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block font-semibold",
                                open ? "text-xl text-white" : "text-lg font-medium text-slate-200"
                              )}
                            >
                              {topic.title}
                            </span>
                            {!open ? (
                              <span className="mt-1 block line-clamp-2 text-sm text-slate-400">
                                {getPreviewText(topic)}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                              open
                                ? "rotate-45 border-cyan-400/60 bg-cyan-400 text-[#080b12]"
                                : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                            )}
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                        </button>

                        <div
                          className={cn(
                            "grid transition-all duration-200 ease-in-out",
                            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-white/10 px-5 pb-5 pt-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/70">
                                Resposta
                              </p>
                              <div
                                className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-7 prose-p:text-slate-400 prose-li:text-slate-400 prose-strong:text-slate-200 prose-a:text-cyan-300 [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                                dangerouslySetInnerHTML={{ __html: topic.content }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma categoria disponível.</p>
          )}
          <div className="mt-10 rounded-[28px] border border-cyan-500/15 bg-cyan-500/[0.04] px-5 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Nao encontrou o que procurava?</p>
                <p className="mt-1 text-sm text-slate-400">
                  Fale com a equipe e abra um ticket para acompanhar sua solicitacao.
                </p>
              </div>

              <Link
                href="/tickets"
                className="inline-flex h-11 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-5 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-white"
              >
                Fale conosco
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
