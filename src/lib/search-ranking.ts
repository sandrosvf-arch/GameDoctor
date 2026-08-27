export type SearchMatchType = "exact" | "related"

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function scoreSearchText(text: string | null | undefined, query: string, terms: string[]) {
  if (!text) return 0
  const normalizedText = normalizeSearchText(text)
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedText || !normalizedQuery) return 0
  if (normalizedText === normalizedQuery) return 120
  if (normalizedText.startsWith(normalizedQuery)) return 100
  if (normalizedText.includes(normalizedQuery)) return 80
  const matched = terms.filter((term) => normalizedText.includes(term)).length
  return terms.length > 0 ? (matched / terms.length) * 40 : 0
}

export function classifySearchMatch(query: string, fields: Array<string | null | undefined>): SearchMatchType {
  const normalizedQuery = normalizeSearchText(query)
  return normalizedQuery && fields.some((field) => normalizeSearchText(field ?? "").includes(normalizedQuery))
    ? "exact"
    : "related"
}

export function compareRankedSearchResults(
  left: { matchType: SearchMatchType; score: number },
  right: { matchType: SearchMatchType; score: number },
) {
  if (left.matchType !== right.matchType) return left.matchType === "exact" ? -1 : 1
  return right.score - left.score
}
