import type { Metadata } from "next"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { unstable_cache } from "next/cache"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { QuemSomosScripts } from "@/components/quem-somos/QuemSomosScripts"
import { getPublicPlatformSettings } from "@/lib/app-settings"
import { db } from "@/lib/db"

export const metadata: Metadata = {
  title: "Quem somos",
  description: "Conheça a história, autoridade e estrutura do GameDoctor.",
}

const getCachedLessonCount = unstable_cache(
  () => db.lesson.count(),
  ["home-lesson-count"],
  { revalidate: 60 }
)

const SCRIPT_REGEX = /<script\b[^>]*>[\s\S]*?<\/script>/gi

function splitHtmlAndScripts(html: string) {
  const scripts: string[] = []
  const content = html.replace(SCRIPT_REGEX, (script) => {
    scripts.push(script)
    return ""
  })

  return { content, scripts }
}

export default async function QuemSomosPage() {
  const [{ aboutVideoUrl }, template, lessonCount] = await Promise.all([
    getPublicPlatformSettings(),
    readFile(join(process.cwd(), "public", "quem-somos", "content.html"), "utf8"),
    getCachedLessonCount().catch(() => 0),
  ])
  const html = template
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
  const { content, scripts } = splitHtmlAndScripts(html)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div dangerouslySetInnerHTML={{ __html: content }} />
      <Footer />
      <QuemSomosScripts scripts={scripts} />
    </div>
  )
}
