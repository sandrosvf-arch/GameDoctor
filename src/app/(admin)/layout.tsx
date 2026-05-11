// Admin area layout — requires ADMIN or EDITOR role
// Protected by middleware

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border hidden lg:flex flex-col p-4 shrink-0">
        <div className="text-lg font-bold text-[hsl(var(--gd-primary))] mb-2">
          GameDoctor
        </div>
        <p className="text-xs text-muted-foreground mb-8">Painel Administrativo</p>
        {/* TODO: AdminSidebar — links para todas as seções do admin */}
        {/* Dashboard, Cursos, Categorias, Plataformas, Módulos, Aulas, */}
        {/* Vídeos, Materiais, Alunos, Acessos, Planos, Pedidos, */}
        {/* Pagamentos, Cupons, Certificados, Relatórios, Logs, Config */}
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
