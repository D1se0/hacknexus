/* NFTables: generador de rulesets nft (el sucesor de iptables en kernels
   modernos). Referencia: wiki.nftables.org, man nft(8). */

export type RuleAction = 'accept' | 'drop' | 'reject' | 'log-drop' | 'limit-drop'

export interface NftRule {
  id: string
  proto: 'tcp' | 'udp' | 'icmp' | 'icmpv6'
  port: string // '' = cualquier puerto (número o rango "60000:61000")
  source: string // '' = cualquier origen, si no IP o CIDR
  action: RuleAction
  comment: string
}

export interface NftOptions {
  iface: string
  defaultInput: 'drop' | 'accept'
  allowEstablished: boolean
  logDrops: boolean
  rateLimitSsh: boolean
  dropInvalid: boolean
  rules: NftRule[]
}

export const NFT_SERVICES: { label: string; proto: 'tcp' | 'udp' | 'icmp' | 'icmpv6'; port: string; desc: string }[] = [
  { label: 'HTTP', proto: 'tcp', port: '80', desc: 'web sin TLS' },
  { label: 'HTTPS', proto: 'tcp', port: '443', desc: 'web TLS' },
  { label: 'SSH', proto: 'tcp', port: '22', desc: 'shell remota' },
  { label: 'DNS', proto: 'udp', port: '53', desc: 'resolución de nombres' },
  { label: 'WireGuard', proto: 'udp', port: '51820', desc: 'VPN wireguard' },
  { label: 'mDNS', proto: 'udp', port: '5353', desc: 'descubrimiento local' },
  { label: 'NTP', proto: 'udp', port: '123', desc: 'sincronización de hora' },
  { label: 'Ping IPv4', proto: 'icmp', port: '', desc: 'echo-request ICMP (diagnóstico)' },
  { label: 'ICMPv6 (obligatorio)', proto: 'icmpv6', port: '', desc: 'IPv6 NECESITA ICMPv6: NDP y PMTUD dependen de él' },
]

export const ACTION_INFO: Record<RuleAction, string> = {
  accept: 'deja pasar el paquete',
  drop: 'descarta en silencio (el emisor no sabe por qué)',
  reject: 'descarta avisando (ICMP unreachable) — mejor UX, más info al atacante',
  'log-drop': 'escribe en el journal y descarta (auditable)',
  'limit-drop': 'limita la tasa y descarta el exceso',
}

/** Construye la expresión nft de una regla. */
function ruleExpr(r: NftRule): string {
  const parts: string[] = []
  if (r.source.trim()) parts.push(`ip saddr ${r.source.trim()}`)
  if (r.proto === 'icmp') parts.push('icmp type echo-request')
  else if (r.proto === 'icmpv6') parts.push('icmpv6 type echo-request')
  else if (r.port.trim()) parts.push(`${r.proto} dport ${r.port.trim()}`)
  else parts.push(`${r.proto}`)
  return parts.join(' ')
}

function ruleAction(r: NftRule): string {
  switch (r.action) {
    case 'log-drop': return 'limit rate 5/second log prefix "nft-drop: " drop'
    case 'limit-drop': return 'limit rate 30/minute drop'
    default: return r.action
  }
}

export function buildNftRuleset(o: NftOptions): string {
  const L: string[] = []
  L.push('#!/usr/sbin/nft -f')
  L.push('# ruleset generado por HackNexus — revisa y adapta antes de aplicar')
  L.push('flush ruleset')
  L.push('')
  L.push('table inet filter {')
  L.push('  chain input {')
  L.push(`    type filter hook input priority filter; policy ${o.defaultInput};`)
  L.push('    iifname "lo" accept comment "loopback"')
  if (o.allowEstablished) L.push('    ct state established,related accept comment "conexiones establecidas"')
  if (o.dropInvalid) L.push('    ct state invalid drop comment "paquetes inválidos"')
  if (o.rateLimitSsh) {
    L.push('    # anti fuerza bruta: máx 6 conexiones nuevas/minuto a SSH')
    L.push('    tcp dport 22 ct state new limit rate 6/minute burst 20 packets accept comment "ssh rate limit"')
  }
  for (const r of o.rules) {
    const comment = r.comment.trim() ? ` comment "${r.comment.trim().replace(/"/g, "'")}"` : ''
    L.push(`    ${ruleExpr(r)} ${ruleAction(r)}${comment}`)
  }
  if (o.logDrops && o.defaultInput === 'drop') {
    L.push('    limit rate 3/minute log prefix "nft-default-drop: " comment "muestra lo que la policy descarta"')
  }
  L.push('  }')
  L.push('')
  L.push('  chain forward {')
  L.push('    type filter hook forward priority filter; policy drop;')
  L.push('  }')
  L.push('')
  L.push('  chain output {')
  L.push('    type filter hook output priority filter; policy accept;')
  L.push('  }')
  L.push('}')
  return L.join('\n') + '\n'
}

export const NFT_VERIFY: [string, string][] = [
  ['nft -c -f ruleset.nft', 'comprueba sintaxis sin aplicar (-c = check)'],
  ['nft list ruleset', 'vuelca el ruleset activo'],
  ['nft -f ruleset.nft', 'aplica el ruleset (transitorio hasta reiniciar)'],
  ['systemctl enable nftables', 'persiste el ruleset de /etc/nftables.conf'],
  ['nft monitor trace', 'sigue el camino de paquetes en vivo (debug)'],
  ['conntrack -L', 'ver conexiones establecidas en vivo'],
]

export const NFT_NOTES: string[] = [
  'nft reemplaza a iptables: una sola sintaxis para IPv4+IPv6 (familia inet).',
  'policy drop en input + established/related accept es la base del mínimo privilegio.',
  'ICMPv6 no se puede bloquear del todo: NDP y PMTUD dependen de él.',
  'El rate limit no sustituye a fail2ban para SSH: ralentiza, no banea.',
  'Para listas negras usa sets: nft add set inet filter blackhole { type ipv4_addr; }; nft add element inet filter blackhole { 1.2.3.4 }',
  'CUIDADO al aplicar por SSH: prueba con "sleep 120 && nft flush ruleset" en background para no quedarte fuera.',
]
