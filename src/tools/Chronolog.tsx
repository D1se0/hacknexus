import { useMemo, useState } from 'react'
import { History, Plus, Trash2, Copy as CopyIcon } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Select, Reveal, InfoBanner, useToast } from '../components/ui'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { download } from '../lib/util'
import { PHASES, PHASE_ORDER, sortedEvents, statsEvents, fmtMin, clockAt, toMarkdown, toCsv, validateEvents, newEvent, DEMO_EVENTS, type ChronoEvent, type ChronoPhase } from '../lib/chronolog'
import { cn } from '../lib/util'

export default function Chronolog() {
  const [title, setTitle] = useState('Box: Nexus — writeup')
  const [author, setAuthor] = useState('D1se0')
  const [startISO, setStartISO] = useState(() => {
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  }) // datetime-local
  const [events, setEvents] = useState<ChronoEvent[]>(DEMO_EVENTS)
  const [selId, setSelId] = useState<string | null>(DEMO_EVENTS[0].id)
  const toast = useToast()

  const sorted = useMemo(() => sortedEvents(events), [events])
  const stats = useMemo(() => statsEvents(events), [events])
  const problems = useMemo(() => validateEvents(events), [events])
  const sel = events.find((e) => e.id === selId) ?? null

  const patch = (id: string, p: Partial<ChronoEvent>) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)))
  const addEv = () => {
    const last = sorted[sorted.length - 1]
    const ev = newEvent({ min: last ? last.min + 15 : 0, phase: 'enum', title: '' })
    setEvents((es) => [...es, ev])
    setSelId(ev.id)
  }
  const removeEv = (id: string) => {
    setEvents((es) => es.filter((e) => e.id !== id))
    if (selId === id) setSelId(null)
  }

  const md = useMemo(() => toMarkdown(events, { title, author, startISO: new Date(startISO).toISOString() }), [events, title, author, startISO])
  const csv = useMemo(() => toCsv(events, new Date(startISO).toISOString()), [events, startISO])

  return (
    <>
      <ToolHeader icon={History} title="Chronolog" desc="Timeline de tu engagement: documenta cada evento con fase y host, obtén TTE (time-to-exploit), duración, huecos sin documentar y exporta el writeup en Markdown o CSV — la herramienta que te ahorra reconstruir el ataque a posteriori" />

      <InfoBanner>
        <b>Por qué existe:</b> todos hemos acabado el box a las 2 AM y al día siguiente no recordábamos el orden de los pasos.
        Chronolog es un registro en vivo: cada evento con minuto, fase y host. Los <b>huecos &gt;45m</b> y las fases clave sin cobertura
        se marcan solos — en un pentest real, eso es lo primero que pregunta el cliente (o el corrector del informe).
      </InfoBanner>

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        {/* izquierda: meta + timeline */}
        <div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="título del engagement"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="operador"><TextInput value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
            <Field label="hora de inicio"><TextInput type="datetime-local" value={startISO} onChange={(e) => setStartISO(e.target.value)} /></Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={addEv} className="inline-flex items-center gap-1.5 rounded-lg border border-acento/40 px-2.5 py-1.5 font-mono text-[11px] text-acento hover:bg-acento/10">
              <Plus size={12} /> evento
            </button>
            <button onClick={() => setEvents(DEMO_EVENTS.map((e) => ({ ...e, id: newEvent().id })))} className="rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey hover:text-ink">
              cargar demo
            </button>
            <div className="ml-auto flex items-center gap-2">
              <SnapshotButtons<ChronoEvent[]>
                toolId="chronolog"
                label="timeline completa"
                getData={() => events}
                onLoad={(d) => Array.isArray(d) && setEvents(d.map((e) => ({ ...newEvent(), ...e })))}
              />
              <button
                onClick={() => { download((title || 'chronolog').replace(/\s+/g, '-').toLowerCase() + '.md', md, 'text/markdown'); toast('Markdown descargado ✓', 'ok') }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:border-acento/50 hover:text-acento"
              >
                <CopyIcon size={12} /> .md
              </button>
              <button
                onClick={() => { download((title || 'chronolog').replace(/\s+/g, '-').toLowerCase() + '.csv', csv, 'text/csv'); toast('CSV descargado ✓', 'ok') }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:border-info/50 hover:text-info"
              >
                .csv
              </button>
            </div>
          </div>

          {problems.length > 0 && (
            <div className="mt-3 rounded border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-[11px] text-warn">
              ⚠ {problems.join(' · ')}
            </div>
          )}

          {/* timeline */}
          <div className="mt-3 space-y-0">
            {sorted.map((e, i) => {
              const ph = PHASES[e.phase]
              return (
                <Reveal key={e.id} delay={Math.min(i * 0.03, 0.3)}>
                  <div className="flex gap-3">
                    {/* carril temporal */}
                    <div className="flex w-14 shrink-0 flex-col items-center">
                      <span className="font-mono text-[10px] text-grey">{clockAt(startISO, e.min)}</span>
                      <span className="font-mono text-[9px] text-grey/50">+{e.min}m</span>
                      <span className="mt-1 h-2 w-2 rounded-full" style={{ background: ph.color }} />
                      {i < sorted.length - 1 && <span className="w-px flex-1 bg-edge" />}
                    </div>
                    {/* tarjeta */}
                    <button
                      onClick={() => setSelId(e.id)}
                      className={cn(
                        'mb-3 w-full rounded-lg border bg-black/30 px-3 py-2 text-left transition-colors',
                        selId === e.id ? 'border-acento/60' : 'border-edge hover:border-grey/40',
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">{ph.icon}</span>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: ph.color }}>{ph.label}</span>
                        {e.host && <span className="rounded border border-edge px-1.5 font-mono text-[9px] text-grey">{e.host}</span>}
                        {e.severity === 'bad' && <Badge tone="bad">crítico</Badge>}
                        {e.severity === 'ok' && <Badge tone="ok">logro</Badge>}
                        {e.severity === 'warn' && <Badge tone="warn">aviso</Badge>}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-ink">{e.title || <span className="text-grey/50">(sin título — pica para editar)</span>}</div>
                      {e.detail && <div className="text-[11px] text-grey">{e.detail}</div>}
                    </button>
                  </div>
                </Reveal>
              )
            })}
            {sorted.length === 0 && (
              <p className="rounded border border-edge px-3 py-6 text-center font-mono text-xs text-grey">
                timeline vacía — añade el primer evento o carga la demo
              </p>
            )}
          </div>
        </div>

        {/* derecha: editor + stats */}
        <div className="space-y-3">
          {/* stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-edge bg-black/30 p-2.5 text-center">
              <div className="font-mono text-xl font-bold text-ink">{stats.total}</div>
              <div className="text-[9px] uppercase tracking-wide text-grey">eventos</div>
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-2.5 text-center">
              <div className="font-mono text-xl font-bold text-info">{fmtMin(stats.durationMin)}</div>
              <div className="text-[9px] uppercase tracking-wide text-grey">duración</div>
            </div>
            <div className="rounded-lg border border-edge bg-black/30 p-2.5 text-center">
              <div className="font-mono text-xl font-bold text-bad">{stats.tteMin !== null ? fmtMin(stats.tteMin) : '—'}</div>
              <div className="text-[9px] uppercase tracking-wide text-grey">TTE</div>
            </div>
          </div>

          {stats.gaps.length > 0 && (
            <div className="rounded border border-warn/40 bg-warn/5 px-3 py-2 text-[11px] text-warn">
              ⏳ {stats.gaps.length} hueco{stats.gaps.length > 1 ? 's' : ''} &gt;45m:{' '}
              {stats.gaps.map((g) => `"${g.from.title.slice(0, 18)}"→"${g.to.title.slice(0, 18)}" (${fmtMin(g.min)})`).join(' · ')}
            </div>
          )}
          {stats.uncovered.length > 0 && (
            <div className="rounded border border-info/40 bg-info/5 px-3 py-2 text-[11px] text-info">
              fases sin cobertura: {stats.uncovered.map((p) => PHASES[p].label).join(', ')}
            </div>
          )}

          {/* editor del evento */}
          {sel ? (
            <div className="rounded-lg border border-acento/30 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-acento">editar evento</h4>
                <button onClick={() => removeEv(sel.id)} className="rounded border border-bad/40 px-2 py-1 font-mono text-[10px] text-bad"><Trash2 size={10} className="inline" /> borrar</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="minuto"><TextInput type="number" value={sel.min} onChange={(e) => patch(sel.id, { min: parseInt(e.target.value) || 0 })} className="font-mono" /></Field>
                <Field label="fase">
                  <Select
                    value={sel.phase}
                    onChange={(e) => patch(sel.id, { phase: e.target.value as ChronoPhase })}
                    options={PHASE_ORDER.map((p) => ({ value: p, label: `${PHASES[p].icon} ${PHASES[p].label}` }))}
                  />
                </Field>
              </div>
              <div className="mt-2"><Field label="título"><TextInput value={sel.title} onChange={(e) => patch(sel.id, { title: e.target.value })} placeholder="explotación de CVE-…" /></Field></div>
              <div className="mt-2"><Field label="detalle"><TextInput value={sel.detail ?? ''} onChange={(e) => patch(sel.id, { detail: e.target.value })} placeholder="qué exploit, qué credencial, por qué funcionó" /></Field></div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="host"><TextInput value={sel.host ?? ''} onChange={(e) => patch(sel.id, { host: e.target.value })} placeholder="10.10.10.5" className="font-mono" /></Field>
                <Field label="severidad">
                  <Select
                    value={sel.severity ?? 'info'}
                    onChange={(e) => patch(sel.id, { severity: e.target.value as ChronoEvent['severity'] })}
                    options={[{ value: 'info', label: 'info' }, { value: 'ok', label: 'logro' }, { value: 'warn', label: 'aviso' }, { value: 'bad', label: 'crítico' }]}
                  />
                </Field>
              </div>
              <p className="mt-2 text-[10px] text-grey"><span className="text-acento">↳</span> {PHASES[sel.phase].hint}</p>
            </div>
          ) : (
            <p className="rounded border border-edge px-3 py-4 text-center font-mono text-xs text-grey">pica un evento para editarlo</p>
          )}

          {/* markdown */}
          <CopyBlock text={md} label="writeup markdown" maxH="18rem" />

          {/* fases */}
          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Leyenda de fases</h4>
            <ul className="space-y-1 text-[11px]">
              {PHASE_ORDER.map((p) => (
                <li key={p}>
                  <span className="font-mono font-bold" style={{ color: PHASES[p].color }}>{PHASES[p].icon} {PHASES[p].label}</span>
                  <span className="text-grey"> — {PHASES[p].hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
