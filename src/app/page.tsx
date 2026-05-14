export const dynamic = "force-dynamic"

import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  type LucideIcon,
  Play,
  Lock,
  Gamepad2,
  Monitor,
  Cpu,
  Zap,
  Wrench,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { HeroBannerClient } from "@/components/HeroBannerClient"

// ── Types ──────────────────────────────────────────────────────────────────
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
  subtitle?: string
  courses: CourseCard[]
}

// ── Badge styles ─────────────────────────────────────────────────────────
const badgeStyles: Record<BadgeType, string> = {
  FREE:    "bg-emerald-500 text-white",
  NEW:     "bg-red-600 text-white",
  PRO:     "bg-cyan-500 text-zinc-900",
  PREMIUM: "bg-amber-500 text-zinc-900",
}

const badgeLabels: Record<BadgeType, string> = {
  FREE:    "GRATIS",
  NEW:     "NOVO",
  PRO:     "PRO",
  PREMIUM: "PREMIUM",
}

// ── Course data ──────────────────────────────────────────────────────────
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
}

const primeiros: CourseCard[] = [
  { id: "prim-video", title: "Introdução", duration: "1 min 56 s", badge: "FREE", gradient: "from-amber-950 to-yellow-950", iconColor: "text-amber-400", Icon: Play, free: true, href: "/aula/bunny/09038255-7c3d-495b-8155-c71c7516a13e?titulo=Introdu%C3%A7%C3%A3o&legenda=In%C3%ADcio+da+Jornada", thumbnail: `https://vz-38444944-922.b-cdn.net/09038255-7c3d-495b-8155-c71c7516a13e/thumbnail.jpg` },
]

const rows: CourseRow[] = [
  { id: "primeiros", title: "Início da Jornada",         courses: primeiros },
  { id: "ps5",       title: "PlayStation 5",            courses: ps5 },
  { id: "xbox",      title: "Xbox Series X|S",           courses: xbox },
  { id: "switch",    title: "Nintendo Switch",           courses: nintendo },
  { id: "basics",    title: "Fundamentos de Eletronica", courses: basics },
]

const plans = [
  { name: "Basico",  price: "R$ 97",  period: "12 meses",  badge: undefined,      highlight: false, features: ["Curso principal completo", "Modulos essenciais", "Suporte por e-mail", "Acesso por 12 meses"] },
  { name: "Pro",     price: "R$ 197", period: "vitalicio", badge: "Mais popular", highlight: true,  features: ["Tudo do Basico", "Materiais complementares", "Certificado de conclusao", "Suporte prioritario", "Acesso vitalicio"] },
  { name: "Premium", price: "R$ 397", period: "vitalicio", badge: undefined,      highlight: false, features: ["Tudo do Pro", "Conteudo avancado", "Comunidade exclusiva", "Mentorias ao vivo", "Novos cursos incluidos"] },
]

const faqs = [
  { q: "Preciso ter experiencia previa?",     a: "Nao. Os cursos vao do basico ao avancado. Se voce sabe segurar uma chave de fenda, ja pode comecar." },
  { q: "Posso assistir antes de comprar?",    a: "Sim. Varias aulas tem previa gratuita — sem cadastro e sem cartao de credito." },
  { q: "O que e o acesso vitalicio?",         a: "Uma vez comprado, o acesso nao expira. Atualizacoes e novos modulos sao incluidos automaticamente." },
  { q: "Quais ferramentas sao necessarias?",  a: "Cada curso lista suas ferramentas. Em geral: chaves de precisao, estacao de solda e multimetro cobrem 90% dos procedimentos." },
  { q: "Aceita Pix ou apenas cartao?",        a: "Aceitamos Pix (aprovacao instantanea) e cartao de credito em ate 12x." },
]

// ═══════════════════════════════════════════════════════════════════════════
export default async function HomePage() {
  // Fetch active banners from DB; fall back to a static default if none exist or DB unreachable
  let dbBanners: Awaited<ReturnType<typeof db.heroBanner.findMany>> = []
  try {
    dbBanners = await db.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    })
  } catch {
    // fallback to static banners
  }

  // Static fallback shown before any banner is created via admin
  const fallbackBanners = [
    {
      id: "default-1",
      title: "Sua plataforma completa de manutenção de videogames",
      subtitle:
        "Aulas em 4K, esquemas elétricos exclusivos, técnicas de solda BGA e diagnósticos avançados, do básico ao profissional.",
      badge: "TÉCNICO DE MANUTENÇÕES EM VIDEOGAMES",
      videoUrl: "https://vz-38444944-922.b-cdn.net/67b73495-a6be-46e2-8fd8-e3338e929cc1/play_720p.mp4",
      imageUrl: null,
      ctaText: "Ver Aulas",
      ctaHref: "/cursos",
      secondaryCtaText: "Ver planos",
      secondaryCtaHref: "/planos",
      consoles: [
        "PlayStation 5",
        "PlayStation 4",
        "Xbox Series X|S",
        "Xbox One",
        "Nintendo Switch",
        "Switch OLED",
      ],
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
      consoles: [
        "PlayStation 5",
        "Xbox Series X|S",
        "Nintendo Switch",
      ],
    },
  ]

  const banners = dbBanners.length > 0 ? dbBanners : fallbackBanners

  // ── "Continue assistindo" row ──────────────────────────────────────────
  // Logged-in users: last watched lessons from DB. Fallback: PS5 courses.
  let continueWatchingCourses: CourseCard[] = ps5
  let continueWatchingTitle = "PlayStation 5"
  let isLoggedIn = false

  try {
    const session = await auth()
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
    // DB unreachable or unauthenticated — use PS5 fallback
  }

  const continueRow: CourseRow | null = isLoggedIn && continueWatchingTitle === "Continue assistindo"
    ? { id: "continue", title: "Continue assistindo", courses: continueWatchingCourses }
    : null

  // ── Course order + lessons from DB ───────────────────────────────────────
  // Map static row id → DB slug
  const rowSlugMap: Record<string, string> = {
    primeiros: "inicio-da-jornada",
    ps5:       "playstation-5",
    xbox:      "xbox-series-xs",
    switch:    "nintendo-switch",
    basics:    "fundamentos-de-eletronica",
  }

  // Row brand colors and default gradients per row id
  const rowGradients: Record<string, string> = {
    primeiros: "from-amber-950 to-yellow-950",
    ps5:       "from-blue-950 via-blue-900 to-indigo-950",
    xbox:      "from-green-950 via-emerald-950 to-green-950",
    switch:    "from-red-950 via-rose-950 to-red-950",
    basics:    "from-amber-950 via-orange-950 to-amber-950",
  }
  const rowIconColors: Record<string, string> = {
    primeiros: "text-amber-400",
    ps5:       "text-blue-400",
    xbox:      "text-green-400",
    switch:    "text-red-400",
    basics:    "text-amber-400",
  }

  let orderedRows = rows
  try {
    const dbCourses = await db.course.findMany({
      where: { slug: { in: Object.values(rowSlugMap) } },
      select: {
        slug: true,
        displayOrder: true,
        lessons: {
          where: { moduleId: null },
          orderBy: { order: "asc" },
          select: {
            id: true, title: true, description: true,
            durationSeconds: true, videoDurationSeconds: true,
            videoProviderId: true, videoThumbnailUrl: true, thumbnail: true,
            isFree: true, status: true,
          },
        },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true, title: true, description: true,
                durationSeconds: true, videoDurationSeconds: true,
                videoProviderId: true, videoThumbnailUrl: true, thumbnail: true,
                isFree: true, status: true,
              },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    })

    // Build slug → row id map (reverse of rowSlugMap)
    const slugToRowId = Object.fromEntries(Object.entries(rowSlugMap).map(([k, v]) => [v, k]))
    const BUNNY_CDN = "vz-38444944-922.b-cdn.net"

    const dbRows: CourseRow[] = dbCourses.map(course => {
      const rowId = slugToRowId[course.slug] ?? course.slug
      const allLessons = [
        ...course.lessons,
        ...course.modules.flatMap(m => m.lessons),
      ]
      const cards: CourseCard[] = allLessons.map(l => {
        const dur = l.videoDurationSeconds ?? l.durationSeconds
        const durStr = dur
          ? dur >= 3600
            ? `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60)}min`
            : `${Math.floor(dur / 60)} min`
          : ""
        const href = l.videoProviderId
          ? `/aula/bunny/${l.videoProviderId}?titulo=${encodeURIComponent(l.title)}${l.description ? `&legenda=${encodeURIComponent(l.description)}` : ""}`
          : `/aula/${l.id}`
        const thumbnail = l.thumbnail
          ?? (l.videoProviderId ? `https://${BUNNY_CDN}/${l.videoProviderId}/thumbnail.jpg` : null)
          ?? l.videoThumbnailUrl
          ?? "/thumbs/t01.jpg"
        return {
          id: l.id,
          title: l.title,
          duration: durStr,
          badge: l.isFree ? "FREE" as BadgeType : undefined,
          gradient: rowGradients[rowId] ?? "from-zinc-900 to-zinc-800",
          iconColor: rowIconColors[rowId] ?? "text-zinc-400",
          Icon: Play,
          free: l.isFree,
          href,
          thumbnail,
        }
      })

      // Find the original static row to keep its title
      const staticRow = rows.find(r => r.id === rowId)
      return {
        id: rowId,
        title: staticRow?.title ?? course.slug,
        courses: cards.length > 0 ? cards : (staticRow?.courses ?? []),
      }
    })

    // Sort by displayOrder and fill in any rows missing from DB with static fallback
    const dbRowIds = new Set(dbRows.map(r => r.id))
    const fallbackRows = rows.filter(r => !dbRowIds.has(r.id))
    const allRows = [...dbRows, ...fallbackRows]

    // Re-sort by DB displayOrder
    const slugToOrder = Object.fromEntries(dbCourses.map(c => [slugToRowId[c.slug], c.displayOrder]))
    orderedRows = allRows.sort((a, b) => {
      const oa = slugToOrder[a.id] ?? 99
      const ob = slugToOrder[b.id] ?? 99
      return oa - ob
    })
  } catch {
    // fallback to static lessons
  }

  return (
    <>
      <Header />
      <main className="bg-zinc-950 text-white overflow-x-hidden">

        {/* HERO — rotating banner */}
        <HeroBannerClient banners={banners} />

        {/* CARROSSEIS */}
        <section className="pb-16 space-y-10 pt-2">
          {[...(continueRow ? [continueRow] : []), ...orderedRows].map((row) => {
            const neonColor = rowBrandColor[row.id] ?? (row.id === "continue" ? "#00cfff" : null)
            return (
            <div key={row.id} className="relative">
              <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3">
                {/* Soft neon glow on left edge — no hard bar */}
                {neonColor && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[28px] h-[40%] pointer-events-none rounded-full"
                    style={{
                      background: neonColor,
                      filter: "blur(28px)",
                      opacity: 0.75,
                    }}
                  />
                )}
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
                  {row.id === "continue" && (
                    <span className="inline-block w-2 h-6 rounded-full bg-cyan-400 shrink-0" />
                  )}
                  {rowBrandColor[row.id] && (
                    <span
                      className="inline-block w-2 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: rowBrandColor[row.id], filter: "brightness(1.4) saturate(1.6)" }}
                    />
                  )}
                  {row.title}
                </h2>
                {row.subtitle && (
                  <span className="text-xs text-zinc-600 hidden sm:block">{row.subtitle}</span>
                )}
                <Link href="/cursos" className="ml-auto text-xs text-cyan-600 hover:text-cyan-400 flex items-center gap-0.5 whitespace-nowrap transition-colors">
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-8 lg:px-14 pb-3">
                {row.courses.map((course) => {
                  const badgeStyle = course.badge ? badgeStyles[course.badge] : null
                  const badgeLabel = course.badge ? badgeLabels[course.badge] : null
                  return (
                    <Link
                      key={course.id}
                      href={course.href}
                      className="group/card flex-shrink-0 w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px]"
                    >
                      <div
                        className={cn(
                          "relative aspect-video rounded-2xl overflow-hidden border border-zinc-800/50",
                          "transition-all duration-200 ease-out",
                          "group-hover/card:scale-[1.03] group-hover/card:shadow-xl group-hover/card:shadow-cyan-500/10 group-hover/card:border-zinc-700",
                        )}
                      >
                        {/* Thumbnail — full cover, high quality */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={course.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                        
                        {/* Subtle overlay for text legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        
                        {/* Left neon accent line — heartbeat-inspired */}
                        {neonColor && (
                          <div
                            className="absolute top-0 left-0 bottom-0 w-1 z-10 opacity-80"
                            style={{ background: `linear-gradient(to bottom, ${neonColor}, ${neonColor}66, transparent)` }}
                          />
                        )}
                        
                        {/* Badge — top-left, prominent */}
                        {course.badge && badgeStyle && badgeLabel && (
                          <span className={cn(
                            "absolute top-3 left-3 text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider z-20",
                            "drop-shadow-lg",
                            badgeStyle
                          )}>
                            {badgeLabel}
                          </span>
                        )}
                        
                        {/* Hover overlay with play/lock icon */}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
                          <div className="h-12 w-12 rounded-full bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center">
                            {course.free
                              ? <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                              : <Lock className="h-5 w-5 text-white" />
                            }
                          </div>
                        </div>
                        
                        {/* Bottom content — title hierarchy: image → title → duration */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-3 space-y-1.5">
                          {/* Title — bold, large, limited to 2 lines */}
                          <p className="text-[16px] sm:text-[17px] font-black text-white leading-tight line-clamp-2">
                            {course.title}
                          </p>
                          {/* Duration — smaller, secondary */}
                          <p className="text-[12px] sm:text-[13px] text-zinc-300 font-medium">
                            {course.duration}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}

                <Link href="/cursos" className="group/more flex-shrink-0 w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px]">
                  <div className="aspect-video rounded-lg border border-zinc-800 bg-zinc-900/40 group-hover/more:bg-zinc-800/60 transition-colors flex flex-col items-center justify-center gap-2">
                    <div className="h-9 w-9 rounded-full border border-zinc-700 group-hover/more:border-zinc-500 flex items-center justify-center transition-colors">
                      <ChevronRight className="h-5 w-5 text-zinc-600 group-hover/more:text-zinc-300 transition-colors" />
                    </div>
                    <span className="text-[11px] text-zinc-600 group-hover/more:text-zinc-300 transition-colors font-medium">
                      Ver todos
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          )})}
        </section>

        {/* PLANOS */}
        <section id="planos" className="py-20 border-t border-zinc-900">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black mb-3">Escolha seu plano</h2>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Comece com as aulas gratuitas. Faca upgrade quando estiver pronto.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "relative rounded-2xl border p-7 flex flex-col",
                    plan.highlight
                      ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/8 to-transparent shadow-xl shadow-cyan-500/10"
                      : "border-zinc-800 bg-zinc-900/40",
                  )}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-zinc-950 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-3xl font-black">{plan.price}</span>
                  </div>
                  <p className="text-xs text-zinc-600 mb-6">acesso por {plan.period}</p>
                  <ul className="space-y-2.5 flex-1 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                        <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="sm"
                    className={plan.highlight
                      ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-bold"
                      : "bg-zinc-800 text-white hover:bg-zinc-700"
                    }
                  >
                    <Link href="/planos">Comecar com {plan.name}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="suporte" className="py-20 border-t border-zinc-900">
          <div className="container max-w-2xl">
            <h2 className="text-2xl font-black text-center mb-8">Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5"
                >
                  <AccordionTrigger className="text-sm font-medium text-zinc-300 hover:text-white hover:no-underline py-4 text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-zinc-500 pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
