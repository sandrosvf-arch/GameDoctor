'use client'

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface HorizontalCardRailProps {
  children: ReactNode
  className?: string
}

export function HorizontalCardRail({ children, className = "" }: HorizontalCardRailProps) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasAdvancedRight, setHasAdvancedRight] = useState(false)

  const updateScrollState = () => {
    const rail = railRef.current
    if (!rail) return
    const maxScrollLeft = rail.scrollWidth - rail.clientWidth
    setCanScrollLeft(rail.scrollLeft > 4)
    setCanScrollRight(rail.scrollLeft < maxScrollLeft - 4)
  }

  useEffect(() => {
    updateScrollState()
    const rail = railRef.current
    if (!rail) return

    const onResize = () => updateScrollState()
    rail.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", onResize)

    return () => {
      rail.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", onResize)
    }
  }, [children])

  const scrollByAmount = (direction: "left" | "right") => {
    const rail = railRef.current
    if (!rail) return
    const amount = Math.max(rail.clientWidth * 0.82, 320)
    if (direction === "right") {
      setHasAdvancedRight(true)
    } else if (rail.scrollLeft - amount <= 4) {
      setHasAdvancedRight(false)
    }
    rail.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" })
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-8 lg:px-14 pb-3"
      >
        {children}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between px-1 md:flex md:px-2 lg:px-6">
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          aria-label="Anterior"
          disabled={!canScrollLeft}
          className={`pointer-events-auto group/btn relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-200 hover:border-cyan-400/80 hover:bg-zinc-900/90 hover:shadow-[0_0_24px_rgba(0,207,255,0.35)] hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-0 ${hasAdvancedRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <ChevronLeft className="h-6 w-6 transition-transform duration-150 group-hover/btn:-translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          aria-label="Próximo"
          disabled={!canScrollRight}
          className="pointer-events-auto group/btn relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-200 hover:border-cyan-400/80 hover:bg-zinc-900/90 hover:shadow-[0_0_24px_rgba(0,207,255,0.35)] hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ChevronRight className="h-6 w-6 transition-transform duration-150 group-hover/btn:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}