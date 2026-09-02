import { Header } from "@/components/layout/Header"
import { LiveCheckoutStatusClient } from "@/components/checkout/LiveCheckoutStatusClient"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export const dynamic = "force-dynamic"

export default async function LiveCheckoutStatusPage({ searchParams }: Props) {
  const params = await searchParams
  return (
    <div className="min-h-screen bg-[#05080d] text-white">
      <Header />
      <LiveCheckoutStatusClient
        orderId={single(params.orderId)?.trim() ?? ""}
      />
    </div>
  )
}
