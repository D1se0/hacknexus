/* Utilidades puras de umask: números de modo vs máscara, cálculo y presets.
   umask no "da" permisos, los QUITA: modo_final = modo_base & ~umask */

export interface UmaskRow {
  base: string
  file: string
  dir: string
}

/** 0..0777 → "rwxrwxrwx" (el bit x se muestra tal cual; para ficheros normales el x vendrá a 0) */
export function modeToRwx(mode: number): string {
  const one = (m: number) => `${m & 4 ? 'r' : '-'}${m & 2 ? 'w' : '-'}${m & 1 ? 'x' : '-'}`
  return `${one((mode >> 6) & 7)}${one((mode >> 3) & 7)}${one(mode & 7)}`
}

/** umask → permisos resultantes para fichero (666 base) y directorio (777 base) */
export function umaskEffects(umask: number): { file: number; dir: number } {
  const clamp = (v: number) => Math.max(0, Math.min(0o777, v))
  const u = clamp(umask)
  return { file: 0o666 & ~u, dir: 0o777 & ~u }
}

export const octal = (n: number): string => n.toString(8).padStart(3, '0')

export const UMASK_PRESETS: { umask: number; label: string; desc: string }[] = [
  { umask: 0o022, label: '022', desc: 'clásico: dueño escribe, el resto solo lee (servidores)' },
  { umask: 0o027, label: '027', desc: 'el grupo lee, otros sin nada (buena para web apps)' },
  { umask: 0o077, label: '077', desc: 'privado total: solo el dueño (ssh, homes)' },
  { umask: 0o002, label: '002', desc: 'grupo escribe (desarrollo compartido, en grupos pequeños)' },
  { umask: 0o007, label: '007', desc: 'grupo escribe, otros nada (equipos cerrados)' },
  { umask: 0o013, label: '013', desc: 'raro pero visto: otros solo ejecutan directorios' },
]

/** tarjetas de referencia de cómo afecta cada dígito */
export const DIGIT_MEANING: { digit: string; file: string; dir: string }[] = [
  { digit: '0', file: 'rw-', dir: 'rwx' },
  { digit: '1', file: 'rw-', dir: 'rw-' },
  { digit: '2', file: 'r--', dir: 'r-x' },
  { digit: '3', file: 'r--', dir: 'r--' },
  { digit: '4', file: '-w-', dir: '-wx' },
  { digit: '5', file: '-w-', dir: '-w-' },
  { digit: '6', file: '---', dir: '--x' },
  { digit: '7', file: '---', dir: '---' },
]

/** nota de seguridad según la umask resultante */
export function umaskVerdict(umask: number): { tone: 'ok' | 'warn' | 'bad'; text: string } {
  const { file, dir } = umaskEffects(umask)
  if ((file & 0o006) || (dir & 0o002)) {
    return { tone: 'bad', text: 'otros tienen escritura (o directorios escribibles): cualquier usuario local puede plantar código. Úsalo solo en entornos de juguete.' }
  }
  if (file & 0o004) {
    return { tone: 'warn', text: 'los ficheros nuevos serán legibles por todos: cuidado con claves, .env y logs con datos personales.' }
  }
  return { tone: 'ok', text: 'restrictivo y sano: ni lectura para "otros". Combínalo con grupos bien asignados.' }
}
