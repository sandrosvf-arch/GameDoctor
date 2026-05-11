// TODO: Fase 2 — Checkout
// Campos: nome, e-mail, CPF, telefone, cupom, forma de pagamento (Pix | Cartão)
// Fluxo Pix: gera QR Code → aguarda webhook → libera acesso
// Fluxo Cartão: tokenização via gateway → processa → libera acesso
export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-8">Finalizar compra</h1>
      {/* TODO: formulário de checkout com resumo do pedido e formas de pagamento */}
    </main>
  )
}
