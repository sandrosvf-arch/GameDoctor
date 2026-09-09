import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage"
import { getPublicPlatformSettings } from "@/lib/app-settings"

export const metadata: Metadata = {
  title: "Política de cancelamento e reembolso",
  description: "Entenda como solicitar cancelamento, exercer o direito de arrependimento e acompanhar um estorno na GameDoctor.",
}

function buildSections(whatsappUrl: string): LegalSection[] {
  return [
  {
    title: "1. Objetivo desta política",
    paragraphs: [
      "Esta Política de Cancelamento e Reembolso estabelece as condições e os procedimentos aplicáveis às solicitações de cancelamento, desistência e restituição de valores referentes aos produtos e serviços contratados pelo consumidor na GameDoctor.",
      "O documento aplica-se aos planos de acesso aos cursos, assinaturas, materiais digitais e demais serviços disponibilizados pela plataforma. Suas disposições complementam os Termos de uso e devem ser interpretadas em conjunto com a oferta apresentada no momento da contratação e com a legislação brasileira de proteção ao consumidor.",
    ],
  },
  {
    title: "2. Direito de arrependimento em até 7 dias",
    paragraphs: [
      "Nas contratações realizadas fora do estabelecimento comercial, inclusive pela internet, o consumidor pode desistir da contratação no prazo legal de 7 dias, contados da assinatura ou da disponibilização/recebimento do serviço, conforme aplicável ao caso, nos termos do artigo 49 do Código de Defesa do Consumidor.",
      "Durante esse prazo, o pedido pode ser feito sem necessidade de justificar o motivo. Quando o direito de arrependimento for exercido validamente, os valores pagos serão devolvidos conforme a legislação aplicável e sem cobrança de multa pelo cancelamento.",
    ],
  },
  {
    title: "3. Como solicitar",
    paragraphs: [
      <>
        A solicitação deve ser enviada pela{" "}
        <Link href="/suporte" className="font-medium text-cyan-300 hover:text-cyan-200">
          Central de dúvidas
        </Link>{" "}
        ou pelo nosso{" "}
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-300 hover:text-cyan-200">
          WhatsApp
        </a>
        . Para localizar a compra com segurança, informe o nome usado no pedido, e-mail da conta e, se possível, o número do pedido ou comprovante da transação.
      </>,
      "A solicitação será registrada e a equipe poderá pedir dados adicionais para confirmar a identidade e evitar cancelamentos ou estornos indevidos. O motivo é opcional quando se tratar do direito de arrependimento.",
      "O recebimento da solicitação será confirmado pelo canal utilizado. A manifestação será encaminhada para análise e, quando aplicável, ao provedor de pagamento responsável pela transação.",
    ],
  },
  {
    title: "4. Estorno e devolução dos valores",
    paragraphs: [
      "Após confirmar os dados da compra e do pedido, a GameDoctor fará o reembolso quando ele for devido. A forma e a data de crédito dependem do meio de pagamento e dos prazos operacionais da instituição financeira ou do gateway.",
      "No cartão, o estorno é comunicado à administradora e pode aparecer na fatura atual ou em faturas seguintes, conforme o procedimento do emissor. No Pix, boleto ou outro meio disponível, a devolução seguirá o procedimento seguro informado pela equipe após a validação do pedido.",
      "Não solicitaremos senha, código de autenticação ou dados completos do cartão para processar um cancelamento. Nunca envie essas informações pelo suporte.",
    ],
  },
  {
    title: "5. Cancelamento de renovação",
    paragraphs: [
      "Quando houver plano com renovação recorrente, o consumidor pode solicitar o cancelamento da renovação para evitar novas cobranças. O acesso ao período já pago seguirá as condições da oferta, salvo quando houver direito a arrependimento, estorno ou outra hipótese prevista em lei.",
      "O cancelamento da renovação não equivale automaticamente ao reembolso de uma cobrança já processada. Se a cobrança estiver dentro do prazo de arrependimento ou houver outra hipótese legal ou contratual, solicite também a análise do estorno.",
    ],
  },
  {
    title: "6. Solicitações após 7 dias",
    paragraphs: [
      "Depois do prazo legal de arrependimento, o pedido será analisado de acordo com as condições do plano, da oferta e da legislação aplicável. O simples pedido de encerramento do acesso não garante, por si só, a devolução de valores já pagos.",
      "Isso não impede o consumidor de relatar falha na prestação do serviço, cobrança não reconhecida, descumprimento da oferta ou outro problema específico. Essas situações serão tratadas separadamente, conforme os direitos previstos para cada caso.",
    ],
  },
  {
    title: "7. Efeitos do cancelamento",
    paragraphs: [
      "Após a confirmação do cancelamento ou do estorno, o acesso aos cursos, aulas, materiais e benefícios vinculados ao pedido poderá ser encerrado ou suspenso. O histórico mínimo necessário para registrar a transação e cumprir obrigações legais poderá ser mantido conforme a Política de Privacidade.",
      "O cancelamento não autoriza a cópia, redistribuição ou continuidade de uso de conteúdos protegidos que tenham sido disponibilizados durante o acesso.",
    ],
  },
  {
    title: "8. Atualizações e atendimento",
    paragraphs: [
      "Esta política pode ser atualizada para refletir mudanças nos planos, nos meios de pagamento, na operação da plataforma ou na legislação. A versão vigente estará sempre disponível nesta página.",
      "Se precisar acompanhar uma solicitação ou não conseguir usar a Central de dúvidas, entre em contato pelo WhatsApp divulgado no site e informe o e-mail da conta e o número do pedido.",
    ],
  },
  ]
}

export default async function PoliticaCancelamentoPage() {
  const { whatsappUrl } = await getPublicPlatformSettings()

  return (
    <LegalPage
      eyebrow="Cancelamento e reembolso"
      title="Você sabe como cancelar."
      description="Veja o prazo de arrependimento, os canais de solicitação e como funciona o estorno de uma compra na GameDoctor."
      updatedAt="9 de setembro de 2026"
      sections={buildSections(whatsappUrl)}
    />
  )
}
