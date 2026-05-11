import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import {
  type LucideIcon,
  Gamepad2,
  Monitor,
  Cpu,
  Zap,
  Wrench,
  Play,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
}

interface Section {
  id: string
  label: string
  courses: CourseCard[]
}

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

const ps5: CourseCard[] = [
  { id: "ps5-diag",   title: "Diagnóstico Completo PS5",     duration: "18 min",   badge: "FREE", gradient: "from-blue-950 via-blue-900 to-indigo-950",    iconColor: "text-blue-400",   Icon: Gamepad2, free: true,  href: "/cursos" },
  { id: "ps5-pasta",  title: "Troca de Pasta Térmica",       duration: "32 min",   badge: "NEW",  gradient: "from-blue-950 via-purple-950 to-blue-950",    iconColor: "text-purple-400", Icon: Wrench,   free: false, href: "/planos" },
  { id: "ps5-erro",   title: "Erro CE-108255 e CE-107891",   duration: "45 min",                  gradient: "from-slate-900 via-blue-950 to-slate-900",    iconColor: "text-blue-300",   Icon: Cpu,      free: false, href: "/planos" },
  { id: "ps5-leitor", title: "Troca do Leitor de Disco",     duration: "28 min",                  gradient: "from-blue-950 to-violet-950",                 iconColor: "text-violet-400", Icon: Wrench,   free: false, href: "/planos" },
  { id: "ps5-bga",    title: "Solda BGA no PS5",             duration: "1h 12min", badge: "PRO",  gradient: "from-violet-950 via-purple-950 to-blue-950",  iconColor: "text-violet-300", Icon: Zap,      free: false, href: "/planos" },
  { id: "ps5-fonte",  title: "Reparo da Fonte PS5",          duration: "52 min",                  gradient: "from-indigo-950 to-blue-950",                 iconColor: "text-indigo-400", Icon: Cpu,      free: false, href: "/planos" },
]

const xbox: CourseCard[] = [
  { id: "xbox-diag",     title: "Diagnóstico Xbox Series X",   duration: "22 min",  badge: "FREE", gradient: "from-green-950 via-emerald-950 to-green-950", iconColor: "text-green-400",   Icon: Gamepad2, free: true,  href: "/cursos" },
  { id: "xbox-hdmi",     title: "Troca Porta HDMI Xbox",       duration: "35 min",  badge: "NEW",  gradient: "from-emerald-950 to-teal-950",                iconColor: "text-emerald-400", Icon: Monitor,  free: false, href: "/planos" },
  { id: "xbox-e101",     title: "Erro E101 / E102 Xbox",       duration: "40 min",                 gradient: "from-green-950 via-slate-900 to-green-950",   iconColor: "text-green-300",   Icon: Cpu,      free: false, href: "/planos" },
  { id: "xbox-series-s", title: "Desmontagem Xbox Series S",   duration: "18 min",                 gradient: "from-slate-800 to-green-950",                 iconColor: "text-slate-300",   Icon: Wrench,   free: false, href: "/planos" },
  { id: "xbox-bga",      title: "Solda BGA Xbox Series X",     duration: "58 min",  badge: "PRO",  gradient: "from-green-950 to-emerald-900",               iconColor: "text-emerald-300", Icon: Zap,      free: false, href: "/planos" },
]

const nintendo: CourseCard[] = [
  { id: "sw-joycon",  title: "Joy-Con Drift — Solução",      duration: "15 min",   badge: "FREE", gradient: "from-red-950 via-rose-950 to-red-950",        iconColor: "text-red-400",   Icon: Gamepad2, free: true,  href: "/cursos" },
  { id: "sw-tela",    title: "Troca da Tela Switch OLED",    duration: "38 min",   badge: "NEW",  gradient: "from-rose-950 to-pink-950",                   iconColor: "text-rose-400",  Icon: Monitor,  free: false, href: "/planos" },
  { id: "sw-imagem",  title: "Switch Sem Imagem",            duration: "42 min",                  gradient: "from-red-950 via-slate-900 to-red-950",       iconColor: "text-red-300",   Icon: Cpu,      free: false, href: "/planos" },
  { id: "sw-bga",     title: "Solda BGA Nintendo Switch",    duration: "1h 05min", badge: "PRO",  gradient: "from-red-950 to-rose-900",                    iconColor: "text-rose-300",  Icon: Zap,      free: false, href: "/planos" },
  { id: "sw-limpeza", title: "Limpeza e Manutenção Switch",  duration: "20 min",                  gradient: "from-rose-950 via-red-950 to-slate-900",      iconColor: "text-rose-400",  Icon: Wrench,   free: false, href: "/planos" },
]

const basics: CourseCard[] = [
  { id: "basic-multi", title: "Uso do Multímetro",                   duration: "25 min",   badge: "FREE", gradient: "from-amber-950 via-orange-950 to-amber-950", iconColor: "text-amber-400",  Icon: Cpu,     free: true,  href: "/cursos" },
  { id: "basic-solda", title: "Estação de Solda — Primeiros Passos", duration: "45 min",                  gradient: "from-orange-950 to-red-950",                 iconColor: "text-orange-400", Icon: Zap,     free: false, href: "/planos" },
  { id: "basic-comp",  title: "Identificando Componentes",           duration: "32 min",                  gradient: "from-amber-950 via-yellow-950 to-amber-950", iconColor: "text-yellow-400", Icon: Cpu,     free: false, href: "/planos" },
  { id: "basic-smd",   title: "Técnicas de Solda SMD",               duration: "1h 20min", badge: "PRO",  gradient: "from-orange-950 to-amber-900",               iconColor: "text-amber-300",  Icon: Zap,     free: false, href: "/planos" },
  { id: "basic-micro", title: "Como Usar o Microscópio",             duration: "28 min",                  gradient: "from-amber-950 via-slate-900 to-amber-950",  iconColor: "text-amber-400",  Icon: Monitor, free: false, href: "/planos" },
]

const sections: Section[] = [
  { id: "ps5",     label: "PlayStation 5",           courses: ps5 },
  { id: "xbox",    label: "Xbox Series X|S",         courses: xbox },
  { id: "switch",  label: "Nintendo Switch",         courses: nintendo },
  { id: "basics",  label: "Fundamentos de Eletrônica", courses: basics },
]

function Card({ card }: { card: CourseCard }) {
  const Icon = card.Icon
  return (
    <Link href={card.href} className="group block shrink-0 w-48 sm:w-56">
      {/* Thumbnail */}
      <div className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden bg-gradient-to-br",
        card.gradient,
        "ring-0 group-hover:ring-2 ring-primary/60 transition-all duration-300"
      )}>
        {/* dot grid */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        <Icon className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 opacity-35", card.iconColor)} />
        {/* badge */}
        {card.badge && (
          <span className={cn("absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded", badgeStyles[card.badge])}>
            {badgeLabels[card.badge]}
          </span>
        )}
        {/* lock */}
        {!card.free && (
          <div className="absolute top-2 right-2">
            <Lock className="h-3.5 w-3.5 text-white/60" />
          </div>
        )}
        {/* bottom bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-2 pt-6 pb-2">
          <p className="text-white text-xs font-medium leading-snug line-clamp-2">{card.title}</p>
          <p className="text-white/50 text-[10px] mt-0.5">{card.duration}</p>
        </div>
        {/* play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function CursosPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Todos os cursos</h1>
          <p className="text-muted-foreground mt-2">
            Escolha por console ou fundamento e comece a aprender agora.
          </p>
        </div>

        {/* CTA upgrade */}
        <div className="mb-10 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-lg">Desbloqueie todos os cursos</p>
            <p className="text-muted-foreground text-sm mt-0.5">Acesso vitalício a todo o conteúdo por um único pagamento.</p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/planos">Ver planos</Link>
          </Button>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((sec) => (
            <section key={sec.id}>
              <h2 className="text-xl font-semibold mb-5">{sec.label}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sec.courses.map((c) => (
                  <Card key={c.id} card={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
