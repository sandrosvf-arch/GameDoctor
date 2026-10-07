import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { QuemSomosScripts } from "@/components/quem-somos/QuemSomosScripts"
import { QuemSomosTracking } from "@/components/quem-somos/QuemSomosTracking"
import { getPublicPlatformSettings } from "@/lib/app-settings"
import { getCachedLessonCount } from "@/lib/lesson-count"
import { GAME_DOCTOR_PLANS_URL } from "@/lib/checkout-links"

const SCRIPT_REGEX = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const WHATSAPP_CTA_REGEX = /href="https:\/\/wa\.me\/[^"]*"/g

function splitHtmlAndScripts(html: string) {
  const scripts: string[] = []
  const content = html.replace(SCRIPT_REGEX, (script) => {
    scripts.push(script)
    return ""
  })

  return { content, scripts }
}

type QuemSomosLandingProps = {
  ctaTarget: "whatsapp" | "checkout"
}

export async function QuemSomosLanding({ ctaTarget }: QuemSomosLandingProps) {
  const [{ aboutVideoUrl }, template, lessonCount] = await Promise.all([
    getPublicPlatformSettings(),
    readFile(join(process.cwd(), "public", "quem-somos", "content.html"), "utf8"),
    getCachedLessonCount().catch(() => 0),
  ])

  let html = template
    .replace(
      /const VIDEO_EMBED_URL = "[^"]*";/,
      `const VIDEO_EMBED_URL = ${JSON.stringify(aboutVideoUrl)};`
    )
    .replace(
      /<article><strong>\+\d+<\/strong><span>Aulas práticas<\/span><\/article>/,
      `<article><strong>+${lessonCount.toLocaleString("pt-BR")}</strong><span>Aulas práticas</span></article>`
    )
    .replace(
      /<strong>\+\d+ aulas<\/strong>/,
      `<strong>+${lessonCount.toLocaleString("pt-BR")} aulas</strong>`
    )
    .replace(
      /<small>\+\d+ AULAS TÉCNICAS<\/small>/,
      `<small>+${lessonCount.toLocaleString("pt-BR")} AULAS TÉCNICAS</small>`
    )

  if (ctaTarget === "checkout") {
    html = html.replace(WHATSAPP_CTA_REGEX, `href="${GAME_DOCTOR_PLANS_URL}"`)
  }

  const { content, scripts } = splitHtmlAndScripts(html)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div dangerouslySetInnerHTML={{ __html: content }} />
      <Footer />
      <QuemSomosScripts scripts={scripts} />
      <QuemSomosTracking variant={ctaTarget} />
    </div>
  )
}
