// Admin area layout — requires ADMIN or EDITOR role
// Protected by middleware

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AdminLogoutButton } from "@/components/layout/AdminLogoutButton"
import {
  Home,
  Users,
  CreditCard,
  Image as ImageIcon,
  BookOpen,
  Map,
  GraduationCap,
  Ticket,
  HelpCircle,
  Globe,
  BarChart2,
  ShoppingCart,
  Tag,
  Shield,
  Settings,
  Plug,
  ScrollText,
} from "lucide-react"

const navGroups = [
  {
    items: [
      { href: "/admin/dashboard", label: "Início", icon: Home },
    ],
  },
  {
    title: "Gerenciamento",
    items: [
      { href: "/admin/alunos",   label: "Usuários",    icon: Users },
      { href: "/admin/acessos",  label: "Assinaturas", icon: CreditCard },
      { href: "/admin/banners",  label: "Fullbanner",  icon: ImageIcon },
      { href: "/admin/aulas",    label: "Conteúdo",    icon: BookOpen },
      { href: "/admin/trilhas",  label: "Trilhas",     icon: Map },
      { href: "/admin/cursos",   label: "Cursos",      icon: GraduationCap },
    ],
  },
  {
    title: "Suporte",
    items: [
      { href: "/admin/tickets",   label: "Tickets",         icon: Ticket },
      { href: "/admin/ajuda",     label: "Central de ajuda", icon: HelpCircle },
      { href: "/admin/comunidade",label: "Comunidade",       icon: Globe },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart2 },
      { href: "/admin/pedidos",    label: "Pedidos",    icon: ShoppingCart },
      { href: "/admin/cupons",     label: "Cupons",     icon: Tag },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/perfil",        label: "Administradores", icon: Shield },
      { href: "/admin/configuracoes", label: "Configurações",   icon: Settings },
      { href: "/admin/integracoes",   label: "Integrações",     icon: Plug },
      { href: "/admin/logs",          label: "Logs",            icon: ScrollText },
    ],
  },
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
        <nav className="flex-1 overflow-y-auto space-y-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
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
