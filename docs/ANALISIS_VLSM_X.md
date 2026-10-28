# Análisis Fase 0 — VLSM en Formato X

## Archivos clave
- `src/tools/Vlsm.tsx` — la Calculadora VLSM: red base + lista de {nombre, hosts}, mapa visual, tabla, export CSV. La nueva sección se añade al final de este componente.
- `src/lib/subnet.ts` — utilidades puras REUTILIZADAS (no duplicadas): `ipToInt`, `intToIp`, `maskFromCidr`, `toBinaryIp`, `subnetInfo`, `vlsm` y tipos `VlsmBlock`/`SubnetInfo`; interna `cidrFromMaskInt` valida contigüidad de máscara.
- `src/lib/registry.tsx` — registro único (`id: 'vlsm'`): NO se añade tool nueva, solo se amplía su `desc`.
- `src/lib/docs.ts::vlsm` — ficha `#/docs` a ampliar (formato X, modos A/B, casos borde).
- `src/pages/Advisor.tsx` usa `src/lib/taskguide.ts` (keywords); el buscador global indexa `TOOLS` del registry + docs.
- `Formato_en_X.xlsx` en la raíz: plantilla de referencia verificada con openpyxl (7 bloques, hoja `Hoja1`, freeze A3).

## Verificación de la plantilla (line base del motor)
- Fila 1: números de bit 9–30 como NUMBERS (columnas A–W; la 24=X faltará, la web llega hasta 32).
- Fila 2: pesos 128…1 repetidos (font azul 8pt bold).
- Bits = números 1.0/0.0; la X es texto `'X'`; celdas vacías = `None` o `' '`.
- Bloque 5 filas: bits de red + X (1ª) / `0000` DIR RED / `0001` 1º HOST / `1110` ÚLTIMO HOST / `1111` DIR BROADCAST.
- X en bit prefijo+1 (col 20=/27→28, col 8=/16→17, col 5=/20→21, col 6=/21→22, col 7=/30→31(múltiplo de 8→col 7 = bit 31), col 2=/9→10, col 3=/19→20). Coincide con la spec 2.3.
- Estilos: cabecera roja bold; pesos azules; octeto 2 cian `FF00CCFF`; octeto 4 lila `FFE1C7E1`; margen weeks transparentes.
- Defectos confirmados (2.4): Z numérica en bloques 2 y 6 (último host/broadcast), numeración hasta 30, celdas `' '`.

## Plan de integración
1. `src/lib/vlsmx.ts`: motor puro (`parseEntry`, `computeBlock`, `layoutGrid`) sobre aritmética `>>> 0`, reusando `subnet.ts`.
2. `scripts/gen-fixtures.py` (openpyxl para leer el Excel; `ipaddress` para el oráculo) + `scripts/test-vlsmx.mjs` (< 3000 casos, todos los prefijos y los 7 vectores).
3. `VlsmXSection.tsx` (nuevo componente incluido al final de Vlsm.tsx): Modo A lista, Modo B pestañas con el resultado existente, rejilla memoizada, tooltips, modo estudio, exportaciones (TSV/MD/JSON/PNG canvas/.xlsx zip STORE sin deps).

## Riesgos
- Ningún runner de tests en repo → batería con `node` + fixtures JSON (exige Node ≥ 18 en CI, ya es el que usa el build).
- El `.xlsx` exportado se genera con un ZIP STORE propio (sin deflate): los tests lo verifican releyéndolo con openpyxl.
- Chunk de Vlsm crece algo (rejilla + export). Se vigila con el tamaño del build.
- Prompt prevalece sobre detalles no cubiertos por la plantilla (etiquetas, punto final en Z, numeración hasta 32).
