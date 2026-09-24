/* Worker de cracking: diccionario (+reglas ligeras) y fuerza bruta.
   Soporta MD5, SHA1, SHA256, SHA512, NTLM. */

import CryptoJS from 'crypto-js'

type Algo = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'NTLM'

function md4(bytes: Uint8Array): Uint8Array {
  const bitLen = bytes.length * 8
  const paddedLen = (((bytes.length + 8) >> 6) + 1) << 6
  const padded = new Uint8Array(paddedLen)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(paddedLen - 8, bitLen >>> 0, true)
  dv.setUint32(paddedLen - 4, Math.floor(bitLen / 2 ** 32), true)
  const rol = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0
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

function toHex(buf: Uint8Array): string {
  let s = ''
  for (const b of buf) s += b.toString(16).padStart(2, '0')
  return s
}

function bytesToWa(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i] << (24 - (i % 4) * 8))
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

const enc = new TextEncoder()
function hashIt(algo: Algo, word: string): string {
  switch (algo) {
    case 'MD5':
      return CryptoJS.MD5(word).toString()
    case 'SHA1':
      return CryptoJS.SHA1(word).toString()
    case 'SHA256':
      return CryptoJS.SHA256(word).toString()
    case 'SHA512':
      return CryptoJS.SHA512(word).toString()
    case 'NTLM': {
      const text = word
      const utf16 = new Uint8Array(text.length * 2)
      for (let i = 0; i < text.length; i++) {
        utf16[i * 2] = text.charCodeAt(i) & 0xff
        utf16[i * 2 + 1] = (text.charCodeAt(i) >> 8) & 0xff
      }
      return toHex(md4(utf16))
    }
  }
}

interface DictJob {
  mode: 'dict'
  algo: Algo
  targets: string[]
  words: string[]
  rules: boolean
}
interface BruteJob {
  mode: 'brute'
  algo: Algo
  targets: string[]
  charset: string
  minLen: number
  maxLen: number
}
type Job = DictJob | BruteJob

self.onmessage = (e: MessageEvent<Job>) => {
  const job = e.data
  const targets = new Set(job.targets.map((t) => t.trim().toLowerCase()).filter(Boolean))
  if (!targets.size) {
    self.postMessage({ type: 'done', found: {}, tried: 0, rate: 0 })
    return
  }
  const found: Record<string, string> = {}
  let tried = 0
  const t0 = performance.now()
  let lastPost = 0

  const post = (force = false) => {
    const now = performance.now()
    if (force || now - lastPost > 120) {
      lastPost = now
      self.postMessage({ type: 'progress', tried, rate: tried / ((now - t0) / 1000), found: { ...found } })
    }
  }

  const check = (word: string): boolean => {
    tried++
    const h = hashIt(job.algo, word)
    if (targets.has(h)) {
      found[h] = word
      self.postMessage({ type: 'cracked', hash: h, word })
      // elimina de targets para no seguir
      targets.delete(h)
      return targets.size === 0
    }
    return false
  }

  if (job.mode === 'dict') {
    const seen = new Set<string>()
    outer: for (let wi = 0; wi < job.words.length; wi++) {
      const base = job.words[wi]
      const variants = job.rules ? rulesFor(base) : [base]
      for (const v of variants) {
        if (seen.has(v)) continue
        seen.add(v)
        if (check(v)) break outer
      }
      post()
    }
  } else {
    const cs = job.charset
    const minLen = Math.max(1, job.minLen)
    const maxLen = Math.min(10, job.maxLen)
    outer: for (let len = minLen; len <= maxLen; len++) {
      const idx = new Array(len).fill(0)
      const total = cs.length ** len
      if (total > 2_000_000_000) break
      for (let n = 0; n < total; n++) {
        let word = ''
        for (let i = 0; i < len; i++) word += cs[idx[i]]
        if (check(word)) break outer
        for (let i = len - 1; i >= 0; i--) {
          idx[i]++
          if (idx[i] < cs.length) break
          idx[i] = 0
          if (i === 0 && len === maxLen) break outer
        }
        if ((n & 1023) === 0) post()
      }
    }
  }
  post(true)
  self.postMessage({ type: 'done', found, tried, rate: tried / ((performance.now() - t0) / 1000) })
}

function rulesFor(word: string): string[] {
  const out = [word]
  out.push(word.toLowerCase())
  out.push(word.toUpperCase())
  if (word.length > 0) out.push(word[0].toUpperCase() + word.slice(1).toLowerCase())
  out.push(word + '1')
  out.push(word + '123')
  out.push(word + '!')
  out.push(word + '123!')
  return out
}