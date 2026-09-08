# Game Doctor — passagem de bastão

Oi! Este é o **Game Doctor**, a biblioteca de materiais dos alunos do Thiago
(mapas, diagramas, boardviews e softwares de reparo de consoles). O que está
aqui é um protótipo funcional em Python/PyQt6: já abre, faz login, sincroniza,
carimba, cifra e exibe — mas foi escrito rápido, contra uma pasta local no
lugar do Supabase. Sua missão é fechar a ponte com o Supabase e deixar isso
pronto pra distribuir. Abaixo está tudo que você precisa saber pra não ter que
adivinhar nada.

---

## 1. A ideia em um parágrafo

O aluno instala um `.exe`, entra com a **mesma conta do Bancada PRO** (mesmo
projeto Supabase, mesmas tabelas `perfis`/`assinaturas`). Se a assinatura está
válida, o app baixa o acervo. PDFs, imagens e boardviews **nunca ficam soltos
no PC**: recebem marca d'água com Nome + CPF do aluno e são guardados cifrados
num cofre local, abrindo só dentro do app (leitor de PDF, visualizador de
imagem e o Boardviewer copiado do Bancada PRO). Softwares são a exceção: são
baixados pra `Documentos\Game Doctor\` e extraídos, porque o aluno precisa
instalar. Quando o Thiago adiciona material novo, o app percebe sozinho e
avisa com notificação do Windows.

## 2. Como rodar agora, sem Supabase

```
_run_dev.bat            -> login dev@local / senha gamedoctor
```

Em modo dev o app lê a pasta `_dev_acervo\` como se fosse o bucket + a
tabela `materiais` (se a pasta não existir, ele monta uma amostra a partir de
`H:\PARA UPAR NO DRIVE`, que só existe na máquina do Thiago — se não tiver o
H:, peça pra ele te passar a `_dev_acervo` zipada, tem ~1 GB).

O bypass está em `gd_config.py`:

```python
DEV_LOGIN_OFFLINE = True      # <<< TEM QUE VIRAR False NO BUILD DE CLIENTE
DEV_SENHA = "gamedoctor"
```

`_tools\_validar.py` roda `py_compile` em tudo e `node --check` nos JS.
`_tools\_montar_html.py` precisa rodar sempre que `ui/boardview_view.html`
mudar (ele injeta o bloco do Boardviewer dentro do `ui/main.html` e remove os
botões de ajuste/foto, que são exclusivos do Bancada PRO).

## 3. Mapa dos arquivos

| Arquivo | O que faz |
|---|---|
| `main.py` | Janelas (login → principal), bandeja, toast do Windows, timers de sincronização (15 min) e de renovação de token (50 min). |
| `gd_config.py` | Constantes: URL/anon key do Supabase, bucket, pastas locais, flags de dev. |
| `gd_auth.py` | Login e-mail/senha, RPC `registrar_dispositivo` (valida assinatura + HWID, igual ao Bancada), perfil com CPF, refresh de token, validação de CPF. Só `urllib`. |
| `gd_cred.py` | Credenciais lembradas via DPAPI (`%APPDATA%\GameDoctor\cred.dat`) e um `estado.json`. |
| `gd_cofre.py` | O cofre: AES-256-GCM, chave aleatória protegida por DPAPI + HKDF por `uid`. Arquivos em `%LOCALAPPDATA%\GameDoctor\cofre\<hash uid>\<id>.gd` + `manifesto.json`. |
| `gd_marca.py` | Marca d'água: PDF via PyMuPDF (diagonal + rodapé + metadados), imagem via Pillow (grade + rodapé + tEXt/EXIF). Aplicada uma vez, na ingestão. |
| `gd_sync.py` | Baixa a tabela `materiais`, compara com o manifesto local, baixa só a diferença, carimba, guarda. Softwares: download direto pra pasta do aluno + extração de zip. Estado consultado por polling do JS. |
| `gd_bridge.py` | Bridges QWebChannel: `LoginBridge`, `AppBridge` (biblioteca/cofre/sync), `BoardBridge` (compat com o `boardview_ui.js`), `LeitorBridge` + `LeitorWindow` (PDF/imagem em base64, nunca em disco). |
| `gd_publicar.py` | **Lado do admin.** Varre a pasta de origem, classifica, zipa pacotes, sobe pro bucket e faz upsert em `materiais`. Sem `--publicar` só simula. |
| `sql/gamedoctor.sql` | Tabela, funções, RLS, bucket e políticas. Idempotente. |
| `boardview_feature/` | Parsers de boardview (.pcb/.bvr/.cad) copiados do Bancada PRO. Não mexer — mantém paridade. |
| `ui/` | `login.html`, `main.html`, `app.js`, `styles.css`, `leitor.html` (PDF.js + imagem), `boardview_ui.js` + `boardview.css` + `boardview_view.html` (copiados do Bancada), `vendor/pdfjs`, `img/` (ícone). |
| `gamedoctor.ico` | Ícone multi-tamanho. |
| `_tools/` | Scripts de apoio (validar, montar html, modo dev). Nada disso vai pro build. |

## 4. Como o Supabase entra (o que está feito e o que falta)

**Feito no cliente** (`gd_auth.py` / `gd_sync.py`):

- Login: `POST /auth/v1/token?grant_type=password`.
- Assinatura: `POST /rest/v1/rpc/registrar_dispositivo` com `p_hwid` e
  `p_nome_maquina` (RPC que já existe pro Bancada PRO). Retorna `OK` ou um
  código (`ASSINATURA_VENCIDA` etc.) que vira mensagem em PT-BR.
- Perfil: `GET /rest/v1/perfis?select=id,nome,papel,cpf&id=eq.<uid>` com
  fallback sem `cpf` se a coluna ainda não existir.
- CPF no primeiro login: `PATCH /rest/v1/perfis?id=eq.<uid>` com `{"cpf": ...}`.
- Catálogo: `GET /rest/v1/materiais?select=*&ativo=eq.true`.
- Download: `GET /storage/v1/object/authenticated/materiais/<storage_path>`
  com `Authorization: Bearer <token do aluno>` (bucket privado, RLS decide).
- Refresh: `POST /auth/v1/token?grant_type=refresh_token` a cada 50 min, e
  revalida a assinatura — se venceu com o app aberto, derruba o usuário.

**Feito no admin** (`gd_publicar.py`):

- Upload: `POST /storage/v1/object/materiais/<path>` com `x-upsert: true`.
- Upsert: `POST /rest/v1/materiais?on_conflict=slug` com
  `Prefer: resolution=merge-duplicates`. Versão incrementa quando o sha256 muda.
- Item que sumiu da pasta de origem → `ativo=false`.

**O que falta / conferir (é aqui que você entra):**

1. Rodar `sql/gamedoctor.sql`. Antes, **conferir a função `gd_acesso_ok`**:
   os nomes de coluna de `assinaturas` (`usuario_id`, `status`, `expira_em`)
   foram chutados. Ela é o que libera leitura da tabela e do bucket.
2. Storage: limite por arquivo (padrão 50 MB; o maior pacote tem 312 MB) e
   espaço do plano (acervo tem ~3,5 GB).
3. Nada foi testado contra o Supabase real ainda — só contra a pasta local.
   O primeiro `_publicar.bat --publicar` e o primeiro login de aluno de
   verdade vão mostrar o que eu não previ.
4. Upload de arquivo grande é um POST único (`urllib`, timeout 600 s). Se
   cair muito, trocar por upload resumível (TUS) do Supabase.
5. `perfis.cpf`: se não existir, o app segue e a marca usa o e-mail.

## 5. Decisões que já foram tomadas (não reabrir sem falar com o Thiago)

- Documentação fica presa no app; só softwares vão pro disco.
- Marca d'água é aplicada **no cliente**, na ingestão, uma vez. Se um dia
  quiserem carimbo server-side (Edge Function), a estrutura do `gd_marca.py`
  serve igual.
- Mesma conta e mesma RPC de dispositivo do Bancada PRO (mesmo HWID = não
  gasta vaga extra de máquina).
- Navegação espelha a árvore de pastas do Thiago: `marca > console > subpastas`
  (campo `pasta` na tabela). Sem filtro por categoria na lateral.
- Boardviewer sem as ferramentas de ajuste/foto (exclusivas do Bancada PRO).
- Nada de `subprocess` pra `.exe` externo (regra da casa). `os.startfile` pra
  abrir pasta é ok.
- Sem `<select>` nativo no QtWebEngine (bug conhecido) — se precisar, dropdown
  custom.

## 6. Como o publicador classifica o acervo

Árvore de origem: `marca\console\...` (ex.: `Sony\PS5\...`). Regras:

- Pasta que contém arquivo de programa (`.exe .dll .py .bin .xbe .xex .uf2`…)
  é um **pacote**: vira um único software (zip da pasta inteira). Imagens e
  PDFs de dentro **não** viram material — são parte do programa.
- Fora de pacotes: `.pdf` → documento; `.png/.jpg/...` → imagem;
  `.pcb/.bvr/.cad` → boardview; `.zip/.rar/.7z/.exe/.msi` soltos → software
  individual; outros soltos (txt, md, kicad) → um zip `"<pasta> - arquivos"`.
- Pasta com nome genérico (`bin`, `common`, `x64`…) ganha o nome do pai.
- Caminhos com mais de 260 caracteres existem no acervo (Xbox OG): tudo passa
  por `_lp()` (prefixo `\\?\`).

Plano real do `H:\`: 1.768 materiais — 155 PDFs, 1.425 imagens (1.303 são os
diagramas de chip do PS2), 45 boardviews, 143 softwares.

## 7. Segurança — o que protege e o que não protege

- Cofre: AES-GCM com chave amarrada ao Windows do aluno (DPAPI). Um PDF
  copiado do cofre pra outro PC não abre. Mas o aluno logado, com
  conhecimento, consegue extrair da RAM ou do temporário do boardview — por
  isso a marca d'água existe: rastreio, não impedimento.
- Marca d'água: visível (diagonal + rodapé) e invisível (metadados com uid,
  CPF, e-mail e data). Sobrevive a print de tela; não sobrevive a recorte +
  redesenho.
- Leitor bloqueia Ctrl+S/Ctrl+P, menu de contexto e downloads do QtWebEngine.
- `DEV_LOGIN_OFFLINE = True` na fonte. **O build precisa forçar `False` e
  abortar se não conseguir** (o `_build_dist.py` do Bancada PRO faz exatamente
  isso; copiar a trava).
- A anon key do Supabase está no código (pública por design, como no Bancada);
  toda a proteção depende do RLS estar certo.

## 8. Build e distribuição (não começado)

O Bancada PRO tem a cadeia pronta em `C:\build_tools\` (Nuitka standalone →
`_completar_dist.py` → Inno Setup). O Game Doctor deve usar o mesmo molde:
venv Python 3.12, `--include-package=boardview_feature`, pymupdf copiado solto
(Nuitka não compila o `mupdf.c` — heap do MSVC estoura), `gamedoctor.ico`,
e a trava de `DEV_LOGIN_OFFLINE`. Instalador de uns 60–80 MB. Depois: link do
`.exe` no site, só pra logado.

## 9. Pendências conhecidas / ideias que ficaram

- Ligação boardview ↔ esquema é por semelhança de nome dentro do mesmo
  console (`_esquema_irmao`). Funciona pra maioria; um campo explícito na
  tabela (`esquema_id`) seria mais robusto.
- A ingestão (marca d'água) roda numa thread Python; em PDFs enormes o app
  fica pesado por alguns segundos. Se incomodar, mover pra um processo
  separado (`multiprocessing`, com cuidado no Nuitka).
- Sem visualizador de vídeo (há `.wmv/.xmv` no acervo, hoje vão dentro dos
  pacotes).
- "Baixar de novo" um software não pergunta nada; sobrescreve.
- Notificação de material novo por e-mail (trigger no Supabase) ficou como
  fase 2.

Qualquer coisa que não estiver clara, o Thiago tem o histórico completo de
como cada decisão foi tomada. Boa sorte — o grosso está andando, o que falta
é ligar na tomada certa.
