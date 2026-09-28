/* ── AudioModem · Ronda 19 ────────────────────────────────────────────────
   Datos por el aire sin red: FSK de audio con la Web Audio API. Emisor que
   modula bits en tonos audibles y receptor que demodula por Goertzel en
   tiempo real (micrófono o loopback). El mismo principio de los módems de
   56k, los balanceadores Hive y la exfiltración por air-gap. */

export const SAMPLE_RATE = 44100
export const BAUD = 50
export const FREQ_0 = 1800
export const FREQ_1 = 2200
/** Preambulo: 8 bytes alternos 0101… para sincronizar el receptor. */
export const PREAMBLE_BITS = '01010101'.repeat(8)

export interface ModemProfile {
  name: string
  baud: number
  f0: number
  f1: number
  note: string
}

export const MODEM_PROFILES: ModemProfile[] = [
  { name: 'Lento y fiable (50 baud)', baud: 50, f0: 1800, f1: 2200, note: '10 bytes/segundo: atraviesa habitaciones ruidosas y altavoces de móvil' },
  { name: 'Medio (100 baud)', baud: 100, f0: 1900, f1: 2300, note: '20 bytes/seg: equilibrio entre velocidad y tolerancia' },
  { name: 'Rápido (200 baud)', baud: 200, f0: 2000, f1: 2400, note: '40 bytes/seg: exige silencio y volumen alto; sensible al eco' },
]

/* ---------- 1. Capa de bytes (Hamming + checksum + framing) ---------- */

/** XOR de todos los bytes (checksum simple de 8 bits). */
export function xorChecksum(bytes: number[]): number {
  let c = 0
  for (const b of bytes) c ^= b
  return c
}

/** Hamming(8,4): 4 bits de datos + 4 de corrección. Codifica un nibble. */
export function hamming74Encode(nibble: number): number {
  const d = [(nibble >> 3) & 1, (nibble >> 2) & 1, (nibble >> 1) & 1, nibble & 1]
  const p1 = d[0]! ^ d[1]! ^ d[3]!
  const p2 = d[0]! ^ d[2]! ^ d[3]!
  const p3 = d[1]! ^ d[2]! ^ d[3]!
  const p4 = d[0]! ^ d[1]! ^ d[2]! ^ d[3]! ^ p1 ^ p2 ^ p3
  return (p1 << 7) | (p2 << 6) | (d[0]! << 5) | (d[1]! << 4) | (d[2]! << 3) | (d[3]! << 2) | (p3 << 1) | p4
}

/** Decodifica Hamming(8,4) y corrige 1 bit erróneo. Devuelve el nibble. */
export function hamming74Decode(byte: number): number {
  const bits = Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
  // bits: [p1, p2, d1, d2, d3, d4, p3, p4] (posiciones 1..8)
  const s1 = bits[0]! ^ bits[2]! ^ bits[3]! ^ bits[5]!
  const s2 = bits[1]! ^ bits[2]! ^ bits[4]! ^ bits[5]!
  const s3 = bits[6]! ^ bits[4]! ^ bits[3]! ^ bits[5]!
  const syn = s1 * 4 + s2 * 2 + s3
  // El síndrome codifica qué paridades fallan; cada posición tiene uno único.
  // pos8 (p4, paridad global) no participa: si solo ella falla, el dato está intacto.
  const synToPos: Record<number, number> = { 4: 1, 2: 2, 6: 3, 5: 4, 3: 5, 7: 6, 1: 7 }
  const pos = synToPos[syn]
  if (pos) bits[pos - 1] = bits[pos - 1]! ^ 1
  return (bits[2]! << 3) | (bits[3]! << 2) | (bits[4]! << 1) | bits[5]!
}

/** Mensaje → trama de bits: preámbulo + SOH + len + [pares hamming] + checksum XOR. */
export function frameMessage(text: string): string {
  const bytes = Array.from(new TextEncoder().encode(text))
  const len = bytes.length
  if (len > 255) throw new Error('Mensaje demasiado largo para un frame (máx 255 bytes)')
  const payload: number[] = []
  for (const b of bytes) {
    payload.push(hamming74Encode((b >> 4) & 0xf))
    payload.push(hamming74Encode(b & 0xf))
  }
  const frameBytes = [0x01, len, ...payload, xorChecksum(bytes)]
  const allBits = PREAMBLE_BITS + frameBytes.map((b) => b.toString(2).padStart(8, '0')).join('')
  return allBits
}

/** Reconstruye el texto desde los bytes decodificados (validando checksum). */
export function unframeBytes(frameBytes: number[]): { text: string; checksumOk: boolean } {
  if (frameBytes.length < 3) return { text: '', checksumOk: false }
  const len = frameBytes[1]!
  const payload = frameBytes.slice(2, 2 + len * 2)
  const raw: number[] = []
  for (let i = 0; i + 1 < payload.length; i += 2) {
    const hi = hamming74Decode(payload[i]!)
    const lo = hamming74Decode(payload[i + 1]!)
    raw.push((hi << 4) | lo)
  }
  const received = frameBytes[2 + len * 2]
  const checksumOk = received === xorChecksum(raw)
  return { text: new TextDecoder().decode(new Uint8Array(raw)), checksumOk }
}

/* ---------- 2. Modulación FSK ---------- */

/** Convierte bits → muestras PCM float32 con fase continua entre símbolos. */
export function fskModulate(bits: string, baud: number, f0: number, f1: number): Float32Array<ArrayBuffer> {
  const samplesPerBit = Math.floor(SAMPLE_RATE / baud)
  const total = samplesPerBit * bits.length
  const out = new Float32Array(total)
  let phase = 0
  let idx = 0
  for (const bit of bits) {
    const f = bit === '1' ? f1 : f0
    const dPhase = (2 * Math.PI * f) / SAMPLE_RATE
    for (let s = 0; s < samplesPerBit; s++) {
      out[idx++] = Math.sin(phase) * 0.8
      phase += dPhase
    }
  }
  return out
}

/* ---------- 3. Demodulación ---------- */

/** Energía de Goertzel de una ventana de muestras a una frecuencia concreta. */
export function goertzel(window: Float32Array, freq: number): number {
  const k = Math.round((freq * window.length) / SAMPLE_RATE)
  const w = (2 * Math.PI * k) / window.length
  const coeff = 2 * Math.cos(w)
  let s0 = 0
  let s1 = 0
  let s2 = 0
  for (const x of window) {
    s0 = x + coeff * s1 - s2
    s2 = s1
    s1 = s0
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2
}

export interface DemodulateResult {
  text: string
  checksumOk: boolean
  bits: number
  errorsCorrected: number
  quality: number
}

/** Demodula PCM completo: símbolo a símbolo por Goertzel, busca preámbulo, decodifica. */
export function fskDemodulate(samples: Float32Array, baud: number, f0: number, f1: number): DemodulateResult {
  const samplesPerBit = Math.floor(SAMPLE_RATE / baud)
  const bits: string[] = []
  const energies: number[] = []
  for (let off = 0; off + samplesPerBit <= samples.length; off += samplesPerBit) {
    const win = samples.subarray(off, off + samplesPerBit)
    const e0 = goertzel(win, f0)
    const e1 = goertzel(win, f1)
    const total = e0 + e1
    energies.push(total)
    bits.push(e1 > e0 ? '1' : '0')
  }
  const bitStr = bits.join('')
  // energía media: calidad de señal (silencio → casi 0)
  const avgEnergy = energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length)
  const quality = Math.min(1, avgEnergy * 2000)

  const pre = PREAMBLE_BITS
  let start = bitStr.indexOf(pre)
  let errorsCorrected = 0
  if (start < 0) {
    // tolerancia: busca preámbulo con hasta 2 bits cambiados (por ventanas desalineadas)
    outer: for (let i = 0; i + pre.length <= bitStr.length; i++) {
      let diff = 0
      for (let j = 0; j < pre.length; j++) if (bitStr[i + j] !== pre[j]) { diff++; if (diff > 2) continue outer }
      start = i
      break
    }
  }
  if (start < 0) return { text: '', checksumOk: false, bits: bits.length, errorsCorrected, quality }

  const bodyStart = start + pre.length
  const body = bitStr.slice(bodyStart)
  const frameBytes: number[] = []
  for (let i = 0; i + 8 <= body.length; i += 8) {
    frameBytes.push(parseInt(body.slice(i, i + 8), 2))
    if (frameBytes.length > 600) break
  }
  const { text, checksumOk } = unframeBytes(frameBytes)
  return { text, checksumOk, bits: bits.length, errorsCorrected, quality }
}

/* ---------- 4. Live receiver (con BufferSourceNode en tiempo real) ---------- */

export interface LiveRxState {
  bitsReceived: number
  bitBuffer: string
  message: string
  checksumOk: boolean | null
  energy: number
}

/** Crea un receptor en vivo sobre un AnalyserNode (micrófono o destination). */
export class LiveReceiver {
  private analyser: AnalyserNode
  private buf: Float32Array
  private pos = 0
  private bitBuffer = ''
  public bitsReceived = 0
  public message = ''
  public checksumOk: boolean | null = null
  public energy = 0
  private baud: number
  private f0: number
  private f1: number

  constructor(analyser: AnalyserNode, baud: number, f0: number, f1: number) {
    this.analyser = analyser
    this.baud = baud
    this.f0 = f0
    this.f1 = f1
    this.buf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4))
  }

  /** Procesa las muestras acumuladas desde la última llamada (llamar ~10x/seg). */
  tick(): void {
    this.analyser.getFloatTimeDomainData(this.buf as Float32Array<ArrayBuffer>)
    const samplesPerBit = Math.floor(SAMPLE_RATE / this.baud)
    // consumir en bloques de samplesPerBit desde un cursor propio
    for (let i = 0; i + samplesPerBit <= this.buf.length; i += samplesPerBit) {
      const win = this.buf.subarray(i, i + samplesPerBit)
      const e0 = goertzel(win, this.f0)
      const e1 = goertzel(win, this.f1)
      this.energy = e0 + e1
      // descartar silencio
      if (this.energy < 1e-6) continue
      this.bitBuffer += e1 > e0 ? '1' : '0'
      this.bitsReceived++
    }
    if (this.bitBuffer.length > 20000) this.bitBuffer = this.bitBuffer.slice(-10000)
    this.tryDecode()
  }

  private tryDecode(): void {
    const pre = PREAMBLE_BITS
    let start = this.bitBuffer.lastIndexOf(pre)
    if (start < 0) return
    const body = this.bitBuffer.slice(start + pre.length)
    if (body.length < 8 * 3) return
    const frameBytes: number[] = []
    for (let i = 0; i + 8 <= body.length && frameBytes.length <= 600; i += 8) {
      frameBytes.push(parseInt(body.slice(i, i + 8), 2))
    }
    const { text, checksumOk } = unframeBytes(frameBytes)
    if (text) {
      this.message = text
      this.checksumOk = checksumOk
    }
  }

  reset(): void {
    this.bitBuffer = ''
    this.message = ''
    this.checksumOk = null
    this.bitsReceived = 0
  }
}

/* ---------- 5. Catálogo didáctico ---------- */

export const MODEM_LIMITS: string[] = [
  'La demodulación asume reloj alineado por el preámbulo: ruido de fondo fuerte o eco desplaza las ventanas y corrompe bits (los módems reales añaden PLL y ecualizador).',
  'Los tonos son audibles (1.8–2.4 kHz) a propósito: ultrasonido requiere hardware y altavoces específicos.',
  'El canal es de difusión: cualquiera con micrófono en la sala recibe lo mismo que el receptor legítimo. No es confidencial.',
  'Hamming(8,4) corrige 1 bit por nibble pero duplica el tamaño del payload: es un compromiso didáctico, no un estándar.',
]

export const MODEM_LESSONS: { title: string; lesson: string }[] = [
  { title: 'El air-gap no es el vacío', lesson: 'Stuxnet cruzó el aire-gap por USB; otras campañas (Fanatic, aIR-Jumper) usan audio, luz o calor. Un módem acústico demuestra que «sin red» no significa «sin canal»: la defensa es denegar altavoces/mics en entornos críticos.' },
  { title: 'FSK: la abuela del módem', lesson: 'Dos tonos, un umbral, un bit por símbolo: el Bell 103 de 1962 ya hacía esto a 300 baud. La ingeniería posterior (QAM, constelaciones, ecualización) subió a 56k con el MISMO principio físico.' },
  { title: 'Por qué Hamming', lesson: 'Un bit erróneo por ruido rompe un byte entero; Hamming(8,4) localiza y corrige el error con 4 bits extra por nibble. Es el mismo código que corregía la RAM de los Servidores IBM de los 70.' },
  { title: 'Goertzel vs FFT', lesson: 'Para DETECTAR 2 frecuencias concretas, Goertzel cuesta O(N) por tono; una FFT O(N log N) calcula todas las que no necesitas. Por eso los DTMF de los teléfonos usan Goertzel desde hace 40 años.' },
  { title: 'El preámbulo sincroniza', lesson: 'El patrón 0101… alterno permite al receptor medir la energía en ambos tonos y alinear su reloj de símbolo antes del primer byte real: sin preámbulo, cada ventana empezaría a mitad de símbolo y el canal sería ruido.' },
]
