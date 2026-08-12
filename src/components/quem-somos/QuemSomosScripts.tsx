"use client"

import { useEffect } from "react"

export function QuemSomosScripts({ scripts }: { scripts: string[] }) {
  useEffect(() => {
    const mountedScripts: HTMLScriptElement[] = []
    const container = document.createElement("div")

    scripts.forEach((scriptHtml) => {
      container.innerHTML = scriptHtml
      const source = container.querySelector("script")
      if (!source) return

      const script = document.createElement("script")
      Array.from(source.attributes).forEach((attribute) => {
        script.setAttribute(attribute.name, attribute.value)
      })
      script.textContent = source.textContent
      document.body.appendChild(script)
      mountedScripts.push(script)
      container.innerHTML = ""
    })

    return () => {
      mountedScripts.forEach((script) => script.remove())
    }
  }, [scripts])

  return null
}