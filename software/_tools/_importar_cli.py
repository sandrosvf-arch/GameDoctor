# -*- coding: utf-8 -*-
"""
_importar_cli.py — importa o acervo para a API do GameDoctor SEM abrir a janela
(mesmas regras do botao "Importar pastas": gd_bridge.planejar_importacao).

Uso (na pasta software\\):
    python -X utf8 _tools\\_importar_cli.py "H:\\PARA UPAR NO DRIVE\\Sony" "H:\\PARA UPAR NO DRIVE\\Microsoft" ...
    python -X utf8 _tools\\_importar_cli.py --raiz "H:\\PARA UPAR NO DRIVE"      (todas as marcas)
    --simular  : so lista o que subiria
Credenciais: as lembradas pelo app (DPAPI) ou --email/--senha.
API: GAME_DOCTOR_API_URL (padrao do gd_config).
"""
import os, sys, io, json, time, mimetypes, argparse, urllib.request, urllib.error
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
import gd_auth, gd_cred
from gd_auth import SESSAO
from gd_bridge import planejar_importacao, abrir_fonte, metadata_de, _ProgressReader
from gd_config import GAME_DOCTOR_API_URL


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def enviar(it):
    fonte, size, mime = abrir_fonte(it)
    st, prep = gd_auth._req("POST", "/api/software/admin/upload-url", token=SESSAO.get("token"), body={
        "fileName": it.get("nome_upload") or it["nome_arquivo"], "mimeType": mime, "sizeBytes": size,
        "category": it["marca"], "sourceKey": it["source_key"]}, timeout=30)
    if st != 200:
        fonte.close()
        raise RuntimeError((prep or {}).get("error", f"HTTP {st}"))
    if prep.get("skipped"):
        fonte.close()
        return "ja existe"
    ult = [0]
    def prog(sent, tot):
        if sent - ult[0] >= 8 * 1024 * 1024 or sent == tot:
            ult[0] = sent
            print(f"\r   {sent/1048576:7.1f}/{tot/1048576:.1f} MB", end="", flush=True)
    with fonte as src:
        reader = _ProgressReader(src, size, prog)
        req = urllib.request.Request(prep["signedUrl"], data=reader, method="PUT",
                                     headers={"Content-Type": mime, "Content-Length": str(size)})
        try:
            with urllib.request.urlopen(req, timeout=3600) as r:
                if r.status not in (200, 201):
                    raise RuntimeError(f"upload HTTP {r.status}")
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"upload HTTP {e.code}: {e.read(500).decode('utf-8', 'replace')}")
    print()
    st, created = gd_auth._req("POST", "/api/software/admin/material", token=SESSAO.get("token"), body={
        "title": it["titulo"], "fileName": it["nome_arquivo"], "storagePath": prep["path"],
        "mimeType": mime, "sizeBytes": size, "type": it["tipo"], "category": it["categoria"],
        "sourceKey": it["source_key"], "metadata": metadata_de(it)}, timeout=30)
    if st not in (200, 201):
        raise RuntimeError((created or {}).get("error", f"HTTP {st}"))
    return "enviado"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pastas", nargs="*")
    ap.add_argument("--raiz")
    ap.add_argument("--simular", action="store_true")
    ap.add_argument("--email"); ap.add_argument("--senha")
    ap.add_argument("--pular", help="JSON com lista de sourceKeys ja existentes (pula sem consultar a API)")
    ap.add_argument("--ignorar", action="append", default=[], help="trecho de sourceKey a nao enviar (repetivel)")
    a = ap.parse_args()
    pastas = list(a.pastas)
    if a.raiz:
        pastas += [os.path.join(a.raiz, n) for n in sorted(os.listdir(a.raiz)) if os.path.isdir(os.path.join(a.raiz, n))]
    if not pastas:
        ap.error("informe pastas de marca ou --raiz")

    plano = []
    for p in pastas:
        plano += planejar_importacao(p)
    if a.pular:
        with open(a.pular, encoding="utf-8") as f:
            ja = set(json.load(f))
        antes = len(plano)
        plano = [i for i in plano if i["source_key"] not in ja]
        log(f"pulados por ja existirem no banco: {antes - len(plano)}")
    if a.ignorar:
        plano = [i for i in plano if not any(t.lower() in i["source_key"].lower() for t in a.ignorar)]
    tam = sum(i["tamanho"] for i in plano) / 1048576
    log(f"plano: {len(plano)} materiais em {len(pastas)} marca(s), {tam:.0f} MB (a API pula o que ja existe)")
    if a.simular:
        por_marca = {}
        for i in plano:
            por_marca.setdefault(i["marca"], [0, 0])
            por_marca[i["marca"]][0] += 1
            por_marca[i["marca"]][1] += i["tamanho"]
        for m, (n, t) in sorted(por_marca.items()):
            print(f"   {m.ljust(28)} {n:5d} itens  {t/1048576:8.1f} MB")
        return

    email, senha = a.email, a.senha
    if not email:
        c = gd_cred.carregar() or {}
        email, senha = c.get("email"), c.get("senha")
    if not email or not senha:
        sys.exit("sem credenciais: use --email/--senha ou lembre o login no app")
    ok, r = gd_auth.autenticar_completo(email, senha)
    if not ok:
        sys.exit(f"login falhou: {r}")
    log(f"logado como {SESSAO.get('nome')} ({SESSAO.get('papel')}) em {GAME_DOCTOR_API_URL}")

    enviados = pulados = erros = 0
    for n, it in enumerate(plano, 1):
        try:
            r = enviar(it)
            if r == "enviado":
                enviados += 1
                log(f"[{n}/{len(plano)}] ENVIADO {it['source_key']} ({it['tamanho']/1048576:.1f} MB)")
            else:
                pulados += 1
        except Exception as e:
            erros += 1
            log(f"[{n}/{len(plano)}] ERRO {it['source_key']}: {e}")
    log(f"fim: enviados {enviados}, ja existiam {pulados}, erros {erros}")


if __name__ == "__main__":
    main()
