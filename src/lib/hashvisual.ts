/* Fingerprint visual de hashes — 100% local.
   Convierte cualquier hash (o texto, hasheándolo con SHA-256) en un identicon
   simétrico determinista: mismo hash → misma imagen, siempre. Para comparar
   certificados, binarios o claves de un vistazo sin leer 64 caracteres hex. */

/* PRNG determinista a partir de un string (xmur3 + mulberry32) */
const xmur3 = (str: string): (() => number) => {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

const mulberry32 = (seed: number): (() => number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Fingerprint {
  grid: boolean[][]          // [fila][columna] — espejada horizontal
  hue: number                // 0-359
  fg: string
  bg: string
  accent: string
  seedText: string
}

export const fingerprint = (hash: string, cells = 7): Fingerprint => {
  const seed = xmur3(hash.trim())()
  const rand = mulberry32(seed)
  const half = Math.ceil(cells / 2)
  const grid: boolean[][] = []
  for (let y = 0; y < cells; y++) {
    const row: boolean[] = []
    for (let x = 0; x < half; x++) row.push(rand() > 0.42)
    // espejo horizontal: la clave del "parece una mariposa" de los identicons
    for (let x = cells - half - (cells % 2 === 0 ? 0 : 1); x >= 0; x--) row.push(row[x])
    grid.push(row.slice(0, cells))
  }
  const hue = Math.floor(rand() * 360)
  return {
    grid,
    hue,
    fg: `hsl(${hue} 75% 62%)`,
    bg: `hsl(${hue} 30% 8%)`,
    accent: `hsl(${(hue + 140) % 360} 70% 55%)`,
    seedText: hash,
  }
}

/* ¿cuánto se parecen dos fingerprints? % de celdas iguales */
export const similarity = (a: Fingerprint, b: Fingerprint): number => {
  let same = 0
  let total = 0
  for (let y = 0; y < a.grid.length && y < b.grid.length; y++) {
    for (let x = 0; x < a.grid[y].length && x < b.grid[y].length; x++) {
      total++
      if (a.grid[y][x] === b.grid[y][x]) same++
    }
  }
  return total ? Math.round((same / total) * 100) : 0
}

export const sha256Hex = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/* ¿parece un hash? (heurística de display) */
export const looksLikeHash = (s: string): boolean => /^[a-fA-F0-9]{32,128}$/.test(s.trim())
