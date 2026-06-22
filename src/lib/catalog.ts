export type CatalogCategoryStatus = "ACTIVE" | "INACTIVE"

export interface CatalogCategoryRecord {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  order: number
  status: CatalogCategoryStatus
  showInMenu: boolean
}

export interface CatalogCategoryNode extends CatalogCategoryRecord {
  children: CatalogCategoryNode[]
}

export interface DefaultCatalogCategoryInput {
  name: string
  slug: string
  parentSlug: string | null
  order: number
  description?: string
}

export const DEFAULT_CATALOG_CATEGORIES: DefaultCatalogCategoryInput[] = [
  { name: "Fundamentos", slug: "fundamentos", parentSlug: null, order: 0 },
  { name: "Inicio da Jornada", slug: "inicio-da-jornada", parentSlug: "fundamentos", order: 0 },
  { name: "Conhecendo Professor e Ferramentas", slug: "conhecendo-professor-e-ferramentas", parentSlug: "fundamentos", order: 1 },
  { name: "Eletronica Basica", slug: "eletronica-basica", parentSlug: "fundamentos", order: 2 },
  { name: "Micro Solda", slug: "micro-solda", parentSlug: "fundamentos", order: 3 },
  { name: "Ferramental", slug: "ferramental", parentSlug: "fundamentos", order: 4 },
  { name: "Softwares", slug: "softwares", parentSlug: "fundamentos", order: 5 },
  { name: "Administracao", slug: "administracao", parentSlug: "fundamentos", order: 6 },
  { name: "Manutencao Geral", slug: "manutencao-geral", parentSlug: "fundamentos", order: 7 },

  { name: "PlayStation", slug: "playstation", parentSlug: null, order: 1 },
  { name: "PlayStation 2", slug: "playstation-2", parentSlug: "playstation", order: 0 },
  { name: "PlayStation 3", slug: "playstation-3", parentSlug: "playstation", order: 1 },
  { name: "PlayStation 4", slug: "playstation-4", parentSlug: "playstation", order: 2 },
  { name: "PlayStation 5", slug: "playstation-5", parentSlug: "playstation", order: 3 },
  { name: "PlayStation Portateis", slug: "playstation-portateis", parentSlug: "playstation", order: 4 },

  { name: "Xbox", slug: "xbox", parentSlug: null, order: 2 },
  { name: "Xbox 360", slug: "xbox-360", parentSlug: "xbox", order: 0 },
  { name: "Xbox One", slug: "xbox-one", parentSlug: "xbox", order: 1 },
  { name: "Xbox Series X|S", slug: "xbox-series-xs", parentSlug: "xbox", order: 2 },

  { name: "Nintendo", slug: "nintendo", parentSlug: null, order: 3 },
  { name: "Game Boy", slug: "game-boy", parentSlug: "nintendo", order: 0 },
  { name: "Super Nintendo", slug: "super-nintendo", parentSlug: "nintendo", order: 1 },
  { name: "Nintendo Wii", slug: "nintendo-wii", parentSlug: "nintendo", order: 2 },
  { name: "Nintendo WiiU", slug: "nintendo-wiiu", parentSlug: "nintendo", order: 3 },
  { name: "Nintendo 3DS", slug: "nintendo-3ds", parentSlug: "nintendo", order: 4 },
  { name: "Nintendo Switch", slug: "nintendo-switch", parentSlug: "nintendo", order: 5 },
  { name: "Nintendo Switch 2", slug: "nintendo-switch-2", parentSlug: "nintendo", order: 6 },

  { name: "Controles", slug: "controles", parentSlug: null, order: 4 },
  { name: "Controles em Geral", slug: "controles-em-geral", parentSlug: "controles", order: 0 },

  { name: "Outros", slug: "outros", parentSlug: null, order: 5 },
  { name: "ROG Ally", slug: "rog-ally", parentSlug: "outros", order: 0 },
]

export function slugifyCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function normalizeMatchValue(value: string) {
  return slugifyCatalogName(value).replace(/-/g, " ")
}

export function getSuggestedCategorySlugsForCourse(course: { title: string; slug: string }) {
  const probe = `${normalizeMatchValue(course.title)} ${normalizeMatchValue(course.slug)}`
  const suggestions = new Set<string>()

  if (probe.includes("inicio da jornada")) suggestions.add("inicio-da-jornada")
  if (probe.includes("conhecendo professor e ferramentas")) suggestions.add("conhecendo-professor-e-ferramentas")
  if (probe.includes("eletronica basica")) suggestions.add("eletronica-basica")
  if (probe.includes("micro solda")) suggestions.add("micro-solda")
  if (probe.includes("ferramental")) suggestions.add("ferramental")
  if (probe.includes("software")) suggestions.add("softwares")
  if (probe.includes("administracao")) suggestions.add("administracao")
  if (probe.includes("manutencao geral")) suggestions.add("manutencao-geral")

  if (probe.includes("playstation 5")) suggestions.add("playstation-5")
  if (probe.includes("playstation 4")) suggestions.add("playstation-4")
  if (probe.includes("playstation 3")) suggestions.add("playstation-3")
  if (probe.includes("playstation 2")) suggestions.add("playstation-2")
  if (probe.includes("playstation portate")) suggestions.add("playstation-portateis")

  if (probe.includes("xbox series")) suggestions.add("xbox-series-xs")
  if (probe.includes("xbox one")) suggestions.add("xbox-one")
  if (probe.includes("xbox 360")) suggestions.add("xbox-360")

  if (probe.includes("nintendo switch 2")) suggestions.add("nintendo-switch-2")
  if (probe.includes("nintendo switch")) suggestions.add("nintendo-switch")
  if (probe.includes("nintendo 3ds")) suggestions.add("nintendo-3ds")
  if (probe.includes("nintendo wiiu")) suggestions.add("nintendo-wiiu")
  if (probe.includes("nintendo wii")) suggestions.add("nintendo-wii")
  if (probe.includes("game boy")) suggestions.add("game-boy")
  if (probe.includes("super nintendo")) suggestions.add("super-nintendo")

  if (probe.includes("controle")) suggestions.add("controles-em-geral")
  if (probe.includes("rog ally")) suggestions.add("rog-ally")

  if (["playstation-5", "playstation-4", "playstation-3", "playstation-2", "playstation-portateis"].some((slug) => suggestions.has(slug))) {
    suggestions.add("playstation")
  }
  if (["xbox-series-xs", "xbox-one", "xbox-360"].some((slug) => suggestions.has(slug))) {
    suggestions.add("xbox")
  }
  if (["game-boy", "super-nintendo", "nintendo-wii", "nintendo-wiiu", "nintendo-3ds", "nintendo-switch", "nintendo-switch-2"].some((slug) => suggestions.has(slug))) {
    suggestions.add("nintendo")
  }
  if (["inicio-da-jornada", "conhecendo-professor-e-ferramentas", "eletronica-basica", "micro-solda", "ferramental", "softwares", "administracao", "manutencao-geral"].some((slug) => suggestions.has(slug))) {
    suggestions.add("fundamentos")
  }
  if (suggestions.has("controles-em-geral")) {
    suggestions.add("controles")
  }
  if (suggestions.has("rog-ally")) {
    suggestions.add("outros")
  }

  return Array.from(suggestions)
}

export function buildCatalogTree<T extends CatalogCategoryRecord>(items: T[]): CatalogCategoryNode[] {
  const sorted = [...items].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  const nodes = new Map<string, CatalogCategoryNode>()

  for (const item of sorted) {
    nodes.set(item.id, { ...item, children: [] })
  }

  const roots: CatalogCategoryNode[] = []

  for (const item of sorted) {
    const node = nodes.get(item.id)!
    if (item.parentId) {
      const parent = nodes.get(item.parentId)
      if (parent) parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
