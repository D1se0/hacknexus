#!/usr/bin/env python3
"""Oráculo independiente para «VLSM en Formato X» (ver scripts/gen-fixtures.py).

Genera (y verifico aquí mismo los invariantes) dos ficheros JSON:
- docs/fixtures/vlsmx-oracle.json      → ≥3000 casos con Python `ipaddress` (oráculo
                                          INDEPENDIENTE del motor TS; no comparte código)
- docs/fixtures/formato_x_golden.json  → los 7 bloques leídos DIRECTAMENTE del Excel de
                                          referencia (Formato_en_X.xlsx, hoja «Hoja1»),
                                          celda a celda, para los tests golden.

Uso:  python3 scripts/gen-fixtures-vlsmx.py
"""
import json, os, random, sys

try:
    import openpyxl
except ImportError:
    sys.exit("falta openpyxl: pip3 install openpyxl")
from ipaddress import IPv4Network

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(ROOT, "docs", "fixtures")
os.makedirs(FIX, exist_ok=True)

GOLDEN_INPUTS = [
    ("192.168.68.230", 27),
    ("192.168.77.9", 16),
    ("172.16.230.5", 20),
    ("10.0.233.4", 21),
    ("172.30.12.218", 30),
    ("10.130.1.1", 9),
    ("10.17.170.3", 19),
]

# ----------------------------------------------------------- oráculo puro ---
def oracle_block(ip, prefix):
    """Caso oráculo a partir de ipaddress (implementación ≠ motor TS)."""
    net = IPv4Network(f"{ip}/{prefix}", strict=False)
    net_i = int(net.network_address)
    mask = int(net.netmask)
    wc = int(net.hostmask)
    bc_i = int(net.broadcast_address)
    n = 32 - prefix
    if prefix <= 30:
        fh, lh = net_i + 1, bc_i - 1
    elif prefix == 31:
        fh, lh = net_i, bc_i
    else:
        fh = lh = net_i
    # bits de host (prefijo+1..32) de la RED, como cadena
    bits = "".join(str((net_i >> (31 - b)) & 1) for b in range(32))
    host_bits = bits[prefix:]
    xcol = ((min(prefix + 1, 32) - 1) % 8) + 1        # col A=1 de su octeto (X del bit 32 → col 8)
    # filas de host en forma CANÓNICA (igual que el motor):
    #   /32 → 1 fila vacía · /31 → 2 filas (red/1ª y 2ª) · resto → 4 filas
    if prefix >= 32:
        host_rows = [""]
    elif prefix == 31:
        host_rows = ["0", "1"]
    else:
        host_rows = [
            host_bits,
            "0" * (n - 1) + "1",
            "1" * (n - 1) + "0",
            "1" * n,
        ]
    return {
        "ip": ip,
        "prefix": prefix,
        "netInt": net_i,
        "broadcastInt": bc_i,
        "firstHostInt": fh,
        "lastHostInt": lh,
        "hostRows": host_rows,
        "xBit": prefix + 1 if prefix < 32 else 32,
        "xCol": xcol,
    }

# ----------------------------------------------------- plantilla (golden) ---
def _cell(v):
    """Normaliza celdas Excel: floats 1.0→'1', 'X'→'X', texto→strip."""
    if v is None:
        return None
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    if isinstance(v, int):
        return str(v)
    s = str(v).strip()
    if s == "X":
        return "X"
    if s.isdigit():
        return str(int(s))
    return s if s else None

def extract_golden():
    ws = openpyxl.load_workbook(os.path.join(ROOT, "docs", "fixtures", "Formato_en_X.xlsx"))["Hoja1"]
    blocks = []
    for k, (ip, prefix) in enumerate(GOLDEN_INPUTS):
        r0 = 3 + 5 * k
        rows = {}
        for rr in range(5):
            row_cells = {}
            for c in range(1, 27):
                # col A→1 ... X→24 ; Y=25 etiqueta ; Z=26 texto/ip
                v = _cell(ws.cell(row=r0 + rr, column=c).value)
                if v is not None:
                    row_cells[c] = v
            rows[rr] = row_cells
        blocks.append({"ip": ip, "prefix": prefix, "rows": rows})
    return blocks

# ------------------------------------------------------------ generación ---
def main():
    rng = random.Random(1337)
    cases = {}
    for prefix in range(33):
        net = IPv4Network(f"0.0.0.0/{prefix}")
        ni, size = int(net.network_address), 1 << (32 - prefix)
        picks = [ni, ni + size - 1, ni + max(0, size >> 1)]
        picks += [ni + rng.randrange(size) for _ in range(min(8, max(1, size)))]
        for ip_i in picks:
            ip = f"{(ip_i >> 24) & 255}.{(ip_i >> 16) & 255}.{(ip_i >> 8) & 255}.{ip_i & 255}"
            cases[f"{ip}/{prefix}"] = oracle_block(ip, prefix)
    # extremos y aleatorios hasta ≥3000
    for raw in ("0.0.0.0", "255.255.255.255", "127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.9"):
        for prefix in range(33):
            cases[f"{raw}/{prefix}"] = oracle_block(raw, prefix)
    i = 0
    while len(cases) < 3000:
        rnd = rng.getrandbits(32)
        prefix = rng.randint(0, 32)
        ip = f"{(rnd >> 24) & 255}.{(rnd >> 16) & 255}.{(rnd >> 8) & 255}.{rnd & 255}"
        cases[f"{ip}/{prefix}"] = oracle_block(ip, prefix)
        i += 1
        if i > 30000:
            break
    for ip, prefix in GOLDEN_INPUTS:
        cases[f"{ip}/{prefix}"] = oracle_block(ip, prefix)
    with open(os.path.join(FIX, "vlsmx-oracle.json"), "w", encoding="utf-8") as f:
        json.dump({"source": "python ipaddress (oráculo)", "count": len(cases), "cases": cases}, f, indent=1)
    with open(os.path.join(FIX, "formato_x_golden.json"), "w", encoding="utf-8") as f:
        json.dump({"source": "Formato_en_X.xlsx / Hoja1", "inputs": [f"{ip}/{p}" for ip, p in GOLDEN_INPUTS], "blocks": extract_golden()}, f, indent=1)
    print(f"OK: {len(cases)} casos oráculo + {len(GOLDEN_INPUTS)} golden → docs/fixtures/")

if __name__ == "__main__":
    main()
