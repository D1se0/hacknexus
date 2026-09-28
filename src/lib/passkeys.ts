/* ── Passkeys · Ronda 19 ──────────────────────────────────────────────────
   Passkeys y WebAuthn: decodificador CBOR completo, parser de
   authenticatorData (flags, signCount, credId, clave COSE), parser de
   attestationObject y generador de attestations sintéticas para aprender
   la anatomía de la ceremonia sin tocar un authenticator real.
   100% local. */

/* ---------- 1. Utilidades de bytes ---------- */

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function bytesToB64url(b: Uint8Array): string {
  let bin = ''
  for (const x of b) bin += String.fromCharCode(x)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlToBytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(norm)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/* ---------- 2. Decodificador CBOR (RFC 8949, subset definitivo) ---------- */

export class CborError extends Error {}

/** Decodifica el primer valor CBOR del buffer. Devuelve [valor, bytesConsumidos]. */
export function cborDecodeOne(buf: Uint8Array, pos = 0): [unknown, number] {
  if (pos >= buf.length) throw new CborError('CBOR: fin de buffer inesperado')
  const ib = buf[pos]!
  const major = ib >> 5
  const ai = ib & 0x1f
  let p = pos + 1
  let val = ai < 24 ? ai : 0

  if (ai >= 24 && ai < 28) {
    const len = 1 << (ai - 24)
    if (p + len > buf.length) throw new CborError('CBOR: argumento truncado')
    for (let i = 0; i < len; i++) val = val * 256 + buf[p++]!
  } else if (ai === 31 && major >= 2 && major <= 5) {
    throw new CborError('CBOR: longitudes indefinidas no soportadas (WebAuthn usa definitivas)')
  } else if (ai >= 28) {
    throw new CborError(`CBOR: additional info ${ai} reservada`)
  }

  switch (major) {
    case 0: // unsigned
      return [val, p - pos]
    case 1: // negative: -1 - n
      return [-1 - val, p - pos]
    case 2: { // bytes
      if (p + val > buf.length) throw new CborError('CBOR: bytes truncados')
      return [buf.slice(p, p + val), p - pos + val]
    }
    case 3: { // text
      if (p + val > buf.length) throw new CborError('CBOR: texto truncado')
      const s = new TextDecoder().decode(buf.subarray(p, p + val))
      return [s, p - pos + val]
    }
    case 4: { // array
      const arr: unknown[] = []
      let used = p - pos
      for (let i = 0; i < val; i++) {
        const [v, n] = cborDecodeOne(buf, pos + used)
        arr.push(v)
        used += n
      }
      return [arr, used]
    }
    case 5: { // map
      const m = new Map<unknown, unknown>()
      let used = p - pos
      for (let i = 0; i < val; i++) {
        const [k, n1] = cborDecodeOne(buf, pos + used)
        const [v, n2] = cborDecodeOne(buf, pos + used + n1)
        m.set(k, v)
        used += n1 + n2
      }
      return [m, used]
    }
    case 6: { // tag
      const [inner, n] = cborDecodeOne(buf, p)
      return [{ tag: val, value: inner }, p - pos + n]
    }
    default: { // major 7: simples y flotantes
      if (ai === 20) return [false, 1]
      if (ai === 21) return [true, 1]
      if (ai === 22) return [null, 1]
      if (ai === 23) return [undefined, 1]
      if (ai === 25) { // half float — poco común en WebAuthn
        const half = (buf[p - 1 + 1]! << 8) | buf[p]!
        // decodificación rápida de IEEE 754 half
        const exp = (half >> 10) & 0x1f
        const frac = half & 0x3ff
        const f = exp === 0 ? frac * 2 ** -24 : exp === 31 ? (frac ? NaN : Infinity) : (frac / 1024 + 1) * 2 ** (exp - 15)
        return [(half & 0x8000) ? -f : f, 3]
      }
      if (ai === 26) {
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
        return [view.getFloat32(p), 5]
      }
      if (ai === 27) {
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
        return [view.getFloat64(p), 9]
      }
      return [val, p - pos] // simple value
    }
  }
}

export function cborDecode(buf: Uint8Array): unknown {
  return cborDecodeOne(buf, 0)[0]
}

/** Codificador CBOR mínimo para generar attestations de demo. */
export function cborEncode(v: unknown): Uint8Array {
  if (v === false) return new Uint8Array([0xf4])
  if (v === true) return new Uint8Array([0xf5])
  if (v === null) return new Uint8Array([0xf6])
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= 0) return encodeHead(0, v)
    if (Number.isInteger(v)) return encodeHead(1, -1 - v)
    return new Uint8Array([0xfb, ...new Uint8Array(new Float64Array([v]).buffer)]) as Uint8Array
  }
  if (typeof v === 'string') {
    const raw = new TextEncoder().encode(v)
    return concat(encodeHead(3, raw.length), raw)
  }
  if (v instanceof Uint8Array) return concat(encodeHead(2, v.length), v)
  if (Array.isArray(v)) {
    let out = encodeHead(4, v.length)
    for (const item of v) out = concat(out, cborEncode(item))
    return out
  }
  if (v instanceof Map) {
    let out = encodeHead(5, v.size)
    for (const [k, item] of v) out = concat(out, cborEncode(k), cborEncode(item))
    return out
  }
  throw new CborError(`cborEncode: tipo no soportado ${typeof v}`)
}

function encodeHead(major: number, val: number): Uint8Array {
  const m = major << 5
  if (val < 24) return new Uint8Array([m | val])
  if (val < 0x100) return new Uint8Array([m | 24, val])
  if (val < 0x10000) return new Uint8Array([m | 25, val >> 8, val & 0xff])
  if (val < 0x100000000) return new Uint8Array([m | 26, (val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff])
  // 64 bits
  const hi = Math.floor(val / 0x100000000)
  const lo = val >>> 0
  return new Uint8Array([m | 27, (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff, (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff])
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const b of bufs) {
    out.set(b, off)
    off += b.length
  }
  return out
}

/* ---------- 3. authenticatorData (WebAuthn L2 §6.1) ---------- */

export const AUTH_FLAGS = [
  { bit: 0x01, name: 'UP', desc: 'User Present: el usuario tocó el authenticator' },
  { bit: 0x02, name: 'RFU1', desc: 'Reservado' },
  { bit: 0x04, name: 'UV', desc: 'User Verified: PIN/biometría validada' },
  { bit: 0x08, name: 'BE', desc: 'Backup Eligible: la credencial puede sincronizarse' },
  { bit: 0x10, name: 'BS', desc: 'Backup State: la credencial ESTÁ respaldada/sincronizada' },
  { bit: 0x20, name: 'RFU2', desc: 'Reservado' },
  { bit: 0x40, name: 'AT', desc: 'Attested Credential Data presente (solo en create())' },
  { bit: 0x80, name: 'ED', desc: 'Extension Data presente' },
] as const

export interface CoseKeyParsed {
  ktyName: string
  algName: string
  crvName?: string
  bits: number
  xHex?: string
  yHex?: string
  nHexPreview?: string
  eHex?: string
  raw: Map<unknown, unknown>
}

export interface AuthenticatorDataParsed {
  rpIdHashHex: string
  flagsByte: number
  flags: { name: string; set: boolean; desc: string }[]
  signCount: number
  aaguid?: string
  credentialIdHex?: string
  credentialIdLen?: number
  coseKey?: CoseKeyParsed
  extensionsPresent: boolean
  totalBytes: number
  consumedBytes: number
}

/** Nombres de los campos COSE más comunes. */
const COSE_KTY: Record<number, string> = { 1: 'OKP', 2: 'EC2', 3: 'RSA' }
const COSE_ALG: Record<number, string> = { '-7': 'ES256 (ECDSA P-256)', '-8': 'EdDSA (Ed25519)', '-257': 'RS256 (RSA PKCS#1)' }
const COSE_CRV: Record<number, string> = { 1: 'P-256', 6: 'Ed25519', 7: 'P-384' }

export function parseCoseKey(m: Map<unknown, unknown>): CoseKeyParsed {
  const kty = m.get(1)
  const alg = m.get(3)
  const crv = m.get(-1)
  const parsed: CoseKeyParsed = {
    ktyName: COSE_KTY[kty as number] ?? `kty ${kty}`,
    algName: COSE_ALG[alg as number] ?? `alg ${alg}`,
    bits: 0,
    raw: m,
  }
  if (typeof crv === 'number') parsed.crvName = COSE_CRV[crv] ?? `crv ${crv}`
  const x = m.get(-2)
  const y = m.get(-3)
  const n = m.get(-1)
  if (x instanceof Uint8Array) {
    parsed.xHex = bytesToHex(x)
    parsed.bits = x.length * 8
  }
  if (y instanceof Uint8Array) parsed.yHex = bytesToHex(y)
  if (n instanceof Uint8Array) {
    parsed.nHexPreview = bytesToHex(n.subarray(0, 8)) + '…'
    parsed.bits = n.length * 8
  }
  const e = m.get(-2)
  if (e instanceof Uint8Array && kty === 3) parsed.eHex = bytesToHex(e)
  return parsed
}

export function decodeAuthenticatorData(data: Uint8Array): AuthenticatorDataParsed {
  if (data.length < 37) throw new CborError(`authenticatorData demasiado corto: ${data.length} bytes (mín 37)`)
  const rpIdHashHex = bytesToHex(data.slice(0, 32))
  const flagsByte = data[32]!
  const signCount = (data[33]! << 24) | (data[34]! << 16) | (data[35]! << 8) | data[36]!
  const flags = AUTH_FLAGS.map((f) => ({ name: f.name, set: (flagsByte & f.bit) !== 0, desc: f.desc }))
  const out: AuthenticatorDataParsed = {
    rpIdHashHex,
    flagsByte,
    flags,
    signCount,
    extensionsPresent: (flagsByte & 0x80) !== 0,
    totalBytes: data.length,
    consumedBytes: 37,
  }

  let pos = 37
  if (flagsByte & 0x40) {
    // attested credential data
    if (data.length < pos + 18) throw new CborError('attestedCredentialData truncado')
    const aaguid = data.slice(pos, pos + 16)
    pos += 16
    const hex = bytesToHex(aaguid)
    out.aaguid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    const credLen = (data[pos]! << 8) | data[pos + 1]!
    pos += 2
    if (data.length < pos + credLen) throw new CborError('credentialId truncado')
    out.credentialIdLen = credLen
    out.credentialIdHex = bytesToHex(data.slice(pos, pos + Math.min(credLen, 16))) + (credLen > 16 ? '…' : '')
    pos += credLen
    const [key, n] = cborDecodeOne(data, pos)
    if (key instanceof Map) out.coseKey = parseCoseKey(key)
    pos += n
    out.consumedBytes = pos
  }
  return out
}

export interface AttestationObjectParsed {
  fmt: string
  attStmtSummary: string
  alg?: number
  sigBytes?: number
  x5cCerts?: number
  authData: AuthenticatorDataParsed
  rawKeys: string[]
}

/** attestationObject = CBOR map { fmt, attStmt, authData }. */
export function decodeAttestationObject(buf: Uint8Array): AttestationObjectParsed {
  const [v, used] = cborDecodeOne(buf, 0)
  if (!(v instanceof Map)) throw new CborError('attestationObject no es un mapa CBOR')
  const fmt = v.get('fmt')
  const attStmt = v.get('attStmt')
  const authData = v.get('authData')
  if (typeof fmt !== 'string' || !(authData instanceof Uint8Array)) {
    throw new CborError('attestationObject sin fmt/authData válidos')
  }
  const out: AttestationObjectParsed = {
    fmt,
    attStmtSummary: 'vacío',
    authData: decodeAuthenticatorData(authData),
    rawKeys: Array.from(v.keys()).map(String),
  }
  if (attStmt instanceof Map) {
    const parts: string[] = []
    const alg = attStmt.get('alg')
    if (typeof alg === 'number') {
      out.alg = alg
      parts.push(`alg=${alg}`)
    }
    const sig = attStmt.get('sig')
    if (sig instanceof Uint8Array) {
      out.sigBytes = sig.length
      parts.push(`sig=${sig.length}B`)
    }
    const x5c = attStmt.get('x5c')
    if (x5c instanceof Array) {
      out.x5cCerts = x5c.length
      parts.push(`x5c=${x5c.length} certs`)
    }
    out.attStmtSummary = parts.length ? parts.join(' · ') : `${attStmt.size} campos`
  }
  void used
  return out
}

/* ---------- 4. clientDataJSON ---------- */

export interface ClientDataParsed {
  type: string
  challengeHex: string
  challengeB64url: string
  origin: string
  crossOrigin?: boolean
  raw: string
}

export function decodeClientDataJSON(b64urlOrJson: string): ClientDataParsed {
  let raw: string
  try {
    raw = new TextDecoder().decode(b64urlToBytes(b64urlOrJson))
  } catch {
    raw = b64urlOrJson // ya era JSON plano
  }
  const obj = JSON.parse(raw) as {
    type?: string
    challenge?: string
    origin?: string
    crossOrigin?: boolean
  }
  let challengeHex = ''
  try {
    challengeHex = bytesToHex(b64urlToBytes(obj.challenge ?? ''))
  } catch {
    challengeHex = '(no base64url)'
  }
  return {
    type: obj.type ?? '?',
    challengeHex,
    challengeB64url: obj.challenge ?? '',
    origin: obj.origin ?? '?',
    crossOrigin: obj.crossOrigin,
    raw,
  }
}

/* ---------- 5. Attestation sintética (demo sin authenticator) ---------- */

/** PRNG determinista para demos reproducibles. */
function prng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export interface DemoAttestation {
  attestationObjectB64url: string
  clientDataJSONB64url: string
  attestationObject: AttestationObjectParsed
  clientData: ClientDataParsed
}

/** Construye un attestationObject completo tipo "none" con clave EC2 P-256 sintética. */
export async function buildDemoAttestation(rpId = 'hacknexus.local', seed = 1337): Promise<DemoAttestation> {
  const rand = prng(seed)
  const rpIdHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId)))
  const credId = new Uint8Array(32)
  for (let i = 0; i < credId.length; i++) credId[i] = Math.floor(rand() * 256)
  const privSeed = new Uint8Array(32)
  for (let i = 0; i < privSeed.length; i++) privSeed[i] = Math.floor(rand() * 256)
  const x = new Uint8Array(32)
  const y = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    x[i] = Math.floor(rand() * 256)
    y[i] = Math.floor(rand() * 256)
  }
  // clave COSE: {1:2 (EC2), 3:-7 (ES256), -1:1 (P-256), -2:x, -3:y}
  const cose = new Map<number, unknown>([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, x],
    [-3, y],
  ])
  // authData: rpIdHash(32) + flags(1) + signCount(4) + aaguid(16) + credLen(2) + credId + cose
  const aaguid = new Uint8Array(16)
  aaguid[0] = 0xad
  aaguid[1] = 0xce
  for (let i = 2; i < 16; i++) aaguid[i] = Math.floor(rand() * 256)
  const flags = 0x01 | 0x04 | 0x40 // UP + UV + AT
  const signCount = 42
  const head = new Uint8Array(37)
  head.set(rpIdHash, 0)
  head[32] = flags
  head[33] = (signCount >>> 24) & 0xff
  head[34] = (signCount >>> 16) & 0xff
  head[35] = (signCount >>> 8) & 0xff
  head[36] = signCount & 0xff
  const credHead = new Uint8Array(18)
  credHead.set(aaguid, 0)
  credHead[16] = (credId.length >> 8) & 0xff
  credHead[17] = credId.length & 0xff
  const authData = concat(head, credHead, credId, cborEncode(cose))

  // attStmt vacío + fmt "none" (como passkeys sincronizadas del navegador)
  const attObj = new Map<string, unknown>([
    ['fmt', 'none'],
    ['attStmt', new Map<unknown, unknown>()],
    ['authData', authData],
  ])
  const attBytes = cborEncode(attObj)
  const attestationObjectB64url = bytesToB64url(attBytes)

  const challenge = new Uint8Array(32)
  for (let i = 0; i < challenge.length; i++) challenge[i] = Math.floor(rand() * 256)
  const clientData = {
    type: 'webauthn.create',
    challenge: bytesToB64url(challenge),
    origin: `https://${rpId}`,
    crossOrigin: false,
  }
  const clientDataJSONB64url = bytesToB64url(new TextEncoder().encode(JSON.stringify(clientData)))

  return {
    attestationObjectB64url,
    clientDataJSONB64url,
    attestationObject: decodeAttestationObject(attBytes),
    clientData: decodeClientDataJSON(clientDataJSONB64url),
  }
}

/** ¿El navegador soporta WebAuthn? (la comprobación de plataforma es async y va aparte) */
export function webauthnSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as { PublicKeyCredential?: unknown }).PublicKeyCredential !== 'undefined'
}

/* ---------- 6. Catálogo didáctico ---------- */

export const PASSKEY_LIMITS: string[] = [
  'Las claves generadas aquí son sintéticas y NO son curvas válidas: sirven para aprender el formato, no para autenticar.',
  'El decodificador CBOR cubre el subset de WebAuthn (longitudes definitivas): mensajes CBOR arbitrarios con tags/indefinidos pueden no decodificarse.',
  'navigator.credentials.create/get requiere HTTPS (o localhost) y un authenticator real: en entornos sin soporte se muestra solo la anatomía.',
  'Una passkey sincronizada (Google/Apple) comparte la clave privada entre dispositivos del usuario: el flag BS=1 te dice si una credencial está respaldada.',
]

export const PASSKEY_LESSONS: { title: string; lesson: string }[] = [
  { title: 'Anatomía de una passkey', lesson: 'Un attestationObject CBOR contiene fmt, attStmt y authData: este último trae hash del rpId, flags, contador, y la clave pública COSE. La privada JAMÁS sale del authenticator — por eso el phishing no roba passkeys.' },
  { title: 'Los flags lo cuentan todo', lesson: 'UP (tocó), UV (verificó biometría/PIN), BE/BS (sincronizable/sincronizada), AT (trae credencial nueva). Un servidor serio exige UP y rechaza ceremonias con flags sospechosos: es el control anti-clone.' },
  { title: 'signCount: detector de clones', lesson: 'El contador aumenta en cada uso. Si el servidor recibe un signCount ≤ al anterior, hay UNA CREDENCIAL CLONADA en juego — excepto en passkeys sincronizadas, donde el contador queda congelado en 0 a propósito.' },
  { title: 'CBOR: el JSON de lo binario', lesson: 'WebAuthn no usa JSON para el attestation: usa CBOR (RFC 8949), binario compacto y parseable en un parse. El origen: pasar estructuras binarias (claves, firmas) sin base64 dobles.' },
  { title: 'Phishing-resistant por diseño', lesson: 'El origin y el rpIdHash van firmados DENTRO de la respuesta: un phishing de bancagLOBAL.com nunca obtiene una firma válida para bancoGLOBAL.com. Ni el usuario perfecto puede ser engañado de la misma forma que con contraseñas.' },
]
