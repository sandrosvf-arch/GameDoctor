# GameDoctor

Plataforma própria de venda e entrega de cursos online — experiência de streaming (Netflix) + área de membros (Hotmart/Alura).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Banco de dados | PostgreSQL + Prisma ORM |
| Autenticação | NextAuth v5 (Auth.js) — e-mail/senha + Google OAuth |
| Estilização | Tailwind CSS + Radix UI |
| Pagamentos | Modular — Mercado Pago / Pagar.me / Asaas / Stripe |
| Vídeos | Modular — Vimeo / Mux / Cloudflare Stream / Bunny Stream |

## Estrutura do Projeto

```
GameDoctor/
├── prisma/
│   └── schema.prisma          # 20 tabelas: users, courses, lessons, payments...
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, cadastro, recuperar-senha
│   │   ├── (member)/          # dashboard, meus-cursos, curso/[slug], aula/[id]
│   │   ├── (admin)/           # painel admin completo
│   │   ├── cursos/            # página pública de cursos
│   │   ├── planos/            # página de planos
│   │   ├── checkout/          # checkout Pix + cartão
│   │   └── api/
│   │       ├── auth/          # NextAuth handlers
│   │       ├── lessons/[id]/access/  # validação de acesso (CRÍTICO)
│   │       ├── progress/      # salvar progresso do aluno
│   │       └── payment/webhooks/    # receber notificações do gateway
│   ├── lib/
│   │   ├── auth/              # NextAuth config (Google + credentials)
│   │   ├── db/                # Prisma client singleton
│   │   ├── access/            # controle de acesso (validação backend)
│   │   ├── video/             # abstração de provedores de vídeo
│   │   │   └── providers/     # vimeo | mux | cloudflare | bunny
│   │   └── payment/           # abstração de gateways de pagamento
│   │       └── providers/     # mercadopago | stripe | pagarme
│   ├── types/                 # TypeScript types + next-auth.d.ts
│   └── middleware.ts          # proteção de rotas por role
├── docs/
│   └── SCOPE.md               # escopo completo do projeto
└── .env.example               # todas as variáveis necessárias
```

## Setup

```bash
# 1. Clone e instale dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 3. Gere o Prisma client e aplique o schema
npm run db:generate
npm run db:push        # dev (sem migration files)
# ou: npm run db:migrate  # com migration files

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

## Fases

- **Fase 1 — MVP:** autenticação, área de membros, player com prévia gratuita, painel admin
- **Fase 2 — Comercial:** checkout, Pix, cartão, webhooks, liberação automática
- **Fase 3 — Avançada:** certificados, relatórios, comunidade, upload de vídeos

## Regra crítica

> Nenhum conteúdo pago pode ser exibido sem validação real de acesso no backend.
> O endpoint `/api/lessons/[id]/access` é a porta de entrada para todo vídeo.

## License

MIT
