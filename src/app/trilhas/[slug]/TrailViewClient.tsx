"use client"

import Link from "next/link"
import { useState } from "react"
import { Play, Lock, CheckCircle2, Clock } from "lucide-react"
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
    if (!seconds) return "Sem duração"
    if (seconds >= 3600) {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
    }
    return `${Math.floor(seconds / 60)} min`
  }

  const BUNNY_CDN = "vz-38444944-922.b-cdn.net"

  const LessonCard = ({ lesson, isInModule }: { lesson: Lesson; isInModule?: boolean }) => {
    const progress = progressMap.get(lesson.id)
    const isCompleted = progress?.completedAt !== null
    const isLocked = !courseAccess && !lesson.isFree

    const href = lesson.videoProviderId
      ? `/aula/bunny/${lesson.videoProviderId}?titulo=${encodeURIComponent(lesson.title)}${lesson.description ? `&legenda=${encodeURIComponent(lesson.description)}` : ""}`
      : `/aula/${lesson.id}`

    const thumbnail = lesson.thumbnail
      ?? (lesson.videoProviderId ? `https://${BUNNY_CDN}/${lesson.videoProviderId}/thumbnail.jpg` : null)
      ?? lesson.videoThumbnailUrl
      ?? "/thumbs/t01.jpg"

    return (
      <Link href={isLocked ? "#" : href}>
        <div
          className={`group flex-shrink-0 ${isInModule ? "w-full" : "w-[240px] sm:w-[280px]"} overflow-hidden rounded-lg transition-all duration-200 ${isLocked ? "cursor-not-allowed opacity-60" : "hover:scale-105 cursor-pointer"}`}
        >
          {/* Thumbnail */}
          <div className="relative aspect-video bg-zinc-900 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt={lesson.title}
              className="w-full h-full object-cover transition-transform duration-300"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              {isLocked ? (
                <Lock className="h-12 w-12 text-red-400" />
              ) : (
                <Play className="h-12 w-12 text-cyan-400 fill-cyan-400" />
              )}
            </div>

            {/* Progress indicator or badge */}
            <div className="absolute top-2 right-2 flex gap-1">
              {lesson.isFree && (
                <span className="px-2 py-1 bg-emerald-500/90 text-white text-xs font-semibold rounded">
                  GRÁTIS
                </span>
              )}
              {isCompleted && (
                <div className="p-1 bg-emerald-500/90 rounded">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              )}
              {isLocked && (
                <div className="p-1 bg-red-500/90 rounded">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Duration */}
            {(lesson.videoDurationSeconds || lesson.durationSeconds) && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-semibold text-white flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {handleDurationFormat(lesson.videoDurationSeconds || lesson.durationSeconds)}
              </div>
            )}
          </div>

          {/* Title and description */}
          <div className="pt-3">
            <h3 className="font-semibold text-sm leading-tight text-white group-hover:text-cyan-400 transition-colors">
              {lesson.title}
            </h3>
            {lesson.description && (
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{lesson.description}</p>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="px-4 md:px-8 lg:px-14 pb-16">
      {/* Standalone lessons */}
      {lessons.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Aulas independentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} isInModule={true} />
            ))}
          </div>
        </div>
      )}

      {/* Modules and their lessons */}
      <div className="space-y-8">
        {modules.map((module) => (
          <div key={module.id}>
            {/* Module header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full flex items-center justify-between mb-4 p-4 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 transition-colors group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-1 h-8 rounded-full bg-cyan-500 group-hover:bg-cyan-400 transition-colors" />
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
                  <LessonCard key={lesson.id} lesson={lesson} isInModule={true} />
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

      {/* Paywall message if no access */}
      {!courseAccess && !lessons.some((l) => l.isFree) && (
        <div className="mt-12 p-8 rounded-lg bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30">
          <h3 className="text-lg font-semibold text-white mb-2">Desbloqueie todas as aulas</h3>
          <p className="text-zinc-300 mb-4">
            Entre para a maior e mais completa plataforma de formação de téncicos em videogames do Brasil
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/planos"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 text-zinc-950 font-semibold hover:from-cyan-400 hover:to-emerald-300 transition-colors"
            >
              Ver planos
            </Link>
            {userHasAccess ? (
              <Link
                href={`/login?callbackUrl=/trilhas/${course.slug}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/25 bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Já tenho acesso
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
