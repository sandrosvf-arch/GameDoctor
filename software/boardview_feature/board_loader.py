# -*- coding: utf-8 -*-
"""
board_loader.py - Carregador unificado de boardviews do Bancada PRO
Bancada PRO / MaxTech

Despacha por formato, localiza o pacote completo (boardview + foto + schematic)
e entrega um dict pronto para o JS.

Prioridade de formato quando ha mais de um arquivo do mesmo board:
  .bvr  (BVRAW_FORMAT_3) - preferido: traz face, raio e net por nome
  .pcb  (XZZPCB V1.0)    - fallback
"""
import os, re, json, hashlib

_BASE = os.path.dirname(os.path.abspath(__file__))
_CACHE = os.path.join(_BASE, "cache")

try:
    from . import bvr_parser, xzz_parser, cad_parser
except ImportError:
    import bvr_parser, xzz_parser, cad_parser


def _slug(path):
    # [CALIB_PORTAVEL] Slug estavel entre maquinas: arquivos DENTRO do pacote
    # (acervo) usam caminho RELATIVO a boardview_feature/ como chave — assim o
    # cache/*.calib.json gerado na maquina de dev vale no build instalado em
    # qualquer lugar (antes era sha1 do caminho ABSOLUTO e a calibracao das
    # fotos "descasava" no cliente). Arquivos avulsos fora do pacote mantem o
    # comportamento antigo (abspath, cache local da maquina).
    p = os.path.abspath(path)
    try:
        rel = os.path.relpath(p, _BASE)
    except ValueError:
        rel = None
    if rel is not None and not rel.startswith(".."):
        chave = rel.replace("\\", "/").lower()
    else:
        chave = p
    h = hashlib.sha1(chave.encode("utf-8")).hexdigest()[:12]
    return h


def detectar_formato(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".bvr":
        return "bvr"
    if ext in (".pcb", ".xzz"):
        return "xzz"
    if ext == ".cad":
        return "cad"
    try:
        head = open(path, "rb").read(64)
    except OSError:
        return None
    if head.startswith(b"BVRAW_FORMAT"):
        return "bvr"
    if head[:11] == b"XZZPCB V1.0":
        return "xzz"
    if b"$HEADER" in head and b"GENCAD" in head:
        return "cad"
    return None


def melhor_arquivo(path):
    """Usa o arquivo que o usuario ABRIU. O .pcb (XZZ) vem plano com as faces
    ja na posicao fisica correta (bordas de juncao no centro, USBs se
    encarando) — entao respeitamos a escolha do usuario e nao trocamos por
    .bvr automaticamente. Isso da o layout correto estilo FlexBV."""
    return path


def _similar(a, b):
    if not a or not b:
        return 0.0
    ta, tb = set(a.split()), set(b.split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / max(len(ta), len(tb))


def achar_anexos(path):
    """Procura, na mesma pasta, a foto real da placa e o schematic em PDF.

    Reconhece dois casos:
    1. ACERVO ORGANIZADO (nomes padrao): foto.pdf/png = foto,
       esquema.pdf/schematic.pdf = diagrama eletrico.
    2. ACERVO BRUTO: heuristica por nome parecido com o do boardview."""
    pasta = os.path.dirname(path)
    arquivos = {f.lower(): os.path.join(pasta, f) for f in os.listdir(pasta)}
    foto = pdf = None

    # ── caso 1: nomes padrao do acervo organizado ──
    for nome in ("foto.pdf", "foto.png", "foto.jpg", "foto.jpeg"):
        if nome in arquivos:
            foto = arquivos[nome]; break
    for nome in ("esquema.pdf", "schematic.pdf", "diagrama.pdf"):
        if nome in arquivos:
            pdf = arquivos[nome]; break
    if foto or pdf:
        return {"foto": foto, "schematic": pdf}

    # ── caso 2: acervo bruto, heuristica por similaridade ──
    base = os.path.splitext(os.path.basename(path))[0].lower()
    base_limpa = re.sub(r"\s*(pcb|decrypted|layer|board)\s*", " ", base, flags=re.I).strip()
    for f in sorted(os.listdir(pasta)):
        low = f.lower()
        full = os.path.join(pasta, f)
        if low.endswith((".jpg", ".jpeg", ".png")) and foto is None:
            if _similar(base_limpa, os.path.splitext(low)[0]) >= 0.4:
                foto = full
        elif low.endswith(".pdf"):
            nome = os.path.splitext(low)[0]
            if re.search(r"\b(image|imagem|photo|foto|top|bottom)\b", nome):
                if foto is None:
                    foto = full
            elif pdf is None and _similar(base_limpa, nome) >= 0.3:
                pdf = full
    return {"foto": foto, "schematic": pdf}


def extrair_foto_pdf(pdf_path, destino=None, largura_max=3200):
    """Extrai a foto da placa embutida num PDF e gera uma versao
    redimensionada para camada de fundo. Preserva a proporcao (nunca
    distorce). Metodo 1: PyMuPDF (fitz) — robusto, funciona com qualquer
    codificacao. Metodo 2 (fallback): busca do JPEG cru (DCTDecode direto)."""
    if destino is None:
        os.makedirs(_CACHE, exist_ok=True)
        destino = os.path.join(_CACHE, _slug(pdf_path) + ".jpg")
    if os.path.exists(destino):
        return destino

    # ── Metodo 1: PyMuPDF extrai a maior imagem embutida ──
    try:
        import fitz
        from PIL import Image
        import io
        Image.MAX_IMAGE_PIXELS = None
        doc = fitz.open(pdf_path)
        maior = None
        for pno in range(min(doc.page_count, 3)):
            for img in doc[pno].get_images(full=True):
                xref = img[0]
                info = doc.extract_image(xref)
                if maior is None or len(info["image"]) > len(maior["image"]):
                    maior = info
        doc.close()
        if maior and len(maior["image"]) > 20_000:
            im = Image.open(io.BytesIO(maior["image"]))
            w, h = im.size
            if w > largura_max:
                nova = (largura_max, max(1, round(h * largura_max / w)))
                im = im.convert("RGB").resize(nova, Image.LANCZOS)
            im.save(destino, "JPEG", quality=88)
            return destino
    except Exception as e:
        print(f"[BVIEW] fitz falhou ({e}), tentando extracao direta")

    # ── Metodo 2 (fallback): JPEG cru no stream ──
    data = open(pdf_path, "rb").read()
    melhor = None
    inicio = 0
    while True:
        s = data.find(b"\xff\xd8\xff", inicio)
        if s < 0:
            break
        e = data.find(b"\xff\xd9", s)
        if e > 0 and (melhor is None or e - s > melhor[1] - melhor[0]):
            melhor = (s, e + 2)
        inicio = s + 3
    if not melhor or melhor[1] - melhor[0] < 50_000:
        return None

    jpg = data[melhor[0]:melhor[1]]
    try:
        from PIL import Image
        import io
        Image.MAX_IMAGE_PIXELS = None
        im = Image.open(io.BytesIO(jpg))
        w, h = im.size
        if w > largura_max:
            nova = (largura_max, max(1, round(h * largura_max / w)))  # proporcao intacta
            im = im.convert("RGB").resize(nova, Image.LANCZOS)
        im.save(destino, "JPEG", quality=88)
    except Exception:
        with open(destino, "wb") as fh:
            fh.write(jpg)
    return destino


def calibracao_path(board_path):
    os.makedirs(_CACHE, exist_ok=True)
    return os.path.join(_CACHE, _slug(board_path) + ".calib.json")


def carregar(path):
    """Carrega o boardview e monta o pacote completo para o JS."""
    alvo = melhor_arquivo(path)
    fmt = detectar_formato(alvo)
    if fmt == "bvr":
        bd = bvr_parser.parse(alvo)
        d = bvr_parser.to_dict(bd)
    elif fmt == "xzz":
        bd = xzz_parser.parse(alvo)
        d = xzz_parser.to_dict(bd)
        if d["stats"]["pins"] == 0:
            d["warnings"].insert(0,
                "Este .pcb esta CRIPTOGRAFADO (blocos ilegiveis). Abra o "
                "arquivo 'Decrypted.pcb' ou '.bvr' desta mesma placa.")
    elif fmt == "cad":
        bd = cad_parser.parse(alvo)
        d = cad_parser.to_dict(bd)
    else:
        raise ValueError("Formato de boardview nao reconhecido")

    anexos = achar_anexos(alvo)
    foto = anexos["foto"]
    if foto and foto.lower().endswith(".pdf"):
        foto = extrair_foto_pdf(foto)

    calib = {}
    cp = calibracao_path(alvo)
    if os.path.exists(cp):
        try:
            calib = json.load(open(cp, encoding="utf-8"))
        except Exception:
            pass

    # ajuste de faces salvo (mover/girar/espelhar TOP e BOTTOM)
    ajuste = {}
    ap = ajuste_faces_path(alvo)
    if os.path.exists(ap):
        try:
            ajuste = json.load(open(ap, encoding="utf-8"))
        except Exception:
            pass

    d["arquivo"] = os.path.basename(alvo)
    d["caminho"] = alvo
    d["formato"] = fmt
    d["foto"] = foto
    d["schematic"] = anexos["schematic"]
    d["calibracao"] = calib
    d["ajuste_faces"] = ajuste
    return d


def ajuste_faces_path(board_path):
    os.makedirs(_CACHE, exist_ok=True)
    return os.path.join(_CACHE, _slug(board_path) + ".faces.json")


def salvar_ajuste_faces(board_path, ajuste):
    ap = ajuste_faces_path(melhor_arquivo(board_path))
    with open(ap, "w", encoding="utf-8") as fh:
        json.dump(ajuste, fh, indent=2)
    return ap


def salvar_calibracao(board_path, calib):
    """[ADMIN_ONLY] Persiste o casamento foto <-> boardview."""
    cp = calibracao_path(melhor_arquivo(board_path))
    with open(cp, "w", encoding="utf-8") as fh:
        json.dump(calib, fh, indent=2)
    return cp
