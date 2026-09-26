/* GTFOBins: lógica de la tool sobre la data completa (gtfobins-data.ts).
   Funciones, contextos, búsqueda, filtros y "matriz de exposición" de binarios. */

import { GTFOBINS } from './gtfobins-data'

export type GtfFunc =
  | 'shell' | 'command' | 'reverse-shell' | 'bind-shell'
  | 'file-write' | 'file-read' | 'upload' | 'download'
  | 'library-load' | 'privilege-escalation' | 'inherit'

export const FUNC_INFO: Record<GtfFunc, { label: string; icon: string; desc: string; mitre: string[]; tone: 'bad' | 'warn' | 'info' }> = {
  shell: { label: 'Shell', icon: '🐚', desc: 'spawna una shell interactiva del sistema', mitre: ['T1059'], tone: 'bad' },
  command: { label: 'Comando', icon: '⚡', desc: 'ejecuta comandos del sistema (no interactivos)', mitre: ['T1059'], tone: 'bad' },
  'reverse-shell': { label: 'Reverse shell', icon: '↩️', desc: 'manda una shell de vuelta al atacante', mitre: ['T1059', 'T1071'], tone: 'bad' },
  'bind-shell': { label: 'Bind shell', icon: '🔌', desc: 'ata una shell a un puerto a la espera', mitre: ['T1059', 'T1071'], tone: 'bad' },
  'file-write': { label: 'Escritura', icon: '✍️', desc: 'escribe datos en ficheros locales', mitre: ['T1565'], tone: 'warn' },
  'file-read': { label: 'Lectura', icon: '📖', desc: 'lee ficheros locales (ej. /etc/shadow)', mitre: ['T1005'], tone: 'warn' },
  upload: { label: 'Subida', icon: '⬆️', desc: 'sube datos locales hacia el atacante', mitre: ['T1041'], tone: 'warn' },
  download: { label: 'Descarga', icon: '⬇️', desc: 'descarga datos remotos al objetivo', mitre: ['T1105'], tone: 'warn' },
  'library-load': { label: 'Carga de librería', icon: '🧩', desc: 'carga librerías compartidas → código arbitrario', mitre: ['T1574'], tone: 'bad' },
  'privilege-escalation': { label: 'Escalada', icon: '🧗', desc: 'habilita privilegios indirectamente (SUID, chown…)', mitre: ['T1548'], tone: 'bad' },
  inherit: { label: 'Hereda', icon: '🔗', desc: 'reutiliza funciones de otro binario', mitre: [], tone: 'info' },
}

export const CTX_INFO: { id: 'sudo' | 'suid' | 'capabilities'; label: string; desc: string }[] = [
  { id: 'sudo', label: 'sudo', desc: 'funciona si el binario está en sudoers (sudo -l para descubrirlo)' },
  { id: 'suid', label: 'SUID', desc: 'funciona si el binario tiene el bit SUID y dueño root (find / -perm -4000)' },
  { id: 'capabilities', label: 'Capabilities', desc: 'funciona con capabilities asignadas (getcap -r / 2>/dev/null)' },
]

export interface GtfSearch {
  q: string
  funcs: GtfFunc[]
  ctx: 'cualquiera' | 'sudo' | 'suid' | 'capabilities'
}

export interface GtfResult {
  name: string
  bin: (typeof GTFOBINS)[string]
  funcs: GtfFunc[]
  ctx: ('sudo' | 'suid' | 'capabilities')[]
}

export function searchGtfobins(s: GtfSearch): GtfResult[] {
  const qn = s.q.trim().toLowerCase()
  const out: GtfResult[] = []
  for (const [name, bin] of Object.entries(GTFOBINS)) {
    const funcs = Object.keys(bin.functions) as GtfFunc[]
    if (qn && !name.includes(qn)) continue
    if (s.funcs.length && !s.funcs.some((f) => funcs.includes(f))) continue
    const ctx = CTX_INFO.map((c) => c.id).filter((c) =>
      Object.values(bin.functions).some((entries) => entries.some((e) => e.contexts[c] !== undefined && e.contexts[c] !== null)),
    )
    if (s.ctx !== 'cualquiera' && !ctx.includes(s.ctx)) continue
    out.push({ name, bin, funcs, ctx })
  }
  return out
}

/** ¿Es explotable y por dónde? resumen para la ficha de un binario. */
export function gtfobinVerdict(name: string): { found: boolean; summary: string; risk: 'crítico' | 'alto' | 'medio' | 'nulo' } | null {
  const bin = GTFOBINS[name]
  if (!bin) return null
  const funcs = Object.keys(bin.functions) as GtfFunc[]
  const rce = funcs.some((f) => ['shell', 'command', 'reverse-shell', 'bind-shell', 'library-load', 'privilege-escalation'].includes(f))
  const file = funcs.some((f) => ['file-read', 'file-write', 'upload', 'download'].includes(f))
  const sudoOrSuid = Object.values(bin.functions).some((es) => es.some((e) => e.contexts.sudo !== null && e.contexts.sudo !== undefined || e.contexts.suid !== null && e.contexts.suid !== undefined))
  const risk = rce ? 'crítico' : file ? 'alto' : funcs.length ? 'medio' : 'nulo'
  const summary = rce
    ? `EXPLotal para ejecutar código${sudoOrSuid ? ' — y está marcado para sudo/SUID: revisa sudo -l y find -perm -4000' : ''}`
    : file
      ? 'Útil para leer/escribir ficheros (credenciales, authorized_keys, exfil) pero no ejecuta código directamente'
      : funcs.length ? 'Funciones limitadas: revisa los casos concretos abajo' : 'Sin funciones documentadas'
  return { found: true, summary, risk }
}

export const GTFO_STATS = (() => {
  const keys = Object.keys(GTFOBINS)
  const byFunc: Record<string, number> = {}
  let sudo = 0, suid = 0, caps = 0
  for (const bin of Object.values(GTFOBINS)) {
    for (const [f, entries] of Object.entries(bin.functions)) {
      byFunc[f] = (byFunc[f] ?? 0) + 1
      if (entries.some((e) => e.contexts.sudo !== null && e.contexts.sudo !== undefined)) sudo++
      if (entries.some((e) => e.contexts.suid !== null && e.contexts.suid !== undefined)) suid++
      if (entries.some((e) => e.contexts.capabilities !== null && e.contexts.capabilities !== undefined)) caps++
    }
  }
  return { total: keys.length, byFunc, sudo, suid, caps }
})()

export const GTFO_NOTES: string[] = [
  'Data completa de gtfobins.github.io (MIT): 458 binarios con TODOS sus comandos y contextos, embebida en la app.',
  'GTFOBins solo cubre binarios UNIX: el equivalente para Windows es LOLBAS (lolbas-project.github.io).',
  'El contexto lo es TODO: un binario inofensivo se vuelve crítico con sudo NOPASSWD, SUID o capabilities.',
  'Defensa: audita sudoers (GTFOBins rule), elimina SUID innecesarios y usa NOEXEC/NOSETUID en montajes.',
  'Si tu binario no está aquí, comprueba GTFOBins de nuevo tras updates: el catálogo crece constantemente.',
]

export const GTFO_METHOD: [string, string][] = [
  ['1. Enumera', 'sudo -l · find / -perm -4000 2>/dev/null · getcap -r / 2>/dev/null'],
  ['2. Consulta', 'busca cada binario aquí: ¿tiene shell/command? ¿en qué contexto?'],
  ['3. Ajusta', 'los contextos SUID a veces requieren -p en la shell (bash -p, sh -p): la data lo indica'],
  ['4. Ejecuta', 'solo en sistemas autorizados: es privesc, no curiosidad'],
  ['5. Reporta', 'documenta binario + contexto + impacto: la mitigación suele ser quitar el permiso'],
]
