# -*- coding: utf-8 -*-
"""Injeta ui/boardview_view.html (fragmento copiado do Bancada PRO) dentro
do ui/main.html no marcador [BOARDVIEW_VIEW]. Idempotente."""
import os, re
UI = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ui")
main = open(os.path.join(UI, "main.html"), encoding="utf-8").read()
frag = open(os.path.join(UI, "boardview_view.html"), encoding="utf-8").read()
# Game Doctor: sem ferramentas de ajuste/foto (exclusivas do Bancada PRO)
for _id in ("bv-separar", "bv-ajuste-faces", "bv-foto"):
    frag = re.sub(r'<button[^>]*id="%s"[^>]*>.*?</button>\s*' % _id, "", frag, flags=re.S)
frag = re.sub(r'<div id="bv-ajuste-painel".*?</div>\s*', "", frag, flags=re.S)
frag = re.sub(r'<input type="range" id="bv-alpha".*?>\s*', "", frag, flags=re.S)
frag = re.sub(r'<!-- painel da ferramenta de ajuste[^\n]*\n', "", frag)
assert 'bv-ajuste-painel' not in frag and 'bv-foto"' not in frag
ini, fim = "<!-- [BOARDVIEW_VIEW] -->", "<!-- [/BOARDVIEW_VIEW] -->"
bloco = ini + "\n" + frag + "\n" + fim
if fim in main:
    main = re.sub(re.escape(ini) + r".*?" + re.escape(fim), lambda m: bloco, main, flags=re.S)
else:
    assert ini in main, "marcador nao achado"
    main = main.replace(ini, bloco)
open(os.path.join(UI, "main.html"), "w", encoding="utf-8").write(main)
print("main.html montado:", len(main), "bytes")
