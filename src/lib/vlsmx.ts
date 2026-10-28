import { ipToInt, intToIp, maskFromCidr, isPrivateIp, classOf } from './subnet'

/* ============================================================
   VLSM en Formato X — motor puro (sin UI, sin efectos laterales)
   Genera la rejilla de bits idéntica en estructura a la plantilla
   Format en X.xlsx, lista para render, TSV, PNG y .xlsx.
   ============================================================ */

/* ---------------- tipos ---------------- */

export type ParseResult = { ok: true; ip: string; prefix: number; warning?: string } | { ok: false; error: string }

export interface XBlock {
  /** entrada original depurada */
  raw: string
  index: number
  ipInt: number
  prefix: number
  /* direcciones clave: ints sin signo de 32 bits y cadenas */
  netInt: number
  bcInt: number
  firstInt: number
  lastInt: number
  net: string
  broadcast: string
  first: string
  last: string
  mask: string
  wildcard: string
  /** bit donde va la X (prefijo+1); en /32 es 32 */
  xBit: number
  /** octeto 0..3 en el que cae la X */
  xOctet: number
  /** columna dentro del octeto de la X (1..8) */
  xCol: number
  /** octetos completos previos con punto final, p. ej. "192.168.68." ("" si /0) */
  baseText: string
  /** bits de red del octeto con la X, del 1º bit del octeto al prefijo ("" si prefijo = múltiplo de 8) */
  redBits: string
  /** bit global (1..32) donde empiezan los bits de red dibujados */
  redStartBit: number
  /** bits de host por fila: red / 1º / último / broadcast (>=/30) */
  hostRows: string[]
  /** etiquetas de cada fila de hosting */
  hostLabels: string[]
  hostBitsCount: number
  total: number
  usable: number
  cidr31: boolean
  cidr32: boolean
  klass: string
  /** alcance: privada/pública/loopback/link-local */
  scope: string
  /** etiqueta opcional (Modo B usa el nombre de la subred VLSM) */
  label?: string
}

export interface XEntry {
  raw: string
  result?: XBlock
  error?: string
  warning?: string
}

export type GridMode = '24' | '32'

export interface GridCell {
  text: string
  kind: 'bitnum' | 'weight' | 'bit' | 'label' | 'ip' | 'info'
  /** 0/1/X para celdas de bits */
  bit?: '0' | '1' | 'X'
  /** nº de bit global 1..32 o nº de columna */
  n?: number
  weight?: number
  octet?: number
}

export interface GridRow {
  cells: (GridCell | null)[]
}

/* ---------------- parseo ---------------- */

const IPV4_RE = /^(\d{1,3})(?:\.(\d{1,3}))?$/

function parseIpPart(s: string): { ok: true; int: number; ip: string } | { ok: false; error: string } {
  const parts = s.split('.')
  if (parts.length !== 4) return { ok: false, error: `IP con ${parts.length} octetos (se esperan 4)` }
  let ip = ''
  for (const p of parts) {
    if (/^0\d/.test(p)) return { ok: false, error: `0s a la izquierda ambiguos («${p}») — usa ${parseInt(p, 10)}` }
    if (!/^\d{1,3}$/.test(p)) return { ok: false, error: `octeto inválido «${p}»` }
    const n = parseInt(p, 10)
    if (n > 255) return { ok: false, error: `octeto fuera de rango (${n} > 255)` }
  }
  const u = s.split('.').map(Number)
  return { ok: true, int: ((u[0] << 24) | (u[1] << 16) | (u[2] << 8) | u[3]) >>> 0, ip: u.join('.') }
}

/** prefijo desde máscara decimal (255...0 contigua) o wildcard (0...255 contigua) */
function prefixFromDotted(s: string): number | null {
  const parts = s.split('.')
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && parseInt(p, 10) <= 255)) return null
  let m = 0
  for (const p of parts) m = (m << 8) | parseInt(p, 10)
  m >>>= 0
  // máscara: unos contiguos arriba
  let c = 0
  let t = m
  while (t & 0x80000000) {
    c++
    t = (t << 1) >>> 0
  }
  if ((t >>> 0) === 0) return c
  // wildcard: unos contiguos abajo
  c = 0
  t = m
  while (t & 1) {
    c++
    t >>>= 1
  }
  if (t === 0 && c > 0) return 32 - c
  return null
}

/**
 * parseEntry — acepta (por línea):
 *   ip/prefijo · ip / prefijo (espacios sueltos) · ip 255.255.255.224 · ip 0.0.0.31 · ip 27 (aviso)
 * Rechaza IPv6, ceros a la izquierda, octetos > 255, /33, máscara no contigua…
 */
export function parseEntry(input: string): ParseResult {
  // normaliza separadores: «ip /27», «ip/ 27» → «ip/27»
  const text = input.trim().replace(/\s*\/\s*/g, '/')
  if (!text) return { ok: false, error: 'entrada vacía' }
  if (text.includes(':')) return { ok: false, error: 'IPv6 no soportado (solo IPv4)' }
  const tokens = text.split(/\s+/)
  if (tokens.length === 1) {
    const t = tokens[0]
    const m = t.match(/^([0-9.]+)\/(\S+)$/)
    if (m) {
      const ip = parseIpPart(m[1])
      if (!ip.ok) return ip
      if (!/^\d+$/.test(m[2]) && !m[2].includes('.')) return { ok: false, error: `prefijo inválido «/${m[2]}»` }
      const prefix = m[2].includes('.') ? prefixFromDotted(m[2]) : parseInt(m[2], 10)
      if (prefix === null) return { ok: false, error: `máscara no contigua o inválida «${m[2]}»` }
      if (prefix < 0 || prefix > 32) return { ok: false, error: `prefijo ${prefix} fuera de rango (0–32)` }
      return { ok: true, ip: ip.ip, prefix }
    }
    // solo ip sin prefijo
    const ip = parseIpPart(t)
    if (!ip.ok) return ip
    return { ok: false, error: 'falta el prefijo — añade /24, máscara 255.255.255.0, wildcard 0.0.0.255 o «27»' }
  }
  if (tokens.length > 2) return { ok: false, error: `demasiados campos (${tokens.length}) — usa «ip prefijo»` }
  const ip = parseIpPart(tokens[0])
  if (!ip.ok) return ip
  const second = tokens[1]
  if (/^\d+$/.test(second)) {
    const prefix = parseInt(second, 10)
    if (prefix < 0 || prefix > 32) return { ok: false, error: `prefijo ${prefix} fuera de rango (0–32)` }
    return { ok: true, ip: ip.ip, prefix, warning: 'prefijo sin barra (formato corto)' }
  }
  const prefix = prefixFromDotted(second)
  if (prefix === null) return { ok: false, error: `máscara no contigua o inválida «${second}» (ej. 255.255.255.248 o 0.0.0.7)` }
  const isWildcard = second.startsWith('0') || second.endsWith('255.255')
  return { ok: true, ip: ip.ip, prefix, warning: isWildcard ? 'wildcard detectada' : undefined }
}

/* ---------------- cálculo de bloque ---------------- */

const SCOPE_NAME = (ipInt: number): string => {
  const a = ipInt >>> 24
  if (a === 127) return 'loopback'
  if (a === 169 && ((ipInt >>> 16) & 255) === 254) return 'link-local'
  if (isPrivateIp(ipInt)) return 'privada'
  return 'pública'
}

export function computeBlock(ip: string, prefix: number, index: number, raw: string, label?: string): XBlock {
  const ipInt = ipToInt(ip)
  const maskInt = maskFromCidr(prefix)
  const netInt = (ipInt & maskInt) >>> 0
  const wildcardInt = (~maskInt) >>> 0
  const bcInt = (netInt | wildcardInt) >>> 0
  const size = 2 ** (32 - prefix)
  const cidr31 = prefix === 31
  const cidr32 = prefix === 32
  const firstInt = cidr31 || cidr32 ? netInt : (netInt + 1) >>> 0
  const lastInt = cidr32 ? netInt : (netInt + (cidr31 ? 1 : size - 2)) >>> 0
  const n = 32 - prefix
  const netBitsStr = intToIp(netInt).split('.').map((o) => parseInt(o, 10).toString(2).padStart(8, '0')).join('')
  const hostBitsFrom = (tail: 'net' | 'first' | 'last' | 'bcast'): string => {
    if (n === 0) return ''
    const ones = n - 1
    switch (tail) {
      case 'net': return '0'.repeat(n)
      case 'first': return '0'.repeat(ones) + '1'
      case 'last': return '1'.repeat(ones) + '0'
      case 'bcast': return '1'.repeat(n)
    }
  }
  let hostRows: string[]
  let hostLabels: string[]
  if (cidr32) {
    hostRows = ['']
    hostLabels = ['HOST']
  } else if (cidr31) {
    hostRows = ['0', '1']
    hostLabels = ['DIR RED / 1ª', '2ª']
  } else {
    hostRows = [hostBitsFrom('net'), hostBitsFrom('first'), hostBitsFrom('last'), hostBitsFrom('bcast')]
    hostLabels = ['DIR RED', '1º HOST', 'ULTIMO HOST', 'DIR BROADCAST']
  }
  const xBit = cidr32 ? 32 : prefix + 1
  const xOctet = Math.floor((xBit - 1) / 8)
  const xCol = ((xBit - 1) % 8) + 1
  const octetStartBit = xOctet * 8 + 1
  const redBits = prefix % 8 === 0 ? '' : netBitsStr.slice(octetStartBit - 1, prefix)
  const redStartBit = octetStartBit
  const octets = intToIp(netInt).split('.')
  const baseText = xOctet === 0 ? '' : octets.slice(0, xOctet).join('.') + '.'
  return {
    raw,
    index,
    ipInt,
    prefix,
    netInt,
    bcInt,
    firstInt,
    lastInt,
    net: intToIp(netInt),
    broadcast: intToIp(bcInt),
    first: intToIp(firstInt),
    last: intToIp(lastInt),
    mask: intToIp(maskInt),
    wildcard: intToIp(wildcardInt),
    xBit,
    xOctet,
    xCol,
    baseText,
    redBits,
    redStartBit,
    hostRows,
    hostLabels,
    hostBitsCount: n,
    total: size,
    usable: prefix <= 30 ? size - 2 : cidr31 ? 2 : 1,
    cidr31,
    cidr32,
    klass: classOf(ipInt),
    scope: SCOPE_NAME(netInt),
    label,
  }
}

/* ---------------- detección de solapes ---------------- */

export function overlapPairs(blocks: XBlock[]): string[] {
  const out: string[] = []
  for (let i = 0; i < blocks.length; i++)
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i]
      const b = blocks[j]
      if (a.netInt <= b.bcInt && b.netInt <= a.bcInt) out.push(`${a.net}/${a.prefix} ↔ ${b.net}/${b.prefix}`)
    }
  return out
}

/* ---------------- parseo de varias líneas (Modo A) ---------------- */

export function parseInput(text: string): XEntry[] {
  const lines = text.split(/\r?\n/)
  const results: XEntry[] = []
  for (const line of lines) {
    const raw = line.trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('//')) continue
    // separadores coma/punto y coma dentro de una línea
    const chunks = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    for (const chunk of chunks) {
      const r = parseEntry(chunk)
      if (r.ok) results.push({ raw: chunk, warning: r.warning })
      else results.push({ raw: chunk, error: r.error })
    }
  }
  return results.filter((e) => e.raw !== '').map((e) => ({ raw: e.raw, error: e.error, warning: e.warning }))
}

/* ---------------- ordenar ---------------- */

export type BlockOrder = 'input' | 'prefix' | 'network'
export function sortBlocks(blocks: XBlock[], order: BlockOrder): XBlock[] {
  const arr = [...blocks]
  if (order === 'prefix') arr.sort((a, b) => a.prefix - b.prefix || a.netInt - b.netInt)
  if (order === 'network') arr.sort((a, b) => a.netInt - b.netInt || a.prefix - b.prefix)
  return arr
}

/* ---------------- layout de la rejilla ---------------- */

export interface GridLayout {
  mode: GridMode
  /** nº total de columnas de bits (24 o 32) */
  cols: number
  /** fila 1: números 1..cols */
  bitNums: GridCell[]
  /** fila 2: pesos 128…1 por octeto */
  weights: GridCell[]
  /** reparto en octetos */
  octetGroups: number[][]
  /** fillas por bloque (5 normales, 3 en /31, 2 en /32) */
  blocks: { block: XBlock; rows: number; kind: 'std' | '31' | '32' }[]
  warns: string[]
}

export const MAX_BLOCKS = 200

export function layoutGrid(blocks: XBlock[], mode: GridMode = '24', order: BlockOrder = 'input'): GridLayout {
  const sorted = sortBlocks(blocks, order)
  // /0–/7 caen en el octeto 1 → la rejilla se amplía automáticamente a 32 columnas
  const effMode: GridMode = mode === '32' || blocks.some((b) => b.prefix < 8) ? '32' : '24'
  const warnMode = mode === '24' && effMode === '32' ? 'prefijo < /8 detectado → modo 32 bits activado' : undefined
  const effCols = effMode === '32' ? 32 : 24
  const bitNums: GridCell[] = []
  const weights: GridCell[] = []
  const octetGroups: number[][] = []
  for (let i = 1; i <= effCols; i++) {
    const w = 128 >> ((i - 1) % 8)
    bitNums.push({ text: String(i), kind: 'bitnum', n: i, octet: Math.floor((i - 1) / 8) })
    weights.push({ text: String(w), kind: 'weight', weight: w, octet: Math.floor((i - 1) / 8) })
  }
  // rejilla 24 columnas = bits 9–32 (octetos 2–4); 32 columnas = bits 1–32
  for (let g = 0; g < effCols / 8; g++) octetGroups.push(Array.from({ length: 8 }, (_, k) => g * 8 + k + 1))
  const blockInfo: GridLayout['blocks'] = []
  for (const block of sorted) {
    const rowsCount = block.cidr32 ? 2 : block.cidr31 ? 3 : 5
    blockInfo.push({ block, rows: rowsCount, kind: block.cidr32 ? '32' : block.cidr31 ? '31' : 'std' })
  }
  return { mode: effMode, cols: effCols, bitNums, weights, octetGroups, blocks: blockInfo, warns: warnMode ? [warnMode] : [] }
}

/** fila de celdas de bits (1-based en la rejilla del modo actual) para un XBlock */
export function blockRowsToCells(b: XBlock, cols: number): { cells: (GridCell | null)[][]; labels: string[]; ips: string[] } {
  // posición 1-based global del bit 9 (o del bit 1 en modo 32)
  const mode32cols = cols === 32
  const colOfBit = (bitNo: number): number => (mode32cols ? bitNo : bitNo - 8)
  const rows: (GridCell | null)[][] = []
  // ---- fila cabecera: bits de red del octeto con la X + X ----
  const header: (GridCell | null)[] = new Array(cols).fill(null)
  if (b.redBits) {
    for (let k = 0; k < b.redBits.length; k++) {
      const bitNo = b.redStartBit + k
      const col = colOfBit(bitNo)
      if (col >= 1 && col <= cols) header[col - 1] = { text: b.redBits[k], kind: 'bit', bit: (b.redBits[k] === '1' ? '1' : '0') as '1' | '0', n: bitNo, octet: b.xOctet }
    }
  }
  const xcol = colOfBit(b.xBit)
  if (xcol >= 1 && xcol <= cols) header[xcol - 1] = { text: 'X', kind: 'bit', bit: 'X', n: b.xBit, octet: b.xOctet }
  rows.push(header)
  // ---- filas de host: bits desde la X hasta la última columna ----
  for (const bits of b.hostRows) {
    const row: (GridCell | null)[] = new Array(cols).fill(null)
    if (bits) {
      for (let k = 0; k < bits.length; k++) {
        const bitNo = b.xBit + k
        const col = colOfBit(bitNo)
        if (col >= 1 && col <= cols) row[col - 1] = { text: bits[k], kind: 'bit', bit: (bits[k] === '1' ? '1' : '0') as '1' | '0', n: bitNo, octet: b.xOctet }
      }
    }
    rows.push(row)
  }
  return { cells: rows, labels: [`${b.baseText ? '' : ''}${b.cidr32 ? 'HOST ÚNICO' : 'RED'}`, ...b.hostLabels].slice(0, rows.length), ips: [] }
}

/* ---------------- resumen textual ( Copiar como Markdown / TSV ) ---------------- */

export function blockToText(b: XBlock): string {
  return `RED ${b.index} /${b.prefix} — red ${b.net} · 1º host ${b.first} · último host ${b.last} · broadcast ${b.broadcast} · máscara ${b.mask} (${b.usable} hosts útiles)`
}

/* ---------------- matriz ensamblada (render + TSV + PNG + xlsx salen de ella) ---------------- */

export interface AsmRow {
  cells: (GridCell | null)[]
  label: string
  labelBold: boolean
  ip: string
  ipBold: boolean
  role: 'hdr' | 'host'
  /** para colorear por octeto en el modo Excel clásico */
  xOctet: number
}

export interface AssembledGrid {
  mode: GridMode
  cols: number
  bitNums: GridCell[]
  weights: GridCell[]
  rows: AsmRow[]
  warns: string[]
}

export function blockLabelOf(b: XBlock): string {
  return b.label ?? `RED ${b.index + 1} /${b.prefix}`
}

/** Ensambla TODA la rejilla (números, pesos y filas de bloque) lista para renderizar o exportar. */
export function assembleGrid(blocks: XBlock[], mode: GridMode = '24'): AssembledGrid {
  const needsAuto = blocks.some((b) => b.prefix < 8)
  const effMode: GridMode = mode === '32' || needsAuto ? '32' : '24'
  const cols = effMode === '32' ? 32 : 24
  const warnMode = mode === '24' && needsAuto ? 'prefijo < /8 detectado → modo 32 bits activado' : undefined
  const bitNums: GridCell[] = []
  const weights: GridCell[] = []
  for (let i = 1; i <= cols; i++) {
    bitNums.push({ text: String(i), kind: 'bitnum', n: i, octet: Math.floor((i - 1) / 8) })
    weights.push({ text: String(128 >> ((i - 1) % 8)), kind: 'weight', weight: 128 >> ((i - 1) % 8), octet: Math.floor((i - 1) / 8) })
  }
  const colOfBit = (bitNo: number): number => (effMode === '32' ? bitNo : bitNo - 8)
  const rows: AsmRow[] = []
  for (const b of blocks) {
    const { cells } = blockRowsToCells(b, cols)
    const blockLabels = [blockLabelOf(b), ...b.hostLabels]
    const blockIps = [
      b.baseText || (b.prefix === 0 ? '(todo)' : ''),
      b.net,
      ...(b.cidr32 ? [b.net] : b.cidr31 ? [b.net, b.broadcast] : [b.first, b.last, b.broadcast]),
    ]
    cells.forEach((row, r) => {
      rows.push({
        cells: row,
        label: blockLabels[r],
        labelBold: r === 0,
        ip: blockIps[r] ?? '',
        ipBold: r === 0,
        role: r === 0 ? 'hdr' : 'host',
        xOctet: b.xOctet,
      })
    })
  }
  return { mode: effMode, cols, bitNums, weights, rows, warns: warnMode ? [warnMode] : [] }
}
