"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Menu, ChevronDown, ChevronRight, Search, LayoutGrid } from "lucide-react"
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

function HeartbeatLine() {
  const [tick, setTick] = useState(-1)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    const timeout = setTimeout(() => {
      setTick(0)
      interval = setInterval(() => setTick((t) => t + 1), 3500)
    }, 1000)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  const points = "0,8 28,8 36,3 41,14 46,0 52,8 112,8"
  const pathLen = 158

  return (
    <svg
      width="100"
      height="15"
      viewBox="0 0 112 16"
      fill="none"
      aria-hidden="true"
      className="mt-1 overflow-visible"
    >
      <polyline points={points} stroke="rgba(0,207,255,0.15)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {tick >= 0 && (
        <polyline
          key={tick}
          points={points}
          stroke="#00CFFF"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLen,
            strokeDashoffset: pathLen,
            filter: "drop-shadow(0 0 4px #00CFFF)",
            animation: "ecgDraw 2s cubic-bezier(0.4,0,0.2,1) forwards",
          }}
        />
      )}
      {tick >= 0 && (
        <circle
          key={`d-${tick}`}
          r="2.5"
          fill="#00CFFF"
          style={{ filter: "drop-shadow(0 0 5px #00CFFF)", animation: "ecgFade 2s forwards" }}
        >
          <animateMotion dur="1.3s" path="M0,8 L28,8 L36,3 L41,14 L46,0 L52,8 L112,8" fill="freeze" />
        </circle>
      )}
      <style>{`
        @keyframes ecgDraw {
          from { stroke-dashoffset: ${pathLen}; }
          65%  { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes ecgFade {
          0%,65% { opacity: 1; }
          100%   { opacity: 0; }
        }
      `}</style>
    </svg>
  )
}

const navLinks = [
  { label: "Cursos", href: "/cursos" },
  { label: "Planos", href: "/planos" },
  { label: "Comunidade", href: "/comunidade" },
  { label: "FAQ", href: "/suporte" },
]

interface CatalogCategoryNode {
  id: string
  name: string
  slug: string
  children: CatalogCategoryNode[]
}

export function Header() {
  const { data: session, status } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [categories, setCategories] = useState<CatalogCategoryNode[]>([])
  const [desktopCategoriesOpen, setDesktopCategoriesOpen] = useState(false)
  const [openDesktopRootId, setOpenDesktopRootId] = useState<string | null>(null)
  const [openDesktopBranchId, setOpenDesktopBranchId] = useState<string | null>(null)
  const [openMobileCategoryId, setOpenMobileCategoryId] = useState<string | null>(null)
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/catalog/categorias")
      .then((res) => res.ok ? res.json() : [])
      .then((data: CatalogCategoryNode[]) => {
        setCategories(data)
      })
      .catch(() => setCategories([]))
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    setIsSearching(true)
    router.push(`/busca?q=${encodeURIComponent(q)}`)
    setTimeout(() => setIsSearching(false), 1500)
  }

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"
  const isAdminUser = ["ADMIN", "EDITOR"].includes((session?.user as { role?: string } | undefined)?.role ?? "")
  const memberHome = isAdminUser ? "/admin/dashboard" : "/dashboard"

  function resetDesktopCategoryState() {
    setOpenDesktopRootId(null)
    setOpenDesktopBranchId(null)
  }

  function handleDesktopDropdownOpenChange(open: boolean) {
    setDesktopCategoriesOpen(open)
    if (!open) {
      resetDesktopCategoryState()
    }
  }

  function handleDesktopRootToggle(rootId: string) {
    setOpenDesktopRootId((current) => {
      const next = current === rootId ? null : rootId
      setOpenDesktopBranchId(null)
      return next
    })
  }

  function handleDesktopBranchToggle(branchId: string) {
    setOpenDesktopBranchId((current) => current === branchId ? null : branchId)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-3">
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/doctor-oficial.png"
              alt="GameDoctor"
              width={240}
              height={48}
              className="h-7 w-auto md:h-9"
            />
          </Link>
          <HeartbeatLine />
        </div>

        <nav className="mx-4 hidden flex-1 items-center justify-between gap-2 md:flex">
          <div className="flex items-center gap-1">
            <DropdownMenu open={desktopCategoriesOpen} onOpenChange={handleDesktopDropdownOpenChange}>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white">
                  <LayoutGrid className="h-4 w-4" />
                  Categorias
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 overflow-visible p-1.5">
                <DropdownMenuItem asChild>
                  <Link href="/cursos">Ver todos os cursos</Link>
                </DropdownMenuItem>
                {categories.length > 0 && <DropdownMenuSeparator />}
                {categories.map((root) => (
                  <div
                    key={root.id}
                    className="relative rounded-lg border border-transparent hover:border-white/5"
                  >
                    <div className="flex items-center rounded-md hover:bg-accent">
                      <Link
                        href={`/cursos?categoria=${root.slug}`}
                        className="flex-1 px-2.5 py-2 text-left text-sm"
                      >
                        {root.name}
                      </Link>
                      {root.children.length > 0 ? (
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleDesktopRootToggle(root.id)
                          }}
                          className="mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                          aria-label={`Abrir subcategorias de ${root.name}`}
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${openDesktopRootId === root.id ? "translate-x-0.5" : ""}`}
                          />
                        </button>
                      ) : null}
                    </div>

                    {root.children.length > 0 && openDesktopRootId === root.id ? (
                      <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-xl border border-border/60 bg-popover p-1.5 shadow-2xl">
                        {root.children.map((child) => (
                          <div key={child.id} className="relative">
                            <div className="flex items-center rounded-md hover:bg-accent">
                              <Link
                                href={`/cursos?categoria=${child.slug}`}
                                className="flex flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                              >
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                {child.name}
                              </Link>
                              {child.children.length > 0 ? (
                                <button
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                  }}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    handleDesktopBranchToggle(child.id)
                                  }}
                                  className="mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                                  aria-label={`Abrir subcategorias de ${child.name}`}
                                >
                                  <ChevronRight
                                    className={`h-4 w-4 transition-transform ${openDesktopBranchId === child.id ? "translate-x-0.5" : ""}`}
                                  />
                                </button>
                              ) : null}
                            </div>

                            {child.children.length > 0 && openDesktopBranchId === child.id ? (
                              <div className="absolute left-full top-0 z-50 ml-2 w-64 rounded-xl border border-border/60 bg-popover p-1.5 shadow-2xl">
                                {child.children.map((grandchild) => (
                                  <DropdownMenuItem key={grandchild.id} asChild className="px-2.5 py-2">
                                    <Link
                                      href={`/cursos?categoria=${grandchild.slug}`}
                                      className="flex w-full cursor-pointer items-center gap-2"
                                    >
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                      {grandchild.name}
                                    </Link>
                                  </DropdownMenuItem>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <form onSubmit={handleSearch} className="mx-4 flex-1 max-w-sm">
            <div className={cn(
              "rounded-xl p-px",
              isSearching ? "search-spinning" : "search-static"
            )}>
              <div className="relative rounded-[11px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="O que você procura?"
                  className="h-9 w-full rounded-[11px] bg-background pl-9 pr-3 text-sm transition-all placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </div>
            </div>
          </form>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
          {status === "loading" ? null : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-full pr-1 transition-colors hover:bg-secondary/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image ?? ""} />
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate text-sm font-medium">
                    {session.user?.name?.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isAdminUser ? (
                  <DropdownMenuItem asChild>
                    <Link href={memberHome}>Minha área</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild>
                  <Link href="/minha-conta">Minha conta</Link>
                </DropdownMenuItem>
                {isAdminUser ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">Painel Admin</Link>
                  </DropdownMenuItem>
                ) : null}
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
                className="flex items-center"
                onClick={() => setMobileOpen(false)}
              >
                <Image src="/doctor-oficial.png" alt="GameDoctor" width={180} height={36} className="h-8 w-auto" />
              </Link>
              <nav className="flex flex-col gap-1">
                <form onSubmit={handleSearch} className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="O que você procura?"
                    className="h-9 w-full rounded-lg border border-border/60 bg-muted/40 pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </form>
                <Link
                  href="/cursos"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  Categorias
                </Link>
                {categories.map((root) => (
                  <div key={root.id} className="rounded-lg border border-border/40 bg-card/30">
                    <div className="flex items-center">
                      <Link
                        href={`/cursos?categoria=${root.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 px-3 py-2 text-sm font-medium"
                      >
                        {root.name}
                      </Link>
                      {root.children.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setOpenMobileCategoryId((current) => current === root.id ? null : root.id)}
                          className="cursor-pointer px-3 py-2 text-muted-foreground"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${openMobileCategoryId === root.id ? "rotate-180" : ""}`} />
                        </button>
                      ) : null}
                    </div>
                    {root.children.length > 0 && openMobileCategoryId === root.id ? (
                      <div className="border-t border-border/40 px-2 py-1">
                        {root.children.map((child) => (
                          <Link
                            key={child.id}
                            href={`/cursos?categoria=${child.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                {session ? (
                  <>
                    {!isAdminUser ? (
                      <Link
                        href={memberHome}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
                      >
                        Minha área
                      </Link>
                    ) : null}
                    <Link
                      href="/minha-conta"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
                    >
                      Minha conta
                    </Link>
                    {isAdminUser ? (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
                      >
                        Painel Admin
                      </Link>
                    ) : null}
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="cursor-pointer rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
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
