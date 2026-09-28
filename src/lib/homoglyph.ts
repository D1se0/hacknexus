/* ── Homoglyph & Unicode Threat Scanner · Ronda 17 ────────────────────────
   Dominios y textos que «se ven igual» pero no lo son: el vector clásico del
   phishing (аpple.com con «а» cirílica). Todo local con las tablas Unicode
   esenciales embebidas: detección de punycode, confusables por alfabeto,
   invisibles (zero-width, bidi), y puntuación de riesgo con dominio limpio
   reconstruido. Incluye generador de «evil twins» para testear filtros. */

/* ---------- 1. Tabla de confusables (Latino ← otros alfabetos) ---------- */

/** Mapa carácter→carácter latino equivalente visualmente. Solo los del
 *  subconjunto que aparece en campañas de phishing reales. */
export const CONFUSABLES: Record<string, string> = {
  // Cirílico
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i',
  'ѕ': 's', 'ј': 'j', 'һ': 'h', 'ӏ': 'i', 'б': 'b', 'г': 'r', 'м': 'm', 'н': 'h',
  'к': 'k', 'т': 't', 'в': 'b',
  // Griego
  'ο': 'o', 'α': 'a', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ρ': 'p', 'τ': 't', 'υ': 'u',
  'ν': 'v', 'χ': 'x', 'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H',
  'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X',
  // Latino con diacríticos / variantes (IDN homográfico sin punycode)
  'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ñ': 'n', 'ç': 'c', 'ý': 'y', 'ÿ': 'y',
  'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N',
  'Ā': 'A', 'ā': 'a', 'Ē': 'E', 'ē': 'e', 'Ī': 'I', 'ī': 'i', 'Ō': 'O', 'ō': 'o', 'Ū': 'U', 'ū': 'u',
  'ṁ': 'm', 'ŀ': 'l', 'ı': 'i', 'ɡ': 'g', 'ǀ': 'l', 'ǃ': 'l',
  // Símbolos que sustituyen letras
  'ⅰ': 'i', 'ⅼ': 'l', '０': '0', '１': '1', '３': '3', '５': '5', '６': '6', '８': '8',
}

export const CONFUSABLE_ALPHABET: Record<string, string> = {
  'а': 'cirílico', 'е': 'cirílico', 'о': 'cirílico', 'р': 'cirílico', 'с': 'cirílico',
  'у': 'cirílico', 'х': 'cirílico', 'і': 'cirílico', 'ѕ': 'cirílico', 'ј': 'cirílico',
  'һ': 'cirílico', 'ӏ': 'cirílico', 'б': 'cirílico', 'г': 'cirílico', 'м': 'cirílico',
  'н': 'cirílico', 'к': 'cirílico', 'т': 'cirílico', 'в': 'cirílico',
  'ο': 'griego', 'α': 'griego', 'ε': 'griego', 'ι': 'griego', 'κ': 'griego',
  'ρ': 'griego', 'τ': 'griego', 'υ': 'griego', 'ν': 'griego', 'χ': 'griego',
  'Α': 'griego', 'Β': 'griego', 'Ε': 'griego', 'Ζ': 'griego', 'Η': 'griego',
  'Κ': 'griego', 'Μ': 'griego', 'Ν': 'griego', 'Ο': 'griego', 'Ρ': 'griego',
  'Τ': 'griego', 'Υ': 'griego', 'Χ': 'griego',
}

/** Caracteres invisibles y de control que no deberían estar en un dominio/texto sano. */
export interface InvisibleDef {
  cp: string
  name: string
  kind: 'zero-width' | 'bidi' | 'joiner' | 'tag' | 'control'
  risk: 'high' | 'medium'
  use: string
}

export const INVISIBLES: InvisibleDef[] = [
  { cp: '\u200B', name: 'ZERO WIDTH SPACE', kind: 'zero-width', risk: 'high', use: 'Ocultar palabras clave o romper filtros de texto' },
  { cp: '\u200C', name: 'ZERO WIDTH NON-JOINER', kind: 'zero-width', risk: 'high', use: 'Esteganografía de texto (cada par codifica bits)' },
  { cp: '\u200D', name: 'ZERO WIDTH JOINER', kind: 'joiner', risk: 'high', use: 'Esteganografía y manipulación de emojis ZWJ' },
  { cp: '\u2060', name: 'WORD JOINER', kind: 'joiner', risk: 'medium', use: 'Invisible total: se cuela en copypaste' },
  { cp: '\uFEFF', name: 'ZERO WIDTH NO-BREAK SPACE (BOM)', kind: 'zero-width', risk: 'medium', use: 'BOM incrustado a mitad de texto' },
  { cp: '\u202A', name: 'LEFT-TO-RIGHT EMBEDDING', kind: 'bidi', risk: 'high', use: 'Reordenar visualmente el texto (spoof de fichero.exe)' },
  { cp: '\u202B', name: 'RIGHT-TO-LEFT EMBEDDING', kind: 'bidi', risk: 'high', use: 'Igual, en dirección RTL' },
  { cp: '\u202E', name: 'RIGHT-TO-LEFT OVERRIDE', kind: 'bidi', risk: 'high', use: 'EL clásico: «gpj.exe» se VE como «exe.jpg»' },
  { cp: '\u2066', name: 'LEFT-TO-RIGHT ISOLATE', kind: 'bidi', risk: 'high', use: 'Aislamiento bidi para spoof de UI (CVE de IDEs)' },
  { cp: '\u2067', name: 'RIGHT-TO-LEFT ISOLATE', kind: 'bidi', risk: 'high', use: 'Igual, RTL' },
  { cp: '\u2068', name: 'FIRST STRONG ISOLATE', kind: 'bidi', risk: 'high', use: 'Igual, auto-dirección' },
  { cp: '\u2069', name: 'POP DIRECTIONAL ISOLATE', kind: 'bidi', risk: 'medium', use: 'Cierra un isolate abierto antes' },
  { cp: '\u202D', name: 'LEFT-TO-RIGHT OVERRIDE', kind: 'bidi', risk: 'high', use: 'Override LTR: mismo abuso que 202E' },
  { cp: '\uE0041', name: 'TAG LATIN SMALL LETTER A', kind: 'tag', risk: 'high', use: 'Tags Unicode invisibles: la exfiltración por estado de emoji (CVE-2019-16103)' },
]

/* ---------- 2. Detecciones ---------- */

export interface CharFinding {
  index: number
  char: string
  codePoint: string
  category: 'confusable' | 'invisible' | 'bidi' | 'tag' | 'nonascii-ok'
  script?: string
  mapsTo?: string
  name?: string
}

export interface HomoglyphReport {
  original: string
  findings: CharFinding[]
  hasPunycode: boolean
  punycodeLabels: string[]
  invisibles: number
  bidiChars: number
  confusables: number
  mixedScripts: boolean
  scriptsFound: string[]
  risk: 'critical' | 'high' | 'medium' | 'low' | 'clean'
  riskReason: string
  cleaned: string
  skeleton: string
  asciiOnly: string
  decodedUnicode: string
}

/** Punycode: label que empieza por xn--. */
export function extractPunycodeLabels(input: string): string[] {
  return input
    .split(/[./\s]/)
    .filter((l) => l.toLowerCase().startsWith('xn--'))
}

/** Convierte una label punycode a Unicode con el algoritmo estándar (RFC 3492, decodificación). */
export function punycodeDecode(input: string): string | null {
  const m = /^xn--(.*)$/i.exec(input)
  if (!m) return null
  const s = m[1]
  const delim = s.lastIndexOf('-')
  const b = 36
  const tmin = 1
  const tmax = 26
  const skew = 38
  const damp = 700
  const initialBias = 72
  const initialN = 128

  const output: number[] = []
  let n = initialN
  let i = 0
  let bias = initialBias
  const basicStr = delim > 0 ? s.slice(0, delim) : ''
  for (const ch of basicStr) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x80) return null
    output.push(cp)
  }
  let idx = delim > 0 ? delim + 1 : 0
  let loopGuard = 0
  while (idx < s.length && loopGuard++ < 1000) {
    const oldi = i
    let w = 1
    for (let k = b; ; k += b) {
      if (idx >= s.length) return null
      const digit = decodeDigit(s[idx++])
      if (digit === null || digit >= b) return null
      i += digit * w
      const t = k <= bias ? tmin : k >= bias + tmax ? tmax : k - bias
      if (digit < t) break
      w *= b - t
      if (w > 0x7fffffff) return null
    }
    const out = output.length + 1
    if (i < oldi) return null
    bias = adapt(i - oldi, out, oldi === 0, damp, skew, tmin, tmax)
    n += Math.floor(i / out)
    i %= out
    if (n < 0 || n > 0x10ffff) return null
    output.splice(i, 0, n)
    i++
  }
  try {
    return String.fromCodePoint(...output)
  } catch {
    return null
  }
}

function decodeDigit(d: string): number | null {
  const cp = d.codePointAt(0)!
  if (cp >= 0x61 && cp <= 0x7a) return cp - 0x61 // a-z → 0-25
  if (cp >= 0x41 && cp <= 0x5a) return cp - 0x41 // A-Z → 0-25
  if (cp >= 0x30 && cp <= 0x39) return cp - 0x30 + 26 // 0-9 → 26-35
  return null
}

function adapt(delta: number, numpoints: number, first: boolean, damp: number, skew: number, tmin: number, tmax: number): number {
  const b = 36
  delta = first ? Math.floor(delta / damp) : Math.floor(delta / 2)
  delta += Math.floor(delta / numpoints)
  let k = 0
  while (delta > Math.floor(((b - tmin) * tmax) / 2)) {
    delta = Math.floor(delta / (b - tmin))
    k += b
  }
  return k + Math.floor(((b - tmin + 1) * delta) / (delta + skew))
}

/** «Esqueleto» unicode.confusables: colapsar todo a una forma canónica para
 *  comparar dominios visualmente idénticos. */
export function skeletonOf(s: string): string {
  let out = ''
  for (const ch of s) {
    const lower = ch.toLowerCase()
    out += CONFUSABLES[lower] ?? CONFUSABLES[ch] ?? lower
  }
  return out
}

const BIDI_CP = new Set(['\u202A', '\u202B', '\u202C', '\u202D', '\u202E', '\u2066', '\u2067', '\u2068', '\u2069'])
const INVISIBLE_CP = new Set(['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF'])

function charScript(ch: string): string {
  if (CONFUSABLE_ALPHABET[ch]) return CONFUSABLE_ALPHABET[ch]
  const cp = ch.codePointAt(0)!
  if (cp < 0x80) return 'latino/ascii'
  if (cp >= 0x0400 && cp <= 0x04ff) return 'cirílico'
  if (cp >= 0x0370 && cp <= 0x03ff) return 'griego'
  if (cp >= 0x0600 && cp <= 0x06ff) return 'árabe'
  if (cp >= 0x0590 && cp <= 0x05ff) return 'hebreo'
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK'
  if (cp >= 0x0900 && cp <= 0x097f) return 'devanagari'
  if (cp >= 0x00c0 && cp <= 0x024f) return 'latino'
  return 'otro'
}

export function analyzeHomoglyph(input: string): HomoglyphReport {
  const findings: CharFinding[] = []
  const scripts = new Set<string>()
  let invisibles = 0
  let bidi = 0
  let confusables = 0
  let cleaned = ''

  const chars = Array.from(input)
  chars.forEach((ch, i) => {
    const cpHex = 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
    if (BIDI_CP.has(ch)) {
      bidi++
      findings.push({ index: i, char: ch, codePoint: cpHex, category: 'bidi', name: bidiName(ch) })
      return
    }
    if (INVISIBLE_CP.has(ch)) {
      invisibles++
      findings.push({ index: i, char: ch, codePoint: cpHex, category: 'invisible', name: invisibleName(ch) })
      return
    }
    if (ch >= '\uE0000' && ch <= '\uE007F') {
      findings.push({ index: i, char: ch, codePoint: cpHex, category: 'tag', name: 'TAG (canal invisible de emoji)' })
      return
    }
    if (CONFUSABLES[ch]) {
      confusables++
      const script = CONFUSABLE_ALPHABET[ch] ?? 'variante latina'
      scripts.add(script)
      findings.push({ index: i, char: ch, codePoint: cpHex, category: 'confusable', script, mapsTo: CONFUSABLES[ch] })
      return
    }
    if (ch.codePointAt(0)! >= 0x80) {
      scripts.add(charScript(ch))
      findings.push({ index: i, char: ch, codePoint: cpHex, category: 'nonascii-ok', script: charScript(ch) })
      return
    }
    cleaned += ch
    return
  })

  // Reconstruir el «limpio»: confusables→equivalente, invisibles/bidi eliminados
  cleaned = Array.from(input)
    .filter((ch) => !BIDI_CP.has(ch) && !INVISIBLE_CP.has(ch) && !(ch >= '\uE0000' && ch <= '\uE007F'))
    .map((ch) => CONFUSABLES[ch] ?? ch)
    .join('')

  const punycodeLabels = extractPunycodeLabels(input)
  const decodedLabels = punycodeLabels
    .map((l) => {
      const d = punycodeDecode(l)
      return d ? `${l} → ${d}` : l
    })
  const decodedUnicode = punycodeLabels.length > 0 ? input.replace(/xn--[a-z0-9-]+/gi, (m) => punycodeDecode(m) ?? m) : input

  const scriptsFound = Array.from(scripts).filter((s) => s !== 'latino/ascii' && s !== 'latino')
  const mixedScripts = scriptsFound.length > 0 && /[\x00-\x7f]/.test(input)
  const hasDot = input.includes('.')
  const nonLatinConfusables = findings.filter(
    (f) => f.category === 'confusable' && (f.script === 'cirílico' || f.script === 'griego'),
  ).length
  const punyDecoded = punycodeLabels.map((l) => ({ label: l, decoded: punycodeDecode(l) }))
  const punyDecodesNonAscii = punyDecoded.some((p) => p.decoded !== null && /[^\x00-\x7f]/.test(p.decoded))
  const punyCyrGreek = punyDecoded.some((p) =>
    (p.decoded ? Array.from(p.decoded) : []).some((ch) => {
      const sc = CONFUSABLE_ALPHABET[ch]
      return sc === 'cirílico' || sc === 'griego'
    }),
  )

  let risk: HomoglyphReport['risk'] = 'clean'
  let riskReason = 'Sin hallazgos: texto ASCII puro y legible'
  if (bidi > 0) {
    risk = 'critical'
    riskReason = `Contiene ${bidi} caracteres bidi: el texto visible puede NO coincidir con el real (spoof de extensión/nombre)`
  } else if (punyCyrGreek && hasDot) {
    risk = 'critical'
    riskReason = `Punycode que decodifica a homoglifos cirílicos/griegos en un dominio: phishing IDN homográfico clásico (${punyDecoded
      .filter((p) => p.decoded && /[^\x00-\x7f]/.test(p.decoded))
      .map((p) => `${p.label} → ${p.decoded}`)
      .join(', ')})`
  } else if (nonLatinConfusables > 0 && hasDot) {
    risk = 'critical'
    riskReason = `${nonLatinConfusables} confusable(s) cirílico/griego en un dominio: evil twin visual (аpple.com ≠ apple.com)`
  } else if (nonLatinConfusables > 2) {
    risk = 'high'
    riskReason = `${nonLatinConfusables} confusables no latinos: probable suplantación visual de marca o usuario`
  } else if (invisibles > 0) {
    risk = 'high'
    riskReason = `${invisibles} carácter(es) invisible(s): contenido oculto, esteganografía o evasión de filtros`
  } else if (punyDecodesNonAscii) {
    risk = 'medium'
    riskReason = `IDN punycode que decodifica a no-ASCII (${punyDecoded
      .filter((p) => p.decoded && /[^\x00-\x7f]/.test(p.decoded))
      .map((p) => `${p.label} → ${p.decoded}`)
      .join(', ')}): puede ser un IDN legítimo (münchen) o un evil twin — verifica`
  } else if (confusables > 0 && hasDot) {
    risk = 'medium'
    riskReason = `${confusables} acento(s)/variante(s) latina(s) en un dominio: IDN legítimo en español, pero técnicamente OTRO dominio`
  } else if (confusables > 2) {
    risk = 'medium'
    riskReason = `${confusables} confusables latinos: probable texto con acentos legítimo (o suplantación sutil)`
  } else if (confusables > 0) {
    risk = 'low'
    riskReason = `${confusables} confusable(s) latino(s): normalmente acentos del idioma`
  } else if (scriptsFound.length > 0) {
    risk = 'low'
    riskReason = `Guiones no latinos (${scriptsFound.join(', ')}) pero sin confusables directos`
  }

  return {
    original: input,
    findings,
    hasPunycode: punycodeLabels.length > 0,
    punycodeLabels: decodedLabels,
    invisibles,
    bidiChars: bidi,
    confusables,
    mixedScripts,
    scriptsFound,
    risk,
    riskReason,
    cleaned,
    skeleton: skeletonOf(input),
    asciiOnly: cleaned.replace(/[^\x20-\x7e]/g, ''),
    decodedUnicode,
  }
}

function bidiName(ch: string): string {
  const names: Record<string, string> = {
    '\u202A': 'LEFT-TO-RIGHT EMBEDDING',
    '\u202B': 'RIGHT-TO-LEFT EMBEDDING',
    '\u202C': 'POP DIRECTIONAL FORMATTING',
    '\u202D': 'LEFT-TO-RIGHT OVERRIDE',
    '\u202E': 'RIGHT-TO-LEFT OVERRIDE',
    '\u2066': 'LEFT-TO-RIGHT ISOLATE',
    '\u2067': 'RIGHT-TO-LEFT ISOLATE',
    '\u2068': 'FIRST STRONG ISOLATE',
    '\u2069': 'POP DIRECTIONAL ISOLATE',
  }
  return names[ch] ?? 'BIDI'
}

function invisibleName(ch: string): string {
  const names: Record<string, string> = {
    '\u200B': 'ZERO WIDTH SPACE',
    '\u200C': 'ZERO WIDTH NON-JOINER',
    '\u200D': 'ZERO WIDTH JOINER',
    '\u2060': 'WORD JOINER',
    '\uFEFF': 'ZERO WIDTH NO-BREAK SPACE (BOM)',
  }
  return names[ch] ?? 'INVISIBLE'
}

export function riskTone(risk: HomoglyphReport['risk']): 'bad' | 'warn' | 'info' | 'ok' {
  if (risk === 'critical') return 'bad'
  if (risk === 'high') return 'warn'
  if (risk === 'medium') return 'info'
  return 'ok'
}

/* ---------- 3. Generador de evil twins (para testear filtros) ---------- */

export interface EvilTwin {
  original: string
  variant: string
  technique: string
  visible: string
}

const CYRILLIC_MAP: Record<string, string> = { a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', y: 'у', x: 'х', i: 'і', s: 'ѕ', j: 'ј', b: 'в', m: 'м', k: 'к', t: 'т', h: 'һ' }
const GREEK_MAP: Record<string, string> = { o: 'ο', a: 'α', e: 'ε', i: 'ι', k: 'κ', p: 'ρ', v: 'ν', x: 'χ', u: 'υ' }

/** Genera variantes homoglifo de un dominio para testear si tus filtros las cazan. */
export function generateEvilTwins(domain: string): EvilTwin[] {
  const out: EvilTwin[] = []
  const lower = domain.toLowerCase().trim()
  if (!lower) return out

  // 1. Cirílico: sustituir 1 carácter elegible
  for (let i = 0; i < lower.length; i++) {
    const sub = CYRILLIC_MAP[lower[i]]
    if (sub) {
      const variant = lower.slice(0, i) + sub + lower.slice(i + 1)
      out.push({ original: lower, variant, technique: `cirílico (${lower[i]}→${sub})`, visible: visuallyOf(variant) })
      break // solo la primera para no explotar combinatoria
    }
  }
  // 2. Griego
  for (let i = 0; i < lower.length; i++) {
    const sub = GREEK_MAP[lower[i]]
    if (sub) {
      const variant = lower.slice(0, i) + sub + lower.slice(i + 1)
      out.push({ original: lower, variant, technique: `griego (${lower[i]}→${sub})`, visible: visuallyOf(variant) })
      break
    }
  }
  // 3. Acento latino en la primera vocal
  const accented = lower.replace(/a/, 'á').replace(/e/, 'é').replace(/o/, 'ó')
  if (accented !== lower) out.push({ original: lower, variant: accented, technique: 'IDN latino con acento', visible: visuallyOf(accented) })
  // 4. Zero-width dentro de la marca
  const zw = lower.slice(0, Math.max(1, Math.floor(lower.length / 2))) + '\u200B' + lower.slice(Math.max(1, Math.floor(lower.length / 2)))
  out.push({ original: lower, variant: zw, technique: 'zero-width space (rompe matching de strings)', visible: visuallyOf(zw) })
  // 5. Bidi override: invierte visualmente la TLD
  const dot = lower.lastIndexOf('.')
  if (dot > 0) {
    const tld = lower.slice(dot + 1)
    const bidi = lower.slice(0, dot + 1) + '\u202E' + tld.split('').reverse().join('')
    out.push({ original: lower, variant: bidi, technique: 'bidi override (TLD invertida visualmente)', visible: visuallyOf(bidi) })
  }
  // 6. doble «i» ligada ı̇ o rn→m clásico
  if (lower.includes('rn')) out.push({ original: lower, variant: lower.replace('rn', 'm'), technique: 'rn→m (transliteración visual)', visible: visuallyOf(lower.replace('rn', 'm')) })
  return out
}

/** Lo que un humano VERÍA (simplificación: los confusables se ven como su equivalente). */
export function visuallyOf(s: string): string {
  let out = ''
  for (const ch of s) {
    if (ch === '\u202E') {
      out += '⟨RTL⟩'
      continue
    }
    if (ch === '\u200B') {
      out += '⟨ZW⟩'
      continue
    }
    out += CONFUSABLES[ch] ?? ch
  }
  return out
}

/* ---------- 4. Catálogo didáctico ---------- */

export const HOMOGLYPH_ATTACKS: { name: string; how: string; example: string; defense: string }[] = [
  {
    name: 'IDN homográfico',
    how: 'Registrar un dominio punycode cuyo render Unicode se ve idéntico al legítimo usando cirílico/griego.',
    example: 'xn--pple-43d.com → аpple.com (la «a» es U+0430)',
    defense: 'Chrome/Edge muestran el punycode crudo si el dominio mezcla guiones; Firefox con idn_show_punycode=true. Tu defensa: pinneados y gestor de contraseñas.',
  },
  {
    name: 'Spoof bidi de extensión',
    how: 'Un RTL OVERRIDE invierte el orden de presentación del nombre: el ejecutable se muestra como imagen.',
    example: 'gnp⟨RTL⟩exe.jpg se VE «gpj.exe.jpg»… el código real es distinto',
    defense: 'Mostrar extensiones ocultas, no abrir adjuntos, y políticas que bloqueen bidi en nombres de fichero (GitHub lo hace en PRs).',
  },
  {
    name: 'Exfiltración por tags Unicode',
    how: 'Los TAG U+E0000..E007F son invisibles y cambian el estado de un emoji: canal encubierto en chat (CVE-2019-16103 en Twitter).',
    example: '👍[tag a][tag b]… cada combinación = un símbolo de datos ocultos',
    defense: 'Sanitizar entrada no confiable eliminando los rangos tag/bidi/zero-width (lo hace el modo sanitizer de esta tool).',
  },
  {
    name: 'Suplantación de usuario (github vs gíthub)',
    how: 'Perfil con nombre homoglifo del de una víctima: revisores de PR y mentores de paquetes caen en el engaño.',
    example: 'Committer «linus» con «i» cirílica en el CHANGELOG de tu repo',
    defense: 'Copianotype: compara el esqueleto (sección ② de esta tool) de usuarios sensibles en CI.',
  },
]

export const HOMOGLYPH_LIMITS: string[] = [
  'La tabla de confusables es un subconjunto esencial (no la TR39 completa de ~150k pares): cubre lo que aparece en campañas reales.',
  'El decodificador punycode es propio y soporta labels normales; labels corruptas devuelven null en lugar de explotar.',
  'La puntuación de riesgo es heurística: un español con acentos dispara «medium» legítimamente; lee el motivo, no solo el semáforo.',
  'Nada sale de tu navegador: todo se calcula con tablas locales, 100% client-side.',
]
