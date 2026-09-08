# -*- coding: utf-8 -*-
r"""
MODO DEV do Game Doctor — testar SEM Supabase.
  * login: dev@local + senha 'gamedoctor' (DEV_LOGIN_OFFLINE do gd_config)
  * acervo: pasta _dev_acervo\ (criada na 1a vez com amostras de H:\PARA UPAR NO DRIVE)
    faz as vezes do bucket + tabela `materiais`; para testar com o acervo
    inteiro: python _tools\_teste_dev.py --acervo "H:\PARA UPAR NO DRIVE"
Nunca embarcar este arquivo num build.
"""
import os, sys, shutil, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT); sys.path.insert(0, ROOT)

ap = argparse.ArgumentParser()
ap.add_argument("--acervo", default=os.path.join(ROOT, "_dev_acervo"))
ap.add_argument("--origem", default=r"H:\PARA UPAR NO DRIVE")
ap.add_argument("--refazer", action="store_true", help="apaga e remonta a amostra")
a, resto = ap.parse_known_args()

def montar_amostra(dest, origem, max_doc=25, max_sw=40):
    """Usa a MESMA classificacao do publicador: copia todos os documentos,
    imagens e boardviews (<= max_doc MB) e os softwares/pacotes (<= max_sw MB),
    preservando a arvore de pastas."""
    if not os.path.isdir(origem):
        print("[DEV] origem nao existe:", origem); return
    import gd_publicar
    n = 0; por_cons = {}
    for it in gd_publicar.planejar(origem):
        lim = (max_doc if it["categoria"] != "software" else max_sw) * 1048576
        if it["tamanho"] > lim:
            continue
        # amostra: no maximo 60 imagens por console (o PS2 tem 1.300 diagramas)
        k = (it["marca"], it["console"], it["categoria"])
        por_cons[k] = por_cons.get(k, 0) + 1
        if it["categoria"] == "imagem" and por_cons[k] > 60:
            continue
        fontes = it["fonte"] if isinstance(it["fonte"], list) else [it["fonte"]]
        for p in fontes:
            d = os.path.join(dest, os.path.relpath(p, origem))
            os.makedirs(gd_publicar._lp(os.path.dirname(d)), exist_ok=True)
            shutil.copy2(gd_publicar._lp(p), gd_publicar._lp(d)); n += 1
    print(f"[DEV] amostra montada em {dest}: {n} arquivos")

def _tem_arquivos(d):
    for _, _, fs in os.walk(d):
        if fs:
            return True
    return False

if a.refazer and os.path.isdir(a.acervo):
    shutil.rmtree(a.acervo, ignore_errors=True)
if not os.path.isdir(a.acervo) or not _tem_arquivos(a.acervo):
    montar_amostra(a.acervo, a.origem)

import main
app = main.GameDoctorApp([sys.argv[0]] + resto)
app.fonte_local = a.acervo
sys.exit(app.exec())
