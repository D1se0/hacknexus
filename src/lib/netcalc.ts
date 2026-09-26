/* Calculadoras de red para administradores de sistemas y redes:
   TTL→OS, MTU/MSS, wildcards ACL, plan de VLANs, ToS/DSCP,
   tiempos de transferencia y referencia CIDR rápida. */

/* ── 1. TTL → sistema operativo y saltos ── */

export const TTL_BASES: { base: number; os: string; note: string }[] = [
  { base: 255, os: 'Solaris / AIX / equipos de red Cisco / impressoras', note: 'los dispositivos de red suelen arrancar con 255' },
  { base: 128, os: 'Windows (todas las versiones modernas)', note: 'Windows clásico: XP→11 y Server' },
  { base: 64, os: 'Linux (la mayoría) / macOS / Android / iOS / FreeBSD', note: 'el estándar de facto del mundo unix-like' },
  { base: 60, os: 'Linux con TTL ajustado (Alpine, algunos contenedores)', note: 'algunas distros/contenedores reducen el TTL' },
  { base: 50, os: 'Linux compactado o TTL modificado manualmente', note: 'podría ser spoofing o tuning' },
  { base: 30, os: 'TTL muy bajo: proxy, balanceador o tweaking anti-fingerprint', note: 'sospechoso: pocos saltos o manipulación' },
]

export function ttlGuess(ttl: number): { base: number; os: string; note: string; hops: number; hopsDesc: string } {
  // elige la base MÁS CERCANA que sea plausible: la mayor base cuyo hueco (base - ttl)
  // sea razonable para una ruta real (≤ 40 saltos) y ttl sea >= base - 64 de la siguiente
  const candidates = TTL_BASES.filter((b) => ttl <= b.base && b.base - ttl <= 40).sort((a, b) => a.base - b.base)
  const match = candidates[0] ?? TTL_BASES.filter((b) => ttl <= b.base).sort((a, b) => a.base - b.base)[0] ?? TTL_BASES[2]
  const hops = match.base - ttl
  return {
    base: match.base,
    os: match.os,
    note: match.note,
    hops,
    hopsDesc: `${hops} ${hops === 1 ? 'salto' : 'saltos'} entre tu ping y el objetivo (asumiendo TTL inicial ${match.base})`,
  }
}

/* ── 2. MTU / MSS ── */

export const COMMON_MTUS: { mtu: number; label: string; note: string }[] = [
  { mtu: 1500, label: 'Ethernet estándar', note: 'el default de casi toda red' },
  { mtu: 1492, label: 'PPPoE', note: '8 bytes de cabecera PPPoE: el clásico de fibra/ADSL doméstico' },
  { mtu: 1480, label: 'PPPoE + VLAN', note: 'ISP con tagging 802.1Q adicional' },
  { mtu: 1472, label: 'L2TP/IPsec o GRE sin adjust', note: 'encapsulación de VPN con overhead ~28 bytes' },
  { mtu: 1450, label: 'OpenVPN/WireGuard típico', note: 'overhead de cifrado + encapsulación' },
  { mtu: 1400, label: 'VPN con múltiples capas', note: 'valor conservador que casi nunca fragmenta' },
  { mtu: 9000, label: 'Jumbo frames', note: 'solo en redes dedicadas (SAN, iSCSI): TODA la ruta lo debe soportar' },
]

export function mtuBreakdown(mtu: number) {
  return {
    ipPayload: mtu - 20,
    tcpMss4: mtu - 40, // IPv4 (20) + TCP (20)
    tcpMss6: mtu - 60, // IPv6 (40) + TCP (20)
    pingSize: mtu - 28, // IP (20) + ICMP (8): el -s de ping
    pingCmd: `ping -M do -s ${mtu - 28} -c 3 destino`,
    pingWin: `ping destino -f -l ${mtu - 28} -n 3`,
  }
}

export const MTU_NOTES: string[] = [
  'PMTUD: el descubrimiento automático depende de que los ICMP "fragmentation needed" no se filtren — si bloqueas TODO el ICMP, el "blackhole" te rompe TLS.',
  'El MSS se negocia en el handshake TCP: clamping a 1360-1400 en el router es la solución rápida a VPNeos que "conectan pero no cargan web".',
  'Linux: ping -M do -s N → no fragmenta. Si pasa 1472 en una red 1500 falla: ese es el test de PMTUD real.',
  'Jumbo frames mal aplicados = timeouts misteriosos: solo en VLAN/red dedicada controlada de extremo a extremo.',
]

/* ── 3. Wildcards y ACL Cisco ── */

export function prefixToMask(p: number): string {
  const bin = '1'.repeat(p).padEnd(32, '0')
  return [0, 8, 16, 24].map((i) => parseInt(bin.slice(i, i + 8), 2)).join('.')
}

export function prefixToWildcard(p: number): string {
  const bin = '0'.repeat(p).padEnd(32, '1')
  return [0, 8, 16, 24].map((i) => parseInt(bin.slice(i, i + 8), 2)).join('.')
}

export function maskToPrefix(mask: string): number | null {
  const parts = mask.split('.').map(Number)
  if (parts.length !== 4 || parts.some((x) => Number.isNaN(x) || x < 0 || x > 255)) return null
  let ones = 0, done = false
  for (const part of parts) {
    const bits = part.toString(2).padStart(8, '0')
    for (const b of bits) {
      if (b === '1') { if (done) return null; ones++ } else done = true
    }
  }
  return ones
}

export function wildcardAcl(ip: string, prefix: number): { wildcard: string; mask: string; ciscoStd: string; ciscoExt: string; nft: string } {
  const wildcard = prefixToWildcard(prefix)
  const mask = prefixToMask(prefix)
  const net = ipInNet(ip, prefix)
  const base = net.network
  return {
    wildcard,
    mask,
    ciscoStd: `access-list 10 permit ${base} ${wildcard}`,
    ciscoExt: `access-list 100 permit ip ${base} ${wildcard} any`,
    nft: `ip saddr ${base}/${prefix} accept`,
  }
}

/* ── 4. Red desde IP + prefijo ── */

function ipToInt(ip: string): number {
  const p = ip.split('.').map(Number)
  if (p.length !== 4 || p.some((x) => Number.isNaN(x) || x < 0 || x > 255)) return -1
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0
}

function intToIp(n: number): string {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')
}

export function ipInNet(ip: string, prefix: number): { network: string; broadcast: string; first: string; last: string; total: number; usable: number; mask: string; wildcard: string } {
  const n = ipToInt(ip) >>> 0
  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const netInt = (n & maskInt) >>> 0
  const bcInt = (netInt | (~maskInt >>> 0)) >>> 0
  const total = 2 ** (32 - prefix)
  const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : total - 2
  return {
    network: intToIp(netInt),
    broadcast: intToIp(bcInt),
    first: intToIp(prefix >= 31 ? netInt : netInt + 1),
    last: intToIp(prefix >= 31 ? bcInt : bcInt - 1),
    total,
    usable,
    mask: prefixToMask(prefix),
    wildcard: prefixToWildcard(prefix),
  }
}

export const CIDR_TABLE: { p: number; hosts: number; use: string }[] = [
  { p: 8, hosts: 16777214, use: '10.0.0.0/8 clásico de red privada gigante' },
  { p: 16, hosts: 65534, use: '172.16.0.0/16 o campus entero' },
  { p: 20, hosts: 4094, use: 'rango por sede mediana' },
  { p: 22, hosts: 1022, use: 'departamento grande (por qué /22 y no /24: crece sin renumerar)' },
  { p: 24, hosts: 254, use: 'LAN estándar por oficina/piso' },
  { p: 25, hosts: 126, use: 'mitad de una /24: dos departamentos por clase C' },
  { p: 26, hosts: 62, use: '4 subredes por /24: típico para VLANs pequeñas' },
  { p: 27, hosts: 30, use: '8 subredes por /24: servidores por función' },
  { p: 28, hosts: 14, use: '16 subredes por /24: punto-a-punto multiplexado' },
  { p: 29, hosts: 6, use: 'DMZ pequeña, grupos de appliances' },
  { p: 30, hosts: 2, use: 'enlaces punto a punto (clásico de routers)' },
  { p: 31, hosts: 2, use: 'punto a punto RFC 3021 (sin broadcast)' },
  { p: 32, hosts: 1, use: 'host único / loopback / ACL de una IP' },
]

export function countSubnets(base: number, target: number): number {
  return 2 ** (target - base)
}

/* ── 5. Plan de VLANs ── */

export interface VlanDef { id: number; name: string; hosts: number }

export const RESERVED_VLANS: [number, string][] = [
  [1, 'VLAN 1 es la default: TODO el tráfico sin tagging vive aquí — best practice: no usarla para datos'],
  [1002, '1002-1005: reservadas legacy para FDDI/Token Ring en Cisco'],
  [1006, '1006-4094: extendidas — requieren "vtp mode transparent" en switches antiguos'],
]

export function fitPrefix(hosts: number): number {
  // menor prefijo cuyo usable >= hosts (mínimo /30, salvo hosts=1-2)
  if (hosts <= 2) return 30
  for (let p = 30; p >= 8; p--) {
    if (ipInNet('10.0.0.0', p).usable >= hosts) return p
  }
  return 8
}

export function vlanPlan(vlans: VlanDef[], baseNet: string, basePrefix: number): { ok: boolean; rows: { id: number; name: string; network: string; prefix: number; mask: string; gateway: string; usable: number; hosts: number; waste: number }[]; errors: string[]; routerOnAStick: string } {
  const errors: string[] = []
  const seen = new Set<number>()
  for (const v of vlans) {
    if (v.id < 1 || v.id > 4094) errors.push(`VLAN ${v.id}: fuera de rango (1-4094)`)
    if (v.id === 1) errors.push('VLAN 1: evítala para datos (la default insegura)')
    if (v.id >= 1002 && v.id <= 1005) errors.push(`VLAN ${v.id}: reservada legacy`)
    if (seen.has(v.id)) errors.push(`VLAN ${v.id}: duplicada`)
    seen.add(v.id)
  }
  const base = ipInNet(baseNet, basePrefix)
  const baseInt = ipToInt(base.network)
  const blockBits = 32 - basePrefix
  let offset = 0
  const rows = vlans.map((v) => {
    const p = fitPrefix(Math.max(v.hosts, 2))
    const size = 2 ** (32 - p)
    const block = Math.max(size, 2 ** blockBits) // respeta el bloque base (no solapar fuera)
    const netInt = (baseInt + offset) >>> 0
    offset += block
    const info = ipInNet(intToIp(netInt), p)
    return {
      id: v.id,
      name: v.name || `VLAN${v.id}`,
      network: info.network,
      prefix: p,
      mask: info.mask,
      gateway: intToIp(ipToInt(info.network) + 1),
      usable: info.usable,
      hosts: v.hosts,
      waste: info.usable - v.hosts,
    }
  })
  const routerOnAStick = rows
    .map((r) => [
      `! VLAN ${r.id} (${r.name})`,
      `interface GigabitEthernet0/0.${r.id}`,
      ` encapsulation dot1Q ${r.id}`,
      ` ip address ${r.gateway} ${r.mask}`,
      `! Linux (interfaz trunk eth0):`,
      `ip link add link eth0 name eth0.${r.id} type vlan id ${r.id}`,
      `ip addr add ${r.gateway}/${r.prefix} dev eth0.${r.id} && ip link set eth0.${r.id} up`,
    ].join('\n'))
    .join('\n\n')
  return { ok: errors.length === 0, rows, errors, routerOnAStick }
}

export const VLAN_NOTES: string[] = [
  'Nunca uses la VLAN 1 para datos ni management: cualquier puerto sin tagging cae ahí (años de incidentes lo respaldan).',
  'Voice VLAN, datos y management separadas SIEMPRE: el acesso telefónico no debe ver tráfico de servidores.',
  'El gateway de cada VLAN vive en el router/firewall (router-on-a-stick) o SVI del L3 switch: la tabla de arriba te lo da calculado.',
  'La herramienta dimensiona cada VLAN con el prefijo mínimo que acoge sus hosts: el "waste" es el margen para crecer.',
]

/* ── 6. ToS / DSCP ── */

export const DSCP_NAMES: Record<number, string> = {
  0: 'CS0 — Best Effort (tráfico sin clase)',
  8: 'CS1 — Scavenger (bulk: backups)',
  10: 'AF11 — Assured Forwarding clase 1 baja',
  12: 'AF12', 14: 'AF13',
  16: 'CS2 — OAM / administración',
  18: 'AF21', 20: 'AF22', 22: 'AF23',
  24: 'CS3 — señalización (SIP)',
  26: 'AF31', 28: 'AF32', 30: 'AF33',
  32: 'CS4 — vídeo en tiempo real',
  34: 'AF41 — vídeo interactivo',
  36: 'AF42', 38: 'AF43',
  40: 'CS5 — broadcast vídeo',
  46: 'EF — Expedited Forwarding (VOZ: la más prioritaria)',
  48: 'CS6 — protocolos de red (OSPF, BGP)',
  56: 'CS7 — reservado',
}

export function tosBreakdown(tos: number): { dscp: number; dscpName: string; ecn: number; ecnDesc: string; binary: string } {
  const dscp = tos >> 2
  const ecn = tos & 0b11
  const ecnDesc = ['ECN no soportado', 'ECN transport(0)', 'ECN transport(1)', 'congestión experimentada'][ecn]
  return { dscp, dscpName: DSCP_NAMES[dscp] ?? `DSCP ${dscp} (no estándar)`, ecn, ecnDesc, binary: tos.toString(2).padStart(8, '0') }
}

export function dscpToTos(dscp: number): number { return dscp << 2 }

/* ── 7. Tiempo de transferencia ── */

export function transferTime(sizeMB: number, mbps: number, overheadPct = 5): { seconds: number; human: string; effective: number } {
  const effective = mbps * (1 - overheadPct / 100)
  const seconds = (sizeMB * 8) / effective
  const human = seconds < 60
    ? `${seconds.toFixed(1)} s`
    : seconds < 3600
      ? `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
      : `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`
  return { seconds, human, effective }
}

export const BW_NOTES: string[] = [
  'La regla práctica: 1 GB por 100 Mbps ≈ 85-90 s reales (teóricos 80 s) — el 5% de overhead ya lo descuenta esta tabla.',
  'El cuello suele ser el DISCO, no la red: un NAS SATA no llena un 10 GbE aunque el switch diga lo contrario.',
  'Para transferencias grandes entre Linux: rsync -P (progreso+reanudable) o scp; en Windows, robocopy /MT.',
  'Latencia importa más que ancho de banda en transferencias de muchos ficheros pequeños: usa tar/rsync para agrupar.',
]
