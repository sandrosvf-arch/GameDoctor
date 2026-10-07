"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics/data-layer"

export function WhatsAppClickTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a")
      const href = anchor?.getAttribute("href") ?? ""
      if (!anchor || !/(wa\.me|api\.whatsapp\.com|whatsapp:\/\/)/.test(href)) return

      const location = anchor.closest("[data-track-location]")?.getAttribute("data-track-location") ?? "page"
      trackEvent("whatsapp_click", {
        link_location: location,
        link_url: href,
        page_path: window.location.pathname,
      })
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  return null
}
