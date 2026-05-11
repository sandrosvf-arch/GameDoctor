// TODO: Fase 1 — Página do curso (área do aluno)
// Exibe: banner, módulos, aulas, progresso, materiais, botão continuar

interface Props {
  params: { slug: string }
}

export default function CursoMembroPage({ params }: Props) {
  return (
    <div className="p-6 md:p-8">
      {/* TODO: buscar curso + verificar acesso via hasAccessToCourse() */}
      {/* TODO: Banner do curso */}
      {/* TODO: Progresso geral (barra + percentual) */}
      {/* TODO: Lista de módulos com aulas e status (concluída/em andamento/bloqueada) */}
      {/* TODO: Materiais do curso */}
      <p className="text-muted-foreground">Carregando curso: {params.slug}</p>
    </div>
  )
}
