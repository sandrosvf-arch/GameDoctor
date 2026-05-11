// TODO: Fase 1 — Dashboard do aluno
// Seções: saudação, continuar assistindo, meus cursos, progresso, suporte

import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {session?.user?.name?.split(" ")[0]}. Continue de onde parou.
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta ao GameDoctor.
        </p>
      </div>

      {/* TODO: ContinueWatching card (última aula assistida + progresso) */}
      {/* TODO: MyCourses grid (cursos liberados com progresso) */}
      {/* TODO: RecentActivity */}
      {/* TODO: QuickLinks (Materiais, Certificados, Suporte) */}
    </div>
  )
}
