/* JWT: decode, sign (HS*), verify con WebCrypto y crackeo de secrets */

export interface JwtParts {
  header: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  signature: string
  raw: { header: string; payload: string; signature: string }
  error?: string
}

export function b64urlDecode(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4)
  const bin = atob(pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeJwt(token: string): JwtParts {
  const parts = token.trim().split('.')
  if (parts.length < 2) return { header: null, payload: null, signature: '', raw: { header: '', payload: '', signature: '' }, error: 'Formato inválido: se esperan header.payload.signature' }
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])))
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])))
    return { header, payload, signature: parts[2] ?? '', raw: { header: parts[0], payload: parts[1], signature: parts[2] ?? '' } }
  } catch (e) {
    return { header: null, payload: null, signature: '', raw: { header: parts[0], payload: parts[1], signature: parts[2] ?? '' }, error: `JSON inválido: ${(e as Error).message}` }
  }
}

const HMAC_ALG: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

export async function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, secret: string): Promise<string> {
  const alg = String(header.alg ?? 'HS256')
  if (alg === 'none') {
    const h0 = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
    const p0 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
    return `${h0}.${p0}.`
  }
  const webAlg = HMAC_ALG[alg]
  if (!webAlg) throw new Error(`Algoritmo no soportado en cliente: ${alg} (usa HS256/HS384/HS512 o "none")`)
  const h = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const p = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret) as unknown as BufferSource,
    { name: 'HMAC', hash: webAlg },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`) as unknown as BufferSource)
  return `${h}.${p}.${b64urlEncode(new Uint8Array(sig))}`
}

export async function verifyJwtHS(token: string, secret: string): Promise<{ valid: boolean; reason?: string }> {
  const parts = decodeJwt(token)
  if (parts.error || !parts.header) return { valid: false, reason: parts.error ?? 'token inválido' }
  const alg = String(parts.header.alg ?? '')
  const webAlg = HMAC_ALG[alg]
  if (!webAlg) return { valid: false, reason: `algoritmo ${alg || '(none)'} no soportado para verificación HMAC` }
  if (!parts.signature) return { valid: false, reason: 'firma ausente (token sin firmar)' }
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret) as unknown as BufferSource,
      { name: 'HMAC', hash: webAlg },
      false,
      ['sign'],
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.raw.header}.${parts.raw.payload}`) as unknown as BufferSource)
    const expected = b64urlEncode(new Uint8Array(sig))
    if (expected.length !== parts.signature.length) return { valid: false, reason: 'longitud de firma distinta' }
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts.signature.charCodeAt(i)
    return diff === 0 ? { valid: true } : { valid: false, reason: 'firma incorrecta' }
  } catch (e) {
    return { valid: false, reason: (e as Error).message }
  }
}

/* ---------------- HMAC síncrono (para crackeo en lote) ----------------
   SHA-256/384/512 + HMAC en JS puro: permite probar millones de secretos sin
   await por candidato (WebCrypto es asíncrono). Verificado contra WebCrypto en la UI. */

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

function sha256(msg: Uint8Array): Uint8Array {
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const len = msg.length
  const withPad = (((len + 9 + 63) >>> 6) << 6)  // ceil((len+9)/64)*64
  const m = new Uint8Array(withPad)
  m.set(msg)
  m[len] = 0x80
  const dv = new DataView(m.buffer)
  const bitLen = len * 8
  dv.setUint32(withPad - 8, Math.floor(bitLen / 0x100000000))
  dv.setUint32(withPad - 4, bitLen >>> 0)
  const w = new Uint32Array(64)
  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15]
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)
      const y = w[i - 2]
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7]
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K256[i] + w[i]) | 0
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))
      const mj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + mj) | 0
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0
  }
  const out = new Uint8Array(32)
  const odv = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i] >>> 0)
  return out
}

/* ---- SHA-512/384 con aritmética de 64 bits por pares [hi, lo] de 32 bits ---- */

type W64 = [number, number]

const add64 = (a: W64, b: W64): W64 => {
  const lo = (a[1] + b[1]) >>> 0
  const carry = lo < a[1] ? 1 : 0
  return [(a[0] + b[0] + carry) >>> 0, lo]
}
const rotr64 = (x: W64, n: number): W64 => {
  if (n === 32) return [x[1], x[0]]
  if (n < 32) return [((x[0] >>> n) | (x[1] << (32 - n))) >>> 0, ((x[1] >>> n) | (x[0] << (32 - n))) >>> 0]
  const m = n - 32
  return [((x[1] >>> m) | (x[0] << (32 - m))) >>> 0, ((x[0] >>> m) | (x[1] << (32 - m))) >>> 0]
}
const shr64 = (x: W64, n: number): W64 => {
  if (n === 32) return [0, x[0]]
  if (n < 32) return [x[0] >>> n, ((x[1] >>> n) | (x[0] << (32 - n))) >>> 0]
  return [0, x[0] >>> (n - 32)]
}
const xor3 = (a: W64, b: W64, c: W64): W64 => [(a[0] ^ b[0] ^ c[0]) >>> 0, (a[1] ^ b[1] ^ c[1]) >>> 0]
const and64 = (a: W64, b: W64): W64 => [a[0] & b[0], a[1] & b[1]]
const not64 = (a: W64): W64 => [(~a[0]) >>> 0, (~a[1]) >>> 0]

// Constantes K de SHA-512 como pares [hi, lo]
const K512: W64[] = [
  [0x428a2f98, 0xd728ae22], [0x71374491, 0x23ef65cd], [0xb5c0fbcf, 0xec4d3b2f], [0xe9b5dba5, 0x8189dbbc],
  [0x3956c25b, 0xf348b538], [0x59f111f1, 0xb605d019], [0x923f82a4, 0xaf194f9b], [0xab1c5ed5, 0xda6d8118],
  [0xd807aa98, 0xa3030242], [0x12835b01, 0x45706fbe], [0x243185be, 0x4ee4b28c], [0x550c7dc3, 0xd5ffb4e2],
  [0x72be5d74, 0xf27b896f], [0x80deb1fe, 0x3b1696b1], [0x9bdc06a7, 0x25c71235], [0xc19bf174, 0xcf692694],
  [0xe49b69c1, 0x9ef14ad2], [0xefbe4786, 0x384f25e3], [0x0fc19dc6, 0x8b8cd5b5], [0x240ca1cc, 0x77ac9c65],
  [0x2de92c6f, 0x592b0275], [0x4a7484aa, 0x6ea6e483], [0x5cb0a9dc, 0xbd41fbd4], [0x76f988da, 0x831153b5],
  [0x983e5152, 0xee66dfab], [0xa831c66d, 0x2db43210], [0xb00327c8, 0x98fb213f], [0xbf597fc7, 0xbeef0ee4],
  [0xc6e00bf3, 0x3da88fc2], [0xd5a79147, 0x930aa725], [0x06ca6351, 0xe003826f], [0x14292967, 0x0a0e6e70],
  [0x27b70a85, 0x46d22ffc], [0x2e1b2138, 0x5c26c926], [0x4d2c6dfc, 0x5ac42aed], [0x53380d13, 0x9d95b3df],
  [0x650a7354, 0x8baf63de], [0x766a0abb, 0x3c77b2a8], [0x81c2c92e, 0x47edaee6], [0x92722c85, 0x1482353b],
  [0xa2bfe8a1, 0x4cf10364], [0xa81a664b, 0xbc423001], [0xc24b8b70, 0xd0f89791], [0xc76c51a3, 0x0654be30],
  [0xd192e819, 0xd6ef5218], [0xd6990624, 0x5565a910], [0xf40e3585, 0x5771202a], [0x106aa070, 0x32bbd1b8],
  [0x19a4c116, 0xb8d2d0c8], [0x1e376c08, 0x5141ab53], [0x2748774c, 0xdf8eeb99], [0x34b0bcb5, 0xe19b48a8],
  [0x391c0cb3, 0xc5c95a63], [0x4ed8aa4a, 0xe3418acb], [0x5b9cca4f, 0x7763e373], [0x682e6ff3, 0xd6b2b8a3],
  [0x748f82ee, 0x5defb2fc], [0x78a5636f, 0x43172f60], [0x84c87814, 0xa1f0ab72], [0x8cc70208, 0x1a6439ec],
  [0x90befffa, 0x23631e28], [0xa4506ceb, 0xde82bde9], [0xbef9a3f7, 0xb2c67915], [0xc67178f2, 0xe372532b],
  [0xca273ece, 0xea26619c], [0xd186b8c7, 0x21c0c207], [0xeada7dd6, 0xcde0eb1e], [0xf57d4f7f, 0xee6ed178],
  [0x06f067aa, 0x72176fba], [0x0a637dc5, 0xa2c898a6], [0x113f9804, 0xbef90dae], [0x1b710b35, 0x131c471b],
  [0x28db77f5, 0x23047d84], [0x32caab7b, 0x40c72493], [0x3c9ebe0a, 0x15c9bebc], [0x431d67c4, 0x9c100d4c],
  [0x4cc5d4be, 0xcb3e42b6], [0x597f299c, 0xfc657e2a], [0x5fcb6fab, 0x3ad6faec], [0x6c44198c, 0x4a475817],
]

const IV512: W64[] = [
  [0x6a09e667, 0xf3bcc908], [0xbb67ae85, 0x84caa73b], [0x3c6ef372, 0xfe94f82b], [0xa54ff53a, 0x5f1d36f1],
  [0x510e527f, 0xade682d1], [0x9b05688c, 0x2b3e6c1f], [0x1f83d9ab, 0xfb41bd6b], [0x5be0cd19, 0x137e2179],
]

const IV384: W64[] = [
  [0xcbbb9d5d, 0xc1059ed8], [0x629a292a, 0x367cd507], [0x9159015a, 0x3070dd17], [0x152fecd8, 0xf70e5939],
  [0x67332667, 0xffc00b31], [0x8eb44a87, 0x68581511], [0xdb0c2e0d, 0x64f98fa7], [0x47b5481d, 0xbefa4fa4],
]

function sha384_512(msg: Uint8Array, is384: boolean): Uint8Array {
  const st: W64[] = (is384 ? IV384 : IV512).map((w) => [w[0], w[1]] as W64)
  const len = msg.length
  const withPad = (((len + 17 + 127) >>> 7) << 7)  // ceil((len+17)/128)*128
  const m = new Uint8Array(withPad)
  m.set(msg)
  m[len] = 0x80
  const dv = new DataView(m.buffer)
  const bitLen = len * 8
  dv.setUint32(withPad - 16, 0)  // bits 127..96
  dv.setUint32(withPad - 12, 0)  // bits 95..64
  dv.setUint32(withPad - 8, Math.floor(bitLen / 0x100000000))  // bits 63..32
  dv.setUint32(withPad - 4, bitLen >>> 0)  // bits 31..0
  const w: W64[] = new Array(80)
  for (let off = 0; off < withPad; off += 128) {
    for (let i = 0; i < 16; i++) w[i] = [dv.getUint32(off + i * 8), dv.getUint32(off + i * 8 + 4)]
    for (let i = 16; i < 80; i++) {
      const x = w[i - 15]
      const s0 = xor3(rotr64(x, 1), rotr64(x, 8), shr64(x, 7))
      const y = w[i - 2]
      const s1 = xor3(rotr64(y, 19), rotr64(y, 61), shr64(y, 6))
      w[i] = add64(add64(w[i - 16], s0), add64(w[i - 7], s1))
    }
    let a = st[0], b = st[1], c = st[2], d = st[3], e = st[4], f = st[5], g = st[6], h = st[7]
    for (let i = 0; i < 80; i++) {
      const S1 = xor3(rotr64(e, 14), rotr64(e, 18), rotr64(e, 41))
      const ch = xor3(and64(e, f), and64(not64(e), g), [0, 0])
      const t1 = add64(add64(add64(add64(h, S1), ch), K512[i]), w[i])
      const S0 = xor3(rotr64(a, 28), rotr64(a, 34), rotr64(a, 39))
      const maj = xor3(and64(a, b), and64(a, c), and64(b, c))
      const t2 = add64(S0, maj)
      h = g; g = f; f = e; e = add64(d, t1); d = c; c = b; b = a; a = add64(t1, t2)
    }
    st[0] = add64(st[0], a); st[1] = add64(st[1], b); st[2] = add64(st[2], c); st[3] = add64(st[3], d)
    st[4] = add64(st[4], e); st[5] = add64(st[5], f); st[6] = add64(st[6], g); st[7] = add64(st[7], h)
  }
  const nb = is384 ? 48 : 64
  const out = new Uint8Array(nb)
  const odv = new DataView(out.buffer)
  for (let i = 0; i < nb / 4; i++) odv.setUint32(i * 4, (i % 2 === 0 ? st[i / 2][0] : st[(i - 1) / 2][1]) >>> 0)
  return out
}

function hmacRaw(secretBytes: Uint8Array, data: Uint8Array, alg: 'HS256' | 'HS384' | 'HS512'): Uint8Array {
  const blockSize = alg === 'HS256' ? 64 : 128  // SHA-384/512 usan bloque de 128 bytes
  const big = alg !== 'HS256'
  let key = secretBytes
  if (key.length > blockSize) key = alg === 'HS256' ? sha256(key) : sha384_512(key, alg === 'HS384')
  const kPadded = new Uint8Array(blockSize)
  kPadded.set(key)
  const iPad = new Uint8Array(blockSize + data.length)
  const oPad = new Uint8Array(blockSize + (big ? (alg === 'HS384' ? 48 : 64) : 32))
  for (let i = 0; i < blockSize; i++) {
    iPad[i] = kPadded[i] ^ 0x36
    oPad[i] = kPadded[i] ^ 0x5c
  }
  iPad.set(data, blockSize)
  const inner = alg === 'HS256' ? sha256(iPad) : sha384_512(iPad, alg === 'HS384')
  oPad.set(inner, blockSize)
  return alg === 'HS256' ? sha256(oPad) : sha384_512(oPad, alg === 'HS384')
}

/** Firma HMAC de un JWT sin WebCrypto (síncrona, para crackeo en lote masivo) */
export function hmacSignature(rawHeader: string, rawPayload: string, secret: string, alg: string): string {
  const data = new TextEncoder().encode(`${rawHeader}.${rawPayload}`)
  const key = new TextEncoder().encode(secret)
  if (alg === 'HS256') return b64urlEncode(hmacRaw(key, data, 'HS256'))
  if (alg === 'HS384') return b64urlEncode(hmacRaw(key, data, 'HS384'))
  if (alg === 'HS512') return b64urlEncode(hmacRaw(key, data, 'HS512'))
  throw new Error(`algoritmo no soportado: ${alg}`)
}

export interface CrackProgress {
  tested: number
  total: number
  found: string | null
  done: boolean
  rate: number
}

/** Crackea un JWT HS* probando secretos línea a línea; onProgress cada ~200k intentos. */
export async function crackJwtSecret(
  token: string,
  secrets: string[],
  onProgress?: (p: CrackProgress) => void,
  shouldStop?: () => boolean,
): Promise<string | null> {
  const parts = decodeJwt(token)
  if (parts.error || !parts.header || !parts.signature) throw new Error('token HS* inválido (sin firma no hay nada que crackear)')
  const alg = String(parts.header.alg ?? '')
  if (!['HS256', 'HS384', 'HS512'].includes(alg)) throw new Error(`solo se puede crackear HMAC: el token usa ${alg || '(none)'}`)
  const { raw, signature } = parts
  let tested = 0
  const t0 = performance.now()
  for (let i = 0; i < secrets.length; i++) {
    if (shouldStop?.()) return null
    const s = secrets[i]
    if (!s) { tested++; continue }
    try {
      if (hmacSignature(raw.header, raw.payload, s, alg) === signature) {
        onProgress?.({ tested: tested + 1, total: secrets.length, found: s, done: true, rate: tested / ((performance.now() - t0) / 1000 || 1) })
        return s
      }
    } catch { /* línea inválida */ }
    tested++
    if (tested % 200000 === 0) {
      onProgress?.({ tested, total: secrets.length, found: null, done: false, rate: tested / ((performance.now() - t0) / 1000 || 1) })
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  onProgress?.({ tested, total: secrets.length, found: null, done: true, rate: tested / ((performance.now() - t0) / 1000 || 1) })
  return null
}
