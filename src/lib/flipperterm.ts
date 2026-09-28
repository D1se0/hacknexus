/* ── FlipperTerm · Ronda 19 ───────────────────────────────────────────────
   Terminal de laboratorio para el ecosistema Flipper Zero vía Web Serial
   API, con simulador completo cuando no hay hardware: parser de salidas
   CLI, interprete de comandos educativos (subghz/ir/nrf/rfid/lfrfid) y
   lecciones de radio insegura. 100% local; el puerto real es opcional. */

/* ---------- 1. Capacidades del navegador ---------- */

export interface SerialCaps {
  available: boolean
  reason: string
}

export function serialCapabilities(): SerialCaps {
  if (typeof navigator === 'undefined') return { available: false, reason: 'sin navegador' }
  const nav = navigator as Navigator & { serial?: unknown }
  if (!nav.serial) {
    return {
      available: false,
      reason: 'Web Serial no disponible: usa Chrome/Edge de escritorio (Firefox y Safari no lo implementan)',
    }
  }
  return { available: true, reason: 'Web Serial disponible' }
}

/* ---------- 2. Parser de líneas CLI del Flipper ---------- */

export interface CliLine {
  raw: string
  prompt: boolean
  kind: 'cmd' | 'info' | 'error' | 'data' | 'table' | 'empty'
}

/** Clasifica una línea de salida del CLI del Flipper. */
export function classifyCliLine(line: string): CliLine {
  const raw = line.replace(/\r$/, '')
  if (raw.trim() === '') return { raw, prompt: false, kind: 'empty' }
  if (raw.startsWith('>:') || raw.endsWith(':>') || raw.endsWith('>')) return { raw, prompt: true, kind: 'cmd' }
  if (/(^|\s)error/i.test(raw) || /^unknown command/i.test(raw)) return { raw, prompt: false, kind: 'error' }
  if (/^(Frequency|Modulation|Presets|Type|Name|Serial|UID|Key|Index|Count|Reading|Locking|Protocol|Bit length)\b/i.test(raw.trim())) {
    return { raw, prompt: false, kind: 'table' }
  }
  if (raw.startsWith('[') || /:\s/.test(raw)) return { raw, prompt: false, kind: 'info' }
  return { raw, prompt: false, kind: 'data' }
}

/** Parse un bloque de subghz rx: extrae frec, modulación y capturas. */
export interface SubGhzCapture {
  freq: string
  protocol: string
  bitLen?: number
  key?: string
}

export function parseSubGhzRx(output: string): { frequency?: string; modulation?: string; captures: SubGhzCapture[] } {
  const res: { frequency?: string; modulation?: string; captures: SubGhzCapture[] } = { captures: [] }
  const lines = output.split(/\r?\n/).map((l) => l.trim())
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const f = line.match(/^Frequency:\s*(.+)$/i)
    if (f) res.frequency = f[1]!.trim()
    const m = line.match(/^Modulation:\s*(.+)$/i)
    if (m) res.modulation = m[1]!.trim()
    const r = line.match(/^Reading #(\d+) ([A-Za-z0-9_]+)/i)
    if (r) {
      // la clave y el nº de bits vienen en la misma línea o en la siguiente
      const rest = line.slice(r[0].length) + ' ' + (lines[i + 1] ?? '')
      const key = rest.match(/Key:\s*(0x[0-9A-Fa-f]+)/i)?.[1]
      const bit = rest.match(/Bit:\s*(\d+)/i)?.[1]
      res.captures.push({
        freq: res.frequency ?? '?',
        protocol: r[2] ?? '?',
        bitLen: bit ? Number(bit) : undefined,
        key: key ?? undefined,
      })
    }
  }
  return res
}

/* ---------- 3. Comandos educativos ---------- */

export interface CommandDoc {
  cmd: string
  args?: string
  desc: string
  danger?: string
}

export const FLIPPER_COMMANDS: CommandDoc[] = [
  { cmd: 'help', desc: 'Lista los comandos disponibles del CLI' },
  { cmd: 'device_info', desc: 'Modelo, firmware, batería y EEPROM del Flipper' },
  { cmd: 'version', desc: 'Versión de firmware y build' },
  { cmd: 'subghz', desc: 'Comando raíz de sub-GHz: chat, rx, tx_from_file…', danger: 'La radio 433 MHz va sin cifrar; capturar o reenviar señales ajenas puede ser ilegal' },
  { cmd: 'subghz chat', desc: 'Chat por radio 433 MHz con otros Flippers cerca' },
  { cmd: 'subghz rx <freq>', desc: 'Escucha y captura transmisión en la frecuencia dada (ej: 433920000)', danger: 'Capturar señales ajenas sin autorización puede ser ilegal' },
  { cmd: 'subghz tx_from_file <f> <idx> <rep>', desc: 'Reenvía una captura guardada', danger: 'Replay attack: clonar señales de terceros es delito en la mayoría de jurisdicciones' },
  { cmd: 'ir rx', desc: 'Captura un mando infrarrojo (TV, aire acondicionado)' },
  { cmd: 'ir tx <file> <idx>', desc: 'Emite un comando IR capturado' },
  { cmd: 'nrf sniff', desc: 'Sniffer del canal 2.4 GHz (teclados/mouses inalámbricos)', danger: 'Los dongles no cifrados de teclados inalámbricos son atacables (MouseJack)' },
  { cmd: 'rfid read', desc: 'Lee tarjetas de proximidad 125 kHz (EM4100, HID Prox)', danger: 'Estas tarjetas no cifran nada: el UID se clona con tocarla' },
  { cmd: 'lfrfid emulate <file>', desc: 'Emula una tarjeta 125 kHz previamente guardada' },
  { cmd: 'ibtn read', desc: 'Lee llaves iButton (Dallas DS1990A)' },
  { cmd: 'nfc read', desc: 'Lee tarjetas NFC 13.56 MHz (MIFARE Classic/UL, NTAG)' },
  { cmd: 'gpio set <pin> <0/1>', desc: 'Pone un pin GPIO a nivel alto/bajo' },
  { cmd: 'gpio read <pin>', desc: 'Lee el nivel lógico de un pin GPIO' },
  { cmd: 'led <r> <g> <b>', desc: 'Color del LED RGB del dispositivo' },
  { cmd: 'vibro on/off', desc: 'Activa el motor de vibración' },
  { cmd: 'loader <app>', desc: 'Lanza una aplicación del menú (ej: loader subghz)' },
  { cmd: 'factory_reset', desc: 'Borra TODO y restaura firmware de fábrica', danger: 'Irreversible' },
]

export interface CmdResult {
  output: string[]
  kind: 'ok' | 'error' | 'sim'
}

/** Interprete educativo: simula el CLI sin hardware (y sirve de guía con hardware). */
export function simulateCommand(input: string, simState: { uptime: number; battery: number; firmware: string }): CmdResult {
  const parts = input.trim().split(/\s+/)
  const cmd = (parts[0] ?? '').toLowerCase()
  const arg = parts.slice(1).join(' ')
  if (!cmd) return { output: [], kind: 'error' }

  switch (cmd) {
    case 'help':
      return {
        output: [
          'Comandos disponibles (simulados — conecta un Flipper real vía USB para los reales):',
          ...FLIPPER_COMMANDS.map((c) => `  ${c.cmd.padEnd(38)} ${c.desc}`),
        ],
        kind: 'ok',
      }
    case 'device_info':
      return {
        output: [
          'device_info (simulado):',
          '  Hardware: Flipper Zero (F5)',
          `  Firmware: ${simState.firmware}`,
          `  Uptime:   ${Math.floor(simState.uptime / 60000)} min`,
          `  Battery:  ${simState.battery}%`,
        ],
        kind: 'ok',
      }
    case 'version':
      return { output: [`firmware: ${simState.firmware}`, 'build: simulated-lab'], kind: 'ok' }
    case 'subghz': {
      const sub = (parts[1] ?? '').toLowerCase()
      if (sub === 'chat') return { output: ['subghz chat: canal abierto 433.92 MHz — SIN cifrado, cualquiera te lee'], kind: 'sim' }
      if (sub === 'rx') {
        const freq = parts[2] ?? '433920000'
        const f = Number(freq)
        if (!Number.isFinite(f) || f < 300000000 || f > 928000000) {
          return { output: [`error: frecuencia ${freq} fuera del rango del CC1101 (300-928 MHz)`], kind: 'error' }
        }
        return {
          output: [
            `Listening at ${freq} Hz...`,
            'Frequency: ' + (f / 1000000).toFixed(6) + ' MHz',
            'Modulation: AM650',
            'Reading #1 Princeton:',
            '  Key:0x1A2B3C4D5E  Bit:24',
            'Educational: esta señal es un código fijo (fixed-code). Con capturarla basta para reenviarla.',
          ],
          kind: 'sim',
        }
      }
      if (sub === 'tx_from_file') return { output: ['tx_from_file: reenviando captura (REPLAY) — recuerda: solo con autorización'], kind: 'sim' }
      return { output: [`error: subghz ${sub || '?'} — usa subghz chat | rx | tx_from_file`], kind: 'error' }
    }
    case 'ir':
      if ((parts[1] ?? '').toLowerCase() === 'rx') return { output: ['ir rx: apunta el mando al Flipper y pulsa un botón…'], kind: 'sim' }
      return { output: [`error: ir ${parts[1] ?? '?'} — usa ir rx | ir tx <file> <idx>`], kind: 'error' }
    case 'nrf':
      if ((parts[1] ?? '').toLowerCase() === 'sniff') return { output: ['nrf sniff: escaneando canales 2.4 GHz (MouseJack lab)…'], kind: 'sim' }
      return { output: [`error: nrf ${parts[1] ?? '?'}`], kind: 'error' }
    case 'rfid':
      if ((parts[1] ?? '').toLowerCase() === 'read') return { output: ['rfid read: acercando tarjeta 125 kHz…', 'UID EM4100: 1A:2B:3C:4D:5E (clonable: sin cifrado)'], kind: 'sim' }
      return { output: [`error: rfid ${parts[1] ?? '?'}`], kind: 'error' }
    case 'nfc':
      if ((parts[1] ?? '').toLowerCase() === 'read') return { output: ['nfc read: tarjeta detectada', '  MIFARE Classic 1K — UID 04:A2:2B:3C', '  Educativo: el cifrado Crypto1 de MIFARE Classic está ROTO desde 2008'], kind: 'sim' }
      return { output: [`error: nfc ${parts[1] ?? '?'}`], kind: 'error' }
    case 'lfrfid':
      return { output: [`lfrfid ${parts[1] ?? '?'}: operación simulada`], kind: 'sim' }
    case 'ibtn':
      return { output: ['ibtn read: DS1990A UID 01:23:45:67:89:AB:CD (sin cifrado, clonable)'], kind: 'sim' }
    case 'gpio': {
      const op = (parts[1] ?? '').toLowerCase()
      const pin = parts[2] ?? '?'
      if (op === 'set') return { output: [`gpio ${pin} := ${parts[3] ?? '?'}`], kind: 'sim' }
      if (op === 'read') return { output: [`gpio ${pin} = ${Math.random() > 0.5 ? '1' : '0'} (simulado)`], kind: 'sim' }
      return { output: [`error: gpio ${op || '?'} — usa gpio set|read <pin>`], kind: 'error' }
    }
    case 'led':
      return { output: [`led rgb(${parts.slice(1, 4).map((x) => Number(x) || 0).join(',')})`], kind: 'sim' }
    case 'vibro':
      return { output: [`vibro ${(parts[1] ?? 'on').toLowerCase()}`], kind: 'sim' }
    case 'loader':
      return { output: [`loader: lanzando ${parts[1] ?? 'desktop'} (simulado)`], kind: 'sim' }
    case 'factory_reset':
      return { output: ['factory_reset: en hardware real BORRARÍA todo. En el simulador no pasa nada 🙂'], kind: 'error' }
    default:
      return { output: [`error: comando desconocido «${cmd}» — escribe help`], kind: 'error' }
  }
}

/* ---------- 4. Terminal serial real (Web Serial API) ---------- */

export interface SerialTerminalOptions {
  baudRate?: number
  onLine: (line: string) => void
}

/** Subconjunto de SerialPort usado aquí (el tipo DOM puede no existir según la versión de TS). */
interface MinimalSerialPort {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  open: (o: { baudRate: number }) => Promise<void>
  close: () => Promise<void>
}

/** Abre un puerto serial, lee líneas y permite escribir comandos. Requiere user gesture. */
export class FlipperSerial {
  private port: unknown = null
  private reader: unknown = null
  private running = false
  private opts: SerialTerminalOptions
  public baudRate: number

  constructor(opts: SerialTerminalOptions, baudRate = 230400) {
    this.opts = opts
    this.baudRate = baudRate
  }

  get isOpen(): boolean {
    return this.running
  }

  /** Pide al usuario elegir puerto (abre el selector nativo del navegador). */
  async connect(): Promise<boolean> {
    const nav = navigator as Navigator & {
      serial?: {
        requestPort: () => Promise<MinimalSerialPort>
        open: (o: { baudRate: number }) => Promise<void>
      }
    }
    if (!nav.serial) throw new Error('Web Serial no disponible en este navegador')
    const port: MinimalSerialPort = await nav.serial.requestPort()
    await port.open({ baudRate: this.baudRate })
    this.port = port
    this.running = true
    void this.readLoop()
    return true
  }

  private async readLoop(): Promise<void> {
    const port = this.port as { readable: ReadableStream<Uint8Array> } | null
    if (!port) return
    const decoder = new TextDecoder()
    let lineBuf = ''
    while (this.running && port.readable) {
      try {
        const reader = port.readable.getReader()
        this.reader = reader
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          lineBuf += decoder.decode(value, { stream: true })
          const lines = lineBuf.split(/\r?\n/)
          lineBuf = lines.pop() ?? ''
          for (const l of lines) if (l) this.opts.onLine(l)
        }
        reader.releaseLock()
      } catch {
        break
      }
    }
  }

  /** Envía un comando + \r (como el CLI del Flipper espera). */
  async send(cmd: string): Promise<void> {
    const port = this.port as {
      writable: WritableStream<Uint8Array>
    } | null
    if (!port?.writable) throw new Error('Puerto no abierto')
    const writer = port.writable.getWriter()
    await writer.write(new TextEncoder().encode(cmd + '\r'))
    writer.releaseLock()
  }

  disconnect(): void {
    this.running = false
    const reader = this.reader as { cancel: () => Promise<void> } | null
    void reader?.cancel().catch(() => undefined)
    const port = this.port as { close: () => Promise<void> } | null
    void port?.close().catch(() => undefined)
    this.port = null
  }
}

/* ---------- 5. Demo de captura subghz (para probar el parser sin radio) ---------- */

export const SAMPLE_SUBGHZ_RX = [
  'Listening at 433920000 Hz, modulation AM650',
  'Frequency: 433.920 MHz',
  'Modulation: AM650',
  'Reading #1 Princeton:',
  '  Key:0x1A2B3C4D5E Bit:24',
  'Reading #2 CAME:',
  '  Key:0x00F7E21A Bit:12',
  'Reading #3 RAW:',
  '  Key:0x00919C3F92CB6 Bit:49',
].join('\n')

/* ---------- 6. Catálogo didáctico ---------- */

export const FLIPPER_LIMITS: string[] = [
  'El simulador NO transmite nada: sin hardware, todo es teatro educativo. Con hardware, tú eres el responsable legal de lo que emitas.',
  'Web Serial solo existe en Chrome/Edge de escritorio y exige HTTPS (o localhost) y consentimiento explícito del usuario para abrir el puerto.',
  'El CLI real del Flipper puede cambiar entre versiones de firmware (Unleashed/RogueMaster añaden comandos): el parser es tolerante pero no exhaustivo.',
  'Las frecuencias sub-GHz legales varían por país (433/868/915 MHz según región): transmitir fuera de las bandas ISM puede interferir servicios críticos.',
]

export const FLIPPER_LESSONS: { title: string; lesson: string }[] = [
  { title: 'Fixed code vs rolling code', lesson: 'Las capturas Princeton del simulador son fixed-code: grabar y reenviar basta. Los mandos modernos usan rolling code (KeeLoq): el contador sincronizado hace el replay inútil… salvo que uses un jammer + captura («rolljam»).' },
  { title: 'Tu mando de garaje es de 1980', lesson: 'Millones de receptores siguen aceptando códigos fijos de 8-24 bits: 2^24 = 16.7M combinaciones, y con un SDR se fuerzan en minutos. El atacante no hackea el cifrado: es que NO HAY cifrado.' },
  { title: 'MouseJack: teclados inalámbricos', lesson: 'Muchos dongles 2.4 GHz de teclado no cifran ni se emparejan bien: inyectar pulsaciones a distancia es posible desde 2016 (Bastille). Regla: para escribir contraseñas, teclado con cable o Bluetooth LE con emparejamiento.' },
  { title: 'MIFARE Classic sigue vivo', lesson: 'El Crypto1 de MIFARE Classic se rompió en 2008 y aún abre oficinas, gimnasios y aulas. Si tu edificio usa estas tarjetas, el UID no es una credencial: es un nombre público.' },
  { title: 'El Flipper educa porque integra', lesson: 'No hay técnica nueva dentro: SDR viejos ya hacían todo. Su valor es didáctico: demuestra en 30 segundos que «la puerta del garaje no es seguridad» y por qué los pentests físicos empiezan por la radio.' },
]
