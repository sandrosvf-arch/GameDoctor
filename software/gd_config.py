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

# O build distribuído nunca deve ter login offline habilitado.
DEV_LOGIN_OFFLINE = False
DEV_SENHA = ""
DEV_ACERVO = os.path.join(BASE, "_dev_acervo")
