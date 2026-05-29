"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  BookMarked,
  Play,
  TrendingUp,
  Award,
  Heart,
  HeadphonesIcon,
  Settings,
  LogOut,
  Users,
  UserCircle,
  Globe,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const mainNavItems = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Minhas Trilhas", href: "/meus-cursos", icon: BookMarked },
  { label: "Continuar Assistindo", href: "/dashboard#continuar", icon: Play },
  { label: "Progresso", href: "/progresso", icon: TrendingUp },
  { label: "Certificados", href: "/certificados", icon: Award },
  { label: "Favoritos", href: "/favoritos", icon: Heart },
  { label: "Meu Perfil", href: "/perfil", icon: UserCircle },
]

const supportNavItems = [
  { label: "Central de Ajuda", href: "/suporte", icon: HeadphonesIcon },
  { label: "Comunidade", href: "/comunidade", icon: Globe },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
]

export function MemberSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  return (
    <aside
      className={cn(
        "relative flex flex-col h-[calc(100vh-4rem)] border-r border-border/40 bg-card/20 sticky top-16 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Collapse toggle — floating button on the right edge */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full border border-border/60 bg-background shadow-md flex items-center justify-center hover:bg-accent transition-colors"
        title={collapsed ? "Expandir painel" : "Recolher painel"}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        }
      </button>

      {/* ── Main Nav ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href.split("#")[0] + "/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm transition-all",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
              {!collapsed && item.label}
              {!collapsed && isActive && (
                <ChevronRight className="h-3.5 w-3.5 ml-auto text-primary/60" />
              )}
            </Link>
          )
        })}

        {/* SUPORTE section */}
        {collapsed
          ? <div className="my-3 border-t border-border/30" />
          : (
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Suporte
              </p>
            </div>
          )
        }

        {supportNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm transition-all",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Indique e ganhe (hidden when collapsed) ── */}
      {!collapsed && (
        <div className="px-3 pb-3 shrink-0">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold">Indique e ganhe</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Convide amigos e ganhe benefícios exclusivos.
            </p>
            <button className="w-full rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold py-1.5 transition-colors">
              Convidar amigos
            </button>
          </div>
        </div>
      )}

      {/* ── User / Logout (bottom) ── */}
      <div className="border-t border-border/40 px-3 py-3 shrink-0">
        {collapsed ? (
          <div className="flex justify-center">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={session?.user?.image ?? ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{session?.user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

