# -*- coding: utf-8 -*-
"""
gd_sync.py — sincronizacao do acervo do Game Doctor com o Supabase.

Como o app sabe que ha material novo:
  tabela `materiais` = manifesto remoto (1 linha por arquivo, com sha256 e
  versao). O app baixa a lista, compara com o manifesto local do cofre e
  baixa SO a diferenca (novo, versao/sha diferente). Linha removida ou
  ativo=false -> some do cofre.

Download: GET /storage/v1/object/authenticated/<bucket>/<path> com o token
do aluno (bucket privado; RLS exige assinatura ativa). Documentos e
imagens recebem a marca d'agua antes de entrar no cofre. Softwares nao
entram no cofre: sao baixados sob demanda para a pasta do aluno.
"""
import os, io, json, hashlib, threading, time, zipfile, traceback, urllib.parse
from gd_auth import _req, SESSAO
from gd_config import (GAME_DOCTOR_API_URL, CATEGORIAS_COFRE, CATEGORIA_SOFTWARE, PASTA_SOFTWARES,
                       EXT_PACOTE, categoria_por_extensao)
import gd_marca


class Sync:
    def __init__(self, cofre, fonte_local=None):
        self.cofre = cofre
        # [DEV] fonte_local = pasta no disco que faz as vezes do Supabase
        # (catalogo montado pelo gd_publicar.planejar, arquivos lidos do disco).
        # So' usado pelo _tools\_teste_dev.py — build de cliente nunca seta.
        self.fonte_local = fonte_local
        self.catalogo = []          # lista remota (dicts)
        self.estado = {"rodando": False, "fase": "", "atual": "", "feitos": 0,
                       "total": 0, "pct": 0, "novos": [], "erro": "",
                       "ultima": 0, "removidos": 0, "catalogo_n": 0}
        self._lock = threading.Lock()
        self._cancel_event = threading.Event()
        self._download_id = None
        self._th = None
        self.on_novos = None        # callback(lista_de_itens) -> toast

    # ── catalogo remoto ──────────────────────────────────────────
    def baixar_catalogo(self):
        if self.fonte_local:
            return self._catalogo_local()
        st, response = _req("GET", "/api/software/catalog", token=SESSAO.get("token"), timeout=30)
        rows = (response or {}).get("items") if isinstance(response, dict) else None
        if st != 200 or not isinstance(rows, list):
            msg = rows.get("message") if isinstance(rows, dict) else None
            raise RuntimeError(f"catálogo indisponível (HTTP {st}) {msg or ''}")
        self.catalogo = [_normalizar(r) for r in rows]
        return self.catalogo

    def pendentes(self):
        """Itens do cofre que faltam/estao desatualizados + ids a remover."""
        faltam, ids_remotos = [], set()
        for m in self.catalogo:
            ids_remotos.add(str(m["id"]))
            if m.get("categoria") not in CATEGORIAS_COFRE:
                continue
            if not self.cofre.tem(m["id"], m.get("sha256"), m.get("versao")) or not self._marcado(m):
                faltam.append(m)
        remover = [mid for mid in list(self.cofre.manifesto["itens"].keys())
                   if mid not in ids_remotos]
        return faltam, remover

    def _marcado(self, m):
        """Documento/imagem guardado SEM marca d'água (versão antiga do app) conta
        como não baixado: força baixar de novo e carimbar."""
        if m.get("categoria") not in ("documento", "imagem"):
            return True
        it = self.cofre.item(m["id"]) or {}
        return bool(it.get("marcado"))

    def tem_pronto(self, m):
        return self.cofre.tem(m["id"], m.get("sha256"), m.get("versao")) and self._marcado(m)

    def _catalogo_local(self):
        """[DEV] monta o catalogo a partir de uma pasta local (mesmas regras
        do publicador). id = sha1 do slug; sha256 calculado no disco."""
        import gd_publicar
        lp = gd_publicar._lp
        itens = gd_publicar.planejar(self.fonte_local)
        rows = []
        for it in itens:
            if isinstance(it["fonte"], list):
                sha = "zip-" + str(int(sum(os.path.getmtime(lp(a)) for a in it["fonte"])))
            else:
                st_ = os.stat(lp(it["fonte"]))
                sha = f"local-{st_.st_size}-{int(st_.st_mtime)}"   # muda se o arquivo mudar
            rows.append({"id": hashlib.sha1(it["slug"].encode()).hexdigest()[:16],
                         "slug": it["slug"], "nome": it["nome"], "arquivo": it["arquivo"],
                         "categoria": it["categoria"], "marca": it["marca"],
                         "console": it["console"], "pasta": it.get("pasta", ""), "descricao": "",
                         "storage_path": it["slug"], "tamanho": it["tamanho"],
                         "sha256": sha, "versao": 1, "aplicar_marca": True,
                         "extrair": bool(it.get("extrair", True)), "ativo": True,
                         "_fonte": it["fonte"], "_raiz": it.get("raiz")})
        rows.sort(key=lambda r: (r["marca"], r["console"], r["nome"]))
        self.catalogo = rows
        return rows

    # ── download ─────────────────────────────────────────────────
    def _baixar_bytes(self, storage_path, progresso=None):
        if self.fonte_local:
            m = next((r for r in self.catalogo if r["storage_path"] == storage_path), None)
            if m is None:
                raise RuntimeError("item nao encontrado na fonte local")
            import gd_publicar
            if isinstance(m["_fonte"], list):
                return gd_publicar.zipar({"fonte": m["_fonte"], "raiz": m["_raiz"]})
            with open(gd_publicar._lp(m["_fonte"]), "rb") as f:
                return f.read()
        import urllib.request
        mid = next((str(m["id"]) for m in self.catalogo if m.get("storage_path") == storage_path), None)
        if not mid:
            raise RuntimeError("item nao encontrado no catalogo")
        url = GAME_DOCTOR_API_URL + "/api/software/materials/" + urllib.parse.quote(mid) + "/download"
        req = urllib.request.Request(url, headers={"Authorization": "Bearer " + SESSAO.get("token", "")})
        with urllib.request.urlopen(req, timeout=60) as r:
            if r.status != 200:
                raise RuntimeError(f"HTTP {r.status}")
            tot = int(r.headers.get("Content-Length") or 0)
            buf = io.BytesIO()
            lido = 0
            while True:
                if self._cancel_event.is_set():
                    raise RuntimeError("Download cancelado pelo usuário.")
                chunk = r.read(256 * 1024)
                if not chunk:
                    break
                buf.write(chunk)
                lido += len(chunk)
                if progresso and tot:
                    progresso(lido, tot)
            return buf.getvalue()

    def _ingerir(self, m):
        """Baixa, confere hash, aplica marca e guarda no cofre."""
        def prog(lido, tot):
            with self._lock:
                self.estado["pct_item"] = int(lido * 100 / tot)
        dados = self._baixar_bytes(m["storage_path"], prog)
        if m.get("sha256") and len(m["sha256"]) == 64:
            h = hashlib.sha256(dados).hexdigest()
            if h.lower() != m["sha256"].lower():
                raise RuntimeError("hash divergente (download corrompido)")
        # Marca d'água SEMPRE em documento/imagem (decisão do produto; o servidor não manda nisso).
        marcado = False
        if m.get("categoria") in ("documento", "imagem"):
            with self._lock:
                self.estado["fase"] = "Aplicando marca d'água"
            dados = gd_marca.aplicar(dados, m["categoria"], m.get("arquivo") or m["nome"], SESSAO)
            marcado = True
        meta = {k: m.get(k) for k in ("slug", "nome", "arquivo", "categoria", "marca",
                                      "console", "pasta", "sha256", "versao", "tamanho", "descricao")}
        meta["visto"] = False
        meta["marcado"] = marcado
        self.cofre.guardar(m["id"], dados, meta)

    # ── ciclo completo (thread) ──────────────────────────────────
    def sincronizar(self, em_thread=True, notificar=True):
        if self.estado["rodando"]:
            return False
        if em_thread:
            self._th = threading.Thread(target=self._rodar, args=(notificar,), daemon=True)
            self._th.start()
            return True
        self._rodar(notificar)
        return True

    def _rodar(self, notificar):
        with self._lock:
            self.estado.update({"rodando": True, "fase": "Consultando novidades",
                                "erro": "", "novos": [], "feitos": 0, "total": 0,
                                "pct": 0, "atual": "", "removidos": 0})
        try:
            self.baixar_catalogo()
            with self._lock:
                self.estado["catalogo_n"] = len(self.catalogo)
            faltam, remover = self.pendentes()
            for mid in remover:
                self.cofre.remover(mid)
            with self._lock:
                self.estado.update({"total": 0, "feitos": 0, "pct": 100,
                                    "novos": [], "removidos": len(remover),
                                    "fase": "Catálogo atualizado", "atual": "",
                                    "ultima": time.time()})
            self.cofre.manifesto["atualizado_em"] = time.time()
            self.cofre.salvar_manifesto()
        except Exception as e:
            traceback.print_exc()
            with self._lock:
                self.estado["erro"] = str(e)
                self.estado["fase"] = "Erro"
        finally:
            with self._lock:
                self.estado["rodando"] = False

    def baixar_material(self, m):
        """Baixa um material protegido somente depois da ação do aluno."""
        if self.estado["rodando"]:
            return False, "Já existe uma operação em andamento."
        self._cancel_event.clear()
        self._download_id = str(m.get("id"))
        with self._lock:
            self.estado.update({"rodando": True, "fase": "Baixando material",
                                "atual": m.get("nome", ""), "feitos": 0,
                                "total": 1, "pct": 0, "pct_item": 0, "erro": ""})
        try:
            self._ingerir(m)
            self._download_id = None
            with self._lock:
                self.estado.update({"rodando": False, "fase": "Download concluído",
                                    "atual": "", "feitos": 1, "pct": 100,
                                    "pct_item": 100, "ultima": time.time()})
            self.cofre.manifesto["atualizado_em"] = time.time()
            self.cofre.salvar_manifesto()
            return True, "OK"
        except Exception as error:
            self._download_id = None
            with self._lock:
                self.estado.update({"rodando": False, "fase": "Erro",
                                    "erro": f"Falha ao baixar {m.get('nome')}: {error}"})
            return False, str(error)

    def cancelar_download(self, mid):
        if self.estado["rodando"] and self._download_id == str(mid):
            self._cancel_event.set()
            return True
        return False

    # ── softwares: download direto pra pasta do aluno ────────────
    def baixar_software(self, m, destino=None):
        # Árvore igual à da biblioteca: Documentos\Game Doctor\marca\console\subpasta...
        destino = destino or os.path.join(PASTA_SOFTWARES, _limpo(m.get("marca") or ""),
                                          _limpo(m.get("console") or ""),
                                          *[_limpo(x) for x in (m.get("pasta") or "").split("/") if x.strip()])
        os.makedirs(destino, exist_ok=True)
        self._cancel_event.clear()
        self._download_id = str(m.get("id"))
        with self._lock:
            self.estado.update({"rodando": True, "fase": "Baixando software",
                                "atual": m["nome"], "pct_item": 0, "erro": ""})
        try:
            def prog(lido, tot):
                with self._lock:
                    self.estado["pct_item"] = int(lido * 100 / tot)
            dados = self._baixar_bytes(m["storage_path"], prog)
            if m.get("sha256") and len(m["sha256"]) == 64 and hashlib.sha256(dados).hexdigest().lower() != m["sha256"].lower():
                raise RuntimeError("hash divergente (download corrompido)")
            arq = m.get("arquivo") or os.path.basename(m["storage_path"])
            if arq.lower().endswith(".zip") and m.get("extrair", False):
                pasta = os.path.join(destino, _limpo(os.path.splitext(arq)[0]))
                os.makedirs(pasta, exist_ok=True)
                with zipfile.ZipFile(io.BytesIO(dados)) as z:
                    z.extractall(pasta)
                # rastro: quem baixou (arquivo simples dentro da pasta)
                with open(os.path.join(pasta, "LICENCA_GAMEDOCTOR.txt"), "w", encoding="utf-8") as f:
                    f.write(gd_marca._rastro(SESSAO) + "\nUso pessoal do assinante. Nao redistribuir.\n")
                resultado = pasta
            else:
                resultado = os.path.join(destino, arq)
                with open(resultado, "wb") as f:
                    f.write(dados)
            with self._lock:
                self.estado.update({"fase": "Concluído", "atual": "", "pct_item": 100})
            self._download_id = None
            return True, resultado
        except Exception as e:
            traceback.print_exc()
            with self._lock:
                self.estado["erro"] = str(e)
                self.estado["fase"] = "Erro"
            return False, str(e)
        finally:
            self._download_id = None
            with self._lock:
                self.estado["rodando"] = False

    def estado_json(self):
        with self._lock:
            return json.dumps(self.estado, ensure_ascii=False)


def _limpo(s):
    return "".join(c for c in str(s) if c not in '\\/:*?"<>|').strip().lstrip("#").strip() or "geral"


def _normalizar(r):
    """Aplica as regras do cliente por cima do que a API manda."""
    r = dict(r)
    arq = r.get("arquivo") or os.path.basename(r.get("storage_path") or "") or r.get("nome") or ""
    r["arquivo"] = arq
    r["categoria"] = categoria_por_extensao(arq)
    meta_ext = r.get("extrair")
    if meta_ext is None:
        meta_ext = arq.lower().endswith(".zip")
    r["extrair"] = bool(meta_ext)
    r["pasta"] = "/".join(x.strip() for x in str(r.get("pasta") or "").split("/") if x.strip())
    return r
