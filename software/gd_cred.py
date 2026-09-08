# -*- coding: utf-8 -*-
"""
gd_cred.py — cofre local de credenciais e estado do Game Doctor.
DPAPI (amarrado ao usuario do Windows). Mesmo mecanismo do Bancada PRO,
mas em pasta propria (%APPDATA%\\GameDoctor).
"""
import ctypes, ctypes.wintypes as wt, json, os
from gd_config import PASTA_CFG

_ARQ = os.path.join(PASTA_CFG, "cred.dat")
_ESTADO = os.path.join(PASTA_CFG, "estado.json")


class _BLOB(ctypes.Structure):
    _fields_ = [("cbData", wt.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]


def dpapi(data: bytes, decrypt: bool) -> bytes:
    buf = ctypes.create_string_buffer(data, len(data))
    entrada = _BLOB(len(data), ctypes.cast(buf, ctypes.POINTER(ctypes.c_char)))
    saida = _BLOB()
    fn = (ctypes.windll.crypt32.CryptUnprotectData if decrypt
          else ctypes.windll.crypt32.CryptProtectData)
    ok = fn(ctypes.byref(entrada), None, None, None, None, 0, ctypes.byref(saida))
    if not ok:
        raise OSError("DPAPI falhou")
    try:
        return ctypes.string_at(saida.pbData, saida.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(saida.pbData)


def salvar(email, senha):
    os.makedirs(PASTA_CFG, exist_ok=True)
    payload = json.dumps({"email": email, "senha": senha}).encode("utf-8")
    with open(_ARQ, "wb") as f:
        f.write(dpapi(payload, False))


def carregar():
    if not os.path.exists(_ARQ):
        return None
    try:
        with open(_ARQ, "rb") as f:
            return json.loads(dpapi(f.read(), True).decode("utf-8"))
    except Exception:
        return None


def apagar():
    try:
        if os.path.exists(_ARQ):
            os.remove(_ARQ)
    except Exception:
        pass


# ── estado simples (json em claro: preferencias, ultimo aviso etc.) ──
def estado_ler():
    try:
        with open(_ESTADO, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def estado_gravar(d):
    try:
        os.makedirs(PASTA_CFG, exist_ok=True)
        with open(_ESTADO, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
    except Exception as e:
        print(f"[ESTADO] falha ao gravar: {e}")
