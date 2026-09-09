# -*- coding: utf-8 -*-
"""Configuração segura do cliente Game Doctor."""
import os

APP_NOME = "Game Doctor"
APP_VERSAO = "1.0-BETA"
GAME_DOCTOR_API_URL = os.environ.get("GAME_DOCTOR_API_URL", "https://gamedoctor.vercel.app").rstrip("/")

INTERVALO_SYNC = 15 * 60
_APPDATA = os.environ.get("APPDATA", os.path.expanduser("~"))
_LOCAL = os.environ.get("LOCALAPPDATA", _APPDATA)
PASTA_CFG = os.path.join(_APPDATA, "GameDoctor")
PASTA_COFRE = os.path.join(_LOCAL, "GameDoctor", "cofre")
PASTA_SOFTWARES = os.path.join(os.path.expanduser("~"), "Documents", "Game Doctor")

BASE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(BASE, "ui")
ICONE = os.path.join(BASE, "gamedoctor.ico")
CATEGORIAS_COFRE = ("documento", "imagem", "boardview")
CATEGORIA_SOFTWARE = "software"

# Classificação por extensão — é o CLIENTE quem decide a categoria (o catálogo
# do servidor só conhece PDF/IMAGE/ARCHIVE). Tudo que não abre dentro do app
# vai para a pasta do aluno (Documentos\Game Doctor\marca\console\...).
EXT_DOC = {".pdf"}
EXT_IMG = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
EXT_BV = {".pcb", ".bvr", ".cad", ".brd", ".bdv", ".xzz", ".fz", ".tvw"}
EXT_PACOTE = {".zip", ".rar", ".7z", ".exe", ".msi"}


def categoria_por_extensao(nome):
    ext = os.path.splitext(str(nome or ""))[1].lower()
    if ext in EXT_DOC: return "documento"
    if ext in EXT_IMG: return "imagem"
    if ext in EXT_BV: return "boardview"
    return CATEGORIA_SOFTWARE


def rotulo_categoria(categoria, nome):
    """Texto do badge do card."""
    ext = os.path.splitext(str(nome or ""))[1].lower()
    return {"documento": "PDF", "imagem": "Imagem", "boardview": "Boardview"}.get(
        categoria, "Software" if ext in EXT_PACOTE else "Arquivo")

# O build distribuído nunca deve ter login offline habilitado.
DEV_LOGIN_OFFLINE = False
DEV_SENHA = ""
DEV_ACERVO = os.path.join(BASE, "_dev_acervo")
