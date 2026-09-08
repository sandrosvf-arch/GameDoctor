# -*- coding: utf-8 -*-
"""
gd_bridge.py — bridges QWebChannel do Game Doctor.

  LoginBridge  : tela de login (ui/login.html)
  AppBridge    : janela principal (ui/main.html) — biblioteca, sync, cofre
  BoardBridge  : compat com ui/boardview_ui.js (copiado do Bancada PRO)
  LeitorBridge : janela do leitor (ui/leitor.html) — PDF/imagem em bytes

Nada decifrado toca o disco de forma duradoura: PDF/imagem vao em base64
para o viewer; boardview usa um temporario apagado logo apos o parse.
"""
import os, sys, json, base64, threading, traceback, time, mimetypes, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PyQt6.QtCore import QObject, pyqtSlot, pyqtSignal, QUrl, QTimer
from PyQt6.QtWidgets import QFileDialog, QApplication, QAbstractItemView
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtGui import QIcon

import gd_auth, gd_cred, gd_marca
from gd_auth import SESSAO
from gd_config import (UI, ICONE, APP_NOME, APP_VERSAO, CATEGORIA_SOFTWARE,
                       CATEGORIAS_COFRE, PASTA_CFG, PASTA_SOFTWARES, DEV_LOGIN_OFFLINE, DEV_SENHA)

_BASE = os.path.dirname(os.path.abspath(__file__))
_IMPORT_QUEUE = os.path.join(PASTA_CFG, "import-queue.json")
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

def _tipo_importacao(ext):
    if ext == ".pdf": return "documento", "PDF"
    if ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"): return "imagem", "IMAGE"
    if ext in (".zip", ".rar", ".7z"): return "software", "ARCHIVE"
    return "documento", "OTHER"

class _ProgressReader:
    def __init__(self, source, total, callback):
        self.source, self.total, self.callback = source, total, callback
        self.sent = 0
        self.last_report = 0
        self.last_time = 0

    def read(self, size=-1):
        chunk = self.source.read(size)
        self.sent += len(chunk)
        now = time.monotonic()
        if self.sent == self.total or self.sent - self.last_report >= 1024 * 1024 or now - self.last_time >= 0.5:
            self.last_report, self.last_time = self.sent, now
            self.callback(self.sent, self.total)
        return chunk


# ═══════════════════════════════════════════════════════════════════
class LoginBridge(QObject):
    resultado = pyqtSignal(bool, str)     # emitido da thread -> slot no main

    def __init__(self, on_ok):
        super().__init__()
        self._on_ok = on_ok
        self._page = None
        self.resultado.connect(self._tratar)

    def set_page(self, page):
        self._page = page

    @pyqtSlot(result=str)
    def credenciais_salvas(self):
        return json.dumps(gd_cred.carregar() or {})

    @pyqtSlot(result=str)
    def versao(self):
        return APP_VERSAO

    @pyqtSlot(str, str, bool)
    def login(self, email, senha, lembrar):
        self._lembrar = (email, senha, lembrar)

        def run():
            if DEV_LOGIN_OFFLINE and email == "dev@local" and senha == DEV_SENHA:
                SESSAO.update({"token": "", "uid": "dev", "nome": "Dev Local",
                               "cpf": "12345678909", "email": email, "papel": "admin"})
                self.resultado.emit(True, "OK")
                return
            ok, r = gd_auth.autenticar_completo(email, senha)
            self.resultado.emit(ok, r if isinstance(r, str) else "OK")
        threading.Thread(target=run, daemon=True).start()

    def _tratar(self, ok, msg):
        email, senha, lembrar = self._lembrar
        if ok:
            if lembrar:
                gd_cred.salvar(email, senha)
            else:
                gd_cred.apagar()
            self._on_ok()
        elif self._page is not None:
            self._page.runJavaScript("loginError(%s)" % json.dumps(msg))


# ═══════════════════════════════════════════════════════════════════
class AppBridge(QObject):
    novos_materiais = pyqtSignal(list)     # da thread de sync -> main thread
    software_pronto = pyqtSignal(bool, str, str)
    material_pronto = pyqtSignal(bool, str, str)
    import_progress = pyqtSignal(int, int, str, str, int, int)
    import_done = pyqtSignal()

    def __init__(self, cofre, sync, janela):
        super().__init__()
        self.cofre, self.sync, self.win = cofre, sync, janela
        self._page = None
        self._leitor = None
        self.sync.on_novos = lambda lst: self.novos_materiais.emit(lst)
        self.novos_materiais.connect(self._avisar_novos)
        self.software_pronto.connect(self._sw_pronto)
        self.material_pronto.connect(self._material_pronto)
        self.import_progress.connect(self._import_progress_ui)
        self.import_done.connect(self._import_done_ui)
        self._retomar_importacao()

    def set_page(self, page):
        self._page = page

    def _js(self, code):
        if self._page is not None:
            try:
                self._page.runJavaScript(code)
            except Exception:
                pass

    # ── sessao / perfil ──────────────────────────────────────────
    @pyqtSlot(result=str)
    def sessao(self):
        s = SESSAO
        ass = s.get("assinatura") or {}
        assinatura = ass.get("expira_em")
        if ass.get("administrativo"):
            assinatura = "Acesso administrativo"
        return json.dumps({"nome": s.get("nome"), "email": s.get("email"),
                           "cpf": s.get("cpf"), "papel": s.get("papel"),
                           "plano": ass.get("plano"), "expira_em": assinatura,
                           "versao": APP_VERSAO, "app": APP_NOME,
                           "marca": gd_marca.texto_marca(s)}, ensure_ascii=False)

    @pyqtSlot(str, result=str)
    def salvarCpf(self, cpf):
        d = "".join(c for c in cpf if c.isdigit())
        if not gd_auth.cpf_valido(d):
            return json.dumps({"ok": False, "erro": "CPF inválido. Confira os números."})
        if SESSAO.get("uid") == "dev":
            SESSAO["cpf"] = d
            return json.dumps({"ok": True})
        ok, msg = gd_auth.salvar_cpf(SESSAO.get("token"), SESSAO.get("uid"), d)
        if not ok and "cpf" in msg.lower() and "column" in msg.lower():
            # servidor ainda sem a coluna: segue com e-mail na marca d'agua
            SESSAO["cpf"] = d
            return json.dumps({"ok": True, "aviso": "Servidor ainda não guarda CPF; marca usará o e-mail."})
        return json.dumps({"ok": ok, "erro": "" if ok else msg})

    @pyqtSlot()
    def sair(self):
        gd_cred.apagar()
        SESSAO.clear()
        self.win.encerrar(reiniciar_login=True)

    @pyqtSlot()
    def minimizarBandeja(self):
        self.win.para_bandeja()

    @pyqtSlot()
    def fecharApp(self):
        self.win.encerrar()

    # ── biblioteca ───────────────────────────────────────────────
    @pyqtSlot(result=str)
    def listarMateriais(self):
        """Catalogo remoto (ultimo baixado) + estado local de cada item."""
        itens = []
        for m in self.sync.catalogo:
            mid = str(m["id"])
            loc = self.cofre.item(mid) or {}
            cofre = m.get("categoria") in CATEGORIAS_COFRE
            itens.append({
                "id": mid, "nome": m.get("nome"), "arquivo": m.get("arquivo"),
                "categoria": m.get("categoria"), "marca": m.get("marca") or "Outros",
                "console": m.get("console") or "Geral", "descricao": m.get("descricao") or "",
                "pasta": (m.get("pasta") or "").strip("/"),
                "tamanho": m.get("tamanho") or 0, "versao": m.get("versao") or 1,
                "criado_em": m.get("criado_em"), "atualizado_em": m.get("atualizado_em"),
                "disponivel": (self.cofre.tem(mid, m.get("sha256"), m.get("versao"))
                               if cofre else True),
                "visto": bool(loc.get("visto")) if cofre else True,
                "cofre": cofre,
            })
        return json.dumps({"itens": itens, "sync": json.loads(self.sync.estado_json())},
                          ensure_ascii=False)

    @pyqtSlot(result=bool)
    def sincronizar(self):
        return self.sync.sincronizar(em_thread=True, notificar=True)

    @pyqtSlot(result=str)
    def estadoSync(self):
        return self.sync.estado_json()

    @pyqtSlot(result=str)
    def importarPasta(self):
        if str(SESSAO.get("papel", "")).lower() not in ("admin", "editor"):
            return json.dumps({"ok": False, "erro": "Apenas administradores podem importar materiais."})
        dialog = QFileDialog(None, "Selecionar pastas de materiais")
        dialog.setFileMode(QFileDialog.FileMode.Directory)
        dialog.setOption(QFileDialog.Option.ShowDirsOnly, True)
        dialog.setOption(QFileDialog.Option.DontUseNativeDialog, True)
        for view in dialog.findChildren(QAbstractItemView):
            view.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        if dialog.exec() != QFileDialog.DialogCode.Accepted:
            return json.dumps({"ok": False, "cancelado": True})
        pastas = dialog.selectedFiles()
        if not pastas:
            return json.dumps({"ok": False, "cancelado": True})
        os.makedirs(PASTA_CFG, exist_ok=True)
        with open(_IMPORT_QUEUE, "w", encoding="utf-8") as f:
            json.dump({"pastas": pastas, "criado_em": time.time()}, f, ensure_ascii=False)
        threading.Thread(target=self._importar_pastas, args=(pastas, False), daemon=True).start()
        return json.dumps({"ok": True})

    def _importar_pastas(self, pastas, retomar=True):
        try:
            with ThreadPoolExecutor(max_workers=min(3, len(pastas))) as executor:
                list(executor.map(lambda pasta: self._importar_pasta(pasta, retomar), pastas))
        finally:
            try:
                os.remove(_IMPORT_QUEUE)
            except FileNotFoundError:
                pass
            self.import_done.emit()

    def _retomar_importacao(self):
        try:
            with open(_IMPORT_QUEUE, encoding="utf-8") as f:
                pastas = json.load(f).get("pastas", [])
            pastas = [p for p in pastas if os.path.isdir(p)]
        except Exception:
            return
        if pastas:
            threading.Thread(target=self._importar_pastas, args=(pastas, True), daemon=True).start()

    def _importar_pasta(self, pasta, retomar=True):
        manifest_path = os.path.join(pasta, ".gamedoctor-import.json")
        try:
            with open(manifest_path, encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}
        files = []
        for root, _, names in os.walk(pasta):
            for name in names:
                if name.startswith(".") or name == os.path.basename(manifest_path):
                    continue
                path = os.path.join(root, name)
                if os.path.isfile(path): files.append(path)
        total = len(files)
        pasta_raiz = os.path.basename(os.path.abspath(pasta))
        for index, path in enumerate(files, 1):
            rel = os.path.relpath(path, pasta).replace("\\", "/")
            source_key = f"{pasta_raiz}/{rel}"
            if retomar and manifest.get(rel, {}).get("status") == "done":
                self._import_progress(index, total, rel, "já processado", 0, os.path.getsize(path))
                continue
            try:
                parts = rel.split("/")
                marca = parts[0] if len(parts) > 1 else os.path.basename(os.path.abspath(pasta))
                console = parts[1] if len(parts) > 2 else "Geral"
                subpasta = "/".join(parts[2:-1]) if len(parts) > 2 else ""
                ext = os.path.splitext(path)[1].lower()
                categoria, tipo = _tipo_importacao(ext)
                mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
                size = os.path.getsize(path)
                file_name = os.path.basename(path)
                status, prepared = gd_auth._req("POST", "/api/software/admin/upload-url", token=SESSAO.get("token"), body={
                    "fileName": file_name,
                    "mimeType": mime, "sizeBytes": size, "category": marca, "sourceKey": source_key,
                }, timeout=30)
                if status != 200: raise RuntimeError((prepared or {}).get("error", f"HTTP {status}"))
                if prepared.get("skipped"):
                    manifest[rel] = {"status": "done", "updated": time.time(), "server": "already_exists"}
                    with open(manifest_path, "w", encoding="utf-8") as f: json.dump(manifest, f, ensure_ascii=False, indent=2)
                    self._import_progress(index, total, rel, "ignorado", 0, size)
                    continue
                with open(path, "rb") as source:
                    reader = _ProgressReader(source, size, lambda sent, total_bytes: self._import_progress(
                        index, total, rel, "enviando", sent, total_bytes))
                    request = urllib.request.Request(prepared["signedUrl"], data=reader, method="PUT", headers={
                        "Content-Type": mime, "Content-Length": str(size)})
                    with urllib.request.urlopen(request, timeout=1800) as response:
                        if response.status not in (200, 201): raise RuntimeError(f"upload HTTP {response.status}")
                status, created = gd_auth._req("POST", "/api/software/admin/material", token=SESSAO.get("token"), body={
                    "title": os.path.splitext(os.path.basename(path))[0], "fileName": os.path.basename(path),
                    "storagePath": prepared["path"], "mimeType": mime, "sizeBytes": size,
                    "type": tipo, "category": categoria, "sourceKey": source_key,
                    "metadata": {"marca": marca, "console": console, "pasta": subpasta, "extrair": ext == ".zip"},
                }, timeout=30)
                if status not in (200, 201): raise RuntimeError((created or {}).get("error", f"HTTP {status}"))
                manifest[rel] = {"status": "done", "updated": time.time()}
                with open(manifest_path, "w", encoding="utf-8") as f: json.dump(manifest, f, ensure_ascii=False, indent=2)
                self._import_progress(index, total, rel, "processado", size, size)
            except Exception as error:
                manifest[rel] = {"status": "error", "error": str(error), "updated": time.time()}
                with open(manifest_path, "w", encoding="utf-8") as f: json.dump(manifest, f, ensure_ascii=False, indent=2)
                self._import_progress(index, total, rel, "erro: " + str(error), 0, size if "size" in locals() else 0)
    def _import_progress(self, current, total, name, status, sent=0, size=0):
        self.import_progress.emit(current, total, name, status, sent, size)

    def _import_progress_ui(self, current, total, name, status, sent, size):
        self._js("try{GD.importProgress(%s,%s,%s,%s,%s,%s)}catch(e){}" % (
            current, total, json.dumps(name, ensure_ascii=False), json.dumps(status, ensure_ascii=False), sent, size))

    def _import_done_ui(self):
        self._js("try{GD.importDone()}catch(e){}")

    @pyqtSlot(str, result=str)
    def baixarMaterial(self, mid):
        m = self._meta(mid)
        if not m or m.get("categoria") not in CATEGORIAS_COFRE:
            return json.dumps({"ok": False, "erro": "Material não encontrado."})
        if self.cofre.tem(mid, m.get("sha256"), m.get("versao")):
            return json.dumps({"ok": True, "ja_baixado": True})

        def run():
            ok, message = self.sync.baixar_material(m)
            self.material_pronto.emit(ok, message, mid)

        threading.Thread(target=run, daemon=True).start()
        return json.dumps({"ok": True})

    @pyqtSlot(str, result=bool)
    def cancelarDownload(self, mid):
        return self.sync.cancelar_download(mid)

    def _material_pronto(self, ok, message, mid):
        self._js("try{GD.onMaterial(%s,%s,%s)}catch(e){}" % (
            json.dumps(ok), json.dumps(message, ensure_ascii=False), json.dumps(mid)))
        if ok:
            self.win.toast("Download concluído", "Material pronto para abrir.")

    def _avisar_novos(self, lst):
        nomes = [n["nome"] for n in lst]
        self.win.toast("Novo material disponível",
                       (nomes[0] if len(nomes) == 1 else f"{len(nomes)} novos materiais: "
                        + ", ".join(nomes[:3]) + ("…" if len(nomes) > 3 else "")))
        self._js("try{GD.onNovos(%s)}catch(e){}" % json.dumps(nomes, ensure_ascii=False))

    # ── abrir documento / imagem (janela do leitor) ──────────────
    @pyqtSlot(str, result=str)
    def abrirDocumento(self, mid):
        m = self._meta(mid)
        if not m:
            return json.dumps({"ok": False, "erro": "Material não encontrado."})
        if not self.cofre.tem(mid):
            return json.dumps({"ok": False, "erro": "Ainda não baixado. Aguarde a sincronização."})
        self.cofre.marcar_visto(mid)
        self._abrir_leitor(mid, m)
        return json.dumps({"ok": True})

    def _abrir_leitor(self, mid, m, cross=False):
        if self._leitor is None:
            self._leitor = LeitorWindow(self)
        self._leitor.abrir(mid, m, cross)

    @pyqtSlot(str, result=str)
    def boardviewCarregar(self, mid):
        """Decifra para temporario, parseia com o board_loader do Bancada PRO,
        apaga o temporario e devolve o JSON do board."""
        m = self._meta(mid)
        if not m:
            return json.dumps({"ok": False, "erro": "Material não encontrado."})
        if not self.cofre.tem(mid):
            return json.dumps({"ok": False, "erro": "Ainda não baixado. Aguarde a sincronização."})
        try:
            from boardview_feature import board_loader as BL
            nome = m.get("arquivo") or m.get("nome")
            with self.cofre.temporario(mid, nome) as p:
                d = BL.carregar(p)
            d["caminho"] = "gd://" + mid
            d["foto"] = None
            d["schematic"] = self._esquema_irmao(m)
            d["ok"] = True
            self._board_atual = mid
            # ajuste de faces salvo pelo aluno (chave = id do material)
            ap = os.path.join(os.path.dirname(BL.__file__), "cache", f"gd_{mid}.faces.json")
            if os.path.exists(ap):
                try:
                    d["ajuste_faces"] = json.load(open(ap, encoding="utf-8"))
                except Exception:
                    pass
            self.cofre.marcar_visto(mid)
            return json.dumps(d, ensure_ascii=False)
        except Exception as e:
            traceback.print_exc()
            return json.dumps({"ok": False, "erro": str(e)})

    def _esquema_irmao(self, m):
        """PDF do mesmo console cujo nome pareca com o da placa -> gd://id"""
        base = set(_tokens(m.get("nome", "")))
        melhor, score = None, 0.0
        for o in self.sync.catalogo:
            if o.get("categoria") != "documento" or o.get("console") != m.get("console"):
                continue
            if not str(o.get("arquivo", "")).lower().endswith(".pdf"):
                continue
            t = set(_tokens(o.get("nome", "")))
            s = len(base & t) / max(1, len(base | t))
            if s > score:
                melhor, score = o, s
        return ("gd://" + str(melhor["id"])) if (melhor and score >= 0.25) else None

    def _meta(self, mid):
        for m in self.sync.catalogo:
            if str(m["id"]) == str(mid):
                return m
        loc = self.cofre.item(mid)
        if loc:
            return dict(loc, id=mid)
        return None

    # ── softwares ────────────────────────────────────────────────
    @pyqtSlot(str, bool, result=str)
    def baixarSoftware(self, mid, escolher_pasta):
        m = self._meta(mid)
        if not m or m.get("categoria") != CATEGORIA_SOFTWARE:
            return json.dumps({"ok": False, "erro": "Software não encontrado."})
        destino = None
        if escolher_pasta:
            destino = QFileDialog.getExistingDirectory(None, "Salvar em", PASTA_SOFTWARES)
            if not destino:
                return json.dumps({"ok": False, "cancelado": True})

        def run():
            ok, r = self.sync.baixar_software(m, destino)
            self.software_pronto.emit(ok, r, mid)
        threading.Thread(target=run, daemon=True).start()
        return json.dumps({"ok": True})

    def _sw_pronto(self, ok, r, mid):
        self._js("try{GD.onSoftware(%s,%s,%s)}catch(e){}" % (
            json.dumps(ok), json.dumps(r, ensure_ascii=False), json.dumps(mid)))
        if ok:
            self.win.toast("Download concluído", os.path.basename(r))

    @pyqtSlot(str)
    def abrirPasta(self, caminho):
        try:
            os.startfile(caminho if os.path.isdir(caminho) else os.path.dirname(caminho))
        except Exception as e:
            print(f"[APP] abrirPasta: {e}")

    @pyqtSlot(result=str)
    def pastaSoftwares(self):
        return PASTA_SOFTWARES


# ═══════════════════════════════════════════════════════════════════
class BoardBridge(QObject):
    """Compat com boardview_ui.js (copiado do Bancada PRO) — sem arquivos
    soltos: tudo vem do cofre via AppBridge."""

    def __init__(self, app_bridge):
        super().__init__()
        self.app = app_bridge

    @pyqtSlot(result=str)
    def listarRecentes(self):
        return "[]"

    @pyqtSlot(result=str)
    def abrirEcarregar(self):
        return json.dumps({"ok": False, "cancelado": True})

    @pyqtSlot(str, result=str)
    def carregar(self, path):
        if path.startswith("gd://"):
            return self.app.boardviewCarregar(path[5:])
        return json.dumps({"ok": False, "erro": "Abra a placa pela biblioteca."})

    @pyqtSlot(result=bool)
    def isAdmin(self):
        return False

    @pyqtSlot(str, result=str)
    def fotoDataUrl(self, path):
        return ""

    @pyqtSlot(str, result=str)
    def salvarAjusteFaces(self, ajuste_json):
        try:
            from boardview_feature import board_loader as BL
            # chave estavel: id do material
            mid = (getattr(self.app, "_board_atual", None) or "sem-id")
            ap = os.path.join(os.path.dirname(BL.__file__), "cache", f"gd_{mid}.faces.json")
            os.makedirs(os.path.dirname(ap), exist_ok=True)
            with open(ap, "w", encoding="utf-8") as fh:
                fh.write(ajuste_json)
            return json.dumps({"ok": True, "path": ap})
        except Exception as e:
            return json.dumps({"ok": False, "erro": str(e)})

    @pyqtSlot(result=str)
    def escolherSchematic(self):
        return ""

    @pyqtSlot(str, result=bool)
    def abrirSchematicPDF(self, path):
        if not path or not path.startswith("gd://"):
            return False
        mid = path[5:]
        m = self.app._meta(mid)
        if not m or not self.app.cofre.tem(mid):
            return False
        self.app._abrir_leitor(mid, m, cross=True)
        return True

    @pyqtSlot(result=bool)
    def fecharSchematicPDF(self):
        if self.app._leitor is not None:
            self.app._leitor.close()
        return True

    @pyqtSlot(str)
    def schBuscar(self, nome):
        if self.app._leitor is not None and nome:
            self.app._leitor.page().runJavaScript(
                "try{CP.buscarExterno(%s)}catch(e){}" % json.dumps(str(nome)))

    @pyqtSlot(str)
    def schProbeBoard(self, texto):
        if texto:
            self.app._js("try{window.BVCROSS&&BVCROSS.selecionar(%s)}catch(e){}"
                         % json.dumps(str(texto)))


# ═══════════════════════════════════════════════════════════════════
class LeitorBridge(QObject):
    def __init__(self, app_bridge, win):
        super().__init__()
        self.app, self.win = app_bridge, win

    @pyqtSlot(result=str)
    def carregar(self):
        """Entrega o documento atual em base64 (fica so na RAM do viewer)."""
        mid, m, cross = self.win.atual
        try:
            dados = self.app.cofre.ler(mid)
        except Exception as e:
            return json.dumps({"ok": False, "erro": str(e)})
        nome = (m.get("arquivo") or m.get("nome") or "")
        ext = nome.rsplit(".", 1)[-1].lower() if "." in nome else ""
        tipo = "pdf" if ext == "pdf" else "imagem"
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "webp": "image/webp", "bmp": "image/bmp", "gif": "image/gif"}.get(ext, "application/octet-stream")
        return json.dumps({"ok": True, "tipo": tipo, "mime": mime, "nome": m.get("nome"),
                           "b64": base64.b64encode(dados).decode("ascii"),
                           "cross": bool(cross), "marca": gd_marca.texto_marca(SESSAO)})

    @pyqtSlot(str)
    def schProbeBoard(self, texto):
        if texto:
            self.app._js("try{window.BVCROSS&&BVCROSS.selecionar(%s)}catch(e){}"
                         % json.dumps(str(texto)))


class LeitorWindow(QWebEngineView):
    def __init__(self, app_bridge):
        super().__init__()
        self.app = app_bridge
        self.atual = (None, {}, False)
        self.setWindowIcon(QIcon(ICONE))
        self.resize(1100, 820)
        self._bridge = LeitorBridge(app_bridge, self)
        self._ch = QWebChannel(self)
        self._ch.registerObject("leitorBridge", self._bridge)
        self.page().setWebChannel(self._ch)
        # sem download/salvar: bloqueia pedidos de download do QtWebEngine
        try:
            self.page().profile().downloadRequested.connect(lambda d: d.cancel())
        except Exception:
            pass

    def abrir(self, mid, m, cross=False):
        self.atual = (mid, m, cross)
        self.setWindowTitle(f"{m.get('nome')} — {APP_NOME}")
        self.load(QUrl.fromLocalFile(os.path.join(UI, "leitor.html")))
        self.show(); self.raise_(); self.activateWindow()

    def closeEvent(self, ev):
        self.atual = (None, {}, False)
        self.app._js("try{BV.schAberto=false}catch(e){}")
        super().closeEvent(ev)


def _tokens(s):
    import re
    return [t for t in re.split(r"[^a-z0-9]+", str(s).lower()) if len(t) > 1]
