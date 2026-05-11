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
  Info,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────
type BadgeType = "GRÁTIS" | "NOVO" | "PRO" | "PREMIUM"

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
}

interface CourseRow {
  id: string
  title: string
  subtitle?: string
  courses: CourseCard[]
}

// ── Badge styles ─────────────────────────────────────────────────────────
const badgeStyles: Record<BadgeType, string> = {
  "GRÁTIS":  "bg-emerald-500 text-white",
  "NOVO":    "bg-red-600 text-white",
  "PRO":     "bg-cyan-500 text-zinc-900",
  "PREMIUM": "bg-amber-500 text-zinc-900",
}

// ── Course data ──────────────────────────────────────────────────────────
const ps5: CourseCard[] = [
  { id: "ps5-diag",   title: "Diagnóstico Completo PS5",     duration: "18 min",    badge: "GRÁTIS", gradient: "from-blue-950 via-blue-900 to-indigo-950",      iconColor: "text-blue-400",   Icon: Gamepad2, free: true,  href: "/cursos" },
  { id: "ps5-pasta",  title: "Troca de Pasta Térmica",       duration: "32 min",    badge: "NOVO",   gradient: "from-blue-950 via-purple-950 to-blue-950",     iconColor: "text-purple-400", Icon: Wrench,   free: false, href: "/planos" },
  { id: "ps5-erro",   title: "Erro CE-108255 e CE-107891",   duration: "45 min",              gradient: "from-slate-900 via-blue-950 to-slate-900",     iconColor: "text-blue-300",   Icon: Cpu,      free: false, href: "/planos" },
  { id: "ps5-leitor", title: "Troca do Leitor de Disco",     duration: "28 min",              gradient: "from-blue-950 to-violet-950",                  iconColor: "text-violet-400", Icon: Wrench,   free: false, href: "/planos" },
  { id: "ps5-bga",    title: "Solda BGA no PS5",             duration: "1h 12min",  badge: "PRO",    gradient: "from-violet-950 via-purple-950 to-blue-950",   iconColor: "text-violet-300", Icon: Zap,      free: false, href: "/planos" },
  { id: "ps5-fonte",  title: "Reparo da Fonte PS5",          duration: "52 min",              gradient: "from-indigo-950 to-blue-950",                  iconColor: "text-indigo-400", Icon: Cpu,      free: false, href: "/planos" },
]

const xbox: CourseCard[] = [
  { id: "xbox-diag",     title: "Diagnóstico Xbox Series X",   duration: "22 min",   badge: "GRÁTIS", gradient: "from-green-950 via-emerald-950 to-green-950",  iconColor: "text-green-400",   Icon: Gamepad2, free: true,  href: "/cursos" },
  { id: "xbox-hdmi",     title: "Troca Porta HDMI Xbox",       duration: "35 min",   badge: "NOVO",   gradient: "from-emerald-950 to-teal-950",                 iconColor: "text-emerald-400", Icon: Monitor,  free: false, href: "/planos" },
  { id: "xbox-e101",     title: "Erro E101 / E102 Xbox",       duration: "40 min",             gradient: "from-green-950 via-slate-900 to-green-950",    iconColor: "text-green-300",   Icon: Cpu,      free: false, href: "/planos" },
  { id: "xbox-series-s", title: "Desmontagem Xbox Series S",   duration: "18 min",             gradient: "from-slate-800 to-green-950",                  iconColor: "text-slate-300",   Icon: Wrench,   free: false, href: "/planos" },
  { id: "xbox-bga",      title: "Solda BGA Xbox Series X",     duration: "58 min",   badge: "PRO",    gradient: "from-green-950 to-emerald-900",                iconColor: "text-emerald-300", Icon: Zap,      free: false, href: "/planos" },
]

const nintendo: CourseCard[] = [
  { id: "sw-joycon",  title: "Joy-Con Drift — Solução",      duration: "15 min",   badge: "GRÁTIS", gradient: "from-red-950 via-rose-950 to-red-950",         iconColor: "text-red-400",   Icon: Gamepad2, free: true,  href: "/cursos" },
  { id: "sw-tela",    title: "Troca da Tela Switch OLED",    duration: "38 min",   badge: "NOVO",   gradient: "from-rose-950 to-pink-950",                    iconColor: "text-rose-400",  Icon: Monitor,  free: false, href: "/planos" },
  { id: "sw-imagem",  title: "Switch Sem Imagem",            duration: "42 min",             gradient: "from-red-950 via-slate-900 to-red-950",        iconColor: "text-red-300",   Icon: Cpu,      free: false, href: "/planos" },
  { id: "sw-bga",     title: "Solda BGA Nintendo Switch",    duration: "1h 05min", badge: "PRO",    gradient: "from-red-950 to-rose-900",                     iconColor: "text-rose-300",  Icon: Zap,      free: false, href: "/planos" },
  { id: "sw-limpeza", title: "Limpeza e Manutenção Switch",  duration: "20 min",             gradient: "from-rose-950 via-red-950 to-slate-900",       iconColor: "text-rose-400",  Icon: Wrench,   free: false, href: "/planos" },
]

const basics: CourseCard[] = [
  { id: "basic-multi", title: "Uso do Multímetro",                       duration: "25 min",   badge: "GRÁTIS", gradient: "from-amber-950 via-orange-950 to-amber-950", iconColor: "text-amber-400",  Icon: Cpu,     free: true,  href: "/cursos" },
  { id: "basic-solda", title: "Estação de Solda — Primeiros Passos",     duration: "45 min",             gradient: "from-orange-950 to-red-950",                iconColor: "text-orange-400", Icon: Zap,     free: false, href: "/planos" },
  { id: "basic-comp",  title: "Identificando Componentes",               duration: "32 min",             gradient: "from-amber-950 via-yellow-950 to-amber-950",iconColor: "text-yellow-400", Icon: Cpu,     free: false, href: "/planos" },
  { id: "basic-smd",   title: "Técnicas de Solda SMD",                   duration: "1h 20min", badge: "PRO",    gradient: "from-orange-950 to-amber-900",              iconColor: "text-amber-300",  Icon: Zap,     free: false, href: "/planos" },
  { id: "basic-micro", title: "Como Usar o Microscópio",                 duration: "28 min",             gradient: "from-amber-950 via-slate-900 to-amber-950", iconColor: "text-amber-400",  Icon: Monitor, free: false, href: "/planos" },
]

const rows: CourseRow[] = [
  { id: "free",    title: "Comece agora — totalmente grátis", subtitle: "Sem cadastro, sem cartão de crédito", courses: [ps5[0], xbox[0], nintendo[0], basics[0]] },
  { id: "ps5",     title: "PlayStation 5",                   courses: ps5 },
  { id: "xbox",    title: "Xbox Series X|S",                 courses: xbox },
  { id: "switch",  title: "Nintendo Switch",                 courses: nintendo },
  { id: "basics",  title: "Fundamentos de Eletrônica",       courses: basics },
]

// ── Plans ────────────────────────────────────────────────────────────────
const plans = [
  { name: "Básico",   price: "R$ 97",  period: "12 meses",   badge: undefined,      highlight: false, features: ["Curso principal completo", "Módulos essenciais", "Suporte por e-mail", "Acesso por 12 meses"] },
  { name: "Pro",      price: "R$ 197", period: "vitalício",  badge: "Mais popular", highlight: true,  features: ["Tudo do Básico", "Materiais complementares", "Certificado de conclusão", "Suporte prioritário", "Acesso vitalício"] },
  { name: "Premium",  price: "R$ 397", period: "vitalício",  badge: undefined,      highlight: false, features: ["Tudo do Pro", "Conteúdo avançado", "Comunidade exclusiva", "Mentorias ao vivo", "Novos cursos incluídos"] },
]

// ── FAQ ──────────────────────────────────────────────────────────────────
const faqs = [
  { q: "Preciso ter experiência prévia?",           a: "Não. Os cursos vão do básico ao avançado. Se você sabe segurar uma chave de fenda, já pode começar." },
  { q: "Posso assistir antes de comprar?",          a: "Sim. Várias aulas têm prévia gratuita — sem cadastro e sem cartão de crédito." },
  { q: "O que é o acesso vitalício?",               a: "Uma vez comprado, o acesso não expira. Atualizações e novos módulos são incluídos automaticamente." },
  { q: "Quais ferramentas são necessárias?",        a: "Cada curso lista suas ferramentas. Em geral: chaves de precisão, estação de solda e multímetro cobrem 90% dos procedimentos." },
  { q: "Aceita Pix ou apenas cartão?",              a: "Aceitamos Pix (aprovação instantânea) e cartão de crédito em até 12x." },
]

// ═══════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  return (
    <>
      <Header />
      <main className="bg-zinc-950 text-white overflow-x-hidden">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[92vh] flex items-center overflow-hidden">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[15%] top-[15%] h-[600px] w-[600px] rounded-full bg-blue-600/12 blur-[120px]" />
            <div className="absolute left-[25%] bottom-[15%] h-[350px] w-[350px] rounded-full bg-cyan-500/8 blur-[90px]" />
            <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
          </div>
          {/* Bottom fade into carousels */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent z-10" />

          <div className="container relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center py-24 lg:py-0 lg:min-h-[92vh]">
            {/* Left — metadata */}
            <div className="lg:col-span-3 space-y-7">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 rounded-full">
                <Gamepad2 className="h-3.5 w-3.5" />
                Em destaque
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.92]">
                Diagnóstico<br />
                <span className="text-cyan-400">Completo</span><br />
                <span className="text-zinc-400 text-4xl md:text-5xl font-bold">PlayStation 5</span>
              </h1>

              <p className="text-zinc-400 leading-relaxed max-w-md">
                Aprenda a identificar e resolver qualquer falha no PS5 — da inicialização à placa-mãe — com bancada real e passo a passo completo.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold h-12 px-7" asChild>
                  <Link href="/cursos">
                    <Play className="mr-2 h-4 w-4 fill-zinc-950" />
                    Assistir prévia
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" className="border border-zinc-700 hover:bg-white/8 text-zinc-200 h-12 px-7" asChild>
                  <Link href="/planos">
                    <Info className="mr-2 h-4 w-4" />
                    Ver planos
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wide">Grátis</span>
                <span>•</span>
                <span>18 minutos</span>
                <span>•</span>
                <span>PlayStation 5</span>
                <span>•</span>
                <span>Aula 1 de 8</span>
              </div>
            </div>

            {/* Right — featured course mockup */}
            <div className="hidden lg:block lg:col-span-2">
              <div className="relative">
                {/* Glow halo */}
                <div className="absolute -inset-6 bg-blue-600/15 blur-3xl rounded-3xl" />
                <div className="relative rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl shadow-black/60">
                  {/* Video area */}
                  <div className="aspect-video bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 relative">
                    <Gamepad2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 text-blue-900" />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-white/12 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                        <Play className="h-7 w-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                    {/* Bottom bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 pt-8 pb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Aula 1 de 8</p>
                          <p className="text-sm font-semibold text-white">Diagnóstico Completo PS5</p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">Grátis</span>
                      </div>
                      <div className="h-[2px] bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 w-0 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* "A seguir" row */}
                  <div className="bg-zinc-900 px-4 py-3 flex items-center gap-3">
                    <div className="h-14 w-24 rounded-md bg-gradient-to-br from-blue-950 to-violet-950 flex-shrink-0 flex items-center justify-center">
                      <Cpu className="h-6 w-6 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">A seguir</p>
                      <p className="text-xs font-medium text-zinc-300 truncate">Troca de Pasta Térmica PS5</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">32 min</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── COURSE CAROUSELS ─────────────────────────────────────────── */}
        <section className="pb-16 space-y-10 pt-2">
          {rows.map((row) => (
            <div key={row.id}>
              {/* Row header */}
              <div className="px-4 md:px-8 lg:px-14 mb-3 flex items-baseline gap-3">
                <h2 className="text-base md:text-[17px] font-bold text-white">{row.title}</h2>
                {row.subtitle && (
                  <span className="text-xs text-zinc-600 hidden sm:block">{row.subtitle}</span>
                )}
                <Link href="/cursos" className="ml-auto text-xs text-cyan-600 hover:text-cyan-400 flex items-center gap-0.5 whitespace-nowrap transition-colors">
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Horizontal scroll */}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-8 lg:px-14 pb-3">
                {row.courses.map((course) => {
                  const Icon = course.Icon
                  const badgeStyle = course.badge ? badgeStyles[course.badge] : null
                  return (
                    <Link
                      key={course.id}
                      href={course.href}
                      className="group/card flex-shrink-0 w-[190px] sm:w-[220px] md:w-[245px] lg:w-[265px]"
                    >
                      {/* Thumbnail */}
                      <div
                        className={cn(
                          "relative aspect-video rounded-lg overflow-hidden",
                          "transition-transform duration-200 ease-out",
                          "group-hover/card:scale-[1.04] group-hover/card:shadow-2xl group-hover/card:shadow-black/60",
                        )}
                      >
                        <div className={cn("absolute inset-0 bg-gradient-to-br", course.gradient)} />
                        {/* Big background icon */}
                        <Icon className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 opacity-20", course.iconColor)} />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150" />
                        {/* Play / Lock button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-150">
                          <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center">
                            {course.free
                              ? <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                              : <Lock className="h-4 w-4 text-white" />
                            }
                          </div>
                        </div>
                        {/* Badge */}
                        {course.badge && badgeStyle && (
                          <span className={cn("absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider", badgeStyle)}>
                            {course.badge}
                          </span>
                        )}
                        {/* Duration */}
                        <span className="absolute bottom-1.5 right-1.5 text-[9px] text-zinc-400 bg-black/70 px-1.5 py-0.5 rounded">
                          {course.duration}
                        </span>
                      </div>
                      {/* Title below */}
                      <p className="mt-1.5 text-[11px] font-medium text-zinc-500 group-hover/card:text-zinc-200 transition-colors line-clamp-1 px-0.5">
                        {course.title}
                      </p>
                    </Link>
                  )
                })}

                {/* "Ver todos" card */}
                <Link
                  href="/cursos"
                  className="group/more flex-shrink-0 w-[190px] sm:w-[220px] md:w-[245px] lg:w-[265px]"
                >
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

        {/* ── PLANOS ───────────────────────────────────────────────────── */}
        <section id="planos" className="py-20 border-t border-zinc-900">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black mb-3">Escolha seu plano</h2>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                Comece com as aulas gratuitas. Faça upgrade quando estiver pronto.
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
                    <Link href="/planos">Começar com {plan.name}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Gamepad2,
  Play,
  CheckCircle2,
  Star,
  Wrench,
  Zap,
  Shield,
  Award,
  ArrowRight,
  Monitor,
  ChevronRight,
} from "lucide-react"

const benefits = [
  { icon: Play, title: "Prévia gratuita", desc: "Assista o começo de qualquer aula antes de comprar. Sem cartão necessário." },
  { icon: Wrench, title: "100% prático", desc: "Aulas gravadas com bancada real, ferramentas e consoles abertos." },
  { icon: Monitor, title: "PlayStation, Xbox, Nintendo", desc: "Consoles das últimas gerações: diagnóstico, solda, troca de componentes." },
  { icon: Zap, title: "Aprenda no seu ritmo", desc: "Acesse quando quiser, quantas vezes quiser. Sem prazo de expiração no plano vitalício." },
  { icon: Shield, title: "Acesso seguro", desc: "Plataforma própria com controle total. Sem dependência de terceiros." },
  { icon: Award, title: "Certificado", desc: "Certificado de conclusão disponível nos planos Pro e Premium." },
]

const plans = [
  {
    name: "Básico", price: "R$ 97", period: "acesso por 12 meses", highlight: false,
    features: ["Curso principal completo", "Módulos essenciais", "Acesso por 12 meses", "Suporte por e-mail"],
  },
  {
    name: "Pro", price: "R$ 197", period: "acesso vitalício", highlight: true, badge: "Mais popular",
    features: ["Curso completo + bônus", "Materiais complementares", "Certificado de conclusão", "Suporte prioritário", "Acesso vitalício"],
  },
  {
    name: "Premium", price: "R$ 397", period: "acesso vitalício", highlight: false,
    features: ["Tudo do Pro", "Conteúdo avançado", "Comunidade exclusiva", "Mentorias ao vivo", "Acesso vitalício", "Novos cursos incluídos"],
  },
]

const testimonials = [
  { name: "Carlos M.", role: "Técnico autônomo", text: "Comecei assistindo a prévia gratuita e me viciei. Em 3 meses já estava consertando PS5 com confiança.", stars: 5 },
  { name: "Rafael S.", role: "Estudante de eletrônica", text: "As aulas de solda são excepcionais. Aprendi pontos que não achei em nenhum outro lugar.", stars: 5 },
  { name: "Ana P.", role: "Proprietária de assistência técnica", text: "Treinei dois funcionários com o conteúdo do GameDoctor. Valeu cada centavo.", stars: 5 },
]

const faqs = [
  { q: "Preciso ter experiência prévia?", a: "Não. Os cursos são estruturados do básico ao avançado. Se você sabe segurar uma chave de fenda, já pode começar." },
  { q: "Posso assistir uma aula antes de comprar?", a: "Sim! Diversas aulas têm prévia gratuita. Você assiste o começo sem precisar de conta ou cartão." },
  { q: "Como funciona o acesso vitalício?", a: "Uma vez comprado, o acesso não expira. Você também recebe atualizações e novos módulos conforme são lançados." },
  { q: "Quais ferramentas preciso ter?", a: "Cada curso lista as ferramentas necessárias. Em geral: chaves de precisão, estação de solda e multímetro são o básico." },
  { q: "Posso pagar com Pix?", a: "Sim! Aceitamos Pix (aprovação instantânea) e cartão de crédito em até 12x." },
]

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-24 md:py-36">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-[300px] w-[400px] rounded-full bg-[hsl(var(--gd-secondary))]/5 blur-3xl" />
          </div>
          <div className="container text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary px-4 py-1">
              <Gamepad2 className="mr-2 h-3 w-3" />
              Plataforma de cursos técnicos
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
              Domine a manutenção de{" "}
              <span className="text-primary">videogames</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Videoaulas práticas com bancada real. PlayStation, Xbox, Nintendo —
              aprenda a diagnosticar, soldar e consertar qualquer console.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8">
                <Link href="/planos">
                  Ver planos e preços
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8">
                <Link href="/cursos">
                  <Play className="mr-2 h-4 w-4" />
                  Assistir prévia grátis
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Prévia gratuita — sem cadastro necessário</p>
          </div>
        </section>

        {/* ── BENEFÍCIOS ── */}
        <section id="sobre" className="py-20 border-t border-border/50">
          <div className="container">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que escolher o GameDoctor?</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Uma plataforma feita por quem vive de manutenção, para quem quer aprender de verdade.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((b) => {
                const Icon = b.icon
                return (
                  <div key={b.title} className="rounded-xl border border-border/50 bg-card/30 p-6 hover:border-primary/30 hover:bg-card/60 transition-all">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── PLANOS ── */}
        <section id="planos" className="py-20 border-t border-border/50">
          <div className="container">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha seu plano</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Comece assistindo aulas gratuitas e faça upgrade quando estiver pronto.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-8 flex flex-col ${
                    plan.highlight ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border/50 bg-card/30"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.period}</p>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Link href="/planos">Escolher {plan.name}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DEPOIMENTOS ── */}
        <section className="py-20 border-t border-border/50">
          <div className="container">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">O que dizem nossos alunos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-xl border border-border/50 bg-card/30 p-6">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[hsl(var(--gd-accent))] text-[hsl(var(--gd-accent))]" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="suporte" className="py-20 border-t border-border/50">
          <div className="container max-w-3xl">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-xl border border-border/50 bg-card/30 px-6"
                >
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="py-20 border-t border-border/50">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para começar?</h2>
              <p className="text-muted-foreground mb-8">
                Assista aulas gratuitas agora mesmo — sem cadastro, sem cartão.
                Faça upgrade quando estiver convicto.
              </p>
              <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-10">
                <Link href="/cursos">
                  Ver cursos disponíveis
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
