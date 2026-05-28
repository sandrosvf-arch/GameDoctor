"use client"

import { useEffect, useRef, useState } from "react"
import { TrailRowView } from "@/components/TrailRowView"
import type { HomeRowDto } from "@/lib/home-rows"

interface LazyMoreRowsProps {
  /** Number of DB rows already rendered server-side */
  skipCount: number
  /** Total number of published DB courses */
  total: number
}

function CardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[280px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[380px] 2xl:w-[460px]">
      <div className="rounded-[12px] p-[1.2px] bg-zinc-800/80">
        <div className="aspect-video rounded-[11px] bg-zinc-800 overflow-hidden relative">
          {/* shimmer sweep */}
          <div className="card-shimmer absolute inset-0 w-[60%] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="relative">
      {/* Header */}
      <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3">
        <div className="w-2 h-6 rounded-full bg-zinc-800 shrink-0 animate-pulse" />
        <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
        <div className="ml-auto h-4 w-16 bg-zinc-800/60 rounded animate-pulse" />
      </div>
      {/* Cards rail */}
      <div className="flex gap-3 overflow-hidden px-4 md:px-8 lg:px-14 pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function LazyMoreRows({ skipCount, total }: LazyMoreRowsProps) {
  const [rows, setRows] = useState<HomeRowDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const remaining = total - skipCount
  const hasMore = remaining > 0

  useEffect(() => {
    if (!hasMore || loaded || loading) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          setLoading(true)
          fetch(`/api/home/rows?skip=${skipCount}&take=${remaining}`)
            .then((r) => r.json())
            .then((data: HomeRowDto[]) => {
              setRows(data)
              setLoaded(true)
            })
            .catch(() => setLoaded(true))
            .finally(() => setLoading(false))
        }
      },
      { rootMargin: "300px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loaded, loading, skipCount, remaining])

  if (!hasMore) return null

  return (
    <>
      {/* Sentinel: triggers loading when 300px before coming into view */}
      <div ref={sentinelRef} aria-hidden="true" />

      {loading && !loaded && (
        <div className="space-y-10">
          {Array.from({ length: remaining }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      )}

      {rows.map((row) => (
        <TrailRowView key={row.id} row={row} />
      ))}
    </>
  )
}
