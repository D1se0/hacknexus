/* TOTP (RFC 6238) con WebCrypto — compatible con Google Authenticator */

const B32A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode(secret: string): Uint8Array {
  const clean = secret.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = B32A.indexOf(ch)
    if (idx < 0) throw new Error(`Carácter inválido en secreto Base32: "${ch}"`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

export function base32EncodeKey(bytes: Uint8Array): string {
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
  return out
}

export function randomTotpSecret(lengthBytes = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(lengthBytes))
  return base32EncodeKey(bytes).replace(/=+$/, '')
}

export interface TotpResult {
  code: string
  remainingSeconds: number
  period: number
}

export async function totp(secretBase32: string, period = 30, digits = 6, atMs?: number): Promise<TotpResult> {
  const keyBytes = base32Decode(secretBase32)
  if (!keyBytes.length) throw new Error('Secreto vacío o inválido')
  const now = atMs ?? Date.now()
  const counter = Math.floor(now / 1000 / period)
  const buf = new ArrayBuffer(8)
  const dv = new DataView(buf)
  dv.setUint32(4, counter >>> 0, false)
  dv.setUint32(0, Math.floor(counter / 2 ** 32), false)
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const offset = sig[sig.length - 1] & 0x0f
  const binCode =
    ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) | (sig[offset + 2] << 8) | sig[offset + 3]
  const code = (binCode % 10 ** digits).toString().padStart(digits, '0')
  return { code, remainingSeconds: period - Math.floor((now / 1000) % period), period }
}

export function otpauthUri(label: string, secret: string, issuer: string): string {
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`
}
