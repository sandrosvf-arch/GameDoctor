import fs from "node:fs/promises"
import path from "node:path"

const apiUrl = (process.env.GAME_DOCTOR_API_URL || "https://gamedoctor.vercel.app").replace(/\/$/, "")
const token = process.env.SOFTWARE_RELEASE_TOKEN?.trim()
const filePath = process.env.SOFTWARE_RELEASE_FILE || process.argv[2]
const version = process.env.SOFTWARE_RELEASE_VERSION || process.argv[3]
const releaseNotes = process.env.SOFTWARE_RELEASE_NOTES || ""

async function readJson<T>(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`A API respondeu HTTP ${response.status} sem JSON. Verifique se o deploy contém as rotas de publicação (${text.slice(0, 120).replace(/\s+/g, " ")}).`)
  }
}

async function main() {
  if (!token || !filePath || !version) throw new Error("Defina SOFTWARE_RELEASE_TOKEN, arquivo e versão.")

  const file = await fs.readFile(filePath)
  const fileName = path.basename(filePath)
  const headers = { "content-type": "application/json", "x-software-release-token": token }
  const uploadUrlResponse = await fetch(`${apiUrl}/api/software/releases/upload-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileName, sizeBytes: file.byteLength }),
  })
  const uploadData = await readJson<{ signedUrl?: string; path?: string; error?: string }>(uploadUrlResponse)
  if (!uploadUrlResponse.ok || !uploadData.signedUrl || !uploadData.path) throw new Error(uploadData.error || `Falha ao preparar publicação (${uploadUrlResponse.status}).`)

  const uploadResponse = await fetch(uploadData.signedUrl, {
    method: "PUT",
    headers: { "cache-control": "max-age=3600", "content-type": "application/zip", "x-upsert": "false" },
    body: file,
  })
  if (!uploadResponse.ok) {
    const details = (await uploadResponse.text().catch(() => "")).slice(0, 300).replace(/\s+/g, " ")
    throw new Error(`Falha ao enviar o arquivo (${uploadResponse.status}): ${details}`)
  }

  const releaseResponse = await fetch(`${apiUrl}/api/software/releases`, {
    method: "POST",
    headers,
    body: JSON.stringify({ version, releaseNotes, fileName, storagePath: uploadData.path, sizeBytes: file.byteLength }),
  })
  const releaseData = await readJson<{ release?: { id?: string }; error?: string }>(releaseResponse)
  if (!releaseResponse.ok) throw new Error(releaseData.error || `Falha ao registrar publicação (${releaseResponse.status}).`)
  console.log(`Versão ${version} publicada. Material: ${releaseData.release?.id || "ok"}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
