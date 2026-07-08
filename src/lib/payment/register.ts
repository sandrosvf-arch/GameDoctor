import { registerPaymentGateway } from "@/lib/payment"
import { mercadoPagoGateway } from "@/lib/payment/providers/mercadopago"
import { pagarmeGateway } from "@/lib/payment/providers/pagarme"
import { stripeGateway } from "@/lib/payment/providers/stripe"

let registered = false

export function ensurePaymentGatewaysRegistered() {
  if (registered) return

  registerPaymentGateway("MERCADOPAGO", mercadoPagoGateway)
  registerPaymentGateway("PAGARME", pagarmeGateway)
  registerPaymentGateway("STRIPE", stripeGateway)

  registered = true
}
