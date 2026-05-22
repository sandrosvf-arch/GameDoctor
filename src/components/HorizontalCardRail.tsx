'use client'

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface HorizontalCardRailProps {
  children: ReactNode
  className?: string
  accentColor?: string
}

export function HorizontalCardRail({ children, className = "", accentColor = "#00cfff" }: HorizontalCardRailProps) {
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
          style={{
            borderColor: accentColor + "99",
            boxShadow: `0 0 14px ${accentColor}55, 0 4px 16px rgba(0,0,0,0.5)`,
          }}
          className={`pointer-events-auto group/btn inline-flex h-11 w-11 items-center justify-center rounded-full border bg-zinc-950/85 text-white backdrop-blur transition-all duration-200 hover:scale-110 hover:brightness-125 active:scale-95 disabled:cursor-not-allowed disabled:opacity-0 ${hasAdvancedRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          aria-label="Próximo"
          disabled={!canScrollRight}
          style={{
            borderColor: accentColor + "99",
            boxShadow: `0 0 14px ${accentColor}55, 0 4px 16px rgba(0,0,0,0.5)`,
          }}
          className="pointer-events-auto group/btn inline-flex h-11 w-11 items-center justify-center rounded-full border bg-zinc-950/85 text-white backdrop-blur transition-all duration-200 hover:scale-110 hover:brightness-125 active:scale-95 disabled:cursor-not-allowed disabled:opacity-0"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}