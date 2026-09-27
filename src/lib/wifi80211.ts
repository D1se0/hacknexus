/* Decodificador de frames 802.11 desde hex — 100% local.
   Parsea el MAC header real (Frame Control, flags, direcciones, seq) y los
   Information Elements de beacons/probes (SSID, rates, canal, RSN/WPA2/WPA3,
   vendor OUIs, HT capabilities). Radio capturada con tcpdump/tshark/airodump. */

export interface FrameFlags {
  toDS: boolean
  fromDS: boolean
  moreFrag: boolean
  retry: boolean
  powerMgmt: boolean
  moreData: boolean
  protectedFrame: boolean
  order: boolean
}

export interface WpaSuite {
  label: string
}

export interface WifiIe {
  id: number
  name: string
  len: number
  detail: string
  notable?: boolean
}

export interface WifiFrameInfo {
  ok: boolean
  error?: string
  version: number
  type: string
  subtype: string
  flags: FrameFlags
  flagText: string[]
  duration: number
  addr1: string
  addr2: string
  addr3: string
  addrLabels: [string, string, string]
  seq: number
  frag: number
  fcsOk: boolean | null
  ies: WifiIe[]
  ssid: string | null
  channel: number | null
  security: string[]
  rsnInfo: string | null
  size: number
}

const FRAME_TYPES: Record<number, string> = { 0: 'Management', 1: 'Control', 2: 'Data', 3: 'Reserved' }
const MGMT_SUBTYPES: Record<number, string> = {
  0: 'Association Request', 1: 'Association Response', 2: 'Reassociation Request', 3: 'Reassociation Response',
  4: 'Probe Request', 5: 'Probe Response', 8: 'Beacon', 9: 'ATIM', 10: 'Disassociation', 11: 'Authentication',
  12: 'Deauthentication', 13: 'Action', 14: 'Action No Ack',
}
const CTRL_SUBTYPES: Record<number, string> = {
  4: 'Beamforming Report Poll', 5: 'VHT/NDP Announcement', 6: 'Control Frame Extension', 7: 'Control Wrapper',
  8: 'Block Ack Request', 9: 'Block Ack', 10: 'PS-Poll', 11: 'RTS', 12: 'CTS', 13: 'Ack', 14: 'CF-End', 15: 'CF-End+CF-Ack',
}
const DATA_SUBTYPES: Record<number, string> = { 0: 'Data', 1: 'Data+CF-Ack', 2: 'Data+CF-Poll', 4: 'Null (no data)', 8: 'QoS Data', 12: 'QoS Null' }

const IE_NAMES: Record<number, string> = {
  0: 'SSID', 1: 'Supported Rates', 3: 'DS Parameter Set (canal)', 5: 'TIM', 7: 'Country', 11: 'ERP', 32: 'Power Capability',
  45: 'HT Capabilities', 48: 'RSN (WPA2/WPA3)', 50: 'Extended Supported Rates', 61: 'HT Operation', 127: 'Extended Capabilities',
  191: 'VHT Capabilities', 192: 'VHT Operation', 221: 'Vendor Specific', 244: 'RM Enabled',
}

const CIPHER_SUITES: Record<string, string> = {
  '00-0f-ac-01': 'WEP-40', '00-0f-ac-02': 'TKIP (WPA1, roto)', '00-0f-ac-04': 'CCMP-128 (WPA2 estándar)',
  '00-0f-ac-06': 'GCMP-128 (WPA3)', '00-0f-ac-08': 'GCMP-256 (WPA3)', '00-0f-ac-09': 'GCMP-256 (WPA3)',
}
const AKM_SUITES: Record<string, string> = {
  '00-0f-ac-01': '802.1X (WPA2-Enterprise)', '00-0f-ac-02': 'PSK (WPA2-Personal)', '00-0f-ac-03': 'FT-802.1X', '00-0f-ac-04': 'FT-PSK',
  '00-0f-ac-05': '802.1X con SHA-256', '00-0f-ac-06': 'PSK con SHA-256', '00-0f-ac-08': 'SAE (WPA3)', '00-0f-ac-09': 'FT-SAE (WPA3)',
  '00-0f-ac-12': 'SAE hash-to-element (WPA3)', '00-0f-ac-18': 'OWE (Enhanced Open)',
}
const OUIS: Record<string, string> = {
  '00-50-f2': 'Microsoft (WPA1 legacy)', '00-0c-43': ' Cisco (CCX)', '00-17-f2': 'Apple', '00-e0-4c': 'Realtek',
  '04-ce-14': 'Xiaomi', '08-00-28': 'Facebook/Meta', '50-6f-9a': 'Wi-Fi Alliance (WPA3/802.11s)',
}

const macOf = (b: Uint8Array, off: number): string =>
  Array.from(b.subarray(off, off + 6), (x) => x.toString(16).padStart(2, '0')).join(':')

const parseRsn = (data: Uint8Array): { text: string; security: string[] } => {
  const out: string[] = []
  let ver = -1
  let off = 0
  const u16 = (o: number): number => (data[o] | (data[o + 1] << 8))
  if (data.length < 2) return { text: 'RSN vacío', security: [] }
  ver = u16(0); off = 2
  if (ver !== 1) return { text: `RSN versión ${ver} (inesperada)`, security: [] }
  /* OJO: cipher y AKM comparten OUI (00-0f-ac-02 = TKIP como cipher, PSK como AKM):
     cada campo consulta SU tabla. */
  const suiteOf = (o: number, kind: 'cipher' | 'akm'): string => {
    if (o + 4 > data.length) return '—'
    const key = Array.from(data.subarray(o, o + 4), (x) => x.toString(16).padStart(2, '0')).join('-')
    const table = kind === 'cipher' ? CIPHER_SUITES : AKM_SUITES
    return table[key] ?? `OUI ${key}`
  }
  const groupCipher = suiteOf(off, 'cipher'); off += 4
  const pairwiseCount = data.length > off ? u16(off) : 0; off += 2
  const pairwise: string[] = []
  for (let i = 0; i < Math.min(pairwiseCount, 4); i++) { pairwise.push(suiteOf(off, 'cipher')); off += 4 }
  const akmCount = data.length > off ? u16(off) : 0; off += 2
  const akms: string[] = []
  for (let i = 0; i < Math.min(akmCount, 4); i++) { akms.push(suiteOf(off, 'akm')); off += 4 }
  out.push(`cifrado de grupo: ${groupCipher}`)
  out.push(`cifrado unicast: ${pairwise.join(', ')}`)
  out.push(`autenticación: ${akms.join(', ')}`)
  const caps = data.length > off + 1 ? u16(off) : 0
  const pmfRequired = !!(caps & 0x80)
  if (akms.some((a) => a.includes('SAE'))) out.push('WPA3 confirmado (SAE presente)')
  else if (akms.some((a) => a.includes('PSK')) && !pmfRequired) out.push('WPA2-PSK: sin PMF obligatorio, deauth posible')
  if (caps & 0x40) out.push('PMF: capable')
  if (pmfRequired) out.push('PMF: REQUIRED (protege contra deauth)')
  return { text: out.join(' · '), security: [...pairwise, ...akms] }
}

const decodeIeDetail = (id: number, data: Uint8Array): { detail: string; notable?: boolean } => {
  switch (id) {
    case 0: return { detail: `"${new TextDecoder().decode(data)}"` }
    case 1: case 50: {
      const rates = Array.from(data, (b) => `${((b & 0x7f) / 2).toFixed(b & 0x80 ? 1 : 0)}${b & 0x80 ? '(B)' : ''}`)
      return { detail: rates.join(', ') + ' Mbps' }
    }
    case 3: return { detail: `canal ${data[0] ?? '?'}`, notable: true }
    case 5: return { detail: `DTIM count=${data[0] ?? '?'} period=${data[1] ?? '?'} · clients en TIM: ${(data.length > 4 ? (data[data.length - 1] ?? 0) : 0)}` }
    case 48: {
      const rsn = parseRsn(data)
      return { detail: rsn.text, notable: true }
    }
    case 221: {
      if (data.length >= 3) {
        const oui = Array.from(data.subarray(0, 3), (x) => x.toString(16).padStart(2, '0')).join('-')
        const vendor = OUIS[oui] ?? `OUI ${oui}`
        if (oui === '00-50-f2' && data[3] === 1) {
          // WPA1 IE: suite tras type/version
          const wpa = parseRsn(data.subarray(6))
          return { detail: `WPA1 legacy: ${wpa.text}`, notable: true }
        }
        return { detail: vendor }
      }
      return { detail: '—' }
    }
    case 7: {
      if (data.length >= 3) return { detail: `país ${String.fromCharCode(data[0], data[1])}, entorno ${data[2]}` }
      return { detail: '—' }
    }
    case 45: return { detail: `HT (802.11n): LDPC=${data[0] & 1}, SM power save=${(data[0] >> 1) & 3}` }
    case 191: return { detail: 'VHT (802.11ac): capacidades 5 GHz' }
    case 127: return { detail: `extended caps: ${data.length} bytes` }
    default: return { detail: `${data.length} bytes: ${Array.from(data.subarray(0, 8), (x) => x.toString(16).padStart(2, '0')).join(' ')}${data.length > 8 ? '…' : ''}` }
  }
}

export const decodeWifiFrame = (hex: string): WifiFrameInfo => {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  const empty: WifiFrameInfo = {
    ok: false, version: 0, type: '', subtype: '',
    flags: { toDS: false, fromDS: false, moreFrag: false, retry: false, powerMgmt: false, moreData: false, protectedFrame: false, order: false },
    flagText: [], duration: 0, addr1: '', addr2: '', addr3: '', addrLabels: ['', '', ''], seq: 0, frag: 0, fcsOk: null, ies: [], ssid: null, channel: null, security: [], rsnInfo: null, size: 0,
  }
  if (clean.length < 48) return { ...empty, error: 'se necesitan al menos 24 bytes (48 hex) del MAC header' }
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16))
  const b = new Uint8Array(bytes)

  const fc = b[0] | (b[1] << 8)
  const version = fc & 0x3
  const typeN = (fc >> 2) & 0x3
  const subtypeN = (fc >> 4) & 0xf
  const type = FRAME_TYPES[typeN]
  const subtype = (typeN === 0 ? MGMT_SUBTYPES : typeN === 1 ? CTRL_SUBTYPES : DATA_SUBTYPES)[subtypeN] ?? `subtype ${subtypeN}`
  const flags: FrameFlags = {
    toDS: !!(b[1] & 1), fromDS: !!(b[1] & 2), moreFrag: !!(b[1] & 4), retry: !!(b[1] & 8),
    powerMgmt: !!(b[1] & 0x10), moreData: !!(b[1] & 0x20), protectedFrame: !!(b[1] & 0x40), order: !!(b[1] & 0x80),
  }
  const flagText = Object.entries(flags).filter(([, v]) => v).map(([k]) => k)

  const duration = b[2] | (b[3] << 8)
  const isCtrl = typeN === 1 && (subtypeN === 11 || subtypeN === 12 || subtypeN === 13) // RTS/CTS/Ack: 2 direcciones
  const addr1 = macOf(b, 4)
  const addr2 = isCtrl ? '' : macOf(b, 10)
  const addr3 = isCtrl ? '' : macOf(b, 16)
  const addrLabels: [string, string, string] = typeN === 0
    ? ['DA (destino)', 'SA (transmisor)', 'BSSID']
    : flags.toDS && flags.fromDS ? ['BSSID (RA)', 'SA', 'DA'] : flags.toDS ? ['BSSID (AP)', 'SA', 'DA'] : flags.fromDS ? ['DA', 'BSSID (AP)', 'SA'] : ['DA', 'SA', 'BSSID']
  let seq = 0, frag = 0
  if (!isCtrl && b.length >= 24) {
    const seqctrl = b[22] | (b[23] << 8)
    frag = seqctrl & 0xf
    seq = seqctrl >> 4
  }

  // Information Elements: en beacons/probes/auth a partir del offset 24
  const ies: WifiIe[] = []
  let ssid: string | null = null
  let channel: number | null = null
  const security: string[] = []
  let rsnInfo: string | null = null
  if (typeN === 0 && b.length > 24) {
    // beacons y probe responses llevan campos fijos (timestamp 8 + intervalo 2 + caps 2):
    // sus IEs empiezan en el offset 36; el resto de frames de gestión, en el 24
    let p = subtypeN === 8 || subtypeN === 5 ? 36 : 24
    while (p + 2 <= b.length && ies.length < 60) {
      const id = b[p]
      const len = b[p + 1]
      if (p + 2 + len > b.length) break
      const data = b.subarray(p + 2, p + 2 + len)
      const { detail, notable } = decodeIeDetail(id, data)
      if (id === 0) ssid = new TextDecoder().decode(data)
      if (id === 3 && data.length) channel = data[0]
      if (id === 48) {
        const rsn = parseRsn(data)
        security.push(...rsn.security)
        rsnInfo = rsn.text
      }
      ies.push({ id, name: IE_NAMES[id] ?? `IE ${id}`, len, detail, notable })
      p += 2 + len
    }
  }

  return {
    ok: true, version, type, subtype, flags, flagText, duration, addr1, addr2, addr3, addrLabels, seq, frag,
    fcsOk: null, ies, ssid, channel, security, rsnInfo, size: b.length,
  }
}

/* ejemplos listos: generados con tcpdump -e -x sobre beacons de laboratorio */
export const WIFI_FRAME_EXAMPLES: { name: string; hex: string; desc: string }[] = [
  {
    name: 'Beacon WPA2',
    desc: 'Beacon clásico: SSID "MiLab", canal 6, RSN con WPA2-PSK/CCMP y PMF required',
    hex: '80000000ffffffffffff001122334455001122334455d0a7' +
      '0000000000000000' +
      '6400' +
      '0100' +
      '00054d694c6162' +
      '01048248530b' +
      '030106' +
      '30140100000fac040100000fac040100000fac02c000',
  },
  {
    name: 'Probe Request (espía pasivo)',
    desc: 'Probe request sin SSID específico (wildcard): pide info a cualquier AP cercano',
    hex: '40000000ffffffffffffaabbccddeeffffffffffffff10040000',
  },
  {
    name: 'Deauthentication',
    desc: 'Frame de deauth (reason 3: disassociated because sending station is leaving)',
    hex: 'c0000000001122334455660011223344550011223344550003050000',
  },
  {
    name: 'QoS Data',
    desc: 'Tráfico de datos QoS (802.11e): el tráfico normal de un cliente',
    hex: '8841000000112233445566001122334455ff0d0110000000',
  },
]
