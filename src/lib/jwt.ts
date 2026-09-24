/* JWT: decode, sign (HS*) y verify con WebCrypto */

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
  const webAlg = HMAC_ALG[alg]
  if (!webAlg) throw new Error(`Algoritmo no soportado en cliente: ${alg} (usa HS256/HS384/HS512)`)
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
