'use client'

import { useEffect, useRef, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface HorizontalCardRailProps {
  children: ReactNode
  className?: string
}

export function HorizontalCardRail({ children, className = "" }: HorizontalCardRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const leftBtnRef = useRef<HTMLButtonElement>(null)
  const rightBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const rail = railRef.current
    const leftBtn = leftBtnRef.current
    const rightBtn = rightBtnRef.current
    if (!rail || !leftBtn || !rightBtn) return

    // Direct DOM mutation — zero React re-renders on scroll
    let scrollTimer: ReturnType<typeof setTimeout> | null = null

    const sync = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth
      const atStart = rail.scrollLeft <= 4
      const atEnd = rail.scrollLeft >= maxScroll - 4

      leftBtn.disabled = atStart
      leftBtn.style.opacity = atStart ? "0" : "1"
      leftBtn.style.pointerEvents = atStart ? "none" : ""

      rightBtn.disabled = atEnd
      rightBtn.style.opacity = atEnd ? "0" : "1"
      rightBtn.style.pointerEvents = atEnd ? "none" : ""

      // Suppress hover transitions while scrolling (prevents GPU-intensive
      // backdrop-blur + opacity animations firing on every card the cursor passes over)
      rail.classList.add("is-scrolling")
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => rail.classList.remove("is-scrolling"), 200)
    }

    sync()
    rail.addEventListener("scroll", sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(rail)

    return () => {
      rail.removeEventListener("scroll", sync)
      ro.disconnect()
    }
  }, [children])

  const scrollBy = (dir: "left" | "right") => {
    const rail = railRef.current
    if (!rail) return
    const amount = Math.max(rail.clientWidth * 0.82, 320)
    rail.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
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
          ref={leftBtnRef}
          type="button"
          onClick={() => scrollBy("left")}
          aria-label="Anterior"
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500 text-zinc-950 shadow-[0_0_18px_rgba(0,207,255,0.55)] transition-[opacity,transform,box-shadow] duration-200 hover:scale-110 hover:bg-cyan-400 hover:shadow-[0_0_28px_rgba(0,207,255,0.8)] active:scale-95 disabled:cursor-not-allowed"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          ref={rightBtnRef}
          type="button"
          onClick={() => scrollBy("right")}
          aria-label="Próximo"
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500 text-zinc-950 shadow-[0_0_18px_rgba(0,207,255,0.55)] transition-[opacity,transform,box-shadow] duration-200 hover:scale-110 hover:bg-cyan-400 hover:shadow-[0_0_28px_rgba(0,207,255,0.8)] active:scale-95 disabled:cursor-not-allowed"
          style={{ opacity: 0 }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}