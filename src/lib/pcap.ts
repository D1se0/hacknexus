/* Analizador PCAP/PCAPNG 100% client-side.
   Soporta: Ethernet II, ARP, VLAN, IPv4, IPv6, TCP, UDP, DNS, HTTP básico, ICMP.
   Soporta endianess de pcap (little/big) y bloques pcapng EPB. */

import { hexToBytes } from './util'

export interface PcapPacket {
  index: number
  ts: number
  tsStr: string
  linkLayer: string
  srcMac?: string
  dstMac?: string
  src?: string
  dst?: string
  ipVersion?: number
  proto?: string
  protoNum?: number
  srcPort?: number
  dstPort?: number
  seq?: number
  ack?: number
  flags?: string[]
  payloadHex?: string
  payloadPreview?: string
  isDns?: boolean
  isHttp?: boolean
  dnsName?: string
  httpMethod?: string
  httpHost?: string
  httpPath?: string
  icmpType?: number
  len: number
  suspicious?: string[]
}

export interface PcapStats {
  totalPackets: number
  byProto: Record<string, number>
  bySrcPort: Record<number, number>
  byDstPort: Record<number, number>
  topTalkers: { ip: string; count: number; bytes: number }[]
  uniqueIps: string[]
  uniqueDns: string[]
  httpRequests: number
  dnsQueries: number
  suspicious: PcapPacket[]
  durationSec: number
  totalBytes: number
  firstTs: number
  lastTs: number
}

export interface PcapAnalysis {
  packets: PcapPacket[]
  stats: PcapStats
  warnings: string[]
}

const TCP_FLAGS = [
  [0x01, 'FIN'], [0x02, 'SYN'], [0x04, 'RST'], [0x08, 'PSH'], [0x10, 'ACK'], [0x20, 'URG'], [0x40, 'ECE'], [0x80, 'CWR'],
] as const

const PROTO_NAMES: Record<number, string> = {
  1: 'ICMP', 2: 'IGMP', 6: 'TCP', 17: 'UDP', 41: 'IPv6', 47: 'GRE', 50: 'ESP', 58: 'ICMPv6', 89: 'OSPF', 132: 'SCTP',
}

function mac(b: Uint8Array, off: number): string {
  return Array.from(b.slice(off, off + 6), (x) => x.toString(16).padStart(2, '0')).join(':')
}

function readUint(b: Uint8Array, off: number, len: number, little = true): number {
  let v = 0
  if (little) for (let i = len - 1; i >= 0; i--) v = v * 256 + b[off + i]
  else for (let i = 0; i < len; i++) v = v * 256 + b[off + i]
  return v
}

export function isPcapng(buf: Uint8Array): boolean {
  return buf.length > 12 && readUint(buf, 0, 4, true) === 0x0a0d0d0a
}

export function parsePcap(bytes: Uint8Array): PcapAnalysis {
  const warnings: string[] = []
  const packets: PcapPacket[] = []
  if (isPcapng(bytes)) {
    warnings.push('Formato PCAPNG detectado: soportado vía bloques EPB (link-layer del primer IDB).')
    return parsePcapng(bytes, warnings)
  }
  if (bytes.length < 24) throw new Error('Archivo demasiado pequeño para ser un pcap')
  const magic = readUint(bytes, 0, 4, true)
  let little: boolean
  let nanos: boolean
  if (magic === 0xa1b2c3d4) { little = true; nanos = false }
  else if (magic === 0xd4c3b2a1) { little = false; nanos = false }
  else if (magic === 0xa1b23c4d) { little = true; nanos = true }
  else if (magic === 0x4d3cb2a1) { little = false; nanos = true }
  else throw new Error('Magic bytes de pcap no reconocidos (¿corrupto o comprimido?)')
  const linkType = readUint(bytes, 20, 4, little)
  const linkName = ({ 1: 'Ethernet', 101: 'RAW IP', 113: 'Linux SLL', 12: 'RAW (obsolete)' } as Record<number, string>)[linkType] ?? `tipo ${linkType}`
  if (linkType !== 1) warnings.push(`Link-layer ${linkName}: el parseo de cabeceras Ethernet se omite (soporte completo solo para Ethernet).`)

  let off = 24
  let index = 0
  while (off + 16 <= bytes.length) {
    const tsSec = readUint(bytes, off, 4, little)
    const tsSub = readUint(bytes, off + 4, 4, little)
    const inclLen = readUint(bytes, off + 8, 4, little)
    const origLen = readUint(bytes, off + 12, 4, little)
    void origLen
    if (inclLen > 262144) {
      warnings.push(`Paquete #${index} con longitud anómala (${inclLen} B): se detiene el parseo (posible corrupto)`)
      break
    }
    if (off + 16 + inclLen > bytes.length) break
    const frame = bytes.slice(off + 16, off + 16 + inclLen)
    const ts = tsSec * 1000 + (nanos ? Math.round(tsSub / 1000) : tsSub * 1000)
    packets.push(parseFrame(frame, index, ts, linkType))
    off += 16 + inclLen
    index++
    if (index >= 20000) {
      warnings.push('Se analizan los primeros 20000 paquetes (límite del navegador).')
      break
    }
  }
  const stats = computeStats(packets)
  return { packets, stats, warnings }
}

function parsePcapng(bytes: Uint8Array, warnings: string[]): PcapAnalysis {
  const packets: PcapPacket[] = []
  let off = 0
  let linkType = 1
  let index = 0
  while (off + 12 <= bytes.length) {
    const blockType = readUint(bytes, off, 4, true)
    const blockLen = readUint(bytes, off + 4, 4, true)
    if (blockLen < 12 || off + blockLen > bytes.length) break
    if (blockType === 0x00000001) linkType = readUint(bytes, off + 8, 2, true) // IDB
    if (blockType === 0x00000006 && index < 20000) {
      // EPB
      const iface = readUint(bytes, off + 8, 4, true)
      void iface
      const tsHigh = readUint(bytes, off + 12, 4, true)
      const tsLow = readUint(bytes, off + 16, 4, true)
      const capLen = readUint(bytes, off + 20, 4, true)
      const ts = ((tsHigh * 2 ** 32) + tsLow) / 1000 // us → ms
      if (capLen > 262144) break
      const frame = bytes.slice(off + 28, off + 28 + capLen)
      packets.push(parseFrame(frame, index, ts, linkType))
      index++
    }
    off += blockLen
  }
  return { packets, stats: computeStats(packets), warnings }
}

function parseFrame(frame: Uint8Array, index: number, ts: number, linkType: number): PcapPacket {
  const tsStr = new Date(ts).toLocaleTimeString('es-ES', { hour12: false }) + '.' + String(ts % 1000).padStart(3, '0')
  const pkt: PcapPacket = { index, ts, tsStr, linkLayer: 'Ethernet', len: frame.length }
  let off = 0
  if (linkType === 1) {
    if (frame.length < 14) return pkt
    pkt.dstMac = mac(frame, 0)
    pkt.srcMac = mac(frame, 6)
    const ethType = readUint(frame, 12, 2)
    off = 14
    if (ethType === 0x8100 && frame.length >= 18) {
      off = 18
      pkt.linkLayer = 'Ethernet (VLAN)'
    } else if (ethType === 0x0806 && frame.length >= 42) {
      // ARP
      const sha = mac(frame, off + 8)
      const spa = Array.from(frame.slice(off + 14, off + 18)).join('.')
      pkt.proto = 'ARP'
      pkt.protoNum = -1
      pkt.src = spa
      pkt.dst = 'broadcast'
      pkt.suspicious = [`${sha} dice ser ${spa} (¿ARP spoofing? comprobar duplicados)`]
      pkt.payloadPreview = `who-has ${spa} tell ${sha}`
      return pkt
    } else if (ethType !== 0x0800 && ethType !== 0x86dd) return pkt
  } else {
    off = 0
    pkt.linkLayer = 'RAW IP'
  }

  // IPv4 / IPv6
  if (frame.length <= off) return pkt
  const ver = frame[off] >> 4
  if (ver === 4) {
    if (frame.length < off + 20) return pkt
    pkt.ipVersion = 4
    const ihl = (frame[off] & 0x0f) * 4
    const protoNum = frame[off + 9]
    pkt.protoNum = protoNum
    pkt.proto = PROTO_NAMES[protoNum] ?? `proto ${protoNum}`
    pkt.src = Array.from(frame.slice(off + 12, off + 16)).join('.')
    pkt.dst = Array.from(frame.slice(off + 16, off + 20)).join('.')
    const fragFlags = readUint(frame, off + 6, 2)
    if ((fragFlags & 0x2000) !== 0) pkt.suspicious = ['paquete fragmentado']
    off += ihl
    parseL4(frame, off, protoNum, pkt)
  } else if (ver === 6) {
    if (frame.length < off + 40) return pkt
    pkt.ipVersion = 6
    pkt.protoNum = frame[off + 6]
    const groups: string[] = []
    const read6 = (o: number) => {
      const g: string[] = []
      for (let i = 0; i < 8; i++) g.push(((frame[o + i * 2] << 8) | frame[o + i * 2 + 1]).toString(16))
      return g.join(':')
    }
    pkt.src = read6(off + 8)
    groups.length = 0
    pkt.dst = read6(off + 24)
    pkt.proto = pkt.protoNum === 58 ? 'ICMPv6' : PROTO_NAMES[pkt.protoNum ?? 0] ?? `proto ${pkt.protoNum}`
    off += 40
    parseL4(frame, off, pkt.protoNum ?? 0, pkt)
  }
  return pkt
}

function parseL4(frame: Uint8Array, off: number, protoNum: number, pkt: PcapPacket) {
  const rest = frame.length - off
  if (protoNum === 6) {
    if (rest < 20) return
    const srcPort = readUint(frame, off, 2)
    const dstPort = readUint(frame, off + 2, 2)
    pkt.srcPort = srcPort
    pkt.dstPort = dstPort
    const dataOff = (frame[off + 12] >> 4) * 4
    const flagByte = frame[off + 13]
    pkt.flags = TCP_FLAGS.filter(([bit]) => (flagByte & bit) !== 0).map(([, n]) => n)
    pkt.seq = readUint(frame, off + 4, 4)
    pkt.ack = readUint(frame, off + 8, 4)
    const payload = frame.slice(off + dataOff)
    analyzePayload(payload, pkt)
  } else if (protoNum === 17) {
    if (rest < 8) return
    pkt.srcPort = readUint(frame, off, 2)
    pkt.dstPort = readUint(frame, off + 2, 2)
    const payload = frame.slice(off + 8)
    analyzePayload(payload, pkt)
  } else if (protoNum === 1 || protoNum === 58) {
    if (rest < 8) return
    pkt.icmpType = frame[off]
    const names: Record<number, string> = { 0: 'echo-reply', 3: 'dest-unreachable', 8: 'echo-request', 9: 'router-advert', 10: 'router-solicit', 11: 'ttl-exceeded', 13: 'timestamp', 135: 'ns', 136: 'na' }
    pkt.payloadPreview = `ICMP type=${pkt.icmpType} (${names[pkt.icmpType] ?? '?'}) code=${frame[off + 1]}`
  }
}

function analyzePayload(payload: Uint8Array, pkt: PcapPacket) {
  if (!payload.length) return
  pkt.payloadHex = Array.from(payload.slice(0, 96), (b) => b.toString(16).padStart(2, '0')).join('')
  const previewBytes = payload.slice(0, 256)
  pkt.payloadPreview = new TextDecoder('latin1').decode(previewBytes).replace(/[^\x20-\x7e\n\r\t]/g, '·')
  const isDnsPort = pkt.srcPort === 53 || pkt.dstPort === 53
  if (isDnsPort) {
    pkt.isDns = true
    pkt.dnsName = extractDnsName(payload, pkt.dstPort === 53)
  }
  const isHttp = pkt.srcPort === 80 || pkt.dstPort === 80 || pkt.srcPort === 8080 || pkt.dstPort === 8080
  if (isHttp) {
    const text = new TextDecoder('latin1').decode(payload.slice(0, 512))
    const m = text.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) ([^ ]+) HTTP/)
    if (m) {
      pkt.isHttp = true
      pkt.httpMethod = m[1]
      pkt.httpPath = m[2]
      const host = text.match(/[Hh]ost: ([^\r\n]+)/)
      pkt.httpHost = host?.[1]
    }
    if (/^HTTP\/1\.[01] \d{3}/.test(text)) {
      pkt.isHttp = true
      pkt.httpMethod = 'RESPONSE'
    }
  }
  const sus: string[] = []
  if (pkt.dstPort === 4444 || pkt.dstPort === 5555 || pkt.dstPort === 9999 || pkt.srcPort === 4444) sus.push('puerto asociado a C2/meterpreter (4444/5555/9999)')
  if (pkt.dstPort === 23 || pkt.srcPort === 23) sus.push('tráfico Telnet en claro (credenciales visibles)')
  if (pkt.dstPort === 445 || pkt.srcPort === 445) sus.push('SMB: vector clásico de explotación lateral')
  if (pkt.payloadPreview?.includes('NTLMSSP')) sus.push('negociación NTLM (posible relay/hashing)')
  if (pkt.icmpType === 8 && (payload.length > 128)) sus.push('ICMP echo grande (¿exfiltración ICMP?)')
  if (sus.length) pkt.suspicious = sus
}

function extractDnsName(payload: Uint8Array, isResponse: boolean): string {
  // DNS: header 12 bytes, luego QD/AN. Simplificación: primer QNAME
  try {
    let off = 12
    const labels: string[] = []
    let guard = 0
    while (off < payload.length && guard++ < 64) {
      const len = payload[off]
      if (len === 0) break
      if ((len & 0xc0) === 0xc0) break // puntero
      labels.push(new TextDecoder('latin1').decode(payload.slice(off + 1, off + 1 + len)))
      off += 1 + len
    }
    const name = labels.join('.')
    return isResponse && !name ? '(respuesta)' : name || '(?)'
  } catch {
    return '(?)'
  }
}

function computeStats(packets: PcapPacket[]): PcapStats {
  const byProto: Record<string, number> = {}
  const bySrcPort: Record<number, number> = {}
  const byDstPort: Record<number, number> = {}
  const talkers = new Map<string, { count: number; bytes: number }>()
  const ips = new Set<string>()
  const dns = new Set<string>()
  let httpRequests = 0
  let dnsQueries = 0
  const suspicious: PcapPacket[] = []
  for (const p of packets) {
    if (p.proto) byProto[p.proto] = (byProto[p.proto] ?? 0) + 1
    if (p.srcPort) bySrcPort[p.srcPort] = (bySrcPort[p.srcPort] ?? 0) + 1
    if (p.dstPort) byDstPort[p.dstPort] = (byDstPort[p.dstPort] ?? 0) + 1
    for (const ip of [p.src, p.dst]) {
      if (ip) {
        ips.add(ip)
        const t = talkers.get(ip) ?? { count: 0, bytes: 0 }
        t.count++
        t.bytes += p.len
        talkers.set(ip, t)
      }
    }
    if (p.dnsName && p.dnsName !== '(respuesta)' && p.dnsName !== '(?)') {
      dns.add(p.dnsName)
      dnsQueries++
    }
    if (p.isHttp && p.httpMethod && p.httpMethod !== 'RESPONSE') httpRequests++
    if (p.suspicious?.length) suspicious.push(p)
  }
  const topTalkers = [...talkers.entries()].map(([ip, v]) => ({ ip, ...v })).sort((a, b) => b.bytes - a.bytes).slice(0, 15)
  const firstTs = packets.length ? packets[0].ts : 0
  const lastTs = packets.length ? packets[packets.length - 1].ts : 0
  return {
    totalPackets: packets.length,
    byProto,
    bySrcPort,
    byDstPort,
    topTalkers,
    uniqueIps: [...ips],
    uniqueDns: [...dns],
    httpRequests,
    dnsQueries,
    suspicious: suspicious.slice(0, 200),
    durationSec: (lastTs - firstTs) / 1000,
    totalBytes: packets.reduce((a, p) => a + p.len, 0),
    firstTs,
    lastTs,
  }
}

/* Texto → hex para el modo "pegar hexdump" */
export function hexdumpToBytes(text: string): Uint8Array {
  // intenta formato hexdump clásico (offset + hex + ascii) o hex plano
  const hexLines = text.split(/\r?\n/).map((l) => {
    // quita offset inicial y ascii final
    let m = l.replace(/^[0-9a-fA-F]{4,8}\s{1,2}/, '')
    m = m.replace(/\s{2,}\|?.*$/, '')
    return m.replace(/[^0-9a-fA-F]/g, '')
  }).join('')
  if (hexLines.length >= 2) return hexToBytes(hexLines)
  const flat = text.replace(/[^0-9a-fA-F]/g, '')
  return hexToBytes(flat)
}