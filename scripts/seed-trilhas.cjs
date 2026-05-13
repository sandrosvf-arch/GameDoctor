/**
 * Seed: cria as trilhas e aulas com os mesmos dados estáticos da home page.
 * node scripts/seed-trilhas.cjs
 */
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

const BUNNY_CDN = 'vz-38444944-922.b-cdn.net'
const BUNNY_LIB = '659969'

function bunnyFields(videoId) {
  return {
    videoProvider: 'BUNNY',
    videoProviderId: videoId,
    videoEmbedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${videoId}?autoplay=false&responsive=true`,
    videoPlaybackUrl: `https://${BUNNY_CDN}/${videoId}/playlist.m3u8`,
    videoThumbnailUrl: `https://${BUNNY_CDN}/${videoId}/thumbnail.jpg`,
  }
}

// Converte duração em string para segundos
function parseDuration(str) {
  let secs = 0
  const h = str.match(/(\d+)\s*h/)
  const m = str.match(/(\d+)\s*min/)
  const s = str.match(/(\d+)\s*s/)
  if (h) secs += parseInt(h[1]) * 3600
  if (m) secs += parseInt(m[1]) * 60
  if (s) secs += parseInt(s[1])
  return secs || null
}

const trilhas = [
  {
    title: 'Início da Jornada',
    slug: 'inicio-da-jornada',
    shortDescription: 'Comece aqui — introdução à manutenção de consoles',
    status: 'PUBLISHED',
    lessons: [
      {
        title: 'Introdução',
        description: 'Início da Jornada',
        duration: '1 min 56 s',
        badge: 'FREE',
        isFree: true,
        bunnyId: '09038255-7c3d-495b-8155-c71c7516a13e',
      },
    ],
  },
  {
    title: 'PlayStation 5',
    slug: 'playstation-5',
    shortDescription: 'Diagnóstico e reparo completo do PS5',
    status: 'PUBLISHED',
    lessons: [
      { title: 'Diagnostico Completo PS5',   description: 'PlayStation 5', duration: '18 min',   badge: 'FREE', isFree: true,  thumbnail: '/thumbs/t02.jpg' },
      { title: 'Troca de Pasta Termica',     description: 'PlayStation 5', duration: '32 min',   badge: 'NEW',  isFree: false, thumbnail: '/thumbs/t03.jpg' },
      { title: 'Erro CE-108255 e CE-107891', description: 'PlayStation 5', duration: '45 min',                  isFree: false, thumbnail: '/thumbs/t04.jpg' },
      { title: 'Troca do Leitor de Disco',   description: 'PlayStation 5', duration: '28 min',                  isFree: false, thumbnail: '/thumbs/t05.jpg' },
      { title: 'Solda BGA no PS5',           description: 'PlayStation 5', duration: '1h 12min', badge: 'PRO',  isFree: false, thumbnail: '/thumbs/t06.jpg' },
      { title: 'Reparo da Fonte PS5',        description: 'PlayStation 5', duration: '52 min',                  isFree: false, thumbnail: '/thumbs/t07.jpg' },
    ],
  },
  {
    title: 'Xbox Series X|S',
    slug: 'xbox-series-xs',
    shortDescription: 'Reparo e manutenção do Xbox Series X e S',
    status: 'PUBLISHED',
    lessons: [
      { title: 'Diagnostico Xbox Series X', description: 'Xbox Series X|S', duration: '22 min',  badge: 'FREE', isFree: true,  thumbnail: '/thumbs/t08.jpg' },
      { title: 'Troca Porta HDMI Xbox',     description: 'Xbox Series X|S', duration: '35 min',  badge: 'NEW',  isFree: false, thumbnail: '/thumbs/t09.jpg' },
      { title: 'Erro E101 / E102 Xbox',     description: 'Xbox Series X|S', duration: '40 min',                 isFree: false, thumbnail: '/thumbs/t10.jpg' },
      { title: 'Desmontagem Xbox Series S', description: 'Xbox Series X|S', duration: '18 min',                 isFree: false, thumbnail: '/thumbs/t11.jpg' },
      { title: 'Solda BGA Xbox Series X',   description: 'Xbox Series X|S', duration: '58 min',  badge: 'PRO',  isFree: false, thumbnail: '/thumbs/t12.jpg' },
    ],
  },
  {
    title: 'Nintendo Switch',
    slug: 'nintendo-switch',
    shortDescription: 'Conserto de Joy-Con, tela e muito mais',
    status: 'PUBLISHED',
    lessons: [
      { title: 'Joy-Con Drift - Solucao',    description: 'Nintendo Switch', duration: '15 min',   badge: 'FREE', isFree: true,  thumbnail: '/thumbs/t13.jpg' },
      { title: 'Troca da Tela Switch OLED',  description: 'Nintendo Switch', duration: '38 min',   badge: 'NEW',  isFree: false, thumbnail: '/thumbs/t14.jpg' },
      { title: 'Switch Sem Imagem',          description: 'Nintendo Switch', duration: '42 min',                  isFree: false, thumbnail: '/thumbs/t15.jpg' },
      { title: 'Solda BGA Nintendo Switch',  description: 'Nintendo Switch', duration: '1h 05min', badge: 'PRO',  isFree: false, thumbnail: '/thumbs/t16.jpg' },
      { title: 'Limpeza e Manutencao Switch',description: 'Nintendo Switch', duration: '20 min',                  isFree: false, thumbnail: '/thumbs/t17.jpg' },
    ],
  },
  {
    title: 'Fundamentos de Eletronica',
    slug: 'fundamentos-de-eletronica',
    shortDescription: 'Ferramentas e técnicas essenciais para iniciantes',
    status: 'PUBLISHED',
    lessons: [
      { title: 'Uso do Multimetro',                   description: 'Fundamentos de Eletronica', duration: '25 min',   badge: 'FREE', isFree: true,  thumbnail: '/thumbs/t18.jpg' },
      { title: 'Estacao de Solda - Primeiros Passos', description: 'Fundamentos de Eletronica', duration: '45 min',                  isFree: false, thumbnail: '/thumbs/t19.jpg' },
      { title: 'Identificando Componentes',           description: 'Fundamentos de Eletronica', duration: '32 min',                  isFree: false, thumbnail: '/thumbs/t20.jpg' },
      { title: 'Tecnicas de Solda SMD',               description: 'Fundamentos de Eletronica', duration: '1h 20min', badge: 'PRO',  isFree: false, thumbnail: '/thumbs/t21.jpg' },
      { title: 'Como Usar o Microscopio',             description: 'Fundamentos de Eletronica', duration: '28 min',                  isFree: false, thumbnail: '/thumbs/t01.jpg' },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding trilhas...\n')

  for (const trilha of trilhas) {
    // Upsert course by slug
    const existing = await db.course.findUnique({ where: { slug: trilha.slug } })
    let course
    if (existing) {
      console.log(`⏭  Trilha já existe: "${trilha.title}" — pulando criação`)
      course = existing
    } else {
      course = await db.course.create({
        data: {
          title: trilha.title,
          slug: trilha.slug,
          shortDescription: trilha.shortDescription,
          status: trilha.status,
        },
      })
      console.log(`✅ Criou trilha: "${trilha.title}" (${course.id})`)
    }

    // Check existing lessons for this course
    const existingLessons = await db.lesson.findMany({ where: { courseId: course.id } })
    if (existingLessons.length > 0) {
      console.log(`   ⏭  Já tem ${existingLessons.length} aula(s) — pulando`)
      continue
    }

    for (let i = 0; i < trilha.lessons.length; i++) {
      const l = trilha.lessons[i]
      const secs = parseDuration(l.duration)

      const videoFields = l.bunnyId
        ? bunnyFields(l.bunnyId)
        : { videoThumbnailUrl: l.thumbnail ?? null }

      await db.lesson.create({
        data: {
          courseId: course.id,
          title: l.title,
          description: l.description ?? null,
          isFree: l.isFree ?? false,
          order: i,
          status: 'PUBLISHED',
          videoDurationSeconds: secs,
          ...videoFields,
        },
      })
      console.log(`   ✅ Aula ${i + 1}: "${l.title}" (${l.duration})`)
    }
  }

  console.log('\n✨ Seed concluído!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
