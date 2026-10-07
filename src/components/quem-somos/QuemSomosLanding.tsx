import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { Footer } from "@/components/layout/Footer"
import { QuemSomosScripts } from "@/components/quem-somos/QuemSomosScripts"
import { QuemSomosTracking } from "@/components/quem-somos/QuemSomosTracking"
import { getPublicPlatformSettings } from "@/lib/app-settings"
import { getCachedLessonCount } from "@/lib/lesson-count"
import { getLandingCurriculum, getLandingFaq } from "@/lib/landing-content"
import { GAME_DOCTOR_PLANS_URL } from "@/lib/checkout-links"
import {
  buildCurriculumModules,
  buildFaqSections,
  buildRepairTable,
  replaceBetween,
} from "@/lib/quem-somos-sections"

const SCRIPT_REGEX = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const WHATSAPP_CTA_REGEX = /href="https:\/\/wa\.me\/[^"]*"/g
const REPAIR_CUE_TEXT = "Veja em quantos reparos você recupera o investimento"

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
  const [{ aboutVideoUrl }, template, lessonCount, faqArticles, curriculum] = await Promise.all([
    getPublicPlatformSettings(),
    readFile(join(process.cwd(), "public", "quem-somos", "content.html"), "utf8"),
    getCachedLessonCount().catch(() => 0),
    getLandingFaq().catch(() => []),
    getLandingCurriculum().catch(() => []),
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
    // Os planos têm durações diferentes: troca os badges de "12 meses/anual" por benefícios comuns a todos.
    .replace(
      /<strong>12<\/strong>\s*<span>Meses de acesso<\/span>/,
      "<strong>Suporte</strong><span>Acesso ao professor</span>"
    )
    .replace(
      /<strong>Acesso anual<\/strong><span>Reveja\s+quando precisar\.<\/span>/,
      "<strong>Suporte do professor</strong><span>Tire suas dúvidas sempre que precisar.</span>"
    )
    // Evita que a âncora da oferta apareça na URL ao clicar nos CTAs.
    .replace(
      /if \(history\.replaceState\) \{\s*history\.replaceState\(null, '', '#oferta-mgu-pro'\);\s*\}/,
      ""
    )
    .replaceAll(REPAIR_CUE_TEXT, "Veja uma base de valores que você pode ganhar com reparos")
    .replace(
      "Reparos comuns feitos todos os dias na nossa empresa:",
      "Base de valores cobrados nos reparos mais comuns:"
    )

  html = replaceBetween(html, '<table class="repair-table">', "</table>", buildRepairTable(), true)

  const faq = buildFaqSections(faqArticles)
  if (faq.hasContent) {
    html = replaceBetween(html, '<div class="objection-main-grid">', '<div class="objection-more reveal">', faq.mainGrid)
    html = replaceBetween(html, '<div class="faq__list">', '<div class="objection-close reveal">', faq.accordion)
  }

  const totalLessons = curriculum.reduce((sum, course) => sum + course.lessons.length, 0)
  if (totalLessons > 0) {
    html = replaceBetween(
      html,
      '<div class="curriculum-modules curriculum-modules--full">',
      '<div class="curriculum-cta reveal">',
      buildCurriculumModules(curriculum)
    ).replace(/as \d+ aulas e conteúdos abaixo/, `as ${totalLessons.toLocaleString("pt-BR")} aulas e conteúdos abaixo`)
  }

  if (ctaTarget === "checkout") {
    html = html.replace(WHATSAPP_CTA_REGEX, `href="${GAME_DOCTOR_PLANS_URL}"`)
  }

  const { content, scripts } = splitHtmlAndScripts(html)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div dangerouslySetInnerHTML={{ __html: content }} />
      <Footer hideWhatsApp={ctaTarget === "checkout"} />
      <QuemSomosScripts scripts={scripts} />
      <QuemSomosTracking variant={ctaTarget} />
    </div>
  )
}
