/* Stego Audio — LSB en WAV/PCM, 100% local.
   Parser RIFF propio, capacidad real en bits, incrustación/extracción LSB
   con cabecera mágica, espectrograma por FFT radix-2 propia y export WAV. */

export interface WavInfo {
  channels: number
  sampleRate: number
  bits: number
  dataBytes: number
  samples: Int16Array     // copia editable (16-bit PCM)
  durationSec: number
  format: number
}

/* parse RIFF: soporta PCM 16-bit (el caso real); devuelve lo demás como info */
export const parseWav = (bytes: Uint8Array): WavInfo => {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (off: number): string => String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3])
  if (bytes.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('no es un WAV (RIFF/WAVE no encontrado)')

  let pos = 12
  let channels = 0, sampleRate = 0, bits = 0, format = 1
  let dataOff = -1, dataLen = 0
  while (pos + 8 <= bytes.length) {
    const id = tag(pos)
    const size = dv.getUint32(pos + 4, true)
    if (id === 'fmt ') {
      format = dv.getUint16(pos + 8, true)
      channels = dv.getUint16(pos + 10, true)
      sampleRate = dv.getUint32(pos + 12, true)
      bits = dv.getUint16(pos + 22, true)
    } else if (id === 'data') {
      dataOff = pos + 8
      dataLen = Math.min(size, bytes.length - dataOff)
      break
    }
    pos += 8 + size + (size % 2)
  }
  if (dataOff < 0) throw new Error('chunk data no encontrado')
  if (format !== 1 || bits !== 16) throw new Error(`solo PCM 16-bit soportado (format=${format}, bits=${bits}); convierte con: ffmpeg -i in.mp3 -acodec pcm_s16le out.wav`)

  const nSamples = Math.floor(dataLen / 2)
  const samples = new Int16Array(nSamples)
  for (let i = 0; i < nSamples; i++) samples[i] = dv.getInt16(dataOff + i * 2, true)

  return { channels, sampleRate, bits, dataBytes: dataLen, samples, durationSec: nSamples / channels / sampleRate, format }
}

/* ───────── LSB ───────── */

const MAGIC = 'HXST'

export interface EmbedResult {
  samples: Int16Array
  bitsUsed: number
  capacityBits: number
}

export const capacityBits = (samples: Int16Array): number => samples.length

export const embedLsb = (samples: Int16Array, message: string): EmbedResult => {
  const bytes: number[] = []
  for (const ch of (MAGIC + message.length.toString(16).padStart(6, '0') + message)) bytes.push(ch.charCodeAt(0) & 0xff)
  const cap = samples.length
  const need = bytes.length * 8
  if (need > cap) throw new Error(`no cabe: necesitas ${need} bits y hay ${cap} (mensaje máx: ${Math.floor((cap - 72) / 8)} caracteres)`)

  const out = new Int16Array(samples)
  let bitIdx = 0
  for (const byte of bytes) {
    for (let b = 7; b >= 0; b--) {
      const bit = (byte >> b) & 1
      out[bitIdx] = (out[bitIdx] & 0xfffe) | bit
      bitIdx++
    }
  }
  return { samples: out, bitsUsed: need, capacityBits: cap }
}

export const extractLsb = (samples: Int16Array): string => {
  const readByte = (start: number): number => {
    let v = 0
    for (let b = 0; b < 8; b++) v = (v << 1) | (samples[start + b] & 1)
    return v
  }
  const magic = String.fromCharCode(readByte(0), readByte(8), readByte(16), readByte(24))
  if (magic !== MAGIC) return '' // no hay mensaje
  const len = parseInt([32, 40, 48, 56, 64, 72].map((o) => readByte(o)).map((c) => String.fromCharCode(c)).join(''), 16)
  if (!Number.isFinite(len) || len <= 0 || len > samples.length) return ''
  const chars: string[] = []
  for (let i = 0; i < len; i++) chars.push(String.fromCharCode(readByte(80 + i * 8)))
  return chars.join('')
}

/* ───────── export WAV ───────── */

export const encodeWav = (samples: Int16Array, sampleRate: number, channels: number): Uint8Array => {
  const dataLen = samples.length * 2
  const buf = new Uint8Array(44 + dataLen)
  const dv = new DataView(buf.buffer)
  const wstr = (off: number, s: string): void => { for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i) }
  wstr(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); wstr(8, 'WAVE')
  wstr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true)
  dv.setUint16(22, channels, true); dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * channels * 2, true); dv.setUint16(32, channels * 2, true); dv.setUint16(34, 16, true)
  wstr(36, 'data'); dv.setUint32(40, dataLen, true)
  for (let i = 0; i < samples.length; i++) dv.setInt16(44 + i * 2, samples[i], true)
  return buf
}

/* ───────── espectrograma (FFT radix-2 propia) ───────── */

const fft = (re: Float32Array, im: Float32Array): void => {
  const n = re.length
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k]
        const uIm = im[i + k]
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe
        re[i + k] = uRe + vRe
        im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
}

export interface SpectrogramData {
  columns: number
  rows: number
  /** [col][row] magnitud normalizada 0-1 */
  values: Float32Array[]
}

export const spectrogram = (samples: Int16Array, opts: { frame?: number; maxCols?: number } = {}): SpectrogramData => {
  const frame = opts.frame ?? 512
  const maxCols = opts.maxCols ?? 320
  const half = frame / 2
  const total = samples.length
  const hop = Math.max(frame, Math.floor(total / maxCols))
  const cols = Math.min(maxCols, Math.floor((total - frame) / hop) + 1)
  const values: Float32Array[] = []
  let globalMax = 1e-9
  const win = new Float32Array(frame)
  for (let i = 0; i < frame; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1)) // hann

  for (let c = 0; c < cols; c++) {
    const re = new Float32Array(frame)
    const im = new Float32Array(frame)
    const start = c * hop
    for (let i = 0; i < frame; i++) re[i] = (samples[start + i] / 32768) * win[i]
    fft(re, im)
    const col = new Float32Array(half)
    for (let f = 0; f < half; f++) {
      const mag = Math.hypot(re[f], im[f])
      col[f] = mag
      if (mag > globalMax) globalMax = mag
    }
    values.push(col)
  }
  for (const col of values) for (let f = 0; f < half; f++) col[f] = Math.sqrt(col[f] / globalMax) // escala percetual
  return { columns: cols, rows: half, values }
}
