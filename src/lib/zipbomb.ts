/* ── Zip Bomb Lab · Ronda 18 ──────────────────────────────────────────────
   La matemática de la compresión extrema, sin armas de destrucción masiva:
   fabricamos bombs REALES pero CAPADAS (zero runs acotados) para medir la
   amplificación medida, entender por qué 42.zip / 16.zip sonDOOM y cómo
   defenderse (límites de descompresión, bomb detection). 100% offline. */

export interface BombRecipe {
  id: string
  name: string
  approach: string
  danger: string
  famous: string
}

export const BOMB_RECIPES: BombRecipe[] = [
  { id: 'nested', name: 'Anidada (matryoshka)', approach: 'Cada ZIP contiene 16 copias del siguiente: 16 niveles ⇒ 16^16 copias del fichero final de 4.3 GB', danger: 'La clásica: agota disco al extraer en cascada. Niveles profundos requieren extraer capa a capa', famous: '42.zip — 42 KB que descomprimen 4.5 PB' },
  { id: 'layered', name: 'Capas (quines aparte)', approach: 'Un único ZIP con N ficheros de ceros altamente comprimibles: cada uno descomprime a 2.8 GB pero el total en disco es KB', danger: 'No necesita anidación: un doble clic en cualquier fichero revienta la extracción', famous: 'df1c1d51.zip (Bomb "layered" de 5.5 GB desde 188 KB)' },
  { id: 'quine', name: 'Quine (autorreplicante)', approach: 'Un ZIP que contiene EXACTAMENTE a sí mismo: al extraer obtienes el mismo ZIP, recursión infinita', danger: 'La más elegante: neither zlib nor unzip can distinguish it from a normal file. Detección prácticamente imposible por contenido', famous: 'zip quine de Russ Cox (rsw) — r.zip' },
  { id: 'zblg', name: 'ZBLG/ZBSM (formato propio)', approach: 'Formato creado por David Fifield: primeros niveles con coeficientes óptimos, ratio 281 millones a 1 con ZIP estándar', danger: 'Diseñada para derrotar bomb detection: la extracción es lenta y uniforme, sin picos detectables', famous: 'zblg.zip — 10 MB → 281 TB' },
  { id: 'para', name: 'Paralela (PGS)', approach: 'Como ZBLG pero con datos de sobremuestreo: casi 500 millones a 1, robusta ante antivirus que la truncan', danger: 'Diseñada para máxima amplificación con validación estricta del formato: extremadamente difícil de descartar por heurísticas', famous: 'd9b30f01.zip — 10 MB → 5.5 TB tras truncado' },
]

export const ZIPBOMB_LIMITS: string[] = [
  'Las bombs generadas aquí usan runs de ceros ACOTADOS (máx 100 MB expandidos): miden la amplificación real sin poder dañar nada.',
  'La compresión usa deflate-raw nativo del navegador (CompressionStream): mismo algoritmo que zlib, ratios ligeramente distintos a los de las bombs históricas.',
  'Los ratios de 42.zip y zblg.zip son literales, no simulados: esta tool reproduce la TÉCNICA, no el arma.',
  'Extraer bombs reales de terceros sin sandbox es vandalismo contra tu propio disco: usa las de aquí.',
]

export const ZIPBOMB_LESSONS: { title: string; lesson: string }[] = [
  { title: 'Por qué funciona', lesson: 'DEFLATE codifica runs con (distancia, longitud) en ~0.03 bits/byte: 1 GB de ceros cuesta ~28 KB. La bomba no es «datos»: es aritmética sobre el peor caso del formato.' },
  { title: 'La defensa es acotar', lesson: 'Toda extracción debe tener presupuesto: bytes máximos descomprimidos (libarchive: -U max), ficheros por archivo, profundidad de anidación y tiempo. 42.zip mata a quien no pone límites, no a quien los pone.' },
  { title: 'Detección por ratio', lesson: 'Un ratio > 1000:1 en un ZIP de producción es anómalo (los datos reales comprimen 2-10x). Los AV marcan bombs conocidas por hash, pero las ZBLG se diseñaron para esquivar eso: la defensa real es el límite de salida.' },
  { title: 'El aviso del aire acondicionado', lesson: 'DSz Ali unveiled 42.zip en 2001: 42 KB, 16 niveles, 4.5 PB. Sigue colándose en corpus de entrenamiento y sandboxes sin límites: la lección es que «capacidad» sin cuotas es una vulnerabilidad.' },
  { title: '¿Arma o demostración?', lesson: 'Como DoS es trivial de bloquear y fácil de atribuir: su valor real es didáctico (peor caso de compresión) y como prueba de estrés de extractores. Esta tool existe para entenderlo, no para atacar.' },
]

/* ---------- Matemática de amplificación ---------- */

export interface AmpStep {
  level: number
  filesPerLevel: number
  copiesTotal: bigint
  expandedTotal: bigint
}

export interface AmpResult {
  perFileBytes: bigint
  filesPerLevel: number
  levels: number
  steps: AmpStep[]
  totalExpanded: bigint
}

/** Árbol de anidación: cada nivel multiplica por «files» copias del siguiente. */
export function amplicationTree(perFileBytes: bigint, files: number, levels: number): AmpResult {
  const steps: AmpStep[] = []
  let copies = 1n
  let expanded = 0n
  for (let lvl = 1; lvl <= levels; lvl++) {
    copies *= BigInt(files)
    expanded = copies * perFileBytes
    steps.push({ level: lvl, filesPerLevel: files, copiesTotal: copies, expandedTotal: expanded })
  }
  return {
    perFileBytes,
    filesPerLevel: files,
    levels,
    steps,
    totalExpanded: expanded,
  }
}

export function humanBytes(n: bigint): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']
  let v = n
  let u = 0
  const f = Number(v)
  if (f < 1024) return `${v} B`
  let d = Number(v)
  while (d >= 1024 && u < units.length - 1) {
    d /= 1024
    u++
  }
  v = BigInt(Math.round(d))
  const dec = d >= 100 ? 0 : d >= 10 ? 1 : 2
  void v
  return `${d.toFixed(dec)} ${units[u]}`
}

/* ---------- Construcción de bombs capadas ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u16(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff]
}

function u32(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]
}

/** 30 bytes + nombre: cabecera local STORE, sin compresión (el payload ya viene comprimido). */
function localHeader(name: string, dataLen: number, crc: number): number[] {
  const n = [...name].map((c) => c.charCodeAt(0))
  return [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x881), ...u32(crc), ...u32(dataLen), ...u32(dataLen), ...u16(n.length), ...u16(0), ...n]
}

function centralHeader(name: string, dataLen: number, crc: number, offset: number): number[] {
  const n = [...name].map((c) => c.charCodeAt(0))
  return [...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x881), ...u32(crc), ...u32(dataLen), ...u32(dataLen), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0x881), ...u32(offset), ...n]
}

function eocd(count: number, cdSize: number, cdOffset: number): number[] {
  return [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(count), ...u16(count), ...u32(cdSize), ...u32(cdOffset), ...u16(0)]
}

/** Ensambla un ZIP estándar (método STORE) a partir de ficheros ya comprimidos. */
export function assembleZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: number[] = []
  const central: number[] = []
  let offset = 0
  for (const f of files) {
    const crc = crc32(f.data)
    const lh = localHeader(f.name, f.data.length, crc)
    parts.push(...lh, ...f.data)
    central.push(...centralHeader(f.name, f.data.length, crc, offset))
    offset += lh.length + f.data.length
  }
  const e = eocd(files.length, central.length, parts.length)
  return new Uint8Array([...parts, ...central, ...e])
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw')
  const stream = new Blob([bytes.slice().buffer as ArrayBuffer]).stream().pipeThrough(cs)
  return new Response(stream).bytes()
}

export interface BombLayer {
  name: string
  innerFiles: number
  innerFileSize: number
  zipBytes: number
}

export interface BombBuild {
  filename: string
  bytes: Uint8Array
  layers: BombLayer[]
  leafExpandedTotal: number
  leafCount: number
  amplification: number
}

export interface BombOptions {
  runBytes: number
  filesPerLevel: number
  levels: number
}

/** Bomba anidada CAPADA: cada capa contiene N copias de la siguiente, la hoja
 *  son N ficheros de runBytes de ceros. runBytes ≤ 10 MB ⇒ total acotado. */
export async function buildNestedBomb(opts: BombOptions): Promise<BombBuild> {
  const { runBytes, filesPerLevel, levels } = opts
  if (runBytes < 1024 || runBytes > 10_000_000) throw new Error('runBytes debe estar entre 1 KB y 10 MB (bomba capada)')
  if (filesPerLevel < 1 || filesPerLevel > 64) throw new Error('filesPerLevel entre 1 y 64')
  if (levels < 1 || levels > 8) throw new Error('niveles entre 1 y 8')

  const layers: BombLayer[] = []
  // Hoja: N ficheros de ceros comprimidos individualmente
  const leafFiles: { name: string; data: Uint8Array }[] = []
  const zeros = new Uint8Array(runBytes)
  const comp = await deflateRaw(zeros)
  for (let i = 0; i < filesPerLevel; i++) {
    leafFiles.push({ name: `hoja_${String(i).padStart(3, '0')}.bin`, data: comp })
  }
  let current = assembleZip(leafFiles)
  layers.push({ name: 'hoja', innerFiles: filesPerLevel, innerFileSize: runBytes, zipBytes: current.length })

  // Capas superiores: cada una empaqueta filesPerLevel copias del ZIP anterior
  for (let lvl = 2; lvl <= levels; lvl++) {
    const packed: { name: string; data: Uint8Array }[] = []
    for (let i = 0; i < filesPerLevel; i++) {
      packed.push({ name: `nivel_${lvl - 1}_copia_${String(i).padStart(2, '0')}.zip`, data: current })
    }
    current = assembleZip(packed)
    layers.push({ name: `nivel ${lvl - 1}`, innerFiles: filesPerLevel, innerFileSize: current.length, zipBytes: current.length })
  }

  const leafCount = Math.pow(filesPerLevel, levels)
  const leafExpandedTotal = leafCount * runBytes
  return {
    filename: `bomb_capada_${levels}x${filesPerLevel}_${runBytes}.zip`,
    bytes: current,
    layers,
    leafExpandedTotal,
    leafCount,
    amplification: current.length > 0 ? leafExpandedTotal / current.length : 0,
  }
}

/* ---------- Analizador de ZIP sin descomprimir ---------- */

export interface ZipEntry {
  name: string
  method: number
  compressed: number
  uncompressed: number
  ratio: number
  suspicious: boolean
}

export interface ZipAudit {
  valid: boolean
  entries: ZipEntry[]
  totalCompressed: number
  totalUncompressed: number
  maxRatio: number
  nestedZips: number
  verdict: string
  reasons: string[]
}

/** Analiza la estructura de un ZIP (bytes): central directory + EOCD, sin descomprimir nada. */
export function auditZip(bytes: Uint8Array): ZipAudit {
  const reasons: string[] = []
  const entries: ZipEntry[] = []
  let valid = false

  // Buscar EOCD (firma 0x06054b50 = bytes 50 4B 05 06) desde el final
  let eocdIdx = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65536); i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocdIdx = i
      break
    }
  }
  if (eocdIdx < 0) {
    return { valid: false, entries: [], totalCompressed: 0, totalUncompressed: 0, maxRatio: 0, nestedZips: 0, verdict: 'No es un ZIP válido', reasons: ['Firma EOCD (PK\\x05\\x06) no encontrada'] }
  }
  const count = bytes[eocdIdx + 10] | (bytes[eocdIdx + 11] << 8)
  const cdSize = bytes[eocdIdx + 12] | (bytes[eocdIdx + 13] << 8) | (bytes[eocdIdx + 14] << 16) | (bytes[eocdIdx + 15] << 24)
  const cdOff = bytes[eocdIdx + 16] | (bytes[eocdIdx + 17] << 8) | (bytes[eocdIdx + 18] << 16) | (bytes[eocdIdx + 19] << 24)
  valid = true

  let p = cdOff
  let totalCompressed = 0
  let totalUncompressed = 0
  let maxRatio = 0
  let nestedZips = 0
  for (let i = 0; i < count && p + 46 <= bytes.length; i++) {
    const sig = bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24)
    if (sig !== 0x02014b50) break
    const method = bytes[p + 10] | (bytes[p + 11] << 8)
    const csize = bytes[p + 20] | (bytes[p + 21] << 8) | (bytes[p + 22] << 16) | (bytes[p + 23] << 24)
    const usize = bytes[p + 24] | (bytes[p + 25] << 8) | (bytes[p + 26] << 16) | (bytes[p + 27] << 24)
    const nameLen = bytes[p + 28] | (bytes[p + 29] << 8)
    const extraLen = bytes[p + 30] | (bytes[p + 31] << 8)
    const commLen = bytes[p + 32] | (bytes[p + 33] << 8)
    const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLen))
    const ratio = csize > 0 ? usize / csize : 0
    if (/\.zip$/i.test(name)) nestedZips++
    entries.push({ name, method, compressed: csize, uncompressed: usize, ratio, suspicious: ratio > 500 || /\.zip$/i.test(name) })
    totalCompressed += csize
    totalUncompressed += usize
    maxRatio = Math.max(maxRatio, ratio)
    p += 46 + nameLen + extraLen + commLen
  }

  if (maxRatio > 1000) reasons.push(`Ratio extremo ${maxRatio.toFixed(0)}:1 — firma de bomba (datos reales comprimen 2-10x)`)
  if (nestedZips > 0) reasons.push(`${nestedZips} ZIP(s) anidado(s): anidación = multiplicación de amplificación`)
  if (totalUncompressed > 1_000_000_000) reasons.push('Expansión total > 1 GB: límite de extracción obligatorio')
  if (reasons.length === 0) reasons.push('Ratios y estructura normales')

  const verdict = maxRatio > 1000 || nestedZips >= 2 ? 'PATRÓN DE BOMBA' : maxRatio > 100 || nestedZips > 0 ? 'sospechoso' : 'normal'
  return { valid, entries, totalCompressed, totalUncompressed, maxRatio, nestedZips, verdict, reasons }
}
