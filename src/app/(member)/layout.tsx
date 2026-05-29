// Member area layout
// Auth enforcement is handled by middleware for protected routes.
// /aula and /curso are intentionally public (preview/paywall inside the player).

import { auth } from "@/lib/auth"
import { MemberSidebar } from "@/components/layout/MemberSidebar"
import { Header } from "@/components/layout/Header"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <div className="flex flex-1">
        {/* Desktop sidebar — only shown when logged in, not on aula pages (they have their own layout) */}
        {session && (
          <div className="hidden lg:flex">
            <MemberSidebar />
          </div>
        )}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
