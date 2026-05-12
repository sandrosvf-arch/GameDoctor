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

const rows: CourseRow[] = [
  { id: "free",    title: "Comece agora — totalmente gratis", subtitle: "Sem cadastro, sem cartao de credito", courses: [ps5[0], xbox[0], nintendo[0], basics[0]] },
  { id: "ps5",     title: "PlayStation 5",                    courses: ps5 },
  { id: "xbox",    title: "Xbox Series X|S",                  courses: xbox },
  { id: "switch",  title: "Nintendo Switch",                  courses: nintendo },
  { id: "basics",  title: "Fundamentos de Eletronica",        courses: basics },
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
  // Fetch active banners from DB; fall back to a static default if none exist
  const dbBanners = await db.heroBanner.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  })

  // Static fallback shown before any banner is created via admin
  const fallbackBanner = {
    id: "default",
    title: "A sua nova plataforma\nde manutenção\nde videogames",
    subtitle:
      "Assista aulas gravadas em 4K, acesse esquemas elétricos exclusivos, aprenda técnicas de solda BGA e diagnóstico avançado — do básico ao profissional.",
    badge: "Técnico de consoles profissional",
    videoUrl: "/hero-bg.mp4",
    imageUrl: null,
    ctaText: "Ver aulas grátis",
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
  }

  const banners = dbBanners.length > 0 ? dbBanners : [fallbackBanner]

  return (
    <>
      <Header />
      <main className="bg-zinc-950 text-white overflow-x-hidden">

        {/* HERO — rotating banner */}
        <HeroBannerClient banners={banners} />

        {/* CARROSSEIS */}
        <section className="pb-16 space-y-10 pt-2">
          {rows.map((row) => (
            <div key={row.id}>
              <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3">
                <h2 className="text-base md:text-[17px] font-bold text-white">{row.title}</h2>
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
                      className="group/card flex-shrink-0 w-[190px] sm:w-[220px] md:w-[245px] lg:w-[265px]"
                    >
                      <div className={cn(
                        "relative aspect-video rounded-lg overflow-hidden",
                        "transition-transform duration-200 ease-out",
                        "group-hover/card:scale-[1.04] group-hover/card:shadow-2xl group-hover/card:shadow-black/60",
                      )}>
                        {/* Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={course.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                        <div className="absolute inset-0 bg-zinc-950/25" />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150" />
                        {/* Play / lock on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
                          <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center">
                            {course.free
                              ? <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                              : <Lock className="h-4 w-4 text-white" />
                            }
                          </div>
                        </div>
                        {/* Badge */}
                        {course.badge && badgeStyle && badgeLabel && (
                          <span className={cn("absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider z-10", badgeStyle)}>
                            {badgeLabel}
                          </span>
                        )}
                        {/* Bottom title bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pt-7 pb-2">
                          <p className="text-[10px] font-bold text-white leading-tight line-clamp-1">{course.title}</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">{course.duration}</p>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-zinc-500 group-hover/card:text-zinc-200 transition-colors line-clamp-1 px-0.5">
                        {course.title}
                      </p>
                    </Link>
                  )
                })}

                <Link href="/cursos" className="group/more flex-shrink-0 w-[190px] sm:w-[220px] md:w-[245px] lg:w-[265px]">
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
          ))}
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
