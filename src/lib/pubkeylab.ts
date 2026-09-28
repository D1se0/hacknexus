/* ── Asymmetric Crypto Playground · Ronda 17 ──────────────────────────────
   La matemática que hay detrás de x509/jwks/jwt/totp… EJECUTÁNDOSE:
   - modpow paso a paso (exponenciación binaria, la primitiva de todo)
   - Diffie-Hellman completo con números que puedes digerir
   - RSA textbook: keygen desde dos primos, cifrado por bloques y el ataque
     de factorización REAL de n pequeño (por eso 2048 bits y no 32)
   Con avisos de por qué el RSA «de libro» NO es el RSA real (padding). */

/* ---------- 1. Primitivas ---------- */

/** Exponenciación modular binaria (square-and-multiply). */
export function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod <= 1n) return 0n
  let result = 1n
  let b = ((base % mod) + mod) % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

export interface ModpowStep {
  bit: string
  action: 'cuadrado' | 'cuadrado+multiplicar'
  value: string
}

/** modpow pero grabando cada paso para la visualización. */
export function modpowSteps(base: bigint, exp: bigint, mod: bigint): { result: bigint; steps: ModpowStep[]; bits: string } {
  const bits = exp.toString(2)
  let result = 1n
  let b = ((base % mod) + mod) % mod
  const steps: ModpowStep[] = []
  for (let i = bits.length - 1; i >= 0; i--) {
    const bit = bits[bits.length - 1 - i]
    if (bit === '1') {
      result = (result * b) % mod
      steps.push({ bit: '1', action: 'cuadrado+multiplicar', value: result.toString() })
    } else {
      steps.push({ bit: '0', action: 'cuadrado', value: result.toString() })
    }
    b = (b * b) % mod
    if (i > 0) b = b % mod
  }
  return { result, steps, bits }
}

/** Miller-Rabin determinista para n < 3.317e24 con los 13 primeros primos. */
export function isPrime(n: bigint): boolean {
  if (n < 2n) return false
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  let d = n - 1n
  let r = 0n
  while (d % 2n === 0n) {
    d /= 2n
    r++
  }
  for (const a of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
    let x = modpow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    let composite = true
    for (let i = 0n; i < r - 1n; i++) {
      x = (x * x) % n
      if (x === n - 1n) {
        composite = false
        break
      }
    }
    if (composite) return false
  }
  return true
}

/** Euclides extendido. */
export function egcd(a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint } {
  if (b === 0n) return { g: a, x: 1n, y: 0n }
  const rec = egcd(b, a % b)
  return { g: rec.g, x: rec.y, y: rec.x - (a / b) * rec.y }
}

export function modInverse(a: bigint, m: bigint): bigint | null {
  const { g, x } = egcd(((a % m) + m) % m, m)
  if (g !== 1n) return null
  return ((x % m) + m) % m
}

/** El orden multiplicativo de g mod p (con límite de iteraciones). */
export function multiplicativeOrder(g: bigint, p: bigint, limit = 1_000_000): bigint | null {
  let x = g % p
  if (x === 0n) return null
  for (let i = 1n; i <= limit; i++) {
    if (x === 1n) return i
    x = (x * (g % p)) % p
  }
  return null
}

/* ---------- 2. Diffie-Hellman ejecutable ---------- */

export interface DhStep {
  who: 'Alice' | 'Bob' | 'público'
  what: string
  value: string
}

export interface DhResult {
  ok: boolean
  errors: string[]
  warnings: string[]
  steps: DhStep[]
  A: bigint
  B: bigint
  sharedAlice: bigint
  sharedBob: bigint
  sharedMatch: boolean
  pBits: number
  gOrder: bigint | null
  safePrimeNote: string
  mitmNote: string
}

export function dhRun(p: bigint, g: bigint, a: bigint, b: bigint): DhResult {
  const errors: string[] = []
  const warnings: string[] = []
  const steps: DhStep[] = []

  if (p < 5n) errors.push('p debe ser un primo ≥ 5 para una demo significativa')
  if (g < 2n || g >= p) errors.push('g debe cumplir 2 ≤ g < p')
  if (a < 2n || b < 2n) warnings.push('Los secretos a y b deberían ser ≥ 2 (y enormes en la vida real)')

  if (errors.length) {
    return { ok: false, errors, warnings, steps: [], A: 0n, B: 0n, sharedAlice: 0n, sharedBob: 0n, sharedMatch: false, pBits: p.toString(2).length, gOrder: null, safePrimeNote: '', mitmNote: '' }
  }

  const prime = isPrime(p)
  if (!prime) errors.push(`p = ${p} NO es primo: DH sobre un módulo compuesto se rompe por factorización`)
  const gOrder = multiplicativeOrder(g, p, 200_000)
  if (gOrder !== null && gOrder < p - 1n) warnings.push(`El orden de g es solo ${gOrder} (de ${p - 1n} posibles): el secreto vive en un subgrupo pequeño → pocas claves posibles. Usa un generador (orden p−1) o un primo seguro p=2q+1 con g de orden q`)

  const A = modpow(g, a, p)
  const B = modpow(g, b, p)
  const sharedAlice = modpow(A, b, p)
  const sharedBob = modpow(B, a, p)

  steps.push({ who: 'público', what: 'acordado', value: `p = ${p}, g = ${g}` })
  steps.push({ who: 'Alice', what: 'elige secreto a y envía A = g^a mod p', value: `a = ${a} → A = ${A}` })
  steps.push({ who: 'Bob', what: 'elige secreto b y envía B = g^b mod p', value: `b = ${b} → B = ${B}` })
  steps.push({ who: 'Alice', what: 'calcula s = B^a mod p', value: `s = ${sharedAlice}` })
  steps.push({ who: 'Bob', what: 'calcula s = A^b mod p', value: `s = ${sharedBob}` })

  const sharedMatch = sharedAlice === sharedBob
  if (!sharedMatch) errors.push('Error interno: los secretos compartidos no coinciden (módulo no primo?)')

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    steps,
    A,
    B,
    sharedAlice,
    sharedBob,
    sharedMatch,
    pBits: p.toString(2).length,
    gOrder,
    safePrimeNote:
      p.toString(2).length <= 12
        ? `Con p de ${p.toString(2).length} bits, un portátil factoriza p−1 y calcula los secretos en milisegundos. DH real usa p de 2048+ bits: exactamente la misma operación, con números inabarcables de invertir.`
        : 'Tamaño de módulo razonable para la demo.',
    mitmNote:
      'DH puro NO autentica: un MITM puede negociar un secreto con cada parte y retransmitir. Por eso la vida real firma los valores (TLS: DH efímero + certificado). Prueba mental: intercambia A y B «en nombre de» otros y verás que nada falla.',
  }
}

export const DH_PRESETS: { label: string; p: string; g: string; a: string; b: string }[] = [
  { label: 'Clásico didáctico (p=23, g=5)', p: '23', g: '5', a: '6', b: '15' },
  { label: 'Subgrupo pequeño (g de orden 5)', p: '23', g: '2', a: '3', b: '7' },
  { label: 'Primo mayor (p=1009, g=2)', p: '1009', g: '2', a: '77', b: '333' },
  { label: '32 bits (p = 2³¹−1, g de Lehmer)', p: '2147483647', g: '16807', a: '123456789', b: '987654321' },
]

/* ---------- 3. RSA textbook ---------- */

export interface RsaKeygen {
  ok: boolean
  errors: string[]
  n: bigint
  phi: bigint
  d: bigint | null
  bits: number
}

export function rsaKeygen(p: bigint, q: bigint, e: bigint): RsaKeygen {
  const errors: string[] = []
  if (p < 3n || q < 3n) errors.push('p y q deben ser primos ≥ 3')
  if (p === q) errors.push('p = q: n sería un cuadrado y la factorización trivial (además phi calcula mal)')
  if (!isPrime(p)) errors.push(`p = ${p} no es primo`)
  if (!isPrime(q)) errors.push(`q = ${q} no es primo`)
  const n = p * q
  const phi = (p - 1n) * (q - 1n)
  // e NO necesita ser < φ: d = e⁻¹ mod φ existe siempre que gcd(e, φ) = 1
  // (65537 con φ=3120 es el caso clásico: 65537 ≡ 17 mod 3120 → d = 2753)
  if (e < 3n) errors.push(`e = ${e} debe ser ≥ 3`)
  else if (egcd(e, phi).g !== 1n) errors.push(`gcd(e=${e}, φ=${phi}) ≠ 1: elige otro e (o primo 65537)`)
  const d = errors.length === 0 ? modInverse(e, phi) : null
  return { ok: errors.length === 0, errors, n, phi, d, bits: n.toString(2).length }
}

export interface RsaBlock {
  i: number
  char: string
  m: bigint
  c: bigint
  back: bigint
  ok: boolean
}

export interface RsaApplyResult {
  n: bigint
  exponent: bigint
  blocks: RsaBlock[]
  ciphertextNumbers: string
  errors: string[]
}

/** RSA por bloques de UN carácter (didáctico). m debe ser < n. */
export function rsaApply(text: string, n: bigint, e: bigint, d: bigint): RsaApplyResult {
  const errors: string[] = []
  const blocks: RsaBlock[] = []
  const chars = Array.from(text).slice(0, 64)
  chars.forEach((char, i) => {
    const m = BigInt(char.codePointAt(0)!)
    if (m >= n) {
      errors.push(`El carácter «${char}» (m=${m}) es ≥ n=${n}: RSA exige m < n. Usa primos más grandes`)
      return
    }
    const c = modpow(m, e, n)
    const back = modpow(c, d, n)
    blocks.push({ i, char, m, c, back, ok: back === m })
  })
  if (blocks.some((b) => !b.ok)) errors.push('Hay bloques que no vuelven al original: revisa d (debe ser e⁻¹ mod φ)')
  return {
    n,
    exponent: e,
    blocks,
    ciphertextNumbers: blocks.map((b) => b.c).join(' '),
    errors,
  }
}

export interface FactorAttack {
  found: boolean
  p?: bigint
  q?: bigint
  d?: bigint
  iterations: number
  note: string
}

/** Ataque real: factorizar n por división de prueba. Con n de 32 bits vuela;
 *  con 40 bits ya tarda; con 2048 bits, el calor del sol se apaga antes. */
export function rsaFactorAttack(n: bigint, maxIterations = 5_000_000): FactorAttack {
  if (n % 2n === 0n) {
    const q = n / 2n
    return { found: true, p: 2n, q, iterations: 1, note: 'n par: factor inmediato' }
  }
  let iterations = 0
  for (let i = 3n; i * i <= n; i += 2n) {
    iterations++
    if (iterations > maxIterations) break
    if (n % i === 0n) {
      const p = i
      const q = n / p
      const phi = (p - 1n) * (q - 1n)
      return { found: true, p, q, iterations: Number(iterations), note: `Factorizado en ${iterations} divisiones: con n de este tamaño, la clave privada d se recalcula al instante` }
    }
  }
  return {
    found: false,
    iterations: Number(iterations),
    note: `No factorizado tras ${iterations} divisiones. Duplicar el tamaño de n multiplica el esfuerzo: de esto vive RSA-2048`,
  }
}

/* ---------- 4. Lecciones ---------- */

export const PUBKEY_LESSONS: { title: string; lesson: string }[] = [
  { title: 'RSA textbook ≠ RSA real', lesson: 'El RSA de libro es determinista y maleable: el mismo mensaje cifra igual (¡se puede testear! una tabla de «e» conocidas), y multiplicar cifrados multiplica mensajes. La vida real añade padding OAEP aleatorizado.' },
  { title: 'DH autentica cero', lesson: 'El secreto compartido sale perfecto aunque haya un MITM fabricando A y B propios. TLS firma el handshake; Signal usa el X3DH con claves prepublicadas.' },
  { title: 'El tamaño SÍ es el mensaje', lesson: 'Con p de 8 bits hay 128 secretos posibles: pruébalos todos a mano. La seguridad de DH/RSA no está en la fórmula (pública) sino en la imposibilidad práctica de invertir la modular con n de 2048+ bits.' },
  { title: 'e = 65537 por una razón', lesson: 'Es primo de Fermat (2¹⁶+1): solo 2 bits a 1 → cifrado rápido y evita e pequeños que generan d diminutos vulnerables a Wiener.' },
  { title: 'Por qué 2048 bits', lesson: 'La factorización crece sub-exponencial (criba de números generales). 512 bits se rompió en 1999, 768 en 2009. 2048 es el mínimo hoy; 3072+ para datos a largo plazo.' },
]

export const PUBKEY_LIMITS: string[] = [
  'Todo aquí usa BigInt nativo: seguro y exacto, pero esta tool es didáctica — no generes claves de producción con primos de 8 bits 🙂',
  'Los bloques RSA son de 1 carácter para que veas la correspondencia: el RSA real cifra bloques con OAEP y cifrado simétrico por medio (hybrid).',
  'La factorización por división de prueba solo demuestra el ataque básico: GNFS (el algoritmo real) es mucho más rápido, y aun así 2048 bits resiste.',
  'El orden de g se calcula con límite de iteraciones: en módulos grandes la tool lo omite en vez de colgarse.',
]
