import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { buildCatalogTree } from "@/lib/catalog"

export async function GET() {
  const categories = await db.catalogCategory.findMany({
    where: { status: "ACTIVE", showInMenu: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
      order: true,
      status: true,
      showInMenu: true,
    },
  })

  return NextResponse.json(buildCatalogTree(categories))
}
