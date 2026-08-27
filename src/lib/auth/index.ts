import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import type { UserRole } from "@prisma/client"
import { authConfig } from "./config"

const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"
  && Boolean(process.env.GOOGLE_CLIENT_ID?.trim())
  && Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim())

async function syncGoogleUser(input: {
  googleId: string
  email: string
  name: string | null | undefined
  image: string | null | undefined
}) {
  const email = input.email.trim().toLowerCase()
  const existingByGoogle = await db.user.findUnique({
    where: { googleId: input.googleId },
  })
  const existing = existingByGoogle ?? await db.user.findUnique({
    where: { email },
  })

  if (existing?.status === "BLOCKED") {
    return null
  }

  const name = existing?.name || input.name?.trim() || email.split("@")[0]
  const avatarUrl = existing?.avatarUrl ?? input.image ?? null

  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        googleId: input.googleId,
        name,
        authProvider: "GOOGLE",
        lastLoginAt: new Date(),
        avatarUrl,
      },
    })
  }

  return db.user.create({
    data: {
      name,
      email,
      googleId: input.googleId,
      avatarUrl,
      authProvider: "GOOGLE",
      role: "STUDENT",
      status: "ACTIVE",
      lastLoginAt: new Date(),
    },
  })
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...(googleAuthEnabled ? [Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "STUDENT" as UserRole,
        }
      },
    })] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) return null

        if (user.status === "BLOCKED") {
          throw new Error("Sua conta está bloqueada. Entre em contato com o suporte.")
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!passwordMatch) return null

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true

      if (!user.email || !account.providerAccountId) return false

      const currentUser = await syncGoogleUser({
        googleId: account.providerAccountId,
        email: user.email,
        name: user.name,
        image: user.image,
      })

      if (!currentUser) return false

      user.id = currentUser.id
      user.name = currentUser.name
      user.email = currentUser.email
      user.image = currentUser.avatarUrl
      user.role = currentUser.role

      return true
    },
    async jwt({ token, user, trigger, session }) {
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
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole

        const currentUser = token.id
          ? await db.user.findUnique({
              where: { id: token.id as string },
              select: { name: true, email: true, avatarUrl: true },
            })
          : null

        session.user.name = currentUser?.name ?? session.user.name ?? null
        session.user.email = currentUser?.email ?? session.user.email ?? null
        session.user.image = currentUser?.avatarUrl ?? (typeof token.picture === "string" ? token.picture : null)
      }
      return session
    },
  },
})
