import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { TicketsClient } from "./TicketsClient"

export default async function TicketsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/tickets")}`)
  }

  return <TicketsClient />
}