"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseLessonProgressOptions {
  lessonId: string | null
  enabled: boolean
  durationSeconds: number | null | undefined
  initialWatchedSeconds?: number
  initialCompleted?: boolean
  trackingMode?: "playback" | "session"
}

interface QueuePayload {
  watchedSeconds: number
  completed: boolean
}

export function useLessonProgress({
  lessonId,
  enabled,
  durationSeconds,
  initialWatchedSeconds = 0,
  initialCompleted = false,
  trackingMode = "playback",
}: UseLessonProgressOptions) {
  const [completed, setCompleted] = useState(initialCompleted)
  const watchedSecondsRef = useRef(initialWatchedSeconds)
  const lastSavedSecondsRef = useRef(initialWatchedSeconds)
  const completedRef = useRef(initialCompleted)
  const queueRef = useRef<QueuePayload | null>(null)
  const savingRef = useRef(false)
  const sessionTickStartedAtRef = useRef<number | null>(null)
  const lastActivityAtRef = useRef<number>(Date.now())

  useEffect(() => {
    watchedSecondsRef.current = initialWatchedSeconds
    lastSavedSecondsRef.current = initialWatchedSeconds
    completedRef.current = initialCompleted
    setCompleted(initialCompleted)
    queueRef.current = null
    savingRef.current = false
    sessionTickStartedAtRef.current = null
    lastActivityAtRef.current = Date.now()
  }, [initialCompleted, initialWatchedSeconds, lessonId])

  const saveProgress = useCallback(async () => {
    if (!lessonId || !enabled || savingRef.current || !queueRef.current) return

    const payload = queueRef.current
    queueRef.current = null
    savingRef.current = true

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          watchedSeconds: payload.watchedSeconds,
          completed: payload.completed,
        }),
        keepalive: true,
      })

      if (response.ok) {
        const data = await response.json().catch(() => null)
        const progress = data?.progress
        const savedSeconds =
          typeof progress?.watchedSeconds === "number"
            ? progress.watchedSeconds
            : payload.watchedSeconds
        const savedCompleted =
          typeof progress?.completed === "boolean"
            ? progress.completed
            : payload.completed

        watchedSecondsRef.current = Math.max(watchedSecondsRef.current, savedSeconds)
        lastSavedSecondsRef.current = Math.max(lastSavedSecondsRef.current, savedSeconds)
        completedRef.current = savedCompleted
        setCompleted(savedCompleted)
      }
    } finally {
      savingRef.current = false
      if (queueRef.current) {
        void saveProgress()
      }
    }
  }, [enabled, lessonId])

  const queueProgress = useCallback((watchedSeconds: number, forceCompleted = false) => {
    if (!lessonId || !enabled) return

    const normalizedWatchedSeconds = Math.max(
      watchedSecondsRef.current,
      Math.floor(Math.max(0, watchedSeconds))
    )

    watchedSecondsRef.current = normalizedWatchedSeconds

    const autoCompleted = Boolean(
      durationSeconds &&
      durationSeconds > 0 &&
      normalizedWatchedSeconds >= durationSeconds * 0.9
    )

    const nextCompleted = completedRef.current || forceCompleted || autoCompleted
    const shouldSend =
      normalizedWatchedSeconds > lastSavedSecondsRef.current ||
      (nextCompleted && !completedRef.current)

    if (!shouldSend) return

    queueRef.current = {
      watchedSeconds: Math.max(queueRef.current?.watchedSeconds ?? 0, normalizedWatchedSeconds),
      completed: (queueRef.current?.completed ?? false) || nextCompleted,
    }

    if (nextCompleted && !completedRef.current) {
      completedRef.current = true
      setCompleted(true)
    }

    void saveProgress()
  }, [durationSeconds, enabled, lessonId, saveProgress])

  const handlePlaybackProgress = useCallback((playedSeconds: number) => {
    if (!enabled) return

    const normalizedPlayedSeconds = Math.floor(Math.max(0, playedSeconds))
    watchedSecondsRef.current = Math.max(watchedSecondsRef.current, normalizedPlayedSeconds)

    if (watchedSecondsRef.current >= lastSavedSecondsRef.current + 15) {
      queueProgress(watchedSecondsRef.current)
      return
    }

    if (
      durationSeconds &&
      durationSeconds > 0 &&
      watchedSecondsRef.current >= durationSeconds * 0.9 &&
      !completedRef.current
    ) {
      queueProgress(watchedSecondsRef.current, true)
    }
  }, [durationSeconds, enabled, queueProgress])

  const flushProgress = useCallback((options?: { playedSeconds?: number; completed?: boolean }) => {
    if (!enabled) return
    queueProgress(
      options?.playedSeconds ?? watchedSecondsRef.current,
      options?.completed ?? false
    )
  }, [enabled, queueProgress])

  const markCompleted = useCallback(async () => {
    const playedSeconds = durationSeconds ?? watchedSecondsRef.current
    queueRef.current = {
      watchedSeconds: Math.max(queueRef.current?.watchedSeconds ?? 0, Math.floor(Math.max(0, playedSeconds))),
      completed: true,
    }
    completedRef.current = true
    setCompleted(true)
    await saveProgress()
  }, [durationSeconds, saveProgress])

  useEffect(() => {
    if (!enabled || trackingMode !== "session") return

    const activityWindowMs = 45_000

    const registerActivity = () => {
      lastActivityAtRef.current = Date.now()
    }

    const tick = () => {
      const now = Date.now()
      const isVisible = document.visibilityState === "visible"
      const hasFocus = typeof document.hasFocus === "function" ? document.hasFocus() : true
      const isRecentlyActive = now - lastActivityAtRef.current <= activityWindowMs

      if (!isVisible || !hasFocus || !isRecentlyActive) {
        sessionTickStartedAtRef.current = now
        return
      }

      if (!sessionTickStartedAtRef.current) {
        sessionTickStartedAtRef.current = now
        return
      }

      const elapsedSeconds = Math.max(
        0,
        Math.floor((now - sessionTickStartedAtRef.current) / 1000)
      )

      if (elapsedSeconds <= 0) return

      sessionTickStartedAtRef.current = now
      queueProgress(watchedSecondsRef.current + elapsedSeconds)
    }

    registerActivity()
    sessionTickStartedAtRef.current = Date.now()

    const interval = window.setInterval(tick, 5000)
    const events: Array<keyof DocumentEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
    ]

    for (const eventName of events) {
      document.addEventListener(eventName, registerActivity, { passive: true })
    }

    const handleWindowFocus = () => {
      registerActivity()
      sessionTickStartedAtRef.current = Date.now()
    }

    const handleWindowBlur = () => {
      flushProgress()
      sessionTickStartedAtRef.current = Date.now()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushProgress()
      } else {
        registerActivity()
        sessionTickStartedAtRef.current = Date.now()
      }
    }

    window.addEventListener("focus", handleWindowFocus)
    window.addEventListener("blur", handleWindowBlur)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      for (const eventName of events) {
        document.removeEventListener(eventName, registerActivity)
      }
      window.removeEventListener("focus", handleWindowFocus)
      window.removeEventListener("blur", handleWindowBlur)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [enabled, flushProgress, queueProgress, trackingMode])

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushProgress()
      }
    }

    const handleBeforeUnload = () => {
      flushProgress()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      flushProgress()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [enabled, flushProgress])

  return {
    completed,
    setCompleted,
    handlePlaybackProgress,
    flushProgress,
    markCompleted,
    watchedSecondsRef,
  }
}
