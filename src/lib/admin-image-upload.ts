export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", folder)

  const response = await fetch("/api/admin/uploads/image", {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível enviar a imagem.")
  }

  if (!payload.url) {
    throw new Error("A imagem foi enviada, mas a URL não foi retornada.")
  }

  return payload.url
}