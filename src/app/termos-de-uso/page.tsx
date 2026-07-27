import type { Metadata } from "next"
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Conheça as regras para utilizar os cursos, a comunidade, o suporte e os demais recursos da GameDoctor.",
}

const sections: LegalSection[] = [
  {
    title: "1. Aceitação dos termos",
    paragraphs: [
      "Estes Termos de Uso regulam o acesso e a utilização da plataforma GameDoctor, incluindo site, cursos, trilhas, aulas, comunidade, comentários, Central de Ajuda, tickets e recursos relacionados.",
      "Ao criar uma conta, contratar um plano ou utilizar a plataforma, você concorda com estes termos e com a Política de Privacidade.",
    ],
  },
  {
    title: "2. Conta e segurança",
    paragraphs: [
      "Você deve fornecer informações verdadeiras, manter seus dados atualizados e proteger suas credenciais de acesso. A conta é pessoal e não deve ser compartilhada, vendida ou transferida.",
      "O login com Google é vinculado à conta GameDoctor correspondente ao e-mail ou identificador autorizado. Você é responsável por manter segura a conta utilizada para autenticação.",
      "Podemos bloquear ou restringir contas que apresentem comportamento fraudulento, violem estes termos, prejudiquem outros usuários ou comprometam a segurança da plataforma.",
    ],
  },
  {
    title: "3. Cursos, planos e validade do acesso",
    paragraphs: [
      "Os planos disponíveis, preços, benefícios, período de acesso e condições de parcelamento são apresentados na página de planos e no checkout antes da contratação.",
      "No plano anual, o acesso começa após a confirmação do pagamento e permanece disponível pelo período indicado na oferta, normalmente 12 meses. Quando houver modalidade mensal habilitada, ela seguirá o período informado no checkout.",
      "O acesso é pessoal e permite consumir os conteúdos liberados para o plano contratado durante sua validade. O encerramento do período não apaga automaticamente o histórico da conta, mas pode restringir conteúdos que dependam de assinatura ativa.",
    ],
  },
  {
    title: "4. Pagamentos, cupons e pedidos",
    paragraphs: [
      "O pagamento é concluído em ambiente de pagamento externo indicado pela GameDoctor. O pedido somente libera ou renova o acesso após a confirmação do pagamento.",
      "Cupons dependem das regras exibidas no checkout, incluindo validade, plano elegível, limite de usos e condições por usuário. Um cupom inválido, expirado ou esgotado não será aplicado.",
      "Em caso de recusa, cancelamento, estorno ou contestação confirmada, o pedido poderá ser marcado como não aprovado e os acessos vinculados poderão ser suspensos conforme o caso.",
    ],
  },
  {
    title: "5. Uso permitido do conteúdo",
    paragraphs: [
      "Os cursos, vídeos, textos, materiais, imagens, marcas e demais conteúdos pertencem à GameDoctor ou aos respectivos licenciantes e são protegidos pela legislação aplicável.",
      "É permitido assistir e utilizar o conteúdo para fins pessoais e de aprendizado dentro do acesso contratado. Não é permitido:",
    ],
    bullets: [
      "copiar, baixar, gravar, redistribuir, revender, sublicenciar ou disponibilizar aulas e materiais a terceiros;",
      "compartilhar credenciais ou permitir que outra pessoa utilize sua conta;",
      "remover controles de segurança, contornar bloqueios de acesso ou explorar falhas da plataforma;",
      "usar o conteúdo para criar produto concorrente ou treinamento comercial sem autorização expressa.",
    ],
  },
  {
    title: "6. Comunidade e comentários",
    paragraphs: [
      "A comunidade existe para troca de experiências sobre manutenção de videogames. Ao publicar um tópico, resposta, comentário ou imagem, você declara que possui autorização para compartilhar aquele material e que ele não viola direitos de terceiros.",
      "Não são permitidos conteúdo ilegal, discurso de ódio, ameaça, assédio, spam, fraude, divulgação de dados pessoais, conteúdo sexual envolvendo menores, malware, propaganda não autorizada ou instruções destinadas a causar dano.",
      "A GameDoctor pode moderar, ocultar ou remover publicações e restringir ou banir usuários da comunidade. Usuários banidos podem continuar visualizando áreas permitidas, mas não poderão criar tópicos ou respostas durante a restrição.",
    ],
  },
  {
    title: "7. Comentários, suporte e anexos",
    paragraphs: [
      "Comentários em aulas e mensagens de tickets devem permanecer relacionados ao conteúdo ou à solicitação de atendimento. Podemos moderar comentários e anexos que sejam inadequados, inseguros ou incompatíveis com a finalidade do recurso.",
      "No suporte, as informações enviadas devem ser suficientes e verdadeiras para permitir o atendimento. Não envie senhas, dados completos de cartão ou informações sensíveis desnecessárias.",
    ],
  },
  {
    title: "8. Disponibilidade e responsabilidade",
    paragraphs: [
      "Trabalhamos para manter a plataforma disponível e segura, mas podem ocorrer interrupções para manutenção, atualizações, falhas de provedores, indisponibilidade de internet ou eventos fora do nosso controle.",
      "Os conteúdos têm finalidade educacional e não garantem resultado financeiro, contratação, faturamento ou solução de qualquer equipamento específico. Procedimentos técnicos devem ser realizados com conhecimento, ferramentas adequadas e atenção às normas de segurança.",
    ],
  },
  {
    title: "9. Encerramento e alterações",
    paragraphs: [
      "Você pode deixar de utilizar a plataforma a qualquer momento. A GameDoctor poderá suspender ou encerrar acessos quando houver violação destes termos, fraude, inadimplência ou risco à operação e aos demais usuários.",
      "Estes termos podem ser atualizados para refletir novas funcionalidades, planos, regras de segurança ou exigências legais. A versão vigente estará sempre disponível nesta página.",
    ],
  },
  {
    title: "10. Atendimento",
    paragraphs: [
      "Para dúvidas sobre a plataforma, pagamentos, conta ou estes termos, acesse /suporte e utilize a Central de Ajuda ou abra um ticket.",
    ],
  },
]

export default function TermosDeUsoPage() {
  return (
    <LegalPage
      eyebrow="Termos de uso"
      title="Regras claras para uma boa experiência."
      description="Leia as condições de acesso e as regras para utilizar cursos, comunidade, suporte e demais recursos da GameDoctor."
      updatedAt="27 de julho de 2026"
      sections={sections}
    />
  )
}
