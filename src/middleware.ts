import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/config"
import { NextResponse } from "next/server"
import type { NextAuthRequest } from "next-auth"

const { auth } = NextAuth(authConfig)

// Routes that require authentication (member area)
// /aula e /curso são públicas — o paywall é feito dentro do player via preview
const MEMBER_PREFIXES = [
  "/dashboard",
  "/meus-cursos",
  "/materiais",
  "/certificados",
]

const SHARED_AUTH_PREFIXES = ["/minha-conta"]

// Routes that require ADMIN role
const ADMIN_PREFIXES = ["/admin"]

// Routes only accessible when NOT authenticated
const AUTH_ONLY_PREFIXES = ["/login", "/cadastro", "/recuperar-senha"]

const ADMIN_HOME = "/admin/dashboard"
const MEMBER_HOME = "/dashboard"

export default auth((req: NextAuthRequest) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR"
  const pathname = nextUrl.pathname

  const isMemberRoute = MEMBER_PREFIXES.some((p) => pathname.startsWith(p))
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuthRoute = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p))
  const isSharedAuthRoute = SHARED_AUTH_PREFIXES.some((p) => pathname.startsWith(p))

  if (isMemberRoute && !isLoggedIn) {
    const url = new URL("/login", nextUrl)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  if (isSharedAuthRoute && !isLoggedIn) {
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
      return NextResponse.redirect(new URL(MEMBER_HOME, nextUrl))
    }
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(isAdmin ? ADMIN_HOME : MEMBER_HOME, nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
