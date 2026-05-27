"use client"

import Link from "next/link"
import { Play, ChevronRight } from "lucide-react"
import { HorizontalCardRail } from "@/components/HorizontalCardRail"
import type { HomeRowDto } from "@/lib/home-rows"

interface TrailRowViewProps {
  row: HomeRowDto
}

export function TrailRowView({ row }: TrailRowViewProps) {
  const { id, title, platformBadge, courseSlug, brandColor, badgeTextColor, badgeLabel, cards } = row
  const isContinue = id === "continue"

  return (
    <div className="relative">
      <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3">
        {/* Soft neon glow on left edge */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[28px] h-[40%] pointer-events-none rounded-full"
          style={{ background: brandColor, filter: "blur(28px)", opacity: 0.75 }}
        />
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
          {isContinue ? (
            <span className="inline-block w-2 h-6 rounded-full bg-cyan-400 shrink-0" />
          ) : (
            <span
              className="inline-block w-2 h-6 rounded-full shrink-0"
              style={{ backgroundColor: brandColor }}
            />
          )}
          {title}
        </h2>
        <Link
          href={courseSlug ? `/trilhas/${courseSlug}` : "/cursos"}
          className="ml-auto text-sm font-semibold text-cyan-500 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap transition-colors"
        >
          Ver todos <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <HorizontalCardRail>
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group/card flex-shrink-0 w-[280px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[380px] 2xl:w-[460px]"
          >
            <div
              className="relative overflow-hidden rounded-[12px] p-[1.2px] transition-colors duration-200 ease-out"
              style={{
                background: `radial-gradient(58% 96% at 0% 50%, ${brandColor}ff 0%, ${brandColor}f0 12%, ${brandColor}66 24%, ${brandColor}22 36%, transparent 48%), linear-gradient(to right, ${brandColor}20, ${brandColor}1a)`,
                boxShadow: `0 4px 20px rgba(0,0,0,0.45)`,
              }}
            >
              <div className="relative z-10 aspect-video rounded-[11px] overflow-hidden bg-zinc-950">
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                  loading="lazy"
                />

                {/* Bottom shadow */}
                <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

                {/* Top-left badge */}
                <div className="absolute left-2.5 top-2.5 z-20 flex gap-1.5">
                  {badgeLabel ? (
                    <span
                      className="rounded px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ backgroundColor: brandColor, color: badgeTextColor }}
                    >
                      {badgeLabel}
                    </span>
                  ) : platformBadge && (platformBadge !== "GRÁTIS" || card.isFree) ? (
                    <span
                      className="rounded px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em]"
                      style={{ backgroundColor: brandColor, color: badgeTextColor }}
                    >
                      {platformBadge}
                    </span>
                  ) : null}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/15 opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover/card:opacity-100" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 [@media(hover:hover)]:group-hover/card:opacity-100">
                  <div className="flex h-11 w-11 scale-95 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm transition-transform duration-200 [@media(hover:hover)]:group-hover/card:scale-100">
                    <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                  </div>
                </div>

                {/* Bottom content */}
                <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pt-1">
                  <p className="text-[18px] sm:text-[19px] font-bold leading-tight text-white line-clamp-2">
                    {card.title}
                  </p>
                  <div className="mt-1.5 flex items-center">
                    <span className="text-[11px] text-zinc-400 font-medium">{card.duration}</span>
                    <svg viewBox="0 0 112 16" className="ml-auto h-[12px] w-28 shrink-0" aria-hidden="true">
                      <defs>
                        <linearGradient id={`hb-fade-${card.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%"   stopColor={brandColor} stopOpacity="0" />
                          <stop offset="28%"  stopColor={brandColor} stopOpacity="0.9" />
                          <stop offset="50%"  stopColor={brandColor} stopOpacity="1" />
                          <stop offset="72%"  stopColor={brandColor} stopOpacity="0.9" />
                          <stop offset="100%" stopColor={brandColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 8 H44 L48 11 L54 1 L60 15 L66 8 H112"
                        fill="none"
                        stroke={`url(#hb-fade-${card.id})`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* "Ver todos" card */}
        <Link
          href={courseSlug ? `/trilhas/${courseSlug}` : "/cursos"}
          className="group/more flex-shrink-0 w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px]"
        >
          <div className="aspect-video rounded-[12px] border border-zinc-800 bg-zinc-900/40 group-hover/more:bg-zinc-800/60 transition-colors flex flex-col items-center justify-center gap-2">
            <div className="h-9 w-9 rounded-full border border-zinc-700 group-hover/more:border-zinc-500 flex items-center justify-center transition-colors">
              <ChevronRight className="h-5 w-5 text-zinc-600 group-hover/more:text-zinc-300 transition-colors" />
            </div>
            <span className="text-[11px] text-zinc-600 group-hover/more:text-zinc-300 transition-colors font-medium">
              Ver todos
            </span>
          </div>
        </Link>
      </HorizontalCardRail>
    </div>
  )
}
