/* ── CardForge · Ronda 20 ─────────────────────────────────────────────────
   Generador didáctico de tarjetas de crédito FICTICIAS con algoritmo de
   Luhn real y prefijos IIN/BIN reales de cada red (Visa 4, Mastercard
   51-55/2221-2720, Amex 34/37, Discover 6011/65, JCB 3528-3589, Diners
   36/38, UnionPay 62). La numeración es aritmética de control de errores
   de transcripción (ISO/IEC 7812), no un dato secreto: el mismo checksum
   valida un IBAN o un NIF de empresa. Aprende qué filtra un formulario de
   pago y por qué «Luhn OK» NO significa «tarjeta real»: todo lo generado
   es inservible, sin cuenta ni dinero detrás. 100% local. */

/* ---------- 1. Luhn (ISO/IEC 7812-1) ---------- */

/** ¿El número pasa el checksum de Luhn? Acepta espacios y guiones. */
export function luhnCheck(numStr: string): boolean {
  const digits = numStr.replace(/[\s-]/g, '')
  if (!/^\d{2,}$/.test(digits)) return false
  let sum = 0
  let dbl = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return sum % 10 === 0
}

/** Dígito de control de Luhn para un cuerpo dado (sin el check final). */
export function luhnCheckDigit(body: string): number {
  let sum = 0
  let dbl = true // el check ocupa la última posición: su vecino derecho se dobla
  for (let i = body.length - 1; i >= 0; i--) {
    let d = body.charCodeAt(i) - 48
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return (10 - (sum % 10)) % 10
}

/** Completa un cuerpo parcial con su check de Luhn (para "completar BIN"). */
export function luhnComplete(partial: string): string {
  const digits = partial.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits)) return ''
  return digits + luhnCheckDigit(digits)
}

/* ---------- 2. Redes y prefijos IIN/BIN ---------- */

export type Network = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'diners' | 'unionpay'

export interface CardNetworkDef {
  id: Network
  name: string
  prefixes: string[]
  lengths: number[]
  cvcLen: number
  /** Formato agrupado para pintar el número */
  format: (d: string) => string
  /** Gradiente CSS del plástico */
  gradient: string
  /** Color del acento de la marca */
  accent: string
}

const group4 = (d: string) => d.replace(/(\d{4})(?=\d)/g, '$1 ')

export const NETWORKS: CardNetworkDef[] = [
  {
    id: 'visa',
    name: 'Visa',
    prefixes: ['4'],
    lengths: [16],
    cvcLen: 3,
    format: group4,
    gradient: 'linear-gradient(135deg, #0f1e5c 0%, #1a3a9e 55%, #4f6fd8 100%)',
    accent: '#f7b600',
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    prefixes: ['51', '52', '53', '54', '55', '2221', '2225', '2301', '2601', '2651', '2701', '2720'],
    lengths: [16],
    cvcLen: 3,
    format: group4,
    gradient: 'linear-gradient(135deg, #2b1505 0%, #eb001b 55%, #f79e1b 100%)',
    accent: '#f79e1b',
  },
  {
    id: 'amex',
    name: 'American Express',
    prefixes: ['34', '37'],
    lengths: [15],
    cvcLen: 4,
    format: (d) => d.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3'),
    gradient: 'linear-gradient(135deg, #02447e 0%, #006fcf 60%, #2e9bf0 100%)',
    accent: '#8fd0ff',
  },
  {
    id: 'discover',
    name: 'Discover',
    prefixes: ['6011', '644', '645', '646', '647', '648', '649', '65'],
    lengths: [16],
    cvcLen: 3,
    format: group4,
    gradient: 'linear-gradient(135deg, #5c2800 0%, #ff6000 60%, #ffb25e 100%)',
    accent: '#ffb25e',
  },
  {
    id: 'jcb',
    name: 'JCB',
    prefixes: ['3528', '3530', '3541', '3572', '3589'],
    lengths: [16],
    cvcLen: 3,
    format: group4,
    gradient: 'linear-gradient(135deg, #0e4c96 0%, #1a6fc4 55%, #36a852 100%)',
    accent: '#8be0a5',
  },
  {
    id: 'diners',
    name: 'Diners Club',
    prefixes: ['300', '301', '302', '303', '304', '305', '36', '38'],
    lengths: [14],
    cvcLen: 3,
    format: (d) => d.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3'),
    gradient: 'linear-gradient(135deg, #003a5c 0%, #0079be 60%, #4aa3df 100%)',
    accent: '#9fd4f5',
  },
  {
    id: 'unionpay',
    name: 'UnionPay',
    prefixes: ['62'],
    lengths: [16, 17, 18, 19],
    cvcLen: 3,
    format: group4,
    gradient: 'linear-gradient(135deg, #00447c 0%, #02639e 50%, #028e6e 100%)',
    accent: '#7fe0c3',
  },
]

export function networkById(id: Network): CardNetworkDef {
  return NETWORKS.find((n) => n.id === id) ?? NETWORKS[0]!
}

/** Detecta la red por prefijo IIN (null si ninguna encaja). */
export function networkFor(numStr: string): CardNetworkDef | null {
  const d = numStr.replace(/[\s-]/g, '')
  for (const n of NETWORKS) {
    for (const p of n.prefixes) {
      if (d.startsWith(p)) {
        // evita colisiones largas: 65 (Discover) no debe capturar 6222 (UnionPay)
        if (n.id === 'discover' && d.startsWith('62')) continue
        return n
      }
    }
  }
  return null
}

/* ---------- 3. Aleatoriedad criptográfica local ---------- */

function randInt(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % max
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)]!
}

/* ---------- 4. Datos sintéticos del titular ---------- */

const FIRST_M = ['Alejandro', 'Carlos', 'Daniel', 'Eduardo', 'Fernando', 'Gabriel', 'Hugo', 'Ignacio', 'Javier', 'Lucas', 'Mateo', 'Nicolás', 'Óscar', 'Pablo', 'Rodrigo', 'Sergio']
const FIRST_F = ['Ana', 'Beatriz', 'Carmen', 'Diana', 'Elena', 'Fernanda', 'Gloria', 'Irene', 'Julia', 'Lucía', 'Marta', 'Nuria', 'Olivia', 'Paula', 'Rocío', 'Sofía']
const LAST = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro']

export const BANKS_BY_NETWORK: Record<Network, string[]> = {
  visa: ['Banco Santander', 'BBVA', 'CaixaBank', 'Santander Río', 'Chase', 'Bank of America', 'Wells Fargo'],
  mastercard: ['BBVA', 'Banco Sabadell', 'Bankinter', 'Citibank', 'HSBC', 'Unicaja', 'Ibercaja'],
  amex: ['American Express ES', 'Amex Mexico', 'Amex UK'],
  discover: ['Discover Bank', 'Capital One'],
  jcb: ['JCB Co. Ltd.', 'MUFG Bank', 'Sumitomo Mitsui'],
  diners: ['Diners Club España', 'Citibank Diners'],
  unionpay: ['Bank of China', 'ICBC', 'China Construction Bank'],
}

export interface GeneratedCard {
  network: Network
  networkName: string
  number: string
  numberDigits: string
  holder: string
  bank: string
  expiry: string
  cvc: string
  gradient: string
  accent: string
  luhnOk: true
}

/** Genera una tarjeta ficticia válida por Luhn para la red dada. */
export function generateCard(network: Network, opts?: { bin?: string; holder?: string }): GeneratedCard {
  const def = networkById(network)
  const length = pick(def.lengths)

  // BIN: o el que pide el usuario (5-8 dígitos), o un prefijo real de la red
  let bin = ''
  if (opts?.bin) {
    const cleaned = opts.bin.replace(/[\s-]/g, '')
    if (/^\d{6,8}$/.test(cleaned)) bin = cleaned.slice(0, 8)
    else if (/^\d{1,5}$/.test(cleaned)) {
      // si el BIN corto ya empieza por un prefijo de la red, se usa tal cual
      bin = def.prefixes.some((p) => cleaned.startsWith(p))
        ? cleaned
        : def.prefixes[randInt(def.prefixes.length)]! + cleaned
    }
  }
  if (!bin) bin = pick(def.prefixes)

  // cuerpo entre BIN y dígito de control
  const bodyLen = length - bin.length - 1
  let body = bin
  for (let i = 0; i < bodyLen; i++) body += String(randInt(10))

  const number = luhnComplete(body)
  if (!luhnCheck(number)) throw new Error('Luhn interno inconsistente') // no debería pasar

  const first = pick(FIRST_M)
  const holder = opts?.holder ?? (randInt(2) === 0 ? `${first} ${pick(LAST)}` : `${pick(FIRST_F)} ${pick(LAST)}`)
  const bank = pick(BANKS_BY_NETWORK[network])

  const now = new Date()
  const month = 1 + randInt(12)
  const year = now.getFullYear() + 2 + randInt(4)
  const expiry = `${String(month).padStart(2, '0')}/${String(year).slice(2)}`

  const cvc = Array.from({ length: def.cvcLen }, () => randInt(10)).join('')

  return {
    network,
    networkName: def.name,
    number: def.format(number),
    numberDigits: number,
    holder: holder.toUpperCase(),
    bank,
    expiry,
    cvc,
    gradient: def.gradient,
    accent: def.accent,
    luhnOk: true,
  }
}

/** Genera N tarjetas de una red (para la tabla de lotes). */
export function generateBatch(network: Network, count: number): GeneratedCard[] {
  const out: GeneratedCard[] = []
  for (let i = 0; i < count; i++) out.push(generateCard(network))
  return out
}

/* ---------- 5. Analizador (qué ve un formulario de pago) ---------- */

/** Main Industry Identifier: qué emite el primer dígito. */
export const MII_MAP: Record<string, string> = {
  '0': 'ISO/TC 68 (asignación industrial)',
  '1': 'Aerolíneas',
  '2': 'Aerolíneas, financieras y Mastercard (2221-2720)',
  '3': 'Viajes y entretenimiento (Amex, Diners, JCB)',
  '4': 'Banca y finanzas (Visa)',
  '5': 'Banca y finanzas (Mastercard)',
  '6': 'Merchandising y banca (Discover, UnionPay)',
  '7': 'Petróleo y combustible',
  '8': 'Salud, telecomunicaciones',
  '9': 'Asignación nacional (organismo nacional)',
}

export interface CardAnalysis {
  digits: string
  network: CardNetworkDef | null
  lengthOk: boolean
  luhnOk: boolean
  mii: string
  bin: string
  verdict: 'valida-ficticia' | 'formato-ok-red-desconocida' | 'luhn-fallido' | 'vacia'
  explanation: string
}

/** Analiza un número pegado: red, longitud, Luhn y veredicto. */
export function analyzeCard(input: string): CardAnalysis {
  const digits = input.replace(/[\s-]/g, '')
  if (!digits) {
    return { digits: '', network: null, lengthOk: false, luhnOk: false, mii: '', bin: '', verdict: 'vacia', explanation: 'Introduce un número.' }
  }
  const network = networkFor(digits)
  const luhnOk = luhnCheck(digits)
  const lengthOk = network ? network.lengths.includes(digits.length) : digits.length >= 12 && digits.length <= 19
  const mii = MII_MAP[digits[0]!] ?? 'desconocido'
  const bin = digits.slice(0, 6)

  if (!luhnOk) {
    return {
      digits, network, lengthOk, luhnOk, mii, bin,
      verdict: 'luhn-fallido',
      explanation: 'El checksum de Luhn falla: algún dígito está mal (transcripción, OCR o número inventado sin aritmética). Es lo primero que comprueba CUALQUIER formulario de pago, sin tocar la red.',
    }
  }
  if (!network) {
    return {
      digits, network, lengthOk, luhnOk, mii, bin,
      verdict: 'formato-ok-red-desconocida',
      explanation: 'Luhn OK pero el prefijo no pertenece a ninguna red conocida: un formulario real seguiría preguntando a los emisores (o rechazaría en el BIN check).',
    }
  }
  return {
    digits, network, lengthOk, luhnOk, mii, bin,
    verdict: 'valida-ficticia',
    explanation: lengthOk
      ? `Estructura ${network.name} válida (IIN ${network.prefixes[0]}…, ${digits.length} dígitos, Luhn OK). OJO: esto solo prueba ARITMÉTICA — la tarjeta existe o no lo decide el emisor, no el dígito de control.`
      : `Estructura ${network.name} pero longitud atípica (${digits.length} vs ${network.lengths.join('/')}): Luhn OK, el formulario marcaría error de formato.`,
  }
}

/* ---------- 6. Catálogo didáctico ---------- */

export const CARDGEN_LIMITS: string[] = [
  'Todo lo generado es FICTICIO: pasa Luhn pero no existe en ningún emisor, no tiene cuenta y no supera una autorización real (el bank auth es online, no aritmético).',
  'El CVC generado no se valida con Luhn: ningún algoritmo local lo verifica; el emisor lo comprueba vía HSM al autorizar.',
  'Usar números de tarjeta ajenos o inventados plausibles en formularios reales es fraude (art. 248 CP en España y equivalentes): esto es un laboratorio de formato.',
  'Los BIN de ejemplo son prefijos públicos documentados; asignaciones reales por banco cambian y no son consultadas aquí (no se toca ninguna API).',
]

export const CARDGEN_LESSONS: { title: string; lesson: string }[] = [
  { title: 'Luhn: aritmética contra dedos torpes', lesson: 'Hans Luhn lo patentó en 1954 para detectar errores de transcripción al teclear: un dígito cambiado o dos transpuestos casi siempre rompen el checksum. NO es criptografía: es un chequeo de calidad de datos, como el ISBN.' },
  { title: 'Luhn OK ≠ tarjeta real', lesson: 'El 90% de los "card generators" de internet solo reparten Luhn. La diferencia es que una autorización real pregunta al emisor (3DS, HSM, cuenta con fondos): la aritmética es la valla más baja del jardín. Toda la prevención real ocurre online.' },
  { title: 'El IIN/BIN es el código de país y banco', lesson: 'Los primeros 6-8 dígitos identifican red + emisor: los motores antifraude (Sift, Riskified) los cruzan con BIN databases. El MII (primer dígito) ya dice la industria: 4/5 banca, 3 viajes, 7 petróleo.' },
  { title: 'PCI DSS: por qué los formularios van en iframe', lesson: 'Cualquier sistema que toca PANs (números de tarjeta) entra en el estándar PCI DSS: no almacenar CVV jamás, cifrar en tránsito y reposo, tokenizar. Por eso Stripe/Redsys inyectan iframes: tu servidor JAMÁS ve el número.' },
  { title: 'Tokenización: el fin del PAN', lesson: 'Apple Pay/Google Pay no envían tu tarjeta: envían un token de dispositivo específico (DPAN) restringido al comercio. Filtrar ese token no da dinero ni sirve en otro sitio: es la respuesta estructural al fraude con números filtrados.' },
]
