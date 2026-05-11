// Home page — área pública
// TODO: implementar seções completas na Fase 1

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
          Domine a manutenção de{" "}
          <span className="text-[hsl(var(--gd-primary))]">videogames</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
          Aprenda com videoaulas práticas, organizadas por módulos, e comece
          assistindo uma prévia gratuita antes de escolher seu plano.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/planos"
            className="px-8 py-3 rounded-lg bg-[hsl(var(--gd-primary))] text-[hsl(var(--gd-darker))] font-semibold hover:opacity-90 transition-opacity"
          >
            Começar agora
          </a>
          <a
            href="/planos"
            className="px-8 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-colors"
          >
            Ver planos
          </a>
          <a
            href="/login"
            className="px-8 py-3 rounded-lg text-muted-foreground font-semibold hover:text-foreground transition-colors"
          >
            Entrar na minha conta
          </a>
        </div>
      </section>

      {/* TODO: Seção — Destaques dos cursos */}
      {/* TODO: Seção — Comece assistindo grátis (prévias) */}
      {/* TODO: Seção — Benefícios */}
      {/* TODO: Seção — Depoimentos */}
      {/* TODO: Seção — Planos */}
      {/* TODO: Seção — FAQ */}
    </main>
  )
}
