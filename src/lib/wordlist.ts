/* Generador de wordlists dirigidas (targeted): a partir de datos del
   objetivo (empresa, deportes, mascotas, meses...) genera mutaciones
   realistas — los patrones que la gente realmente usa al crear claves.
   Uso legítimo: auditorías con autorización expresa (tu propio entorno). */

export type MutOpt = 'leet' | 'upper' | 'lower' | 'capital' | 'reverse' | 'year2020-2026' | 'año-nacimiento' | 'sufijo-comunes' | 'dobles' | 'separadores'

export const MUTATION_INFO: Record<MutOpt, string> = {
  leet: 'a→4, e→3, i→1, o→0, s→5, t→7 (contraseñ4 → c0ntr4s3n4)',
  upper: 'todo mayúsculas',
  lower: 'todo minúsculas',
  capital: 'primera letra mayúscula',
  reverse: 'cadena invertida',
  'year2020-2026': 'añade años recientes 2020-2026 como sufijo',
  'año-nacimiento': 'añade 1960-2010 como sufijo (el clásico)',
  'sufijo-comunes': 'añade !, 123, 1234, #, 01, 2025…',
  dobles: 'duplica la palabra (gato gato)',
  separadores: 'combina palabras con _, -, . y sin nada',
}

const LEET_MAP: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7' }

function leet(w: string): string {
  return w.replace(/[aeiost]/g, (c) => LEET_MAP[c] ?? c)
}

function partialLeet(w: string): string {
  // solo 1-2 sustituciones: patrón muy humano
  const idxs = [...w.matchAll(/[aeiost]/g)].map((m) => m.index)
  if (!idxs.length) return w
  const n = Math.min(idxs.length, 1 + (idxs.length > 4 ? 1 : 0))
  const out = [...w]
  for (let i = 0; i < n; i++) {
    const idx = idxs[(i * 7919) % idxs.length] // determinista "aleatorio"
    out[idx] = LEET_MAP[out[idx].toLowerCase()] ?? out[idx]
  }
  return out.join('')
}

const COMMON_SUFFIX = ['', '!', '!!', '1', '12', '123', '1234', '12345', '#', '.', '01', '2024', '2025', '2026', '$', '*', '24', '2024!', '2025!']
const SEPS = ['', '_', '-', '.', '']

/** Expande una semilla en mutaciones. */
export function mutations(word: string, opts: MutOpt[]): string[] {
  const out = new Set<string>()
  const w = word.trim()
  if (!w) return []
  out.add(w)
  if (opts.includes('lower')) out.add(w.toLowerCase())
  if (opts.includes('upper')) out.add(w.toUpperCase())
  if (opts.includes('capital')) out.add(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  if (opts.includes('reverse')) out.add([...w].reverse().join(''))
  if (opts.includes('leet')) { out.add(leet(w)); out.add(partialLeet(w)) }
  if (opts.includes('dobles')) { out.add(w + w); out.add(`${w}${w}`.toLowerCase()) }

  const bases = [...out]
  if (opts.includes('sufijo-comunes')) for (const b of bases) for (const s of COMMON_SUFFIX) out.add(b + s)
  if (opts.includes('year2020-2026')) for (const b of bases) for (let y = 2020; y <= 2026; y++) { out.add(b + y); out.add(b + y + '!') }
  if (opts.includes('año-nacimiento')) for (const b of bases) for (let y = 1960; y <= 2010; y += 1) if (y % 3 === 0 || y % 7 === 0) out.add(b + y)

  return [...out]
}

/** Combina varias listas de palabras con separadores (patrón nombre+mascota). */
export function combineWordLists(lists: string[][], seps: string[] = SEPS): string[] {
  if (lists.length < 2) return []
  let acc = lists[0]
  for (let i = 1; i < lists.length; i++) {
    const next: string[] = []
    for (const a of acc) for (const b of lists[i]) for (const s of seps) next.push(s ? a + s + b : a + b)
    acc = next
    if (acc.length > 50000) acc = acc.slice(0, 50000) // límite de seguridad
  }
  return acc
}

export interface WordlistStats {
  total: number
  uniq: number
  preview: string[]
  sizeKb: number
  crackHint: string
}

export function wordlistStats(list: string[]): WordlistStats {
  const uniq = new Set(list).size
  const size = new Blob([list.join('\n')]).size / 1024
  const crackHint =
    uniq < 100 ? 'trivial: John/hashcat lo agota en segundos'
    : uniq < 5000 ? 'rápido en CPU, ideal para reglas Best64'
    : uniq < 100000 ? 'necesita GPU o reglas; aún muy viable'
    : 'solo con GPU y tiempo; considera reglas o máscaras'
  return { total: list.length, uniq, preview: list.slice(0, 30), sizeKb: Math.round(size * 10) / 10, crackHint }
}

export interface TargetFormData {
  company: string
  domain: string
  city: string
  employee: string
  pet: string
  hobby: string
  year: string
}

/** Genera la wordlist a partir del formulario de objetivo. */
export function buildTargetWordlist(f: TargetFormData, opts: MutOpt[]): { words: string[]; strategy: string[] } {
  const base: string[] = []
  const strategy: string[] = []
  const push = (w: string, why: string) => {
    const t = w.trim()
    if (t && !base.includes(t)) {
      base.push(t)
      if (why && !strategy.includes(why)) strategy.push(why)
    }
  }
  if (f.company) { push(f.company, 'nombre de la empresa'); push(f.company.toLowerCase().replace(/\s+/g, ''), 'empresa sin espacios'); push(f.company.replace(/\s+/g, ''), 'empresa camelcase') }
  if (f.domain) { push(f.domain.split('.')[0], 'primera parte del dominio') }
  if (f.city) push(f.city, 'ciudad')
  if (f.employee) push(f.employee, 'nombre de empleado')
  if (f.pet) push(f.pet, 'mascota')
  if (f.hobby) push(f.hobby, 'hobby')
  if (f.year) { push(f.year, 'año del objetivo'); }

  // combinaciones empresa+mascota, empleado+empresa, etc.
  const strong = [f.employee, f.pet, f.company.replace(/\s+/g, ''), f.city].filter(Boolean).map((s) => s.toLowerCase())
  const combos = strong.length >= 2 ? combineWordLists([strong.slice(0, 1), strong.slice(1)], ['', '_', '-']).slice(0, 3000) : []

  const mutated = new Set<string>()
  for (const w of base) for (const m of mutations(w, opts)) mutated.add(m)
  for (const c of combos) mutated.add(c)

  return { words: [...mutated].sort(), strategy }
}

export const WORDLIST_TIPS: string[] = [
  'Las contraseñas humanas se componen de: palabra conocida + año + símbolo. Esta tool explota exactamente ese patrón.',
  'Siempre lanza primero la wordlist dirigida y después rockyou.txt: es más rápido y menos ruidoso.',
  'En auditorías reales, combina con reglas de hashcat (Best64, dive) sobre TU wordlist generada.',
  'Sigue siendo abuso si lo usas sin permiso explícito del propietario del sistema. Audita solo lo tuyo o con contrato.',
]

export const WORDLIST_CHEATS: [string, string][] = [
  ['john --wordlist=dirigida.txt --rules=Best64 hashes.txt', 'wordlist + reglas automáticas'],
  ['hashcat -m 1000 -a 0 ntlm.txt dirigida.txt -r /usr/share/hashcat/rules/best64.rule', 'NTLM con reglas'],
  ['hashcat -m 1000 -a 6 ntlm.txt dirigida.txt ?d?d?d?d', 'wordlist + 4 dígitos al final (máscara híbrida)'],
  ['hashcat -m 1000 -a 3 ntlm.txt ?l?l?l?l?d?d?d?d', 'máscara pura 4 letras + 4 números'],
  ['crunch 8 12 abcdefg -o base.txt', 'generador de patrones por fuerza bruta (lento)'],
  ['cewl -d 2 https://objetivo.com -m 6 -w web.txt', 'extrae palabras del propio sitio del objetivo'],
]
