# -*- coding: utf-8 -*-
"""
xzz_crypto.py - Criptografia do formato XZZPCB (XOR + DES-ECB)
Bancada PRO / MaxTech

Portado do XZZPCB-Layer-Viewer (sjohnson1021) e da implementacao DES de
Daniel Huertas (FIPS 46-3). Clean-room: reimplementacao propria, algoritmo
padrao publico (DES) + estrutura de formato (nao protegida por copyright).

- XOR: chave em fileData[0x10]; aplica em todo o arquivo ate o marcador v6.
- DES: blocos de componente (tipo 0x07) sao DES-encriptados. Chave derivada
  de {0xE0,0xCF,0x2E,0x9F,0x3C,0x33,0x3C,0x33} XOR 0x3C33 -> DCFC12AC00000000.
"""

# ── Tabelas DES (FIPS 46-3) ──────────────────────────────────────
_IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,
       64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,
       61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7]
_PI = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,
       37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,
       34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25]
_E = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,
      20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1]
_P = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,
      30,6,22,11,4,25]
_S = [[14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
      [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
      [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
      [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
      [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
      [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
      [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
      [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]]
_PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,
        60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,
        29,21,13,5,28,20,12,4]
_PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,
        31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32]
_SHIFT = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1]
_M64 = (1 << 64) - 1


def _des_block(inp, subkeys):
    """Aplica DES em um bloco de 64 bits com as subkeys ja calculadas."""
    ipr = 0
    for i in range(64):
        ipr = (ipr << 1) | ((inp >> (64 - _IP[i])) & 1)
    L = (ipr >> 32) & 0xffffffff
    R = ipr & 0xffffffff
    for i in range(16):
        s_in = 0
        for j in range(48):
            s_in = (s_in << 1) | ((R >> (32 - _E[j])) & 1)
        s_in ^= subkeys[i]
        s_out = 0
        for j in range(8):
            row = ((s_in & (0x0000840000000000 >> (6 * j))) >> (42 - 6 * j))
            row = ((row >> 4) | (row & 0x01)) & 0xff
            col = ((s_in & (0x0000780000000000 >> (6 * j))) >> (43 - 6 * j))
            s_out = (s_out << 4) | (_S[j][16 * row + col] & 0x0f)
        f = 0
        for j in range(32):
            f = (f << 1) | ((s_out >> (32 - _P[j])) & 1)
        L, R = R, (L ^ f)
    pre = ((R << 32) | L) & _M64
    out = 0
    for i in range(64):
        out = (out << 1) | ((pre >> (64 - _PI[i])) & 1)
    return out


def _subkeys(key, mode):
    """Calcula as 16 subkeys. mode 'd' inverte a ordem (decrypt)."""
    pc1 = 0
    for i in range(56):
        pc1 = (pc1 << 1) | ((key >> (64 - _PC1[i])) & 1)
    C = (pc1 >> 28) & 0x0fffffff
    D = pc1 & 0x0fffffff
    sk = []
    for i in range(16):
        for _ in range(_SHIFT[i]):
            C = (0x0fffffff & (C << 1)) | (0x01 & (C >> 27))
            D = (0x0fffffff & (D << 1)) | (0x01 & (D >> 27))
        pc2 = ((C << 28) | D)
        k = 0
        for j in range(48):
            k = (k << 1) | ((pc2 >> (56 - _PC2[j])) & 1)
        sk.append(k)
    return sk[::-1] if mode == 'd' else sk


# ── Chave DES do XZZPCB ──────────────────────────────────────────
def _xzz_des_key():
    src = [0xE0, 0xCF, 0x2E, 0x9F, 0x3C, 0x33, 0x3C, 0x33]
    key_hex = ""
    for i in range(0, len(src), 2):
        value = ((src[i] << 8) | src[i + 1]) ^ 0x3C33
        key_hex += format(value, '04X')
    key = 0
    for i in range(8):
        key |= int(key_hex[i * 2:i * 2 + 2], 16) << ((7 - i) * 8)
    return key


_DES_KEY = _xzz_des_key()               # DCFC12AC00000000
_DES_SUBKEYS_D = _subkeys(_DES_KEY, 'd')

# marcador do bloco pos-v6 (leituras de diodo) — nao XORar apos ele
V6_MARKER = bytes([0x76, 0x36, 0x76, 0x36, 0x35, 0x35, 0x35, 0x76, 0x36, 0x76, 0x36])


def deobfuscate_file(data: bytes) -> bytes:
    """Desfaz o XOR global do arquivo (se houver). A chave esta em data[0x10];
    XOR aplicado do inicio ate o marcador v6 (ou fim do arquivo)."""
    if len(data) < 0x11:
        return data
    xor_key = data[0x10]
    if xor_key == 0x00:
        return data  # nao XORado
    idx = data.find(V6_MARKER)
    end = idx if idx >= 0 else len(data)
    out = bytearray(data)
    for i in range(end):
        out[i] ^= xor_key
    return bytes(out)


def decrypt_component_block(block: bytes) -> bytes:
    """DES-decrypt de um bloco de componente (tipo 0x07). Cada 8 bytes
    (big-endian) passa por DES com a chave do XZZ."""
    out = bytearray()
    n = len(block) - (len(block) % 8)
    for off in range(0, n, 8):
        enc = int.from_bytes(block[off:off + 8], 'big')
        dec = _des_block(enc, _DES_SUBKEYS_D)
        out += dec.to_bytes(8, 'big')
    return bytes(out)


if __name__ == "__main__":
    # validar chave e vetor de teste do Rivest
    print("chave DES XZZ: %016X" % _DES_KEY)
    r = 0x9474B8E8C73BCA7D
    r = _des_block(r, _subkeys(r, 'e'))
    ok = (r == 0x8DA744E0C94E5E17)
    print("teste Rivest:", "OK" if ok else "FALHOU")
