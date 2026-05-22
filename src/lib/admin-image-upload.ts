const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024 // 3.5 MB — safely under Vercel's 4.5 MB limit

async function compressImageFile(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement("canvas")
      let { width, height } = img
      const maxDim = 1920
      if (width > maxDim || height > maxDim) {
        if (width >= height) { height = Math.round((height / width) * maxDim); width = maxDim }
        else { width = Math.round((width / height) * maxDim); height = maxDim }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext("2d")?.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }))
        },
        "image/jpeg",
        0.82
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const toUpload = await compressImageFile(file)

  const formData = new FormData()
  formData.append("file", toUpload)
  formData.append("folder", folder)

  const response = await fetch("/api/admin/uploads/image", {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? `Erro ${response.status} ao enviar imagem.`)
  }

  if (!payload.url) {
    throw new Error("A imagem foi enviada, mas a URL não foi retornada.")
  }

  return payload.url
}