import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { DEFAULT_CATALOG_CATEGORIES, getSuggestedCategorySlugsForCourse } from "@/lib/catalog"

async function requireAdmin() {
  const session = await auth()
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return null
  }
  return session
}

export async function POST() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = new Map<string, string>()

  for (const item of DEFAULT_CATALOG_CATEGORIES.filter((entry) => entry.parentSlug === null)) {
    const category = await db.catalogCategory.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description ?? null,
        order: item.order,
        status: "ACTIVE",
        showInMenu: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description ?? null,
        order: item.order,
        status: "ACTIVE",
        showInMenu: true,
      },
    })
    existing.set(item.slug, category.id)
  }

  for (const item of DEFAULT_CATALOG_CATEGORIES.filter((entry) => entry.parentSlug !== null)) {
    const parentId = existing.get(item.parentSlug!)
    if (!parentId) continue

    const category = await db.catalogCategory.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description ?? null,
        parentId,
        order: item.order,
        status: "ACTIVE",
        showInMenu: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description ?? null,
        parentId,
        order: item.order,
        status: "ACTIVE",
        showInMenu: true,
      },
    })
    existing.set(item.slug, category.id)
  }

  const courses = await db.course.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      courseCategories: { select: { categoryId: true } },
    },
  })

  for (const course of courses) {
    if (course.courseCategories.length > 0) continue
    const suggestedSlugs = getSuggestedCategorySlugsForCourse(course)
    const categoryIds = suggestedSlugs
      .map((slug) => existing.get(slug))
      .filter((value): value is string => Boolean(value))

    if (categoryIds.length === 0) continue

    await db.course.update({
      where: { id: course.id },
      data: {
        courseCategories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    })
  }

  return NextResponse.json({ ok: true, count: existing.size })
}
