import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSoftwareDownloadAvailability } from "@/lib/access"
import { DownloadsClient, type DownloadMaterialItem } from "@/components/downloads/DownloadsClient"

export default async function DownloadsPage() {
  const session = await auth()
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR"
  const downloadAccess = isStaff
    ? { hasPlan: true, available: true, availableAt: null as Date | null }
    : session?.user?.id
      ? await getSoftwareDownloadAvailability(session.user.id)
      : { hasPlan: false, available: false, availableAt: null as Date | null }
  const canAccess = downloadAccess.hasPlan

  const [totalMaterials, materials] = await Promise.all([
    db.downloadMaterial.count({ where: { status: "ACTIVE" } }),
    canAccess
      ? db.downloadMaterial.findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ order: "asc" }, { category: "asc" }, { title: "asc" }],
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            type: true,
          },
        })
      : Promise.resolve([]),
  ])

  const serialized: DownloadMaterialItem[] = materials.map((material) => ({
    ...material,
    type: material.type,
  }))

  return (
    <DownloadsClient
      isLoggedIn={Boolean(session?.user?.id)}
      canAccess={canAccess}
      downloadAvailable={downloadAccess.available}
      downloadAvailableAt={downloadAccess.availableAt?.toISOString() ?? null}
      totalMaterials={totalMaterials}
      materials={serialized}
    />
  )
}
