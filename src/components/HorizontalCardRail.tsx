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

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between px-2 md:flex md:px-4 lg:px-10">
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          aria-label="Anterior"
          disabled={!canScrollLeft}
          className={`pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500/70 bg-zinc-950/85 text-cyan-400 shadow-[0_0_14px_rgba(0,207,255,0.4)] backdrop-blur transition-all duration-200 hover:scale-110 hover:border-cyan-400 hover:shadow-[0_0_22px_rgba(0,207,255,0.65)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-0 ${hasAdvancedRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          aria-label="Próximo"
          disabled={!canScrollRight}
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500/70 bg-zinc-950/85 text-cyan-400 shadow-[0_0_14px_rgba(0,207,255,0.4)] backdrop-blur transition-all duration-200 hover:scale-110 hover:border-cyan-400 hover:shadow-[0_0_22px_rgba(0,207,255,0.65)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}