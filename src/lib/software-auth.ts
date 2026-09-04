import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_TTL_SECONDS = 12 * 60 * 60

function getSecret() {
  const secret = process.env.GAME_DOCTOR_SOFTWARE_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("GAME_DOCTOR_SOFTWARE_SECRET precisa ter pelo menos 32 caracteres.")
  }
  return secret
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

export function createSoftwareToken(userId: string) {
  const payload = encode(JSON.stringify({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }))
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifySoftwareToken(token: string) {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expected = createHmac("sha256", getSecret()).update(payload).digest()
  const received = Buffer.from(signature, "base64url")
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  try {
    const data = JSON.parse(decode(payload)) as { sub?: unknown; exp?: unknown }
    if (typeof data.sub !== "string" || typeof data.exp !== "number" || data.exp <= Date.now() / 1000) return null
    return { userId: data.sub, expiresAt: new Date(data.exp * 1000) }
  } catch {
    return null
  }
}

export function getSoftwareBearer(request: Request) {
  const value = request.headers.get("authorization")
  if (!value?.startsWith("Bearer ")) return null
  return verifySoftwareToken(value.slice(7).trim())
}
