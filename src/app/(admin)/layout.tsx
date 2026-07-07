// Admin area layout - requires ADMIN or EDITOR role
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
  MessageSquare,
  MessageSquarePlus,
  Tags,
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
      { href: "/admin/alunos", label: "Usuários", icon: Users },
      // { href: "/admin/acessos", label: "Assinaturas", icon: CreditCard },
      { href: "/admin/planos", label: "Planos de assinatura", icon: Tags },
      { href: "/admin/banners", label: "Fullbanner", icon: ImageIcon },
      { href: "/admin/aulas", label: "Conteúdo", icon: BookOpen },
      { href: "/admin/trilhas", label: "Trilhas", icon: Map },
      { href: "/admin/categorias", label: "Categorias", icon: Tags },
    ],
  },
  {
    title: "Suporte",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: Ticket },
      { href: "/admin/comentarios", label: "Comentários", icon: MessageSquare },
      { href: "/admin/ajuda", label: "Central de ajuda", icon: HelpCircle },
      { href: "/admin/comunidade", label: "Comunidade", icon: Globe },
      { href: "/admin/sugestoes", label: "Sugestões de aula", icon: MessageSquarePlus },
    ],
  },
  {
    title: "Financeiro",
    items: [
      // { href: "/admin/relatorios", label: "Relatórios", icon: BarChart2 },
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
      { href: "/admin/cupons", label: "Cupons", icon: Tag },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/perfil", label: "Administradores", icon: Shield },
      // { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
      // { href: "/admin/integracoes", label: "Integrações", icon: Plug }]
      // { href: "/admin/logs", label: "Logs", icon: ScrollText },
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 lg:flex">
        <div className="mb-6 px-1">
          <Image
            src="/doctor-oficial.png"
            alt="GameDoctor"
            width={160}
            height={48}
            className="object-contain"
            priority
          />
          <p className="mt-2 text-xs text-muted-foreground">Painel Administrativo</p>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {navGroups.map((group, index) => (
            <div key={index}>
              {group.title && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-3 border-t border-border pt-3">
          <AdminLogoutButton email={session.user.email ?? ""} />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
