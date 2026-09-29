/* ── DniGen · Ronda 20 ────────────────────────────────────────────────────
   Generador didáctico de DNI/NIE españoles FICTICIOS con el algoritmo
   REAL de la letra (módulo 23, tabla TRWAGMYFPDXBNJZSQVHLCKE) y el
   checksum MRZ de ICAO 9303 (pesos 7-3-1). La letra del DNI es un control
   de transcripción de los años 60, no un secreto: sirve para validar
   formularios, detectar datos con letra inconsistente y entender el
   trazado MRZ del documento físico. 100% local. */

/* ---------- 1. Algoritmo oficial de la letra (módulo 23) ---------- */

/** Tabla oficial del módulo 23. */
export const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/** Letra oficial para un número de DNI (0-99999999). */
export function dniLetter(num: number): string {
  const n = Math.floor(num)
  if (n < 0 || n > 99999999 || !Number.isFinite(n)) throw new Error('Número de DNI fuera de rango (0-99999999)')
  return DNI_LETTERS[n % 23]!
}

/** Número formateado con ceros + letra: 01234567Z. */
export function formatDni(num: number): string {
  return String(Math.floor(num)).padStart(8, '0') + dniLetter(num)
}

/** Inserta guion: 01234567Z → 01234567-Z. */
export function dniWithDash(dni: string): string {
  const m = dni.match(/^(\d{8})([A-Z])$/)
  return m ? `${m[1]}-${m[2]}` : dni
}

/* ---------- 2. NIE (Orden INT/1097/2005) ---------- */

/** Valor numérico de la letra inicial del NIE. */
export const NIE_PREFIX: Record<'X' | 'Y' | 'Z', number> = { X: 0, Y: 1, Z: 2 }

/** Letra de control de un NIE (X/Y/Z + 7 dígitos). */
export function nieLetter(prefix: 'X' | 'Y' | 'Z', num: number): string {
  if (num < 0 || num > 9999999) throw new Error('Número de NIE fuera de rango (0-9999999)')
  const numericValue = NIE_PREFIX[prefix] * 10_000_000 + num
  return DNI_LETTERS[numericValue % 23]!
}

/* ---------- 3. Generación ficticia ---------- */

function randInt(max: number): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % max
}

export type DniKind = 'dni' | 'nie'

export interface GeneratedDoc {
  kind: DniKind
  /** completo con letra: 01234567Z / Y1234567L */
  value: string
  /** con guiones: 01234567-Z / Y-1234567-L */
  valueDash: string
  numberPart: string
  letter: string
  /** módulo 23 (educativo) */
  mod23: number
  /** valor numérico usado para el módulo (el NIE suma 0/10/20 millones) */
  numericValue: number
}

/** Genera un DNI ficticio (opcionalmente con número fijo para demos). */
export function generateDni(fixedNumber?: number): GeneratedDoc {
  let num = fixedNumber
  if (num === undefined) {
    do {
      num = randInt(100_000_000)
    } while (num < 1_000_000)
  }
  num = Math.floor(num)
  const letter = dniLetter(num)
  const padded = String(num).padStart(8, '0')
  return {
    kind: 'dni',
    value: padded + letter,
    valueDash: `${padded}-${letter}`,
    numberPart: padded,
    letter,
    mod23: num % 23,
    numericValue: num,
  }
}

/** Genera un NIE ficticio. */
export function generateNie(prefix: 'X' | 'Y' | 'Z' = 'Y'): GeneratedDoc {
  let num = randInt(10_000_000)
  if (num < 1_000_000) num += 1_000_000
  const letter = nieLetter(prefix, num)
  const padded = String(num).padStart(7, '0')
  return {
    kind: 'nie',
    value: `${prefix}${padded}${letter}`,
    valueDash: `${prefix}-${padded}-${letter}`,
    numberPart: `${prefix}${padded}`,
    letter,
    mod23: (NIE_PREFIX[prefix] * 10_000_000 + num) % 23,
    numericValue: NIE_PREFIX[prefix] * 10_000_000 + num,
  }
}

/* ---------- 4. Analizador/validador ---------- */

export interface DniAnalysis {
  input: string
  kind: 'dni' | 'nie' | 'desconocido'
  numberPart: string
  letter: string
  expectedLetter: string
  letterOk: boolean
  numericValue: number
  mod23: number
  normalized: string
  verdict: 'valido' | 'letra-erronea' | 'formato-erroneo'
  explanation: string
}

/** Normaliza: mayúsculas y sin guiones, puntos ni espacios. */
export function normalizeDoc(input: string): string {
  return input.trim().toUpperCase().replace(/[\s.-]/g, '')
}

/** Analiza cualquier DNI/NIE y explica el veredicto. */
export function analyzeDoc(input: string): DniAnalysis {
  const norm = normalizeDoc(input)
  const empty = {
    input,
    kind: 'desconocido' as const,
    numberPart: '',
    letter: '',
    expectedLetter: '',
    letterOk: false,
    numericValue: 0,
    mod23: 0,
    normalized: norm,
    verdict: 'formato-erroneo' as const,
    explanation: '',
  }
  if (!norm) return { ...empty, explanation: 'Introduce un documento.' }

  let kind: 'dni' | 'nie' = 'dni'
  let numberPart = ''
  let letter = ''
  let numericValue = 0

  if (/^\d{8}[A-Z]$/.test(norm)) {
    kind = 'dni'
    numberPart = norm.slice(0, 8)
    letter = norm[8]!
    numericValue = parseInt(numberPart, 10)
  } else if (/^[XYZ]\d{7}[A-Z]$/.test(norm)) {
    kind = 'nie'
    const prefix = norm[0] as 'X' | 'Y' | 'Z'
    numberPart = norm.slice(0, 8)
    letter = norm[8]!
    numericValue = NIE_PREFIX[prefix] * 10_000_000 + parseInt(norm.slice(1, 8), 10)
  } else {
    return {
      ...empty,
      explanation: 'Formato no reconocido: DNI = 8 dígitos + letra; NIE = X/Y/Z + 7 dígitos + letra.',
    }
  }

  const expectedLetter = DNI_LETTERS[numericValue % 23]!
  const letterOk = letter === expectedLetter
  return {
    input,
    kind,
    numberPart,
    letter,
    expectedLetter,
    letterOk,
    numericValue,
    mod23: numericValue % 23,
    normalized: norm,
    verdict: letterOk ? 'valido' : 'letra-erronea',
    explanation: letterOk
      ? `Letra CORRECTA: ${numericValue} mod 23 = ${numericValue % 23} → «${expectedLetter}». OJO: válido ≠ real; solo prueba que la aritmética cuadra (la existencia la decide el padrón, no el módulo).`
      : `Letra ERRÓNEA: ${numericValue} mod 23 = ${numericValue % 23} → debería ser «${expectedLetter}», no «${letter}». Es el detector más usado en formularios: la letra es computable, no un dato secreto.`,
  }
}

/* ---------- 5. MRZ de ICAO 9303 (TD1, la del DNI 3.0 físico) ---------- */

const MRZ_WEIGHTS = [7, 3, 1]

/** Checksum MRZ con pesos 7-3-1 (dígitos=valor, letras=10-35, '<'=0; resto %10). */
export function mrzCheckDigit(s: string): number {
  const VALUES: Record<string, number> = {}
  for (let i = 0; i < 10; i++) VALUES[String(i)] = i
  for (let i = 0; i < 26; i++) VALUES[String.fromCharCode(65 + i)] = 10 + i
  VALUES['<'] = 0
  let sum = 0
  let idx = 0
  for (const ch of s) {
    const v = VALUES[ch]
    if (v === undefined) throw new Error(`Carácter MRZ inválido: «${ch}»`)
    sum += v * MRZ_WEIGHTS[idx % 3]!
    idx++
  }
  return sum % 10
}

/** Fecha civil → MRZ YYMMDD. */
export function toMrzDate(y: number, m: number, d: number): string {
  return String(y % 100).padStart(2, '0') + String(m).padStart(2, '0') + String(d).padStart(2, '0')
}

export interface MrzDoc {
  /** número de soporte del DNI 3.0 (BVRxxxxxxxx o 9 dígitos) */
  number: string
  birth: string // ISO yyyy-mm-dd
  expiry: string // ISO yyyy-mm-dd
  surname: string
  givenNames: string
}

/** MRZ TD1 (3 líneas × 30) como la del DNI 3.0 real, con checks 7-3-1 reales. */
export function buildMrzTd1(doc: MrzDoc): string[] {
  const fill = (s: string) => s.slice(0, 30).padEnd(30, '<')

  // L1: ID + país emisor + nº de soporte (9 chars) + check del nº
  const docNum = doc.number.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 9).padEnd(9, '0')
  const l1 = fill('IDES' + 'P' + docNum + mrzCheckDigit(docNum))

  // L2: fecha nacimiento + check, sexo, fecha caducidad + check, nacionalidad, check compuesto
  const birth = doc.birth.replace(/[^0-9]/g, '')
  const by = parseInt(birth.slice(0, 4), 10)
  const bm = parseInt(birth.slice(4, 6), 10)
  const bd = parseInt(birth.slice(6, 8), 10)
  const birthMrz = toMrzDate(by, bm, bd)
  const expiryMrz = toMrzDate(
    parseInt(doc.expiry.slice(0, 4), 10),
    parseInt(doc.expiry.slice(5, 7), 10),
    parseInt(doc.expiry.slice(8, 10), 10),
  )
  const composite = docNum + mrzCheckDigit(docNum) + birthMrz + mrzCheckDigit(birthMrz) + expiryMrz + mrzCheckDigit(expiryMrz)
  const l2 = fill(birthMrz + mrzCheckDigit(birthMrz) + '<' + expiryMrz + mrzCheckDigit(expiryMrz) + 'ESP<<<<' + mrzCheckDigit(composite))

  // L3: apellidos << nombre
  const l3 = fill(doc.surname.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, '<') + '<<' + doc.givenNames.toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, '<'))
  return [l1, l2, l3]
}

/** Demo MRZ por defecto, determinista para tests. */
export function sampleMrz(): MrzDoc & { lines: string[] } {
  const doc: MrzDoc = {
    number: 'BVR123456',
    birth: '1985-03-12',
    expiry: '2031-07-31',
    surname: 'GARCIA LOPEZ',
    givenNames: 'MARTA',
  }
  return { ...doc, lines: buildMrzTd1(doc) }
}

/* ---------- 6. Soporte y catálogo didáctico ---------- */

export const DNI_LIMITS: string[] = [
  'Los documentos generados son FICTICIOS: la letra es aritmética pura y la existencia real la acredita solo el Registro Civil/padrón.',
  'La MRZ generada sigue el layout TD1 con checks reales pero NO procede de un documento físico ni pasa verificación oficial.',
  'Usar DNI ajenos o inventados plausibles para registarse, contratar o suplantar es delito (suplantación de identidad y fraude documental).',
  'No se consulta ninguna base de datos: todo el cálculo ocurre en tu navegador y no sale ningún byte.',
]

export const DNI_LESSONS: { title: string; lesson: string }[] = [
  { title: 'La letra es de los años 60, no un secreto', lesson: 'El módulo 23 con tabla TRWAGMYFPDXBNJZSQVHLCKE es un control de transcripción con décadas de uso: un dígito tecleado mal casi siempre cambia la letra. Es aritmética pública, como el ISBN o el IBAN.' },
  { title: 'NIE: el truco del 0/10/20 millones', lesson: 'X=0, Y=10M, Z=20M: la letra del NIE se calcula EXACTAMENTE igual que la del DNI sumando el valor de la inicial. Por eso X-1234567 tiene la misma letra que el DNI 01234567.' },
  { title: 'MRZ: el pasaporte dentro del DNI', lesson: 'Las 3 líneas OCR-B del reverso del DNI 3.0 son TD1 de ICAO 9303: número de SOYTE, checks 7-3-1 y nombre normalizado con «<<». Son las que leen escáneres de hotel, aeropuerto y banca online.' },
  { title: 'Válido ≠ real (otra vez)', lesson: 'La aritmética prueba formato, no existencia: igual que Luhn no consulta al emisor de la tarjeta, el módulo 23 no consulta el padrón. La verificación real es documental y presencial.' },
  { title: 'KYC real: documento + vida', lesson: 'Los procesos serios de KYC combinan lectura MRZ/NFC del chip + prueba de vida (liveness) + riesgo behavioral: la letra del DNI es solo la primera valla de un estadio entero.' },
]
