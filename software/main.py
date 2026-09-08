# -*- coding: utf-8 -*-
"""
main.py — Game Doctor
Biblioteca de materiais para alunos (mapas, diagramas, boardviews, softwares).
Login Supabase (mesmas contas do Bancada PRO) + cofre local cifrado +
leitores embutidos (PDF / imagem / Boardviewer) + notificacao do Windows
quando ha material novo.

Rodar da fonte:  python -X utf8 main.py
"""
import os, sys, json, threading, traceback

_BASE = os.path.dirname(os.path.abspath(__file__))
os.chdir(_BASE)
if _BASE not in sys.path:
    sys.path.insert(0, _BASE)

# render: sem flags agressivas de GPU (mesma licao do Bancada PRO em PCs
# fracos). Override: GD_RENDER=software
if os.environ.get("GD_RENDER", "").lower() == "software":
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-gpu --disable-gpu-compositing"

from PyQt6.QtCore import Qt, QUrl, QTimer
from PyQt6.QtGui import QIcon, QAction
from PyQt6.QtWidgets import (QApplication, QMainWindow, QSystemTrayIcon, QMenu,
                             QMessageBox)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel

import gd_auth, gd_cred
from gd_auth import SESSAO
from gd_config import (UI, ICONE, APP_NOME, APP_VERSAO, INTERVALO_SYNC,
                       DEV_LOGIN_OFFLINE, DEV_ACERVO)
from gd_cofre import Cofre
from gd_sync import Sync
from gd_bridge import LoginBridge, AppBridge, BoardBridge


class LoginWindow(QWebEngineView):
    def __init__(self, on_ok):
        super().__init__()
        self.setWindowTitle(f"{APP_NOME} — Entrar")
        self.setWindowIcon(QIcon(ICONE))
        self.setFixedSize(460, 640)
        self.bridge = LoginBridge(on_ok)
        self.bridge.set_page(self.page())
        self._ch = QWebChannel(self)
        self._ch.registerObject("bridge", self.bridge)
        self.page().setWebChannel(self._ch)
        self.load(QUrl.fromLocalFile(os.path.join(UI, "login.html")))


class MainWindow(QMainWindow):
    def __init__(self, app):
        super().__init__()
        self.qapp = app
        self.setWindowTitle(f"{APP_NOME} {APP_VERSAO}")
        self.setWindowIcon(QIcon(ICONE))
        self.resize(1280, 820)
        self._saindo = False
        self._avisou_bandeja = gd_cred.estado_ler().get("avisou_bandeja", False)

        self.cofre = Cofre(SESSAO.get("uid"))
        # acervo local (modo dev): --acervo "pasta" ou, logado como dev@local,
        # a pasta _dev_acervo se existir
        fonte = getattr(app, "fonte_local", None)
        if fonte is None and DEV_LOGIN_OFFLINE and SESSAO.get("uid") == "dev" \
                and os.path.isdir(DEV_ACERVO):
            fonte = DEV_ACERVO
        self.sync = Sync(self.cofre, fonte_local=fonte)

        self.view = QWebEngineView(self)
        self.setCentralWidget(self.view)
        self.bridge = AppBridge(self.cofre, self.sync, self)
        self.bridge.set_page(self.view.page())
        self.board = BoardBridge(self.bridge)
        self._ch = QWebChannel(self)
        self._ch.registerObject("appBridge", self.bridge)
        self._ch.registerObject("boardviewBridge", self.board)
        self.view.page().setWebChannel(self._ch)
        try:
            self.view.page().profile().downloadRequested.connect(lambda d: d.cancel())
        except Exception:
            pass
        self.view.load(QUrl.fromLocalFile(os.path.join(UI, "main.html")))

        # bandeja + toast nativo do Windows
        self.tray = QSystemTrayIcon(QIcon(ICONE), self)
        self.tray.setToolTip(APP_NOME)
        menu = QMenu()
        a1 = QAction("Abrir Game Doctor", self); a1.triggered.connect(self.restaurar)
        a2 = QAction("Verificar novidades agora", self); a2.triggered.connect(lambda: self.sync.sincronizar())
        a3 = QAction("Sair", self); a3.triggered.connect(self.encerrar)
        menu.addAction(a1); menu.addAction(a2); menu.addSeparator(); menu.addAction(a3)
        self.tray.setContextMenu(menu)
        self.tray.activated.connect(lambda r: self.restaurar() if r in (
            QSystemTrayIcon.ActivationReason.Trigger, QSystemTrayIcon.ActivationReason.DoubleClick) else None)
        self.tray.messageClicked.connect(self.restaurar)
        self.tray.show()

        # sync periodico + renovacao de token (sessao longa na bandeja)
        self._t_sync = QTimer(self); self._t_sync.timeout.connect(lambda: self.sync.sincronizar())
        self._t_sync.start(INTERVALO_SYNC * 1000)
        self._t_tok = QTimer(self); self._t_tok.timeout.connect(self._renovar)
        self._t_tok.start(50 * 60 * 1000)

    # ── toast (notificacao nativa do Windows via bandeja) ────────
    def toast(self, titulo, texto):
        try:
            self.tray.showMessage(titulo, texto, QIcon(ICONE), 8000)
        except Exception:
            pass

    def restaurar(self):
        self.showNormal(); self.raise_(); self.activateWindow()

    def para_bandeja(self):
        self.hide()
        if not self._avisou_bandeja:
            self.toast(APP_NOME, "Continua rodando aqui na bandeja. Você será avisado quando houver material novo.")
            self._avisou_bandeja = True
            e = gd_cred.estado_ler(); e["avisou_bandeja"] = True; gd_cred.estado_gravar(e)

    def closeEvent(self, ev):
        if self._saindo:
            return super().closeEvent(ev)
        ev.ignore()
        self.para_bandeja()

    def encerrar(self, reiniciar_login=False):
        self._saindo = True
        self.tray.hide()
        if self.bridge._leitor is not None:
            self.bridge._leitor.close()
        self.close()
        if reiniciar_login:
            self.qapp._abrir_login()
        else:
            self.qapp.quit()

    def _renovar(self):
        def run():
            ok, msg = gd_auth.renovar_token()
            if not ok and msg in gd_auth.ERROS_LICENCA.values():
                # assinatura venceu com o app aberto: derruba
                QTimer.singleShot(0, lambda: self._derrubar(msg))
        threading.Thread(target=run, daemon=True).start()

    def _derrubar(self, msg):
        self.restaurar()
        QMessageBox.warning(self, APP_NOME, msg)
        self.bridge.sair()


class GameDoctorApp(QApplication):
    def __init__(self, argv):
        super().__init__(argv)
        self.setApplicationName(APP_NOME)
        self.setWindowIcon(QIcon(ICONE))
        self.setQuitOnLastWindowClosed(False)
        self.login = None
        self.main = None
        self.fonte_local = None
        if "--acervo" in argv:
            self.fonte_local = argv[argv.index("--acervo") + 1]
        self._abrir_login()

    def _abrir_login(self):
        self.main = None
        self.login = LoginWindow(self._logado)
        self.login.show()

    def _logado(self):
        try:
            self.main = MainWindow(self)
            self.main.show()
            if self.login is not None:
                self.login.close(); self.login = None
            # primeira sincronizacao logo apos o login
            QTimer.singleShot(800, lambda: self.main.sync.sincronizar())
        except Exception:
            traceback.print_exc()


if __name__ == "__main__":
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("MaxTech.GameDoctor")
    except Exception:
        pass
    app = GameDoctorApp(sys.argv)
    sys.exit(app.exec())
