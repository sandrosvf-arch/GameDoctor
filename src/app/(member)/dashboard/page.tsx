import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { DashboardClient } from "./DashboardClient"
import { getPublicPlatformSettings } from "@/lib/app-settings"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { whatsappUrl } = await getPublicPlatformSettings()

  return <DashboardClient subscriptionCancelUrl={whatsappUrl} />
}
