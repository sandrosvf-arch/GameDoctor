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
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
        token.picture = user.image ?? token.picture
      }

      if (trigger === "update") {
        const sessionImage = session?.image ?? session?.user?.image
        const sessionName = session?.name ?? session?.user?.name
        const sessionEmail = session?.email ?? session?.user?.email

        if (sessionImage !== undefined) {
          token.picture = sessionImage ?? null
        }
        if (sessionName) {
          token.name = sessionName
        }
        if (sessionEmail) {
          token.email = sessionEmail
        }
      }

      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.image = typeof token.picture === "string" ? token.picture : null
      }
      return session
    },
  },
}
