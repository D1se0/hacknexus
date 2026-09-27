/* ReDOS Analyzer: detección de backtracking catastrófico — 100% local.
   Estático: patrones estructurales sospechosos (cuantificadores anidados,
   alternancias solapadas). Dinámico: el matching corre en un Web Worker
   contra entradas crecientes; si el tiempo se dispara exponencialmente,
   tu regex es un DoS esperando a ocurrir. */

export interface StaticFinding {
  severity: 'alta' | 'media' | 'baja'
  title: string
  detail: string
}

/* ───────── análisis estático ───────── */

const STATIC_PATTERNS: { re: RegExp; severity: StaticFinding['severity']; title: string; detail: string }[] = [
  {
    re: /\([^()]*[*+][^()]*\)\s*[*+{]/,
    severity: 'alta',
    title: 'Cuantificador dentro de cuantificador',
    detail: '(algo+)+ o (algo*)* fuerza que el motor explore C(n) particiones de la entrada: crecimiento exponencial clásico. Si el inner falla cerca del final, el backtracking se dispara.',
  },
  {
    re: /\(\s*\.\*\s*\)\s*[*+{]|\(\s*\\[wd].*\)\s*[*+{]/,
    severity: 'alta',
    title: 'Estrella/genérico cuantificado',
    detail: '(.*)+ genera ambigüedad total en cómo repartir la entrada: el motor prueba todas las particiones posibles.',
  },
  {
    re: /\(\s*[^()|]*\|[^()|]*\|\s*\)[*+{]/,
    severity: 'media',
    title: 'Alternancia repetida con ramas solapables',
    detail: '(a|a|ab)* puede consumir la misma entrada de varias maneras: cada forma es un camino de backtracking distinto. Si una rama es prefijo de otra, peor.',
  },
  {
    re: /\(\s*\.\*\s*\)[*+{]|\(\s*\\[wd].*\)[*+{]/,
    severity: 'alta',
    title: '.* cuantificado',
    detail: '(.*)* es el peor caso absoluto: cualquier cadena tiene formas exponenciales de repartirse.',
  },
  {
    re: /\+[*+?]|\*[*+?]|{\d+,\d*}[*+?]/,
    severity: 'media',
    title: 'Cuantificadores adyacentes',
    detail: 'a++ o a** son redundantes o inválidos según el sabor; en algunos motores explotan el backtracking sin necesidad.',
  },
  {
    re: /\((?:[^()]*\|)?[^()]*\)[{,]\d+(,\d*)?}[^]*[*+{]/,
    severity: 'baja',
    title: 'Repeticiones acotadas apiladas',
    detail: 'Grupos con {n,m} seguidos de más cuantificadores: el conteo de estados se multiplica. No siempre explota, pero vigila con la medición dinámica.',
  },
]

export const staticAnalysis = (pattern: string): StaticFinding[] => {
  const out: StaticFinding[] = []
  for (const p of STATIC_PATTERNS) {
    if (p.re.test(pattern)) out.push({ severity: p.severity, title: p.title, detail: p.detail })
  }
  if (/\b([a-zA-Z0-9_])\1+\|[^|]*\b\1+/.test(pattern)) {
    out.push({ severity: 'media', title: 'Ramas alternativas solapadas', detail: 'Dos ramas pueden casar lo mismo (ej: (a|ab)): el motor prueba las dos, multiplicando caminos de backtracking.' })
  }
  if (out.length === 0 && pattern.length > 0) {
    out.push({ severity: 'baja', title: 'Sin banderas estructurales', detail: 'Ningún patrón clásico de ReDoS en la estructura. No está exento: la medición dinámica es la que confirma o descarta.' })
  }
  return out
}

/* ───────── análisis dinámico (Worker) ───────── */

const WORKER_SRC = `
self.onmessage = (e) => {
  const { pattern, flags, unit, suffix, size, timeoutMs } = e.data
  try {
    const re = new RegExp(pattern, flags)
    const input = unit.repeat(size) + suffix
    const t0 = Date.now()
    re.test(input)
    const ms = Date.now() - t0
    self.postMessage({ ok: true, ms })
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message || err) })
  }
  // watchdog interno: si el matching cuelga, el main termina el worker
  setTimeout(() => { try { self.close() } catch {} }, timeoutMs)
}
`

export interface DynamicSample {
  size: number
  ms: number
  timedOut: boolean
}

export interface DynamicResult {
  samples: DynamicSample[]
  growth: 'exponencial' | 'polinómico' | 'lineal' | 'insuficiente' | 'error'
  verdict: string
  error?: string
}

export const runDynamic = async (
  pattern: string,
  opts: { flags?: string; unit?: string; suffix?: string; maxSize?: number; timeoutMs?: number } = {},
): Promise<DynamicResult> => {
  const flags = opts.flags ?? ''
  const unit = opts.unit ?? 'a'
  const suffix = opts.suffix ?? '!'
  const maxSize = opts.maxSize ?? 26 // 2^26 ≈ 67M chars de unidad — el test para antes
  const timeoutMs = opts.timeoutMs ?? 1500

  const sizes: number[] = []
  for (let n = 8; n <= maxSize; n += 3) sizes.push(2 ** n) // 256 … 2^26
  const samples: DynamicSample[] = []
  let error: string | undefined

  for (const size of sizes) {
    const ms = await new Promise<number | null>((resolve) => {
      const blob = new Blob([WORKER_SRC], { type: 'application/javascript' })
      const w = new Worker(URL.createObjectURL(blob))
      const killer = setTimeout(() => { try { w.terminate() } catch { /* noop */ } resolve(timeoutMs) }, timeoutMs + 350)
      w.onmessage = (e: MessageEvent) => {
        const d = e.data as { ok: boolean; ms?: number; error?: string }
        if (!d.ok && d.error) error = d.error
        clearTimeout(killer)
        try { w.terminate() } catch { /* noop */ }
        resolve(d.ok ? (d.ms ?? 0) : null)
      }
      w.postMessage({ pattern, flags, unit, suffix, size, timeoutMs })
    })
    if (ms === null) break // regex inválida: no sigas
    const timedOut = ms >= timeoutMs
    samples.push({ size, ms, timedOut })
    if (timedOut) break
    if (ms > 900) break // ya hay señal: no hagas esperar al usuario
  }

  // clasificación por crecimiento entre muestras consecutivas
  if (error) return { samples, growth: 'error', verdict: 'El motor rechazó el patrón: revisa la sintaxis.', error }
  if (samples.length < 3) {
    return { samples, growth: 'insuficiente', verdict: 'No hubo suficientes mediciones para clasificar (el test se cortó por timeout temprano). Eso ya es mala señal: un input de tamaño moderado congela el matching.' }
  }
  // ratio por duplicar (aquí cada paso multiplica por 8): tiempo total / tamaño
  const ratios: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const sizeRatio = samples[i].size / samples[i - 1].size
    const tRatio = samples[i].ms / Math.max(0.1, samples[i - 1].ms)
    ratios.push(tRatio / sizeRatio) // ~1 lineal; ~2^n exponencial; constante>1 polinómico
  }
  const exp = ratios.filter((r) => r > 1.6).length
  const poly = ratios.filter((r) => r > 1.15).length
  if (exp >= Math.max(2, ratios.length - 1)) {
    return { samples, growth: 'exponencial', verdict: 'CONFIRMADO: crecimiento exponencial. Este patrón es un DoS con inputs ~50-100 KB en un solo request. Refactoriza o acota con lookahead atómico/possessive.' }
  }
  if (poly >= ratios.length - 1) {
    return { samples, growth: 'polinómico', verdict: 'Riesgo medio: el tiempo crece más rápido que la entrada. Con entradas grandes (logs, uploads) puede congelar un worker. Límite de longitud en el input lo mitiga.' }
  }
  return { samples, growth: 'lineal', verdict: 'Sin señal de ReDoS en las medidas: el matching escala linealmente con la entrada. Aun así, valida siempre el tamaño máximo del input en el servidor.' }
}

/* patrones didácticos listos para disparar (y sus curas) */
export const DEMOS: { name: string; pattern: string; unit: string; suffix: string; fix: string }[] = [
  { name: 'Clásico (a+)+', pattern: '^(a+)+$', unit: 'a', suffix: '!', fix: '^(a+)!$ — sin cuantificador exterior el backtracking desaparece.' },
  { name: 'Validador de emails real', pattern: '^([a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*)+@dom\\.local$', unit: 'a', suffix: '!@dom.local', fix: '^([a-zA-Z0-9]+[._-]?)*[a-zA-Z0-9]+@dom\\.local$ — cuantificadores no solapados.' },
  { name: 'Alternancia solapada', pattern: '^(a|a)*$', unit: 'a', suffix: 'b', fix: '^(aa*)$ — una sola forma de casar cada longitud.' },
  { name: 'CSV con borde fallido', pattern: '^(\\w+,)*\\w+;$', unit: 'a,', suffix: 'b', fix: '^((\\w+),)*\\w+;$ termina en coma, no en punto y coma suelto: deshaz la ambigüedad.' },
]
