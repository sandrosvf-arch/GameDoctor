import { randomUUID } from "crypto"

import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { auth } from "@/lib/auth"

function getFileExtension(file: File) {
  const mimeToExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  }

  if (mimeToExtension[file.type]) {
    return mimeToExtension[file.type]
  }

  const fromName = file.name.split(".").pop()?.toLowerCase()
  return fromName && fromName.length <= 5 ? fromName : "png"
}

function normalizeFolder(folder: string) {
  return folder.trim().replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "")
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET

  if (!supabaseUrl || !supabaseServiceRoleKey || !bucket) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const folder = normalizeFolder(String(formData.get("folder") ?? "uploads"))

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const extension = getFileExtension(file)
  const filePath = `${folder}/${Date.now()}-${randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    console.error("[admin/uploads/image] Supabase upload failed", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return NextResponse.json({ url: data.publicUrl })
}