/* ── Zero-Width Stego (Tinta Invisible) · Ronda 17 ────────────────────────
   Esteganografía en texto plano con caracteres de ancho cero: el mensaje
   viaja DENTRO de un texto portador aparentemente inocente, invisible en
   cualquier render. Modos: clásico binario ZWNJ/ZWJ, denso base-4, marcas
   por palabra y sanitizer forense para limpiar texto no confiable.
   100% client-side: nada sale del navegador. */

export type ZWMode = 'binary' | 'dense' | 'wordmark'

export const ZW_CHARS = {
  zwnj: '\u200C', // 00
  zwj: '\u200D', // 01
  zws: '\u200B', // 10 (solo denso)
  wj: '\u2060', // 11 (solo denso)
  sep: '\uFEFF', // delimitador de mensaje
} as const

export const ZW_NAMES: Record<string, string> = {
  '\u200C': 'ZWNJ (00)',
  '\u200D': 'ZWJ (01)',
  '\u200B': 'ZWSP (10)',
  '\u2060': 'WORD JOINER (11)',
  '\uFEFF': 'SEP (delimitador)',
}

export const ZW_MODE_INFO: Record<ZWMode, { name: string; bitsPerMark: number; capacity: string; note: string }> = {
  binary: { name: 'Binario clásico (ZWNJ/ZWJ)', bitsPerMark: 1, capacity: '1 bit por marca', note: 'El más compatible y el más fácil de detectar con herramientas básicas: solo dos caracteres' },
  dense: { name: 'Denso base-4 (ZWNJ/ZWJ/ZWSP/WJ)', bitsPerMark: 2, capacity: '2 bits por marca', note: 'El doble de eficiente: la mitad de caracteres invisibles para el mismo mensaje' },
  wordmark: { name: 'Marcas por palabra', bitsPerMark: 1, capacity: '1 bit por palabra', note: 'Marca tras cada palabra: aguanta copypaste de plataformas que recortan caracteres al final, pero necesita textos largos' },
}

/* ---------- Codificación ---------- */

function textToBits(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  return bits
}

function bitsToText(bits: string): string {
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return new TextDecoder().decode(new Uint8Array(bytes))
}

/** Inserta las marcas tras el carácter en la posición dada del portador. */
function insertMarks(carrier: string, marks: string, position: number): string {
  const chars = Array.from(carrier)
  const pos = Math.max(0, Math.min(position, chars.length))
  return chars.slice(0, pos).join('') + marks + chars.slice(pos).join('')
}

/** Codifica bits en marcas según el modo. */
function bitsToMarks(bits: string, mode: ZWMode): string {
  if (mode === 'dense') {
    const map = [ZW_CHARS.zwnj, ZW_CHARS.zwj, ZW_CHARS.zws, ZW_CHARS.wj]
    let out = ''
    for (let i = 0; i < bits.length; i += 2) {
      const pair = bits.slice(i, i + 2).padEnd(2, '0')
      out += map[parseInt(pair, 2)]
    }
    return out
  }
  // binary y wordmark: 1 bit por marca
  let out = ''
  for (const bit of bits) out += bit === '1' ? ZW_CHARS.zwj : ZW_CHARS.zwnj
  return out
}

/** Decodifica marcas a bits según el modo. */
function marksToBits(marks: string, mode: ZWMode): string {
  if (mode === 'dense') {
    const map: Record<string, string> = { [ZW_CHARS.zwnj]: '00', [ZW_CHARS.zwj]: '01', [ZW_CHARS.zws]: '10', [ZW_CHARS.wj]: '11' }
    let bits = ''
    for (const ch of marks) {
      const b = map[ch]
      if (b) bits += b
    }
    return bits
  }
  let bits = ''
  for (const ch of marks) {
    if (ch === ZW_CHARS.zwj) bits += '1'
    else if (ch === ZW_CHARS.zwnj) bits += '0'
  }
  return bits
}

export interface EncodeResult {
  output: string
  marks: number
  carrierWords: number
  fits: boolean
  bitsNeeded: number
  capacityBits: number
}

/** Oculta el mensaje en el portador. Devuelve el texto con la tinta invisible. */
export function zwEncode(carrier: string, message: string, mode: ZWMode): EncodeResult {
  const bits = textToBits(message)
  const info = ZW_MODE_INFO[mode]
  const carrierWords = countWords(carrier)
  let output: string
  let marks: number

  if (mode === 'wordmark') {
    // una marca por palabra (después del espacio separador), message completo
    const words = carrier.split(/(\s+)/)
    let bitIdx = 0
    output = words
      .map((w) => {
        if (/^\s+$/.test(w) || bitIdx >= bits.length) return w
        const bit = bits[bitIdx++]
        return w + (bit === '1' ? ZW_CHARS.zwj : ZW_CHARS.zwnj)
      })
      .join('')
    marks = bitIdx
    if (bitIdx < bits.length) throw new Error(`El portador tiene ${carrierWords} palabras pero el mensaje necesita ${bits.length} bits: añade ${bits.length - bitIdx} palabras más o usa modo denso`)
  } else {
    marks = mode === 'dense' ? Math.ceil(bits.length / 2) : bits.length
    const payload = bitsToMarks(bits, mode) + ZW_CHARS.sep
    // posición: mitad del texto (robusto a recortes de inicio/fin de plataformas)
    const mid = Math.floor(Array.from(carrier).length / 2)
    output = insertMarks(carrier, payload, mid)
  }

  return {
    output,
    marks,
    carrierWords,
    fits: true,
    bitsNeeded: bits.length,
    capacityBits: mode === 'wordmark' ? carrierWords : Math.floor(Array.from(carrier).length * info.bitsPerMark),
  }
}

/* ---------- Decodificación ---------- */

export interface DecodeResult {
  message: string
  marks: number
  foundChars: Record<string, number>
  modeUsed: ZWMode
  warnings: string[]
}

/** Extrae la tinta de un texto probando los modos que encajen con las marcas presentes. */
export function zwDecode(text: string): DecodeResult {
  const foundChars: Record<string, number> = {}
  for (const ch of text) {
    if (ZW_NAMES[ch]) foundChars[ch] = (foundChars[ch] ?? 0) + 1
  }
  const warnings: string[] = []
  const total = Object.entries(foundChars).reduce((a, [ch, c]) => a + (ch === ZW_CHARS.sep ? 0 : c), 0)

  if (total === 0) {
    return { message: '', marks: 0, foundChars, modeUsed: 'binary', warnings: ['El texto no contiene caracteres de ancho cero'] }
  }

  // Elegir modo: si hay ZWSP o WJ, es denso; si no, binario/wordmark
  const hasDense = (foundChars[ZW_CHARS.zws] ?? 0) > 0 || (foundChars[ZW_CHARS.wj] ?? 0) > 0
  const modes: ZWMode[] = hasDense ? ['dense', 'binary', 'wordmark'] : ['binary', 'wordmark', 'dense']

  let best: { message: string; mode: ZWMode; score: number; warn: string[] } | null = null
  for (const mode of modes) {
    try {
      const { bits, warnings: w } = extractBits(text, mode)
      if (!bits) continue
      const message = bitsToText(bits)
      const printable = message.split('').filter((c) => c.charCodeAt(0) >= 32 || c === '\n').length / Math.max(1, message.length)
      const score = printable
      if (!best || score > best.score) best = { message, mode, score, warn: w }
      if (score === 1) break
    } catch {
      /* modo no encaja */
    }
  }

  if (!best || !best.message) {
    return { message: '', marks: total, foundChars, modeUsed: modes[0], warnings: ['Hay marcas pero no forman un mensaje válido: prueba otro modo o verifica que el texto no fue alterado'] }
  }
  warnings.push(...best.warn)
  if (best.score < 0.9) warnings.push('El mensaje decodificado contiene bytes no imprimibles: puede estar corrupto o truncado')
  return { message: best.message, marks: total, foundChars, modeUsed: best.mode, warnings }
}

function extractBits(text: string, mode: ZWMode): { bits: string; warnings: string[] } {
  const warnings: string[] = []
  if (mode === 'wordmark') {
    // bits: marcas después de palabras (secuencias de zwj/zwnj adyacentes a boundaries de palabra)
    const words = text.split(/\s+/)
    let bits = ''
    for (const w of words) {
      const m = /([\u200C\u200D]+)$/.exec(w)
      if (m) {
        for (const ch of m[1]) bits += ch === ZW_CHARS.zwj ? '1' : '0'
      }
    }
    if (!bits) throw new Error('sin marcas de palabra')
    return { bits, warnings }
  }
  // binary/dense: extraer TODAS las marcas, cortar en el separador si existe
  const MARK_SET = new Set<string>([ZW_CHARS.zwnj, ZW_CHARS.zwj, ZW_CHARS.zws, ZW_CHARS.wj, ZW_CHARS.sep])
  let marks = ''
  for (const ch of text) {
    if (MARK_SET.has(ch)) marks += ch
  }
  const sepIdx = marks.indexOf(ZW_CHARS.sep)
  if (sepIdx >= 0) {
    marks = marks.slice(0, sepIdx)
  } else {
    warnings.push('Sin delimitador final: el mensaje puede haber perdido caracteres al copiar')
  }
  return { bits: marksToBits(marks, mode), warnings }
}

/* ---------- Sanitizer forense ---------- */

export interface SanitizeResult {
  cleaned: string
  removed: { char: string; name: string; count: number }[]
  totalRemoved: number
  hadBidi: boolean
}

/** Limpia texto no confiable: elimina TODOS los invisibles, bidi y tags Unicode. */
export function zwSanitize(text: string): SanitizeResult {
  const counts = new Map<string, number>()
  let cleaned = ''
  let hadBidi = false
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    const isInvisible = (cp >= 0x200b && cp <= 0x200f) || cp === 0x2060 || cp === 0xfeff || (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069) || (cp >= 0xe0000 && cp <= 0xe007f) || cp === 0x00ad
    if (isInvisible) {
      if (cp >= 0x202a && cp <= 0x202e) hadBidi = true
      counts.set(ch, (counts.get(ch) ?? 0) + 1)
      continue
    }
    cleaned += ch
  }
  const removed = Array.from(counts.entries())
    .map(([char, count]) => ({ char, name: ZW_NAMES[char] ?? `U+${cp(char)}`, count }))
    .sort((a, b) => b.count - a.count)
  return { cleaned, removed, totalRemoved: Array.from(counts.values()).reduce((a, b) => a + b, 0), hadBidi }
}

function cp(ch: string): string {
  return ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
}

/* ---------- Utilidades ---------- */

export function countWords(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length
}

export function countZw(text: string): number {
  let n = 0
  for (const ch of text) if (ZW_NAMES[ch] && ch !== ZW_CHARS.sep) n++
  return n
}

/** Ratio de marcas por carácter visible (para medir cuán «cargado» queda el portador). */
export function stegoRatio(output: string): { marks: number; visible: number; ratio: string } {
  let marks = 0
  let visible = 0
  for (const ch of output) {
    if (ZW_NAMES[ch] && ch !== ZW_CHARS.sep) marks++
    else if (ch.charCodeAt(0) >= 33) visible++
  }
  return { marks, visible, ratio: visible > 0 ? (marks / visible).toFixed(3) : '0' }
}

/* ---------- Catálogo: usos reales (ataque y defensa) ---------- */

export const ZW_USE_CASES: { title: string; side: 'ofensiva' | 'defensa' | 'legítimo'; desc: string }[] = [
  { title: 'Watermarking de filtraciones', side: 'legítimo', desc: 'Empresas marcan cada copia de un documento confidencial con un ID invisible distinto: cuando aparece en pastebin, saben quién filtró (la famosa desanonimización de filtraciones).' },
  { title: 'Identificación de bots y copypaste', side: 'legítimo', desc: 'Detectar scraping: si tu contenido viaja con marcas y reaparece en otra web, tienes prueba de copia además del watermark.' },
  { title: 'Exfiltración por portapapeles', side: 'ofensiva', desc: 'Un dossier filtrado copiado de una web corporativa puede llevar el historial del navegador embebido en tinta invisible: PII del empleado que lo filtró.' },
  { title: 'Romper filtros de moderación', side: 'ofensiva', desc: 'Spam y phishing con ZWSP dentro de palabras clave («ofe.rta» con \u200B) para esquivar filtros de strings: por eso los sanitizers eliminan todo invisible de entrada no confiable.' },
  { title: 'Vincular cuentas anónimas', side: 'ofensiva', desc: 'Un atacante deja tinta con ID de sesión en los mensajes que escribe con cada alias: el foro revela que «usuario A» y «usuario B» son el mismo dispositivo.' },
  { title: 'Sanitizar entrada de usuarios', side: 'defensa', desc: 'Todo texto no confiable (comentarios, bios, nombres de fichero) debe pasar un sanitizer: esta tool incluye el modo forense que elimina invisibles, bidi y tags Unicode.' },
]

export const ZW_LIMITS: string[] = [
  'Algunas plataformas (Twitter/X, Slack) eliminan parte de los caracteres de ancho cero al guardar: prueba el ciclo completo antes de confiar en un canal.',
  'El modo por palabras aguanta mejor los recortes, pero necesita 8 palabras por carácter del mensaje.',
  'La detección de tinta es trivial para quien sabe buscar: esto es ocultación, no criptografía. Combínalo con cifrado si el contenido es sensible.',
  'Nunca uses esto para ocultar actividad maliciosa: el uso legítimo es watermarking, verificación de copias y análisis forense.',
]
