/* Generador de contraseñas + análisis de fortaleza (zxcvbn) + comprobación de filtraciones */

import { ZxcvbnFactory, Options } from '@zxcvbn-ts/core'
import * as zxcvbnCommon from '@zxcvbn-ts/language-common'

let zxcvbnInstance: ZxcvbnFactory | null = null
function ensureZxcvbn(): ZxcvbnFactory {
  if (!zxcvbnInstance) {
    const options = new Options({
      dictionary: {
        ...zxcvbnCommon.dictionary,
      },
      graphs: zxcvbnCommon.adjacencyGraphs,
    })
    zxcvbnInstance = new ZxcvbnFactory(options)
  }
  return zxcvbnInstance
}

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
  ambiguous: 'il1Lo0O',
}

export interface GenOptions {
  length: number
  upper: boolean
  lower: boolean
  digits: boolean
  symbols: boolean
  noAmbiguous: boolean
}

export function generatePassword(o: GenOptions): string {
  let pool = ''
  const required: string[] = []
  if (o.lower) {
    const set = CHARSETS.lower
    pool += set
    required.push(set)
  }
  if (o.upper) {
    const set = CHARSETS.upper
    pool += set
    required.push(set)
  }
  if (o.digits) {
    const set = CHARSETS.digits
    pool += set
    required.push(set)
  }
  if (o.symbols) {
    const set = CHARSETS.symbols
    pool += set
    required.push(set)
  }
  if (o.noAmbiguous) pool = [...pool].filter((c) => !CHARSETS.ambiguous.includes(c)).join('')
  if (!pool) pool = CHARSETS.lower
  // secure random sin sesgo por módulo
  const pickRandom = (set: string): string => {
    const bytes = crypto.getRandomValues(new Uint32Array(1))[0]
    return set[bytes % set.length]
  }
  let out: string[] = []
  // garantiza al menos un carácter de cada set requerido
  for (const set of required) out.push(pickRandom(o.noAmbiguous ? [...set].filter((c) => !CHARSETS.ambiguous.includes(c)).join('') || set : set))
  while (out.length < o.length) out.push(pickRandom(pool))
  // Fisher-Yates con crypto
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, o.length).join('')
}

export const WORDS_ES = [
  'abismo', 'acorde', 'aguila', 'alba', 'andes', 'ardilla', 'astillero', 'atlas', 'azahar', 'bahia', 'barranco',
  'bosque', 'brasa', 'brujula', 'cactus', 'cascada', 'ceniza', 'chispa', 'cielo', 'cobre', 'cometa', 'cordillera',
  'cristal', 'cuervo', 'delta', 'duna', 'esmeralda', 'estuario', 'eucalipto', 'faro', 'flamenco', 'fuego',
  'glaciar', 'granito', 'hada', 'halcon', 'hocico', 'iceberg', 'jacaranda', 'jaguar', 'karaoke', 'laberinto',
  'lago', 'latitud', 'legado', 'lima', 'luciernaga', 'madera', 'manantial', 'marmol', 'meridiano', 'montana',
  'neblina', 'nomada', 'nube', 'oceano', 'orquidea', 'palmera', 'pantera', 'pedernal', 'peligro', 'pendulo',
  'perla', 'pico', 'piedra', 'pirata', 'planicie', 'pradera', 'quimera', 'rambla', 'raiz', 'rocio', 'ruta',
  'salitre', 'selva', 'sierra', 'solsticio', 'sotano', 'talanquera', 'teja', 'temporada', 'terral', 'tormenta',
  'tractor', 'umbria', 'valle', 'vapor', 'veleta', 'ventisca', 'vereda', 'vertice', 'vino', 'yacimiento', 'yegua',
  'zanahoria', 'zenit', 'zorzal', 'acantilado', 'admiral', 'agencia', 'algebra', 'algoritmo', 'analisis',
]

export function generatePassphrase(words: number, separator: string, capitalize: boolean, addNumber: boolean): string {
  const out: string[] = []
  for (let i = 0; i < words; i++) {
    const bytes = crypto.getRandomValues(new Uint32Array(1))[0]
    let w = WORDS_ES[bytes % WORDS_ES.length]
    if (capitalize) w = w.charAt(0).toUpperCase() + w.slice(1)
    out.push(w)
  }
  let result = out.join(separator)
  if (addNumber) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 100
    result += separator + n.toString().padStart(2, '0')
  }
  return result
}

export function generatePin(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += crypto.getRandomValues(new Uint32Array(1))[0] % 10
  return out
}

export interface Strength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  suggestions: string[]
  guessesLog10: number
  feedback: string
  crackTime: string
}

const LABELS = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte']

export function analyzeStrength(password: string): Strength {
  const r = ensureZxcvbn().check(password)
  const label = LABELS[r.score]
  const suggestions: string[] = []
  if (password.length < 12) suggestions.push('Alarga la contraseña a 12+ caracteres')
  if (!/[A-Z]/.test(password)) suggestions.push('Añade mayúsculas')
  if (!/[a-z]/.test(password)) suggestions.push('Añade minúsculas')
  if (!/[0-9]/.test(password)) suggestions.push('Añade dígitos')
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Añade símbolos')
  const crackTime = humanizeCrackTime(r.guesses)
  return {
    score: r.score as Strength['score'],
    label,
    suggestions: suggestions.length ? suggestions : r.feedback.suggestions ?? [],
    guessesLog10: Math.log10(Math.max(r.guesses, 1)),
    feedback: r.feedback.warning ?? 'Sin patrones conocidos detectados',
    crackTime,
  }
}

function humanizeCrackTime(guesses: number): string {
  // asume 1e11 intentos/segundo (ataque offline con GPU dedicada)
  const seconds = guesses / 1e11
  if (seconds < 1) return 'instantáneo'
  const units: [number, string][] = [
    [1, 'segundo'], [60, 'minuto'], [3600, 'hora'], [86400, 'día'],
    [2592000, 'mes'], [31536000, 'año'], [31536000000, 'milenio'],
  ]
  let best = units[0]
  let bestVal = seconds
  for (const u of units) {
    const v = seconds / u[0]
    if (v >= 1) {
      best = u
      bestVal = v
    }
  }
  const v = bestVal
  const fmt = v >= 100 ? Math.round(v).toLocaleString('es-ES') : v.toFixed(1)
  return `${fmt} ${best[1]}${v >= 2 ? 's' : ''}`
}

/* HaveIBeenPwned k-anonymity (solo se envían 5 chars del SHA-1) */
export async function checkPwned(password: string): Promise<{ count: number; sha1: string }> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password))
  const sha1 = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
  const text = await res.text()
  for (const line of text.split('\n')) {
    const [hash, count] = line.trim().split(':')
    if (hash === suffix) return { count: parseInt(count ?? '0'), sha1 }
  }
  return { count: 0, sha1 }
}

/* Cracker de hashes en un worker separado */
export const startHashCrackWorker = (code: string): Worker => {
  const blob = new Blob([code], { type: 'text/javascript' })
  return new Worker(URL.createObjectURL(blob))
}