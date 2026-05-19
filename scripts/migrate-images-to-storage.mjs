/**
 * Script de migração: base64 → Supabase Storage
 *
 * Uso:
 *   node scripts/migrate-images-to-storage.mjs
 *
 * O script detecta campos com "data:image/..." e faz upload para o Supabase Storage,
 * depois atualiza o banco com a URL pública.
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ── Configuração ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function isBase64(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

/**
 * Extrai tipo MIME e dados binários de um data URL base64.
 * Retorna { mimeType, buffer } ou null se inválido.
 */
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function mimeToExtension(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
  };
  return map[mimeType] ?? "jpg";
}

/**
 * Faz upload de um base64 para o Supabase Storage e retorna a URL pública.
 */
async function uploadBase64(dataUrl, folder) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Data URL inválida");

  const { mimeType, buffer } = parsed;
  const ext = mimeToExtension(mimeType);
  const filePath = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(filePath, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Supabase upload error: ${error.message}`);

  const { data } = supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ── Migração por modelo ───────────────────────────────────────────────────────

async function migrateLessons() {
  const lessons = await prisma.lesson.findMany({
    where: { thumbnail: { startsWith: "data:image/" } },
    select: { id: true, thumbnail: true },
  });

  console.log(`\n📚 Lessons com base64: ${lessons.length}`);

  for (const lesson of lessons) {
    try {
      const url = await uploadBase64(lesson.thumbnail, "lessons");
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { thumbnail: url },
      });
      console.log(`  ✅ Lesson ${lesson.id} → ${url}`);
    } catch (err) {
      console.error(`  ❌ Lesson ${lesson.id}: ${err.message}`);
    }
  }
}

async function migrateCourses() {
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { coverImage: { startsWith: "data:image/" } },
        { bannerImage: { startsWith: "data:image/" } },
      ],
    },
    select: { id: true, coverImage: true, bannerImage: true },
  });

  console.log(`\n🎓 Courses com base64: ${courses.length}`);

  for (const course of courses) {
    try {
      const data = {};

      if (isBase64(course.coverImage)) {
        data.coverImage = await uploadBase64(course.coverImage, "courses/cover");
        console.log(`  ✅ Course ${course.id} coverImage → ${data.coverImage}`);
      }

      if (isBase64(course.bannerImage)) {
        data.bannerImage = await uploadBase64(course.bannerImage, "courses/banner");
        console.log(`  ✅ Course ${course.id} bannerImage → ${data.bannerImage}`);
      }

      if (Object.keys(data).length > 0) {
        await prisma.course.update({ where: { id: course.id }, data });
      }
    } catch (err) {
      console.error(`  ❌ Course ${course.id}: ${err.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Iniciando migração de imagens base64 → Supabase Storage");
  console.log(`   Bucket: ${SUPABASE_STORAGE_BUCKET}`);
  console.log(`   URL: ${SUPABASE_URL}`);

  await migrateLessons();
  await migrateCourses();

  console.log("\n✅ Migração concluída!");
}

main()
  .catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
