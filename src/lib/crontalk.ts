/* Cron Translator: explica expresiones cron en cristiano y las
   convierte a systemd OnCalendar (y viceversa). Sin dependencias. */

const DOW = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export interface CronParts {
  min: string; hour: string; dom: string; month: string; dow: string
  is6?: boolean // con segundos (formato Quartz/cron.d extendido)
  sec?: string
}

export function parseCron(expr: string): CronParts | null {
  const f = expr.trim().split(/\s+/)
  if (f.length === 5) return { min: f[0], hour: f[1], dom: f[2], month: f[3], dow: f[4] }
  if (f.length === 6) return { min: f[1], hour: f[2], dom: f[3], month: f[4], dow: f[5], is6: true, sec: f[0] }
  return null
}

function describeField(v: string, what: 'min' | 'hour' | 'dom' | 'month' | 'dow' | 'sec'): string {
  if (v === '*') return what === 'min' ? 'cada minuto' : what === 'hour' ? 'cada hora' : what === 'dom' ? 'todos los días del mes' : what === 'month' ? 'todos los meses' : what === 'dow' ? 'todos los días de la semana' : 'cada segundo'
  if (v === '?') return 'ignorado (elegido por otro campo)'
  if (v.startsWith('*/')) {
    const n = v.slice(2)
    const unit = what === 'min' ? `cada ${n} minutos` : what === 'hour' ? `cada ${n} horas` : what === 'sec' ? `cada ${n} segundos` : what === 'dom' ? `cada ${n} días` : what === 'month' ? `cada ${n} meses` : `cada ${n} días de la semana`
    return unit
  }
  if (v.includes('/')) {
    const [from, step] = v.split('/')
    const unit = what === 'hour' ? 'horas' : what === 'min' ? 'minutos' : 'unidades'
    const fromDesc = what === 'hour' ? `desde las ${from}:00` : what === 'min' ? `desde el minuto ${from}` : `desde ${from}`
    return `${fromDesc}, cada ${step} ${unit}`
  }
  if (v.includes('-') && !v.includes(',')) {
    const [a, b] = v.split('-')
    if (what === 'dow') return `de ${DOW[+a] ?? a} a ${DOW[+b] ?? b}`
    if (what === 'month') return `de ${MONTHS[+a - 1] ?? a} a ${MONTHS[+b - 1] ?? b}`
    return `del ${a} al ${b}`
  }
  if (v.includes(',')) {
    const parts = v.split(',')
    if (what === 'dow') return parts.map((p) => DOW[+p] ?? p).join(' y ')
    if (what === 'month') return parts.map((p) => MONTHS[+p - 1] ?? p).join(' y ')
    return `en ${parts.join(', ')}`
  }
  if (what === 'dow') return DOW[+v] ? `los ${DOW[+v]}` : v
  if (what === 'month') return MONTHS[+v - 1] ? `en ${MONTHS[+v - 1]}` : v
  if (what === 'hour' && v.includes(':')) return v
  return v
}

/** Explicación natural completa de la expresión. */
export function explainCron(expr: string): { ok: boolean; parts?: CronParts; human: string; notes: string[] } {
  const notes: string[] = []
  const p = parseCron(expr)
  if (!p) return { ok: false, human: 'formato no válido: cron estándar usa 5 campos (min hora día-mes mes día-semana)', notes }

  const timeDesc = (() => {
    if (p.hour === '*' && p.min === '*') return 'cada minuto de cada hora'
    if (p.min.startsWith('*/') && p.hour === '*') return `cada ${p.min.slice(2)} minutos`
    if (p.hour.startsWith('*/')) return `${p.min === '*' ? 'en el minuto 0' : 'en el minuto ' + p.min} de cada ${p.hour.slice(2)} horas`
    if (p.min === '*' && p.hour !== '*') return `en el minuto 0 de la(s) hora(s) ${describeField(p.hour, 'hour')}`
    if (p.hour === '*') return `en el minuto ${p.min} de cada hora`
    if (p.hour.includes(',') || p.hour.includes('-')) return `a la(s) hora(s) ${describeField(p.hour, 'hour')} minuto ${p.min}`
    return `a las ${p.hour}:${p.min.padStart(2, '0')}`
  })()

  const dayDesc = p.dow !== '*' && p.dom !== '*' ? describeField(p.dom, 'dom') + ' (si además es ' + describeField(p.dow, 'dow') + ')' : p.dow !== '*' ? describeField(p.dow, 'dow') : p.dom !== '*' ? `el día ${describeField(p.dom, 'dom')} del mes` : ''

  const monthDesc = p.month !== '*' ? ` de ${p.month.includes(',') || p.month.includes('-') || p.month.startsWith('*/') ? describeField(p.month, 'month') : MONTHS[+p.month - 1] ?? p.month}` : ''

  const human = `Se ejecuta ${timeDesc}${dayDesc ? ', ' + dayDesc : ''}${monthDesc}.`
  if (p.dom !== '*' && p.dow !== '*') notes.push('OJO: cron interpreta dom+dow como OR (se ejecuta si CUALQUIERA coincide) en la mayoría de implementaciones — vixie-cron hace AND solo cuando ambos están restringidos. Prueba con crontab.guru si dudas.')
  if (p.min === '*' && p.hour === '*') notes.push('Se ejecuta CADA MINUTO: patrón habitual de malware persistente. Si no lo reconoces en tu crontab, investiga.')
  if (/@(reboot|hourly|daily|weekly|monthly|yearly)/.test(expr)) notes.push('Las cadenas @reboot/@daily… son atajos estándar soportados por la mayoría de crons.')
  return { ok: true, parts: p, human, notes }
}

/** A systemd OnCalendar (aproximación fiel para los casos comunes). */
export function cronToOnCalendar(expr: string): string | null {
  const p = parseCron(expr)
  if (!p) return null
  const time = p.hour === '*' && p.min === '*' ? '*-*-* *:*:00'
    : p.min.startsWith('*/') ? `*-*-* *:0..59/${p.min.slice(2)}:00`
    : p.hour === '*' ? `*-*-* *:${p.min}:00`
    : `*-*-* ${p.hour}:${p.min.padStart(2, '0')}:00`
  const dowMap: Record<string, string> = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat', '7': 'Sun' }
  const dow = p.dow !== '*' && /^\d+(,\d+)*$/.test(p.dow) ? p.dow.split(',').map((d) => dowMap[d] ?? d).join('..') : ''
  if (dow) return `${time} ${dow}`
  return time
}

export const CRON_PRESETS: { label: string; expr: string; when: string }[] = [
  { label: 'cada minuto (⚠ patrón de malware)', expr: '* * * * *', when: 'diagnóstico de cola de trabajos… o de una infección' },
  { label: 'cada 15 minutos', expr: '*/15 * * * *', when: 'checks periódicos de monitorización' },
  { label: 'diario a las 03:00', expr: '0 3 * * *', when: 'backups nocturnos clásicos' },
  { label: 'cada 6 horas', expr: '0 */6 * * *', when: 'sincronizaciones que no necesitan minuto exacto' },
  { label: 'lunes a viernes 08:30', expr: '30 8 * * 1-5', when: 'informes en horario laboral' },
  { label: 'día 1 de cada mes 00:00', expr: '0 0 1 * *', when: 'rotaciones y facturación' },
  { label: 'domingos a las 04:30', expr: '30 4 * * 0', when: 'mantenimiento semanal' },
  { label: 'cada 10 min de 08:00 a 18:00', expr: '*/10 8-18 * * *', when: 'polling en horario de oficina' },
]

export const CRON_NOTES: string[] = [
  'cron NO entiende de horarios de verano raros: un job a las 02:30 el día del cambio puede no ejecutarse o ejecutarse dos veces.',
  'systemd timers > cron: logging en journal, RandomizedDelaySec para no sincronizar 100 máquinas, y persistencia tras apagones (Persistent=true).',
  'Los crons corren con el PATH mínimo (/usr/bin:/bin): usa rutas absolutas o define PATH al principio del crontab.',
  'Un cron con curl/wget descargando cosas de internet es el patrón #1 de criptomineros: la tool lo señala en las notas.',
]

export const CRON_FAQ: [string, string][] = [
  ['mi cron no corre', '1) crontab -l para ver si está 2) revisa /var/log/syslog | grep CRON 3) PATH mínimo: usa rutas absolutas 4) el % en crontab es especial: escápalo con \\%'],
  ['qué diferencia hay entre cron y anacron', 'anacron garantiza que un job diario corre AUNQUE la máquina estuviera apagada a la hora: ideal para laptops/desktops'],
  ['cómo pruebo un cron sin esperar', 'cambia la expresión a */2 * * * * (cada 2 min), deja syslog abierto y revierte cuando confirme'],
]
