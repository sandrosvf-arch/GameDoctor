"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics/data-layer"

type TrackEventProps = {
  event: string
  data?: Record<string, string | number | boolean>
}

export function TrackEvent({ event, data }: TrackEventProps) {
  useEffect(() => {
    trackEvent(event, data)
    // Dispara uma única vez por montagem da página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
