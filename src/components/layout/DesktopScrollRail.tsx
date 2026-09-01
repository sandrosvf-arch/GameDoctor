"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// Only show the rail once the page is meaningfully longer than the viewport.
const MIN_SCROLLABLE_HEIGHT = 800
const MIN_THUMB_HEIGHT = 32

export function DesktopScrollRail() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [trackHeight, setTrackHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [maxScroll, setMaxScroll] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const recomputeScrollMetrics = useCallback(() => {
    const docHeight = document.documentElement.scrollHeight
    const nextViewportHeight = window.innerHeight
    setViewportHeight(nextViewportHeight)
    setMaxScroll(Math.max(docHeight - nextViewportHeight, 0))
  }, [])

  useEffect(() => {
    recomputeScrollMetrics()
    setScrollY(window.scrollY)

    const handleScroll = () => setScrollY(window.scrollY)
    const handleResize = () => recomputeScrollMetrics()

    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleResize)

    // Homepage rows load lazily as you scroll, so watch body height directly.
    const bodyObserver = new ResizeObserver(() => recomputeScrollMetrics())
    bodyObserver.observe(document.body)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
      bodyObserver.disconnect()
    }
  }, [recomputeScrollMetrics])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const trackObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setTrackHeight(entry.contentRect.height)
    })
    trackObserver.observe(track)

    return () => trackObserver.disconnect()
  }, [])

  const getThumbHeight = useCallback(() => {
    if (trackHeight <= 0 || viewportHeight <= 0) return MIN_THUMB_HEIGHT
    const docHeight = maxScroll + viewportHeight
    return Math.max((trackHeight * viewportHeight) / docHeight, MIN_THUMB_HEIGHT)
  }, [trackHeight, viewportHeight, maxScroll])

  const scrollToRatio = useCallback(
    (ratio: number) => {
      const clamped = Math.min(Math.max(ratio, 0), 1)
      window.scrollTo({ top: clamped * maxScroll, behavior: "auto" })
    },
    [maxScroll]
  )

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || maxScroll <= 0) return

    // Prevent the browser from treating the drag as a text/card selection.
    event.preventDefault()

    const rect = track.getBoundingClientRect()
    const thumbHeight = getThumbHeight()
    const travel = Math.max(trackHeight - thumbHeight, 1)
    const previousUserSelect = document.body.style.userSelect

    const updateFromClientY = (clientY: number) => {
      const offsetY = clientY - rect.top - thumbHeight / 2
      scrollToRatio(offsetY / travel)
    }

    updateFromClientY(event.clientY)
    setDragging(true)
    document.body.style.userSelect = "none"

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      updateFromClientY(moveEvent.clientY)
    }
    const handlePointerUp = () => {
      setDragging(false)
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  // Stay hidden until the user has scrolled past the first "screen" of content.
  const visible = maxScroll > MIN_SCROLLABLE_HEIGHT && scrollY > viewportHeight
  const thumbHeight = getThumbHeight()
  const travel = Math.max(trackHeight - thumbHeight, 1)
  const scrollRatio = maxScroll > 0 ? scrollY / maxScroll : 0
  const thumbTop = travel * scrollRatio

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed right-3 top-1/2 z-40 hidden h-[70vh] -translate-y-1/2 transition-opacity duration-300 lg:block",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="relative h-full w-3 cursor-pointer select-none rounded-full bg-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-colors hover:bg-white/25"
      >
        <div
          className={cn(
            "absolute inset-x-0 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.55)] transition-colors",
            dragging ? "bg-cyan-300" : "bg-cyan-400 hover:bg-cyan-300"
          )}
          style={{ height: thumbHeight, top: thumbTop }}
        />
      </div>
    </div>
  )
}
