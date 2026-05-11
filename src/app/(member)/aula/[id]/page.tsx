// TODO: Fase 1 — Página da aula
// Layout: sidebar com módulos/aulas + player central
// Player: vídeo + título + descrição + materiais + anterior/próxima + marcar concluída
// Prévia: overlay "Continue assistindo" ao atingir limite

interface Props {
  params: { id: string }
}

export default function AulaPage({ params }: Props) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Player area */}
      <div className="flex-1 flex flex-col">
        {/* TODO: VideoPlayer component */}
        {/* - Busca token de acesso via GET /api/lessons/{id}/access */}
        {/* - Se isPreview=true, pausa no previewDurationSeconds e exibe overlay */}
        {/* - Overlay "Continue assistindo" com botões: Ver Planos | Já tenho acesso | Suporte */}
        {/* - Salva progresso via POST /api/progress */}
        <div className="aspect-video bg-black flex items-center justify-center">
          <p className="text-muted-foreground">Player — aula {params.id}</p>
        </div>

        {/* Lesson info below player */}
        <div className="p-6 space-y-4">
          {/* TODO: título, descrição, botões anterior/próxima, marcar concluída */}
          {/* TODO: MaterialsList */}
        </div>
      </div>

      {/* Sidebar — modules + lessons list */}
      <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto">
        {/* TODO: LessonSidebar component */}
        {/* Lista módulos e aulas com status visual */}
        {/* Mobile: collapsible drawer */}
      </aside>
    </div>
  )
}
