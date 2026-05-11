// Member area layout — sidebar + main content
// Protected by middleware (requires login)
// TODO: Fase 1 — implementar sidebar com menu do aluno

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen bg-background">
      {/* TODO: Sidebar component with: Dashboard, Meus Cursos, Materiais, Certificados, Suporte, Minha Conta */}
      <aside className="w-64 border-r border-border hidden lg:flex flex-col p-4 shrink-0">
        <div className="text-lg font-bold text-[hsl(var(--gd-primary))] mb-8">
          GameDoctor
        </div>
        {/* TODO: MemberSidebar navigation */}
      </aside>

      {/* Mobile header with drawer */}
      {/* TODO: MobileHeader component */}

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
