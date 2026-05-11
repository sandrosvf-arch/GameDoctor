"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { Menu, X, Gamepad2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navLinks = [
  { label: "Cursos", href: "/cursos" },
  { label: "Planos", href: "/planos" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Suporte", href: "/#suporte" },
]

export function Header() {
  const { data: session, status } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Game<span className="text-primary">Doctor</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {status === "loading" ? null : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pr-1 hover:bg-secondary/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image ?? ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {session.user?.name?.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Minha área</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/meus-cursos">Meus cursos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/minha-conta">Minha conta</Link>
                </DropdownMenuItem>
                {(session.user as { role?: string })?.role === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">Painel Admin</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/planos">Começar agora</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-6 pt-6">
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <Gamepad2 className="h-5 w-5 text-primary" />
                <span className="font-bold">
                  Game<span className="text-primary">Doctor</span>
                </span>
              </Link>
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                {session ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                    >
                      Minha área
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 text-left transition-colors"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild>
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        Entrar
                      </Link>
                    </Button>
                    <Button asChild className="bg-primary text-primary-foreground">
                      <Link href="/planos" onClick={() => setMobileOpen(false)}>
                        Começar agora
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
