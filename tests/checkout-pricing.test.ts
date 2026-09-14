import assert from "node:assert/strict"
import { getCardEstimate } from "../src/lib/checkout"

assert.deepEqual(getCardEstimate(614.4, 12, 614.4, 750), {
  total: 750,
  installmentAmount: 62.5,
})

assert.deepEqual(getCardEstimate(614.4, 10, 614.4, 697), {
  total: 697,
  installmentAmount: 69.7,
})

assert.deepEqual(getCardEstimate(97, 1), {
  total: 97,
  installmentAmount: 97,
})

console.log("Cálculos de preço e parcelamento do checkout validados.")
