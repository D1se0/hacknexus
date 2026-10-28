/* ============================================================
   Exportaciones de «VLSM en Formato X» — salen TODAS del mismo
   modelo ensamblado (assembleGrid) para que render, copiado,
   PNG y .xlsx sean idénticos entre sí.
   Sin dependencias: el .xlsx es un ZIP con método STORE escrito
   a mano (CRC32 + cabeceras ZIP + Office Open XML mínimo).
   ============================================================ */
import type { AssembledGrid, XEntry } from './vlsmx'
import { blockToText } from './vlsmx'

/* ─────────────────────────── TSV (pegable en Excel/Sheets) ─────────────────────────── */

export function gridToTsv(g: AssembledGrid): string {
  const sep = '\t'
  const lines: string[] = []
  lines.push([''].join('') + sep + g.bitNums.map((c) => c.n).join(sep))
  lines.push(['', ...g.weights.map((c) => c.weight)].join(sep))
  for (const r of g.rows) {
    const bits = r.cells.map((c) => (c ? (c.kind === 'bit' || c.kind === 'bitnum' || c.kind === 'weight' ? c.text : '') : '')).join(sep)
    lines.push(`${r.label}${sep}${bits}${sep}${r.ip}`)
  }
  return lines.join('\n')
}

/* ─────────────────────────── Markdown ─────────────────────────── */

export function gridToMarkdown(g: AssembledGrid): string {
  const head = `| \`\` | ${g.bitNums.map((c) => `**${c.n}**`).join(' | ')} | \`IP\` |`
  const weights = `| \`peso\` | ${g.weights.map((c) => c.weight).join(' | ')} | |`
  const rows = g.rows.map((r) => {
    const bits = r.cells.map((c) => (c ? (c.kind === 'bit' ? `\`${c.text}\`` : '') : ''))
    const lab = r.role === 'hdr' ? `**${r.label}**` : r.label
    return `| ${lab} | ${bits.join(' | ')} | ${r.ip ? `\`${r.ip}\`` : ''} |`
  })
  return [head, weights, ...rows].join('\n')
}

/* ─────────────────────────── JSON (compartir ejercicio) ─────────────────────────── */

export function entriesToJson(entries: XEntry[]): string {
  return JSON.stringify({ version: 1, tool: 'hacknexus-vlsmx', entries }, null, 2)
}

export function jsonToInput(json: string): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const obj = JSON.parse(json) as { entries?: { raw?: string }[] }
    if (!obj.entries || !Array.isArray(obj.entries)) return { ok: false, error: 'JSON sin «entries»' }
    const text = obj.entries.map((e) => (typeof e.raw === 'string' ? e.raw : '')).filter(Boolean).join('\n')
    return text ? { ok: true, text } : { ok: false, error: 'entries vacío' }
  } catch (e) {
    return { ok: false, error: `JSON inválido: ${(e as Error).message}` }
  }
}

/* ─────────────────────────── PNG = Canvas 2D ─────────────────────────── */

export interface GridTheme {
  name: 'hacknexus' | 'excel'
  bg: string
  fg: string
  dim: string
  hdr: string // color de la cabecera de bits (rojo en excel)
  weight: string // azul en excel
  zero: string
  one: string
  x: string
  octetBg: (octet: number) => string | null
  ipColBg: (octet: number) => string | null
}

export const THEMES: Record<'hacknexus' | 'excel', GridTheme> = {
  hacknexus: {
    name: 'hacknexus',
    bg: '#0b0f0d',
    fg: '#2ee88a',
    dim: '#6b7a72',
    hdr: '#2ee88a',
    weight: '#7bb0a0',
    zero: '#9fb3aa',
    one: '#2ee88a',
    x: '#ffd166',
    octetBg: () => null,
    ipColBg: () => null,
  },
  excel: {
    name: 'excel',
    bg: '#ffffff',
    fg: '#111111',
    dim: '#111111',
    hdr: '#d40000',
    weight: '#0000d4',
    zero: '#111111',
    one: '#111111',
    x: '#111111',
    octetBg: (o) => (o === 1 ? '#00ccff' : o === 3 ? '#e1c7e1' : null),
    ipColBg: (o) => (o === 1 ? '#00ccff' : o === 3 ? '#e1c7e1' : null),
  },
}

/** un mismo dibujo para pantalla (canvas) y descarga (alta resolución) */
export function drawGrid(g: AssembledGrid, theme: GridTheme, scale = 1): HTMLCanvasElement {
  const s = Math.round(22 * scale) // px por celda
  const labelW = Math.round(150 * scale)
  const ipW = Math.round(140 * scale)
  const rowsCount = g.rows.length + 2
  const canvas = document.createElement('canvas')
  canvas.width = labelW + g.cols * s + ipW
  canvas.height = rowsCount * s + 12
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.font = `bold ${Math.round(11 * scale)}px monospace`

  const drawCell = (x: number, y: number, w: number, h: number, text: string, color: string, bg: string | null, bold = false) => {
    if (bg) {
      ctx.fillStyle = bg
      ctx.fillRect(x, y, w, h)
    }
    ctx.strokeStyle = bg ? 'rgba(0,0,0,.15)' : theme.dim + '55'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
    ctx.fillStyle = color
    ctx.font = `${bold ? 'bold ' : ''}${Math.round(11 * scale)}px monospace`
    ctx.fillText(text, x + w / 2, y + h / 2 + 1)
  }

  // fila 1: números de bit
  g.bitNums.forEach((c, i) => drawCell(labelW + i * s, 0, s, s, c.text, theme.hdr, null, true))
  // fila 2: pesos
  g.weights.forEach((c, i) => {
    ctx.font = `${Math.round(9 * scale)}px monospace`
    drawCell(labelW + i * s, s, s, s, c.text, theme.weight, null, false)
  })
  // filas de bloques
  g.rows.forEach((row, r) => {
    const y = (r + 2) * s
    row.cells.forEach((c, i) => {
      if (!c || c.kind !== 'bit') return
      // fondo por octeto DE COLUMNA (plantilla), no por el octeto de la X del bloque
      const colOctet = c.n != null ? Math.floor((c.n - 1) / 8) : 0
      const octetBg = theme.octetBg(colOctet)
      const color = c.bit === 'X' ? theme.x : c.bit === '1' ? theme.one : theme.zero
      drawCell(labelW + i * s, y, s, s, c.text, color, octetBg, c.bit === 'X')
    })
    // etiqueta izquierda
    ctx.textAlign = 'left'
    drawCell(0, y, labelW, s, row.label, row.role === 'hdr' ? theme.fg : theme.dim, null, row.labelBold)
    // ip derecha
    const octetBg = theme.ipColBg(row.xOctet)
    drawCell(labelW + g.cols * s, y, ipW, s, row.ip, theme.fg, octetBg, row.ipBold)
    ctx.textAlign = 'center'
  })
  return canvas
}

export function gridToPngUrl(g: AssembledGrid, theme: GridTheme, scale = 2): string {
  const canvas = drawGrid(g, theme, scale)
  return canvas.toDataURL('image/png')
}

/* ─────────────────────────── .xlsx: ZIP STORE + OOXML mínimo ─────────────────────────── */

let CRC_TABLE: number[] | null = null
function crc32(buf: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: { name: Uint8Array; crc: number; size: number; offset: number }[] = []
  let offset = 0
  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff])
  const u32 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff])
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const size = f.data.length
    const local = new Uint8Array(30 + name.length)
    local.set(u32(0x04034b50), 0)
    local.set(u16(20), 4) // versión
    local.set(u16(0), 6) // flags
    local.set(u16(0), 8) // STORE
    local.set(u16(0), 10) // hora
    local.set(u16(0x2281), 12) // fecha fija 2026-10-28
    local.set(u32(crc), 14)
    local.set(u32(size), 18)
    local.set(u32(size), 22)
    local.set(u16(name.length), 26)
    local.set(name, 30)
    chunks.push(local, f.data)
    central.push({ name, crc, size, offset })
    offset += local.length + size
  }
  const cdStart = offset
  let cdSize = 0
  for (const c of central) {
    const rec = new Uint8Array(46 + c.name.length)
    rec.set(u32(0x02014b50), 0)
    rec.set(u16(20), 4)
    rec.set(u16(20), 6)
    rec.set(u16(0), 8)
    rec.set(u16(0), 10)
    rec.set(u16(0), 12)
    rec.set(u16(0x2281), 14)
    rec.set(u32(c.crc), 16)
    rec.set(u32(c.size), 20)
    rec.set(u32(c.size), 24)
    rec.set(u16(c.name.length), 28)
    rec.set(u32(c.offset), 42)
    rec.set(c.name, 46)
    chunks.push(rec)
    cdSize += rec.length
  }
  const eocd = new Uint8Array(22)
  eocd.set(u32(0x06054b50), 0)
  eocd.set(u16(files.length), 8)
  eocd.set(u16(files.length), 10)
  eocd.set(u32(cdSize), 12)
  eocd.set(u32(cdStart), 16)
  chunks.push(eocd)
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) {
    out.set(c, pos)
    pos += c.length
  }
  return out
}

const xmlEsc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** estilos: 0 default · 1 bit rojo bold · 2 peso azul · 3 etiqueta bold · 4 cian · 5 lila · 6 tabla grid */
function cellXml(r: number, c: number, value: { num: number } | { str: string }, style = 0): string {
  const col = colRef(c + 1)
  if ('num' in value) return `<c r="${col}${r}" s="${style}" t="n"><v>${value.num}</v></c>`
  return `<c r="${col}${r}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value.str)}</t></is></c>`
}

function colRef(n: number): string {
  let s = ''
  let x = n
  while (x > 0) {
    const r = (x - 1) % 26
    s = String.fromCharCode(65 + r) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

/** genera el .xlsx (hoja «Hoja1», filas congeladas, IPs como TEXTO, colores de la plantilla) */
export function gridToXlsxBytes(g: AssembledGrid): Uint8Array {
  const firstBit = g.cols === 32 ? 1 : 9
  // fila 1: números de bit (rojo bold, numéricos como la plantilla)
  const row1 = `<row r="1">${g.bitNums.map((c, i) => `<c r="${colRef(i + 2)}1" s="1" t="n"><v>${firstBit + i}</v></c>`).join('')}</row>`
  // fila 2: pesos (azul)
  const row2 = `<row r="2">${g.weights.map((c, i) => `<c r="${colRef(i + 2)}2" s="2" t="n"><v>${c.weight}</v></c>`).join('')}</row>`
  const body: string[] = []
  let r = 3
  for (const row of g.rows) {
    let cells = ''
    cells += cellXml(r, 0, { str: row.label }, row.role === 'hdr' ? 3 : 0)
    row.cells.forEach((c, i) => {
      if (!c || c.kind !== 'bit') return
      // el fondo va por OCTETO DE COLUMNA (plantilla: octeto 2 cian · 3 blanco · 4 lila)
      const colOctet = c.n != null ? Math.floor((c.n - 1) / 8) : 0
      const octetFill = colOctet === 1 ? 4 : colOctet === 3 ? 5 : 0
      const style = octetFill || (c.bit === 'X' ? 3 : 1)
      cells += c.bit === 'X' ? cellXml(r, i + 1, { str: 'X' }, style) : cellXml(r, i + 1, { num: Number(c.bit) }, style)
    })
    if (row.ip) cells += cellXml(r, g.cols + 1, { str: row.ip }, row.ipBold ? 3 : octetFillOf(g, row))
    body.push(`<row r="${r}">${cells}</row>`)
    r++
  }
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><outlinePr/></sheetPr>
<dimension ref="A1:${colRef(g.cols + 2)}${r - 1}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${g.bitNums.map((_, i) => `<col min="${i + 2}" max="${i + 2}" width="3.2" customWidth="1"/>`).join('')}<col min="1" max="1" width="17.9" customWidth="1"/><col min="${g.cols + 2}" max="${g.cols + 2}" width="15.2" customWidth="1"/></cols>
<sheetData>${row1}${row2}${body.join('')}</sheetData>
</worksheet>`
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="0"/>
<fonts count="4"><font><sz val="10"/><name val="Calibri"/></font><font><b/><color rgb="FFCC0000"/><sz val="10"/><name val="Calibri"/></font><font><b/><color rgb="FF0000CC"/><sz val="9"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00CCFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE1C7E1"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border diagonalUp="false" diagonalDown="false"><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/></cellXfs>
</styleSheet>`
  const enc = new TextEncoder()
  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`) },
    { name: '_rels/.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: 'xl/workbook.xml', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: 'xl/styles.xml', data: enc.encode(styles) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ])
}

function octetFillOf(g: AssembledGrid, row: { xOctet: number }): number {
  return row.xOctet === 1 ? 4 : row.xOctet === 3 ? 5 : 6
}

/* ─────────────────────────── descargas ─────────────────────────── */

export function downloadBytes(name: string, bytes: Uint8Array, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(name: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export { blockToText }
