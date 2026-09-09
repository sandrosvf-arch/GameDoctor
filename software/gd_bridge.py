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
import os, sys, io, re, json, base64, threading, traceback, time, mimetypes, zipfile, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PyQt6.QtCore import QObject, pyqtSlot, pyqtSignal, QUrl, QTimer
from PyQt6.QtWidgets import QFileDialog, QApplication, QAbstractItemView
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtGui import QIcon

import gd_auth, gd_cred, gd_marca
from gd_auth import SESSAO
from gd_config import (UI, ICONE, APP_NOME, APP_VERSAO, CATEGORIA_SOFTWARE,
                       CATEGORIAS_COFRE, PASTA_CFG, PASTA_SOFTWARES, DEV_LOGIN_OFFLINE, DEV_SENHA,
                       EXT_DOC, EXT_IMG, EXT_BV, EXT_PACOTE, categoria_por_extensao, rotulo_categoria)

_BASE = os.path.dirname(os.path.abspath(__file__))
_IMPORT_QUEUE = os.path.join(PASTA_CFG, "import-queue.json")
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

# ── classificação da importação (mesmas regras do acervo do Thiago) ──────────
# Pasta que contém arquivo de PROGRAMA vira UM pacote (zip da subárvore inteira);
# imagens/PDFs de dentro NÃO viram material. Fora de pacotes: pdf → documento,
# imagem → imagem, boardview → boardview, zip/rar/7z/exe/msi soltos → software,
# demais soltos (txt, md, uf2, bin, hex…) → arquivo individual para o disco.
EXT_PROGRAMA = {".exe", ".dll", ".py", ".pyd", ".pyo", ".pyc", ".bat", ".cmd", ".ps1", ".msi",
                ".sys", ".inf", ".xbe", ".xex", ".elf", ".so", ".jar", ".xip", ".xbx", ".xbg",
                ".xpr", ".nfo", ".acl", ".po", ".ttf", ".wav", ".xtf", ".xmv", ".dds", ".tga",
                ".vcproj", ".cpp", ".c", ".h"}
# caches do OpenBoardView/FlexBV (.obdlocal/.sqlite3/.obdq/.jrl/imgui.ini/localfbv.log) e lixo do Windows nunca sobem
EXT_IGNORAR = {".obdlocal", ".sqlite3", ".obdq", ".jrl", ".log", ".pf", ".db", ".lnk", ".tmp", ".bak", ".gamedoctor-import"}
NOMES_IGNORAR = {"thumbs.db", "desktop.ini", ".ds_store", ".gamedoctor-import.json", "imgui.ini", "localfbv.log"}
NOMES_GENERICOS = {"bin", "lib", "libs", "app", "src", "files", "common", "x64", "x86", "win",
                   "win32", "win64", "windows", "release", "debug", "dist", "build", "data",
                   "assets", "tools", "portable", "program", "programa", "arquivos"}


def _lp(p):
    return ("\\\\?\\" + os.path.abspath(p)) if (os.name == "nt" and not str(p).startswith("\\\\?\\")) else p


def _slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("-").lower()
    return re.sub(r"-{2,}", "-", s) or "arquivo"


def _tipo_api(categoria, ext):
    if categoria == "documento": return "PDF"
    if categoria == "imagem": return "IMAGE"
    if ext in EXT_PACOTE or ext == ".zip": return "ARCHIVE"
    return "OTHER"


# arquivos que, soltos, viram um material individual para o disco (firmware, imagens de sistema…)
EXT_SOLTO = EXT_PACOTE | {".uf2", ".bin", ".hex", ".rom", ".img", ".iso", ".firm", ".cia", ".3dsx",
                          ".nro", ".nsp", ".xci", ".elf", ".xex", ".xbe", ".srm", ".sav", ".cab", ".deb",
                          ".gz", ".tar", ".apk", ".ipa", ".dol", ".wad", ".pup", ".pkg"}
EXT_MATERIAL = EXT_DOC | EXT_IMG | EXT_BV


def _e_pacote(nomes):
    """Pasta é um pacote de software? Contém arquivo forte de programa (dll, py, xbe…),
    ou um executável/instalador acompanhado de outros arquivos de apoio (xml, ini, dat…)."""
    exts = {os.path.splitext(f)[1].lower() for f in nomes}
    if exts & (EXT_PROGRAMA - {".exe", ".msi"}):
        return True
    if exts & {".exe", ".msi"} and (exts - EXT_MATERIAL - EXT_PACOTE - EXT_SOLTO):
        return True
    return False


def planejar_importacao(pasta):
    """Devolve a lista de itens a enviar. A pasta selecionada é uma MARCA (Sony, Microsoft…):
    marca = nome da pasta, console = 1º nível, subpasta = níveis seguintes — a mesma árvore
    de H:\PARA UPAR NO DRIVE. Se a pasta for a raiz do acervo, cada filha vira uma marca."""
    pasta = os.path.abspath(pasta)
    raiz_nome = os.path.basename(pasta)
    itens = []

    def rel_de(p):
        return os.path.relpath(p, pasta).replace("\\", "/")

    def meta_de(rel_dir):
        parts = [x for x in rel_dir.split("/") if x and x != "."]
        marca = raiz_nome
        console = parts[0] if parts else "Geral"
        sub = "/".join(parts[1:])
        return marca, console, sub

    def varrer(d):
        try:
            nomes = sorted(os.listdir(_lp(d)))
        except OSError:
            return
        arquivos = [f for f in nomes if os.path.isfile(_lp(os.path.join(d, f)))
                    and os.path.splitext(f)[1].lower() not in EXT_IGNORAR
                    and f.lower() not in NOMES_IGNORAR and not f.startswith("~$") and not f.startswith(".")]
        dirs = [x for x in nomes if os.path.isdir(_lp(os.path.join(d, x)))]
        rel_dir = rel_de(d) if d != pasta else ""
        nivel = len([x for x in rel_dir.split("/") if x]) if rel_dir else 0
        if nivel >= 2 and _e_pacote(arquivos):          # abaixo do console (marca=0, console=1): pacote
            arqs = []
            for r, _, fs in os.walk(_lp(d)):
                r = r[len(_lp(d)) - len(d):] if r.startswith("\\\\?\\") else r
                for f in fs:
                    if os.path.splitext(f)[1].lower() in EXT_IGNORAR or f.lower() in NOMES_IGNORAR:
                        continue
                    arqs.append(os.path.join(r, f))
            if arqs:
                nome = os.path.basename(d)
                if nome.lower() in NOMES_GENERICOS:
                    nome = os.path.basename(os.path.dirname(d)) + " - " + nome
                marca, console, sub = meta_de(os.path.dirname(rel_dir))
                itens.append({"rel": rel_dir + ".zip", "source_key": f"{raiz_nome}/{rel_dir}.zip",
                              "nome_arquivo": _slug(os.path.basename(d)) + ".zip", "titulo": nome,
                              "categoria": "software", "tipo": "ARCHIVE", "marca": marca, "console": console,
                              "subpasta": sub, "zip": arqs, "raiz": d,
                              "tamanho": sum(os.path.getsize(_lp(a)) for a in arqs), "extrair": True})
            return
        marca, console, sub = meta_de(rel_dir)
        avulsos = []
        for f in arquivos:
            p = os.path.join(d, f)
            ext = os.path.splitext(f)[1].lower()
            if ext not in EXT_MATERIAL and ext not in EXT_SOLTO:
                avulsos.append(p)               # txt, md, html, xml, ini…: vão juntos num zip
                continue
            cat = categoria_por_extensao(f)
            rel = rel_de(p)
            itens.append({"rel": rel, "source_key": f"{raiz_nome}/{rel}", "nome_arquivo": f,
                          "titulo": os.path.splitext(f)[0], "categoria": cat, "tipo": _tipo_api(cat, ext),
                          "marca": marca, "console": console, "subpasta": sub, "fonte": p,
                          "tamanho": os.path.getsize(_lp(p)), "extrair": ext == ".zip"})
        if avulsos and nivel >= 1:
            nome = (os.path.basename(d) if nivel >= 2 else console) + " - arquivos"
            rel = (rel_dir + "/" if rel_dir else "") + "_arquivos.zip"
            itens.append({"rel": rel, "source_key": f"{raiz_nome}/{rel}", "nome_arquivo": _slug(nome) + ".zip",
                          "titulo": nome, "categoria": "software", "tipo": "ARCHIVE", "marca": marca,
                          "console": console, "subpasta": sub, "zip": avulsos, "raiz": d,
                          "tamanho": sum(os.path.getsize(_lp(a)) for a in avulsos), "extrair": True})
        for x in dirs:
            varrer(os.path.join(d, x))

    varrer(pasta)
    return itens


def _zipar(arqs, raiz):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for a in arqs:
            z.write(_lp(a), os.path.relpath(a, raiz))
    return buf.getvalue()


def _e_foto_de_placa(nome):
    n = os.path.splitext(str(nome))[0].lower()
    return bool(re.search(r"(^|[\s_-])(image|imagem|foto|photo)([\s_-]|$)", n))


def titulo_exibicao(nome, arquivo, pasta_nome=""):
    """Título curto para o card: sem extensão, sem repetir o nome da pasta, sem _ ."""
    t = str(nome or arquivo or "")
    t = os.path.splitext(t)[0] if os.path.splitext(t)[1].lower() in (EXT_DOC | EXT_IMG | EXT_BV | EXT_PACOTE | {".uf2", ".bin", ".hex", ".txt", ".md"}) else t
    t = re.sub(r"[_]+", " ", t)
    if pasta_nome:
        pn = re.escape(pasta_nome.strip())
        t2 = re.sub(r"^\s*" + pn + r"\s*[-–—:_]*\s*", "", t, flags=re.I)
        if len(t2) >= 3:
            t = t2
    t = re.sub(r"\s{2,}", " ", t).strip(" -–—_.")
    return t or str(nome or arquivo)

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
        pastas_com_bv = {(m.get("marca"), m.get("console"), m.get("pasta") or "")
                         for m in self.sync.catalogo if m.get("categoria") == "boardview"}
        for m in self.sync.catalogo:
            mid = str(m["id"])
            loc = self.cofre.item(mid) or {}
            cofre = m.get("categoria") in CATEGORIAS_COFRE
            oculto = (m.get("categoria") in ("documento", "imagem")
                      and (m.get("marca"), m.get("console"), m.get("pasta") or "") in pastas_com_bv
                      and _e_foto_de_placa(m.get("arquivo") or m.get("nome") or ""))
            pasta_nome = (m.get("pasta") or "").split("/")[-1] or (m.get("console") or "")
            itens.append({
                "id": mid, "nome": m.get("nome"), "arquivo": m.get("arquivo"),
                "titulo": titulo_exibicao(m.get("nome"), m.get("arquivo"), pasta_nome),
                "rotulo": rotulo_categoria(m.get("categoria"), m.get("arquivo") or m.get("nome")),
                "categoria": m.get("categoria"), "marca": m.get("marca") or "Outros",
                "console": m.get("console") or "Geral", "descricao": m.get("descricao") or "",
                "pasta": (m.get("pasta") or "").strip("/"),
                "tamanho": m.get("tamanho") or 0, "versao": m.get("versao") or 1,
                "criado_em": m.get("criado_em"), "atualizado_em": m.get("atualizado_em"),
                "disponivel": (self.sync.tem_pronto(m) if cofre else True),
                "download_available": m.get("download_available", True),
                "download_available_at": m.get("download_available_at"),
                "visto": bool(loc.get("visto")) if cofre else True,
                "cofre": cofre, "oculto": oculto,
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

        def salvar():
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

        try:
            itens = planejar_importacao(pasta)
        except Exception as error:
            self._import_progress(0, 0, os.path.basename(pasta), "erro ao varrer: " + str(error), 0, 0)
            return
        total = len(itens)
        for index, it in enumerate(itens, 1):
            rel = it["rel"]
            if retomar and manifest.get(rel, {}).get("status") == "done":
                self._import_progress(index, total, rel, "já processado", 0, it["tamanho"])
                continue
            try:
                if "zip" in it:
                    self._import_progress(index, total, rel, "compactando pacote", 0, it["tamanho"])
                    dados = _zipar(it["zip"], it["raiz"])
                    size, mime = len(dados), "application/zip"
                    fonte = io.BytesIO(dados)
                else:
                    size = it["tamanho"]
                    mime = mimetypes.guess_type(it["fonte"])[0] or "application/octet-stream"
                    fonte = open(_lp(it["fonte"]), "rb")
                status, prepared = gd_auth._req("POST", "/api/software/admin/upload-url", token=SESSAO.get("token"), body={
                    "fileName": it["nome_arquivo"], "mimeType": mime, "sizeBytes": size,
                    "category": it["marca"], "sourceKey": it["source_key"]}, timeout=30)
                if status != 200: raise RuntimeError((prepared or {}).get("error", f"HTTP {status}"))
                if prepared.get("skipped"):
                    manifest[rel] = {"status": "done", "updated": time.time(), "server": "already_exists"}
                    salvar(); self._import_progress(index, total, rel, "ignorado", 0, size)
                    continue
                with fonte as source:
                    reader = _ProgressReader(source, size, lambda sent, total_bytes: self._import_progress(
                        index, total, rel, "enviando", sent, total_bytes))
                    request = urllib.request.Request(prepared["signedUrl"], data=reader, method="PUT", headers={
                        "Content-Type": mime, "Content-Length": str(size)})
                    with urllib.request.urlopen(request, timeout=3600) as response:
                        if response.status not in (200, 201): raise RuntimeError(f"upload HTTP {response.status}")
                status, created = gd_auth._req("POST", "/api/software/admin/material", token=SESSAO.get("token"), body={
                    "title": it["titulo"], "fileName": it["nome_arquivo"],
                    "storagePath": prepared["path"], "mimeType": mime, "sizeBytes": size,
                    "type": it["tipo"], "category": it["categoria"], "sourceKey": it["source_key"],
                    "metadata": {"marca": it["marca"], "console": it["console"], "pasta": it["subpasta"],
                                 "extrair": bool(it.get("extrair")), "pacote": "zip" in it},
                }, timeout=30)
                if status not in (200, 201): raise RuntimeError((created or {}).get("error", f"HTTP {status}"))
                manifest[rel] = {"status": "done", "updated": time.time()}
                salvar(); self._import_progress(index, total, rel, "processado", size, size)
            except Exception as error:
                manifest[rel] = {"status": "error", "error": str(error), "updated": time.time()}
                salvar(); self._import_progress(index, total, rel, "erro: " + str(error), 0, it.get("tamanho", 0))
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
        if self.sync.tem_pronto(m):
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
            foto = self._foto_irma(m)
            d["foto"] = ("gdfoto://" + str(foto["id"])) if foto else None
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

    def _foto_irma(self, m):
        """Arquivo '... image.pdf/.png' na mesma pasta do boardview = foto da placa."""
        chave = (m.get("marca"), m.get("console"), m.get("pasta") or "")
        for o in self.sync.catalogo:
            if (o.get("marca"), o.get("console"), o.get("pasta") or "") != chave:
                continue
            if o.get("categoria") not in ("documento", "imagem"):
                continue
            if _e_foto_de_placa(o.get("arquivo") or o.get("nome") or ""):
                return o
        return None

    def _foto_data_url(self, mid):
        """Foto da placa como data URL (PDF: 1ª página renderizada; imagem: como está)."""
        m = self._meta(mid)
        if not m:
            return ""
        if not self.sync.tem_pronto(m):
            ok, _ = self.sync.baixar_material(m)          # pequena; baixa na hora
            if not ok:
                return ""
        dados = self.cofre.ler(mid)
        nome = (m.get("arquivo") or "").lower()
        if nome.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=dados, filetype="pdf")
            pg = doc[0]
            escala = min(3.0, 2400 / max(pg.rect.width, 1))
            png = pg.get_pixmap(matrix=fitz.Matrix(escala, escala), alpha=False).tobytes("png")
            doc.close()
            return "data:image/png;base64," + base64.b64encode(png).decode("ascii")
        mime = "image/jpeg" if nome.endswith((".jpg", ".jpeg")) else "image/png"
        return f"data:{mime};base64," + base64.b64encode(dados).decode("ascii")

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
        if path and path.startswith("gdfoto://"):
            try:
                return self.app._foto_data_url(path[9:])
            except Exception as e:
                print(f"[BV] foto: {e}")
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
