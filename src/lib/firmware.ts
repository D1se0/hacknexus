/* Firmware Image Inspector — 100% local, sin ejecutar nada.
   ESP8266/ESP32: parsea la imagen flash real (magic 0xE9, segmentos,
   app description con nombre de proyecto y versión de IDF).
   Arduino AVR: parsea Intel HEX (.hex) con validación de checksums.
   Además: extracción de strings con patrones sospechosos marcados. */

export interface EspSegment {
  loadAddr: number
  len: number
  preview: string
}

export interface EspInfo {
  kind: 'esp'
  magicOk: boolean
  chip: string
  segments: EspSegment[]
  entry: string
  flashMode: string
  flashSize: string
  flashFreq: string
  app: { project: string; version: string; idf: string; compiled: string } | null
  size: number
  error?: string
}

const SPI_MODES = ['QIO', 'QOUT', 'DIO', 'DOUT', 'FAST_READ', 'SLOW_READ']
const ESP_SIZES: Record<number, string> = { 0: '512 KB', 1: '256 KB', 2: '1 MB', 3: '2 MB', 4: '4 MB', 5: '2 MB-c1', 6: '4 MB-c1', 7: '8 MB', 8: '16 MB', 9: '8 MB-c1', 0xa: '16 MB-c1', 0x20: '32 MB', 0x21: '64 MB', 0x22: '128 MB' }
const ESP_FREQS: Record<number, string> = { 0: '40 MHz', 1: '26 MHz', 2: '20 MHz', 0xf: '80 MHz' }
const ESP32_CHIPS: Record<number, string> = { 0: 'ESP32', 2: 'ESP32-S2', 5: 'ESP32-C3', 9: 'ESP32-S3', 12: 'ESP32-C2', 13: 'ESP32-C6', 14: 'ESP32-H2', 16: 'ESP32-P4' }

const previewOf = (b: Uint8Array, n = 32): string => {
  const slice = b.subarray(0, Math.min(n, b.length))
  return Array.from(slice, (x) => (x >= 0x20 && x < 0x7f ? String.fromCharCode(x) : '.')).join('')
}

export const parseEspImage = (bytes: Uint8Array): EspInfo => {
  const info: EspInfo = { kind: 'esp', magicOk: false, chip: '?', segments: [], entry: '', flashMode: '?', flashSize: '?', flashFreq: '?', app: null, size: bytes.length }
  try {
    if (bytes[0] !== 0xe9) { info.error = 'no es una imagen ESP (magic 0xE9 no encontrado)'; return info }
    info.magicOk = true
    const segCount = bytes[1]
    const spiMode = bytes[2] & 0x0f
    const spiSize = (bytes[3] >> 4) & 0x0f
    const spiFreq = bytes[3] & 0x0f
    info.flashMode = SPI_MODES[spiMode] ?? `? (${spiMode})`
    info.flashSize = ESP_SIZES[spiSize] ?? `? (0x${spiSize.toString(16)})`
    info.flashFreq = ESP_FREQS[spiFreq] ?? `? (${spiFreq})`
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const entry = dv.getUint32(4, true)
    info.entry = '0x' + entry.toString(16).padStart(8, '0')

    // extended header (8 bytes desde offset 13) — chip_id en ESP32+
    const wpPin = bytes[13]
    const chipId = bytes[19]
    info.chip = chipId in ESP32_CHIPS ? ESP32_CHIPS[chipId] : (wpPin === 0xee ? 'ESP8266' : `chip_id=${chipId}`)

    let pos = 8 + 8 // header + extended header
    for (let s = 0; s < segCount && pos + 8 <= bytes.length; s++) {
      const loadAddr = dv.getUint32(pos, true)
      const len = dv.getUint32(pos + 4, true)
      pos += 8
      if (pos + len > bytes.length) { info.error = `segmento ${s} truncado (declara ${len} bytes, quedan ${bytes.length - pos})`; break }
      const data = bytes.subarray(pos, pos + len)
      info.segments.push({ loadAddr: loadAddr, len, preview: previewOf(data, 32) })

      // app description: magic 0xABCD5432 al inicio del segmento DROM (el 1º suele serlo en ESP-IDF)
      if (!info.app && len > 256 && data[0] === 0xab && data[1] === 0xcd && data[2] === 0x54 && data[3] === 0x32) {
        const str = (off: number): string => {
          let end = off
          while (end < off + 32 && data[end] !== 0) end++
          return new TextDecoder().decode(data.subarray(off, end))
        }
        info.app = { project: str(0x30), version: str(0x10), idf: str(0x50), compiled: `${str(0x24)} ${str(0x44)}`.trim() }
      }
      pos += len
    }
    if (!info.segments.length && !info.error) info.error = 'imagen sin segmentos legibles'
    return info
  } catch (e) {
    return { ...info, error: `parse interrumpido: ${(e as Error).message}` }
  }
}

/* ───────── Intel HEX (Arduino AVR .hex) ───────── */

export interface HexInfo {
  kind: 'hex'
  records: number
  dataBytes: number
  segments: EspSegment[]
  entry: string | null
  crcOk: boolean
  crcBad: number
  size: number
  error?: string
}

export const parseIntelHex = (text: string): HexInfo => {
  const info: HexInfo = { kind: 'hex', records: 0, dataBytes: 0, segments: [], entry: null, crcOk: true, crcBad: 0, size: text.length }
  try {
    const lines = text.split(/\r?\n/).filter((l) => l.startsWith(':'))
    let base = 0
    let curSeg: { start: number; end: number } | null = null
    for (const line of lines) {
      info.records++
      const count = parseInt(line.slice(1, 3), 16)
      const addr = parseInt(line.slice(3, 7), 16)
      const type = parseInt(line.slice(7, 9), 16)
      const dataHex = line.slice(9, 9 + count * 2)
      const chk = parseInt(line.slice(9 + count * 2, 11 + count * 2), 16)
      // checksum: suma de bytes + chk ≡ 0 (mod 256)
      let sum = count + ((addr >> 8) & 0xff) + (addr & 0xff) + type
      for (let i = 0; i < dataHex.length; i += 2) sum += parseInt(dataHex.slice(i, i + 2), 16)
      if (((sum + chk) & 0xff) !== 0) { info.crcOk = false; info.crcBad++ }

      const data: number[] = []
      for (let i = 0; i < dataHex.length; i += 2) data.push(parseInt(dataHex.slice(i, i + 2), 16))

      if (type === 0x00) {
        info.dataBytes += count
        const abs = base + addr
        if (curSeg && abs === curSeg.end) curSeg.end = abs + count
        else {
          if (curSeg) info.segments.push({ loadAddr: curSeg.start, len: curSeg.end - curSeg.start, preview: '' })
          curSeg = { start: abs, end: abs + count }
        }
      } else if (type === 0x01) break
      else if (type === 0x02) base = parseInt(dataHex, 16) << 4
      else if (type === 0x04) base = parseInt(dataHex, 16) << 16
      else if (type === 0x05) info.entry = '0x' + (parseInt(dataHex, 16) >>> 0).toString(16).padStart(8, '0')
    }
    if (curSeg) info.segments.push({ loadAddr: curSeg.start, len: curSeg.end - curSeg.start, preview: '' })
    if (!info.records) info.error = 'sin registros Intel HEX (no empieza por ":")'
    return info
  } catch (e) {
    return { ...info, error: (e as Error).message }
  }
}

/* ───────── strings + sospechosos ───────── */

export interface FirmwareString {
  s: string
  suspicious: boolean
  why?: string
}

const FLAGS: [RegExp, string][] = [
  [/\/etc\/(shadow|passwd)/i, 'ficheros de credenciales del sistema'],
  [/\/dev\/tcp|bash -i/i, 'reverse shell embebida'],
  [/https?:\/\/[^\s"]+/i, 'URL embebida (C2 o update remoto)'],
  [/\bwget\b|\bcurl\b/i, 'descarga de segunda etapa'],
  [/\bnc\b.*-e|netcat/i, 'netcat con ejecución'],
  [/chmod \+?x/i, 'auto-elevación de permisos'],
  [/base64|openssl enc/i, 'carga útil codificada'],
  [/telnet|admin[:=]/i, 'credenciales por defecto o telnet'],
  [/wifi|ssid|passphrase|wpa/i, 'credenciales WiFi embebidas'],
  [/api[_-]?key|token|secret/i, 'secretos hardcodeados'],
  [/\/bin\/(sh|ash)|system\(/i, 'ejecución de shell desde el firmware'],
]

export const firmwareStrings = (bytes: Uint8Array, min = 5, limit = 300): FirmwareString[] => {
  const out: FirmwareString[] = []
  let cur = ''
  for (let i = 0; i < bytes.length && out.length < limit * 3; i++) {
    const b = bytes[i]
    if (b >= 0x20 && b < 0x7f) cur += String.fromCharCode(b)
    else {
      if (cur.length >= min) {
        const flag = FLAGS.find(([re]) => re.test(cur))
        out.push({ s: cur, suspicious: !!flag, why: flag?.[1] })
      }
      cur = ''
    }
  }
  return out.sort((a, b) => Number(b.suspicious) - Number(a.suspicious)).slice(0, limit)
}
