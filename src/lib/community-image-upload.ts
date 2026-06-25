const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024

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
        if (width >= height) {
          height = Math.round((height / width) * maxDim)
          width = maxDim
        } else {
          width = Math.round((width / height) * maxDim)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      canvas.getContext("2d")?.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }

          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }))
        },
        "image/jpeg",
        0.82
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export interface CommunityUploadedImage {
  id?: string
  url: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export async function uploadCommunityImage(file: File): Promise<CommunityUploadedImage> {
  const toUpload = await compressImageFile(file)

  const formData = new FormData()
  formData.append("file", toUpload)

  const response = await fetch("/api/comunidade/uploads/image", {
    method: "POST",
    body: formData,
  })

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string
    fileName?: string
    mimeType?: string
    sizeBytes?: number
    error?: string
  }

  if (!response.ok) {
    throw new Error(payload.error ?? `Erro ${response.status} ao enviar imagem.`)
  }

  if (!payload.url || !payload.fileName) {
    throw new Error("O anexo foi enviado, mas os dados nao retornaram corretamente.")
  }

  return {
    url: payload.url,
    fileName: payload.fileName,
    mimeType: payload.mimeType ?? toUpload.type,
    sizeBytes: payload.sizeBytes ?? toUpload.size,
  }
}
