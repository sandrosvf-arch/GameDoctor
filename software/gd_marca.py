# -*- coding: utf-8 -*-
"""
gd_marca.py — marca d'agua com Nome + CPF do aluno.

Aplicada UMA vez, na hora em que o material entra no cofre (apos o
download), com os dados da sessao logada. Duas camadas:
  1. visivel: texto diagonal repetido, opaco o suficiente para aparecer
     em foto/print de tela, discreto o suficiente para nao atrapalhar
     a leitura de um diagrama;
  2. invisivel: metadados (PDF: subject/keywords; PNG: tEXt; JPEG: EXIF
     comment) com nome, CPF, e-mail, id e data — sobrevive a recorte
     da marca visivel.
"""
import io, time


def texto_marca(sessao):
    nome = (sessao.get("nome") or "").strip()
    cpf = (sessao.get("cpf") or "").strip()
    if cpf:
        from gd_auth import cpf_formatar
        return f"{nome}  •  CPF {cpf_formatar(cpf)}"
    return f"{nome}  •  {sessao.get('email', '')}"


def _rastro(sessao):
    return (f"GameDoctor uid={sessao.get('uid')} nome={sessao.get('nome')} "
            f"cpf={sessao.get('cpf') or '-'} email={sessao.get('email')} "
            f"em={time.strftime('%Y-%m-%d %H:%M')}")


# ── PDF ───────────────────────────────────────────────────────────
def marcar_pdf(dados: bytes, sessao) -> bytes:
    import fitz
    # PDFs de diagrama vindos de conversores ruins tem fluxos de conteudo mal
    # formados ("136.1m" sem espaco etc.). O MuPDF tolera e renderiza, mas
    # despeja um "syntax error" por operador no console — silencia.
    try:
        fitz.TOOLS.mupdf_display_errors(False)
    except Exception:
        pass
    txt = texto_marca(sessao)
    doc = fitz.open(stream=dados, filetype="pdf")
    if doc.needs_pass:
        doc.close()
        return dados                    # protegido: entrega como veio
    for page in doc:
        try:
            r = page.rect
            w, h = r.width, r.height
            fs = max(14, min(w, h) / 18)
            # grade diagonal de 3 linhas por pagina
            for k, fy in enumerate((0.25, 0.55, 0.85)):
                x = w * 0.06 + (k % 2) * w * 0.08
                y = h * fy
                p = fitz.Point(x, y)
                page.insert_text(p, txt, fontsize=fs, fontname="helv",
                                 color=(0.35, 0.35, 0.35), fill_opacity=0.16,
                                 morph=(p, fitz.Matrix(-28)), overlay=True)
            # rodape pequeno e bem legivel
            page.insert_text(fitz.Point(12, h - 8), txt, fontsize=7,
                             fontname="helv", color=(0.4, 0.4, 0.4),
                             fill_opacity=0.7, overlay=True)
        except Exception as e:
            print(f"[MARCA] pagina {page.number}: {e}")
    md = doc.metadata or {}
    md["subject"] = _rastro(sessao)
    md["keywords"] = f"GameDoctor;{sessao.get('uid')};{sessao.get('cpf') or ''}"
    try:
        doc.set_metadata(md)
    except Exception:
        pass
    out = doc.tobytes(garbage=1, deflate=True)
    doc.close()
    return out


# ── imagens ───────────────────────────────────────────────────────
def marcar_imagem(dados: bytes, sessao, ext=".png") -> bytes:
    from PIL import Image, ImageDraw, ImageFont, PngImagePlugin
    Image.MAX_IMAGE_PIXELS = None
    txt = texto_marca(sessao)
    im = Image.open(io.BytesIO(dados))
    fmt = (im.format or ("JPEG" if ext.lower() in (".jpg", ".jpeg") else "PNG")).upper()
    base = im.convert("RGBA")
    w, h = base.size
    camada = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(camada)
    fs = max(16, min(w, h) // 22)
    try:
        font = ImageFont.truetype("arial.ttf", fs)
    except Exception:
        font = ImageFont.load_default()
    # texto num tile girado, repetido em grade
    bbox = d.textbbox((0, 0), txt, font=font)
    tw, th = bbox[2] - bbox[0] + 20, bbox[3] - bbox[1] + 20
    tile = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((10, 10), txt, font=font, fill=(255, 255, 255, 70),
                              stroke_width=max(1, fs // 14), stroke_fill=(0, 0, 0, 60))
    tile = tile.rotate(28, expand=True, resample=Image.BICUBIC)
    stepx, stepy = int(tile.width * 1.15), int(tile.height * 1.6)
    y = -tile.height // 2
    linha = 0
    while y < h:
        x = -tile.width // 2 + (linha % 2) * stepx // 2
        while x < w:
            camada.alpha_composite(tile, (x, y))
            x += stepx
        y += stepy
        linha += 1
    # rodape legivel
    ImageDraw.Draw(camada).text((8, h - fs - 6), txt, font=font,
                                fill=(255, 255, 255, 200),
                                stroke_width=max(1, fs // 12), stroke_fill=(0, 0, 0, 200))
    out = Image.alpha_composite(base, camada)
    buf = io.BytesIO()
    if fmt == "JPEG":
        out.convert("RGB").save(buf, "JPEG", quality=90,
                                comment=_rastro(sessao).encode("utf-8"))
    else:
        info = PngImagePlugin.PngInfo()
        info.add_text("Comment", _rastro(sessao))
        info.add_text("GameDoctor", f"{sessao.get('uid')}|{sessao.get('cpf') or ''}")
        out.save(buf, "PNG", pnginfo=info, optimize=False)
    return buf.getvalue()


def aplicar(dados: bytes, categoria: str, nome: str, sessao) -> bytes:
    """Despacha pela categoria/extensao. Nunca levanta: em falha devolve o
    original (melhor entregar sem marca do que travar o download)."""
    ext = ("." + nome.rsplit(".", 1)[-1].lower()) if "." in nome else ""
    try:
        if ext == ".pdf":
            return marcar_pdf(dados, sessao)
        if ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp"):
            return marcar_imagem(dados, sessao, ext)
    except Exception as e:
        print(f"[MARCA] falhou em {nome}: {e}")
    return dados
