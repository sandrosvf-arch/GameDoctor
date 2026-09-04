import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"

export const DOWNLOADS_FOLDER = "downloads"
export const MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024

export function getDownloadStorageAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_DOWNLOADS_BUCKET || process.env.SUPABASE_STORAGE_BUCKET

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new Error("Supabase Storage não está configurado.")
  }

  return {
    bucket,
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  }
}

export function normalizeStorageSegment(value: string, fallback: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)

  return normalized || fallback
}

export function createDownloadStoragePath(category: string | null, fileName: string) {
  const safeCategory = normalizeStorageSegment(category ?? "geral", "geral")
  const safeFileName = normalizeStorageSegment(fileName, "material")
  return `${DOWNLOADS_FOLDER}/${safeCategory}/${Date.now()}-${randomUUID()}-${safeFileName}`
}

export function isDownloadStoragePath(path: string) {
  return path.startsWith(`${DOWNLOADS_FOLDER}/`) && !path.includes("..")
}
