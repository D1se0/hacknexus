import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { ToolHeader, Field, TextInput, Reveal, CopyBlock } from '../components/ui'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DOWS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function parseField(field: string, min: number, max: number, names?: string[]): number[] {
  const values = new Set<number>()
  const resolve = (tok: string): number => {
    const n = parseInt(tok)
    if (!isNaN(n)) return n
    if (names) {
      const idx = names.findIndex((nm) => nm.toLowerCase().startsWith(tok.slice(0, 3).toLowerCase()))
      if (idx >= 0) return idx
    }
    throw new Error(`valor inválido: ${tok}`)
  }
  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(.+?)\/(\d+)$/)
    const rangeMatch = part.match(/^(.+?)-(.+)$/)
    const star = part === '*' || part === '?'
    let start: number, end: number, step = 1
    if (stepMatch && !/^\d+$/.test(stepMatch[1])) {
      const base = stepMatch[1] === '*' ? `${min}-${max}` : stepMatch[1]
      const sub = parseField(base, min, max, names)
      start = Math.min(...sub)
      end = max
      step = parseInt(stepMatch[2])
    } else if (stepMatch) {
      start = parseInt(stepMatch[1])
      end = max
      step = parseInt(stepMatch[2])
    } else if (star) {
      start = min
      end = max
    } else if (rangeMatch) {
      start = resolve(rangeMatch[1])
      end = resolve(rangeMatch[2])
    } else {
      const v = resolve(part)
      if (v < min || v > max) throw new Error(`${v} fuera de rango (${min}-${max})`)
      values.add(v)
      continue
    }
    if (start < min || end > max || start > end) throw new Error(`rango ${start}-${end} fuera de ${min}-${max}`)
    for (let v = start; v <= end; v += step) values.add(v)
  }
  if (!values.size) throw new Error('campo vacío')
  return [...values].sort((a, b) => a - b)
}

interface CronParsed {
  minutes: number[]
  hours: number[]
  doms: number[]
  months: number[]
  dows: number[]
  domRestricted: boolean
  dowRestricted: boolean
}

function parseCron(expr: string): CronParsed {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) throw new Error(`Se esperaban 5 campos (min hora dia-mes mes dia-semana); hay ${fields.length}`)
  return {
    minutes: parseField(fields[0], 0, 59),
    hours: parseField(fields[1], 0, 23),
    doms: parseField(fields[2], 0, 31),
    months: parseField(fields[3], 1, 12, MONTHS),
    dows: parseField(fields[4].replace(/^7$/, '0'), 0, 6, DOWS),
    domRestricted: fields[2] !== '*' && fields[2] !== '?',
    dowRestricted: fields[4] !== '*' && fields[4] !== '?',
  }
}

function describe(p: CronParsed): string {
  const fmtList = (ns: number[], names?: string[], unit?: string) => {
    if (ns.length > 12) return `cada ${unit}`
    const vals = names ? ns.map((n) => names[n]) : ns.map(String)
    return vals.join(', ')
  }
  const parts: string[] = []
  if (p.minutes.length === 60) parts.push('cada minuto')
  else if (p.minutes.length === 1) parts.push(`en el minuto ${p.minutes[0]}`)
  else parts.push(`en los minutos ${fmtList(p.minutes)}`)
  if (p.hours.length === 24) parts.push('de cada hora')
  else if (p.hours.length === 1) parts.push(`a las ${String(p.hours[0]).padStart(2, '0')}:00`)
  else parts.push(`en las horas ${p.hours.join(', ')}`)
  if (p.months.length !== 12) parts.push(`en ${fmtList(p.months, MONTHS)}`)
  if (p.domRestricted && p.dowRestricted) parts.push('(cron estándar: se dispara si coincide dia-de-mes O dia-de-semana)')
  else if (p.domRestricted && !p.dowRestricted) parts.push(`el día ${p.doms.join(', ')} de cada mes`)
  else if (!p.domRestricted && p.dowRestricted) parts.push(`los ${fmtList(p.dows, DOWS)}`)
  return parts.join(' ')
}

function nextRuns(p: CronParsed, count = 5): Date[] {
  const out: Date[] = []
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  const guard = 366 * 24 * 60 // un año de minutos como máximo
  let iter = 0
  while (out.length < count && iter++ < guard) {
    const minuteOk = p.minutes.includes(d.getMinutes())
    const hourOk = p.hours.includes(d.getHours())
    const monthOk = p.months.includes(d.getMonth() + 1)
    const domOk = p.doms.includes(d.getDate())
    const dowOk = p.dows.includes(d.getDay())
    const dayOk = p.domRestricted && p.dowRestricted ? domOk || dowOk : domOk && dowOk
    if (minuteOk && hourOk && monthOk && dayOk) out.push(new Date(d))
    d.setMinutes(d.getMinutes() + 1)
  }
  return out
}

const COMMON: { label: string; expr: string }[] = [
  { label: 'cada minuto', expr: '* * * * *' },
  { label: 'cada 5 min', expr: '*/5 * * * *' },
  { label: 'cada hora', expr: '0 * * * *' },
  { label: 'diario 03:30', expr: '30 3 * * *' },
  { label: 'laborales 09:00', expr: '0 9 * * 1-5' },
  { label: 'domingos 04:00', expr: '0 4 * * 0' },
  { label: 'día 1 de mes', expr: '0 0 1 * *' },
  { label: 'cada 15s (systemd)', expr: '* * * * *' },
]

export default function Cronguru() {
  const [expr, setExpr] = useState('30 3 * * 1-5')

  const result = useMemo(() => {
    try {
      const p = parseCron(expr)
      return { p, runs: nextRuns(p), error: null as string | null }
    } catch (e) {
      return { p: null, runs: [], error: (e as Error).message }
    }
  }, [expr])

  return (
    <div>
      <ToolHeader icon={CalendarClock} title="Cron Guru" desc="Explica expresiones cron en cristiano y calcula las próximas ejecuciones en tu zona horaria" />

      <Reveal>
        <div className="card p-6">
          <Field label="expresión cron" hint="min hora dia-mes mes dia-semana">
            <TextInput value={expr} onChange={(e) => setExpr(e.target.value)} className="font-mono text-lg" />
          </Field>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {COMMON.filter((c) => c.expr !== '* * * * *').map((c) => (
              <button
                key={c.label}
                onClick={() => setExpr(c.expr)}
                className="rounded-md border border-edge px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento"
              >
                {c.label} <span className="text-acento">{c.expr}</span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {result.error ? (
        <div className="card mt-6 p-6 font-mono text-sm text-bad">⚠ {result.error}</div>
      ) : (
        result.p && (
          <>
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">interpretación</h3>
                <p className="font-mono text-[15px] leading-relaxed text-acento">{describe(result.p)}</p>
                <div className="mt-4 grid gap-2 font-mono text-[11px] text-grey sm:grid-cols-5">
                  {[
                    ['minuto', expr.trim().split(/\s+/)[0]],
                    ['hora', expr.trim().split(/\s+/)[1]],
                    ['día-mes', expr.trim().split(/\s+/)[2]],
                    ['mes', expr.trim().split(/\s+/)[3]],
                    ['día-sem', expr.trim().split(/\s+/)[4]],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-edge bg-black/30 p-2.5 text-center">
                      <div className="text-[9px] uppercase tracking-widest">{l}</div>
                      <div className="mt-0.5 text-base font-bold text-white">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">próximas 5 ejecuciones (hora local)</h3>
                <div className="space-y-1.5">
                  {result.runs.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-edge bg-black/30 px-4 py-2 font-mono text-[13px]">
                      <span className="text-acento">+{i + 1}</span>
                      <span className="text-ink">{d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                      <span className="ml-auto text-white">{d.toLocaleTimeString('es-ES', { hour12: false })}</span>
                      <span className="text-[10px] text-grey">
                        {Math.round((d.getTime() - Date.now()) / 60000)} min
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <CopyBlock
                    text={`# crontab -e\ncat <<'EOF'\n${expr} /usr/local/bin/tu-script.sh\nEOF`}
                    label="instalar en crontab"
                    maxH="max-h-28"
                  />
                </div>
              </div>
            </Reveal>
          </>
        )
      )}

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 Curiosidades de privesc: cron ejecuta con el PATH de <span className="text-acento">/etc/crontab</span> a menudo sin
          ruta absoluta — un script con <span className="text-acento">tar czf /backup/x *</span> en un directorio escribible es
          wildcard injection (check gtfobins + cron). Días: 0 y 7 son domingo.
        </div>
      </Reveal>
    </div>
  )
}
