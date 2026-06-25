import { db } from "@/lib/db"
import { HelpCenterClient } from "@/components/help/HelpCenterClient"

export default async function SupportPage() {
  const categories = await db.helpCategory.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      articles: {
        where: { status: "ACTIVE" },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
        },
      },
    },
  })

  return <HelpCenterClient categories={categories} initialCategorySlug={categories[0]?.slug} />
}
