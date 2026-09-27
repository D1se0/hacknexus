/* Certificado X.509 Decoder — 100% local, sin ejecutar nada.
   Parser ASN.1/DER mínimo pero real: TBS, subject/issuer, validez, SPKI,
   extensiones (SAN, EKU, KU, BasicConstraints, SKI/AKI) y flags de sospecha. */

export interface DerNode {
  tag: number
  tagLabel: string
  start: number
  end: number      // fin del contenido
  next: number     // fin total (contenido + header)
  children: DerNode[]
}

const TAG_NAMES: Record<number, string> = {
  0x02: 'INTEGER', 0x03: 'BIT STRING', 0x04: 'OCTET STRING', 0x05: 'NULL', 0x06: 'OID',
  0x0c: 'UTF8String', 0x13: 'PrintableString', 0x14: 'TeletexString', 0x16: 'IA5String',
  0x17: 'UTCTime', 0x18: 'GeneralizedTime', 0x23: 'URI', 0x30: 'SEQUENCE', 0x31: 'SET', 0xa3: '[3] exts', 0xa0: '[0] version',
}

export const parseDer = (bytes: Uint8Array, pos = 0, end = bytes.length): DerNode[] => {
  const nodes: DerNode[] = []
  let p = pos
  while (p + 2 <= end && nodes.length < 200) {
    const node = readTlv(bytes, p, end)
    if (!node) break
    nodes.push(node)
    p = node.next
  }
  return nodes
}

const readTlv = (bytes: Uint8Array, pos: number, end: number): DerNode | null => {
  if (pos + 2 > end) return null
  const tag = bytes[pos]
  let len = bytes[pos + 1]
  let header = 2
  if (len & 0x80) {
    const n = len & 0x7f
    if (n === 0 || n > 4 || pos + 2 + n > end) return null
    len = 0
    for (let i = 0; i < n; i++) len = len * 256 + bytes[pos + 2 + i]
    header = 2 + n
  }
  const start = pos + header
  if (start + len > end) return null
  const constructed = (tag & 0x20) !== 0
  const node: DerNode = { tag, tagLabel: TAG_NAMES[tag] ?? `0x${tag.toString(16)}`, start, end: start + len, next: start + len, children: [] }
  if (constructed) node.children = parseDer(bytes, start, start + len)
  return node
}

const utf8 = (b: Uint8Array): string => new TextDecoder().decode(b)
const hex = (b: Uint8Array, sep = ''): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(sep)

export const decodePem = (pem: string): Uint8Array | null => {
  const m = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/)
  const b64 = (m ? m[1] : pem).replace(/[^A-Za-z0-9+/=]/g, '')
  if (b64.length < 32) return null
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/* ───────── OIDs ───────── */

const OIDS: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'rsaEncryption', '1.2.840.113549.1.1.5': 'sha1WithRSA (DEBIL)', '1.2.840.113549.1.1.11': 'sha256WithRSA', '1.2.840.113549.1.1.12': 'sha384WithRSA', '1.2.840.113549.1.1.13': 'sha512WithRSA', '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.10045.2.1': 'ecPublicKey', '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256', '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '1.2.840.113549.1.9.1': 'email',
  '2.5.29.17': 'subjectAltName', '2.5.29.19': 'basicConstraints', '2.5.29.37': 'extKeyUsage', '2.5.29.15': 'keyUsage', '2.5.29.14': 'subjectKeyIdentifier', '2.5.29.35': 'authorityKeyIdentifier', '2.5.29.31': 'CRL dist points', '1.3.6.1.5.5.7.1.1': 'authorityInfoAccess', '1.3.6.1.5.5.7.1.24': 'TLS Feature',
  '1.3.6.1.5.5.7.3.1': 'serverAuth', '1.3.6.1.5.5.7.3.2': 'clientAuth', '1.3.6.1.5.5.7.3.3': 'codeSigning', '1.3.6.1.5.5.7.3.4': 'emailProtection', '1.3.6.1.5.5.7.3.8': 'timeStamping', '2.5.29.37.0': 'anyExtendedKeyUsage',
}

export const oidName = (oid: string): string => OIDS[oid] ?? oid

const readOid = (b: Uint8Array): string => {
  const out = [Math.floor(b[0] / 40), b[0] % 40]
  let val = 0
  for (let i = 1; i < b.length; i++) {
    val = (val << 7) | (b[i] & 0x7f)
    if (!(b[i] & 0x80)) { out.push(val); val = 0 }
  }
  return out.join('.')
}

/* ───────── parse del certificado ───────── */

export interface CertName { text: string }

export interface CertExt {
  oid: string
  name: string
  value: string
  critical: boolean
}

export interface CertFlags {
  level: 'ok' | 'aviso' | 'peligro'
  text: string
}

export interface CertInfo {
  version: number
  serial: string
  sigAlg: string
  issuer: string
  subject: string
  notBefore: string | null
  notAfter: string | null
  expired: boolean | null
  keyAlg: string
  keyBits: number | null
  sans: string[]
  exts: CertExt[]
  isCA: boolean | null
  selfSigned: boolean
  flags: CertFlags[]
  error?: string
}

const daysBetween = (a: Date, b: Date): number => Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000)

export const parseCertificate = (bytes: Uint8Array): CertInfo => {
  const info: CertInfo = {
    version: 3, serial: '', sigAlg: '', issuer: '', subject: '', notBefore: null, notAfter: null, expired: null,
    keyAlg: '', keyBits: null, sans: [], exts: [], isCA: null, selfSigned: false, flags: [],
  }
  try {
    const root = readTlv(bytes, 0, bytes.length)
    if (!root || root.tag !== 0x30) { info.error = 'no es un DER de certificado (SEQUENCE esperada)'; return info }
    const cert = root.children[0] // TBSCertificate
    if (!cert) { info.error = 'TBSCertificate no encontrada'; return info }

    let i = 0
    let version = 1
    if (cert.children[i]?.tag === 0xa0) {
      const v = cert.children[i].children[0]
      version = v ? (bytes[v.start] ?? 0) + 1 : 1
      i++
    }
    info.version = version
    const serialNode = cert.children[i++]
    if (serialNode) info.serial = hex(bytes.subarray(serialNode.start, serialNode.end)).replace(/^0+/, '') || '0'

    const sigSeq = cert.children[i++]
    if (sigSeq?.children[0]) {
      const oidBytes = bytes.subarray(sigSeq.children[0].start, sigSeq.children[0].end)
      info.sigAlg = oidName(readOid(oidBytes))
    }

    const rdnToString = (seq: DerNode): string => {
      const parts: string[] = []
      for (const rdn of seq.children) {
        const atv = rdn.children[0]
        if (!atv || atv.children.length < 2) continue
        const oid = readOid(bytes.subarray(atv.children[0].start, atv.children[0].end))
        const val = utf8(bytes.subarray(atv.children[1].start, atv.children[1].end))
        parts.push(`${oidName(oid).split(' ')[0]}=${val}`)
      }
      return parts.join(', ')
    }
    const issuerSeq = cert.children[i++]
    info.issuer = issuerSeq ? rdnToString(issuerSeq) : ''
    const validitySeq = cert.children[i++]
    if (validitySeq && validitySeq.children.length === 2) {
      const parseTime = (n: DerNode): string | null => {
        const raw = utf8(bytes.subarray(n.start, n.end))
        const m = raw.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z$/)
        if (m) {
          const year = parseInt(m[1], 10) + (n.tag === 0x18 ? 0 : 2000)
          const d = new Date(Date.UTC(n.tag === 0x18 ? parseInt(m[1], 10) : year, parseInt(m[2], 10) - 1, parseInt(m[3], 10), parseInt(m[4], 10), parseInt(m[5], 10), m[6] ? parseInt(m[6], 10) : 0))
          return isNaN(d.getTime()) ? raw : d.toISOString()
        }
        return raw
      }
      info.notBefore = parseTime(validitySeq.children[0])
      info.notAfter = parseTime(validitySeq.children[1])
      const nb = info.notBefore ? new Date(info.notBefore) : null
      const na = info.notAfter ? new Date(info.notAfter) : null
      const now = new Date()
      if (na) info.expired = na.getTime() < now.getTime()
      if (nb && na) {
        const vida = daysBetween(nb, na)
        if (vida > 825) info.flags.push({ level: 'aviso', text: `Validez de ${vida} días: las CA públicas se limitan a 398 días (Apple/Browser forum). Cadenas privadas con años de validez = claves que nadie rota.` })
      }
    }
    const subjectSeq = cert.children[i++]
    info.subject = subjectSeq ? rdnToString(subjectSeq) : ''
    const spki = cert.children[i++]
    if (spki && spki.children.length === 2) {
      const algSeq = spki.children[0]
      if (algSeq.children[0]) {
        const alg = oidName(readOid(bytes.subarray(algSeq.children[0].start, algSeq.children[0].end)))
        info.keyAlg = alg
        if (alg === 'rsaEncryption') {
          const keyBits = spki.children[1]
          if (keyBits) {
            const inner = keyBits.children[0] ?? keyBits
            // BIT STRING: primer byte = nº de bits sin usar
            const off = inner.tag === 0x03 ? inner.start + 1 : inner.start
            const rsaSeq = readTlv(bytes, off, inner.end)
            if (rsaSeq?.children[0]) {
              const mod = bytes.subarray(rsaSeq.children[0].start, rsaSeq.children[0].end)
              const bits = (mod.length - (mod[0] === 0 ? 1 : 0)) * 8
              info.keyBits = bits
            }
          }
        }
      }
    }

    info.selfSigned = info.issuer === info.subject && info.issuer !== ''
    if (info.selfSigned) info.flags.push({ level: 'aviso', text: 'Auto-firmado (issuer == subject): no hay CA que responda por él. OK para labs, inaceptable en producción.' })
    if (/sha1WithRSA|md5/i.test(info.sigAlg)) info.flags.push({ level: 'peligro', text: `Algoritmo de firma débil (${info.sigAlg}): colisiones prácticas desde hace años.` })
    if (info.keyBits && info.keyAlg === 'rsaEncryption' && info.keyBits < 2048) info.flags.push({ level: 'peligro', text: `RSA de ${info.keyBits} bits: roto con esfuerzo asequible. Mínimo 2048, recomendado 3072+.` })

    // extensiones ([3] tras SPKI)
    const extsWrapper = cert.children[i]
    if (extsWrapper?.tag === 0xa3) {
      const extsSeq = extsWrapper.children[0]
      for (const ext of extsSeq?.children ?? []) {
        const extSeq = ext.children[0] ?? ext
        if (extSeq.children.length < 2) continue
        let ci = 0
        const oid = readOid(bytes.subarray(extSeq.children[0].start, extSeq.children[0].end))
        const name = oidName(oid)
        let critical = false
        if (extSeq.children[1]?.tag === 0x01) { critical = true; ci = 1 }
        const octet = extSeq.children[1 + ci]
        if (!octet) continue
        let value = ''
        if (oid === '2.5.29.19') { // basicConstraints
          const inner = readTlv(bytes, octet.start + (bytes[octet.start] === 0x30 ? 0 : 1), octet.end)
          const bcSeq = inner?.tag === 0x30 ? inner : readTlv(bytes, octet.start, octet.end)
          const bc = bcSeq && bcSeq.tag === 0x30 ? bcSeq : null
          const caFlag = bc?.children[0]
          info.isCA = caFlag ? bytes[caFlag.start] !== 0 : false
          const pathlen = bc?.children[1] ? utf8(bytes.subarray(bc.children[1].start, bc.children[1].end)) : null
          value = `CA:${info.isCA ? 'TRUE' : 'FALSE'}${pathlen ? `, pathlen=${pathlen}` : ''}`
        } else if (oid === '2.5.29.17') { // SAN
          const inner = readTlv(bytes, octet.start, octet.end)
          const gnSeq = inner?.tag === 0x30 ? inner : readTlv(bytes, octet.start + 1, octet.end)
          const names: string[] = []
          for (const gn of gnSeq?.children ?? []) {
            const label = gn.tag === 0x82 ? 'DNS' : gn.tag === 0x87 ? 'IP' : gn.tag === 0x81 ? 'email' : gn.tag === 0x86 ? 'URI' : `tag 0x${gn.tag.toString(16)}`
            const raw = bytes.subarray(gn.start, gn.end)
            names.push(`${label}:${gn.tag === 0x87 ? Array.from(raw, (x) => x).join('.') : utf8(raw)}`)
          }
          info.sans = names
          value = names.join(', ') || '(vacío)'
          if (!names.length) info.flags.push({ level: 'aviso', text: 'SAN vacía: los navegadores modernos ignoran el CN. El certificado no validará hostname.' })
          const wildcards = names.filter((n) => n.startsWith('DNS:*'))
          if (wildcards.length) info.flags.push({ level: 'aviso', text: `Wildcard en SAN (${wildcards.join(', ')}): si esta clave se filtra, cae TODO el dominio de golpe.` })
        } else if (oid === '2.5.29.37') { // EKU
          const inner = readTlv(bytes, octet.start, octet.end)
          const usos = (inner?.children ?? readTlv(bytes, octet.start + 1, octet.end)?.children ?? [])
            .map((u) => oidName(readOid(bytes.subarray(u.start, u.end))))
          value = usos.join(', ')
          if (usos.includes('anyExtendedKeyUsage')) info.flags.push({ level: 'aviso', text: 'EKU any (anyExtendedKeyUsage): la clave vale para TODO. Certificados "multi-uso" son los favoritos para firmar malware.' })
          if (usos.includes('codeSigning')) info.flags.push({ level: 'aviso', text: 'EKU codeSigning: si esta clave se filtra, pueden firmar binarios que Windows confiará.' })
        } else if (oid === '2.5.29.15') { // keyUsage
          const inner = readTlv(bytes, octet.start, octet.end)
          const bitsNode = inner?.tag === 0x03 ? inner : readTlv(bytes, octet.start, octet.end)
          if (bitsNode) {
            const raw = bytes[bitsNode.start + 1] ?? 0
            const usos = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment', 'keyAgreement', 'keyCertSign', 'cRLSign'].filter((_, idx) => raw & (0x80 >> idx))
            value = usos.join(', ')
          }
        } else if (oid === '2.5.29.14') {
          const inner = readTlv(bytes, octet.start, octet.end)
          const keyId = inner?.tag === 0x04 ? inner : readTlv(bytes, octet.start, octet.end)
          if (keyId) value = hex(bytes.subarray(keyId.start, keyId.end))
        } else {
          value = hex(bytes.subarray(octet.start, Math.min(octet.end, octet.start + 48)))
        }
        info.exts.push({ oid, name: name.split(' ')[0], value, critical })
      }
    }

    if (info.isCA && !info.subject.includes('CA') && info.exts.some((e) => e.oid === '2.5.29.37' && e.value.includes('serverAuth'))) {
      info.flags.push({ level: 'peligro', text: 'CA:TRUE en un certificado de servidor: puede emitir certificados para CUALQUIER dominio. Un CA:TRUE inesperado es game over para la confianza de la red.' })
    }
    if (info.expired) info.flags.push({ level: 'peligro', text: 'EXPIRADO: rechazado por los navegadores. Un expirado en uso activo = falta de gestión o un MITM rechazado.' })
    return info
  } catch (e) {
    return { ...info, error: `parse interrumpido: ${(e as Error).message}` }
  }
}
