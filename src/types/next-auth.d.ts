import "next-auth"
import type { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
  }
  interface Session {
    user: {
      id: string
      role: UserRole
    } & import("next-auth").DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
  }
}
