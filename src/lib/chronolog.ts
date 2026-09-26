/* Chronolog: timeline de un engagement (CTF, pentest, bug bounty).
   Modelo por fases reales de un test de intrusión, con métricas que
   molan en un informe: TTE (time-to-exploit), duración, cobertura de fases. */

export type ChronoPhase = 'recon' | 'enum' | 'exploit' | 'priv' | 'post' | 'pivot' | 'loot' | 'cleanup' | 'nota'

export interface ChronoEvent {
  id: string
  min: number // minutos desde el inicio del engagement
  phase: ChronoPhase
  title: string
  detail?: string
  host?: string
  severity?: 'info' | 'ok' | 'warn' | 'bad'
}

export const PHASES: Record<ChronoPhase, { label: string; color: string; icon: string; hint: string }> = {
  recon: { label: 'Recon', color: '#38bdf8', icon: '🔍', hint: 'descubrimiento externo: subdominios, puertos, tecnología' },
  enum: { label: 'Enumeración', color: '#22d3ee', icon: '🗂️', hint: 'profundizar en servicios: versiones, shares, directorios' },
  exploit: { label: 'Explotación', color: '#f43f5e', icon: '💥', hint: 'ejecución del ataque que da acceso inicial' },
  priv: { label: 'Escalada', color: '#f59e0b', icon: '⬆️', hint: 'privesc local: kernel, sudo, credenciales reutilizadas' },
  post: { label: 'Post-explotación', color: '#a78bfa', icon: '🕵️', hint: 'movimiento lateral, dumpeo, persistencia autorizada' },
  pivot: { label: 'Pivoting', color: '#2ee88a', icon: '🔀', hint: 'túneles y saltos a nuevas redes' },
  loot: { label: 'Loot', color: '#eab308', icon: '💎', hint: 'flags, bases de datos, pruebas de impacto' },
  cleanup: { label: 'Limpieza', color: '#94a3b8', icon: '🧹', hint: 'borrar artefactos, cerrar túneles, informar' },
  nota: { label: 'Nota', color: '#64748b', icon: '📝', hint: 'observación sin evento técnico (deducción, idea, pendiente)' },
}

export const PHASE_ORDER: ChronoPhase[] = ['recon', 'enum', 'exploit', 'priv', 'post', 'pivot', 'loot', 'cleanup', 'nota']

const uid = () => 'ev' + Math.random().toString(36).slice(2, 8)

/** Eventos ordenados por tiempo (empate: orden de inserción estable). */
export function sortedEvents(events: ChronoEvent[]): ChronoEvent[] {
  return [...events].sort((a, b) => a.min - b.min)
}

export interface ChronoStats {
  total: number
  durationMin: number
  tteMin: number | null // tiempo hasta el primer exploit
  phaseCounts: { phase: ChronoPhase; count: number }[]
  gaps: { from: ChronoEvent; to: ChronoEvent; min: number }[] // huecos sospechosos > 45 min
  uncovered: ChronoPhase[] // fases sin ningún evento (si hay exploit)
}

export function statsEvents(events: ChronoEvent[]): ChronoStats {
  const sorted = sortedEvents(events)
  const durationMin = sorted.length ? sorted[sorted.length - 1].min - sorted[0].min : 0
  const firstExploit = sorted.find((e) => e.phase === 'exploit')
  const tteMin = firstExploit ? firstExploit.min - (sorted[0]?.min ?? 0) : null
  const counts = new Map<ChronoPhase, number>()
  for (const e of sorted) counts.set(e.phase, (counts.get(e.phase) ?? 0) + 1)
  const phaseCounts = PHASE_ORDER.filter((p) => counts.has(p)).map((p) => ({ phase: p, count: counts.get(p)! }))
  const gaps: { from: ChronoEvent; to: ChronoEvent; min: number }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].min - sorted[i - 1].min
    if (d >= 45) gaps.push({ from: sorted[i - 1], to: sorted[i], min: d })
  }
  const uncovered = sorted.some((e) => e.phase === 'exploit')
    ? PHASE_ORDER.filter((p) => p !== 'nota' && p !== 'cleanup' && !counts.has(p))
    : []
  return { total: sorted.length, durationMin, tteMin, phaseCounts, gaps, uncovered }
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

/** Hora de reloj dado un inicio ISO y el minuto relativo. */
export function clockAt(startISO: string, min: number): string {
  const d = new Date(startISO)
  if (isNaN(d.getTime())) return '--:--'
  d.setMinutes(d.getMinutes() + min)
  return d.toTimeString().slice(0, 5)
}

const mdEsc = (s: string) => s.replace(/\|/g, '\\|')

/** Informe Markdown de la línea temporal. */
export function toMarkdown(events: ChronoEvent[], opts: { title: string; author: string; startISO: string }): string {
  const sorted = sortedEvents(events)
  const st = statsEvents(events)
  const L: string[] = []
  L.push(`# ${opts.title}`)
  L.push('')
  L.push(`- **Operador:** ${opts.author}`)
  L.push(`- **Inicio:** ${new Date(opts.startISO).toLocaleString('es-ES')}`)
  L.push(`- **Eventos:** ${st.total} · **Duración:** ${fmtMin(st.durationMin)}` + (st.tteMin !== null ? ` · **TTE:** ${fmtMin(st.tteMin)}` : ''))
  L.push('')
  L.push('| Hora | +min | Fase | Host | Evento | Detalle |')
  L.push('|------|------|------|------|--------|---------|')
  for (const e of sorted) {
    L.push(`| ${clockAt(opts.startISO, e.min)} | +${e.min} | ${PHASES[e.phase].label} | ${mdEsc(e.host ?? '—')} | ${mdEsc(e.title)} | ${mdEsc(e.detail ?? '')} |`)
  }
  if (st.uncovered.length) {
    L.push('')
    L.push(`> ⚠️ Fases sin cobertura documentada: ${st.uncovered.map((p) => PHASES[p].label).join(', ')}`)
  }
  for (const g of st.gaps) {
    L.push('')
    L.push(`> ⏳ Hueco de ${fmtMin(g.min)} entre "${g.from.title}" y "${g.to.title}" — ¿quedó algo sin documentar?`)
  }
  return L.join('\n')
}

export function toCsv(events: ChronoEvent[], startISO: string): string {
  const rows = ['min,clock,phase,host,severity,title,detail']
  for (const e of sortedEvents(events)) {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    rows.push([e.min, clockAt(startISO, e.min), e.phase, e.host ?? '', e.severity ?? 'info', e.title, e.detail ?? ''].map((c) => esc(String(c))).join(','))
  }
  return rows.join('\n')
}

export function validateEvents(events: ChronoEvent[]): string[] {
  const out: string[] = []
  for (const e of events) {
    if (e.min < 0) out.push(`"${e.title}": minuto negativo (${e.min}) — usa 0 como inicio.`)
    if (!e.title.trim()) out.push('hay un evento sin título.')
  }
  return out
}

export const newEvent = (partial?: Partial<ChronoEvent>): ChronoEvent => ({
  id: uid(),
  min: 0,
  phase: 'recon',
  title: '',
  detail: '',
  host: '',
  severity: 'info',
  ...partial,
})

/** Preset: engagement tipo "box CTF" de ~2h para ver la tool viva. */
export const DEMO_EVENTS: ChronoEvent[] = [
  newEvent({ min: 0, phase: 'recon', title: 'nmap top-ports → 22,80', detail: 'OpenSSH 8.4p1 · nginx 1.18', host: '10.10.10.5' }),
  newEvent({ min: 6, phase: 'enum', title: 'fuzz de directorios', detail: 'dirsearch encuentra /adminer', host: '10.10.10.5' }),
  newEvent({ min: 19, phase: 'enum', title: 'adminer 4.7.8 sin auth', detail: 'cve-2021-43008: leer /var/www/.env', host: '10.10.10.5', severity: 'warn' }),
  newEvent({ min: 27, phase: 'exploit', title: 'creds de .env → login SSH', detail: 'reutilización de contraseña del usuario deploy', host: '10.10.10.5', severity: 'bad' }),
  newEvent({ min: 41, phase: 'priv', title: 'sudo -l: vim permitido', detail: 'GTFOBins vim -c :!sh', host: '10.10.10.5', severity: 'ok' }),
  newEvent({ min: 47, phase: 'loot', title: 'flag user + hash del siguiente host', detail: 'en /opt/backup', host: '10.10.10.5' }),
  newEvent({ min: 63, phase: 'pivot', title: 'chisel SOCKS a 172.16.0.0/24', detail: 'red interna descubierta en rutas', host: '10.10.10.5' }),
  newEvent({ min: 88, phase: 'exploit', title: 'reuso de creds en .30', detail: 'deploy:deploy en SSH', host: '172.16.0.30', severity: 'bad' }),
  newEvent({ min: 102, phase: 'loot', title: 'flag root', host: '172.16.0.30', severity: 'ok' }),
  newEvent({ min: 110, phase: 'cleanup', title: 'cerrar túneles y borrar ~/.bash_history de paso', host: 'ambas', severity: 'warn' }),
]
