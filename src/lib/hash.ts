import CryptoJS from 'crypto-js'

export const bytesToHex = (b: Uint8Array): string =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')

export const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  const out = new Uint8Array(Math.floor(clean.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16)
  return out
}

/* ---------------- WebCrypto digests (SHA family) ---------------- */

export async function digestHex(algo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512', data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const buf = await crypto.subtle.digest(algo, bytes as unknown as BufferSource)
  return bytesToHex(new Uint8Array(buf))
}

export type SyncHashName = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'SHA3-512' | 'RIPEMD160' | 'CRC32' | 'NTLM'

export function syncHash(name: SyncHashName, input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const wa = bytesToWordArray(bytes)
  switch (name) {
    case 'MD5':
      return CryptoJS.MD5(wa).toString()
    case 'SHA1':
      return CryptoJS.SHA1(wa).toString()
    case 'SHA256':
      return CryptoJS.SHA256(wa).toString()
    case 'SHA512':
      return CryptoJS.SHA512(wa).toString()
    case 'SHA3-512':
      return (CryptoJS.SHA3 as unknown as (w: CryptoJS.lib.WordArray, o?: object) => CryptoJS.lib.WordArray)(wa, {
        outputLength: 512,
      }).toString()
    case 'RIPEMD160':
      return CryptoJS.RIPEMD160(wa).toString()
    case 'CRC32':
      return crc32(bytes)
    case 'NTLM':
      return bytesToHex(md4(utf16leBytes(bytes)))
  }
}

function utf16leBytes(bytes: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(bytes)
  const out = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i++) {
    out[i * 2] = text.charCodeAt(i) & 0xff
    out[i * 2 + 1] = (text.charCodeAt(i) >> 8) & 0xff
  }
  return out
}

export function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8))
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

export function wordArrayToBytes(wa: CryptoJS.lib.WordArray): Uint8Array {
  const words = wa.words
  const out = new Uint8Array(wa.sigBytes)
  for (let i = 0; i < wa.sigBytes; i++) out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  return out
}

/* ---------------- CRC32 ---------------- */

let CRC_TABLE: Uint32Array | null = null
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  CRC_TABLE = t
  return t
}

export function crc32(bytes: Uint8Array): string {
  const table = crcTable()
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff]
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

/* ---------------- HMAC (WebCrypto) ---------------- */

export async function hmacHex(
  algo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  keyText: string,
  msgText: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyText) as unknown as BufferSource,
    { name: 'HMAC', hash: algo },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msgText) as unknown as BufferSource)
  return bytesToHex(new Uint8Array(sig))
}

/* ---------------- MD4 (para NTLM) ---------------- */

const rol = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0

export function md4(bytes: Uint8Array): Uint8Array {
  const bitLen = bytes.length * 8
  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6
  const padded = new Uint8Array(paddedLen)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(paddedLen - 8, bitLen >>> 0, true)
  dv.setUint32(paddedLen - 4, Math.floor(bitLen / 2 ** 32), true)

  const r1s = [3, 7, 11, 19]
  const r2k = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15]
  const r2s = [3, 5, 9, 13]
  const r3k = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
  const r3s = [3, 9, 11, 15]

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476
  for (let off = 0; off < paddedLen; off += 64) {
    const X = new Uint32Array(16)
    for (let i = 0; i < 16; i++) X[i] = dv.getUint32(off + i * 4, true)
    let A = a, B = b, C = c, D = d
    for (let i = 0; i < 16; i++) {
      A = (rol((A + ((B & C) | (~B & D)) + X[i]) >>> 0, r1s[i % 4]) >>> 0)
      ;[A, B, C, D] = [D, A, B, C]
    }
    for (let i = 0; i < 16; i++) {
      A = (rol((A + ((B & C) | (B & D) | (C & D)) + 0x5a827999 + X[r2k[i]]) >>> 0, r2s[i % 4]) >>> 0)
      ;[A, B, C, D] = [D, A, B, C]
    }
    for (let i = 0; i < 16; i++) {
      A = (rol((A + (B ^ C ^ D) + 0x6ed9eba1 + X[r3k[i]]) >>> 0, r3s[i % 4]) >>> 0)
      ;[A, B, C, D] = [D, A, B, C]
    }
    a = (a + A) >>> 0
    b = (b + B) >>> 0
    c = (c + C) >>> 0
    d = (d + D) >>> 0
  }
  const out = new Uint8Array(16)
  const odv = new DataView(out.buffer)
  odv.setUint32(0, a, true)
  odv.setUint32(4, b, true)
  odv.setUint32(8, c, true)
  odv.setUint32(12, d, true)
  return out
}
