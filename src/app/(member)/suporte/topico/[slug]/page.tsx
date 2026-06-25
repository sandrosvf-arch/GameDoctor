import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { HelpCenterClient } from "@/components/help/HelpCenterClient"

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [categories, article] = await Promise.all([
    db.helpCategory.findMany({
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
    }),
    db.helpArticle.findFirst({
      where: {
        slug,
        status: "ACTIVE",
        category: { status: "ACTIVE" },
      },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    }),
  ])

  if (!article) {
    notFound()
  }

  return (
    <HelpCenterClient
      categories={categories}
      initialCategorySlug={article.category.slug}
      article={article}
    />
  )
}
