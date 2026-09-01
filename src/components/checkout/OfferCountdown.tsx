"use client"

import { useEffect, useState } from "react"

const CYCLE_SECONDS = 3 * 24 * 60 * 60

function getRemainingSeconds() {
  const cycleMilliseconds = CYCLE_SECONDS * 1000
  const elapsedInCycle = Date.now() % cycleMilliseconds
  return Math.max(0, Math.ceil((cycleMilliseconds - elapsedInCycle) / 1000))
}

function splitTime(totalSeconds: number) {
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function OfferCountdown() {
  const [remainingSeconds, setRemainingSeconds] = useState(CYCLE_SECONDS)

  useEffect(() => {
    const updateCountdown = () => setRemainingSeconds(getRemainingSeconds())
    updateCountdown()

    const interval = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const time = splitTime(remainingSeconds)
  const units = [
    { label: "Dias", value: time.days },
    { label: "Horas", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Seg", value: time.seconds },
  ]

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-1.5" role="timer" aria-live="off">
      {units.map((unit, index) => (
        <div key={unit.label} className="contents">
          {index > 0 && <strong className="text-center text-lg font-bold text-rose-400/80">:</strong>}
          <div className="min-w-0 rounded-lg border border-white/[0.06] bg-black/40 px-1 py-2 text-center shadow-inner shadow-black/30">
            <strong className="block font-mono text-xl font-bold tabular-nums text-cyan-300 sm:text-2xl">
              {String(unit.value).padStart(2, "0")}
            </strong>
            <span className="mt-0.5 block text-[8px] font-bold uppercase text-slate-500">
              {unit.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}