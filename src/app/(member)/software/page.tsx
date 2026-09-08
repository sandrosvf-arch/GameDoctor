import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSoftwareDownloadAvailability } from "@/lib/access"
import { SoftwareDownloadClient } from "@/components/software/SoftwareDownloadClient"

const RELEASE_SOURCE_KEY = "gamedoctor-software"

export default async function SoftwarePage() {
  const session = await auth()
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR"
  const access = isStaff
    ? { hasPlan: true }
    : session?.user?.id
      ? await getSoftwareDownloadAvailability(session.user.id)
      : { hasPlan: false }
  const material = await db.downloadMaterial.findFirst({
    where: { sourceKey: RELEASE_SOURCE_KEY, status: "ACTIVE" },
    select: { id: true, title: true, description: true, fileName: true, sizeBytes: true, metadata: true },
  })
  const metadata = material?.metadata && typeof material.metadata === "object" && !Array.isArray(material.metadata) ? material.metadata as { version?: unknown; releaseNotes?: unknown } : {}

  return <SoftwareDownloadClient isLoggedIn={Boolean(session?.user?.id)} canAccess={access.hasPlan} release={material ? { ...material, version: typeof metadata.version === "string" ? metadata.version : "", releaseNotes: typeof metadata.releaseNotes === "string" ? metadata.releaseNotes : null } : null} />
}
