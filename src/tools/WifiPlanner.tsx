import { useMemo, useState } from 'react'
import { Radar, Plus, Trash2, Radio } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput, Button } from '../components/ui'
import { congestion24, bestChannels24, plan24, CH5, GROUPS80_5G, PSC_6GHZ, suggest, type ApEntry } from '../lib/wifiplanner'

let uid = 100
const newAp = (): ApEntry => ({ id: `ap${uid++}`, ssid: `AP-${uid}`, channel: 6, strength: 70 })

const chColor = (score: number): string =>
  score >= 7 ? 'bg-bad' : score >= 4.5 ? 'bg-warn' : score >= 2 ? 'bg-info' : 'bg-ok'

export default function WifiPlanner() {
  const [aps, setAps] = useState<ApEntry[]>([
    { id: 'ap1', ssid: 'Vecino-1', channel: 1, strength: 80 },
    { id: 'ap2', ssid: 'Vecino-2', channel: 4, strength: 55 },
    { id: 'ap3', ssid: 'Vecino-3', channel: 6, strength: 90 },
    { id: 'ap4', ssid: 'Vecino-4', channel: 9, strength: 40 },
    { id: 'ap5', ssid: 'Vecino-5', channel: 11, strength: 65 },
  ])
  const [band, setBand] = useState<'2.4' | '5' | '6'>('2.4')
  const [ownAps, setOwnAps] = useState(1)

  const congest = useMemo(() => congestion24(aps), [aps])
  const best = useMemo(() => bestChannels24(aps, 3), [aps])
  const plan = useMemo(() => plan24(ownAps), [ownAps])
  const suggestion = useMemo(() => suggest(band, ownAps), [band, ownAps])
  const maxScore = Math.max(...congest.map((c) => c.score), 1)

  const update = (id: string, patch: Partial<ApEntry>) => setAps((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Radar}
        title="WiFi Channel Planner"
        desc="Planifica canales 2.4/5/6 GHz con el solapamiento REAL del espectro: pega los APs vecinos que ves con airodump y obtén el canal limpio, el mapa de congestión y la referencia DFS/PSC"
        badge="wifi"
      />

      <InfoBanner>
        En 2.4 GHz cada canal ocupa 20 MHz pero se separan solo 5 MHz: canales a menos de 4 de distancia se pisan. Elegir canales pegados (6 y 9) es <b>peor</b> que compartir canal (1 y 1), porque CSMA/CA al menos turna a los co-canales. Un escaneo pasivo con <code>airodump-ng</code> te da la lista de BSSID/canal/potencia que alimenta esta herramienta.
      </InfoBanner>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[400px_1fr]">
        {/* entrada de APs */}
        <Reveal>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white"><Radio size={15} className="text-acento" /> APs vecinos</h3>
              <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => setAps((l) => [...l, newAp()])}>
                <Plus size={13} /> añadir
              </Button>
            </div>
            <div className="space-y-2">
              {aps.map((ap) => (
                <div key={ap.id} className="flex items-center gap-1.5">
                  <TextInput
                    value={ap.ssid}
                    onChange={(e) => update(ap.id, { ssid: e.target.value })}
                    className="min-w-0 flex-[3] px-2 py-1.5 text-[12px]"
                    placeholder="SSID"
                  />
                  <TextInput
                    type="number"
                    min={1}
                    max={13}
                    value={ap.channel}
                    onChange={(e) => update(ap.id, { channel: Math.max(1, Math.min(13, Number(e.target.value) || 1)) })}
                    className="w-14 px-2 py-1.5 text-center text-[12px]"
                    title="canal 1-13"
                  />
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={ap.strength}
                    onChange={(e) => update(ap.id, { strength: Number(e.target.value) })}
                    className="h-1.5 min-w-0 flex-[2] cursor-pointer accent-[var(--acento)]"
                    title={`potencia relativa ${ap.strength}%`}
                  />
                  <button
                    onClick={() => setAps((l) => l.filter((a) => a.id !== ap.id))}
                    className="shrink-0 rounded-md border border-edge p-1.5 text-grey transition-colors hover:border-bad/50 hover:text-bad"
                    title="quitar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            {aps.length === 0 && <p className="py-4 text-center font-mono text-[11px] text-grey">sin APs: añade lo que veas en airodump</p>}

            <div className="mt-4 border-t border-edge pt-4">
              <Field label="mis APs propios" hint="para el plan automático">
                <TextInput type="number" min={1} max={12} value={ownAps} onChange={(e) => setOwnAps(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
              </Field>
              <div className="mt-3 flex gap-1.5">
                {(['2.4', '5', '6'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBand(b)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 font-mono text-[11.5px] transition-all ${
                      band === b ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'
                    }`}
                  >
                    {b} GHz
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-4">
          {/* mapa de congestión */}
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-1 font-mono text-sm font-bold text-white">mapa de congestión 2.4 GHz</h3>
              <p className="mb-4 text-[12px] text-grey">
                Mejores canales ahora mismo: {best.map((b, i) => <Badge key={b} tone={i === 0 ? 'ok' : 'accent'} className="ml-1">canal {b}</Badge>)}
              </p>
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                {congest.map((c) => (
                  <div key={c.channel} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1" style={{ height: '100%' }}>
                    <span className="font-mono text-[9px] text-grey/70 opacity-0 transition-opacity group-hover:opacity-100">{c.score.toFixed(1)}</span>
                    <div
                      className={`w-full rounded-t ${chColor(c.score)} opacity-85 transition-all group-hover:opacity-100`}
                      style={{ height: `${Math.max(4, (c.score / maxScore) * 100)}%` }}
                      title={`canal ${c.channel}: score ${c.score.toFixed(2)} · co-canal ${c.coChannel.toFixed(2)} · solape ${c.partial.toFixed(2)}`}
                    />
                    <span className={`font-mono text-[10px] ${best.includes(c.channel) ? 'font-bold text-ok' : 'text-grey'}`}>{c.channel}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] text-grey">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-ok" /> limpio</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-info" /> algo</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-warn" /> congestionado</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-bad" /> evita</span>
              </div>
            </div>
          </Reveal>

          {/* sugerencia por banda */}
          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
                <Radio size={15} className="text-acento" /> plan {suggestion.band} GHz
              </h3>
              <p className="mb-2 font-mono text-[12.5px] font-bold text-ink">{suggestion.headline}</p>
              <ul className="space-y-1.5">
                {suggestion.lines.map((l, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-grey">
                    <span className="text-acento">▸</span> {l}
                  </li>
                ))}
              </ul>
              {suggestion.warn && (
                <p className="mt-3 rounded-lg border border-warn/40 bg-warn/5 px-3.5 py-2.5 text-[12px] text-warn">⚠ {suggestion.warn}</p>
              )}
              {band === '2.4' && (
                <p className="mt-3 rounded-lg border border-acento/30 bg-acento/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink/90">
                  <b className="text-acento">plan automático:</b> {plan.assignments.map((a) => `AP${a.ap}→ch${a.channel}`).join(' · ')}
                </p>
              )}
            </div>
          </Reveal>

          {/* referencia 5 GHz */}
          <Reveal delay={0.08}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">referencia 5 GHz — grupos de 80 MHz y DFS</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {GROUPS80_5G.map((g) => (
                  <div key={g.center} className={`rounded-lg border px-3 py-2 ${g.dfs ? 'border-warn/30 bg-warn/5' : 'border-ok/30 bg-ok/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-bold text-ink">c{g.center} · {g.channels[0]}-{g.channels[3]}</span>
                      <Badge tone={g.dfs ? 'warn' : 'ok'}>{g.dfs ? 'DFS (radar)' : 'sin DFS'}</Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[10.5px] text-grey">
                      canales {g.channels.join(', ')}{g.weather ? ' · banda meteorológica: CAC más estricto' : ''}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-grey">
                Con radar detectado el AP debe vaciar el canal en &lt;10 s y quedarse ~60 s en CAC antes de volver: por eso los APs domésticos evitan 52-144 y los corporativos lo planifican.
              </p>
            </div>
          </Reveal>

          {/* referencia canales 5 + PSC 6 */}
          <Reveal delay={0.1}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">canales 5 GHz · PSC de 6 GHz</h3>
              <div className="flex flex-wrap gap-1">
                {CH5.map((c) => (
                  <span
                    key={c.channel}
                    title={c.note ?? (c.dfs ? 'DFS: requiere CAC, salto si oye radar' : 'sin DFS')}
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10.5px] ${
                      c.dfs ? 'border-warn/40 text-warn/90' : 'border-ok/40 text-ok'
                    }`}
                  >
                    {c.channel}
                  </span>
                ))}
              </div>
              <p className="mt-3 mb-1.5 font-mono text-[11px] uppercase tracking-wider text-grey">PSC 6 GHz (los únicos que los clientes escanean primero):</p>
              <div className="flex flex-wrap gap-1">
                {PSC_6GHZ.map((c) => (
                  <span key={c} className="rounded border border-acento/40 bg-acento/5 px-1.5 py-0.5 font-mono text-[10.5px] text-acento">{c}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
