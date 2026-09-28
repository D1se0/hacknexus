/* ── Classical Cipher Breaker · Ronda 17 ──────────────────────────────────
   Criptoanálisis REAL de cifrados clásicos, no un catálogo: resuelve Caesar
   automáticamente (chi-cuadrado), Vigenère (Kasiski + IC + Caesar por
   columnas), sustitución monoalfabética (hill-climbing con cuadrigramas),
   Atbash, ROT47, XOR de un byte y afín. Todo 100% local, pensado para
   CTFs y para entender POR QUÉ caen estos cifrados. */

export type Lang = 'es' | 'en'

/* ---------- 1. Estadística de idioma ---------- */

export const ES_FREQ: Record<string, number> = {
  a: 11.53, b: 1.49, c: 4.02, d: 4.68, e: 13.68, f: 0.69, g: 1.0, h: 0.7, i: 6.25,
  j: 0.44, k: 0.02, l: 4.97, m: 3.16, n: 6.71, ñ: 0.17, o: 8.68, p: 2.51, q: 0.88,
  r: 6.87, s: 7.98, t: 4.63, u: 2.93, v: 0.9, w: 0.01, x: 0.22, y: 0.9, z: 0.47,
}

export const EN_FREQ: Record<string, number> = {
  a: 8.2, b: 1.5, c: 2.8, d: 4.3, e: 12.7, f: 2.2, g: 2.0, h: 6.1, i: 7.0,
  j: 0.15, k: 0.77, l: 4.0, m: 2.4, n: 6.7, o: 7.5, p: 1.9, q: 0.1, r: 6.0,
  s: 6.3, t: 9.1, u: 2.8, v: 0.98, w: 2.4, x: 0.15, y: 2.0, z: 0.07,
}

const normFreq = (f: Record<string, number>) => {
  const clean: Record<string, number> = {}
  let sum = 0
  for (const [k, v] of Object.entries(f)) {
    const kk = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    clean[kk] = (clean[kk] ?? 0) + v
    sum += v
  }
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(clean)) out[k] = v / sum
  return out
}
const FREQ_N: Record<Lang, Record<string, number>> = { es: normFreq(ES_FREQ), en: normFreq(EN_FREQ) }

/** Chi-cuadrado entre las frecuencias del texto y las del idioma. Menor = mejor. */
export function chiSquared(text: string, lang: Lang): number {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
  const counts: Record<string, number> = {}
  for (const ch of clean) counts[ch] = (counts[ch] ?? 0) + 1
  const n = clean.length
  if (n === 0) return Infinity
  const expected = FREQ_N[lang]
  let chi = 0
  for (const letter of 'abcdefghilmnopqrstuvwxzy'.replace('x', '')) {
    const obs = (counts[letter] ?? 0) / n
    const exp = expected[letter] ?? 0.001
    chi += (obs - exp) * (obs - exp) / exp
  }
  return chi
}

/** Índice de coincidencia: probabilidad de que dos letras al azar sean iguales.
 *  ~0.065 idioma natural · ~0.038 aleatorio. */
export function indexOfCoincidence(text: string): number {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
  const n = clean.length
  if (n < 2) return 0
  const counts: Record<string, number> = {}
  for (const ch of clean) counts[ch] = (counts[ch] ?? 0) + 1
  let sum = 0
  for (const c of Object.values(counts)) sum += c * (c - 1)
  return sum / (n * (n - 1))
}

/* ---------- 2. Caesar ---------- */

export function caesarShift(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 65 && code <= 90) out += String.fromCharCode(((code - 65 + s) % 26) + 65)
    else if (code >= 97 && code <= 122) out += String.fromCharCode(((code - 97 + s) % 26) + 97)
    else out += ch
  }
  return out
}

export interface CaesarGuess {
  shift: number
  plain: string
  chi: number
}

/** Resuelve Caesar probando los 26 turnos y quedando el mejor por chi².
 *  Devuelve el top N para mostrar la tabla. */
export function caesarBreak(text: string, lang: Lang, top = 3): CaesarGuess[] {
  const all: CaesarGuess[] = []
  for (let s = 0; s < 26; s++) {
    const plain = caesarShift(text, -s)
    all.push({ shift: s, plain, chi: chiSquared(plain, lang) })
  }
  all.sort((a, b) => a.chi - b.chi)
  return all.slice(0, top)
}

/* ---------- 3. Vigenère ---------- */

/** Distancias entre repeticiones de trigramas (Kasiski). */
export function kasiskiDistances(text: string, maxLen = 4000): { seq: string; distances: number[] }[] {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').slice(0, maxLen)
  const positions = new Map<string, number[]>()
  for (let i = 0; i + 3 <= clean.length; i++) {
    const trigram = clean.slice(i, i + 3)
    const arr = positions.get(trigram) ?? []
    arr.push(i)
    positions.set(trigram, arr)
  }
  const out: { seq: string; distances: number[] }[] = []
  for (const [seq, arr] of positions) {
    if (arr.length < 2) continue
    const distances: number[] = []
    for (let i = 1; i < arr.length; i++) distances.push(arr[i] - arr[i - 1])
    out.push({ seq, distances })
  }
  out.sort((a, b) => b.distances.length - a.distances.length)
  return out.slice(0, 5)
}

/** Longitud de clave candidata: método Friedman por autocorrelación (robusto
 *  con textos cortos) + IC por columnas como valor mostrado. La longitud real
 *  se confirma porque SUS MÚLTIPLOS (2k, 3k) también puntúan alto. */
export function vigenereKeyLength(text: string, maxKey = 16): { keyLen: number; avgIc: number }[] {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
  const n = clean.length
  if (n < 10) return []
  const capped = Math.min(maxKey, Math.floor(n / 8))

  // rate[k] = P(c(i) = c(i+k)): ~0,066 si k es múltiplo de la longitud real, ~0,038 si no
  const rates: number[] = [0]
  for (let k = 1; k <= capped; k++) {
    let match = 0
    for (let i = 0; i + k < n; i++) if (clean[i] === clean[i + k]) match++
    rates[k] = match / (n - k)
  }

  const inner = rates.slice(1).sort((a, b) => a - b)
  const baseline = inner[Math.floor(inner.length / 2)]
  const peak = inner[inner.length - 1]
  const threshold = peak - baseline < 0.005 ? peak : baseline + 0.5 * (peak - baseline)
  const qualifies = (k: number) => rates[k] >= threshold

  // La longitud real confirma con sus múltiplos; si no hay múltiplos comprobables, se acepta tal cual
  let primary = 0
  for (let k = 1; k <= capped; k++) {
    if (!qualifies(k)) continue
    const mult2 = 2 * k <= capped && qualifies(2 * k)
    const mult3 = 3 * k <= capped && qualifies(3 * k)
    if (mult2 || mult3 || 2 * k > capped) {
      primary = k
      break
    }
  }
  if (!primary) for (let k = 1; k <= capped; k++) if (qualifies(k)) { primary = k; break }

  // IC por columnas: el valor clásico (~0,0667 en la longitud correcta)
  const colIc = (klen: number): number => {
    let sum = 0
    let cols = 0
    for (let col = 0; col < klen; col++) {
      let column = ''
      for (let i = col; i < clean.length; i += klen) column += clean[i]
      if (column.length >= 2) {
        sum += indexOfCoincidence(column)
        cols++
      }
    }
    return cols ? sum / cols : 0
  }

  const rest = Array.from({ length: capped }, (_, i) => ({ keyLen: i + 1, avgIc: colIc(i + 1) })).filter((r) => r.keyLen !== primary).sort((a, b) => rates[b.keyLen] - rates[a.keyLen])
  const mults = rest.filter((r) => primary > 0 && r.keyLen % primary === 0)
  const others = rest.filter((r) => !(primary > 0 && r.keyLen % primary === 0))
  const head = primary > 0 ? [{ keyLen: primary, avgIc: colIc(primary) }] : []
  return [...head, ...mults, ...others].slice(0, 5)
}

function vigenereShiftChar(ch: string, shift: number, decrypt: boolean): string {
  const code = ch.codePointAt(0)!
  if (code >= 65 && code <= 90) {
    const base = 65
    const s = decrypt ? -shift : shift
    return String.fromCharCode(((code - base + ((s % 26) + 26)) % 26) + base)
  }
  if (code >= 97 && code <= 122) {
    const base = 97
    const s = decrypt ? -shift : shift
    return String.fromCharCode(((code - base + ((s % 26) + 26)) % 26) + base)
  }
  return ch
}

export function vigenereApply(text: string, key: string, decrypt: boolean): string {
  const k = key.toLowerCase().replace(/[^a-z]/g, '')
  if (!k) return text
  let out = ''
  let ki = 0
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
    if (isLetter) {
      out += vigenereShiftChar(ch, k.charCodeAt(ki % k.length) - 97, decrypt)
      ki++
    } else out += ch
  }
  return out
}

export interface VigenereSolve {
  keyLength: number
  key: string
  plain: string
  avgIc: number
}

/** Resuelve Vigenère: deduce longitud (IC), y para cada columna resuelve un
 *  Caesar independiente por chi². */
export function vigenereSolve(text: string, lang: Lang, assumeKeyLen?: number): VigenereSolve {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
  const candidates = assumeKeyLen ? [assumeKeyLen] : vigenereKeyLength(text).map((r) => r.keyLen)
  let best: VigenereSolve | null = null

  for (const klen of candidates) {
    if (klen < 1 || klen > 24 || clean.length < klen * 2) continue
    let key = ''
    let chiSum = 0
    for (let col = 0; col < klen; col++) {
      let column = ''
      for (let i = col; i < clean.length; i += klen) column += clean[i]
      let bestShift = 0
      let bestChi = Infinity
      for (let s = 0; s < 26; s++) {
        const shifted = caesarShift(column, -s)
        const chi = chiSquared(shifted, lang)
        if (chi < bestChi) {
          bestChi = chi
          bestShift = s
        }
      }
      key += String.fromCharCode(97 + bestShift)
      chiSum += bestChi
    }
    const plain = vigenereApply(text, key, true)
    const avgIc = indexOfCoincidence(plain)
    const score = chiSum / klen
    if (!best || score < (best as VigenereSolve & { _score?: number })._score!) {
      best = { keyLength: klen, key, plain, avgIc }
      ;(best as VigenereSolve & { _score?: number })._score = score
    }
  }
  return best ?? { keyLength: 0, key: '', plain: text, avgIc: 0 }
}

/* ---------- 4. Sustitución monoalfabética (hill-climbing) ---------- */

/** Cuadrigramas frecuentes ES/EN (subconjunto de alta cobertura para scoring). */
const QUADS_ES = ['tion', 'acion', 'iente', 'mente', 'esta', 'ando', 'ient', 'que ', 'de l', 'la d', 'ció ', 'ión ', 'nto ', 'ante', 'para', 'como', 'pero', 'unas', 'todo', 'sino', 'vida', 'tiem', 'sde ', 'n el', 'en l', 'de e', 'ado ', 'iera', 'ció', 'que', 'del', 'las', 'los', 'una', 'por', 'con', 'está', 'hace', 'muy ']
const QUADS_EN = ['tion', 'that', 'ther', 'with', 'here', 'ould', 'ight', 'have', 'hich', 'wher', 'this', 'thin', 'they', 'atio', 'ever', 'from', 'hone', 'ough', 'said', 'tain', 'what', 'when', 'will', 'your', 'each', 'know', 'ment', 'reco', 'ount']

function quadScore(text: string, lang: Lang): number {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '')
  const quads = lang === 'es' ? QUADS_ES : QUADS_EN
  let score = 0
  for (let i = 0; i + 4 <= clean.length; i++) {
    if (quads.includes(clean.slice(i, i + 4))) score += 3
  }
  // Bonus por estructura: vocales alternadas y sin tríadas imposibles
  const vowels = (clean.match(/[aeiou]/g) ?? []).length / Math.max(1, clean.length)
  if (vowels > 0.3 && vowels < 0.55) score += 2
  return score
}

export interface SubstitutionResult {
  keyMap: Record<string, string>
  plain: string
  score: number
  iterations: number
  confidence: 'alta' | 'media' | 'baja'
}

/** Hill-climbing clásico: empieza con mapeo por frecuencia y swapera pares
 *  aceptando mejoras. Determinista con la semilla dada. */
export function substitutionSolve(ciphertext: string, lang: Lang, maxRounds = 4000): SubstitutionResult {
  const clean = ciphertext.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '')
  if (clean.length < 20) return { keyMap: {}, plain: ciphertext, score: 0, iterations: 0, confidence: 'baja' }

  const alpha = 'abcdefghijklmnopqrstuvwxyz'
  // Mapeo inicial por frecuencia de aparición
  const counts: Record<string, number> = {}
  for (const ch of clean) if (alpha.includes(ch)) counts[ch] = (counts[ch] ?? 0) + 1
  const byFreq = alpha.split('').sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
  const langOrder = lang === 'es' ? 'eaoslirndtucmpbgvyqhfzjñxkw' : 'etaoinshrdlcumwfgypbvkjxqz'
  let key = ''
  for (let i = 0; i < 26; i++) key += langOrder[i % langOrder.length] ?? 'x'
  // byFreq[i] cifra → key[i] plano
  const applyKey = (k: string) => {
    let out = ''
    for (const ch of clean) {
      const idx = byFreq.indexOf(ch)
      out += idx >= 0 ? k[idx] : ch
    }
    return out
  }

  let bestKey = key
  let bestScore = quadScore(applyKey(key), lang)
  let iterations = 0
  for (let round = 0; round < maxRounds; round++) {
    const i = Math.floor((round * 7919) % 26)
    const j = Math.floor((round * 104729) % 26)
    if (i === j) continue
    const arr = bestKey.split('')
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    const candidate = arr.join('')
    const score = quadScore(applyKey(candidate), lang)
    iterations++
    if (score > bestScore) {
      bestScore = score
      bestKey = candidate
    }
  }

  const keyMap: Record<string, string> = {}
  byFreq.forEach((c, idx) => {
    keyMap[c] = bestKey[idx]
  })
  const plain = applyKey(bestKey)
  const maxPossible = Math.floor(clean.length / 4) * 3 + 2
  const ratio = bestScore / Math.max(1, maxPossible)
  const confidence = ratio > 0.55 ? 'alta' : ratio > 0.3 ? 'media' : 'baja'
  return { keyMap, plain, score: bestScore, iterations, confidence }
}

/* ---------- 5. Cifrados simples: Atbash, ROT47, XOR, afinín ---------- */

export function atbash(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 65 && code <= 90) out += String.fromCharCode(90 - (code - 65))
    else if (code >= 97 && code <= 122) out += String.fromCharCode(122 - (code - 97))
    else out += ch
  }
  return out
}

export function rot47(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 33 && code <= 126) out += String.fromCharCode(33 + ((code - 33 + 47) % 94))
    else out += ch
  }
  return out
}

export interface XorGuess {
  key: number
  plain: string
  score: number
}

/** XOR con clave de UN byte: fuerza bruta de 256 claves puntuando imprimibilidad. */
export function xorBruteforce(data: Uint8Array, top = 3): XorGuess[] {
  const results: XorGuess[] = []
  for (let k = 0; k < 256; k++) {
    let plain = ''
    let printable = 0
    for (const b of data) {
      const c = b ^ k
      if ((c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9) printable++
      plain += String.fromCharCode(c)
    }
    const score = printable / Math.max(1, data.length)
    // Bonus por letras y espacios (el inglés/español real es ~80% letras+espacios; el ASCII puro sin palabras no gana)
    let letters = 0
    let spaces = 0
    for (const ch of plain) {
      if (ch >= 'a' && ch <= 'z') letters++
      else if (ch === ' ') spaces++
    }
    results.push({ key: k, plain, score: score + ((letters + spaces) / Math.max(1, data.length)) * 0.5 })
  }
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, top)
}

export function xorApply(text: string, key: string): string {
  if (!key) return text
  let out = ''
  for (let i = 0; i < text.length; i++) out += String.fromCharCode(text.codePointAt(i)! ^ key.charCodeAt(i % key.length))
  return out
}

export function affineApply(text: string, a: number, b: number, decrypt: boolean): string {
  const modInv = (x: number, m: number): number | null => {
    for (let i = 1; i < m; i++) if ((x * i) % m === 1) return i
    return null
  }
  const aInv = decrypt ? modInv(((a % 26) + 26) % 26, 26) : 1
  if (decrypt && aInv === null) return `«a=${a}» no es coprimo con 26: no es invertible`
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 65 && code <= 90) {
      const x = code - 65
      out += String.fromCharCode(((decrypt ? aInv! * (x - b + 26) : a * x + b) % 26 + 26) % 26 + 65)
    } else if (code >= 97 && code <= 122) {
      const x = code - 97
      out += String.fromCharCode(((decrypt ? aInv! * (x - b + 26) : a * x + b) % 26 + 26) % 26 + 97)
    } else out += ch
  }
  return out
}

/* ---------- 6. Detección: ¿qué cifrado es? ---------- */

export interface CipherDiagnosis {
  guess: string
  why: string
  nextStep: string
}

/** Heurísticas orientativas a partir del texto cifrado. */
export function diagnose(text: string): CipherDiagnosis {
  const clean = text.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
  const ic = indexOfCoincidence(clean)
  const hasNonAlpha = /[^a-z\s]/i.test(text)
  const hasDigits = /\d/.test(text)
  const avgWordLen = clean.length / Math.max(1, (text.match(/[a-zA-Z]+/g) ?? []).length)

  if (clean.length < 10) return { guess: 'muestra muy corta', why: 'Necesito al menos ~10 letras para que la estadística diga algo', nextStep: 'Pega más texto cifrado' }
  if (ic > 0.06 && hasNonAlpha && /[0-9a-f]{2}/i.test(text)) return { guess: 'hex o encoding (no es un cifrado clásico)', why: 'Pares hex con IC de natural: probablemente es bytes codificados', nextStep: 'Pásalo por la tool de encoders/hex de la suite' }
  if (ic > 0.06) return { guess: 'sustitución monoalfabética (Caesar, Atbash, afín o general)', why: `IC = ${ic.toFixed(4)}: la estructura del idioma sigue intacta`, nextStep: 'Lanza el solver de Caesar; si no cuadra, sustitución general' }
  if (ic > 0.045) return { guess: 'Vigenère con clave larga o transposición', why: `IC = ${ic.toFixed(4)}: entre natural (0.066) y aleatorio (0.038)`, nextStep: 'Mira la tabla de longitudes por Kasiski/IC' }
  if (ic > 0.038) return { guess: 'polialfabético con clave corta-media', why: 'IC bajo pero no aleatorio puro: quedan restos de estructura', nextStep: 'Vigenère solver con longitud 8-16' }
  return { guess: 'aleatorio o moderno (AES, bytes binarios, compresión)', why: `IC = ${ic.toFixed(4)} ≈ aleatorio: nada clásico que romper`, nextStep: 'Revisa cabeceras mágicas/encoding antes de asumir cripto fuerte' }
}

/* ---------- 7. Catálogo didáctico ---------- */

export const CLASSCIPHER_PRIMER: { cipher: string; era: string; how: string; howBroken: string }[] = [
  { cipher: 'Caesar (shift)', era: 'Roma, s. I a.C.', how: 'Cada letra se desplaza k posiciones en el alfabeto.', howBroken: '26 claves = fuerza bruta trivial; el chi-cuadrado lo resuelve sin probar a mano.' },
  { cipher: 'Vigenère', era: '1553 (el «cifrado indescifrable»)', how: 'Caesar con clave repetida: cada letra usa un turno distinto según la clave.', howBroken: 'Kasiski (repeticiones) e IC deducen la longitud; luego es N Caesars independientes. Roto desde 1863.' },
  { cipher: 'Sustitución general', era: 'Edad Media', how: 'Alfabeto de sustitución arbitrario: 26! claves.', howBroken: 'El idioma NO es uniforme: con cuadrigramas y hill-climbing, 300 letras suelen bastar.' },
  { cipher: 'Atbash', era: 'Hebreo antiguo', how: 'Alfabeto invertido (a↔z).', howBroken: 'Es un Caesar de k=25... se auto-descifra.' },
  { cipher: 'ROT13 / ROT47', era: 'Usenet, s. XX', how: 'ROT13: Caesar fijo k=13 para ocultar spoilers. ROT47: 94 caracteres ASCII.', howBroken: 'Ninguno es cifrado: ofuscación social. Una pasada más lo descifra (es involutivo).' },
  { cipher: 'Afín', era: 'Clásico', how: 'y = (a·x + b) mod 26 con a coprimo de 26: 312 claves.', howBroken: 'Fuerza bruta de 312 claves o dos letras conocidas resuelven (a, b) por álgebra.' },
  { cipher: 'XOR de un byte', era: 'Reto clásico de CTF', how: 'Cada byte se XOR-ea con la misma clave de 8 bits.', howBroken: '256 claves: la puntuación de imprimibilidad + frecuencia delata la clave en microsegundos.' },
]

export const CLASSCIPHER_LIMITS: string[] = [
  'El solver de sustitución usa cuadrigramas de alta cobertura, no la tabla completa: con textos cortos (<100 letras) la confianza puede ser baja; revisa el resultado tú.',
  'El IC y el chi-cuadrado funcionan con texto natural. Si el original es código, coordenadas o palabras sueltas, la estadística engaña.',
  'Vigenère asume clave ≤ 24 y texto ≥ 4·longitud de clave: con menos material las columnas no tienen estadística suficiente.',
  'Estos cifrados caen en milisegundos con este método: esa es la lección. La seguridad moderna (AES, RSA) no comparte estas estructuras.',
]
