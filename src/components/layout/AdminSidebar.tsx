"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ShoppingCart,
  CreditCard,
  Tag,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Gamepad2,
  FileText,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const navGroups = [
  {
    label: "Geral",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { label: "Cursos", href: "/admin/cursos", icon: BookOpen },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Alunos", href: "/admin/alunos", icon: Users },
      { label: "Planos de Assinatura", href: "/admin/planos", icon: FileText },
      { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart },
      { label: "Pagamentos", href: "/admin/pagamentos", icon: CreditCard },
      { label: "Cupons", href: "/admin/cupons", icon: Tag },
      { label: "Acessos", href: "/admin/acessos", icon: Shield },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "A"

  return (
    <aside className="flex flex-col h-full w-64 border-r border-border/50 bg-card/30">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border/50">
        <Gamepad2 className="h-5 w-5 text-primary" />
        <span className="font-bold">
          Game<span className="text-primary">Doctor</span>
        </span>
        <span className="ml-auto text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
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

      {/* User footer */}
      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">Administrador</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
