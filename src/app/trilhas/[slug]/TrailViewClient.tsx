"use client"

import Link from "next/link"
import { useState } from "react"
import { Play, CheckCircle2 } from "lucide-react"
import type { Module, Lesson, Course } from "@prisma/client"

interface TrailViewClientProps {
  course: Course
  modules: (Module & { lessons: Lesson[] })[]
  lessons: Lesson[]
  progressMap: Map<string, { completedAt: Date | null }>
  courseAccess: boolean
  userHasAccess: boolean
}

export function TrailViewClient({
  course,
  modules,
  lessons,
  progressMap,
  courseAccess,
  userHasAccess,
}: TrailViewClientProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  )

  const toggleModule = (moduleId: string) => {
    const newSet = new Set(expandedModules)
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId)
    } else {
      newSet.add(moduleId)
    }
    setExpandedModules(newSet)
  }

  const handleDurationFormat = (seconds: number | null | undefined): string => {
    if (!seconds) return ""
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
    }
    return `${Math.floor(seconds / 60)} min`
  }

  const BUNNY_CDN = "vz-38444944-922.b-cdn.net"

  // Resolve accent color from trail (same logic as home page)
  const accentColor = (() => {
    const raw = course.trailColorRgb?.trim()
    if (!raw) return "#00cfff"
    const m = raw.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
    if (!m) return raw.startsWith("#") ? raw : "#00cfff"
    const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3])
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
  })()

  const LessonCard = ({ lesson }: { lesson: Lesson }) => {
    const progress = progressMap.get(lesson.id)
    const isCompleted = !!progress?.completedAt
    const isLocked = !courseAccess && !lesson.isFree
    const dur = handleDurationFormat(lesson.videoDurationSeconds ?? lesson.durationSeconds)

    const href = lesson.videoProviderId
      ? `/aula/bunny/${lesson.videoProviderId}?titulo=${encodeURIComponent(lesson.title)}${lesson.description ? `&legenda=${encodeURIComponent(lesson.description)}` : ""}`
      : `/aula/${lesson.id}`

    const thumbnail = lesson.thumbnail
      ?? (lesson.videoProviderId ? `https://${BUNNY_CDN}/${lesson.videoProviderId}/thumbnail.jpg` : null)
      ?? lesson.videoThumbnailUrl
      ?? "/thumbs/t01.jpg"

    return (
      <Link
        href={href}
        className="group/card block"
      >
        {/* Gradient border wrapper — same as home card */}
        <div
          className="relative overflow-hidden rounded-[12px] p-[1.2px] transition-colors duration-200 ease-out"
          style={{
            background: `radial-gradient(58% 96% at 0% 50%, ${accentColor}ff 0%, ${accentColor}cc 12%, ${accentColor}55 24%, ${accentColor}22 36%, transparent 48%), linear-gradient(to right, ${accentColor}20, ${accentColor}1a)`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
          }}
        >
          <div className="relative aspect-video rounded-[11px] overflow-hidden bg-zinc-950">
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt={lesson.title}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />

            {/* Bottom shadow — strong, starts at mid-card */}
            <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

            {/* Top-left badges */}
            <div className="absolute top-2.5 left-2.5 z-20 flex gap-1.5">
              {lesson.isFree && (
                <span className="rounded px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em] bg-emerald-500 text-white">
                  GRÁTIS
                </span>
              )}
              {course.badgeLabel && (
                <span className="rounded px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em] bg-cyan-500 text-zinc-950">
                  {course.badgeLabel}
                </span>
              )}
              {isCompleted && (
                <span className="rounded px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em] bg-emerald-600/90 text-white flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> CONCLUÍDO
                </span>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 bg-black/15 transition-opacity duration-200" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200">
              <div className="flex h-11 w-11 scale-95 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm transition-transform duration-200 group-hover/card:scale-100">
                <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
              </div>
            </div>

            {/* Bottom content */}
            <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pt-1">
              <p className="text-[15px] sm:text-[16px] font-bold leading-tight text-white line-clamp-2">
                {lesson.title}
              </p>
              <div className="mt-1.5 flex items-center">
                {dur && (
                  <span className="text-[11px] text-zinc-400 font-medium">{dur}</span>
                )}
                {/* SVG waveform — same as home */}
                <svg viewBox="0 0 112 16" className="ml-auto h-[12px] w-28 shrink-0" aria-hidden="true">
                  <defs>
                    <linearGradient id={`trail-fade-${lesson.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
                      <stop offset="28%" stopColor={accentColor} stopOpacity="0.9" />
                      <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
                      <stop offset="72%" stopColor={accentColor} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 8 H44 L48 11 L54 1 L60 15 L66 8 H112"
                    fill="none"
                    stroke={`url(#trail-fade-${lesson.id})`}
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
    )
  }

  return (
    <div className="px-4 pb-16 md:px-8 lg:px-14">
      {/* Standalone lessons */}
      {lessons.length > 0 && (
        <div className="mb-12 rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-5 md:p-6">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold">
            <span className="inline-block h-6 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
            Aulas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      )}

      {/* Modules and their lessons */}
      <div className="space-y-8">
        {modules.map((module) => (
          <div key={module.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-4 md:p-6">
            {/* Module header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="group mb-4 flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="h-8 w-1 rounded-full transition-colors" style={{ backgroundColor: accentColor }} />
                <h2 className="text-xl font-bold text-white">{module.title}</h2>
                <span className="ml-2 text-sm text-zinc-400">
                  ({module.lessons.length} aulas)
                </span>
              </div>
              <div
                className={`text-zinc-400 transform transition-transform ${
                  expandedModules.has(module.id) ? "rotate-180" : ""
                }`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </button>

            {/* Lessons grid */}
            {expandedModules.has(module.id) && (
              <div className="ml-0 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {module.lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No content message */}
      {lessons.length === 0 && modules.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-lg">Nenhuma aula disponível nesta trilha ainda.</p>
        </div>
      )}

    </div>
  )
}
