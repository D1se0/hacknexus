/* BLE GATT Explorer — base de datos estándar + decoder de advertising, 100% local.
   Servicios y characteristics de la spec de Bluetooth SIG con el riesgo real
   de cada uno, conversor UUID 16↔128 bits y decodificador de advertising. */

export interface BleChar {
  uuid: string
  name: string
  props: string
  risk?: string
}

export interface BleService {
  uuid: string
  name: string
  desc: string
  risk: string
  riskLevel: 'bajo' | 'medio' | 'alto'
  chars: BleChar[]
}

const BASE = '0000xxxx-0000-1000-8000-00805f9b34fb'

export const uuid16to128 = (u16: string): string => BASE.replace('xxxx', u16.replace(/^0x/i, '').padStart(4, '0'))

export const uuid128to16 = (u128: string): string | null => {
  const m = u128.toLowerCase().match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/)
  return m ? `0x${m[1].toUpperCase()}` : null
}

export const BLE_SERVICES: BleService[] = [
  {
    uuid: '0x1800', name: 'Generic Access (GAP)', desc: 'Identidad del dispositivo: nombre, apariencia, preferencias de conexión.', risk: 'El Device Name filtra modelo/usuario (ej: "Peugeot 308 de Ana"). En scrapers de BLE es el primer dato recogido.', riskLevel: 'bajo',
    chars: [
      { uuid: '0x2A00', name: 'Device Name', props: 'Read', risk: 'fuga de identidad: modelo, usuario o ubicación en el nombre' },
      { uuid: '0x2A01', name: 'Appearance', props: 'Read' },
      { uuid: '0x2A04', name: 'Connection Parameters', props: 'Read' },
    ],
  },
  {
    uuid: '0x1801', name: 'Generic Attribute (GATT)', desc: 'Gestión del propio protocolo GATT: service changed, DB hash.', risk: 'Service Changed sin proteger permite disparar re-descubrimientos en el cliente: DoS menor.', riskLevel: 'bajo',
    chars: [
      { uuid: '0x2A05', name: 'Service Changed', props: 'Indicate' },
      { uuid: '0x2B2A', name: 'Database Hash', props: 'Read' },
    ],
  },
  {
    uuid: '0x180A', name: 'Device Information', desc: 'Fabricante, modelo, serial, firmware y hardware version.', risk: 'SERIAL NUMBER legible = huella perfecta del dispositivo para rastreo y para preparar exploits específicos del modelo/versión de firmware.', riskLevel: 'medio',
    chars: [
      { uuid: '0x2A29', name: 'Manufacturer Name', props: 'Read' },
      { uuid: '0x2A24', name: 'Model Number', props: 'Read' },
      { uuid: '0x2A25', name: 'Serial Number', props: 'Read', risk: 'identificador único: rastreo y targeting' },
      { uuid: '0x2A26', name: 'Firmware Revision', props: 'Read', risk: 'si el firmware tiene CVE, aquí te dicen cuál buscar' },
      { uuid: '0x2A27', name: 'Hardware Revision', props: 'Read' },
    ],
  },
  {
    uuid: '0x180F', name: 'Battery Service', desc: 'Nivel de batería en %.', risk: 'Batería legible sin pairing = rastreo pasivo: el nivel de batería como identificador temporal fue demostrado en investigaciones de tracking.', riskLevel: 'bajo',
    chars: [{ uuid: '0x2A19', name: 'Battery Level', props: 'Read/Notify', risk: 'drena el device con lecturas agresivas; sirve de beacon pasivo' }],
  },
  {
    uuid: '0x180D', name: 'Heart Rate', desc: 'Medidas de frecuencia cardíaca (wearables).', risk: 'Datos de salud SIN autenticación en muchos devices: leer el ritmo cardíaco de otra persona o inyectar valores falsos es trivial en los baratos.', riskLevel: 'medio',
    chars: [
      { uuid: '0x2A37', name: 'Heart Rate Measurement', props: 'Notify', risk: 'salud en claro: spoofeable en devices sin pairing' },
      { uuid: '0x2A38', name: 'Body Sensor Location', props: 'Read' },
    ],
  },
  {
    uuid: '0x181A', name: 'Environmental Sensing', desc: 'Temperatura, humedad, presión…', risk: 'Sensores legibles sin auth = vigilancia del entorno (¿hay alguien en casa moviendo la temperatura?).', riskLevel: 'medio',
    chars: [
      { uuid: '0x2A6E', name: 'Temperature', props: 'Read/Notify' },
      { uuid: '0x2A6F', name: 'Humidity', props: 'Read/Notify' },
      { uuid: '0x2A6D', name: 'Pressure', props: 'Read/Notify' },
    ],
  },
  {
    uuid: '0x1811', name: 'Alert Notification', desc: 'Notificaciones del teléfono en wearables.', risk: 'Leer notificaciones = mensajes, OTPs de SMS en pantalla. Si no exige pairing con protección, es lectura de SMS bancarios.', riskLevel: 'alto',
    chars: [
      { uuid: '0x2A45', name: 'New Alert', props: 'Notify', risk: 'contenido de notificaciones: OTPs incluidos' },
      { uuid: '0x2A44', name: 'Alert Notification Control', props: 'Write' },
    ],
  },
  {
    uuid: '0x1815', name: 'Automation IO', desc: 'Relés, GPIOs, actuadores del hogar inteligente.', risk: 'Write sin protección = accionar cerraduras/reles físicos. El riesgo es físico, no solo digital.', riskLevel: 'alto',
    chars: [
      { uuid: '0x2A56', name: 'Digital', props: 'Read/Write', risk: 'control directo de salidas físicas' },
      { uuid: '0x2A58', name: 'Analog', props: 'Read/Notify' },
    ],
  },
  {
    uuid: '0xFE59', name: 'Nordic DFU (vendor)', desc: 'Actualización de firmware OTA de Nordic Semiconductor — la puerta de entrada favorita.', risk: 'Un DFU sin firma/validación permite FLASH UN FIRMWARE COMPLETO distinto: takeover total del dispositivo. Casi todos los gadgets baratos usan este chip.', riskLevel: 'alto',
    chars: [
      { uuid: '0x1534', name: 'DFU Packet', props: 'Write Without Response', risk: 'canal de escritura del nuevo firmware' },
      { uuid: '0x1531', name: 'DFU Control Point', props: 'Write/Notify', risk: 'arranca el proceso de actualización' },
    ],
  },
]

/* ───────── advertising decoder ───────── */

export interface AdEntry {
  type: string
  raw: string
  decoded: string
}

const AD_TYPES: Record<number, string> = {
  0x01: 'Flags', 0x02: 'Incomplete 16-bit UUIDs', 0x03: 'Complete 16-bit UUIDs', 0x06: 'Incomplete 128-bit UUIDs',
  0x07: 'Complete 128-bit UUIDs', 0x08: 'Shortened Local Name', 0x09: 'Complete Local Name',
  0x0A: 'TX Power Level', 0x12: 'Peripheral Connection Interval', 0x16: 'Service Data (16-bit)',
  0x19: 'Appearance', 0xFF: 'Manufacturer Data',
}

const le16 = (bytes: number[]): number => bytes[0] | (bytes[1] << 8)

export const decodeAdvertising = (hex: string): AdEntry[] | null => {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  if (clean.length < 6 || clean.length % 2 !== 0) return null
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16))
  const out: AdEntry[] = []
  let i = 0
  while (i < bytes.length && out.length < 20) {
    const len = bytes[i]
    if (len === 0 || i + len >= bytes.length + 1) break
    const type = bytes[i + 1]
    const data = bytes.slice(i + 2, i + 1 + len)
    const name = AD_TYPES[type] ?? `tipo 0x${type.toString(16).padStart(2, '0')}`
    let decoded = data.map((b) => b.toString(16).padStart(2, '0')).join(' ')
    if (type === 0x09 || type === 0x08) decoded = data.map((b) => String.fromCharCode(b)).join('')
    else if (type === 0x03 || type === 0x02) {
      const uuids: string[] = []
      for (let j = 0; j + 1 < data.length; j += 2) uuids.push(`0x${le16(data.slice(j, j + 2)).toString(16).padStart(4, '0').toUpperCase()}`)
      decoded = uuids.join(', ')
    } else if (type === 0x01) decoded = `LE Limited/General: 0b${data[0]?.toString(2).padStart(8, '0')}`
    else if (type === 0x0A) decoded = `${data[0]} dBm`
    else if (type === 0xFF) decoded = `company 0x${le16(data.slice(0, 2)).toString(16).padStart(4, '0')} · ${data.slice(2).map((b) => b.toString(16).padStart(2, '0')).join(' ')}`
    out.push({ type: name, raw: `len=${len} type=0x${type.toString(16)}`, decoded })
    i += len + 1
  }
  return out.length ? out : null
}

export const BLE_RISK_SUMMARY = [
  'El pairing "Just Works" NO cifra contra MITM: sin clave numérica, cualquier atacante activo se interpone.',
  'Muchos devices aceptan escrituras sin pairing: el control físico (candados, dosis de insulina) se ha demostrado hackeable por GATT.',
  'El nombre y Manufacturer Data hacen tracking persistente incluso con MAC aleatoria (los datos del fabricante no rotan).',
  'Defensa: exigir pairing con bonding + LE Secure Connections, desactivar DFU en producción, y no meter PII en el Device Name.',
]
