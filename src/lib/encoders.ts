/* Codificadores, decodificadores y cifrados clásicos — puros y síncronos */

import { hexToBytes } from './util'

const TE = new TextEncoder()
const TD = new TextDecoder()

/* --------------- Base64 / Base64URL --------------- */

export function b64Encode(s: string): string {
  const bytes = TE.encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

export function b64Decode(s: string): string {
  const norm = s.trim().replace(/-/g, '+').replace(/_/g, '/')
  const pad = norm + '='.repeat((4 - (norm.replace(/=+$/, '').length % 4)) % 4)
  const bin = atob(pad)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return TD.decode(bytes)
}

export const b64UrlEncode = (s: string): string => b64Encode(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/* --------------- Base32 (RFC 4648) --------------- */

const B32A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(s: string): string {
  const bytes = TE.encode(s)
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += B32A[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32A[(value << (5 - bits)) & 31]
  while (out.length % 8 !== 0) out += '='
  return out
}

export function base32Decode(s: string): string {
  const clean = s.toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32A.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return TD.decode(new Uint8Array(out))
}

/* --------------- Base58 (Bitcoin) --------------- */

const B58A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function base58Encode(s: string): string {
  const bytes = TE.encode(s)
  if (bytes.length === 0) return ''
  const digits: number[] = [0]
  for (const byte of bytes) {
    let carry = byte
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let out = ''
  for (const byte of bytes) {
    if (byte === 0) out += B58A[0]
    else break
  }
  for (let i = digits.length - 1; i >= 0; i--) out += B58A[digits[i]]
  return out
}

export function base58Decode(s: string): string {
  const bytes: number[] = []
  for (const ch of s) {
    const val = B58A.indexOf(ch)
    if (val < 0) throw new Error(`Carácter inválido en Base58: "${ch}"`)
    let carry = val
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (const ch of s) {
    if (ch === B58A[0]) bytes.push(0)
    else break
  }
  return TD.decode(new Uint8Array(bytes.reverse()))
}

/* --------------- Base62 --------------- */

const B62A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function base62Encode(s: string): string {
  const bytes = TE.encode(s)
  let hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  if (!hex) return ''
  hex = '1' + hex // evita perder ceros a la izquierda
  const num = BigInt('0x' + hex)
  let n = num
  let out = ''
  while (n > 0n) {
    out = B62A[Number(n % 62n)] + out
    n /= 62n
  }
  return out || B62A[0]
}

export function base62Decode(s: string): string {
  if (!s) return ''
  let n = 0n
  for (const ch of s) {
    const v = B62A.indexOf(ch)
    if (v < 0) throw new Error(`Carácter inválido en Base62: "${ch}"`)
    n = n * 62n + BigInt(v)
  }
  let hex = n.toString(16)
  if (hex.length % 2) hex = '0' + hex
  hex = hex.slice(1) // quita el "1" añadido
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return TD.decode(bytes)
}

/* --------------- Ascii85 (Base85) --------------- */

export function ascii85Encode(s: string): string {
  const bytes = TE.encode(s)
  let out = ''
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = [bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]
    let n = 0
    for (let j = 0; j < 4; j++) n = n * 256 + (chunk[j] ?? 0)
    let block = ''
    if (n === 0 && chunk.length === 4) {
      out += 'z'
      continue
    }
    for (let j = 0; j < 5; j++) block = String.fromCharCode(33 + (n % 85)) + block
    out += block.slice(0, chunk.length + 1)
  }
  return out
}

export function ascii85Decode(s: string): string {
  const clean = s.replace(/\s/g, '')
  const bytes: number[] = []
  let group: number[] = []
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (ch === 'z' && group.length === 0) {
      bytes.push(0, 0, 0, 0)
      continue
    }
    const v = ch.charCodeAt(0) - 33
    if (v < 0 || v > 84) throw new Error(`Carácter inválido en Ascii85: "${ch}"`)
    group.push(v)
    if (group.length === 5) {
      let n = 0
      for (const g of group) n = n * 85 + g
      bytes.push((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff)
      group = []
    }
  }
  if (group.length > 0) {
    const padded = [...group, ...(Array(5 - group.length).fill(84) as number[])]
    let n = 0
    for (const g of padded) n = n * 85 + g
    for (let j = 0; j < group.length - 1; j++) bytes.push((n >>> (24 - j * 8)) & 0xff)
  }
  return TD.decode(new Uint8Array(bytes))
}

/* --------------- Hex / Binario / Octal / Dec --------------- */

export const hexEncode = (s: string): string => Array.from(TE.encode(s), (b) => b.toString(16).padStart(2, '0')).join('')
export const hexDecode = (s: string): string => TD.decode(hexToBytes(s))
export const binEncode = (s: string): string =>
  Array.from(TE.encode(s), (b) => b.toString(2).padStart(8, '0')).join(' ')
export const binDecode = (s: string): string => {
  const bits = s.replace(/[^01]/g, '')
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.substr(i * 8, 8), 2)
  return TD.decode(bytes)
}
export const octalEncode = (s: string): string =>
  Array.from(TE.encode(s), (b) => '\\' + b.toString(8).padStart(3, '0')).join('')
export const decEncode = (s: string): string => Array.from(TE.encode(s), (b) => String(b)).join(' ')

/* --------------- URL / HTML / Unicode --------------- */

export const urlEncode = (s: string): string => encodeURIComponent(s)
export const urlEncodeAll = (s: string): string =>
  Array.from(TE.encode(s), (b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('')
export const urlDecode = (s: string): string => decodeURIComponent(s.replace(/\+/g, ' '))

export function htmlEntities(s: string): string {
  return s.replace(/[&<>"'\u0080-\uFFFF]/g, (c) => {
    if (c === '&') return '&amp;'
    if (c === '<') return '&lt;'
    if (c === '>') return '&gt;'
    if (c === '"') return '&quot;'
    if (c === "'") return '&#x27;'
    return '&#x' + c.codePointAt(0)!.toString(16) + ';'
  })
}

export function htmlUnescape(s: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}

export function unicodeEscape(s: string): string {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp > 0xffff) out += '\\u{' + cp.toString(16) + '}'
    else out += '\\u' + cp.toString(16).padStart(4, '0')
  }
  return out
}

export function unicodeUnescape(s: string): string {
  return s
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

/* --------------- Morse --------------- */

const MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---',
  k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-',
  u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.',
  ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
  '_': '..--.-', '"': '.-..-.', '@': '.--.-.',
}
const MORSE_REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]))

export const morseEncode = (s: string): string =>
  s
    .toLowerCase()
    .split('')
    .map((c) => (c === ' ' ? '/' : MORSE[c] ?? ''))
    .filter(Boolean)
    .join(' ')

export function morseDecode(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((t) => (t === '/' ? ' ' : MORSE_REV[t] ?? '?'))
    .join('')
}

/* --------------- ROT / César / Vigenère / Atbash / XOR --------------- */

export function caesar(s: string, shift: number): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + ((shift % 26) + 26)) % 26) + base)
  })
}

export const rot13 = (s: string): string => caesar(s, 13)

export function rot47(s: string): string {
  return s.replace(/[!-~]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94)))
}

export function atbash(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base))
  })
}

export function vigenere(s: string, key: string, decode = false): string {
  const k = key.toLowerCase().replace(/[^a-z]/g, '')
  if (!k) return s
  let ki = 0
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    const shift = k.charCodeAt(ki % k.length) - 97
    ki++
    const delta = decode ? 26 - shift : shift
    return String.fromCharCode(((c.charCodeAt(0) - base + delta) % 26) + base)
  })
}

export function xorText(text: string, key: string): string {
  if (!key) return text
  const keyBytes = TE.encode(key)
  const data = TE.encode(text)
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ keyBytes[i % keyBytes.length]
  return Array.from(out, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function xorHexToText(hexStr: string, key: string): string {
  const data = hexToBytes(hexStr)
  const keyBytes = TE.encode(key)
  if (!keyBytes.length) return ''
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ keyBytes[i % keyBytes.length]
  return TD.decode(out)
}

/* --------------- Defang / Refang --------------- */

export function defang(s: string): string {
  return s
    .replace(/https?:\/\//gi, (m) => m.replace(/:/g, '[:]'))
    .replace(/\./g, '[.]')
    .replace(/@/g, '[@]')
    .replace(/http/g, 'hxxp')
}

export function refang(s: string): string {
  return s
    .replace(/\[\.\]|\(\.\)|\[dot\]|\(\dot\)|\{dot\}/gi, '.')
    .replace(/\[@\]|\[at\]|\(at\)/gi, '@')
    .replace(/\[:\]/g, ':')
    .replace(/hxxp/gi, 'http')
    .replace(/h~~p/gi, 'http')
}

/* --------------- Leet / divertidas (de HackingChef) --------------- */

export const leetspeak = (s: string): string =>
  s.replace(/[aeiostAEIOST]/g, (c) => ({ a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' }[c.toLowerCase()] ?? c))

export const vaporwave = (s: string): string =>
  Array.from(s)
    .map((c) => (/[a-zA-Z]/.test(c) ? String.fromCodePoint(c.charCodeAt(0) + 0xfee0) : c))
    .join(' ')

export const mirror = (s: string): string => Array.from(s).reverse().join('')

export const doubleText = (s: string): string => Array.from(s).map((c) => (c === ' ' ? c : c + '̶')).join('')

export function randomizeChars(s: string): string {
  const arr = Array.from(s)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

export function shuffleWords(s: string): string {
  const words = s.split(/(\s+)/)
  const real = words.filter((w) => w.trim())
  for (let i = real.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[real[i], real[j]] = [real[j], real[i]]
  }
  let ri = 0
  return words.map((w) => (w.trim() ? real[ri++] : w)).join('')
}