import assert from "node:assert/strict"
import {
  classifySearchMatch,
  compareRankedSearchResults,
  normalizeSearchText,
  scoreSearchText,
} from "../src/lib/search-ranking"

assert.equal(normalizeSearchText("  Erro E100: Xbox! "), "erro e100 xbox")
assert.equal(classifySearchMatch("ERRO E100", ["Como resolver o erro E100 no Xbox"]), "exact")
assert.equal(classifySearchMatch("ERRO E100", ["Erros comuns no Xbox", "Código E100"]), "related")
assert.ok(scoreSearchText("Erro E100", "erro e100", ["erro", "e100"]) > scoreSearchText("Erros comuns", "erro e100", ["erro", "e100"]))

const ranked = [
  { matchType: "related" as const, score: 200 },
  { matchType: "exact" as const, score: 80 },
].sort(compareRankedSearchResults)
assert.equal(ranked[0].matchType, "exact")

console.log("Ordenação da busca validada.")
