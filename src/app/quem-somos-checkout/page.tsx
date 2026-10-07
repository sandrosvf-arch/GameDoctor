import type { Metadata } from "next"
import { QuemSomosLanding } from "@/components/quem-somos/QuemSomosLanding"

export const metadata: Metadata = {
  title: "Quem somos",
  description: "Conheça a história, autoridade e estrutura do GameDoctor.",
}

export default function QuemSomosCheckoutPage() {
  return <QuemSomosLanding ctaTarget="checkout" />
}
