/* Matemática de redes: IPv4 subnetting, VLSM e IPv6 */

export interface SubnetInfo {
  ip: string
  cidr: number
  network: string
  broadcast: string
  mask: string
  wildcard: string
  firstHost: string
  lastHost: string
  totalHosts: number
  usableHosts: number
  klass: string
  isPrivate: boolean
  networkInt: number
  maskInt: number
}

export const ipToInt = (ip: string): number => {
  const parts = ip.trim().split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) throw new Error(`IP inválida: ${ip}`)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

export const intToIp = (n: number): string => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

export const maskFromCidr = (cidr: number): number => (cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0)

export const cidrFromMaskInt = (mask: number): number => {
  let c = 0
  let m = mask
  while (m & 0x80000000) {
    c++
    m = (m << 1) >>> 0
  }
  if ((m & 0xffffffff) !== 0) throw new Error('Máscara no contigua (inválida)')
  return c
}

export const toBinaryIp = (n: number): string => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map((o) => o.toString(2).padStart(8, '0')).join('.')

export function classOf(ip: number): string {
  const first = ip >>> 24
  if (first < 128) return 'A'
  if (first < 192) return 'B'
  if (first < 224) return 'C'
  if (first < 240) return 'D (multicast)'
  return 'E (reservada)'
}

export function isPrivateIp(ip: number): boolean {
  const a = ip >>> 24
  const b = (ip >>> 16) & 255
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  return false
}

export function parseIpCidr(input: string): { ip: string; cidr: number } {
  const cleaned = input.trim()
  const m = cleaned.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/)
  if (!m) throw new Error('Formato: 192.168.1.10/24')
  const cidr = m[2] !== undefined ? parseInt(m[2]) : 24
  if (cidr < 0 || cidr > 32) throw new Error('CIDR debe estar entre 0 y 32')
  ipToInt(m[1]) // valida
  return { ip: m[1], cidr }
}

export function subnetInfo(ipStr: string, cidr: number): SubnetInfo {
  const ipInt = ipToInt(ipStr)
  const maskInt = maskFromCidr(cidr)
  const netInt = (ipInt & maskInt) >>> 0
  const bcInt = (netInt | (~maskInt >>> 0)) >>> 0
  const total = 2 ** (32 - cidr)
  const usable = cidr <= 30 ? total - 2 : cidr === 31 ? 2 : 1
  return {
    ip: ipStr,
    cidr,
    network: intToIp(netInt),
    broadcast: intToIp(bcInt),
    mask: intToIp(maskInt),
    wildcard: intToIp(~maskInt >>> 0),
    firstHost: intToIp(cidr <= 30 ? netInt + 1 : netInt),
    lastHost: intToIp(cidr <= 30 ? bcInt - 1 : bcInt),
    totalHosts: total,
    usableHosts: usable,
    klass: classOf(ipInt),
    isPrivate: isPrivateIp(ipInt),
    networkInt: netInt,
    maskInt,
  }
}

/* ---------------- VLSM ---------------- */

export interface VlsmRequest {
  name: string
  hosts: number
}
export interface VlsmBlock {
  name: string
  hosts: number
  cidr: number
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  usable: number
  total: number
  leftover: number
  mask: string
  netInt: number
  ok: boolean
}

export function prefixForHosts(hosts: number): number {
  if (hosts <= 1) return 32
  if (hosts <= 2) return 31
  return 32 - Math.ceil(Math.log2(hosts + 2))
}

export function vlsm(baseIp: string, baseCidr: number, reqs: VlsmRequest[]): { blocks: VlsmBlock[]; error?: string } {
  const base = subnetInfo(baseIp, baseCidr)
  let cursor = base.networkInt
  const limitEnd = base.networkInt + base.totalHosts
  const sorted = [...reqs]
    .map((r, i) => ({ ...r, _i: i }))
    .sort((x, y) => y.hosts - x.hosts || x._i - y._i)
  const blocks: VlsmBlock[] = []
  let error: string | undefined
  for (const r of sorted) {
    if (r.hosts <= 0) {
      blocks.push({ name: r.name, hosts: r.hosts, cidr: 32, network: '-', broadcast: '-', firstHost: '-', lastHost: '-', usable: 0, total: 0, leftover: 0, mask: '-', netInt: 0, ok: false })
      error = `La subred "${r.name}" necesita al menos 1 host`
      continue
    }
    const cidr = prefixForHosts(r.hosts)
    const size = 2 ** (32 - cidr)
    const aligned = Math.ceil(cursor / size) * size
    if (aligned + size > limitEnd) {
      blocks.push({ name: r.name, hosts: r.hosts, cidr, network: '(sin espacio)', broadcast: '-', firstHost: '-', lastHost: '-', usable: 0, total: size, leftover: 0, mask: intToIp(maskFromCidr(cidr)), netInt: 0, ok: false })
      error = `No hay espacio en ${base.network}/${baseCidr} para "${r.name}" (${r.hosts} hosts)`
      cursor = aligned + size
      continue
    }
    const usable = cidr <= 30 ? size - 2 : cidr === 31 ? 2 : 1
    blocks.push({
      name: r.name,
      hosts: r.hosts,
      cidr,
      network: intToIp(aligned),
      broadcast: intToIp(aligned + size - 1),
      firstHost: intToIp(cidr <= 30 ? aligned + 1 : aligned),
      lastHost: intToIp(cidr <= 30 ? aligned + size - 2 : aligned + size - 1),
      usable,
      total: size,
      leftover: usable - r.hosts,
      mask: intToIp(maskFromCidr(cidr)),
      netInt: aligned,
      ok: true,
    })
    cursor = aligned + size
  }
  // restaura el orden original de petición
  const ordered = [...blocks].sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }))
  return { blocks: ordered, error }
}

/* ---------------- IPv6 ---------------- */

export function ipv6Expand(addr: string): string {
  let a = addr.trim().toLowerCase()
  const zone = a.split('%')[0]
  let head = zone
  let tail = ''
  if (zone.includes('::')) {
    const [l, r = ''] = zone.split('::')
    head = l
    tail = r
  }
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  const groups = [...headGroups, ...Array(Math.max(0, missing)).fill('0'), ...tailGroups]
  if (groups.length !== 8) throw new Error(`IPv6 inválida: ${addr}`)
  return groups.map((g) => g.padStart(4, '0')).join(':')
}

export function ipv6Compress(addr: string): string {
  const full = ipv6Expand(addr)
  const groups = full.split(':')
  const bestZero = findBestZeroRun(groups)
  if (!bestZero) return full
  return full.replace(bestZero, '::')
}

function findBestZeroRun(groups: string[]): string | null {
  let best: { len: number; str: string } | null = null
  let i = 0
  while (i < groups.length) {
    if (groups[i] === '0000') {
      let j = i
      while (j < groups.length && groups[j] === '0000') j++
      const len = j - i
      if (len > 1 && (!best || len > best.len)) best = { len, str: groups.slice(i, j).join(':') }
      i = j
    } else i++
  }
  return best ? best.str : null
}

export function ipv6Type(addr: string): string {
  const a = ipv6Expand(addr)
  const first = a.split(':')[0]
  if (a === '0000:0000:0000:0000:0000:0000:0000:0000') return 'No especificada (::)'
  if (a === '0000:0000:0000:0000:0000:0000:0000:0001') return 'Loopback (::1)'
  if (first.startsWith('fe8')) return 'Link-local (fe80::/10)'
  if (first.startsWith('fec')) return 'Site-local (deprecated, fec0::/10)'
  if (first.startsWith('ff')) return 'Multicast (ff00::/8)'
  if (first.startsWith('fc') || first.startsWith('fd')) return 'ULA — Unique Local (fc00::/7)'
  if (first.startsWith('2002')) return '6to4 (2002::/16)'
  if (first.startsWith('2001') && a.startsWith('2001:0db8')) return 'Documentación (2001:db8::/32)'
  if (first.startsWith('2001')) return 'Global unicast (2001::/…)'
  return 'Global unicast / asignada por IANA'
}

export function ipv6PrefixInfo(addr: string, prefix: number) {
  const full = ipv6Expand(addr)
  const bytes = new Uint8Array(16)
  full.split(':').forEach((g, i) => {
    const n = parseInt(g, 16)
    bytes[i * 2] = n >> 8
    bytes[i * 2 + 1] = n & 0xff
  })
  const fullBits = prefix
  const netBytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    const bits = Math.min(8, Math.max(0, fullBits - i * 8))
    netBytes[i] = bits === 0 ? 0 : (bytes[i] & (0xff << (8 - bits))) & 0xff
  }
  const groups: string[] = []
  for (let i = 0; i < 8; i++) groups.push(((netBytes[i * 2] << 8) | netBytes[i * 2 + 1]).toString(16).padStart(4, '0'))
  const total = 2n ** BigInt(128 - prefix)
  return {
    network: ipv6Compress(groups.join(':')),
    total: total.toString(),
    prefix,
    fullPrefixNetwork: groups.join(':'),
  }
}

export function eui64(mac: string): string {
  const clean = mac.replace(/[:\-. ]/g, '')
  if (clean.length !== 12 || /[^0-9a-fA-F]/.test(clean)) throw new Error('MAC inválida (esperada 12 hex)')
  const b = [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16), parseInt(clean.slice(6, 8), 16), parseInt(clean.slice(8, 10), 16), parseInt(clean.slice(10, 12), 16)]
  b[0] ^= 0x02
  const iface = [b[0], b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]]
  const groups: string[] = []
  for (let i = 0; i < 4; i++) groups.push(((iface[i * 2] << 8) | iface[i * 2 + 1]).toString(16).padStart(4, '0'))
  return ipv6Compress(`fe80::${groups.join(':')}`)
}

export function ipv6ReverseDns(addr: string): string {
  const hex = ipv6Expand(addr).replace(/:/g, '')
  return hex.split('').reverse().join('.') + '.ip6.arpa'
}

/* ---------------- Tabla CIDR de referencia ---------------- */

export const CIDR_TABLE: { cidr: number; mask: string; hosts: number; usable: number }[] = Array.from({ length: 33 }, (_, cidr) => {
  const total = 2 ** (32 - cidr)
  return { cidr, mask: intToIp(maskFromCidr(cidr)), hosts: total, usable: cidr <= 30 ? total - 2 : cidr === 31 ? 2 : 1 }
}).reverse()
