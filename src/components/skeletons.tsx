/**
 * Reusable skeleton building blocks for loading.tsx files.
 *
 * HOW TO USE IN A NEW PAGE:
 *   1. For a simple page, import a ready-made template (bottom of this file).
 *   2. For a custom page, compose the primitives (top section).
 *
 * EXAMPLE loading.tsx:
 *   import { SkeletonAdminPage } from "@/components/skeletons"
 *   export default function Loading() { return <SkeletonAdminPage /> }
 */

import type { ReactNode } from "react"

// ─────────────────────────────────────────────────────────────
// Primitives — compose these to build custom skeletons
// ─────────────────────────────────────────────────────────────

/** Standard 56 px top navigation bar */
export function SkeletonHeader() {
  return <div className="h-14 shrink-0 border-b border-zinc-800/60 bg-zinc-950/80" />
}

/**
 * One horizontal card rail: a row header + N aspect-video cards.
 * Matches the HorizontalCardRail + TrailRowView layout exactly.
 */
export function SkeletonCardRail({ count = 5 }: { count?: number }) {
  return (
    <div className="animate-pulse">
      <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-center gap-3">
        <div className="h-6 w-2 rounded-full bg-zinc-700 shrink-0" />
        <div className="h-5 w-48 rounded bg-zinc-800" />
        <div className="ml-auto h-4 w-16 rounded bg-zinc-800" />
      </div>
      <div className="flex gap-3 px-4 md:px-8 lg:px-14 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] md:w-[320px] lg:w-[360px] rounded-[12px] overflow-hidden bg-zinc-900"
          >
            <div className="aspect-video bg-zinc-800" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-4/5 rounded bg-zinc-700" />
              <div className="h-3 w-2/5 rounded bg-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Responsive card grid (aspect-video cards).
 * Use for /cursos, /meus-cursos, trail detail, etc.
 */
export function SkeletonCardGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[12px] overflow-hidden bg-zinc-900">
          <div className="aspect-video bg-zinc-800" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 w-4/5 rounded bg-zinc-700" />
            <div className="h-3 w-2/5 rounded bg-zinc-700" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Table skeleton for list/admin pages.
 * Renders rows of placeholder columns.
 */
export function SkeletonTable({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-zinc-700 bg-zinc-900">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-3.5 rounded bg-zinc-700" style={{ flex: c === 0 ? "0 0 2rem" : 1 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-zinc-800/60 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 rounded bg-zinc-800"
              style={{ flex: c === 0 ? "0 0 2rem" : 1, opacity: 1 - r * 0.07 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Stat/metric cards row — for dashboards.
 */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
          <div className="h-3.5 w-24 rounded bg-zinc-800" />
          <div className="h-8 w-16 rounded bg-zinc-700" />
          <div className="h-3 w-32 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page-level templates — use directly in loading.tsx
// ─────────────────────────────────────────────────────────────

/**
 * Auth pages: /login, /cadastro, /recuperar-senha
 * Renders a centered form card.
 */
export function SkeletonAuthPage({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 animate-pulse">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-5">
        <div className="space-y-2 text-center">
          <div className="h-6 w-32 rounded bg-zinc-800 mx-auto" />
          <div className="h-4 w-52 rounded bg-zinc-700 mx-auto" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-20 rounded bg-zinc-800" />
              <div className="h-10 w-full rounded-md bg-zinc-800" />
            </div>
          ))}
        </div>
        <div className="h-10 w-full rounded-md bg-zinc-700" />
        <div className="h-10 w-full rounded-md bg-zinc-800" />
      </div>
    </div>
  )
}

/**
 * Admin pages: sidebar (w-56) + main area with table.
 * Covers all /admin/* routes via (admin)/loading.tsx.
 */
export function SkeletonAdminPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50 p-4 gap-1 animate-pulse">
        <div className="h-10 w-36 rounded-lg bg-zinc-800 mb-4" />
        <div className="h-3 w-20 rounded bg-zinc-800 mb-2" />
        {[90, 75, 85, 70].map((w, i) => (
          <div key={i} className="h-8 rounded-lg bg-zinc-800" style={{ width: `${w}%` }} />
        ))}
        <div className="h-3 w-24 rounded bg-zinc-800 mt-4 mb-2" />
        {[80, 90, 75, 85, 70].map((w, i) => (
          <div key={i} className="h-8 rounded-lg bg-zinc-800" style={{ width: `${w}%` }} />
        ))}
        <div className="h-3 w-20 rounded bg-zinc-800 mt-4 mb-2" />
        {[75, 80, 70].map((w, i) => (
          <div key={i} className="h-8 rounded-lg bg-zinc-800" style={{ width: `${w}%` }} />
        ))}
      </aside>

      {/* Main content */}
      <div className="flex-1 p-6 space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 rounded bg-zinc-800" />
          <div className="h-9 w-32 rounded-lg bg-zinc-700" />
        </div>
        {/* Search/filter bar */}
        <div className="h-10 w-full max-w-sm rounded-lg bg-zinc-900 border border-zinc-800" />
        <SkeletonTable />
      </div>
    </div>
  )
}

/**
 * Member pages: /dashboard, /meus-cursos, /curso/[slug], etc.
 * Renders header + content area. Pass children for custom content.
 */
export function SkeletonMemberPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SkeletonHeader />
      <main className="px-4 md:px-8 lg:px-14 py-10 space-y-6 animate-pulse">
        {children}
      </main>
    </div>
  )
}

/**
 * Hero-style detail page: /trilhas/[slug], /cursos/[slug]
 * Full-height hero with gradient + content grid below.
 */
export function SkeletonHeroDetailPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <SkeletonHeader />

      {/* Hero */}
      <section className="relative min-h-[60vh] md:min-h-[92vh] flex items-start md:items-center overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 from-[10%] via-zinc-950/45 via-[45%] to-transparent to-[70%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 from-[0%] via-zinc-950/30 via-[15%] to-transparent to-[35%]" />

        <div className="relative z-10 w-full pt-16 px-10 md:pt-0 md:px-0 md:pl-44 lg:pl-64">
          <div className="max-w-[520px] space-y-4">
            <div className="h-7 w-20 rounded-full bg-zinc-800" />
            <div className="h-6 w-44 rounded-full bg-zinc-800" />
            <div className="space-y-3">
              <div className="h-12 w-4/5 rounded-lg bg-zinc-800" />
              <div className="h-12 w-3/5 rounded-lg bg-zinc-800" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-4/5 rounded bg-zinc-800" />
            </div>
            <div className="h-12 w-40 rounded-xl bg-zinc-700 mt-2" />
          </div>
        </div>
      </section>

      {/* Cards */}
      <div className="relative z-10 -mt-36 md:-mt-32 px-6 md:px-10 lg:px-14 pb-16">
        <SkeletonCardGrid />
      </div>
    </div>
  )
}
