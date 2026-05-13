// Admin area layout — requires ADMIN or EDITOR role
// Protected by middleware

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AdminLogoutButton } from "@/components/layout/AdminLogoutButton"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/banners", label: "Banners da Home" },
  { href: "/admin/trilhas", label: "Trilhas" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/alunos", label: "Alunos" },
  { href: "/admin/acessos", label: "Acessos" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/logs", label: "Logs" },
]

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
      <aside className="w-56 border-r border-border hidden lg:flex flex-col p-4 shrink-0">
        <div className="mb-6 px-1">
          <Image
            src="/doctor-oficial.png"
            alt="GameDoctor"
            width={160}
            height={48}
            className="object-contain"
            priority
          />
          <p className="text-xs text-muted-foreground mt-2">Painel Administrativo</p>
        </div>
        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-3 mt-3">
          <AdminLogoutButton email={session.user.email ?? ""} />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
