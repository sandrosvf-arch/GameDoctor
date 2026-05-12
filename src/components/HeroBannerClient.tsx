"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Info, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BannerSlide {
  id: string
  title: string
  subtitle: string | null
  badge: string | null
  videoUrl: string | null
  imageUrl: string | null
  ctaText: string | null
  ctaHref: string | null
  secondaryCtaText: string | null
  secondaryCtaHref: string | null
  consoles: string[]
}

interface HeroBannerClientProps {
  banners: BannerSlide[]
}

export function HeroBannerClient({ banners }: HeroBannerClientProps) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const go = useCallback(
    (index: number) => {
      if (transitioning || index === current) return
      setTransitioning(true)
      setTimeout(() => {
        setCurrent(index)
        setTransitioning(false)
      }, 400)
    },
    [current, transitioning],
  )

  const next = useCallback(() => {
    go((current + 1) % banners.length)
  }, [current, banners.length, go])

  const prev = useCallback(() => {
    go((current - 1 + banners.length) % banners.length)
  }, [current, banners.length, go])

  // Auto-rotate every 9 seconds
  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 9000)
    return () => clearInterval(timer)
  }, [next, banners.length])

  if (banners.length === 0) return null

  const slide = banners[current]

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Background media */}
      {slide.videoUrl ? (
        <video
          key={`video-${slide.id}`}
          className="absolute inset-0 h-full w-full object-cover"
          src={slide.videoUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : slide.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`img-${slide.id}`}
          src={slide.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {/* Gradient overlays — dark left (text), transparent right (video visible) */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 from-[20%] via-zinc-950/60 via-[50%] to-transparent to-[75%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 from-[0%] via-zinc-950/50 via-[18%] to-transparent to-[40%]" />

      {/* Content — vertically centered with navbar offset */}
      <div
        className={cn(
          "relative z-10 w-full -mt-16 pl-24 md:pl-44 lg:pl-64",
          transitioning ? "opacity-0" : "opacity-100",
        )}
        style={{ transition: "opacity 0.4s ease" }}
      >
        <div className="max-w-[520px] space-y-4">
          {slide.badge && (
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 bg-zinc-950/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Gamepad2 className="h-3.5 w-3.5" />
              {slide.badge}
            </div>
          )}

          <h1 className="text-[2.4rem] sm:text-[2.8rem] md:text-[3.2rem] lg:text-[3.6rem] font-black tracking-tight leading-[1.05]">
            {slide.title}
          </h1>

          {slide.subtitle && (
            <p className="text-zinc-300 leading-relaxed text-base md:text-lg max-w-[440px]">
              {slide.subtitle}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {slide.ctaText && slide.ctaHref && (
              <Button
                size="lg"
                className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold h-12 px-7"
                asChild
              >
                <Link href={slide.ctaHref}>
                  <Play className="mr-2 h-4 w-4 fill-zinc-950" />
                  {slide.ctaText}
                </Link>
              </Button>
            )}
            {slide.secondaryCtaText && slide.secondaryCtaHref && (
              <Button
                size="lg"
                variant="ghost"
                className="border border-zinc-600 hover:bg-white/10 text-zinc-200 h-12 px-7 backdrop-blur-sm"
                asChild
              >
                <Link href={slide.secondaryCtaHref}>
                  <Info className="mr-2 h-4 w-4" />
                  {slide.secondaryCtaText}
                </Link>
              </Button>
            )}
          </div>

          {slide.consoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-zinc-600 mr-1 shrink-0">Cobre:</span>
              {slide.consoles.map((c) => (
                <span
                  key={c}
                  className="text-[11px] text-zinc-400 border border-zinc-700/60 bg-zinc-900/50 backdrop-blur-sm px-2.5 py-1 rounded-full"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all"
            aria-label="Proximo banner"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>

          {/* Progress dots */}
          <div className="absolute bottom-8 left-24 md:left-44 lg:left-64 z-20 flex gap-2 items-center">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={cn(
                  "h-[3px] rounded-full transition-all duration-300",
                  i === current
                    ? "w-8 bg-white"
                    : "w-3 bg-white/40 hover:bg-white/70",
                )}
                aria-label={`Ir para banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
