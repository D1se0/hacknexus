/* ── Steganalysis: Bit-Planes & Chi² · Ronda 18 ───────────────────────────
   El LSB de una imagen cuenta historias: si alguien escribió en él, los
   pares de valores (2v, 2v+1) se EQUILIBRAN y la correlación entre píxeles
   vecinos desaparece. Ataque clásico de chi-cuadrado (Westfeld & Pfitzmann
   1999) con P-value real vía gamma incompleta, visor de los 8 planos de
   bits por canal y estadística LSB — todo local. */

export type Channel = 'r' | 'g' | 'b'

export const CHANNELS: { id: Channel; name: string }[] = [
  { id: 'r', name: 'Rojo' },
  { id: 'g', name: 'Verde' },
  { id: 'b', name: 'Azul' },
]

/* ---------- 1. Visor de planos de bits ---------- */

export interface PlaneResult {
  /** RGBA opaco del plano de bits para pintar en canvas. */
  rgba: Uint8ClampedArray
  /** Fracción de bits encendidos (0..1): los planos LSB stego→≈0.5. */
  density: number
  /** Bits que cambian respecto al píxel de la izquierda (0..1): natural→bajo, LSB estego→≈0.5. */
  flipRate: number
}

function channelIndex(c: Channel): number {
  return c === 'r' ? 0 : c === 'g' ? 1 : 2
}

/** Extrae el plano de bits `plane` (0=LSB) del canal dado. */
export function bitPlane(data: Uint8ClampedArray, w: number, h: number, channel: Channel, plane: number): PlaneResult {
  const ci = channelIndex(channel)
  const rgba = new Uint8ClampedArray(w * h * 4)
  let ones = 0
  let flips = 0
  let compares = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const bit = (data[i + ci] >> plane) & 1
      ones += bit
      rgba[i] = bit ? 255 : 0
      rgba[i + 1] = bit ? 255 : 0
      rgba[i + 2] = bit ? 255 : 0
      rgba[i + 3] = 255
      if (x > 0) {
        const prev = (data[i - 4 + ci] >> plane) & 1
        flips += bit !== prev ? 1 : 0
        compares++
      }
    }
  }
  return { rgba, density: ones / (w * h), flipRate: compares > 0 ? flips / compares : 0 }
}

/* ---------- 2. Gamma incompleta (P-value del chi²) ---------- */

/** Q(a, x) = Γ(a, x)/Γ(a) — gamma incompleta regularizada superior (Numerical Recipes). */
export function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN
  if (x === 0) return 1
  if (x < a + 1) {
    // Serie para P(a,x); devolvemos 1 - P
    let sum = 1 / a
    let term = sum
    for (let n = 1; n < 500; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break
    }
    const p = sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
    return 1 - Math.min(1, Math.max(0, p))
  }
  // Fracción continua para Q(a,x)
  const FPMIN = 1e-300
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i <= 500; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return Math.min(1, Math.max(0, Math.exp(-x + a * Math.log(x) - logGamma(a)) * h))
}

function logGamma(x: number): number {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) {
    y += 1
    ser += cof[j] / y
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x)
}

/** P-value de que una suma chi² con df grados de libertad sea superada por azar. */
export function chiSqPValue(chi2: number, df: number): number {
  if (df <= 0) return NaN
  return gammaQ(df / 2, chi2 / 2)
}

/* ---------- 3. Ataque chi-cuadrado (Westfeld & Pfitzmann) ---------- */

export interface ChiPoint {
  /** Fracción de la imagen analizada (0..1, de arriba a abajo). */
  fraction: number
  chi2: number
  pValue: number
}

export interface ChiAttackResult {
  points: ChiPoint[]
  /** Promedio de P en la mitad superior (zona de cabecera, donde suele empezar el embed). */
  avgPFirstHalf: number
  verdict: 'con esteganografía LSB probable' | 'sin evidencia de LSB' | 'datos insuficientes'
}

/**
 * Ataque de pares de valores (PoV): si el canal lleva LSB estego, cada par
 * (2v, 2v+1) tiende a contarse por igual. χ² compara observadas vs esperadas
 * por bloques de 128 valores de luminancia del canal.
 */
export function chiSquareAttack(data: Uint8ClampedArray, channel: Channel, slices = 32): ChiAttackResult {
  const ci = channelIndex(channel)
  const total = (data.length / 4) | 0
  const perSlice = Math.floor(total / slices)
  const points: ChiPoint[] = []

  // Recorremos en el orden de inserción típico: índice de píxel secuencial
  const counts = new Uint32Array(256)
  let filled = 0
  for (let i = 0; i < total; i++) {
    counts[data[i * 4 + ci]]++
    // al completar un slice, evaluar acumulado
    if ((i + 1) % perSlice === 0 && filled + 1 <= slices) {
      filled++
      let chi2 = 0
      let df = 0
    for (let v = 0; v < 128; v++) {
      const expected = (counts[2 * v] + counts[2 * v + 1]) / 2
      if (expected === 0) continue
      const d1 = counts[2 * v] - expected
      const d2 = counts[2 * v + 1] - expected
      chi2 += (d1 * d1 + d2 * d2) / expected
      df++
    }
      points.push({ fraction: (i + 1) / total, chi2, pValue: chiSqPValue(chi2, df) })
    }
  }

  const half = points.slice(0, Math.max(1, Math.floor(points.length / 2)))
  const avgPFirstHalf = half.reduce((a, p) => a + p.pValue, 0) / Math.max(1, half.length)
  // Con estego perfecto E[P]=0.5 (uniforme): el umbral práctico es 0.35
  const verdict: ChiAttackResult['verdict'] = total < 4096 ? 'datos insuficientes' : avgPFirstHalf > 0.35 ? 'con esteganografía LSB probable' : 'sin evidencia de LSB'
  return { points, avgPFirstHalf, verdict }
}

/* ---------- 4. Estadística LSB global ---------- */

export interface LsbStats {
  /** Por canal: densidad de unos en el plano 0 y flip-rate horizontal. */
  perChannel: Record<Channel, { density: number; flipRate: number }>
  /** Correlación entre LSBs de píxeles adyacentes (Pearson): natural → alta. */
  neighborCorrelation: number
}

export function lsbStats(data: Uint8ClampedArray, w: number): LsbStats {
  const ones = [0, 0, 0]
  const flips = [0, 0, 0]
  let pairs = 0
  let totalPx = 0
  for (let i = 0; i < data.length; i += 4) {
    ones[0] += data[i] & 1
    ones[1] += data[i + 1] & 1
    ones[2] += data[i + 2] & 1
    totalPx++
  }
  // correlación de Pearson entre LSBs de píxeles vecinos horizontales (por canal)
  let sx = 0
  let sy = 0
  let sxx = 0
  let syy = 0
  let sxy = 0
  let n = 0
  const height = Math.floor(data.length / 4 / w)
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < w; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const a = data[i - 4 + c] & 1
        const b = data[i + c] & 1
        sx += a
        sy += b
        sxx += a * a
        syy += b * b
        sxy += a * b
        n++
      }
      pairs++
      flips[0] += (data[i] & 1) !== (data[i - 4] & 1) ? 1 : 0
      flips[1] += (data[i + 1] & 1) !== (data[i - 3] & 1) ? 1 : 0
      flips[2] += (data[i + 2] & 1) !== (data[i - 2] & 1) ? 1 : 0
    }
  }
  const cov = sxy / n - (sx / n) * (sy / n)
  const vx = sxx / n - (sx / n) ** 2
  const vy = syy / n - (sy / n) ** 2
  const neighborCorrelation = vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0
  const perChannel = {
    r: { density: ones[0] / totalPx, flipRate: pairs > 0 ? flips[0] / pairs : 0 },
    g: { density: ones[1] / totalPx, flipRate: pairs > 0 ? flips[1] / pairs : 0 },
    b: { density: ones[2] / totalPx, flipRate: pairs > 0 ? flips[2] / pairs : 0 },
  }
  return { perChannel, neighborCorrelation }
}

/* ---------- 5. Catálogo ---------- */

export const STEGO_LIMITS: string[] = [
  'El ataque chi² detecta LSB SECUENCIAL sobre pares de valores: estego adaptativa (HUGO, WOW, S-UNIWARD) o spread-spectrum lo esquivan por diseño.',
  'El visor de planos muestra el canal que elijas de una imagen RGB; el estego en el canal alfa o en coeficientes DCT (JPEG) no aparece aquí.',
  'La ausencia de evidencia no es prueba de limpieza: la esteganografía bien hecha es indistinguible estadísticamente del ruido de cámara.',
  'Para JPEG real usa herramientas dedicadas (stegdetect, StegExpose) contra DCT: aquí trabajamos sobre píxeles crudos (PNG/BMP decodificados).',
]

export const STEGO_LESSONS: { title: string; lesson: string }[] = [
  { title: 'El equilibrio delata', lesson: 'La cámara genera imágenes donde el par (2v, 2v+1) NUNCA está balanceado (correlación natural). El LSB embedding obliga al equilibrio: chi² mide exactamente esa desviación con P-values por bloques.' },
  { title: 'Los planos de bits son un röntgen', lesson: 'Los planos 0-2 de una foto natural tienen textura de ruido SUAVE; cuando aparecen logos, texto o bloques perfectos, alguien escribió datos: los bit-planes muestran la estructura del embedding como una radiografía.' },
  { title: 'Capacidad vs indetectabilidad', lesson: 'LSB secuencial aguanta ~1 bit/píxel antes de ser trivialmente detectable; el estado del arte (S-UNIWARD) baja a 0.3-0.5 bits para sobrevivir a detectores de redes neuronales. Todo embedding es un pacto con la detección.' },
  { title: 'El canal alfa y los metadatos', lesson: 'PNG con canal alfa, paletas indexadas y chunks auxiliares (tEXt, zTXt) son escondites clásicos: antes del análisis estadístico, un exiftool ya revela la mitad de los casos.' },
  { title: 'Defensa operativa', lesson: 'Re-compresión al recibir imágenes externas (cualquier reescalado destruye LSB), scrubbing de metadatos y DLP con estego-detection en los canales de salida: la recompresión es la defensa gratuita y definitiva contra LSB.' },
]
