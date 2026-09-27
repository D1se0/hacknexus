/* Laboratorio NFC/RFID educativo — 100% local, nada toca hardware real.
   Modela el dominio: familias de chips (MIFARE Classic/Plus/DESFire, NTAG, EM4100, HID Prox),
   generación de UIDs coherentes por familia, cálculo BCC, dumps hex formateados,
   decodificación Wiegand 26 y modulaciones. Todo simulado con CSPRNG del navegador. */

export interface ChipFamily {
  id: string
  name: string
  freq: '13.56 MHz' | '125 kHz'
  uidLen: number // bytes
  memory: string
  security: string
  color: string
  notes: string
  commonUse: string
}

export const CHIP_FAMILIES: ChipFamily[] = [
  {
    id: 'mifare-classic-1k', name: 'MIFARE Classic 1K', freq: '13.56 MHz', uidLen: 4,
    memory: '1024 bytes (16 sectores × 4 bloques)', security: 'Crypto-1 (roto desde 2008, atacable con diccionario/nonce)',
    color: '#f43f5e', notes: 'El más extendido del mundo y el más atacado. cloner por defecto en laboratorios de concienciación.',
    commonUse: 'Control de acceso antiguo, kioscos, pago obsoleto',
  },
  {
    id: 'mifare-classic-4k', name: 'MIFARE Classic 4K', freq: '13.56 MHz', uidLen: 4,
    memory: '4096 bytes (32+8 sectores)', security: 'Crypto-1 roto igual que el 1K',
    color: '#fb7185', notes: 'Igual de roto que el 1K pero con más capacidad para dumps más grandes.',
    commonUse: 'Transporte, grandes instalaciones legacy',
  },
  {
    id: 'mifare-plus', name: 'MIFARE Plus', freq: '13.56 MHz', uidLen: 4,
    memory: '1K/2K/4K', security: 'AES-128 en niveles de seguridad 3+ (Crypto-1 en modo compatibilidad)',
    color: '#f59e0b', notes: 'Puente migratorio desde Classic. Si funciona en SL1 sin AES, es igual de roto que Classic.',
    commonUse: 'Migración de instalaciones Classic',
  },
  {
    id: 'desfire', name: 'MIFARE DESFire', freq: '13.56 MHz', uidLen: 7,
    memory: '2K/4K/8K con sistema de ficheros', security: '3DES/AES con autenticación mutua. La EV1 rota; EV2/EV3 resistentes',
    color: '#2ee88a', notes: 'El correcto cuando el dinero importa. NO se clona con Proxmark básico: se necesita spoofing complejo.',
    commonUse: 'Transporte moderno, universidades, credential de gobierno',
  },
  {
    id: 'ntag', name: 'NTAG 213/215/216', freq: '13.56 MHz', uidLen: 7,
    memory: '144/504/888 bytes NDEF', security: 'Ninguna relevante (UID no secreto, datos legibles)',
    color: '#38bdf8', notes: 'El NFC de pegatinas y tarjetas de presentación. Escribe con tu móvil. Great para NFCevil/red team basic.',
    commonUse: 'Etiquetas NFC, marketing, tareas del móvil',
  },
  {
    id: 'em4100', name: 'EM4100 / EM4200', freq: '125 kHz', uidLen: 5,
    memory: '64 bits de solo lectura', security: 'NINGUNA: UID en claro, clonable con un $10 T5577',
    color: '#a78bfa', notes: 'El badge de 125 kHz clásico. Se clona incluso con Flipper Zero. Si tu oficina usa esto, TODO el mundo puede entrar.',
    commonUse: 'Control de acceso antiguo de badge físico',
  },
  {
    id: 'hid-prox', name: 'HID ProxCard II', freq: '125 kHz', uidLen: 6,
    memory: 'Formato Wiegand 26 bits', security: 'Ninguna criptográfica: se lee el Wiegand y se reproduce',
    color: '#c084fc', notes: 'El formato Facility Code + Card Number. Un lector genérico lo clona en segundos.',
    commonUse: 'Corporativo USA y multinacionales',
  },
  {
    id: 'iclass', name: 'HID iCLASS SE', freq: '13.56 MHz', uidLen: 8,
    memory: '2K/16K aplicativos', security: 'DES/AES con clave por instalación. SEOS es el sucesor',
    color: '#94a3b8', notes: 'Más duro que Prox pero con exploits históricos (clave default). El hardware de clonación es caro.',
    commonUse: 'Corporativo moderno',
  },
]

/* ───────── generación de UID coherente ───────── */

const hex = (n: number): string => n.toString(16).toUpperCase().padStart(2, '0')

const rnd = (bytes: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bytes))

/* fabril: el byte 0 suele indicar fabricante (NXP = 04) */
export function genUid(familyId: string): string {
  const fam = CHIP_FAMILIES.find((f) => f.id === familyId)!
  const b = rnd(fam.uidLen)
  if (fam.freq === '13.56 MHz') {
    b[0] = 0x04 // NXP
    if (fam.uidLen === 7) { b[4] = 0x88 } // marcador de cascada UID7 (nivel 2)
  }
  if (fam.id === 'em4100') b[0] = b[0] & 0x0f // EM4100: los 8 bits altos del byte 0 son versión
  return Array.from(b, hex).join(' ')
}

/* BCC de MIFARE Classic: XOR de los 4 bytes del UID (aparece en el bloque 0) */
export function mifareBcc(uidHex: string): string {
  const bytes = uidHex.replace(/\s+/g, '').match(/.{2}/g) ?? []
  const bcc = bytes.slice(0, 4).reduce((a, h) => a ^ parseInt(h, 16), 0)
  return hex(bcc)
}

/* bloque 0 de MIFARE Classic 1K: UID(4) + BCC + SAK + ATQA + datos fabricante */
export function mifareBlock0(uidHex: string): string {
  const uid = uidHex.replace(/\s+/g, '').match(/.{2}/g) ?? []
  const parts = [...uid.slice(0, 4), mifareBcc(uidHex), '08', '04', '00', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72']
  return parts.join(' ').toUpperCase()
}

/* dump completo simulado de MIFARE Classic 1K: 16 sectores, bloque de trailer con claves default */
export function mifareClassicDump(uidHex: string): string {
  const lines: string[] = []
  const uid = uidHex.replace(/\s+/g, '').match(/.{2}/g) ?? []
  for (let sector = 0; sector < 16; sector++) {
    for (let block = 0; block < 4; block++) {
      const absBlock = sector * 4 + block
      if (sector === 0 && block === 0) {
        lines.push(`sector ${String(sector).padStart(2, '0')}, bloque 00: ${mifareBlock0(uidHex)}`)
      } else if (block === 3) {
        // trailer: keyA default ffffffffffff, access bits default, keyB default
        lines.push(`sector ${String(sector).padStart(2, '0')}, bloque ${String(absBlock).padStart(2, '0')}: FF FF FF FF FF FF FF 07 80 69 FF FF FF FF FF FF  ← trailer (claves por defecto!)`)
      } else {
        const data = Array.from(rnd(16), hex).join(' ')
        lines.push(`sector ${String(sector).padStart(2, '0')}, bloque ${String(absBlock).padStart(2, '0')}: ${data}`)
      }
    }
  }
  void uid
  return lines.join('\n')
}

/* dump EM4100: 64 bits = 9 header (1s) + 10×(4 datos + paridad) + paridad de columnas + stop */
export function em4100Dump(uidHex: string): string {
  const bytes = uidHex.replace(/\s+/g, '').match(/.{2}/g) ?? []
  const bits: number[] = []
  // header de 9 unos
  for (let i = 0; i < 9; i++) bits.push(1)
  // 10 nibbles (los 5 bytes EM4100 = versión+datos)
  const nibbles = bytes.flatMap((h) => [parseInt(h[0], 16), parseInt(h[1], 16)])
  for (const n of nibbles) {
    const b = [8 & n && 1, 4 & n && 1, 2 & n && 1, 1 & n && 1].map(Number)
    bits.push(...b)
    bits.push(b.reduce((a, x) => a + x, 0) % 2) // paridad par por fila
  }
  // paridad de columnas (4 bits)
  for (let col = 0; col < 4; col++) {
    let sum = 0
    for (let row = 0; row < 10; row++) sum += bits[9 + row * 5 + col]
    bits.push(sum % 2)
  }
  bits.push(0) // stop
  const s = bits.join('')
  return `hex: ${uidHex}\n64 bits: ${s.slice(0, 32)} ${s.slice(32)}`
}

/* ───────── Wiegand 26: FC (8 bits) + CN (16 bits) + paridad ───────── */

export interface Wiegand26 {
  facility: number
  card: number
  bits: string
  valid: boolean
  evenParityOk: boolean
  oddParityOk: boolean
}

export function wiegandDecode(hexBits: string): Wiegand26 | null {
  const clean = hexBits.replace(/[^01]/g, '')
  if (clean.length !== 26) return null
  const b = clean.split('').map(Number)
  // bit 0 = paridad par de bits 1-12; bit 25 = paridad impar de bits 13-24
  const evenHalf = b.slice(1, 13)
  const oddHalf = b.slice(13, 25)
  const evenOk = evenHalf.reduce((a, x) => a + x, 0) % 2 === b[0]
  const oddOk = (oddHalf.reduce((a, x) => a + x, 0) + 1) % 2 === b[25]
  const fc = parseInt(oddHalf.slice(0, 0).concat(evenHalf.slice(4)).join(''), 2) & 0xff
  // formato estándar: bits 1-8 = FC (después del bit de paridad), 9-24 = CN
  const fcBits = evenHalf.slice(0, 8)
  const cnBits = evenHalf.slice(8).concat(oddHalf.slice(0, 8))
  const facility = parseInt(fcBits.join(''), 2)
  const card = parseInt(cnBits.join(''), 2)
  void fc
  return { facility, card, bits: clean, valid: evenOk && oddOk, evenParityOk: evenOk, oddParityOk: oddOk }
}

export function wiegandEncode(facility: number, card: number): string {
  const fc = (facility & 0xff).toString(2).padStart(8, '0').split('').map(Number)
  const cn = (card & 0xffff).toString(2).padStart(16, '0').split('').map(Number)
  const evenHalf = fc.concat(cn.slice(0, 4))
  const oddHalf = cn.slice(4)
  const evenP = evenHalf.reduce((a, x) => a + x, 0) % 2
  const oddP = (oddHalf.reduce((a, x) => a + x, 0) + 1) % 2
  return [evenP, ...evenHalf, ...oddHalf, oddP].join('')
}

/* ───────── modulación (explicación + visual) ───────── */

export const MODULATIONS = [
  {
    id: 'ask', name: 'ASK / OOK (Amplitude Shift Keying)', freq: '125 kHz (EM4100, HID Prox)',
    desc: 'La amplitud de la portadora cambia para codificar 0s y 1s. En 125 kHz, el clásico Manchester.',
    color: '#2ee88a',
  },
  {
    id: 'fsk', name: 'FSK (Frequency Shift Keying)', freq: '125 kHz (algunos HID, FDX-B animal chips)',
    desc: 'La frecuencia alterna entre dos valores (10/8 ciclos por bit en FSK2). Los lectores HID FSK usan esta.',
    color: '#38bdf8',
  },
  {
    id: 'psk', name: 'PSK (Phase Shift Keying)', freq: '125 kHz (Indala, algunos EM)',
    desc: 'La fase de la portadora se invierte para marcar bits. Indala usa PSK1 con codificación FC/16.',
    color: '#f59e0b',
  },
  {
    id: 'load', name: 'Load Modulation (ISO 14443)', freq: '13.56 MHz (MIFARE, NTAG, DESFire)',
    desc: 'La tarjeta MODULA el campo del lector cortocircuitando su antena sutilmente. El lector ve la "sombra". OOK con subportadora a 847 kHz.',
    color: '#a78bfa',
  },
]

/* ───────── escenario educativo ───────── */

export interface AttackScenario {
  id: string
  name: string
  tool: string
  difficulty: 1 | 2 | 3 | 4 | 5
  desc: string
  defense: string
  legal: string
}

export const SCENARIOS: AttackScenario[] = [
  {
    id: 'em-clone', name: 'Clonado de badge 125 kHz', tool: 'Proxmark3 / Flipper Zero + T5577',
    difficulty: 1,
    desc: 'Se lee el UID del EM4100 original (no hay cifrado) y se escribe en una tarjeta blank T5577 emulando el mismo UID. 30 segundos.',
    defense: 'Migra a 13.56 MHz con autenticación mutua (DESFire/iCLASS SE). El simple cambio de frecuencia no basta: exigen claves únicas por tarjeta.',
    legal: 'SOLO con badges de TU propiedad o autorización escrita del responsable. Clonar el badge ajeno = allanamiento asistido.',
  },
  {
    id: 'mifare-dict', name: 'Ataque de diccionario Crypto-1', tool: 'Proxmark3 (mifare chk)',
    difficulty: 2,
    desc: 'Probando claves A/B por defecto (ffffffffffff, a0a1a2a3a4a5...) y diccionarios conocidos, la mayoría de instalaciones Classic caen en minutos.',
    defense: 'Claves únicas por sector y por tarjeta, nunca las de fábrica. Realmente: migra a Plus SL3 o DESFire.',
    legal: 'En auditoría autorizada es EL test clásico. Fuera de ella, acceso no autorizado a sistemas informáticos.',
  },
  {
    id: 'nested', name: 'Nested attack (recuperación de claves)', tool: 'Proxmark3 (mifare nested) / MFCUK+MFOC',
    difficulty: 4,
    desc: 'Con una clave conocida, el weakness del PRNG de Crypto-1 permite deducir las demás claves de sectores en minutos.',
    defense: 'Ninguna posible en Classic. Es la razón por la que el estándar murió.',
    legal: 'Investigación sobre tarjetas propias únicamente.',
  },
  {
    id: 'relay', name: 'Relay attack (NFC a distancia)', tool: '2 móviles NFC + app de relay / Proxmark remoto',
    difficulty: 5,
    desc: 'Dos antenas: una cerca de la víctima, otra cerca del lector. Se retransmite en tiempo real. La tarjeta "viaja" sin viajar.',
    defense: 'Limitación de distancia/tiempo, UWB en llaves modernas, protección MiTM. Para pago: límites de importe sin PIN.',
    legal: 'Estafado a un tercero = robo. En laboratorio con tus dos tarjetas = perfectamente legal.',
  },
  {
    id: 'ndef-evil', name: 'BadUSB NFC (NDEF malicioso)', tool: 'Cualquier app NFC + pegatina NTAG',
    difficulty: 1,
    desc: 'Una pegatina NFC con URI maliciosa (http://malware.site) pegada sobre el lector de un móvil hace que al apoyarlo se abra el navegador.',
    defense: 'Las apps de lectura NFC muestran la URI antes de abrirla: educación de usuarios. Empresas: desactivar NFC en flotas gestionadas.',
    legal: 'Poner stickers ajenos = delito de daños + posible fraude. En tu laboratorio, didáctico y legal.',
  },
]
