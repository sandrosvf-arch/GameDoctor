# -*- coding: utf-8 -*-
"""
gd_publicar.py — publicador do acervo do Game Doctor (lado do ADMIN).

Varre a pasta de origem (H:\\PARA UPAR NO DRIVE), classifica cada arquivo,
sobe pro bucket 'materiais' e faz upsert na tabela `materiais`. So o que
mudou e' enviado (sha256). Item que sumiu da pasta vira ativo=false.
E' ASSIM que o Game Doctor do aluno descobre que ha material novo.

Uso (no PC do Thiago, com login admin):
    python -X utf8 gd_publicar.py                -> so' PLANEJA (nao envia nada)
                                                    gera _logs\\plano_publicacao.json
    python -X utf8 gd_publicar.py --publicar     -> envia
    python -X utf8 gd_publicar.py --origem "D:\\outra pasta"

Regras de classificacao (arvore marca > console > subpastas livres):
    pasta com arquivo de programa     -> PACOTE: 1 software = zip da pasta inteira
      (.exe .dll .py .bin .xbe ...)      (imagens/PDFs de dentro NAO viram material)
    .pdf                              -> documento
    .png .jpg .jpeg .webp .bmp .gif   -> imagem
    .pcb .bvr .cad .brd .bdv .xzz     -> boardview
    .zip .rar .7z .exe .msi soltos    -> software individual (como esta')
    demais soltos (txt, md, kicad...) -> 1 zip "<pasta> - arquivos"
    a `pasta` (subpastas abaixo do console) e' preservada para navegacao
Ignorados: caches do OpenBoardView (.obdlocal .sqlite3), Thumbs.db, .pf...
"""
import os, sys, io, json, hashlib, zipfile, time, getpass, argparse, unicodedata, re
import urllib.request, urllib.parse

_BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _BASE)
import gd_auth
from gd_auth import _req
from gd_config import SUPABASE_URL, ANON_KEY, BUCKET, TABELA

ORIGEM_PADRAO = r"H:\PARA UPAR NO DRIVE"
LOGS = os.path.join(_BASE, "_logs")
EXT_DOC = {".pdf"}
EXT_IMG = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
EXT_BV = {".pcb", ".bvr", ".cad", ".brd", ".bdv", ".xzz"}
IGNORAR = {".obdlocal", ".sqlite3", ".pf", ".db", ".ini", ".lnk", ".tmp", ".bak"}
IGNORAR_NOMES = {"thumbs.db", "desktop.ini", ".ds_store"}


def _lp(p):
    r"""Caminho longo do Windows (> 260 chars): prefixo \\?\ ."""
    if os.name == "nt" and not str(p).startswith("\\\\?\\"):
        return "\\\\?\\" + os.path.abspath(p)
    return p


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9._/-]+", "-", s.replace("\\", "/")).strip("-").lower()
    return re.sub(r"-{2,}", "-", s)


def sha256_arq(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for ch in iter(lambda: f.read(1 << 20), b""):
            h.update(ch)
    return h.hexdigest()


def nome_bonito(arquivo):
    n = os.path.splitext(arquivo)[0]
    n = re.sub(r"[_]+", " ", n)
    n = re.sub(r"\s{2,}", " ", n).strip()
    return n or arquivo


# ── varredura ────────────────────────────────────────────────────
# Extensoes que denunciam um PACOTE DE SOFTWARE: a pasta que contem um
# desses arquivos vira UM software (zip da subarvore inteira, com as imagens,
# PDFs e tudo que estiver dentro — sao parte do programa, nao material de
# estudo). Documentos de estudo sao so os que estao FORA de pacotes.
EXT_SW = {".exe", ".dll", ".py", ".pyd", ".pyo", ".bat", ".cmd", ".ps1", ".msi",
          ".sys", ".inf", ".bin", ".xbe", ".xex", ".elf", ".uf2", ".hex", ".rom",
          ".so", ".jar", ".xip", ".xbx", ".xbg", ".xpr", ".nfo", ".acl", ".po",
          ".firm", ".cia", ".3dsx", ".nro", ".nsp", ".xci", ".ttf", ".wav", ".img",
          ".iso", ".cab", ".deb", ".gz", ".tar", ".xtf", ".xmv", ".dds", ".tga"}
EXT_ARQ = {".zip", ".rar", ".7z", ".exe", ".msi"}   # instaladores/pacotes prontos
# nomes genericos de pasta: o software recebe o nome da pasta-mae
NOMES_GENERICOS = {"bin", "lib", "libs", "app", "src", "files", "common", "x64", "x86",
                   "win", "win32", "win64", "windows", "release", "debug", "dist", "build",
                   "data", "assets", "tools", "portable", "program", "programa", "arquivos"}


def planejar(origem):
    """Devolve lista de itens {slug,nome,arquivo,categoria,marca,console,pasta,
    fonte(caminho ou lista p/ zip), raiz, tamanho}. Arvore: marca > console > ..."""
    itens = []
    origem = os.path.abspath(origem)
    for marca in sorted(os.listdir(origem)):
        pm = os.path.join(origem, marca)
        if not os.path.isdir(pm):
            continue
        marca_nome = _limpo_nome(marca)
        subs = [d for d in sorted(os.listdir(pm)) if os.path.isdir(os.path.join(pm, d))]
        if not subs or any(os.path.isfile(os.path.join(pm, f)) for f in os.listdir(pm)):
            _varrer_dir(itens, pm, marca_nome, "Geral", pm, origem, raso=True)
        for cons in subs:
            pc = os.path.join(pm, cons)
            _varrer_dir(itens, pc, marca_nome, _limpo_nome(cons), pc, origem)
    return itens


def _limpo_nome(s):
    return s.lstrip("#").strip()


def _e_pacote(files):
    """Pasta e' um pacote de software? (contem arquivo de programa)"""
    exts = {os.path.splitext(f)[1].lower() for f in files}
    if exts & (EXT_SW - {".exe", ".msi"}):
        return True
    # so' instaladores/arquivos (.exe .msi .zip .rar .7z) + nada mais = NAO e' pacote:
    # cada um vira um software individual
    return False


def _varrer_dir(itens, d, marca, console, pc, origem, raso=False):
    """Varre a pasta d (abaixo do console pc). Pacotes de software viram 1 zip
    e nao sao descidos; o resto vira material individual e desce nas subpastas."""
    try:
        nomes = sorted(os.listdir(_lp(d)))
    except OSError:
        return
    files = [f for f in nomes if os.path.isfile(_lp(os.path.join(d, f)))
             and os.path.splitext(f)[1].lower() not in IGNORAR
             and f.lower() not in IGNORAR_NOMES and not f.startswith("~$")]
    dirs = [] if raso else [x for x in nomes if os.path.isdir(_lp(os.path.join(d, x)))]
    pasta = os.path.relpath(d, pc).replace("\\", "/")
    pasta = "" if pasta == "." else "/".join(_limpo_nome(x) for x in pasta.split("/"))
    pasta_pai = os.path.dirname(pasta)

    if d != pc and _e_pacote(files):
        _add_pacote(itens, d, marca, console, pc, origem, pasta_pai)
        return

    soltos = []
    for f in files:
        p = os.path.join(d, f)
        ext = os.path.splitext(f)[1].lower()
        rel = os.path.relpath(p, origem)
        base = {"marca": marca, "console": console, "arquivo": f, "pasta": pasta,
                "nome": nome_bonito(f), "slug": slugify(rel), "fonte": p,
                "tamanho": os.path.getsize(_lp(p))}
        if ext in EXT_DOC:
            itens.append(dict(base, categoria="documento"))
        elif ext in EXT_IMG:
            itens.append(dict(base, categoria="imagem"))
        elif ext in EXT_BV:
            itens.append(dict(base, categoria="boardview"))
        elif ext in EXT_ARQ:
            itens.append(dict(base, categoria="software", extrair=(ext == ".zip")))
        else:
            soltos.append(p)          # txt, md, kicad_sch, etc.: vao juntos num zip
    if soltos:
        nome = (os.path.basename(d) if d != pc else console)
        nome = _limpo_nome(nome) + " - arquivos"
        rel = os.path.relpath(d, origem)
        itens.append({"marca": marca, "console": console, "arquivo": slugify(nome) + ".zip",
                      "pasta": pasta, "nome": nome, "slug": slugify(rel) + "/_arquivos.zip",
                      "fonte": soltos, "raiz": d, "categoria": "software", "extrair": True,
                      "tamanho": sum(os.path.getsize(_lp(a)) for a in soltos)})
    for x in dirs:
        _varrer_dir(itens, os.path.join(d, x), marca, console, pc, origem)


def _add_pacote(itens, d, marca, console, pc, origem, pasta_pai):
    arqs = []
    pref = len(_lp(d)) - len(d)          # os.walk com prefixo longo; devolve caminhos "normais"
    for raiz, _, fs in os.walk(_lp(d)):
        raiz_n = raiz[pref:] if pref > 0 else raiz
        for f in fs:
            if os.path.splitext(f)[1].lower() in IGNORAR or f.lower() in IGNORAR_NOMES:
                continue
            arqs.append(os.path.join(raiz_n, f))
    if not arqs:
        return
    nome = os.path.basename(d)
    if nome.lower() in NOMES_GENERICOS:
        nome = os.path.basename(os.path.dirname(d)) + " - " + nome
    nome = _limpo_nome(nome)
    rel = os.path.relpath(d, origem)
    itens.append({"marca": marca, "console": console, "arquivo": slugify(os.path.basename(d)) + ".zip",
                  "pasta": pasta_pai, "nome": nome, "slug": slugify(rel) + ".zip",
                  "fonte": arqs, "raiz": d, "categoria": "software", "extrair": True,
                  "tamanho": sum(os.path.getsize(_lp(a)) for a in arqs)})


def zipar(item):
    """Zipa o grupo em memoria (compressao deflate). Devolve bytes."""
    buf = io.BytesIO()
    raiz = item["raiz"]
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for a in item["fonte"]:
            z.write(_lp(a), os.path.relpath(a, raiz))
    return buf.getvalue()


# ── Supabase ─────────────────────────────────────────────────────
def listar_remoto(token):
    st, rows = _req("GET", f"/rest/v1/{TABELA}?select=id,slug,sha256,versao,ativo,tamanho",
                    token=token, timeout=60)
    if st != 200:
        raise SystemExit(f"Falha ao ler tabela {TABELA}: HTTP {st} {rows}")
    return {r["slug"]: r for r in rows}


def upload(token, storage_path, dados):
    url = SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + urllib.parse.quote(storage_path)
    req = urllib.request.Request(url, data=dados, method="POST", headers={
        "apikey": ANON_KEY, "Authorization": "Bearer " + token,
        "Content-Type": "application/octet-stream", "x-upsert": "true"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")


def upsert(token, row):
    st, r = _req("POST", f"/rest/v1/{TABELA}?on_conflict=slug", token=token, body=row,
                 headers_extra={"Prefer": "resolution=merge-duplicates,return=minimal"}, timeout=60)
    return st, r


def desativar(token, slugs):
    for s in slugs:
        _req("PATCH", f"/rest/v1/{TABELA}?slug=eq.{urllib.parse.quote(s)}", token=token,
             body={"ativo": False}, headers_extra={"Prefer": "return=minimal"})


# ── main ─────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--origem", default=ORIGEM_PADRAO)
    ap.add_argument("--publicar", action="store_true", help="envia de verdade")
    ap.add_argument("--email"); ap.add_argument("--senha")
    ap.add_argument("--max-mb", type=float, default=0, help="pula arquivos maiores que isso (0 = sem limite)")
    a = ap.parse_args()
    os.makedirs(LOGS, exist_ok=True)

    print(f"[PLANO] varrendo {a.origem} ...")
    itens = planejar(a.origem)
    resumo = {}
    for i in itens:
        c = i["categoria"]; resumo[c] = resumo.get(c, 0) + 1
    tot = sum(i["tamanho"] for i in itens)
    print(f"[PLANO] {len(itens)} materiais, {tot/1048576:.0f} MB brutos -> {resumo}")
    plano = [{k: (v if k != "fonte" or isinstance(v, str) else f"{len(v)} arquivos")
              for k, v in i.items()} for i in itens]
    with open(os.path.join(LOGS, "plano_publicacao.json"), "w", encoding="utf-8") as f:
        json.dump(plano, f, ensure_ascii=False, indent=1)
    print(f"[PLANO] detalhes em {os.path.join(LOGS, 'plano_publicacao.json')}")
    if not a.publicar:
        print("[PLANO] modo simulacao. Use --publicar para enviar.")
        return

    email = a.email or input("E-mail admin: ").strip()
    senha = a.senha or getpass.getpass("Senha: ")
    ok, r = gd_auth.autenticar_completo(email, senha)
    if not ok:
        raise SystemExit("Login falhou: " + str(r))
    if r.get("papel") != "admin":
        raise SystemExit("Esta conta nao e' admin.")
    token = r["token"]
    remoto = listar_remoto(token)
    print(f"[PUB] {len(remoto)} itens ja' publicados")

    enviados = pulados = erros = 0
    slugs_locais = set()
    log = open(os.path.join(LOGS, f"publicacao_{time.strftime('%Y%m%d_%H%M%S')}.log"), "w", encoding="utf-8")
    for n, it in enumerate(itens, 1):
        slugs_locais.add(it["slug"])
        try:
            if isinstance(it["fonte"], list):
                dados = zipar(it)
            else:
                with open(_lp(it["fonte"]), "rb") as f:
                    dados = f.read()
            if a.max_mb and len(dados) > a.max_mb * 1048576:
                print(f"[{n}/{len(itens)}] PULADO (> {a.max_mb} MB): {it['slug']}")
                log.write(f"PULADO tamanho {it['slug']}\n"); pulados += 1
                continue
            sha = hashlib.sha256(dados).hexdigest()
            ant = remoto.get(it["slug"])
            if ant and ant.get("sha256") == sha and ant.get("ativo"):
                pulados += 1
                continue
            storage_path = it["slug"]
            st, msg = upload(token, storage_path, dados)
            if st not in (200, 201):
                print(f"[{n}/{len(itens)}] ERRO upload {it['slug']}: HTTP {st} {msg[:200]}")
                log.write(f"ERRO upload {it['slug']} {st} {msg}\n"); erros += 1
                continue
            row = {"slug": it["slug"], "nome": it["nome"], "arquivo": it["arquivo"],
                   "categoria": it["categoria"], "marca": it["marca"], "console": it["console"],
                   "pasta": it.get("pasta", ""), "storage_path": storage_path, "tamanho": len(dados), "sha256": sha,
                   "versao": (int(ant["versao"]) + 1) if ant else 1,
                   "aplicar_marca": it["categoria"] in ("documento", "imagem"),
                   "extrair": bool(it.get("extrair", True)), "ativo": True}
            st, rr = upsert(token, row)
            if st not in (200, 201, 204):
                print(f"[{n}/{len(itens)}] ERRO tabela {it['slug']}: HTTP {st} {rr}")
                log.write(f"ERRO tabela {it['slug']} {st} {rr}\n"); erros += 1
                continue
            enviados += 1
            print(f"[{n}/{len(itens)}] OK {'v%d' % row['versao']} {it['categoria']:9} {len(dados)/1048576:6.1f} MB  {it['slug']}")
            log.write(f"OK {it['slug']} v{row['versao']}\n")
        except Exception as e:
            erros += 1
            print(f"[{n}/{len(itens)}] ERRO {it['slug']}: {e}")
            log.write(f"ERRO {it['slug']} {e}\n")
    sumiram = [s for s, r in remoto.items() if r.get("ativo") and s not in slugs_locais]
    if sumiram:
        desativar(token, sumiram)
        print(f"[PUB] {len(sumiram)} itens desativados (nao estao mais na pasta)")
    log.close()
    print(f"[PUB] enviados={enviados} inalterados/pulados={pulados} erros={erros}")


if __name__ == "__main__":
    main()
