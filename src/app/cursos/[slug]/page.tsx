// TODO: Fase 1 — Página de vendas do curso (pública)
// Conteúdo: banner, nome, descrição, módulos, bônus, planos, depoimentos, FAQ, CTA
interface Props {
  params: { slug: string }
}

export default function CursoVendaPage({ params }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <p className="text-muted-foreground p-8">Carregando curso: {params.slug}</p>
      {/* TODO: buscar curso pelo slug e renderizar página de vendas */}
    </main>
  )
}
