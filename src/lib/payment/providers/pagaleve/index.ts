type PagaleveAuthResponse = {
  access_token?: string
  accessToken?: string
  token?: string
  expires_in?: number
  expiresIn?: number
  data?: PagaleveAuthResponse
}

export type PagaleveAddress = {
  postalCode: string
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
}

export type PagaleveCheckout = {
  id?: string
  checkout_id?: string
  checkout_url?: string
  redirect_checkout_url?: string
  state?: string
  status?: string
  amount?: number
  reference?: string
  orderReference?: string
  order_reference?: string
  type?: string
  metadata?: {
    orderId?: string
    userId?: string
    [key: string]: unknown
  }
  order?: {
    reference?: string
    amount?: number
  }
}

export type PagalevePayment = {
  id?: string
  payment_id?: string
  state?: string
  status?: string
  amount?: number
  reference?: string
}

let tokenCache: { value: string; expiresAt: number } | null = null

function getPagaleveBaseUrl() {
  const environment = process.env.PAGALEVE_ENVIRONMENT?.trim().toLowerCase()
  return environment === "production" || environment === "prod"
    ? "https://api.pagaleve.com.br"
    : "https://sandbox-api.pagaleve.io"
}

function getCredentials() {
  const username = process.env.PAGALEVE_USERNAME?.trim()
  const password = process.env.PAGALEVE_PASSWORD?.trim()

  if (!username || !password) {
    throw new Error("As credenciais da Pagaleve não estão configuradas.")
  }

  return { username, password }
}

async function readResponse(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function getErrorMessage(payload: unknown, status: number) {
  function collectMessages(value: unknown, depth = 0): string[] {
    if (depth > 3 || value === null || value === undefined) return []
    if (typeof value === "string") return value.trim() ? [value.trim()] : []
    if (Array.isArray(value)) return value.flatMap((item) => collectMessages(item, depth + 1))
    if (typeof value !== "object") return []

    const body = value as Record<string, unknown>
    return ["message", "error", "detail", "details", "errors", "validationErrors"]
      .flatMap((key) => collectMessages(body[key], depth + 1))
  }

  const messages = [...new Set(collectMessages(payload))]
  return messages.length > 0
    ? `Pagaleve (${status}): ${messages.join(" | ")}`
    : `Pagaleve (${status}): não foi possível concluir a solicitação.`
}

async function authenticatePagaleve() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value

  const response = await fetch(`${getPagaleveBaseUrl()}/v1/authentication`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getCredentials()),
    cache: "no-store",
  })
  const payload = await readResponse(response)

  if (!response.ok) throw new Error(getErrorMessage(payload, response.status))

  const auth = payload as PagaleveAuthResponse
  const directToken = typeof payload === "string" ? payload.trim() : ""
  const token = directToken.length >= 20 && !/[\s<>]/.test(directToken)
    ? directToken
    : auth?.access_token
      ?? auth?.accessToken
      ?? auth?.token
      ?? auth?.data?.access_token
      ?? auth?.data?.accessToken
      ?? auth?.data?.token

  if (!token) {
    const responseShape = payload && typeof payload === "object"
      ? Object.keys(payload as Record<string, unknown>).join(", ") || "objeto vazio"
      : typeof payload
    throw new Error(`A Pagaleve não retornou um token de acesso. Formato recebido: ${responseShape}.`)
  }

  const expiresIn = Math.max(60, Number(
    auth.expires_in
    ?? auth.expiresIn
    ?? auth.data?.expires_in
    ?? auth.data?.expiresIn
    ?? 3600
  ))
  tokenCache = {
    value: token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  }

  return tokenCache.value
}

async function pagaleveRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await authenticatePagaleve()
  const subsidiaryId = process.env.PAGALEVE_SUBSIDIARY_ID?.trim()
  const headers = new Headers(init.headers)
  headers.set("Accept", "application/json")
  headers.set("Content-Type", "application/json")
  headers.set("Authorization", `Bearer ${token}`)
  if (subsidiaryId) headers.set("Subsidiary-Id", subsidiaryId)

  const response = await fetch(`${getPagaleveBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  })

  if (response.status === 401 && retry) {
    tokenCache = null
    return pagaleveRequest<T>(path, init, false)
  }

  const payload = await readResponse(response)
  if (!response.ok) throw new Error(getErrorMessage(payload, response.status))

  return (payload ?? {}) as T
}

function toApiAddress(address: PagaleveAddress, phone: string) {
  return {
    name: "Endereço de cobrança",
    street: address.street,
    number: address.number,
    complement: address.complement || undefined,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zip_code: address.postalCode,
    phone_number: phone,
  }
}

export function getPagaleveCheckoutId(checkout: PagaleveCheckout) {
  return String(checkout.checkout_id ?? checkout.id ?? "").trim()
}

export function getPagaleveCheckoutUrl(checkout: PagaleveCheckout) {
  const value = String(checkout.checkout_url ?? checkout.redirect_checkout_url ?? "").trim()
  if (!value) return ""

  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : ""
  } catch {
    return ""
  }
}

export function getPagaleveCheckoutState(checkout: PagaleveCheckout) {
  return String(checkout.state ?? checkout.status ?? "").trim().toUpperCase()
}

export function getPagaleveOrderReference(checkout: PagaleveCheckout) {
  return String(
    checkout.orderReference
    ?? checkout.order_reference
    ?? checkout.order?.reference
    ?? checkout.reference
    ?? ""
  ).trim()
}

export function getPagaleveCheckoutAmount(checkout: PagaleveCheckout) {
  const value = Number(checkout.amount ?? checkout.order?.amount)
  return Number.isFinite(value) ? value : null
}

export function getPagalevePaymentId(payment: PagalevePayment) {
  return String(payment.payment_id ?? payment.id ?? "").trim()
}

export async function createPagaleveCheckout(input: {
  orderId: string
  userId: string
  amountInCents: number
  description: string
  sku: string
  shopper: {
    name: string
    email: string
    phone: string
    cpf: string
    billingAddress: PagaleveAddress
  }
  approveUrl: string
  cancelUrl: string
  webhookUrl: string
  idempotencyKey: string
}) {
  const nameParts = input.shopper.name.trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts.shift() || "Aluno"
  const lastName = nameParts.join(" ") || firstName
  const address = toApiAddress(input.shopper.billingAddress, input.shopper.phone)

  return pagaleveRequest<PagaleveCheckout>("/v1/checkouts", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      approve_url: input.approveUrl,
      cancel_url: input.cancelUrl,
      webhook_url: input.webhookUrl,
      is_pix_upfront: false,
      reference: input.orderId,
      metadata: { orderId: input.orderId, userId: input.userId },
      order: {
        reference: input.orderId,
        amount: input.amountInCents,
        description: input.description,
        items: [{
          name: input.description,
          price: input.amountInCents,
          quantity: 1,
          sku: input.sku,
        }],
        shipping: {
          amount: 0,
          pickup: true,
          address,
        },
      },
      shopper: {
        first_name: firstName,
        last_name: lastName,
        email: input.shopper.email,
        phone: input.shopper.phone,
        cpf: input.shopper.cpf,
        billing_address: address,
      },
    }),
  })
}

export async function getPagaleveCheckout(checkoutId: string) {
  return pagaleveRequest<PagaleveCheckout>(`/v1/checkouts/${encodeURIComponent(checkoutId)}`)
}

export async function capturePagaleveCheckout(input: {
  checkoutId: string
  orderId: string
  amountInCents: number
}) {
  return pagaleveRequest<PagalevePayment>("/v1/payments", {
    method: "POST",
    headers: { "Idempotency-Key": `capture-${input.orderId}` },
    body: JSON.stringify({
      amount: input.amountInCents,
      checkout_id: input.checkoutId,
      currency: "BRL",
      intent: "CAPTURE",
      reference: input.orderId,
    }),
  })
}

export async function getPagalevePayment(paymentId: string) {
  return pagaleveRequest<PagalevePayment>(`/v1/payments/${encodeURIComponent(paymentId)}`)
}
