// Member area layout — sidebar + main content
// Auth enforcement is handled by middleware for protected routes.
// /aula and /curso are intentionally public (preview/paywall inside the player).

import { auth } from "@/lib/auth"
import { MemberSidebar } from "@/components/layout/MemberSidebar"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — only shown when logged in */}
      {session && (
        <div className="hidden lg:flex">
          <MemberSidebar />
        </div>
      )}

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
