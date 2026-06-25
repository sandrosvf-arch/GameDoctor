export const dynamic = "force-dynamic"

import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { HomePlansSection } from "@/components/home/HomePlansSection"
import { HomeFaqSection } from "@/components/home/HomeFaqSection"
import {
  type LucideIcon,
  Play,
  Gamepad2,
  Monitor,
  Cpu,
  Zap,
  Wrench,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { HeroBannerClient } from "@/components/HeroBannerClient"
import { TrailRowView } from "@/components/TrailRowView"
import { LazyMoreRows } from "@/components/LazyMoreRows"
import { fetchHomeRows, type HomeRowDto } from "@/lib/home-rows"
import { unstable_cache } from "next/cache"

// ── Server-side data cache (works even with force-dynamic) ─────────────────
const getCachedBanners = unstable_cache(
  () => db.heroBanner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ["home-banners"],
  { revalidate: 60 }
)

const getCachedHomeRows = unstable_cache(
  (skip: number, take: number) => fetchHomeRows(skip, take),
  ["home-rows"],
  { revalidate: 60 }
)

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type BadgeType = "FREE" | "NEW" | "PRO" | "PREMIUM"

interface CourseCard {
  id: string
  title: string
  duration: string
  badge?: BadgeType
  gradient: string
  iconColor: string
  Icon: LucideIcon
  free: boolean
  href: string
  thumbnail: string
}

interface CourseRow {
  id: string
  title: string
  platformBadge: string
  subtitle?: string
  courses: CourseCard[]
  courseSlug?: string
}

// â”€â”€ Badge styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const badgeStyles: Record<BadgeType, string> = {
  FREE:    "bg-emerald-500 text-white",
  NEW:     "bg-red-600 text-white",
  PRO:     "bg-cyan-500 text-zinc-900",
  PREMIUM: "bg-amber-500 text-zinc-900",
}

const badgeLabels: Record<BadgeType, string> = {
  FREE:    "GRÁTIS",
  NEW:     "NOVO",
  PRO:     "PRO",
  PREMIUM: "PREMIUM",
}

// â”€â”€ Course data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ps5: CourseCard[] = [
  { id: "ps5-diag",   title: "Diagnostico Completo PS5",     duration: "18 min",    badge: "FREE", gradient: "from-blue-950 via-blue-900 to-indigo-950",      iconColor: "text-blue-400",   Icon: Gamepad2, free: true,  href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t02.jpg" },
  { id: "ps5-pasta",  title: "Troca de Pasta Termica",       duration: "32 min",    badge: "NEW",  gradient: "from-blue-950 via-purple-950 to-blue-950",     iconColor: "text-purple-400", Icon: Wrench,   free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t03.jpg" },
  { id: "ps5-erro",   title: "Erro CE-108255 e CE-107891",   duration: "45 min",                   gradient: "from-slate-900 via-blue-950 to-slate-900",     iconColor: "text-blue-300",   Icon: Cpu,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t04.jpg" },
  { id: "ps5-leitor", title: "Troca do Leitor de Disco",     duration: "28 min",                   gradient: "from-blue-950 to-violet-950",                  iconColor: "text-violet-400", Icon: Wrench,   free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t05.jpg" },
  { id: "ps5-bga",    title: "Solda BGA no PS5",             duration: "1h 12min",  badge: "PRO",  gradient: "from-violet-950 via-purple-950 to-blue-950",   iconColor: "text-violet-300", Icon: Zap,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t06.jpg" },
  { id: "ps5-fonte",  title: "Reparo da Fonte PS5",          duration: "52 min",                   gradient: "from-indigo-950 to-blue-950",                  iconColor: "text-indigo-400", Icon: Cpu,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t07.jpg" },
]

const xbox: CourseCard[] = [
  { id: "xbox-diag",     title: "Diagnostico Xbox Series X",   duration: "22 min",  badge: "FREE", gradient: "from-green-950 via-emerald-950 to-green-950",  iconColor: "text-green-400",   Icon: Gamepad2, free: true,  href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t08.jpg" },
  { id: "xbox-hdmi",     title: "Troca Porta HDMI Xbox",       duration: "35 min",  badge: "NEW",  gradient: "from-emerald-950 to-teal-950",                 iconColor: "text-emerald-400", Icon: Monitor,  free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t09.jpg" },
  { id: "xbox-e101",     title: "Erro E101 / E102 Xbox",       duration: "40 min",                 gradient: "from-green-950 via-slate-900 to-green-950",    iconColor: "text-green-300",   Icon: Cpu,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t10.jpg" },
  { id: "xbox-series-s", title: "Desmontagem Xbox Series S",   duration: "18 min",                 gradient: "from-slate-800 to-green-950",                  iconColor: "text-slate-300",   Icon: Wrench,   free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t11.jpg" },
  { id: "xbox-bga",      title: "Solda BGA Xbox Series X",     duration: "58 min",  badge: "PRO",  gradient: "from-green-950 to-emerald-900",                iconColor: "text-emerald-300", Icon: Zap,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t12.jpg" },
]

const nintendo: CourseCard[] = [
  { id: "sw-joycon",  title: "Joy-Con Drift - Solucao",      duration: "15 min",    badge: "FREE", gradient: "from-red-950 via-rose-950 to-red-950",         iconColor: "text-red-400",   Icon: Gamepad2, free: true,  href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t13.jpg" },
  { id: "sw-tela",    title: "Troca da Tela Switch OLED",    duration: "38 min",    badge: "NEW",  gradient: "from-rose-950 to-pink-950",                    iconColor: "text-rose-400",  Icon: Monitor,  free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t14.jpg" },
  { id: "sw-imagem",  title: "Switch Sem Imagem",            duration: "42 min",                   gradient: "from-red-950 via-slate-900 to-red-950",        iconColor: "text-red-300",   Icon: Cpu,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t15.jpg" },
  { id: "sw-bga",     title: "Solda BGA Nintendo Switch",    duration: "1h 05min",  badge: "PRO",  gradient: "from-red-950 to-rose-900",                     iconColor: "text-rose-300",  Icon: Zap,      free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t16.jpg" },
  { id: "sw-limpeza", title: "Limpeza e Manutencao Switch",  duration: "20 min",                   gradient: "from-rose-950 via-red-950 to-slate-900",       iconColor: "text-rose-400",  Icon: Wrench,   free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t17.jpg" },
]

const basics: CourseCard[] = [
  { id: "basic-multi", title: "Uso do Multimetro",                    duration: "25 min",    badge: "FREE", gradient: "from-amber-950 via-orange-950 to-amber-950", iconColor: "text-amber-400",  Icon: Cpu,     free: true,  href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t18.jpg" },
  { id: "basic-solda", title: "Estacao de Solda - Primeiros Passos",  duration: "45 min",                   gradient: "from-orange-950 to-red-950",                 iconColor: "text-orange-400", Icon: Zap,     free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t19.jpg" },
  { id: "basic-comp",  title: "Identificando Componentes",            duration: "32 min",                   gradient: "from-amber-950 via-yellow-950 to-amber-950", iconColor: "text-yellow-400", Icon: Cpu,     free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t20.jpg" },
  { id: "basic-smd",   title: "Tecnicas de Solda SMD",                duration: "1h 20min",  badge: "PRO",  gradient: "from-orange-950 to-amber-900",               iconColor: "text-amber-300",  Icon: Zap,     free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t21.jpg" },
  { id: "basic-micro", title: "Como Usar o Microscopio",              duration: "28 min",                   gradient: "from-amber-950 via-slate-900 to-amber-950",  iconColor: "text-amber-400",  Icon: Monitor, free: false, href: "/aula/demo-lesson-ps5-01", thumbnail: "/thumbs/t01.jpg" },
]

const rowBrandColor: Record<string, string> = {
  ps5:        "#0070d1",
  xbox:       "#107c10",
  switch:     "#e4000f",
  primeiros:  "#f59e0b",
  basics:     "#7c3aed",
}

const getRowBrandColor = (rowId: string, rowTitle?: string): string => {
  if (rowBrandColor[rowId]) return rowBrandColor[rowId]

  const probe = `${rowId} ${rowTitle ?? ""}`.toLowerCase()
  if (probe.includes("xbox")) return rowBrandColor.xbox
  if (probe.includes("playstation") || probe.includes("ps5")) return rowBrandColor.ps5
  if (probe.includes("switch")) return rowBrandColor.switch
  if (probe.includes("jornada") || probe.includes("inicio")) return rowBrandColor.primeiros
  if (probe.includes("fundamentos") || probe.includes("eletronica")) return rowBrandColor.basics

  return "#00cfff"
}

const parseRgbCssColor = (value?: string | null): string | null => {
  if (!value) return null
  const raw = value.trim()
  const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  const plainRegex = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/
  const m = raw.match(rgbRegex) ?? raw.match(plainRegex)
  if (!m) return null
  const r = Number(m[1]); const g = Number(m[2]); const b = Number(m[3])
  const valid = [r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
  return valid ? `rgb(${r}, ${g}, ${b})` : null
}

const rgbToHex = (rgbString: string): string => {
  const match = rgbString.match(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i)
  if (!match) return rgbString
  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const rowPlatformBadge: Record<string, string> = {
  primeiros: "JORNADA",
  ps5: "PS5",
  xbox: "XBOX",
  switch: "SWITCH",
  basics: "ELETRONICA",
}

const primeiros: CourseCard[] = [
  { id: "prim-video", title: "Introdução", duration: "1 min 56 s", badge: "FREE", gradient: "from-amber-950 to-yellow-950", iconColor: "text-amber-400", Icon: Play, free: true, href: "/aula/bunny/09038255-7c3d-495b-8155-c71c7516a13e?titulo=Introdu%C3%A7%C3%A3o&legenda=In%C3%ADcio+da+Jornada", thumbnail: `https://vz-38444944-922.b-cdn.net/09038255-7c3d-495b-8155-c71c7516a13e/thumbnail.jpg` },
]

const rows: CourseRow[] = [
  { id: "primeiros", title: "Início da Jornada",         platformBadge: "GRÁTIS",     courses: primeiros, courseSlug: "inicio-da-jornada" },
  { id: "ps5",       title: "PlayStation 5",             platformBadge: "PS5",         courses: ps5, courseSlug: "playstation-5" },
  { id: "xbox",      title: "Xbox Series X|S",           platformBadge: "XBOX",        courses: xbox, courseSlug: "xbox-series-xs" },
  { id: "switch",    title: "Nintendo Switch",           platformBadge: "SWITCH",      courses: nintendo, courseSlug: "nintendo-switch" },
  { id: "basics",    title: "Fundamentos de Eletronica", platformBadge: "ELETRONICA",  courses: basics, courseSlug: "fundamentos-de-eletronica" },
]

const plans = [
  { name: "Basico",  price: "R$ 97",  period: "12 meses",  badge: undefined,      highlight: false, features: ["Curso principal completo", "Modulos essenciais", "Suporte por e-mail", "Acesso por 12 meses"] },
  { name: "Pro",     price: "R$ 197", period: "vitalicio", badge: "Mais popular", highlight: true,  features: ["Tudo do Basico", "Materiais complementares", "Certificado de conclusao", "Suporte prioritario", "Acesso vitalicio"] },
  { name: "Premium", price: "R$ 397", period: "vitalicio", badge: undefined,      highlight: false, features: ["Tudo do Pro", "Conteudo avancado", "Comunidade exclusiva", "Mentorias ao vivo", "Novos cursos incluidos"] },
]

const faqs = [
  { q: "Preciso ter experiencia previa?",     a: "Nao. Os cursos vao do basico ao avancado. Se voce sabe segurar uma chave de fenda, ja pode comecar." },
  { q: "Posso assistir antes de comprar?",    a: "Sim. Varias aulas tem previa gratuita - sem cadastro e sem cartao de credito." },
  { q: "O que e o acesso vitalicio?",         a: "Uma vez comprado, o acesso nao expira. Atualizações e novos modulos sao incluidos automaticamente." },
  { q: "Quais ferramentas sao necessarias?",  a: "Cada curso lista suas ferramentas. Em geral: chaves de precisao, estacao de solda e multimetro cobrem 90% dos procedimentos." },
  { q: "Aceita Pix ou apenas cartao?",        a: "Aceitamos Pix (aprovacao instantanea) e cartao de credito em ate 12x." },
]

const HOME_SECTION_FLAGS = {
  showPlans: false,
  showFaq: false,
} as const

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default async function HomePage() {
  // Phase 1 – independent queries run in parallel (cached banners, session, cached rows)
  const [dbBanners, session, homeRowsResult] = await Promise.all([
    getCachedBanners().catch(() => [] as Awaited<ReturnType<typeof db.heroBanner.findMany>>),
    auth().catch(() => null),
    getCachedHomeRows(0, 2).catch(() => ({ rows: [] as HomeRowDto[], total: 0 })),
  ])

  let initialHomeRows = homeRowsResult.rows
  let totalDbRows = homeRowsResult.total

  // Static fallback shown before any banner is created via admin
  const fallbackBanners = [
    {
      id: "default-1",
      title: "Sua plataforma completa de manutenção de videogames",
      subtitle:
        "Aulas em 4K, esquemas elétricos exclusivos, técnicas de solda BGA e diagnósticos avançados, do básico ao profissional.",
      badge: "TÉCNICO DE MANUTENÇÃO EM VIDEOGAMES",
      videoUrl: "https://vz-38444944-922.b-cdn.net/67b73495-a6be-46e2-8fd8-e3338e929cc1/play_720p.mp4",
      imageUrl: null,
      ctaText: "Ver Aulas",
      ctaHref: "/cursos",
      secondaryCtaText: "Ver planos",
      secondaryCtaHref: "/planos",
      consoles: ["PlayStation 5", "PlayStation 4", "Xbox Series X|S", "Xbox One", "Nintendo Switch", "Switch OLED"],
    },
    {
      id: "default-2",
      title: "Solda BGA do zero ao profissional",
      subtitle:
        "Aprenda as técnicas avançadas de micro-soldagem usadas em bancadas profissionais de todo o Brasil.",
      badge: "CURSO EM DESTAQUE",
      videoUrl: "https://vz-38444944-922.b-cdn.net/67b73495-a6be-46e2-8fd8-e3338e929cc1/play_720p.mp4",
      imageUrl: null,
      ctaText: "Ver Aulas",
      ctaHref: "/aula/demo-lesson-ps5-01",
      secondaryCtaText: "Todos os cursos",
      secondaryCtaHref: "/cursos",
      consoles: ["PlayStation 5", "Xbox Series X|S", "Nintendo Switch"],
    },
  ]

  const banners = dbBanners.length > 0 ? dbBanners : fallbackBanners

  // ── "Continue assistindo" row ──────────────────────────────────────────
  let continueWatchingCourses: CourseCard[] = ps5
  let continueWatchingTitle = "PlayStation 5"
  let isLoggedIn = false

  // Phase 2 – progress query depends on session from Phase 1
  try {
    if (session?.user?.id) {
      isLoggedIn = true
      const recentProgress = await db.lessonProgress.findMany({
        where: { userId: session.user.id },
        orderBy: { lastWatchedAt: "desc" },
        take: 8,
        include: {
          lesson: { select: { id: true, title: true, durationSeconds: true, thumbnail: true, isFree: true, courseId: true } },
          course: { select: { id: true, title: true, slug: true } },
        },
      })
      if (recentProgress.length > 0) {
        continueWatchingTitle = "Continue assistindo"
        continueWatchingCourses = recentProgress.map((p) => {
          const dur = p.lesson.durationSeconds
          const durStr = dur ? (dur >= 3600 ? `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60)}min` : `${Math.floor(dur / 60)} min`) : ""
          return {
            id: p.lessonId,
            title: p.lesson.title,
            duration: durStr,
            gradient: "from-zinc-900 to-zinc-800",
            iconColor: "text-cyan-400",
            Icon: Play,
            free: p.lesson.isFree,
            href: `/aula/${p.lessonId}`,
            thumbnail: p.lesson.thumbnail ?? "/thumbs/t01.jpg",
          }
        })
      } else {
        continueWatchingTitle = "Comece pelo PlayStation 5"
      }
    }
  } catch {
    // DB unreachable or unauthenticated
  }

  const continueHomeRow: HomeRowDto | null =
    isLoggedIn && continueWatchingTitle === "Continue assistindo"
      ? {
          id: "continue",
          title: "Continue assistindo",
          platformBadge: "CONTINUAR",
          courseSlug: "",
          brandColor: "#00cfff",
          badgeTextColor: "#ffffff",
          badgeLabel: null,
          cards: continueWatchingCourses.map((c) => ({
            id: c.id,
            title: c.title,
            duration: c.duration,
            isFree: c.free,
            href: c.href,
            thumbnail: c.thumbnail,
          })),
        }
      : null

  // Static fallback rows (shown when DB is unreachable)
  const staticHomeRows: HomeRowDto[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    platformBadge: row.platformBadge,
    courseSlug: row.courseSlug ?? "",
    brandColor: getRowBrandColor(row.id, row.title),
    badgeTextColor: "#ffffff",
    badgeLabel: null,
    cards: row.courses.map((c) => ({
      id: c.id,
      title: c.title,
      duration: c.duration,
      isFree: c.free,
      href: c.href,
      thumbnail: c.thumbnail,
    })),
  }))

  return (
    <>
      <Header />
      <main className="bg-zinc-950 text-white overflow-x-hidden">

        {/* HERO – rotating banner */}
        <HeroBannerClient banners={banners} />

        {/* CARROSSÉIS */}
        <section className="pb-16 space-y-10 pt-2">
          {initialHomeRows.length > 0 || continueHomeRow ? (
            <>
              {[...(continueHomeRow ? [continueHomeRow] : []), ...initialHomeRows].map((row) => (
                <TrailRowView key={row.id} row={row} />
              ))}
              <LazyMoreRows skipCount={initialHomeRows.length} total={totalDbRows} />
            </>
          ) : (
            staticHomeRows.map((row) => <TrailRowView key={row.id} row={row} />)
          )}
        </section>

        {HOME_SECTION_FLAGS.showPlans && <HomePlansSection plans={plans} />}
        {HOME_SECTION_FLAGS.showFaq && <HomeFaqSection faqs={faqs} />}

      </main>
      <Footer />
    </>
  )
}
