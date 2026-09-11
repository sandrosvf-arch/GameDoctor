# IA do Bancada PRO na API do site (branch `ia-bancada`)

O software Bancada PRO usa a mesma IA e a mesma base do GameDoctor. Ele chama
`POST /api/ai/chat` por meio da Edge Function `ia-chat` do Supabase do app — nunca
direto do executável.

## Configuração (.env do site)

```
BANCADA_API_KEY=<chave longa aleatória, mínimo 32 caracteres>
```

A mesma chave vai como secret `BANCADA_API_KEY` na Edge Function do Bancada PRO
(junto com `GAMEDOCTOR_URL`). Sem a variável no site, o caminho fica desligado
(`isBancadaRequest` devolve false) e nada muda para os alunos da plataforma.

## Requisição

Header `x-bancada-key: <chave>` + corpo:

```json
{
  "produto": "bancada",
  "message": "não estou encontrando o boardview do PS5 EDM-010",
  "historico": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "aluno": { "id": "<uuid do usuário no Supabase do app>", "nome": "Thiago" },
  "contexto": { "tela": "PlayStation › PS5 › NOR Tool", "log": "<últimas linhas do monitor>" }
}
```

## Resposta

```json
{
  "resposta": "Temos sim! Está em PlayStation › PS5 › Boardviewer ... Quer que eu abra pra você?",
  "acoes": [{ "tipo": "abrir_boardview", "args": { "placa": "PS5 EDM-010", "face": "TOP" }, "rotulo": "Abrir boardview EDM-010" }],
  "fontes": ["Como usar: Boardviewer (Bancada PRO) [Geral]"],
  "model": "claude-sonnet-4-6", "inputTokens": 1234, "outputTokens": 321
}
```

Não há sessão NextAuth, crédito mensal nem gravação em `aiConversation` nesse caminho:
o limite e o registro ficam no Supabase do app (`ia_mensagens`).

## O que muda no código

- `src/lib/ai/bancada.ts` — prompt do Bancada PRO, filtro de contexto (sem FAQ, comunidade,
  trilhas, planos, preços), parser/whitelist das ações `<acao ...>`.
- `src/app/api/ai/chat/route.ts` — desvio `isBancadaRequest` → `handleBancadaChat`.
- `scripts/index-ai-knowledge.ts` — tipo `ferramenta` e linha `Link app:` no texto indexado.
- `knowledgebase/03_conteudo/bancada/ferramentas_bancada_pro.json` (gitignored, já indexado
  na produção em 10/09) — 64 tutoriais das ferramentas do software.

## Teste local

```
curl -s http://localhost:3001/api/ai/chat -H "content-type: application/json" \
  -H "x-bancada-key: $BANCADA_API_KEY" \
  -d '{"produto":"bancada","message":"como uso o PS5 NOR Tool pra recriar uma NOR?","aluno":{"id":"teste","nome":"Thiago"}}'
```
