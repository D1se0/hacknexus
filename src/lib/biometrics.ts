/* ── Biometrics · Ronda 19 ────────────────────────────────────────────────
   Biometría conductual del teclado: cada pulsación trae dos huellas
   temporales — dwell (cuánto dura la tecla pulsada) y flight (el vuelo
   entre soltar una tecla y pulsar la siguiente). Con esos pares se
   construye un perfil estadístico y se detecta cuándo alguien «no escribe
   como el dueño de la cuenta»: el MFA conductual detrás de los bancos
   online y los antifraudes web. 100% local. */

export interface KeyEvent {
  /** tecla normalizada (mayúsculas/minúsculas colapsan a la misma) */
  key: string
  /** performance.now() del keydown */
  down: number
  /** performance.now() del keyup (undefined si la tecla sigue pulsada) */
  up?: number
}

/* ---------- 1. Métricas primarias ---------- */

/** Duración de la pulsación en ms; null si no hay keyup registrado. */
export function dwellTime(ev: KeyEvent): number | null {
  return typeof ev.up === 'number' ? ev.up - ev.down : null
}

/** Flight time entre dos eventos consecutivos: soltar la anterior → pulsar la siguiente. */
export function flightTime(a: KeyEvent, b: KeyEvent): number | null {
  if (typeof a.up !== 'number') return null
  return b.down - a.up
}

/** ¿Es una tecla de carácter imprimible ASCII? (descarta Shift/Enter/Backspace…) */
export function isCharacterKey(key: string): boolean {
  return key.length === 1 && key >= '!' && key <= '~'
}

/* ---------- 2. Agregación estadística ---------- */

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

export function stddev(xs: number[]): number {
  if (xs.length === 0) return 0
  const m = mean(xs)
  const variance = mean(xs.map((x) => (x - m) ** 2))
  return Math.sqrt(variance)
}

export interface KeyProfile {
  key: string
  n: number
  dwellMean: number
  dwellSd: number
}

export interface PairProfile {
  pair: string
  n: number
  flightMean: number
  flightSd: number
  rhythm: 'metrónomo' | 'natural'
}

export interface KeystrokeProfile {
  events: number
  validDwells: number
  validFlights: number
  wpm: number
  keyProfiles: KeyProfile[] // ordenado por n desc, top 15
  pairProfiles: PairProfile[] // top 12 por n desc
  flightMean: number
  flightSd: number
  dwellMean: number
  dwellSd: number
  /** 0..100: 100 = metrónomo perfecto (sospechoso), <40 = ritmo humano */
  rhythmScore: number
  /** 0..100: 100 = definitivamente bot */
  botScore: number
  verdict: 'human' | 'suspect' | 'bot' | 'insufficient'
}

/** Analiza una sesión completa: perfiles por tecla, por par y veredicto bot/humano. */
export function analyzeSession(events: KeyEvent[], typingStartTime?: number): KeystrokeProfile {
  const chars = events.filter((e) => isCharacterKey(e.key))

  const dwells: number[] = []
  for (const e of chars) {
    const d = dwellTime(e)
    if (d !== null && d > 0) dwells.push(d)
  }

  const pairMap = new Map<string, number[]>()
  const flights: number[] = []
  for (let i = 1; i < chars.length; i++) {
    const f = flightTime(chars[i - 1]!, chars[i]!)
    if (f !== null && f >= 0 && f < 5000) {
      flights.push(f)
      const pair = chars[i - 1]!.key + chars[i]!.key
      const arr = pairMap.get(pair)
      if (arr) arr.push(f)
      else pairMap.set(pair, [f])
    }
  }

  // pares con al menos 2 ejemplos (menos no tienen sentido estadístico)
  const pairProfiles: PairProfile[] = Array.from(pairMap.entries())
    .filter(([, v]) => v.length >= 2)
    .map(([pair, v]) => ({
      pair,
      n: v.length,
      flightMean: Math.round(mean(v)),
      flightSd: Math.round(stddev(v)),
      rhythm: (v.length >= 3 && stddev(v) < mean(v) * 0.25 ? 'metrónomo' : 'natural') as PairProfile['rhythm'],
    }))
    .sort((a, b) => b.n - a.n)

  const flightMean = mean(flights)
  const flightSd = stddev(flights)

  // Coeficiente de variación: humano natural 0.3–0.8; bot 0–0.05.
  const cv = flightMean > 0 ? flightSd / flightMean : 0

  // WPM: 5 caracteres = 1 palabra, del primer keydown al último keyup.
  let wpm = 0
  if (chars.length >= 2) {
    const t0 = typingStartTime ?? chars[0]!.down
    const ups = chars.filter((e) => typeof e.up === 'number').map((e) => e.up!)
    if (ups.length > 0) {
      const minutes = (Math.max(...ups) - t0) / 60000
      if (minutes > 0) wpm = chars.length / 5 / minutes
    }
  }

  // Bot si: CV ultrabajo (metrónomo), flight imposible (<30 ms entre teclas)
  // o dwell con variación nula.
  const dwellSd = stddev(dwells)
  let botScore = 0
  if (flights.length >= 10) {
    if (cv < 0.06) botScore += 45
    else if (cv < 0.15) botScore += 15
    if (flightMean < 30) botScore += 40
    else if (flightMean < 60) botScore += 12
    if (dwellSd < 4 && dwells.length >= 10) botScore += 25
  }
  botScore = Math.min(100, botScore)

  const rhythmScore = Math.round(Math.max(0, (1 - Math.min(1, cv / 0.8)) * 100))

  let verdict: KeystrokeProfile['verdict'] = 'insufficient'
  if (flights.length >= 10) {
    verdict = botScore >= 57 ? 'bot' : botScore >= 25 ? 'suspect' : 'human'
  }

  // perfil por tecla
  const keyMap = new Map<string, number[]>()
  for (const e of chars) {
    const d = dwellTime(e)
    if (d === null || d <= 0) continue
    const arr = keyMap.get(e.key)
    if (arr) arr.push(d)
    else keyMap.set(e.key, [d])
  }
  const keyProfiles: KeyProfile[] = Array.from(keyMap.entries())
    .map(([key, v]) => ({ key, n: v.length, dwellMean: Math.round(mean(v)), dwellSd: Math.round(stddev(v)) }))
    .sort((a, b) => b.n - a.n)

  return {
    events: events.length,
    validDwells: dwells.length,
    validFlights: flights.length,
    flightMean: Math.round(flightMean),
    flightSd: Math.round(flightSd),
    dwellMean: Math.round(mean(dwells)),
    dwellSd: Math.round(dwellSd),
    wpm: Math.round(wpm),
    keyProfiles: keyProfiles.slice(0, 15),
    pairProfiles: pairProfiles.slice(0, 12),
    rhythmScore,
    botScore,
    verdict,
  }
}

/* ---------- 3. Distancia entre perfiles (verificación contra plantilla) ---------- */

/** Distancia euclídea normalizada entre dos vectores de flight-times (pares comunes). */
export function profileDistance(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 5) return null // no comparable
  let sum = 0
  for (let i = 0; i < n; i++) {
    const scale = Math.max(1, Math.abs(a[i]!), Math.abs(b[i]!))
    sum += ((a[i]! - b[i]!) / scale) ** 2
  }
  return Math.sqrt(sum / n)
}

/** ¿Pasa la verificación? Umbral típico: distancia < 0.35 = misma persona. */
export function verifyAgainstTemplate(sample: number[], template: number[], threshold = 0.35): { pass: boolean; distance: number | null; reason: string } {
  const d = profileDistance(sample, template)
  if (d === null) return { pass: false, distance: null, reason: 'Muestra demasiado corta para comparar (mín 5 pares comunes)' }
  return {
    pass: d < threshold,
    distance: d,
    reason: d < threshold ? 'El ritmo coincide con la plantilla' : 'El ritmo NO coincide con la plantilla',
  }
}

/* ---------- 4. Generadores sintéticos (demo sin teclear) ---------- */

/** Genera una sesión HUMANA simulada: tiempos con variabilidad natural (log-normal-ish). */
export function simulateHuman(text: string, seed = 42): KeyEvent[] {
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const events: KeyEvent[] = []
  let t = 1000
  let prevUp: number | null = null
  for (const ch of text) {
    if (!isCharacterKey(ch)) continue
    const flight = 90 + rand() * 180 + (ch === ' ' ? 40 : 0) // pausa extra en espacios
    t += prevUp === null ? 0 : flight
    const dwell = 55 + rand() * 70
    const down = t
    const up = t + dwell
    events.push({ key: ch, down, up })
    t = up
    prevUp = up
  }
  return events
}

/** Genera una sesión BOT: intervalos perfectamente constantes. */
export function simulateBot(text: string, intervalMs = 50): KeyEvent[] {
  const events: KeyEvent[] = []
  let t = 1000
  for (const ch of text) {
    if (!isCharacterKey(ch)) continue
    const down = t
    const up = t + intervalMs / 2 // dwell exactamente la mitad
    events.push({ key: ch, down, up })
    t = up + intervalMs / 2 // flight exactamente la otra mitad
  }
  return events
}

/* ---------- 5. Catálogo didáctico ---------- */

export const BIOMETRICS_LIMITS: string[] = [
  'El teclado del navegador no distingue dedos: las métricas de teclado físico (izq/der Shift, inter-key por dedo) no están disponibles y los modelos reales las usan.',
  'Una sesión corta (< 10 pares) no permite veredicto: la biometría conductual necesita datos, igual que cualquier modelo.',
  'El estado emocional, la fatiga, un teclado nuevo o escribir con una mano cambian el patrón: los sistemas reales reentrenan la plantilla continuamente.',
  'Un atacante con el logger adecuado podría grabar tu patrón y replicarlo: como toda biometría, el «qué escribes» (contraseña) sigue siendo más importante que el «cómo».',
]

export const BIOMETRICS_LESSONS: { title: string; lesson: string }[] = [
  { title: 'Dwell y flight: la firma invisible', lesson: 'El dwell (presión) y el flight (vuelo entre teclas) forman un vector de decenas de dimensiones que ni imitando la velocidad se replica: los sistemas reales usan 20-50 características por autenticación.' },
  { title: 'El MFA que no molesta', lesson: 'La biometría conductual es autenticación continua: no pregunta nada, solo observa. Por eso los bancos detectan que «te robaron la sesión» a los 30 segundos aunque el atacante tenga tu contraseña.' },
  { title: 'Los bots no improvisan', lesson: 'Un script repite intervalos con variación < 5%: un humano jamás. El coeficiente de variación del flight-time es el detector de bots más barato que existe y bloquea credential stuffing masivo.' },
  { title: 'Free-text vs fixed-text', lesson: 'Medir la palabra «expresamente» siempre igual (fixed-text, como los primeros sistemas) es débil: los modernos analizan texto libre y normalizan por digrafos, porque el ritmo depende del par de teclas, no de la persona.' },
  { title: 'Privacidad por diseño', lesson: 'Estos datos son biometría: en la UE son categoría especial del GDPR art. 9. Todo el análisis aquí ocurre en tu navegador — nunca envíes keystroke dynamics a un servidor sin consentimiento explícito y cifrado.' },
]
