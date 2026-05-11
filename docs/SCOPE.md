# Escopo Completo — Plataforma GameDoctor

> Documento gerado em 11/05/2026. Fonte: briefing do cliente.

## 1. Visão Geral

Plataforma própria de venda e entrega de cursos online do GameDoctor.
Experiência visual: streaming (Netflix) + área de membros (Hotmart/Kiwify/Alura).

Conteúdo: videoaulas gravadas organizadas por cursos, categorias, plataformas, módulos e aulas.

**Funcionalidade central:** Visitantes assistem ao começo de algumas aulas gratuitamente. Ao atingir o limite configurado, o vídeo pausa e exibe overlay "Continue assistindo" → página de planos.

---

## 2. Tipos de Usuário

| Tipo | Descrição |
|------|-----------|
| Visitante | Sem login. Acessa área pública e prévias gratuitas |
| Cadastrado sem compra | Conta criada, sem plano ativo |
| Aluno com acesso | Comprou plano/curso ou liberação manual |
| Instrutor/Editor | Acesso limitado para gestão de conteúdo |
| Administrador | Acesso total ao painel administrativo |

---

## 3. Área Pública

- Home (apresentação, benefícios, destaques, depoimentos, FAQ, planos)
- Página de venda por curso
- Página de planos (Básico, Pro, Premium)
- Login (e-mail + Google)
- Cadastro (e-mail + Google)
- Recuperação de senha
- Conteúdo bloqueado
- Suporte público
- Termos de uso / Política de privacidade

---

## 4. Área de Membros

- Dashboard (saudação, últimas aulas, continuar assistindo, progresso)
- Meus Cursos
- Página do curso (banner, módulos, aulas, materiais, progresso)
- Página da aula (player, lista lateral, anterior/próxima, materiais, progresso)
- Materiais complementares
- Certificados (fase futura)
- Suporte ao aluno

---

## 5. Player de Vídeo

**Requisitos:**
- Play / Pause / Volume / Tela cheia / Velocidade
- Barra de progresso + salvar posição
- Marcar aula como concluída
- Botão próxima/anterior aula
- Prévia gratuita com overlay "Continue assistindo"
- Compatível desktop + mobile

**Prévia gratuita:**
- Tipo 1: aula totalmente gratuita
- Tipo 2: primeiros N segundos liberados, depois pausa + overlay

**Campos por aula:**
```
preview_enabled: boolean
preview_duration_seconds: number
preview_percentage: number
is_free: boolean
requires_plan: boolean
```

**Regra crítica:** Bloqueio validado no backend — não apenas visual.

---

## 6. Servidor de Vídeos (modular)

Provedores suportados (a escolher):
- Vimeo / Vimeo OTT
- Mux
- Cloudflare Stream
- Bunny Stream
- Wistia
- AWS S3 + CloudFront

**Arquitetura:** `/lib/video/providers/{provider}/` — troca de provedor sem reescrever tudo.

**Proteção:**
- Embed restrito ao domínio
- URLs assinadas/temporárias
- Token de acesso
- Vídeos privados/não listados
- Bloqueio de download

---

## 7. Sistema de Planos

Tipos: Gratuito, Básico, Pro, Premium, Curso individual, Pacote, Assinatura mensal/anual, Vitalício.

**Plano Básico:** Curso principal + módulos essenciais + 12 meses  
**Plano Pro:** Curso completo + bônus + materiais + certificado + suporte prioritário  
**Plano Premium:** Tudo do Pro + avançado + comunidade + mentorias + acesso vitalício

---

## 8. Checkout e Pagamentos

**Formas:** Pix + Cartão de crédito (boleto futuro)

**Gateways (modular):** Mercado Pago, Pagar.me, Asaas, Stripe, Iugu, PagSeguro

**Arquitetura:** `/lib/payment/providers/{gateway}/` — troca sem reescrever.

**Fluxo Pix:** gera cobrança → QR Code + copia-e-cola → webhook → libera acesso

**Fluxo Cartão:** tokenização via gateway → processa → webhook → libera acesso

**Regra:** Nunca armazenar dados sensíveis do cartão.

---

## 9. Controle de Acesso

- Validação 100% no backend
- Aluno só acessa cursos/aulas/materiais liberados
- Admin pode liberar/remover acesso manualmente
- Tipos: Vitalício, Prazo determinado, Assinatura, Cortesia, Teste, Manual, Bloqueado

---

## 10. Painel Administrativo

### Gestão
- Cursos, Categorias, Plataformas
- Módulos, Aulas, Vídeos, Materiais
- Alunos, Acessos, Planos
- Pedidos, Pagamentos, Cupons

### Outros
- Dashboard com indicadores
- Relatórios (alunos, vendas, progresso, conversão prévia→compra)
- Logs administrativos (quem fez o quê + IP)
- Configurações gerais

---

## 11. Banco de Dados (PostgreSQL + Prisma)

Tabelas: `users`, `courses`, `categories`, `platforms`, `modules`, `lessons`, `video_assets`, `materials`, `plans`, `plan_courses`, `plan_lessons`, `orders`, `order_items`, `payments`, `payment_webhooks`, `access_permissions`, `lesson_progress`, `coupons`, `certificates`, `admin_logs`

---

## 12. Autenticação

- E-mail + senha (bcrypt)
- Google OAuth
- NextAuth v5 (Auth.js)
- JWT session
- Recuperação de senha por e-mail

---

## 13. Notificações por E-mail

- Cadastro realizado
- Compra aprovada / Acesso liberado
- Pagamento pendente / recusado
- Senha redefinida
- Curso concluído / Certificado disponível

---

## 14. Responsividade

Desktop, notebook, tablet e celular.  
Mobile: menu drawer, player em destaque, lista de aulas abaixo.

---

## 15. Segurança (OWASP)

- Senhas criptografadas (bcrypt)
- Proteção de rotas por role (middleware)
- Validação backend em todas as requisições sensíveis
- Rate limiting em login
- Tokens de sessão seguros
- Webhooks validados por assinatura
- Tokenização de cartão (nunca armazenar raw)
- URLs de vídeo protegidas

---

## 16. Fases de Desenvolvimento

### Fase 1 — MVP Essencial
Home, login/Google, cadastro, área do aluno, cursos/módulos/aulas, player, prévia, bloqueio, progresso, admin básico, liberação manual.

### Fase 2 — Comercial
Checkout, Pix, cartão, gateway, webhooks, liberação automática, cupons, e-mails.

### Fase 3 — Avançada
Certificados, relatórios avançados, comunidade, assinatura recorrente, notificações, upload de vídeos, app mobile.

---

## 17. Prioridades

1. Estrutura base
2. Login/cadastro
3. Login com Google
4. Área pública
5. Área do aluno
6. Cadastro de cursos/módulos/aulas
7. Player de vídeo
8. Integração provedor de vídeo
9. Prévia gratuita
10. Bloqueio "Continue assistindo"
11. Controle de acesso
12. Painel admin
13. Planos
14. Checkout / Pix / Cartão
15. Webhooks / Liberação automática
16. Materiais / Progresso / Relatórios / Certificados

---

## 18. Textos da Plataforma

**Overlay bloqueio:** "Continue assistindo — Você começou essa aula, mas o restante está disponível apenas para alunos com acesso ao plano completo."

**Conteúdo bloqueado:** "Este conteúdo faz parte de um curso que ainda não está liberado para sua conta."

**Sem cursos:** "Você ainda não possui cursos liberados. Escolha um plano para começar sua jornada com o GameDoctor."

**Pix pendente:** "Seu Pix foi gerado. Escaneie o QR Code ou copie o código para finalizar o pagamento."

**Pagamento aprovado:** "Pagamento aprovado! Seu acesso ao GameDoctor foi liberado."

**Erro cartão:** "Não foi possível aprovar o pagamento. Verifique os dados do cartão ou tente outra forma."
