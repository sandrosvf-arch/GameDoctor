import Link from "next/link"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
