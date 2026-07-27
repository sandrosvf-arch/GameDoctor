import type { Metadata } from "next"
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Saiba como a GameDoctor coleta, utiliza, armazena e protege seus dados.",
}

const sections: LegalSection[] = [
  {
    title: "1. Sobre esta política",
    paragraphs: [
      "Esta Política de Privacidade explica como a GameDoctor trata os dados pessoais utilizados para oferecer sua plataforma de cursos, trilhas, comunidade, suporte e pagamentos.",
      "Ao criar uma conta ou utilizar a plataforma, você declara que leu este documento. Se não concordar com alguma prática, não utilize os recursos que dependem do respectivo tratamento.",
    ],
  },
  {
    title: "2. Dados que podemos coletar",
    paragraphs: [
      "Coletamos somente os dados necessários para operar a conta, liberar o acesso contratado, acompanhar o uso da plataforma e prestar atendimento.",
    ],
    bullets: [
      "Dados de cadastro: nome, e-mail, telefone, CPF quando solicitado para cadastro ou pagamento, senha armazenada de forma protegida e preferências da conta.",
      "Login com Google: nome, e-mail, identificador da conta Google e imagem de perfil disponibilizada pelo provedor, quando autorizados por você.",
      "Perfil: foto enviada por você, informações públicas do perfil e dados necessários para identificação em comentários, comunidade, certificados e suporte.",
      "Uso da plataforma: aulas acessadas, progresso, aulas concluídas, tempo de estudo, certificados, favoritos e interações com conteúdos.",
      "Comunidade e comentários: tópicos, respostas, comentários, imagens anexadas, data de publicação e registros de moderação.",
      "Atendimento: mensagens, departamento, status, anexos de imagem e histórico dos tickets abertos com o suporte.",
      "Compras: plano, período, cupom, valores, status do pedido e identificadores de pagamento. Não armazenamos o número completo do cartão.",
      "Dados técnicos: endereço IP, navegador, dispositivo, registros de acesso, cookies e informações necessárias para segurança e funcionamento.",
    ],
  },
  {
    title: "3. Como usamos os dados",
    paragraphs: [
      "Os dados são utilizados para criar e proteger sua conta, autenticar acessos, processar pagamentos, liberar planos, controlar a validade da assinatura e exibir o conteúdo contratado.",
      "Também usamos essas informações para salvar seu progresso, emitir certificados, personalizar sua experiência, responder tickets, moderar a comunidade, prevenir fraude e manter a segurança da plataforma.",
      "Podemos utilizar dados agregados ou anonimizados para entender o uso do produto, corrigir falhas e melhorar cursos e funcionalidades, sem identificar você diretamente.",
    ],
  },
  {
    title: "4. Login com Google",
    paragraphs: [
      "Quando você escolhe continuar com Google, recebemos os dados básicos autorizados na tela de consentimento do Google. Usamos essas informações para localizar ou criar sua conta GameDoctor e permitir novos logins.",
      "A GameDoctor não recebe sua senha do Google. O login é processado pelo fluxo oficial de autenticação e pode ser revogado por você nas configurações da sua conta Google.",
    ],
  },
  {
    title: "5. Pagamentos e prestadores",
    paragraphs: [
      "Os pagamentos são processados por provedores externos, incluindo o Mercado Pago quando essa opção estiver disponível. O provedor pode coletar e tratar dados necessários para concluir a transação conforme sua própria política de privacidade.",
      "Utilizamos serviços especializados para hospedagem de vídeos, armazenamento de imagens, envio de comunicações, autenticação, banco de dados e infraestrutura. Esses serviços recebem apenas os dados necessários para executar suas funções e devem aplicar medidas de segurança compatíveis.",
    ],
  },
  {
    title: "6. Cookies e sessões",
    paragraphs: [
      "Utilizamos cookies e tecnologias semelhantes para manter sua sessão, lembrar preferências, proteger formulários e entender o funcionamento básico da plataforma.",
      "Você pode bloquear cookies no navegador, mas algumas áreas, como login, checkout, cursos e comunidade, podem deixar de funcionar corretamente.",
    ],
  },
  {
    title: "7. Armazenamento, segurança e retenção",
    paragraphs: [
      "Adotamos medidas técnicas e administrativas para reduzir riscos de acesso indevido, alteração, perda ou divulgação dos dados. Nenhum serviço conectado à internet é completamente imune a incidentes.",
      "Mantemos os dados enquanto a conta estiver ativa, enquanto forem necessários para cumprir as finalidades descritas ou para atender obrigações legais, resolver disputas e preservar registros de segurança.",
    ],
  },
  {
    title: "8. Seus direitos",
    paragraphs: [
      "Você pode solicitar confirmação de tratamento, acesso, correção, atualização, portabilidade quando aplicável, eliminação de dados tratados com base no consentimento e informações sobre o uso dos seus dados, observadas as limitações legais.",
      "Para solicitar atendimento relacionado à privacidade, utilize a Central de Ajuda ou abra um ticket. Podemos pedir informações adicionais para confirmar a identidade antes de atender a solicitação.",
    ],
  },
  {
    title: "9. Crianças e adolescentes",
    paragraphs: [
      "A plataforma não é direcionada a crianças. Se identificarmos uma conta criada por menor sem as autorizações necessárias, poderemos restringir o acesso e remover os dados conforme a legislação aplicável.",
    ],
  },
  {
    title: "10. Alterações e contato",
    paragraphs: [
      "Esta política pode ser atualizada para refletir mudanças na plataforma, nos serviços utilizados ou na legislação. A versão vigente estará sempre disponível nesta página.",
      "Em caso de dúvidas, solicitações ou reclamações sobre privacidade, entre em contato pela Central de Ajuda em /suporte.",
    ],
  },
]

export default function PoliticaPrivacidadePage() {
  return (
    <LegalPage
      eyebrow="Privacidade"
      title="Sua privacidade importa."
      description="Transparência sobre os dados usados para oferecer uma experiência segura de aprendizado, comunidade e suporte."
      updatedAt="27 de julho de 2026"
      sections={sections}
    />
  )
}
