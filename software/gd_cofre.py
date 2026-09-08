# -*- coding: utf-8 -*-
"""
gd_cofre.py — cofre local de documentos do Game Doctor.

Documentos, imagens e boardviews ficam CIFRADOS no disco do aluno
(AES-256-GCM). A chave nasce aleatoria na instalacao, guardada com DPAPI
(so abre no mesmo Windows/usuario) e derivada por aluno (uid) — o aluno
nunca ve um PDF/PNG "solto" na pasta. Os bytes decifrados vivem apenas na
RAM do app (viewer embutido) ou num temporario de vida curta (parser de
boardview), apagado logo apos o parse.

Formato: b"GDC1" + nonce(12) + ciphertext+tag
"""
import os, json, hashlib, secrets, tempfile, shutil, time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
import gd_cred
from gd_config import PASTA_CFG, PASTA_COFRE

_MAGIC = b"GDC1"
_CHAVE_ARQ = os.path.join(PASTA_CFG, "cofre.key")
_chave_local = None


def _chave_mestra():
    global _chave_local
    if _chave_local is not None:
        return _chave_local
    os.makedirs(PASTA_CFG, exist_ok=True)
    if os.path.exists(_CHAVE_ARQ):
        with open(_CHAVE_ARQ, "rb") as f:
            _chave_local = gd_cred.dpapi(f.read(), True)
    else:
        _chave_local = secrets.token_bytes(32)
        with open(_CHAVE_ARQ, "wb") as f:
            f.write(gd_cred.dpapi(_chave_local, False))
    return _chave_local


def _chave_usuario(uid):
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
                info=("gamedoctor:" + str(uid)).encode("utf-8")
                ).derive(_chave_mestra())


class Cofre:
    def __init__(self, uid):
        self.uid = str(uid)
        self.pasta = os.path.join(PASTA_COFRE, hashlib.sha1(self.uid.encode()).hexdigest()[:16])
        os.makedirs(self.pasta, exist_ok=True)
        self._aes = AESGCM(_chave_usuario(self.uid))
        self._man_path = os.path.join(self.pasta, "manifesto.json")
        self.manifesto = self._ler_manifesto()

    # ── manifesto local: o que o aluno ja tem ────────────────────
    def _ler_manifesto(self):
        try:
            with open(self._man_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"itens": {}, "atualizado_em": 0}

    def salvar_manifesto(self):
        tmp = self._man_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.manifesto, f, ensure_ascii=False, indent=1)
        os.replace(tmp, self._man_path)

    def item(self, mid):
        return self.manifesto["itens"].get(str(mid))

    def tem(self, mid, sha256=None, versao=None):
        it = self.item(mid)
        if not it or not os.path.exists(self._arq(mid)):
            return False
        if sha256 and it.get("sha256") != sha256:
            return False
        if versao is not None and int(it.get("versao", 0)) != int(versao):
            return False
        return True

    def _arq(self, mid):
        return os.path.join(self.pasta, f"{mid}.gd")

    # ── gravar / ler cifrado ─────────────────────────────────────
    def guardar(self, mid, dados: bytes, meta: dict):
        nonce = secrets.token_bytes(12)
        ct = self._aes.encrypt(nonce, dados, str(mid).encode())
        tmp = self._arq(mid) + ".tmp"
        with open(tmp, "wb") as f:
            f.write(_MAGIC + nonce + ct)
        os.replace(tmp, self._arq(mid))
        m = dict(meta)
        m["guardado_em"] = time.time()
        m["bytes"] = len(dados)
        self.manifesto["itens"][str(mid)] = m
        self.salvar_manifesto()

    def ler(self, mid) -> bytes:
        with open(self._arq(mid), "rb") as f:
            blob = f.read()
        if blob[:4] != _MAGIC:
            raise ValueError("arquivo do cofre invalido")
        nonce, ct = blob[4:16], blob[16:]
        return self._aes.decrypt(nonce, ct, str(mid).encode())

    def remover(self, mid):
        try:
            os.remove(self._arq(mid))
        except OSError:
            pass
        self.manifesto["itens"].pop(str(mid), None)
        self.salvar_manifesto()

    def marcar_visto(self, mid):
        it = self.item(mid)
        if it and not it.get("visto"):
            it["visto"] = True
            self.salvar_manifesto()

    # ── temporario de vida curta (parsers que exigem caminho) ────
    class Temporario:
        """with cofre.temporario(mid, 'placa.pcb') as caminho: ..."""
        def __init__(self, cofre, mid, nome):
            self.cofre, self.mid, self.nome = cofre, mid, nome
            self.dir = None

        def __enter__(self):
            self.dir = tempfile.mkdtemp(prefix="gd_")
            p = os.path.join(self.dir, os.path.basename(self.nome))
            with open(p, "wb") as f:
                f.write(self.cofre.ler(self.mid))
            return p

        def __exit__(self, *a):
            shutil.rmtree(self.dir, ignore_errors=True)

    def temporario(self, mid, nome):
        return Cofre.Temporario(self, mid, nome)

    def apagar_tudo(self):
        shutil.rmtree(self.pasta, ignore_errors=True)
