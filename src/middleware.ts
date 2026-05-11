import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that require authentication (member area)
const MEMBER_PREFIXES = [
  "/dashboard",
  "/meus-cursos",
  "/curso",
  "/aula",
  "/materiais",
  "/certificados",
  "/minha-conta",
]

// Routes that require ADMIN role
const ADMIN_PREFIXES = ["/admin"]

// Routes only accessible when NOT authenticated
const AUTH_ONLY_PREFIXES = ["/login", "/cadastro", "/recuperar-senha"]

export default auth((req: NextRequest & { auth: Awaited<ReturnType<typeof auth>> }) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR"
  const pathname = nextUrl.pathname

  const isMemberRoute = MEMBER_PREFIXES.some((p) => pathname.startsWith(p))
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p))

  if (isMemberRoute && !isLoggedIn) {
    const url = new URL("/login", nextUrl)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      const url = new URL("/login", nextUrl)
      url.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(url)
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
