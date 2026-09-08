# -*- coding: utf-8 -*-
"""
cad_parser.py - Parser do formato GenCAD 1.4 (.cad Allegro / CAMCAD)
Bancada PRO / MaxTech

Formato texto ASCII, seções $XXX ... $ENDXXX. Usado nos boardviews de Xbox
(One FAT/S/X, Series X, Elite, e todo o Xbox 360). Clean-room a partir da
estrutura do arquivo — GenCAD é formato aberto documentado.

Estrutura:
  $PADS       PAD nome ROUND/RECTANGULAR + CIRCLE r ou RECTANGLE x y w h
  $PADSTACKS  PADSTACK nome + PAD (liga forma a camada)
  $SHAPES     SHAPE nome + PIN nome padstack X Y layer rot (posicao RELATIVA)
  $COMPONENTS COMPONENT ref + PLACE x y + LAYER top/bot + ROTATION + SHAPE usado
  $DEVICES    DEVICE nome + VALUE (valor do componente)
  $SIGNALS    SIGNAL net + NODE ref pino (mapa net->pinos)
  Coordenadas: UNITS USER N (divisor); posicoes absolutas dos componentes,
  pinos relativos ao componente (aplicar rotacao + mirror se bottom).
"""
import re
import math


class CADError(Exception):
    pass


class CADBoard:
    def __init__(self):
        self.parts = []
        self.pins = []
        self.outline = []
        self.nets = {}
        self.bbox = (0, 0, 0, 0)
        self.warnings = []


def verify(path):
    try:
        head = open(path, "r", encoding="latin-1").read(64)
    except OSError:
        return False
    return "$HEADER" in head and "GENCAD" in head


def _sec(txt, name):
    m = re.search(r"\$" + name + r"\b(.*?)\$END" + name, txt, re.S)
    return m.group(1) if m else ""


def _unit_mult(txt):
    """[RETRO_CAD_UNITS] Multiplicador para normalizar as coordenadas em mils.
    Xbox (Allegro/CAMCAD) ja vem em mils (1.0). Exports do KiCad declaram
    UNITS INCH ou UNITS MM no $HEADER."""
    m = re.search(r"^UNITS\s+(\w+)", _sec(txt, "HEADER"), re.M)
    u = (m.group(1).upper() if m else "")
    if u == "INCH":
        return 1000.0
    if u == "MM":
        return 1000.0 / 25.4
    return 1.0


def parse(path):
    txt = open(path, "r", encoding="latin-1").read()
    bd = CADBoard()

    # [RETRO_CAD_UNITS] um=1 para os CAD do Xbox (ja em mils); INCH/MM do
    # KiCad viram mils via multiplicador global aplicado na leitura.
    um = _unit_mult(txt)

    pad_shapes = _parse_pads(_sec(txt, "PADS"), um)
    padstacks = _parse_padstacks(_sec(txt, "PADSTACKS"), pad_shapes)
    shapes = _parse_shapes(_sec(txt, "SHAPES"), padstacks, um)
    values = _parse_devices(_sec(txt, "DEVICES"))
    net_of_pin = _parse_signals(_sec(txt, "SIGNALS"), bd)
    _parse_components(_sec(txt, "COMPONENTS"), shapes, values, net_of_pin,
                      bd, um)
    _parse_outline(txt, bd, um)
    _finalize(bd)
    return bd


def _parse_pads(sec, um=1.0):
    """PAD nome ROUND/RECTANGULAR ... + CIRCLE r ou RECTANGLE x y w h.
    [RETRO_CAD_UNITS] Exports do KiCad tambem desenham pads ovais/roundrect
    so com LINE/ARC — nesses casos a forma vira o bbox do contorno.
    Coordenadas do arquivo multiplicadas por um (mils); defaults ja em mils."""
    pads = {}
    cur = None
    pts = []

    def fecha():
        if cur and pts and pads[cur].get("_default"):
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            w = (max(xs) - min(xs)) * um
            h = (max(ys) - min(ys)) * um
            if w > 0 and h > 0:
                pads[cur] = {"tipo": "rect", "r": max(w, h) / 2,
                             "w": w, "h": h}

    for line in sec.split("\n"):
        line = line.strip()
        if line.startswith("PAD "):
            fecha()
            pts = []
            p = line.split()
            cur = p[1]
            pads[cur] = {"tipo": "circ", "r": 4.0, "w": 8.0, "h": 8.0,
                         "_default": True}
        elif cur and line.startswith("CIRCLE"):
            v = line.split()
            r = (float(v[3]) if len(v) > 3 else 0.0) * um
            pads[cur] = {"tipo": "circ", "r": r or 4.0,
                         "w": (r or 4.0) * 2, "h": (r or 4.0) * 2}
        elif cur and line.startswith("RECTANGLE"):
            v = line.split()
            # RECTANGLE x y w h (x,y = canto; w,h = dimensoes)
            w, h = abs(float(v[3])) * um, abs(float(v[4])) * um
            pads[cur] = {"tipo": "rect", "r": max(w, h) / 2, "w": w, "h": h}
        elif cur and line.startswith("LINE"):
            v = line.split()
            try:
                pts.append((float(v[1]), float(v[2])))
                pts.append((float(v[3]), float(v[4])))
            except (IndexError, ValueError):
                pass
        elif cur and line.startswith("ARC"):
            v = line.split()
            try:
                pts.append((float(v[1]), float(v[2])))
                pts.append((float(v[3]), float(v[4])))
            except (IndexError, ValueError):
                pass
    fecha()
    for p in pads.values():
        p.pop("_default", None)
    return pads


def _parse_padstacks(sec, pad_shapes):
    """PADSTACK nome + PAD forma layer -> resolve a forma do 1o PAD."""
    ps = {}
    cur = None
    for line in sec.split("\n"):
        line = line.strip()
        if line.startswith("PADSTACK "):
            cur = line.split()[1]
        elif cur and cur not in ps and line.startswith("PAD "):
            forma = line.split()[1]
            ps[cur] = pad_shapes.get(forma,
                                     {"tipo": "circ", "r": 4, "w": 8, "h": 8})
    return ps


def _parse_shapes(sec, padstacks, um=1.0):
    """SHAPE nome + PIN nome padstack x y layer rot (posicao relativa)."""
    shapes = {}
    cur = None
    for line in sec.split("\n"):
        line = line.strip()
        if line.startswith("SHAPE "):
            cur = line.split(None, 1)[1].split()[0]
            shapes[cur] = []
        elif cur and line.startswith("PIN "):
            p = line.split()
            # PIN nome padstack x y layer rot ...
            try:
                nome = p[1]
                pstk = p[2]
                x, y = float(p[3]) * um, float(p[4]) * um
                forma = padstacks.get(pstk,
                                      {"tipo": "circ", "r": 4, "w": 8, "h": 8})
                shapes[cur].append({"pin": nome, "x": x, "y": y,
                                    "forma": forma})
            except (IndexError, ValueError):
                pass
    return shapes


def _parse_devices(sec):
    """DEVICE nome + VALUE 'x' -> valor do componente."""
    vals = {}
    cur = None
    for line in sec.split("\n"):
        line = line.strip()
        if line.startswith("DEVICE "):
            cur = line.split(None, 1)[1].strip()
        elif cur and line.startswith("VALUE "):
            m = re.search(r'VALUE\s+"?([^"]*)"?', line)
            if m:
                vals[cur] = m.group(1).strip()
    return vals


def _parse_signals(sec, bd):
    """SIGNAL net + NODE ref pino -> {(ref,pino): net} e conta nets."""
    net_of = {}
    cur = None
    for line in sec.split("\n"):
        line = line.strip()
        if line.startswith("SIGNAL "):
            cur = line.split(None, 1)[1].strip()
            bd.nets[cur] = cur
        elif cur and line.startswith("NODE "):
            p = line.split()
            if len(p) >= 3:
                net_of[(p[1], p[2])] = cur
    return net_of


def _parse_components(sec, shapes, values, net_of_pin, bd, um=1.0):
    """COMPONENT ref + PLACE x y + LAYER + ROTATION + SHAPE usado.
    Aplica posicao absoluta + rotacao + mirror (bottom) aos pinos do shape."""
    blocos = re.split(r"(?=^COMPONENT )", sec, flags=re.M)
    for bloco in blocos:
        if not bloco.strip().startswith("COMPONENT"):
            continue
        ref_m = re.match(r"COMPONENT\s+(\S+)", bloco)
        if not ref_m:
            continue
        ref = ref_m.group(1)
        pm = re.search(r"PLACE\s+([-\d.]+)\s+([-\d.]+)", bloco)
        if not pm:
            continue
        px, py = float(pm.group(1)) * um, float(pm.group(2)) * um
        layer = "BOT" if re.search(r"LAYER\s+BOTTOM", bloco) else "TOP"
        rm = re.search(r"ROTATION\s+([-\d.]+)", bloco)
        rot = float(rm.group(1)) if rm else 0.0
        sm = re.search(r"SHAPE\s+(\S+)", bloco)
        shape_name = sm.group(1) if sm else None
        mirror = "MIRRORY" in bloco or "FLIP" in bloco
        dm = re.search(r"DEVICE\s+(\S+)", bloco)
        val = values.get(dm.group(1), "") if dm else ""

        pin_defs = shapes.get(shape_name, [])
        part_idx = len(bd.parts)
        part = {"ref": ref, "fp": shape_name or "", "val": val,
                "side": layer, "pins": []}
        bd.parts.append(part)

        ca = math.cos(math.radians(rot))
        sa = math.sin(math.radians(rot))
        for pd in pin_defs:
            lx, ly = pd["x"], pd["y"]
            if mirror:
                lx = -lx
            # rotaciona e translada para posicao absoluta
            gx = px + (lx * ca - ly * sa)
            gy = py + (lx * sa + ly * ca)
            net = net_of_pin.get((ref, pd["pin"]))
            forma = pd["forma"]
            bd.pins.append({
                "x": gx, "y": gy,
                "name": pd["pin"], "net": net,
                "r": max(forma["r"], 0.5),
                "forma": forma, "side": layer, "part": part_idx,
                "mirror": mirror})
            part["pins"].append(len(bd.pins) - 1)


def _parse_outline(txt, bd, um=1.0):
    """Contorno da placa: procura LINEs numa layer de borda. GenCAD guarda o
    outline como LINE x1 y1 x2 y2 dentro de ROUTES/MECH de uma layer de edge.
    Coletamos as LINEs mais externas (bounding) como aproximacao."""
    # LINE x1 y1 x2 y2 em qualquer secao
    linhas = re.findall(r"^LINE\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)",
                        txt, re.M)
    for (x1, y1, x2, y2) in linhas:
        bd.outline.append((float(x1)*um, float(y1)*um,
                           float(x2)*um, float(y2)*um))


def _finalize(bd):
    """Translada para origem (min x/y) e monta bbox + faces lado-a-lado.
    No CAD as duas faces JA vem sobrepostas (mesmas coords) — deslocamos o
    BOTTOM para a direita como no BVR, para o layout lado-a-lado do FlexBV."""
    if not bd.pins:
        return
    # translada tudo para origem
    minx = min(p["x"] for p in bd.pins)
    miny = min(p["y"] for p in bd.pins)
    for p in bd.pins:
        p["x"] -= minx; p["y"] -= miny
    for i in range(len(bd.outline)):
        x1, y1, x2, y2 = bd.outline[i]
        bd.outline[i] = (x1-minx, y1-miny, x2-minx, y2-miny)

    # bbox dos pinos (a placa real)
    pxs = [p["x"] for p in bd.pins]; pys = [p["y"] for p in bd.pins]
    bx0, bx1 = min(pxs), max(pxs)
    by0, by1 = min(pys), max(pys)
    larg = bx1 - bx0; alt = by1 - by0

    # o contorno externo da placa NAO e confiavel no CAD (as LINEs sao
    # aberturas/recortes internos, nao a borda). Geramos SEMPRE um retangulo
    # do bbox dos componentes como silhueta externa (igual FlexBV faz quando
    # nao ha outline). Isso garante que toda placa tenha borda visivel.
    m = max(larg, alt) * 0.015
    bd.outline = [
        (bx0-m, by0-m, bx1+m, by0-m),   # base
        (bx1+m, by0-m, bx1+m, by1+m),   # direita
        (bx1+m, by1+m, bx0-m, by1+m),   # topo
        (bx0-m, by1+m, bx0-m, by0-m),   # esquerda
    ]

    # eixo de separacao das faces = extremos do contorno
    oxs = [c for s in bd.outline for c in (s[0], s[2])]
    cmaxx = max(oxs); cminx = min(oxs)
    gap = (cmaxx - cminx) * 0.04
    desloc = (cmaxx + gap) - cminx

    for p in bd.pins:
        if p["side"] == "BOT":
            p["x"] += desloc
    for pt in bd.parts:
        if pt["pins"]:
            pt["side"] = bd.pins[pt["pins"][0]]["side"]
            pt["x"] = sum(bd.pins[j]["x"] for j in pt["pins"]) / len(pt["pins"])
            pt["y"] = sum(bd.pins[j]["y"] for j in pt["pins"]) / len(pt["pins"])
        else:
            pt["x"] = pt["y"] = 0

    # contorno tambem duplica: TOP + BOTTOM deslocado
    bot_out = [(x1+desloc, y1, x2+desloc, y2) for (x1, y1, x2, y2) in bd.outline]
    bd.outline = bd.outline + bot_out
    bd.center_x = cmaxx + gap/2

    axs = [p["x"] for p in bd.pins]; ays = [p["y"] for p in bd.pins]
    for s in bd.outline:
        axs += [s[0], s[2]]; ays += [s[1], s[3]]
    bd.bbox = (min(axs), min(ays), max(axs), max(ays))


def to_dict(bd):
    """Serializa para o JS, mesmo formato dos outros parsers."""
    return {
        "bbox": list(bd.bbox),
        "has_sides": True,
        "center_x": getattr(bd, "center_x", 0),
        "layout": "flat",
        "board_outline": [[a, b, c, d] for (a, b, c, d) in bd.outline],
        "parts": [{"ref": p["ref"], "fp": p.get("fp", ""), "s": p["side"],
                   "x": p["x"], "y": p["y"], "o": [], "oa": True,
                   "pins": p["pins"]} for p in bd.parts],
        "pins": [{"x": p["x"], "y": p["y"], "r": p["r"], "s": p["side"],
                  "n": p["net"], "p": p["name"], "c": p["part"],
                  "sh": _forma_poly(p), "th": False} for p in bd.pins],
        "segments": [],
        "warnings": bd.warnings,
        "stats": {"parts": len(bd.parts), "pins": len(bd.pins),
                  "segments": len(bd.outline), "nets": len(bd.nets)},
    }


def _forma_poly(p):
    """Converte a forma do pad para poligono relativo (retangulo) ou None (circ)."""
    f = p.get("forma")
    if not f or f["tipo"] != "rect":
        return None
    # dimensoes ja em unidades de arquivo; converter na mesma escala do raio
    r = p["r"]
    # aproxima: usa proporcao w/h aplicada ao raio-base
    if f["w"] and f["h"]:
        sc = r / max(f["w"], f["h"]) * 2 if max(f["w"], f["h"]) else 1
        w2 = f["w"] * sc / 2
        h2 = f["h"] * sc / 2
        mir = -1 if p.get("mirror") else 1
        return [[-w2*mir, -h2], [-w2*mir, h2], [w2*mir, h2], [w2*mir, -h2]]
    return None


if __name__ == "__main__":
    import sys, collections
    bd = parse(sys.argv[1])
    d = to_dict(bd)
    print("stats:", d["stats"])
    print("bbox:", [round(v, 1) for v in d["bbox"]])
    print("faces:", collections.Counter(p["s"] for p in d["pins"]))
    named = sum(1 for p in d["pins"] if p["n"])
    print(f"pinos com net: {named}/{len(d['pins'])}")
    formas = collections.Counter("rect" if p["sh"] else "circ" for p in d["pins"])
    print("formas:", dict(formas))
    print("contorno:", len(d["board_outline"]), "segmentos")
    big = max(d["parts"], key=lambda p: len(p["pins"]))
    print("maior:", big["ref"], big["fp"][:30], len(big["pins"]), "pinos, face", big["s"])
    print("parts (amostra):", [p["ref"] for p in d["parts"][:10]])
