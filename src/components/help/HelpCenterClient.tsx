"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
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
  category: {
    name: string
    slug: string
  }
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
              Encontre orientações de uso, primeiros passos e dúvidas comerciais sem sair da sua área.
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
                  results.map((result) => (
                    <Link
                      key={result.id}
                      href={`/suporte/topico/${result.slug}`}
                      className="group block rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-5 transition hover:border-cyan-500/25 hover:bg-cyan-500/[0.06]"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
                        {result.category.name}
                      </p>
                      <div className="mt-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{result.title}</h3>
                          {result.excerpt ? (
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{result.excerpt}</p>
                          ) : null}
                        </div>
                        <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition group-hover:text-cyan-300" />
                      </div>
                    </Link>
                  ))
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
                  activeCategory.articles.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/suporte/topico/${topic.slug}`}
                      className="group flex items-center justify-between gap-4 rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-4 transition hover:border-cyan-500/25 hover:bg-cyan-500/[0.06]"
                    >
                      <div>
                        <p className="text-lg font-medium text-white transition group-hover:text-cyan-300">
                          {topic.title}
                        </p>
                        {topic.excerpt ? (
                          <p className="mt-2 text-sm leading-7 text-slate-400">{topic.excerpt}</p>
                        ) : null}
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-slate-500 transition group-hover:text-cyan-300" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma categoria disponível.</p>
          )}
        </section>
      </div>
    </div>
  )
}
