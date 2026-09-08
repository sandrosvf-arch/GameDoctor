# -*- coding: utf-8 -*-
"""py_compile em todos os .py + node --check nos .js do Game Doctor."""
import os, sys, py_compile, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
erros = 0
for raiz, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ("__pycache__", "_logs", "vendor")]
    for f in files:
        p = os.path.join(raiz, f)
        if f.endswith(".py"):
            try:
                py_compile.compile(p, doraise=True); print("OK  py", os.path.relpath(p, ROOT))
            except Exception as e:
                erros += 1; print("ERR py", os.path.relpath(p, ROOT), e)
        elif f.endswith(".js"):
            r = subprocess.run(["node", "--check", p], capture_output=True, text=True, shell=True)
            if r.returncode == 0: print("OK  js", os.path.relpath(p, ROOT))
            else: erros += 1; print("ERR js", os.path.relpath(p, ROOT), r.stderr[:400])
print("ERROS:", erros)
sys.exit(1 if erros else 0)
