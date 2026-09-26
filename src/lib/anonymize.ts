/* Anonimizador de logs y ficheros de configuración para compartir en
   foros, tickets o informes sin filtrar IPs, usuarios ni dominios reales.
   La pseudonimización es CONSISTENTE (misma entrada → mismo token) para
   no romper la correlación del análisis, y reversible con el mapa. */

export type AnonKind = 'ipv4' | 'ipv6' | 'email' | 'usuario' | 'mac' | 'dominio' | 'hostname' | 'subnet'

export interface AnonMatch {
  kind: AnonKind
  original: string
  token: string
}

export interface AnonOptions {
  ip4: boolean
  ip6: boolean
  emails: boolean
  users: boolean
  macs: boolean
  domains: boolean
  hostnames: boolean
  salt: string
}

export const ANON_DEFAULTS: AnonOptions = {
  ip4: true,
  ip6: false,
  emails: true,
  users: false,
  macs: false,
  domains: false,
  hostnames: false,
  salt: 'hacknexus',
}

/* ── detección ─────────────────────────────────────────────────── */

const RE_IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g
const RE_IPV6 = /\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g
const RE_MAC = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g

/** Palabras de usuario comunes en logs: "user=juan", "for alice", "sshd[123]: juan" */
const RE_USER = /(?:\b(?:user|usuario|login|uid|for|sshd\[?\d*\]?:?)[:= ]+)([a-z_][a-z0-9._-]{2,20})/gi
/** Dominios (mínimo x.y, sin IPs). */
const RE_DOMAIN = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|org|net|io|dev|es|fr|de|uk|eu|info|biz|co|me|tv|app|cloud|xyz|top|online|site|tech|gov|edu|mil|int|arpa)\b/gi
/** hostnames tipo "server01", "web-prod-3", "db01.corp" */
const RE_HOSTNAME = /\b(?:[a-z]{2,8}(?:[-_][a-z0-9]{1,4}){1,3})(?:\.[a-z]{2,12})?\b/gi

function detect(text: string, o: AnonOptions): Map<string, AnonKind> {
  const found = new Map<string, AnonKind>()
  const add = (v: string, k: AnonKind) => { if (v && !found.has(v)) found.set(v, k) }

  if (o.ip4) {
    for (const m of text.match(RE_IPV4) ?? []) {
      if (!/^(0\.0\.0\.0|127\.|255\.|224\.)/.test(m)) add(m, 'ipv4')
    }
  }
  if (o.ip6) for (const m of text.match(RE_IPV6) ?? []) add(m, 'ipv6')
  if (o.emails) for (const m of text.match(RE_EMAIL) ?? []) add(m, 'email')
  if (o.macs) for (const m of text.match(RE_MAC) ?? []) add(m, 'mac')
  if (o.domains) for (const m of text.match(RE_DOMAIN) ?? []) add(m, 'dominio')
  if (o.users) {
    let m: RegExpExecArray | null
    const re = new RegExp(RE_USER.source, 'gi')
    while ((m = re.exec(text)) !== null) {
      const u = m[1].toLowerCase()
      if (!['root', 'admin', 'system', 'daemon', 'nobody', 'sshd', 'messagebus', 'user', 'usuario'].includes(u)) add(u, 'usuario')
    }
  }
  if (o.hostnames) {
    const re = new RegExp(RE_HOSTNAME.source, 'gi')
    for (const m of text.match(re) ?? []) {
      if (/\d/.test(m) && !/^\d/.test(m) && m.length > 4) add(m.toLowerCase(), 'hostname')
    }
  }
  return found
}

/* ── pseudonimización determinista ─────────────────────────────── */

function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function token(kind: AnonKind, orig: string, salt: string): string {
  const h = hash32(`${salt}:${kind}:${orig.toLowerCase()}`)
  switch (kind) {
    case 'ipv4':
      return `10.${(h >>> 24) & 0xff}.${(h >>> 16) & 0xff}.${(h >>> 8) & 0xff || 1}`
    case 'ipv6': {
      const hex = h.toString(16).padStart(8, '0')
      return `fd00:${hex.slice(0, 4)}::${hex.slice(4, 8)}:${(h ^ 0x5f5f).toString(16).padStart(4, '0')}`
    }
    case 'email': {
      const h2 = hash32(`${salt}:email2:${orig}`)
      const domain = orig.split('@')[1] ?? 'example.com'
      return `user${h % 10000}@${domain}`
    }
    case 'usuario':
      return `user_${(h % 9000 + 1000).toString(36)}`
    case 'mac': {
      const a = h.toString(16).padStart(8, '0')
      return `02:${a.slice(0, 2)}:${a.slice(2, 4)}:${a.slice(4, 6)}:${a.slice(6, 8)}:${((h >>> 4) & 0xff).toString(16).padStart(2, '0')}`
    }
    case 'dominio': {
      const tld = orig.split('.').pop() ?? 'example'
      const h2 = hash32(`${salt}:dom:${orig}`)
      return `dominio${h % 999}.${tld}`
    }
    case 'hostname': {
      const parts = orig.split('.')
      const host = `host${h % 999}`
      return parts.length > 1 ? `${host}.${parts.slice(1).join('.')}` : host
    }
    case 'subnet':
      return `10.${(h >>> 24) & 0xff}.${(h >>> 16) & 0xff}.0/24`
    default:
      return `anon-${h % 100000}`
  }
}

/* ── API principal ─────────────────────────────────────────────── */

export function anonymizeLog(text: string, o: AnonOptions): { result: string; matches: AnonMatch[] } {
  const found = detect(text, o)
  const matches: AnonMatch[] = []
  const map = new Map<string, string>()
  for (const [orig, kind] of found) {
    const tok = token(kind, orig, o.salt || 'salt')
    // evita que el token choque con otra entidad
    let final = tok
    let i = 1
    while ([...map.values()].includes(final)) final = tok + i++
    map.set(orig, final)
    matches.push({ kind, original: orig, token: final })
  }
  // ordenar por longitud descendente para no corromper substrings (ej: IP dentro de CIDR)
  const sorted = [...map.entries()].sort((a, b) => b[0].length - a[0].length)
  let out = text
  for (const [orig, tok] of sorted) {
    out = out.replaceAll(orig, tok)
  }
  return { result: out, matches }
}

/** Restaura el texto original a partir de la salida anonimizada + matches. */
export function deanonymizeLog(text: string, matches: AnonMatch[]): string {
  let out = text
  for (const m of matches) {
    out = out.replaceAll(m.token, m.original)
  }
  return out
}

export const ANON_FAQ: [string, string][] = [
  ['¿Por qué consistente?', 'Si la IP 1.2.3.4 aparece 40 veces como IP-anon-42, el análisis de frecuencia, correlación y timeline sigue siendo válido. Un reemplazo aleatorio rompería el análisis.'],
  ['¿Por qué una salt?', 'Con la misma salt los tokens son reproducibles entre ficheros del mismo caso; con otra salt, dos personas que comparten logs no pueden cruzar los datos. Elige una por caso.'],
  ['¿Qué no anonimiza?', 'Fechas, tamaños de fichero, IDs de proceso y cualquier metadato técnico: son los que hacen útil el análisis. Si el caso lo requiere, borra también líneas completas.'],
  ['¿Es GDPR-proof?', 'Ayuda muchísimo (IPs y usuarios son datos personales), pero la responsabilidad legal es tuya: valora cada caso y consulta a tu DPO si es un entorno regulado.'],
]

export const ANON_USECASES: string[] = [
  'Compartir auth.log en un foro pidiendo ayuda sin exponer IPs de tu empresa',
  'Enviar muestras de EVTX a un tercero para análisis forense',
  'Publicar un write-up de CTF sin doxxear la infraestructura del org',
  'Adjuntar logs a un ticket de soporte de un proveedor',
  'Difundir IOCs de un incidente sin revelar víctimas',
]
