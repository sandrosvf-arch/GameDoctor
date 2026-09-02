// Admin area layout - requires ADMIN or EDITOR role
// Protected by middleware

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AdminLogoutButton } from "@/components/layout/AdminLogoutButton"
import {
  Home,
  Users,
  Image as ImageIcon,
  BookOpen,
  Map,
  Ticket,
  HelpCircle,
  Globe,
  ShoppingCart,
  Tag,
  Shield,
  MessageSquare,
  MessageSquarePlus,
  Tags,
  Download,
  Settings,
  Bot,
  Menu,
} from "lucide-react"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type AdminBadgeKey = "tickets" | "comments" | "community" | "suggestions" | "ordersToday"
type AdminNavItem = {
  href: string
  label: string
  icon: typeof Home
  badgeKey?: AdminBadgeKey
}
type AdminNavGroup = {
  title?: string
  items: AdminNavItem[]
}

const navGroups: AdminNavGroup[] = [
  {
    items: [
      { href: "/admin/dashboard", label: "Início", icon: Home },
    ],
  },
  {
    title: "Gerenciamento",
    items: [
      { href: "/admin/alunos", label: "Usuários", icon: Users },
      { href: "/admin/planos", label: "Planos de assinatura", icon: Tags },
      { href: "/admin/banners", label: "Fullbanner", icon: ImageIcon },
      { href: "/admin/aulas", label: "Conteúdo", icon: BookOpen },
      { href: "/admin/trilhas", label: "Trilhas", icon: Map },
      { href: "/admin/categorias", label: "Categorias", icon: Tags },
      { href: "/admin/downloads", label: "Downloads", icon: Download },
    ],
  },
  {
    title: "Suporte",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: Ticket, badgeKey: "tickets" as const },
      { href: "/admin/comentarios", label: "Comentários", icon: MessageSquare, badgeKey: "comments" as const },
      { href: "/admin/ajuda", label: "Central de ajuda", icon: HelpCircle },
      { href: "/admin/comunidade", label: "Comunidade", icon: Globe, badgeKey: "community" as const },
      { href: "/admin/sugestoes", label: "Sugestões de aula", icon: MessageSquarePlus, badgeKey: "suggestions" as const },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart, badgeKey: "ordersToday" as const },
      { href: "/admin/cupons", label: "Cupons", icon: Tag },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/perfil", label: "Administradores", icon: Shield },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
      { href: "/admin/ia", label: "Histórico da IA", icon: Bot },
    ],
  },
]

function getSaoPauloDayRange(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = Object.fromEntries(
    formatter
      .formatToParts(referenceDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )

  const zonedNow = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
  )
  const offset = referenceDate.getTime() - zonedNow.getTime()

  const startOfDay = new Date(zonedNow)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(zonedNow)
  endOfDay.setHours(23, 59, 59, 999)

  return {
    start: new Date(startOfDay.getTime() + offset),
    end: new Date(endOfDay.getTime() + offset),
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    redirect("/")
  }

  const dayRange = getSaoPauloDayRange()

  const [ticketsCount, commentsCount, pendingTopicsCount, pendingPostsCount, suggestionsCount, ordersTodayCount] =
    await Promise.all([
      db.ticket.count({ where: { status: "AGUARDANDO_RESPOSTA" } }),
      db.comment.count({ where: { parentId: null, status: "PENDING" } }),
      db.communityTopic.count({ where: { status: "PENDING" } }),
      db.communityPost.count({ where: { status: "PENDING" } }),
      db.lessonSuggestion.count(),
      db.order.count({
        where: {
          createdAt: {
            gte: dayRange.start,
            lte: dayRange.end,
          },
        },
      }),
    ])

  const badgeCounts: Record<AdminBadgeKey, number> = {
    tickets: ticketsCount,
    comments: commentsCount,
    community: pendingTopicsCount + pendingPostsCount,
    suggestions: suggestionsCount,
    ordersToday: ordersTodayCount,
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 lg:flex-row">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-zinc-950/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3">
          <Image
            src="/doctor-oficial.png"
            alt="GameDoctor"
            width={150}
            height={36}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="hidden text-xs text-muted-foreground min-[380px]:inline">Admin</span>
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground"
              aria-label="Abrir menu administrativo"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(20rem,calc(100vw-2rem))] overflow-y-auto">
            <Link href="/" className="block pr-8">
              <Image
                src="/doctor-oficial.png"
                alt="GameDoctor"
                width={160}
                height={48}
                className="object-contain"
              />
            </Link>
            <SheetTitle className="mt-2 text-left text-sm text-muted-foreground">
              Painel Administrativo
            </SheetTitle>

            <nav className="mt-6 space-y-5">
              {navGroups.map((group, index) => (
                <div key={index}>
                  {group.title ? (
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {group.title}
                    </p>
                  ) : null}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <SheetClose key={item.href} asChild>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1">{item.label}</span>
                            {item.badgeKey && badgeCounts[item.badgeKey] > 0 ? (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-cyan-300">
                                {badgeCounts[item.badgeKey]}
                              </span>
                            ) : null}
                          </Link>
                        </SheetClose>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-5 border-t border-border pt-3">
              <AdminLogoutButton email={session.user.email ?? ""} />
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 lg:flex">
        <Link href="/" className="mb-6 block cursor-pointer rounded-xl px-1 py-1 transition hover:bg-accent/40">
          <Image
            src="/doctor-oficial.png"
            alt="GameDoctor"
            width={160}
            height={48}
            className="object-contain"
            priority
          />
          <p className="mt-2 text-xs text-muted-foreground">Painel Administrativo</p>
        </Link>
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
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.badgeKey && badgeCounts[item.badgeKey] > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-cyan-300">
                          {badgeCounts[item.badgeKey]}
                        </span>
                      ) : null}
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
