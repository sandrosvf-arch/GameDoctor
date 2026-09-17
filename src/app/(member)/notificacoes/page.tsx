import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { NotificationBell } from "@/components/notifications/NotificationBell"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return <div className="mx-auto max-w-3xl space-y-4 p-6 md:p-10"><div><h1 className="text-2xl font-bold">Notificações</h1><p className="mt-1 text-sm text-muted-foreground">Avisos importantes da GameDoctor.</p></div><div className="rounded-2xl border border-border bg-card/40 p-4"><NotificationBell /></div></div>
}
