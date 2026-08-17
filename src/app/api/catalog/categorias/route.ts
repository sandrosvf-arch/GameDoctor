import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { buildCatalogTree, resolveCatalogCategoryTargetCourseSlug } from "@/lib/catalog"

export const revalidate = 300

const getCatalogCategoriesForMenu = unstable_cache(async () => {
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
      courseCategories: {
        where: { course: { status: "PUBLISHED" } },
        select: { course: { select: { slug: true } } },
      },
    },
  })

  const categoriesWithTargets = categories.map(({ courseCategories, ...category }) => ({
    ...category,
    targetCourseSlug: resolveCatalogCategoryTargetCourseSlug({ ...category, courseCategories }),
  }))

  return buildCatalogTree(categoriesWithTargets)
}, ["catalog-categories-menu"], { revalidate: 300 })

export async function GET() {
  const tree = await getCatalogCategoriesForMenu()

  return NextResponse.json(tree, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    },
  })
}
