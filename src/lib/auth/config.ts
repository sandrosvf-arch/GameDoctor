import type { NextAuthConfig } from "next-auth"
import type { UserRole } from "@prisma/client"

/**
 * Auth config with no heavy dependencies (no bcryptjs, no Prisma).
 * Used by middleware (Edge Runtime) and spread into the full auth config.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
