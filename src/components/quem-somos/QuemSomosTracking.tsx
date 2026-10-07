"use client"

import { useEffect } from "react"
import { trackEvent } from "@/lib/analytics/data-layer"

type QuemSomosTrackingProps = {
  variant: "whatsapp" | "checkout"
}

export function QuemSomosTracking({ variant }: QuemSomosTrackingProps) {
  useEffect(() => {
    trackEvent("lp_view", { lp_variant: variant, page_path: window.location.pathname })

    function handleClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href") ?? ""
      const isWhatsApp = href.includes("wa.me")
      const isCheckout = href.includes("/planos")
      const isOfferAnchor = href === "#oferta-mgu-pro"
      if (!isWhatsApp && !isCheckout && !isOfferAnchor) return

      trackEvent("lp_cta_click", {
        lp_variant: variant,
        cta_destination: isWhatsApp ? "whatsapp" : isCheckout ? "checkout" : "offer_section",
        cta_text: anchor.textContent?.trim().slice(0, 80) ?? "",
      })
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [variant])

  return null
}
