/* ── BIP39 Seed Lab · Ronda 17 ────────────────────────────────────────────
   Genera y valida mnemonics reales BIP39 (interoperables con wallets) y
   enseña la anatomía: entropía → checksum SHA-256 → palabras → seed PBKDF2.
   Todo offline con la wordlist oficial embebida. Avisos duros de seguridad:
   una seed REAL escrita aquí es una seed comprometida. */

import { BIP39_WORDS, BIP39_WORDSET } from './bip39-wordlist'
import { syncHash } from './hash'

export const BIP39_STRENGTHS = [
  { words: 12, entropyBits: 128, checksumBits: 4 },
  { words: 15, entropyBits: 160, checksumBits: 5 },
  { words: 18, entropyBits: 192, checksumBits: 6 },
  { words: 21, entropyBits: 224, checksumBits: 7 },
  { words: 24, entropyBits: 256, checksumBits: 8 },
] as const

export type Bip39Strength = (typeof BIP39_STRENGTHS)[number]['words']

/* ---------- 1. Generación ---------- */

function bytesToBits(bytes: Uint8Array): string {
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  return bits
}

/** Genera un mnemonic BIP39 válido de N palabras con entropía criptográfica. */
export function bip39Generate(words: Bip39Strength = 12): string[] {
  const spec = BIP39_STRENGTHS.find((s) => s.words === words) ?? BIP39_STRENGTHS[0]
  const entropyBytes = spec.entropyBits / 8
  const entropy = crypto.getRandomValues(new Uint8Array(entropyBytes))
  return bip39FromEntropy(entropy)
}

/** Construye el mnemonic desde una entropía concreta (para reproducibilidad y tests). */
export function bip39FromEntropy(entropy: Uint8Array): string[] {
  const entBits = entropy.length * 8
  const spec = BIP39_STRENGTHS.find((s) => s.entropyBits === entBits)
  if (!spec) throw new Error(`Entropía de ${entBits} bits no soportada (usa 128/160/192/224/256)`)
  const csBits = spec.checksumBits
  const hashHex = syncHash('SHA256', entropy)
  const hashBits = bytesToBits(hexToBytes(hashHex))
  const bits = bytesToBits(entropy) + hashBits.slice(0, csBits)
  const out: string[] = []
  for (let i = 0; i < bits.length; i += 11) {
    const idx = parseInt(bits.slice(i, i + 11), 2)
    out.push(BIP39_WORDS[idx])
  }
  return out
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/* ---------- 2. Validación ---------- */

export interface Bip39Validation {
  ok: boolean
  errors: string[]
  wordCount: number
  invalidWords: string[]
  notInWordlist: string[]
  expectedChecksum: string
  actualChecksum: string
  entropyHex: string
  seedPreview: string
  strengthBits: number | null
}

/** Valida un mnemonic completo: wordlist, longitud, checksum y derivación de seed. */
export function bip39Validate(mnemonic: string): Bip39Validation {
  const errors: string[] = []
  const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const invalidWords: string[] = []
  const notInWordlist: string[] = []

  if (words.length === 0) {
    return { ok: false, errors: ['Introduce un mnemonic'], wordCount: 0, invalidWords: [], notInWordlist: [], expectedChecksum: '', actualChecksum: '', entropyHex: '', seedPreview: '', strengthBits: null }
  }

  for (const w of words) {
    if (!/^[a-z]+$/.test(w)) invalidWords.push(w)
    else if (!BIP39_WORDSET.has(w)) notInWordlist.push(w)
  }
  if (invalidWords.length) errors.push(`${invalidWords.length} palabra(s) con caracteres inválidos: ${invalidWords.join(', ')}`)
  if (notInWordlist.length) errors.push(`${notInWordlist.length} palabra(s) fuera de la wordlist BIP39 inglés: ${notInWordlist.join(', ')}`)
  if (![12, 15, 18, 21, 24].includes(words.length)) errors.push(`Longitud ${words.length} no válida: BIP39 usa 12/15/18/21/24 palabras`)

  const spec = BIP39_STRENGTHS.find((s) => s.words === words.length)
  let entropyHex = ''
  let expectedChecksum = ''
  let actualChecksum = ''
  let seedPreview = ''

  if (spec && notInWordlist.length === 0 && invalidWords.length === 0) {
    const bits = words.map((w) => BIP39_WORDS.indexOf(w).toString(2).padStart(11, '0')).join('')
    const entBits = bits.slice(0, spec.entropyBits)
    const csBits = bits.slice(spec.entropyBits)
    const entBytes = new Uint8Array(spec.entropyBits / 8)
    for (let i = 0; i < entBytes.length; i++) entBytes[i] = parseInt(entBits.slice(i * 8, i * 8 + 8), 2)
    entropyHex = Array.from(entBytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  const hashBits = bytesToBits(hexToBytes(syncHash('SHA256', entBytes)))
  expectedChecksum = hashBits.slice(0, spec.checksumBits)
    actualChecksum = csBits
    if (expectedChecksum !== csBits) {
      errors.push(`Checksum inválido: las palabras codifican «${csBits}» pero la entropía exige «${expectedChecksum}». Palabra corrupta o mnemonic inventado`)
    }
    // La seed real (PBKDF2, async) se deriva aparte desde la UI con bip39Seed()
  }

  return {
    ok: errors.length === 0,
    errors,
    wordCount: words.length,
    invalidWords,
    notInWordlist,
    expectedChecksum,
    actualChecksum,
    entropyHex,
    seedPreview,
    strengthBits: spec?.entropyBits ?? null,
  }
}

/** Deriva la seed real (async) para mostrar en la UI. */
export async function bip39Seed(mnemonic: string, passphrase = ''): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(mnemonic.normalize('NFKD')), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', salt: enc.encode('mnemonic' + passphrase), iterations: 2048 }, key, 512)
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/* ---------- 3. Reparación: fuerza bruta de palabra corrupta ---------- */

export interface RepairResult {
  found: boolean
  candidates: { word: string; index: number; wordIndex: number }[]
  tried: number
  note: string
}

/** Si cambiaste UNA palabra y el checksum falla, prueba las 2048 opciones
 *  en esa posición (y verifica el checksum). Solo sirve para mnemonics propios. */
export function bip39BruteFix(mnemonic: string, position: number, maxCandidates = 5): RepairResult {
  const words = mnemonic.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const found: { word: string; index: number; wordIndex: number }[] = []
  let tried = 0
  if (position < 0 || position >= words.length) return { found: false, candidates: [], tried: 0, note: 'Posición fuera de rango' }
  if (![12, 15, 18, 21, 24].includes(words.length)) return { found: false, candidates: [], tried: 0, note: 'Longitud no estándar: no se puede reparar por checksum' }

  for (let i = 0; i < BIP39_WORDS.length; i++) {
    tried++
    const trial = [...words]
    trial[position] = BIP39_WORDS[i]
    const v = bip39ValidateQuick(trial)
    if (v) {
      found.push({ word: BIP39_WORDS[i], index: i, wordIndex: position })
      if (found.length >= maxCandidates) break
    }
  }
  return {
    found: found.length > 0,
    candidates: found,
    tried,
    note: found.length > 0
      ? `${found.length} candidato(s) válidos por checksum. Si son varios, el contexto (¿qué palabra recuerdas mal?) decide`
      : `Ninguna palabra en la posición ${position} produce un checksum válido: el error está en OTRA posición`,
  }
}

function bip39ValidateQuick(words: string[]): boolean {
  const spec = BIP39_STRENGTHS.find((s) => s.words === words.length)
  if (!spec) return false
  for (const w of words) if (!BIP39_WORDSET.has(w)) return false
  const bits = words.map((w) => BIP39_WORDS.indexOf(w).toString(2).padStart(11, '0')).join('')
  const entBits = bits.slice(0, spec.entropyBits)
  const csBits = bits.slice(spec.entropyBits)
  const entBytes = new Uint8Array(spec.entropyBits / 8)
  for (let i = 0; i < entBytes.length; i++) entBytes[i] = parseInt(entBits.slice(i * 8, i * 8 + 8), 2)
  const hashBits = bytesToBits(hexToBytes(syncHash('SHA256', entBytes)))
  return hashBits.slice(0, spec.checksumBits) === csBits
}

/* ---------- 4. Anatomía y seguridad ---------- */

export interface EntropyMap {
  bits: string
  groups: { bits: string; word: string; index: number; isChecksumMark: boolean }[]
}

/** Muestra qué trozos de bits forman cada palabra (checksum incluido). */
export function bip39Anatomy(words: string[]): EntropyMap | null {
  const spec = BIP39_STRENGTHS.find((s) => s.words === words.length)
  if (!spec || !words.every((w) => BIP39_WORDSET.has(w))) return null
  const bits = words.map((w) => BIP39_WORDS.indexOf(w).toString(2).padStart(11, '0')).join('')
  const checksumStart = spec.entropyBits
  // El checksum (≤ 11 bits) vive SIEMPRE íntegro en la última palabra
  const groups = words.map((w, i) => ({
    bits: bits.slice(i * 11, i * 11 + 11),
    word: w,
    index: BIP39_WORDS.indexOf(w),
    isChecksumMark: i === words.length - 1,
  }))
  return { bits, groups }
}

export const BIP39_SECURITY: { title: string; lesson: string }[] = [
  { title: 'Una seed vista es una seed perdida', lesson: 'Si pegas aquí tu mnemonic REAL de wallet, ya no es tu seed: esta página corre en TU navegador, pero la regla es «nunca la escribes en nada conectado». Usa la tool con seeds de prueba.' },
  { title: 'El checksum no es contraseña', lesson: 'El checksum detecta errores de tecleo (1 de cada 16 mnemonics mal copiados fallará), pero NO protege: quien tenga las palabras tiene el dinero. La seguridad es la entropía de 128-256 bits.' },
  { title: '12 vs 24 palabras', lesson: '128 bits vs 256 bits de entropía. Ambos resisten fuerza bruta física: 24 no es «el doble de seguro», es astronómicamente más. La diferencia práctica: el papel que lo guarda.' },
  { title: 'La passphrase 25ª palabra', lesson: 'BIP39 admite una passphrase opcional: sin ella la seed deriva igual; con ella, incluso quien robe tus palabras necesita además la frase. Es la única defensa real si el papel se filtra.' },
  { title: 'Nunca digitalices', lesson: 'Foto, nube, gestor de contraseñas, OCR: cada copia digital multiplica el riesgo. Acero grabado > papel > (nunca) digital.' },
]

export const BIP39_LIMITS: string[] = [
  'La derivación de seed usa PBKDF2-HMAC-SHA512 con WebCrypto (2048 iteraciones) conforme a BIP39: los mnemonics generados son interoperables con wallets reales.',
  'La validación del checksum es local y síncrona con la wordlist oficial embebida (2048 palabras).',
  'La fuerza bruta de reparación asume UNA palabra corrupta: con dos o más, el espacio crece a millones de combinaciones.',
  'Este lab es educativo: no sustituye el software de una wallet para gestionar fondos reales.',
]
