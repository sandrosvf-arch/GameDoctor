# Execução das demandas

Fonte: `demands.md`.

Legenda: `PENDENTE`, `EM ANDAMENTO`, `CONCLUÍDO`, `BLOQUEADO`.

## 1. Navegação para o início

Status: `CONCLUÍDO`.

Escopo:
- Garantir retorno para a home pública no painel administrativo.
- Garantir retorno para a home pública no painel do aluno.

Validação:
- Logo/cabeçalho administrativo navega para `/`.
- Logo/cabeçalho do aluno navega para `/`.
- TypeScript e verificação de diff.

Implementação verificada:
- `src/app/(admin)/layout.tsx`: logo administrativa envolvida por `Link` para `/`.
- `src/components/layout/Header.tsx`: logo principal envolvida por `Link` para `/` no desktop e mobile.

Resultado:
- Não foi necessário alterar código; a navegação já estava funcional no estado auditado.

## 2. Comunicação e visual da comunidade

Status: `CONCLUÍDO`.

Escopo:
- Substituir a comunicação de “discussão” por “tópico”.
- Usar cores de destaque com parcimônia e reduzir tipografia excessiva.

Validação:
- Busca textual sem ocorrências públicas indevidas de “discussão”.
- Fluxos de listagem, criação, detalhe e moderação preservados.
- TypeScript e verificação de diff.

Implementação:
- Comunicação padronizada para “tópico” na home da comunidade, fórum, detalhe e moderação administrativa.
- Identidade dark preservada com laranja nas ações e destaques, ciano como apoio técnico e gradientes discretos na home, fórum e tópico.
- Título principal reduzido no desktop e badges de moderação preservados para hierarquia visual.
- Primeira página de tópicos entregue pelo servidor, eliminando o atraso artificial e a segunda busca duplicada após a navegação.
- Fórum, total e primeiros tópicos consolidados em uma única consulta parametrizada ao banco.
- Estado de carregamento instantâneo adicionado à rota dinâmica do fórum.

Validação executada:
- Busca textual sem ocorrências de “discussão” nas áreas da comunidade.
- Fórum e API de tópicos responderam `200`; em execução aquecida, ambos ficaram próximos de `1,1 s`, sem o segundo carregamento client-side anterior.
- `tsc --noEmit --incremental false`.
- `git diff --check`.

## 3. Exportação de transcrições

Status: `CONCLUÍDO`.

Escopo:
- Criar exportação em lote no painel de aulas.
- Gerar arquivo compactado com um documento por aula contendo nome, descrição, palavras-chave e transcrição.

Validação:
- Apenas equipe administrativa acessa a exportação.
- Aulas sem transcrição são identificadas no relatório.
- Download possui nomes de arquivo seguros e conteúdo UTF-8.
- TypeScript e teste do gerador.

Implementação:
- Endpoint protegido `GET /api/admin/aulas/export-transcripts`.
- ZIP com `README.md` e um Markdown por aula, incluindo trilha, módulo, descrição, palavras-chave, status e transcrição.
- Botão `Exportar transcrições` em `/admin/aulas`.
- Gerador ZIP interno sem nova dependência.

Validação executada:
- Teste `tests/zip.test.ts` com assinaturas ZIP e conteúdo UTF-8.
- `tsc --noEmit --incremental false`.
- `git diff --check`.

## 4. Busca relevante e carregamento contínuo

Status: `CONCLUÍDO`.

Escopo:
- Priorizar correspondência exata da consulta.
- Separar resultados próximos dos resultados principais.
- Implementar carregamento incremental/infinito.

Validação:
- Consulta exata aparece antes de correspondências parciais.
- Paginação não repete nem perde resultados.
- Estado de carregamento e fim da lista funcionam.
- TypeScript e testes da ordenação.

Implementação:
- Ranking normalizado com prioridade para frase completa em título, descrição e palavras-chave.
- Área `Resultados mais relevantes` separada de `Resultados relacionados`.
- Paginação combinada na API e carregamento infinito com `IntersectionObserver`.
- Helper reutilizável em `src/lib/search-ranking.ts`.

Validação executada:
- Teste `tests/search-ranking.test.ts`, incluindo o cenário `ERRO E100`.
- `tsc --noEmit --incremental false`.
- `git diff --check`.

## 5. Autenticação configurável e telefone no cadastro

Status: `CONCLUÍDO`.

Escopo:
- Permitir habilitar/desabilitar login e cadastro Google por variável de ambiente.
- Adicionar telefone ao cadastro por e-mail.
- Validar números brasileiros com DDD e rejeitar padrões inválidos.

Validação:
- Google não aparece nem é registrado quando desabilitado.
- Cadastro exige e persiste telefone válido.
- API rejeita números inválidos.
- TypeScript e testes de validação.

Implementação:
- Flag pública `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` controla a exibição dos botões e o registro do provider Google no Auth.js.
- Cadastro por e-mail exige celular com DDD e persiste apenas os dígitos normalizados.
- A mesma validação é executada no cliente e novamente na API de cadastro.
- Convites administrativos também coletam o celular ao ativar a conta.

Validação executada:
- Teste `tests/phone.test.ts` com celulares, telefones fixos, DDD inválido e padrões repetidos.
- `tsc --noEmit --incremental false`.
- `git diff --check`.

## 6. Exclusão de aulas na trilha administrativa

Status: `CONCLUÍDO`.

Escopo:
- Corrigir a ação que atualmente recarrega a página sem excluir.
- Excluir as aulas 3 a 6 do módulo indicado somente após validar a correção e os registros-alvo.

Validação:
- Erros da API são exibidos e não simulam sucesso.
- Exclusão atualiza a interface sem refresh indevido.
- Registros-alvo são conferidos antes da remoção.
- TypeScript e confirmação no banco.

Implementação:
- O endpoint confere se a aula pertence à trilha antes da exclusão.
- Progresso e materiais vinculados são removidos na mesma transação para evitar falha de chave estrangeira.
- A interface trata respostas de erro e só remove a linha local após confirmação da API, sem recarregar toda a página.
- Botões de edição e exclusão foram explicitamente definidos como `type="button"`.

Registros removidos após conferência no banco:
- Aula 3: `Introdução` (`cmp4mo0t0000272iszgtkevzt`).
- Aula 4: `Quem pode começar?` (`cmp4o10kx000172xc0t1meeuy`).
- Aula 5: `Desafio inicial` (`cmpbw451w0001jy046lgxon9a`).
- Aula 6: `Suporte e comunidade` (`cmpbwj1is0003jy04xwdeqam0`).

Validação executada:
- Exclusão transacional confirmou quatro registros removidos e duas aulas restantes na trilha.
- `tsc --noEmit --incremental false`.
- `git diff --check`.

## 7. Configuração do prompt da IA

Status: `CONCLUÍDO`.

Escopo:
- Criar área administrativa de configurações extensível.
- Remover o prompt principal do código hardcoded.
- Carregar a configuração no chat com fallback seguro.

Validação:
- Apenas equipe administrativa altera configurações.
- Chat usa o prompt persistido.
- Falha de configuração mantém fallback funcional.
- Migration, Prisma, TypeScript e teste da montagem do prompt.

Implementação:
- Criada a área extensível `/admin/configuracoes`, inicialmente com o prompt-base do assistente.
- API `GET/PATCH /api/admin/configuracoes/ai` protegida para `ADMIN` e `EDITOR`, com validação de tamanho e registro em `AdminLog`.
- Prompt-base persistido em `app_settings`; o chat carrega o valor atualizado em cada solicitação.
- Leitura e gravação migradas para SQL parametrizado, removendo a dependência do delegate `db.appSetting` ausente no processo Prisma já carregado.
- Regras obrigatórias de segurança, acesso, fontes e perfil do usuário continuam controladas pelo código e são anexadas ao prompt-base.
- Fallback padrão mantém o chat funcional caso a configuração não possa ser carregada.
- Item `Configurações` adicionado ao grupo `Sistema` no sidebar administrativo.

Migration:
- `prisma/migrations/20260827_app_settings/migration.sql`.
- Aplicada com sucesso por `prisma db execute`.
- Configuração `ai.system_prompt` confirmada diretamente no banco após a execução.

Validação executada:
- `prisma validate`.
- Prisma Client confirmado com consulta real após regeneração; o comando informou bloqueio da DLL porque o servidor de desenvolvimento estava aberto, sem impedir o funcionamento do client atual.
- Teste `tests/ai-prompt.test.ts` para configuração, fallback, contexto e regras obrigatórias.
- API administrativa respondeu `401` em chamada sem sessão.
- `tsc --noEmit --incremental false`.
- `git diff --check`.

## 8. Vídeo da página Quem somos

Status: `CONCLUÍDO`.

Implementação:
- URL do vídeo adicionada à área `/admin/configuracoes`.
- Página `/quem-somos` injeta a URL configurada no template sem manter o valor comercial hardcoded no componente.
- `NEXT_PUBLIC_ABOUT_VIDEO_URL` funciona somente como fallback inicial.

Validação:
- Página `/quem-somos` respondeu `200` com o helper de configuração ativo.
- TypeScript e verificação de diff.

## 9. WhatsApp centralizado

Status: `CONCLUÍDO`.

Implementação:
- URL do WhatsApp adicionada à área `/admin/configuracoes`.
- Planos, dashboard, assistente global, página da IA e rodapé usam a configuração centralizada.
- O valor de `NEXT_PUBLIC_SUBSCRIPTION_CANCEL_WHATSAPP_URL` permanece como fallback inicial até a primeira gravação no painel.
- Cache público de cinco minutos com invalidação imediata após salvar.

Validação:
- Busca global confirmou que os pontos públicos não leem mais a variável diretamente.
- Leitura SQL real confirmou a tabela `app_settings` sem uso de `db.appSetting`.
- TypeScript e verificação de diff.

## 10. Desempenho do tópico individual

Status: `CONCLUÍDO`.

Implementação:
- Tópico, fórum, autor, respostas autorizadas, anexos, curtidas, badges, banimentos e acesso consolidados em uma única consulta parametrizada.
- Incremento de visualização incluído na mesma operação de banco.
- Loading instantâneo adicionado em `/comunidade/topico/[slug]`.
- Regras de assinatura, equipe, moderação e ocultação de respostas preservadas no backend.

Validação:
- Rota real respondeu `200` e caiu de aproximadamente `6,8–7,1 s` para `1,3 s` em execução aquecida.
- Assinante existente recebeu respostas e estatísticas; visitante sem plano não recebeu o conteúdo restrito.
- TypeScript e verificação de diff.

## Registro final

Todas as sete demandas foram implementadas ou verificadas no estado atual.

Entregas:
- Navegação para a home validada nos painéis administrativo e do aluno.
- Comunicação da comunidade padronizada para tópicos e tipografia ajustada.
- Exportação administrativa de transcrições em ZIP.
- Busca com prioridade exata, resultados relacionados e carregamento infinito.
- Google OAuth configurável e celular brasileiro validado no cadastro.
- Exclusão de aulas corrigida; aulas 3 a 6 solicitadas foram removidas após conferência.
- Prompt da IA configurável em área administrativa e persistido no banco.

Migration executada:
- `20260827_app_settings` aplicada e conferida.

Validações finais executadas:
- `tests/zip.test.ts`: ZIP válido e conteúdo UTF-8.
- `tests/search-ranking.test.ts`: prioridade exata e relacionados.
- `tests/phone.test.ts`: normalização e validação brasileira.
- `tests/ai-prompt.test.ts`: configuração, fallback e regras obrigatórias.
- `tsc --noEmit --incremental false`.
- `prisma validate`.
- `git diff --check`.
- Busca global sem comunicação remanescente de “discussão”.
- `GET /api/auth/providers`: somente `credentials` com Google desabilitado.
- `POST /api/auth/register`: celular inválido rejeitado com `400` antes de criar usuário.
- `GET /api/admin/aulas/export-transcripts`: acesso sem sessão rejeitado com `401`.
- `GET /api/search?q=ERRO%20E100`: frase completa retornada primeiro, relacionados separados e próxima página disponível.
- `GET /api/admin/configuracoes/ai`: acesso sem sessão rejeitado com `401`.
