import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HomePlan {
  name: string
  price: string
  period: string
  badge?: string
  highlight: boolean
  features: string[]
}

export function HomePlansSection({ plans }: { plans: HomePlan[] }) {
  return (
    <section id="planos" className="py-20 border-t border-zinc-900">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-3">Escolha seu plano</h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Comece com as aulas gratuitas. Faca upgrade quando estiver pronto.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl border p-7 flex flex-col",
                plan.highlight
                  ? "border-cyan-500/40 bg-gradient-to-b from-cyan-500/8 to-transparent shadow-xl shadow-cyan-500/10"
                  : "border-zinc-800 bg-zinc-900/40",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-zinc-950 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-3xl font-black">{plan.price}</span>
              </div>
              <p className="text-xs text-zinc-600 mb-6">acesso por {plan.period}</p>
              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="sm"
                className={plan.highlight
                  ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400 font-bold"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
                }
              >
                <Link href="/planos">Comecar com {plan.name}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
