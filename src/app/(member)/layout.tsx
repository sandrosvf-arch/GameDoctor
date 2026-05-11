// Member area layout — sidebar + main content
// Protected by middleware (requires login)

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MemberSidebar } from "@/components/layout/MemberSidebar"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <MemberSidebar />
      </div>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
