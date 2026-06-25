import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface HomeFaq {
  q: string
  a: string
}

export function HomeFaqSection({ faqs }: { faqs: HomeFaq[] }) {
  return (
    <section id="suporte" className="py-20 border-t border-zinc-900">
      <div className="container max-w-2xl">
        <h2 className="text-2xl font-black text-center mb-8">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5"
            >
              <AccordionTrigger className="text-sm font-medium text-zinc-300 hover:text-white hover:no-underline py-4 text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-zinc-500 pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
