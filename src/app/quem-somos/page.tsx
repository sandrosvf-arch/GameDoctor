import type { Metadata } from "next"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { QuemSomosScripts } from "@/components/quem-somos/QuemSomosScripts"

export const metadata: Metadata = {
  title: "Quem somos",
  description: "Conheça a história, autoridade e estrutura do GameDoctor.",
}

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
  const html = await readFile(join(process.cwd(), "public", "quem-somos", "content.html"), "utf8")
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