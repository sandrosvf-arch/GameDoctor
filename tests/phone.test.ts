import assert from "node:assert/strict"
import { isValidBrazilianPhone, normalizeBrazilianPhone } from "../src/lib/phone"

assert.equal(normalizeBrazilianPhone("+55 (41) 99999-9999"), "41999999999")
assert.equal(isValidBrazilianPhone("(41) 99999-9999"), true)
assert.equal(isValidBrazilianPhone("(11) 3333-4444"), true)
assert.equal(isValidBrazilianPhone("(00) 99999-9999"), false)
assert.equal(isValidBrazilianPhone("(41) 89999-9999"), false)
assert.equal(isValidBrazilianPhone("11111111111"), false)

console.log("Validação de telefone brasileiro aprovada.")
