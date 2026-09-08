# -*- coding: utf-8 -*-
"""Autenticação do cliente contra a API oficial da plataforma."""
import ctypes, hashlib, json, time, urllib.error, urllib.request
from gd_config import GAME_DOCTOR_API_URL

TIMEOUT = 10
SESSAO = {}

def _req(method, path, token=None, body=None, timeout=None, raw=False, headers_extra=None):
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None and not isinstance(body, (bytes, bytearray)):
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    else:
        data = body
    if headers_extra:
        headers.update(headers_extra)
    try:
        req = urllib.request.Request(GAME_DOCTOR_API_URL + path, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=timeout or TIMEOUT) as response:
            content = response.read()
            if raw:
                return response.status, content
            text = content.decode("utf-8")
            return response.status, (json.loads(text) if text else None)
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read().decode("utf-8"))
        except Exception:
            detail = {}
        return error.code, detail
    except Exception as error:
        return 0, {"erro_rede": str(error)}

def _reg_read(path, name):
    import winreg
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path, 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY)
        value, _ = winreg.QueryValueEx(key, name)
        winreg.CloseKey(key)
        return str(value)
    except Exception:
        return ""

def gerar_hwid():
    parts = [_reg_read(r"SOFTWARE\Microsoft\Cryptography", "MachineGuid"),
             _reg_read(r"HARDWARE\DESCRIPTION\System\CentralProcessor\0", "ProcessorNameString")]
    try:
        buffer = ctypes.c_uint(0)
        ctypes.windll.kernel32.GetVolumeInformationW("C:\\", None, 0, ctypes.byref(buffer), None, None, None, 0)
        parts.append(str(buffer.value))
    except Exception:
        parts.append("")
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:32]

def nome_maquina():
    import platform
    import os
    return os.environ.get("COMPUTERNAME") or platform.node() or "desconhecido"

ERROS_LICENCA = {"SEM_ASSINATURA": "Nenhum plano ativo encontrado.",
                 "ASSINATURA_VENCIDA": "Seu plano está vencido.",
                 "LIMITE_DISPOSITIVOS": "Limite de computadores atingido."}

def autenticar_completo(email, senha):
    status, result = _req("POST", "/api/auth/software", body={"email": email, "password": senha}, timeout=30)
    if status == 0:
        return False, "Sem conexão com o servidor. Verifique sua internet."
    if status != 200:
        return False, (result or {}).get("error", "E-mail ou senha incorretos.") if isinstance(result, dict) else "E-mail ou senha incorretos."
    user = (result or {}).get("user") or {}
    access = (result or {}).get("access") or {}
    software = (result or {}).get("software") or {}
    token = software.get("token")
    role = str(user.get("role", "STUDENT")).upper()
    is_staff = role in ("ADMIN", "EDITOR")
    if not token or not user.get("id"):
        return False, "Usuário ou senha inválidos"
    if not is_staff and not access.get("active"):
        return False, "Sua conta não possui um plano ativo para usar o software."
    permissions = access.get("permissions") or []
    plan_permissions = [permission for permission in permissions if permission.get("plan")]
    first = max(
        plan_permissions,
        key=lambda permission: permission.get("expiresAt") is None,
        default={},
    )
    if first.get("expiresAt") is not None:
        first = max(plan_permissions, key=lambda permission: permission.get("expiresAt") or "")
    plan = first.get("plan") or {}
    data = {"token": token, "uid": user["id"], "nome": user.get("name") or email,
            "cpf": (user.get("cpf") or "").strip(), "papel": role.lower(),
            "email": user.get("email") or email,
            "assinatura": {"plano": plan.get("name"), "expira_em": first.get("expiresAt"),
                            "administrativo": is_staff and not plan_permissions},
            "login_em": time.time()}
    SESSAO.clear(); SESSAO.update(data)
    return True, data

def renovar_token():
    return bool(SESSAO.get("token")), "OK" if SESSAO.get("token") else "sessão expirada"

def salvar_cpf(token, uid, cpf):
    cpf = "".join(ch for ch in str(cpf) if ch.isdigit())
    status, result = _req("POST", "/api/software/profile", token=token, body={"cpf": cpf})
    if status == 200:
        SESSAO["cpf"] = cpf
        return True, "OK"
    return False, (result or {}).get("error", "Não foi possível salvar o CPF.") if isinstance(result, dict) else "Não foi possível salvar o CPF."

def cpf_valido(cpf):
    digits = "".join(ch for ch in str(cpf) if ch.isdigit())
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    for length in (9, 10):
        total = sum(int(digit) * (length + 1 - index) for index, digit in enumerate(digits[:length]))
        remainder = total % 11
        check = 0 if remainder < 2 else 11 - remainder
        if check != int(digits[length]):
            return False
    return True

def cpf_formatar(cpf):
    digits = "".join(ch for ch in str(cpf) if ch.isdigit())
    if len(digits) != 11:
        return cpf
    return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
