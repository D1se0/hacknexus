/* Generador de sudoers: construye la línea correcta y avisos de seguridad.
   Referencia: man sudoers(5). Alias y wildcards se soportan conceptualmente. */

export interface SudoersOpts {
  user: string
  host: string
  runas: string // "root" o "usuario:grupo"
  command: string
  nopasswd: boolean
  setenv: boolean
  noexec: boolean
  logOutput: boolean
}

const SHELL_META = /[;&|`$><'"\\n]/

export function buildSudoersLine(o: SudoersOpts): { line: string; tag: string } {
  const tags: string[] = []
  if (o.nopasswd) tags.push('NOPASSWD:')
  if (o.setenv) tags.push('SETENV:')
  if (o.noexec) tags.push('NOEXEC:')
  if (o.logOutput) tags.push('LOG_OUTPUT:')
  const tag = tags.join('')
  const runas = o.runas.trim() ? `(${o.runas.trim()})` : ''
  const parts = [o.user.trim() || 'usuario', o.host.trim() || 'ALL', runas, tag, o.command.trim() || '/ruta/comando'].filter(Boolean)
  return { line: parts.join(' '), tag }
}

export function sudoersWarnings(o: SudoersOpts): { tone: 'bad' | 'warn' | 'info'; text: string }[] {
  const w: { tone: 'bad' | 'warn' | 'info'; text: string }[] = []
  const cmd = o.command.trim()

  if (o.nopasswd && /^(\*|all)$/i.test(cmd)) {
    w.push({ tone: 'bad', text: 'NOPASSWD sobre ALL = root sin contraseña para ese usuario. Nunca en producción.' })
  }
  if (cmd.includes('*')) {
    w.push({ tone: 'warn', text: 'Wildcard en el comando: sudo lo expande con el shell. Un usuario puede pasar rutas arbitrarias (GTFOBins: sudo con wildcards).' })
  }
  if (/(^|[\s/])(bash|sh|zsh|dash|vi|vim|less|more|man|awk|find|perl|python[23]?|ruby|lua|node|env|exec)(\s|$)/.test(cmd)) {
    w.push({ tone: 'bad', text: 'El comando permite escapar a shell (GTFOBins). Aunque sea para una tarea concreta, es root efectivo.' })
  }
  if (SHELL_META.test(cmd)) {
    w.push({ tone: 'warn', text: 'Metacaracteres de shell en el comando: la línea es frágil y puede ampliar el alcance real del permiso.' })
  }
  if (cmd && !cmd.startsWith('/')) {
    w.push({ tone: 'warn', text: 'Ruta relativa: sudo la resuelve en el PATH del usuario que ejecuta. Usa ruta absoluta (/usr/bin/systemctl).' })
  }
  if (o.setenv) {
    w.push({ tone: 'warn', text: 'SETENV permite al usuario fijar variables (LD_PRELOAD, PATH) al ejecutar: vector clásico de privesc.' })
  }
  if (o.runas.includes(':') === false && o.runas.trim() && o.runas.trim() !== 'root') {
    w.push({ tone: 'info', text: `Run-as "${o.runas.trim()}": para ejecutar como otro usuario. root es lo habitual en sudoers.` })
  }
  if (!w.length) w.push({ tone: 'info', text: 'Línea razonable: comando absoluto, sin wildcards, sin shell escape y sin NOPASSWD.' })
  return w
}

export const SUDOERS_PRESETS: { label: string; desc: string; opts: Partial<SudoersOpts> }[] = [
  { label: 'reiniciar un servicio', desc: 'deploy puede reiniciar la app sin contraseña', opts: { command: '/usr/bin/systemctl restart miapp.service', nopasswd: true } },
  { label: 'logs de nginx', desc: 'lectura de logs como root sin shell', opts: { command: '/usr/bin/tail -f /var/log/nginx/access.log', nopasswd: true, noexec: true } },
  { label: 'backup como postgres', desc: 'ejecutar pg_dump como usuario postgres', opts: { runas: 'postgres', command: '/usr/bin/pg_dumpall', nopasswd: false } },
  { label: 'apagar', desc: 'solo shutdown, con contraseña', opts: { command: '/usr/sbin/shutdown -h now' } },
  { label: '⚠ ejemplito inseguro', desc: 'para demostrar por qué es malo (wildcard + vim)', opts: { command: '/usr/bin/vim *', nopasswd: true } },
]
