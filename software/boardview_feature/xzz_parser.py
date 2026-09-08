# -*- coding: utf-8 -*-
"""
xzz_parser.py - Parser XZZPCB V1.0 portado do OpenBoardView (XZZPCBFile.cpp)
Bancada PRO / MaxTech

Clean-room a partir do ENTENDIMENTO do formato documentado no codigo aberto do
OpenBoardView e do XZZPCB-Layer-Viewer. Algoritmo re-expresso em Python; DES
via pycryptodome (nativo, rapido).

Formato (validado no arquivo real do Switch 2 CRU cifrado):
  - "XZZPCB" nos primeiros 6 bytes.
  - Se buf[0x10] != 0: XOR com buf[0x10] ATE o marcador 'v6v6555v6v6'.
  - Ponteiros: main_data = u32(0x20)+0x20; net_data = u32(0x28)+0x20.
  - Bloco: [tipo u8][size u32][dados]. 0x01 Arc, 0x05 Trace, 0x07 Part (DES!),
    0x09 TestPad. Layer 28 = contorno da placa.
  - XZZ_GLOBAL_SCALE = 10000. Translacao: subtrair min(x,y) do contorno.
"""
import struct
from Crypto.Cipher import DES

SCALE = 10000
MARKER = b"v6v6555v6v6"


def _build_des_key():
    bl = [0xE0, 0xCF, 0x2E, 0x9F, 0x3C, 0x33, 0x3C, 0x33]
    hx = ""
    for i in range(0, len(bl), 2):
        v = ((bl[i] << 8) | bl[i + 1]) ^ 0x3C33
        hx += f"{v:04X}"
    return bytes.fromhex(hx)


_DES = DES.new(_build_des_key(), DES.MODE_ECB)


def _des_decrypt(buf):
    n = (len(buf) // 8) * 8
    return _DES.decrypt(bytes(buf[:n])) + bytes(buf[n:])


def _u32(b, o):
    return struct.unpack_from("<I", b, o)[0] if o + 4 <= len(b) else 0


def _decode_str(bs):
    try:
        return bs.decode("ascii")
    except UnicodeDecodeError:
        try:
            return bs.decode("gb2312")
        except Exception:
            return bs.decode("ascii", "replace")


class XZZError(Exception):
    pass


class XZZBoard:
    def __init__(self):
        self.parts = []
        self.pins = []
        self.outline = []
        self.nets = {}
        self.bbox = (0, 0, 0, 0)
        self.warnings = []


def verify(path):
    b = open(path, "rb").read(32)
    if b[:6] == b"XZZPCB":
        return True
    if len(b) > 0x10 and b[0x10] != 0x00:
        xk = b[0x10]
        return bytes(c ^ xk for c in b[:6]) == b"XZZPCB"
    return False


def parse(path):
    raw = bytearray(open(path, "rb").read())
    N = len(raw)
    bd = XZZBoard()

    mpos = raw.find(MARKER)
    if mpos < 0:
        mpos = N
    if N > 0x10 and raw[0x10] != 0x00:
        xk = raw[0x10]
        for i in range(mpos):
            raw[i] ^= xk
    if raw[:6] != b"XZZPCB":
        raise XZZError("Assinatura XZZPCB nao encontrada")

    main_start = _u32(raw, 0x20) + 0x20
    net_start = _u32(raw, 0x28) + 0x20
    main_size = _u32(raw, main_start)
    net_size = _u32(raw, net_start)

    _parse_nets(raw[net_start + 4: net_start + net_size + 4], bd)

    cur = main_start + 4
    end = min(main_start + 4 + main_size, N)
    while cur < end:
        btype = raw[cur]; cur += 1
        if cur + 4 > N:
            break
        bsize = _u32(raw, cur); cur += 4
        block = raw[cur:cur + bsize]; cur += bsize
        if btype == 0x07:
            _parse_part(block, bd)
        elif btype == 0x05:
            _parse_trace(block, bd)
        elif btype == 0x01:
            _parse_arc(block, bd)
        elif btype == 0x09:
            _parse_testpad(block, bd)

    _finalize(bd)
    return bd


def _parse_nets(nb, bd):
    p = 0
    while p + 8 <= len(nb):
        nsize = _u32(nb, p); p += 4
        nidx = _u32(nb, p); p += 4
        if nsize < 8 or p + nsize - 8 > len(nb):
            break
        nm = bytes(nb[p:p + nsize - 8]); p += nsize - 8
        bd.nets[nidx] = _decode_str(nm)


def _parse_trace(block, bd):
    """0x05 Line segment. So layer 28 (contorno) importa para o outline."""
    if len(block) < 24:
        return
    layer = _u32(block, 0)
    if layer != 28:
        return
    x1, y1 = _u32(block, 4) // SCALE, _u32(block, 8) // SCALE
    x2, y2 = _u32(block, 12) // SCALE, _u32(block, 16) // SCALE
    bd.outline.append((x1, y1, x2, y2))


def _parse_arc(block, bd):
    """0x01 Arc. So layer 28. Aproxima o arco por segmentos."""
    if len(block) < 28:
        return
    layer = _u32(block, 0)
    if layer != 28:
        return
    import math
    cx, cy = _u32(block, 4) / SCALE, _u32(block, 8) / SCALE
    r = _u32(block, 12) / SCALE
    a0 = _u32(block, 16) / SCALE
    a1 = _u32(block, 20) / SCALE
    if a0 > a1:
        a0, a1 = a1, a0
    if a1 - a0 > 180:
        a0 += 360
    n = 10
    step = (a1 - a0) / (n - 1)
    px = cx + r * math.cos(math.radians(a0))
    py = cy + r * math.sin(math.radians(a0))
    for i in range(1, n):
        ang = math.radians(a0 + i * step)
        nx = cx + r * math.cos(ang)
        ny = cy + r * math.sin(ang)
        bd.outline.append((int(px), int(py), int(nx), int(ny)))
        px, py = nx, ny


def _parse_part(enc, bd):
    """0x07 Component - DES-cifrado. Extrai footprint, designator e pinos."""
    buf = _des_decrypt(enc)
    p = 0
    part_size = _u32(buf, p); p += 4
    p += 18
    grp_size = _u32(buf, p); p += 4
    p += grp_size
    if p >= len(buf) or buf[p] != 0x06:
        return
    p += 31
    name_size = _u32(buf, p); p += 4
    if p + name_size > len(buf):
        return
    ref = _decode_str(bytes(buf[p:p + name_size])); p += name_size

    part = {"ref": ref, "fp": "", "pins": []}
    part_idx = len(bd.parts)
    while p < part_size + 4 and p < len(buf):
        sub = buf[p]; p += 1
        if sub in (0x01, 0x05):
            p += _u32(buf, p) + 4
        elif sub == 0x06:
            # 2o rotulo = value/footprint; guardamos o footprint se vazio
            sz = _u32(buf, p)
            p += 4 + sz
        elif sub == 0x09:
            pin, p = _parse_pin(buf, p, bd, part_idx)
            if pin is not None:
                part["pins"].append(len(bd.pins) - 1)
        elif sub == 0x00:
            continue
        else:
            break
    bd.parts.append(part)


def _parse_pin(buf, p, bd, part_idx):
    """Sub-bloco 0x09 dentro do componente."""
    pin_size = _u32(buf, p)
    pin_end = p + pin_size + 4
    p += 4
    p += 4  # unknown
    x = _u32(buf, p); p += 4
    y = _u32(buf, p); p += 4
    p += 8  # unknown
    nsize = _u32(buf, p); p += 4
    if p + nsize > len(buf):
        return None, pin_end
    name = _decode_str(bytes(buf[p:p + nsize])); p += nsize

    # forma do pad: 1o outline apos o nome, se houver
    shape = None
    q = p
    if q + 9 <= pin_end - 4:
        w = _u32(buf, q); h = _u32(buf, q + 4)
        typ = buf[q + 8] if q + 8 < len(buf) else 0
        shape = {"w": w // SCALE, "h": h // SCALE, "t": typ}

    net_index = _u32(buf, pin_end - 4 - 8) if pin_end >= 12 else 0
    net = bd.nets.get(net_index, "")
    if net == "NC":
        net = ""
    bd.pins.append({"x": x // SCALE, "y": y // SCALE, "name": name,
                    "net": net or None, "shape": shape, "part": part_idx})
    return True, pin_end


def _parse_testpad(block, bd):
    """0x09 top-level TestPad/Drill."""
    if len(block) < 20:
        return
    x = _u32(block, 4) // SCALE
    y = _u32(block, 8) // SCALE
    p = 16
    nlen = _u32(block, p); p += 4
    if p + nlen > len(block):
        return
    name = _decode_str(bytes(block[p:p + nlen]))
    net_index = _u32(block, len(block) - 4)
    net = bd.nets.get(net_index, "")
    if net in ("NC", "UNCONNECTED"):
        net = ""
    idx = len(bd.parts)
    bd.parts.append({"ref": "..." + name, "fp": "TP", "pins": []})
    bd.pins.append({"x": x, "y": y, "name": name, "net": net or None,
                    "shape": None, "part": idx})
    bd.parts[idx]["pins"].append(len(bd.pins) - 1)


def _finalize(bd):
    """1) Translacao (subtrai min x/y do contorno layer 28, como o OBV).
    2) Board folding (como o XZZPCB-Layer-Viewer): a placa vem PLANA com TOP
       e BOTTOM lado a lado; detecta o eixo central pelo contorno e dobra —
       elementos a DIREITA do centro sao BOTTOM e sao espelhados (x'=2*cx-x)
       para o espaco do TOP. Assim as duas faces ficam sobrepostas, cada uma
       com sua face marcada."""
    # 1) translacao
    if bd.outline:
        minx = min(min(s[0], s[2]) for s in bd.outline)
        miny = min(min(s[1], s[3]) for s in bd.outline)
    elif bd.pins:
        minx = min(p["x"] for p in bd.pins)
        miny = min(p["y"] for p in bd.pins)
    else:
        minx = miny = 0
    for s in range(len(bd.outline)):
        x1, y1, x2, y2 = bd.outline[s]
        bd.outline[s] = (x1 - minx, y1 - miny, x2 - minx, y2 - miny)
    for pin in bd.pins:
        pin["x"] -= minx
        pin["y"] -= miny

    # 2) eixo central (min+max x do contorno). A placa XZZ vem PLANA com TOP
    #    a ESQUERDA e BOTTOM a DIREITA. Marcamos a face de cada elemento pelo
    #    lado do eixo, mas NAO dobramos nem espelhamos — mantemos o layout
    #    plano para casar com a foto real (que tambem e plana, lado a lado).
    if bd.outline:
        oxs = [c for s in bd.outline for c in (s[0], s[2])]
        cx_axis = (min(oxs) + max(oxs)) / 2.0
    elif bd.pins:
        pxs = [p["x"] for p in bd.pins]
        cx_axis = (min(pxs) + max(pxs)) / 2.0
    else:
        cx_axis = 0
    bd.center_x = cx_axis   # o viewer usa para saber onde uma face acaba

    # face de cada pino pelo lado do eixo (sem espelhar/dobrar)
    bd.has_sides = True
    for pin in bd.pins:
        pin["side"] = "BOT" if pin["x"] > cx_axis else "TOP"

    # face do part = face da maioria dos seus pinos; centro = centroide
    for pt in bd.parts:
        if pt["pins"]:
            sides = [bd.pins[j]["side"] for j in pt["pins"]]
            pt["side"] = "BOT" if sides.count("BOT") > len(sides) / 2 else "TOP"
            cx = sum(bd.pins[j]["x"] for j in pt["pins"]) / len(pt["pins"])
            cy = sum(bd.pins[j]["y"] for j in pt["pins"]) / len(pt["pins"])
            pt["x"], pt["y"] = cx, cy
        else:
            pt["side"] = "TOP"
            pt["x"] = pt["y"] = 0

    # bbox depois do folding (metade da largura original)
    xs, ys = [], []
    for s in bd.outline:
        xs += [s[0], s[2]]; ys += [s[1], s[3]]
    if not xs:
        for pin in bd.pins:
            xs.append(pin["x"]); ys.append(pin["y"])
    if xs:
        bd.bbox = (min(xs), min(ys), max(xs), max(ys))


def to_dict(bd):
    """Serializa para o JS. Coordenadas ja em mils, contorno como segmentos.
    FACE: o XZZ nao separa top/bottom no componente — a placa vem plana e o
    viewer faz o board-folding. Aqui marcamos tudo como face unica ('UNI') e
    o viewer decide como dobrar; has_sides=False sinaliza que nao ha divisao
    confiavel de faces no dado."""
    return {
        "bbox": list(bd.bbox),
        "has_sides": getattr(bd, "has_sides", True),
        "center_x": getattr(bd, "center_x", 0),
        "layout": "flat",
        "board_outline": [[a, b, c, d] for (a, b, c, d) in bd.outline],
        "parts": [{"ref": p["ref"], "fp": p.get("fp", ""), "s": p.get("side", "TOP"),
                   "x": p["x"], "y": p["y"], "o": [], "oa": True,
                   "pins": p["pins"]} for p in bd.parts],
        "pins": [{"x": p["x"], "y": p["y"], "r": _pin_r(p), "s": p.get("side", "TOP"),
                  "n": p["net"], "p": p["name"], "c": p["part"],
                  "sh": _pin_shape(p), "th": False} for p in bd.pins],
        "segments": [],
        "warnings": bd.warnings,
        "stats": {"parts": len(bd.parts), "pins": len(bd.pins),
                  "segments": len(bd.outline), "nets": len(bd.nets)},
    }


def _pin_r(p):
    sh = p.get("shape")
    if sh and (sh["w"] or sh["h"]):
        return max(min(sh["w"], sh["h"]) // 2, 1)
    return 4


def _pin_shape(p):
    """Converte a forma XZZ para poligono relativo ao centro do pino.
    type 0x02 = retangulo; senao circulo (shape=None deixa o viewer usar raio)."""
    sh = p.get("shape")
    if not sh or not (sh["w"] and sh["h"]):
        return None
    w2, h2 = sh["w"] / 2.0, sh["h"] / 2.0
    if sh["t"] == 0x02:   # retangulo/quadrado
        return [[-w2, -h2], [-w2, h2], [w2, h2], [w2, -h2]]
    return None  # circulo -> raio


if __name__ == "__main__":
    import sys, collections
    bd = parse(sys.argv[1])
    d = to_dict(bd)
    print("stats:", d["stats"])
    print("bbox:", d["bbox"])
    named = [p for p in d["pins"] if p["n"]]
    print(f"pinos com net: {len(named)}/{len(d['pins'])}")
    print("contorno (layer 28):", len(d["board_outline"]), "segmentos")
    formas = collections.Counter(
        "ret" if p["sh"] else "circ" for p in d["pins"])
    print("formas de pad:", dict(formas))
    big = max(d["parts"], key=lambda p: len(p["pins"]))
    print(f"maior: {big['ref']} {len(big['pins'])} pinos em ({big['x']:.0f},{big['y']:.0f})")
    print("parts:", [p["ref"] for p in d["parts"][:10]])
