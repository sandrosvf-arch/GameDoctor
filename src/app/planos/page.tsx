// TODO: Fase 1 — Página de planos (pública)
// Exibe planos disponíveis: Básico, Pro, Premium
// Cada card: nome, preço, descrição, benefícios, cursos inclusos, CTA
export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-center text-foreground mb-4">
        Escolha seu plano
      </h1>
      <p className="text-center text-muted-foreground mb-16">
        Acesse o conteúdo completo do GameDoctor e domine a manutenção de videogames.
      </p>
      {/* TODO: renderizar cards de planos a partir do banco de dados */}
      {/* Plano Básico | Plano Pro (destacado) | Plano Premium */}
    </main>
  )
}
