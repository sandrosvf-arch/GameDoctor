import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import TesteVideoContent from "./TesteVideoContent"

export default async function TesteVideoPage() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== "ADMIN" && role !== "EDITOR") {
    redirect("/dashboard")
  }
  return <TesteVideoContent />
}
