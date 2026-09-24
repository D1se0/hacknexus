/* Calculadora CVSS 3.1 (Base) según la especificación de FIRST */

export type AV = 'N' | 'A' | 'L' | 'P'
export type AC = 'L' | 'H'
export type PR = 'N' | 'L' | 'H'
export type UI = 'N' | 'R'
export type S = 'U' | 'C'
export type CIA = 'H' | 'L' | 'N'

export interface CvssBase {
  av: AV
  ac: AC
  pr: PR
  ui: UI
  s: S
  c: CIA
  i: CIA
  a: CIA
}

export const DEFAULT_BASE: CvssBase = { av: 'N', ac: 'L', pr: 'N', ui: 'N', s: 'U', c: 'H', i: 'H', a: 'H' }

export const W = {
  av: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  ac: { L: 0.77, H: 0.44 },
  prU: { N: 0.85, L: 0.68, H: 0.86 },
  prC: { N: 0.85, L: 0.5, H: 0.25 },
  ui: { N: 0.85, R: 0.62 },
  cia: { H: 0.56, L: 0.22, N: 0 },
} as const

const roundup = (v: number): number => {
  const int = Math.round(v * 100000)
  return int % 10000 === 0 ? int / 100000 : (Math.floor(int / 10000) + 1) / 10
}

export function cvssVector(b: CvssBase): string {
  return `CVSS:3.1/AV:${b.av}/AC:${b.ac}/PR:${b.pr}/UI:${b.ui}/S:${b.s}/C:${b.c}/I:${b.i}/A:${b.a}`
}

export function cvssScore(b: CvssBase): number {
  const issc = 1 - (1 - W.cia[b.c]) * (1 - W.cia[b.i]) * (1 - W.cia[b.a])
  const impact = b.s === 'U' ? 6.42 * issc : 7.52 * (issc - 0.029) - 3.25 * (issc - 0.02) ** 15
  const prTable = b.s === 'C' ? W.prC : W.prU
  const exploitability = 8.22 * W.av[b.av] * W.ac[b.ac] * prTable[b.pr] * W.ui[b.ui]
  if (impact <= 0) return 0
  const raw = b.s === 'U' ? Math.min(impact + exploitability, 10) : Math.min(1.08 * (impact + exploitability), 10)
  return roundup(raw)
}

export type Severity = 'Ninguno' | 'Bajo' | 'Medio' | 'Alto' | 'Crítico'

export function cvssSeverity(score: number): Severity {
  if (score === 0) return 'Ninguno'
  if (score < 4) return 'Bajo'
  if (score < 7) return 'Medio'
  if (score < 9) return 'Alto'
  return 'Crítico'
}

export const severityTone = (sev: Severity): 'ok' | 'warn' | 'bad' | 'info' | 'neutral' => {
  switch (sev) {
    case 'Crítico':
    case 'Alto':
      return 'bad'
    case 'Medio':
      return 'warn'
    case 'Bajo':
      return 'info'
    default:
      return 'ok'
  }
}

export function parseVector(v: string): CvssBase | null {
  if (!v.trim().toUpperCase().startsWith('CVSS:3.1')) return null
  const m: Record<string, string> = {}
  for (const part of v.trim().split('/').slice(1)) {
    const [k, val] = part.split(':')
    if (k && val) m[k] = val
  }
  if (!m.AV || !m.AC || !m.PR || !m.UI || !m.S || !m.C || !m.I || !m.A) return null
  return { av: m.AV as AV, ac: m.AC as AC, pr: m.PR as PR, ui: m.UI as UI, s: m.S as S, c: m.C as CIA, i: m.I as CIA, a: m.A as CIA }
}
