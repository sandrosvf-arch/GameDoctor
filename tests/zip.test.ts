import assert from "node:assert/strict"
import { createZip } from "../src/lib/zip"

const archive = createZip([{ name: "aula-com-acento.md", content: "Olá, GameDoctor!" }])

assert.equal(archive.readUInt32LE(0), 0x04034b50)
assert.equal(archive.readUInt32LE(archive.length - 22), 0x06054b50)
assert.ok(archive.includes(Buffer.from("Olá, GameDoctor!", "utf8")))

console.log("ZIP válido gerado com conteúdo UTF-8.")
