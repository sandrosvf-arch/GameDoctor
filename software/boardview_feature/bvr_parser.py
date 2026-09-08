# -*- coding: utf-8 -*-
"""
bvr_parser.py - Parser do formato BVRAW_FORMAT_3 (boardview raw ASCII)
Bancada PRO / MaxTech

Formato texto autodescritivo do FlexBV. Estrutura confirmada por RE:

  BVRAW_FORMAT_3
  PART_NAME U13
     PART_SIDE B                         (T=top, B=bottom)
     PART_ORIGIN 0.000 0.000             centro do part (referencia do outline)
     PART_MOUNT SMD
     PART_PACKAGE BGA-C3-8
     PART_OUTLINE_TYPE_SEGMENTS          outline = pares de segmentos (x1 y1 x2 y2 ...)
     PART_OUTLINE_RELATIVE x1 y1 x2 y2 ...   relativo ao PART_ORIGIN
     PIN_ID U13-A2
        PIN_NAME A2
        PIN_SIDE B
        PIN_ORIGIN 2996.785 1936.934     coords absolutas do pad
        PIN_RADIUS 4.500
        PIN_NET GND
     PIN_END
  PART_END
  ...
  OUTLINE_SEGMENTED x1 y1 x2 y2 ...      CONTORNO DA PLACA (pares de segmentos)

DESCOBERTAS-CHAVE (nao repetir os erros):
  - PART_ORIGIN geralmente e (0,0); nesse caso PART_OUTLINE_RELATIVE contem
    coords ABSOLUTAS. O centro do part para desenhar labels/silhueta e o
    PART_ORIGIN + (0,0), ou o centroide do outline se origin=0.
  - PART_OUTLINE_RELATIVE e uma lista de SEGMENTOS (pares de pontos: p0-p1,
    p2-p3, ...), NAO uma polilinha continua.
  - OUTLINE_SEGMENTED (uma linha, no fim) e o contorno da PLACA — a silhueta
    que faltava.

Implementacao propria (clean-room). Nenhum codigo GPL utilizado.
"""


class BVRBoard:
    def __init__(self):
        self.parts, self.pins = [], []
        self.nets = set()
        self.board_outline = []   # [(x1,y1,x2,y2), ...] contorno da placa
        self.bbox = (0, 0, 0, 0)
        self.warnings = []


def _f(tok):
    try:
        return float(tok)
    except ValueError:
        return 0.0


def _pares_segmentos(nums):
    """Converte lista plana [x1,y1,x2,y2,...] em segmentos [(x1,y1,x2,y2),...].
    Cada segmento consome 4 numeros (dois pontos)."""
    segs = []
    for i in range(0, len(nums) - 3, 4):
        segs.append((nums[i], nums[i+1], nums[i+2], nums[i+3]))
    return segs


def parse(path: str) -> BVRBoard:
    bd = BVRBoard()
    with open(path, "r", encoding="latin-1", errors="replace") as fh:
        first = fh.readline().strip()
        if not first.startswith("BVRAW_FORMAT"):
            raise ValueError("Nao e um arquivo BVRAW (header ausente)")

        part = None
        pin = None
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            key, _, rest = line.partition(" ")
            rest = rest.strip()

            # ── contorno da placa (linha unica, geralmente no fim) ──
            if key == "OUTLINE_SEGMENTED":
                nums = [_f(t) for t in rest.split()]
                bd.board_outline = _pares_segmentos(nums)
                continue

            if key == "PART_NAME":
                part = {"ref": rest, "side": "TOP", "fp": "",
                        "ox": 0.0, "oy": 0.0, "outline": [], "pins": []}
            elif part is None:
                continue
            elif key == "PART_SIDE":
                part["side"] = "BOT" if rest.upper().startswith("B") else "TOP"
            elif key == "PART_ORIGIN":
                t = rest.split()
                if len(t) >= 2:
                    part["ox"], part["oy"] = _f(t[0]), _f(t[1])
            elif key == "PART_PACKAGE":
                part["fp"] = rest
            elif key == "PART_OUTLINE_RELATIVE":
                nums = [_f(t) for t in rest.split()]
                part["outline"] = _pares_segmentos(nums)
            elif key == "PIN_ID":
                pin = {"pin": "", "side": part["side"], "x": 0.0, "y": 0.0,
                       "r": 4.0, "net": None, "shape": None, "th": False}
            elif pin is not None and key == "PIN_NAME":
                pin["pin"] = rest
            elif pin is not None and key == "PIN_NUMBER" and not pin["pin"]:
                pin["pin"] = rest
            elif pin is not None and key == "PIN_SIDE":
                pin["side"] = "BOT" if rest.upper().startswith("B") else "TOP"
            elif pin is not None and key == "PIN_ORIGIN":
                t = rest.split()
                if len(t) >= 2:
                    pin["x"], pin["y"] = _f(t[0]), _f(t[1])
            elif pin is not None and key == "PIN_RADIUS":
                pin["r"] = _f(rest) or 4.0
            elif pin is not None and key == "PIN_TYPE":
                if rest.upper() in ("TH", "DRILL"):
                    pin["th"] = True
            elif pin is not None and key == "PIN_OUTLINE_RELATIVE":
                nums = [_f(t) for t in rest.split()]
                pts = [[nums[i], nums[i+1]] for i in range(0, len(nums)-1, 2)]
                if len(pts) >= 3:
                    pin["shape"] = pts
            elif pin is not None and key == "PIN_NET":
                pin["net"] = rest or None
                if rest:
                    bd.nets.add(rest)
            elif key == "PIN_END" and pin is not None:
                pin["part"] = len(bd.parts)
                bd.pins.append(pin)
                part["pins"].append(len(bd.pins) - 1)
                pin = None
            elif key == "PART_END":
                bd.parts.append(part)
                part = None

        if part is not None:
            bd.parts.append(part)

    _finalize(bd)
    return bd


def _rot_ponto(x, y, cx, cy, graus):
    """Rotaciona (x,y) em torno de (cx,cy). graus>0 = horario (Y invertido do
    boardview: horario visual = sentido matematico positivo aqui)."""
    import math
    a = math.radians(graus)
    dx, dy = x - cx, y - cy
    # horario na tela (Y pra baixo apos render) = rotacao padrao aqui
    nx = cx + dx * math.cos(a) - dy * math.sin(a)
    ny = cy + dx * math.sin(a) + dy * math.cos(a)
    return nx, ny


def _ajuste_switch2(bd):
    """TOP (esquerda) -> vai pra direita + gira 180 graus.
       BOTTOM (direita) -> vai pra esquerda + gira 90 graus horario.
    Recalcula bbox e center_x ao final."""
    # centros de cada face (bbox dos pinos de cada lado)
    top = [p for p in bd.pins if p["side"] == "TOP"]
    bot = [p for p in bd.pins if p["side"] == "BOT"]
    if not top or not bot:
        return

    def bbox(ps):
        xs = [p["x"] for p in ps]; ys = [p["y"] for p in ps]
        return min(xs), min(ys), max(xs), max(ys)

    tminx, tminy, tmaxx, tmaxy = bbox(top)
    bminx, bminy, bmaxx, bmaxy = bbox(bot)
    tcx, tcy = (tminx + tmaxx) / 2, (tminy + tmaxy) / 2
    bcx, bcy = (bminx + bmaxx) / 2, (bminy + bmaxy) / 2
    gap = (tmaxx - tminx) * 0.06

    # 1) rotaciona cada face em torno do seu proprio centro
    #    TOP 180, BOTTOM 90 horario
    for p in bd.pins:
        if p["side"] == "TOP":
            p["x"], p["y"] = _rot_ponto(p["x"], p["y"], tcx, tcy, 180)
        else:
            p["x"], p["y"] = _rot_ponto(p["x"], p["y"], bcx, bcy, 90)
    # rotaciona tambem os outlines dos parts
    for pt in bd.parts:
        cx, cy = (tcx, tcy) if pt.get("side") == "TOP" else (bcx, bcy)
        g = 180 if pt.get("side") == "TOP" else 90
        if pt.get("outline"):
            pt["outline"] = [(*_rot_ponto(a, b, cx, cy, g),
                              *_rot_ponto(c, d, cx, cy, g))
                             for (a, b, c, d) in pt["outline"]]

    # 2) reposiciona: BOTTOM na esquerda, TOP na direita.
    #    recalcula os bbox pos-rotacao
    top = [p for p in bd.pins if p["side"] == "TOP"]
    bot = [p for p in bd.pins if p["side"] == "BOT"]
    tminx, tminy, tmaxx, tmaxy = bbox(top)
    bminx, bminy, bmaxx, bmaxy = bbox(bot)

    # BOTTOM vai pra esquerda: ancora em x=0
    dxb = -bminx
    # TOP vai pra direita: ancora logo apos a largura do BOTTOM + gap
    largb = bmaxx - bminx
    dxt = (largb + gap) - tminx
    # alinha verticalmente pelo topo
    dyb = -bminy
    dyt = -tminy

    for p in bd.pins:
        if p["side"] == "TOP":
            p["x"] += dxt; p["y"] += dyt
        else:
            p["x"] += dxb; p["y"] += dyb
    for pt in bd.parts:
        dx, dy = (dxt, dyt) if pt.get("side") == "TOP" else (dxb, dyb)
        if pt.get("outline"):
            pt["outline"] = [(a+dx, b+dy, c+dx, d+dy)
                             for (a, b, c, d) in pt["outline"]]

    # 3) recalcula centro dos parts e bbox/center_x
    for pt in bd.parts:
        if pt["pins"]:
            pt["x"] = sum(bd.pins[j]["x"] for j in pt["pins"]) / len(pt["pins"])
            pt["y"] = sum(bd.pins[j]["y"] for j in pt["pins"]) / len(pt["pins"])
    # contorno: descarta o antigo (nao bate mais) e usa retangulos das faces
    bot2 = [p for p in bd.pins if p["side"] == "BOT"]
    top2 = [p for p in bd.pins if p["side"] == "TOP"]
    bd.board_outline = _ret(bbox(bot2)) + _ret(bbox(top2))
    allx = [p["x"] for p in bd.pins]; ally = [p["y"] for p in bd.pins]
    bd.bbox = (min(allx), min(ally), max(allx), max(ally))
    bd.center_x = (bmaxx + dxb + tminx + dxt) / 2  # meio do gap


def _ret(bb):
    """Retangulo (4 segmentos) a partir de um bbox."""
    x0, y0, x1, y1 = bb
    return [(x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)]


def _finalize(bd):
    """No BVR as duas faces vem SOBREPOSTAS. Para o layout lado-a-lado (FlexBV),
    o BOTTOM e o espelho horizontal do TOP em torno do CONTORNO da placa (que e
    igual nas duas faces), colocado a direita. Espelhar pelo contorno (nao pelos
    pinos) garante que as duas 'asas' fiquem simetricas como no FlexBV."""
    # referencia = bounding box do CONTORNO da placa (igual nas duas faces)
    if bd.board_outline:
        oxs = [c for s in bd.board_outline for c in (s[0], s[2])]
        cminx, cmaxx = min(oxs), max(oxs)
    else:
        pxs = [p["x"] for p in bd.pins] or [0]
        cminx, cmaxx = min(pxs), max(pxs)
    cw = cmaxx - cminx           # largura do contorno
    gap = cw * 0.04              # espaco pequeno entre as asas (FlexBV encosta)
    base = cmaxx + gap           # onde a asa BOTTOM comeca

    # centro do part e face
    for i, pt in enumerate(bd.parts):
        if pt["ox"] or pt["oy"]:
            pt["x"], pt["y"] = pt["ox"], pt["oy"]
            pt["outline_abs"] = False
        elif pt["outline"]:
            oxs2, oys2 = [], []
            for (a, b, cc, dd) in pt["outline"]:
                oxs2 += [a, cc]; oys2 += [b, dd]
            pt["x"] = (min(oxs2) + max(oxs2)) / 2
            pt["y"] = (min(oys2) + max(oys2)) / 2
            pt["outline_abs"] = True
        else:
            cx = [bd.pins[j]["x"] for j in pt["pins"]]
            cy = [bd.pins[j]["y"] for j in pt["pins"]]
            pt["x"] = sum(cx) / len(cx) if cx else 0.0
            pt["y"] = sum(cy) / len(cy) if cy else 0.0
            pt["outline_abs"] = True
        for j in pt["pins"]:
            bd.pins[j]["part"] = i

    # BOTTOM vai a direita do TOP. Para as bordas de juncao (USBs) se
    # encararem no centro, o BOTTOM NAO e espelhado — e apenas transladado
    # para a direita mantendo a orientacao. Assim a borda esquerda do BOTTOM
    # (que tocava o TOP na placa fisica) fica voltada para o TOP.
    # x' = x + desloc, onde desloc coloca a borda esquerda do BOT logo apos
    # a borda direita do TOP.
    desloc = (cmaxx + gap) - cminx

    def remap_x(x):
        return x + desloc

    for p in bd.pins:
        if p["side"] == "BOT":
            p["x"] = remap_x(p["x"])
    for pt in bd.parts:
        if pt.get("side") == "BOT":
            pt["x"] = remap_x(pt["x"])
            # outline do part BOTTOM tambem precisa espelhar+deslocar
            if pt.get("outline"):
                pt["outline"] = [(remap_x(a), b, remap_x(cc), dd)
                                 for (a, b, cc, dd) in pt["outline"]]
                pt["outline_abs"] = True

    # contorno da placa: duplica para as duas faces (o BVR tem um outline so)
    # TOP mantem, BOTTOM = espelhado+deslocado
    bot_outline = [(remap_x(x1), y1, remap_x(x2), y2)
                   for (x1, y1, x2, y2) in bd.board_outline]
    bd.board_outline = bd.board_outline + bot_outline

    bd.center_x = cmaxx + gap / 2   # eixo no meio do gap entre as asas

    # bbox final (agora com o BOTTOM deslocado)
    axs = [p["x"] for p in bd.pins]
    ays = [p["y"] for p in bd.pins]
    for (x1, y1, x2, y2) in bd.board_outline:
        axs += [x1, x2]; ays += [y1, y2]
    bd.bbox = (min(axs), min(ays), max(axs), max(ays))


def to_dict(bd: BVRBoard) -> dict:
    """Serializa para o JS (QWebChannel).
    'o'  = outline do part como segmentos [[x1,y1,x2,y2],...]
    'oa' = True se o outline ja esta em coords absolutas (nao somar centro)
    'n'  None = UNCONNECTED
    board_outline = contorno da placa (segmentos, sempre absoluto)."""
    return {
        "bbox": list(bd.bbox),
        "has_sides": True,
        "center_x": getattr(bd, "center_x", 0),
        "layout": "flat",
        "board_outline": [[a, b, c, d] for (a, b, c, d) in bd.board_outline],
        "parts": [{"ref": p["ref"], "fp": p["fp"], "s": p["side"],
                   "x": p["x"], "y": p["y"],
                   "o": [[a, b, c, d] for (a, b, c, d) in p["outline"]],
                   "oa": p.get("outline_abs", True),
                   "pins": p["pins"]} for p in bd.parts],
        "pins": [{"x": p["x"], "y": p["y"], "r": p["r"], "s": p["side"],
                  "n": p["net"], "p": p["pin"], "c": p["part"],
                  "sh": p.get("shape"), "th": p.get("th", False)}
                 for p in bd.pins],
        "segments": [],
        "warnings": bd.warnings,
        "stats": {"parts": len(bd.parts), "pins": len(bd.pins),
                  "segments": len(bd.board_outline), "nets": len(bd.nets)},
    }


if __name__ == "__main__":
    import sys, json, collections
    bd = parse(sys.argv[1])
    d = to_dict(bd)
    print(json.dumps(d["stats"], indent=2))
    print("bbox:", [round(v, 1) for v in d["bbox"]])
    print("board_outline segmentos:", len(d["board_outline"]))
    print("faces (pinos):", collections.Counter(p["s"] for p in d["pins"]))
    com_o = sum(1 for p in d["parts"] if p["o"])
    print("parts com outline:", com_o, "/", len(d["parts"]))
    big = max(d["parts"], key=lambda p: len(p["pins"]))
    print("maior:", big["ref"], "centro=(%.0f,%.0f)" % (big["x"], big["y"]),
          len(big["pins"]), "pinos, outline_abs=", big["oa"])
    p0 = big["pins"][0]
    print("  pino0 desse part:", d["pins"][p0]["x"], d["pins"][p0]["y"])
