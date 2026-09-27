import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gauge, Play, RotateCcw, Info, Download, Upload, Timer, Trash2, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { ToolHeader, Badge, Reveal, Button, useToast } from '../components/ui'

/* ───────── modelo de fases ───────── */

type Phase = 'idle' | 'ping' | 'download' | 'upload' | 'done'

interface PhaseResult {
  ping: number | null // ms
  jitter: number | null
  downMbps: number | null
  upMbps: number | null
}

/* endpoints públicos con CORS abierto y archivos de tamaño conocido (Cloudflare speed test endpoints) */
const TEST_URLS = {
  ping: 'https://speed.cloudflare.com/__down?bytes=1',
  down: (bytes: number) => `https://speed.cloudflare.com/__down?bytes=${bytes}`,
  up: 'https://speed.cloudflare.com/__up',
}

const fmt = (v: number | null, d = 1): string => (v === null ? '—' : v.toFixed(d))

/* ───────── veredicto, usos e historial ───────── */

interface HistoryEntry {
  t: number
  ping: number
  jitter: number
  down: number
  up: number
}

const HISTORY_KEY = 'hacknexus-speedtest-v1'
const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

const gradeFor = (r: PhaseResult): { grade: string; color: string; note: string } => {
  const down = r.downMbps ?? 0
  const up = r.upMbps ?? 0
  const ping = r.ping ?? 999
  const jitter = r.jitter ?? 999
  let s = 0
  s += down >= 600 ? 40 : down >= 300 ? 36 : down >= 100 ? 30 : down >= 50 ? 22 : down >= 25 ? 15 : down >= 10 ? 8 : 3
  s += up >= 300 ? 30 : up >= 100 ? 26 : up >= 30 ? 20 : up >= 10 ? 13 : up >= 5 ? 8 : 3
  s += ping <= 10 ? 20 : ping <= 25 ? 17 : ping <= 50 ? 12 : ping <= 80 ? 7 : ping <= 150 ? 3 : 0
  s += jitter <= 2 ? 10 : jitter <= 5 ? 8 : jitter <= 15 ? 5 : jitter <= 30 ? 2 : 0
  if (s >= 92) return { grade: 'A+', color: '#2ee88a', note: 'Excelente: fibra simétrica de gama alta o mejor' }
  if (s >= 82) return { grade: 'A', color: '#2ee88a', note: 'Muy buena: holgada para cualquier uso doméstico y telemétrico' }
  if (s >= 70) return { grade: 'B', color: '#38bdf8', note: 'Buena: cubre 4K y teletrabajo sin despeinarse' }
  if (s >= 55) return { grade: 'C', color: '#fbbf24', note: 'Correcta: sirve, pero se nota cuando compartes la línea' }
  if (s >= 40) return { grade: 'D', color: '#f97316', note: 'Justa: la subida o la latencia te van a limitar' }
  return { grade: 'E', color: '#f43f5e', note: 'Limitada: revisa los consejos de abajo antes de culpar al contrato' }
}

const useCases = (r: PhaseResult): { name: string; ok: boolean; req: string }[] => {
  const down = r.downMbps ?? 0
  const up = r.upMbps ?? 0
  const ping = r.ping ?? 999
  const jitter = r.jitter ?? 999
  return [
    { name: 'Videollamadas HD', ok: ping < 150 && up >= 1.5 && jitter < 40, req: '↓1.5 · ping<150ms' },
    { name: 'Gaming competitivo', ok: ping <= 50 && jitter <= 10, req: 'ping<50 · jitter<10ms' },
    { name: 'Streaming 4K', ok: down >= 25, req: '↓25 Mbps' },
    { name: 'Cloud gaming', ok: down >= 35 && ping <= 40 && jitter <= 5, req: '↓35 · ping<40ms' },
    { name: 'Streaming en vivo', ok: up >= 6 && jitter < 30, req: '↑6 Mbps · estable' },
    { name: 'Backup a la nube', ok: up >= 20, req: '↑20 Mbps' },
    { name: 'Teletrabajo + VPN', ok: down >= 10 && up >= 5 && ping <= 80, req: '↓10 ↑5 · ping<80ms' },
    { name: 'Descargas pesadas', ok: down >= 100, req: '↓100 Mbps' },
  ]
}

/* ───────── velocímetro SVG ───────── */

function Speedo({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  // arco de -120° a +120° (240° total)
  const angle = Math.min(1, Math.max(0, value / max)) * 240 - 120
  const R = 92
  const arc = (from: number, to: number, r: number): string => {
    const a1 = (from * Math.PI) / 180
    const a2 = (to * Math.PI) / 180
    const x1 = 110 + r * Math.cos(a1)
    const y1 = 110 + r * Math.sin(a1)
    const x2 = 110 + r * Math.cos(a2)
    const y2 = 110 + r * Math.sin(a2)
    const large = Math.abs(to - from) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const ticks = Array.from({ length: 13 }, (_, i) => -120 + i * 20)

  return (
    <div className="relative">
      <svg viewBox="0 0 220 190" className="w-full max-w-[300px]">
        {/* arco de fondo */}
        <path d={arc(-120, 120, R)} fill="none" stroke="#1f2a25" strokeWidth="14" strokeLinecap="round" />
        {/* arco de progreso */}
        <motion.path
          d={arc(-120, 120, R)}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={Math.PI * R * (240 / 180)}
          initial={false}
          animate={{ strokeDashoffset: Math.PI * R * (240 / 180) * (1 - Math.min(1, value / max)) }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          transform="rotate(-0 110 110)"
        />
        {/* ticks */}
        {ticks.map((t) => {
          const a = (t * Math.PI) / 180
          const x1 = 110 + (R - 12) * Math.cos(a)
          const y1 = 110 + (R - 12) * Math.sin(a)
          const x2 = 110 + (R - 20) * Math.cos(a)
          const y2 = 110 + (R - 20) * Math.sin(a)
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4b5c54" strokeWidth={t % 60 === -120 || t === 120 ? 2 : 1} />
        })}
        {/* aguja */}
        <motion.g animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 60, damping: 14 }} style={{ transformOrigin: '110px 110px' }}>
          <line x1="110" y1="110" x2="110" y2="30" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="110" cy="110" r="7" fill={color} />
        </motion.g>
        <circle cx="110" cy="110" r="3" fill="#0b0f0d" />
        <text x="110" y="150" textAnchor="middle" fontSize="34" fontWeight="bold" fill="#fff" fontFamily="monospace">{fmt(value, value >= 100 ? 0 : 1)}</text>
        <text x="110" y="170" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="monospace">{unit}</text>
      </svg>
      <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-widest text-grey">{label}</p>
    </div>
  )
}

/* gráfica en vivo de muestras */
function Sparkline({ samples, color }: { samples: number[]; color: string }) {
  if (samples.length < 2) return <div className="h-16" />
  const max = Math.max(...samples) || 1
  const pts = samples.map((s, i) => `${(i / (samples.length - 1)) * 100},${32 - (s / max) * 30}`).join(' ')
  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="h-16 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,34 ${pts} 100,34`} fill={color} opacity="0.12" stroke="none" />
    </svg>
  )
}

/* ───────── motor de test ───────── */

interface RunnerHandle { abort: () => void }

function useSpeedTest(onPhase: (p: Phase) => void) {
  const ctrl = useRef<AbortController | null>(null)
  const [res, setRes] = useState<PhaseResult>({ ping: null, jitter: null, downMbps: null, upMbps: null })

  const run = useCallback(async (onSample: (p: 'ping' | 'download' | 'upload', mbps: number) => void) => {
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    const signal = ctrl.current.signal

    try {
      /* ── fase 1: ping ×10 ── */
      onPhase('ping')
      const pings: number[] = []
      for (let i = 0; i < 10; i++) {
        const t0 = performance.now()
        await fetch(TEST_URLS.ping, { cache: 'no-store', signal })
        pings.push(performance.now() - t0)
        onSample('ping', pings[pings.length - 1])
      }
      const ping = Math.min(...pings)
      const avg = pings.reduce((a, b) => a + b, 0) / pings.length
      const jitter = Math.sqrt(pings.reduce((a, b) => a + (b - avg) ** 2, 0) / pings.length)

      /* ── fase 2: download escalonado (2 MB → 25 MB) ── */
      onPhase('download')
      let downMbps = 0
      for (const mb of [2, 5, 10, 25]) {
        const t0 = performance.now()
        const r = await fetch(TEST_URLS.down(mb * 1024 * 1024), { cache: 'no-store', signal })
        const reader = r.body?.getReader()
        let bytes = 0
        const samples: number[] = []
        let lastT = performance.now()
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            bytes += value.byteLength
            const now = performance.now()
            if (now - lastT > 200) {
              const mbps = (bytes * 8) / ((now - t0) / 1000) / 1e6
              samples.push(mbps)
              onSample('download', mbps)
              lastT = now
            }
          }
        }
        const secs = (performance.now() - t0) / 1000
        downMbps = (bytes * 8) / secs / 1e6
        if (secs > 4) break // si ya tarda, no sigas con más tamaño
        if (samples.length) downMbps = samples.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, samples.slice(2).length) || downMbps
      }

      /* ── fase 3: upload (bloques aleatorios 2 MB ×3) ── */
      onPhase('upload')
      let upMbps = 0
      for (let i = 0; i < 3; i++) {
        const blob = new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'application/octet-stream' })
        const t0 = performance.now()
        await fetch(TEST_URLS.up, { method: 'POST', body: blob, signal })
        const secs = (performance.now() - t0) / 1000
        upMbps = Math.max(upMbps, (2 * 1024 * 1024 * 8) / secs / 1e6)
        onSample('upload', upMbps)
      }

      const final: PhaseResult = { ping, jitter, downMbps, upMbps }
      setRes(final)
      onPhase('done')
      return final
    } catch (e) {
      if ((e as Error).name === 'AbortError') { onPhase('idle'); return res }
      throw e
    }
  }, [onPhase, res])

  const abort = () => { ctrl.current?.abort(); onPhase('idle') }
  return { run, abort, res, setRes }
}

/* ───────── componente ───────── */

export default function SpeedTest() {
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('idle')
  const [live, setLive] = useState(0)
  const [samples, setSamples] = useState<Record<'ping' | 'download' | 'upload', number[]>>({ ping: [], download: [], upload: [] })
  const [final, setFinal] = useState<PhaseResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [delta, setDelta] = useState<number | null>(null)

  const onPhase = useCallback((p: Phase) => { setPhase(p); if (p === 'idle') setLive(0) }, [])
  const { run, abort } = useSpeedTest(onPhase)

  const start = async () => {
    setErr(null)
    setFinal(null)
    setSamples({ ping: [], download: [], upload: [] })
    setLive(0)
    try {
      const r = await run((p, mbps) => {
        setLive(mbps)
        setSamples((s) => ({ ...s, [p === 'upload' ? 'upload' : p]: [...s[p === 'upload' ? 'upload' : p], mbps] }))
      })
      setFinal(r)
      const prev = history
      const avgDown = prev.length ? prev.reduce((a, h) => a + h.down, 0) / prev.length : 0
      const entry: HistoryEntry = { t: Date.now(), ping: r.ping ?? 0, jitter: r.jitter ?? 0, down: r.downMbps ?? 0, up: r.upMbps ?? 0 }
      const nh = [entry, ...prev].slice(0, 12)
      setHistory(nh)
      setDelta(avgDown > 0 ? Math.round(((entry.down - avgDown) / avgDown) * 100) : null)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(nh)) } catch { /* noop */ }
      toast('Test completado')
    } catch (e) {
      setErr(`No se pudo completar el test: ${(e as Error).message}. Revisa la conexión o si un firewall bloquea speed.cloudflare.com.`)
      setPhase('idle')
    }
  }

  useEffect(() => () => abort(), []) // cleanup

  const maxDown = Math.max(100, Math.ceil(((final?.downMbps ?? live) * 1.2) / 50) * 50)
  const maxUp = Math.max(50, Math.ceil(((final?.upMbps ?? 0) * 1.2) / 25) * 25)
  const displayValue = phase === 'ping' ? (samples.ping.at(-1) ?? 0) : phase === 'download' ? live : phase === 'upload' ? live : (final?.downMbps ?? 0)

  const PHASE_LABEL: Record<Phase, string> = {
    idle: 'listo para testear',
    ping: 'midiendo latencia y jitter…',
    download: 'midiendo descarga…',
    upload: 'midiendo subida…',
    done: 'test completado',
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Gauge}
        title="Internet Speed Test"
        desc="Mide latencia, jitter, descarga y subida de tu conexión real con velocímetro animado — contra el edge de Cloudflare, sin servidores propios"
        badge="real"
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_320px]">
        <Reveal>
          <div className="card flex flex-col items-center p-6">
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full">
                <div className="flex flex-wrap justify-center gap-8">
                  <Speedo
                    value={displayValue}
                    max={phase === 'upload' ? maxUp : maxDown}
                    label={phase === 'ping' ? 'latencia (ms) — más bajo es mejor' : phase === 'upload' ? 'subida' : 'descarga'}
                    unit={phase === 'ping' ? 'ms' : 'Mbps'}
                    color={phase === 'ping' ? '#38bdf8' : phase === 'upload' ? '#a78bfa' : '#2ee88a'}
                  />
                  {phase === 'upload' && (
                    <Speedo value={live} max={maxUp} label="subida en curso" unit="Mbps" color="#a78bfa" />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex items-center gap-2">
              <Badge tone={phase === 'done' ? 'ok' : phase === 'idle' ? 'neutral' : 'accent'}>{PHASE_LABEL[phase]}</Badge>
              {phase !== 'idle' && phase !== 'done' && (
                <span className="flex h-4 items-end gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="w-1 rounded bg-acento" animate={{ height: [4, 14, 4] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </span>
              )}
            </div>

            {/* gráfica en vivo */}
            <div className="mt-5 w-full">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-edge bg-black/30 p-2">
                  <p className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-info"><Timer size={10} /> ping (ms)</p>
                  <Sparkline samples={samples.ping} color="#38bdf8" />
                </div>
                <div className="rounded-lg border border-edge bg-black/30 p-2">
                  <p className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ok"><Download size={10} /> descarga</p>
                  <Sparkline samples={samples.download} color="#2ee88a" />
                </div>
                <div className="rounded-lg border border-edge bg-black/30 p-2">
                  <p className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#a78bfa]"><Upload size={10} /> subida</p>
                  <Sparkline samples={samples.upload} color="#a78bfa" />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {phase === 'idle' || phase === 'done' ? (
                <Button onClick={start}>
                  {phase === 'done' ? <><RotateCcw size={14} /> repetir test</> : <><Play size={14} /> iniciar test</>}
                </Button>
              ) : (
                <Button variant="danger" onClick={abort}>detener</Button>
              )}
            </div>

            {err && <p className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-4 py-2.5 font-mono text-[11px] text-bad">{err}</p>}
          </div>
        </Reveal>

        {/* resultados */}
        <Reveal delay={0.06}>
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-grey">resultados</h3>
              <div className="space-y-2.5">
                {[
                  { k: 'Latencia mínima', v: fmt(final?.ping ?? null, 1), u: 'ms', tone: 'info' },
                  { k: 'Jitter', v: fmt(final?.jitter ?? null, 1), u: 'ms', tone: 'info' },
                  { k: 'Descarga', v: fmt(final?.downMbps ?? null), u: 'Mbps', tone: 'ok' },
                  { k: 'Subida', v: fmt(final?.upMbps ?? null), u: 'Mbps', tone: 'accent' },
                ].map((r) => (
                  <div key={r.k} className="flex items-baseline justify-between border-b border-edge/50 pb-2 last:border-0">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-grey">{r.k}</span>
                    <span className="font-mono text-lg font-bold text-white">{r.v} <span className="text-[11px] font-normal text-grey">{r.u}</span></span>
                  </div>
                ))}
              </div>
            </div>

            {final && (
              <div className="card p-5">
                <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-grey">veredicto</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 font-mono text-2xl font-extrabold"
                    style={{ borderColor: gradeFor(final).color, color: gradeFor(final).color, background: `${gradeFor(final).color}14` }}
                  >
                    {gradeFor(final).grade}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-white">{gradeFor(final).note}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10.5px] text-grey">
                      <span>simetría ↓/↑: <b className="text-ink">{(final.downMbps && final.upMbps ? (final.upMbps / final.downMbps) * 100 : 0).toFixed(0)}%</b></span>
                      {delta !== null && (
                        <span className={delta >= 0 ? 'text-ok' : 'text-bad'}>
                          <TrendingUp size={10} className="mr-0.5 inline" />{delta >= 0 ? '+' : ''}{delta}% vs tu media
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {useCases(final).map((u) => (
                    <div
                      key={u.name}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[10.5px] ${u.ok ? 'border-ok/30 bg-ok/5 text-ok' : 'border-edge bg-black/20 text-grey/60'}`}
                      title={u.req}
                    >
                      {u.ok ? <CheckCircle2 size={11} className="shrink-0" /> : <XCircle size={11} className="shrink-0" />}
                      <span className="truncate">{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-grey">historial ({history.length})</h3>
                  <button
                    onClick={() => { setHistory([]); setDelta(null); try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ } }}
                    title="borrar historial"
                    className="rounded p-1 text-grey transition-colors hover:text-bad"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="space-y-1">
                  {history.slice(0, 6).map((h, i) => (
                    <div key={h.t} className="flex items-center justify-between rounded-lg border border-edge/60 bg-black/20 px-3 py-1.5 font-mono text-[11px]">
                      <span className="text-grey">{new Date(h.t).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex gap-2.5">
                        <span className="text-ok">↓{h.down.toFixed(0)}</span>
                        <span className="text-[#a78bfa]">↑{h.up.toFixed(0)}</span>
                        <span className="text-info">{h.ping.toFixed(0)}ms</span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[9.5px] text-grey/50">guardado solo en tu navegador (localStorage) · i = más reciente</p>
              </div>
            )}

            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-grey">
                <Info size={12} /> cómo interpretarlo
              </h3>
              <ul className="space-y-2 text-[12px] leading-relaxed text-grey">
                <li><span className="text-acento">Ping &lt; 20 ms:</span> competitivo en gaming y videollamadas. 20-60 ms normal en fibra; &gt;100 ms se nota.</li>
                <li><span className="text-acento">Jitter &lt; 5 ms:</span> conexión estable. Jitter alto = cortes en llamadas aunque el ping medio sea bueno.</li>
                <li><span className="text-acento">Descarga:</span> para 4K se piden ~25 Mbps; con 100+ vives holgado aunque compartas WiFi.</li>
                <li><span className="text-acento">Subida:</span> la olvidada: videollamadas y backups dependen de ella. Con fibra debería ser simétrica o cercana.</li>
              </ul>
              <p className="mt-3 rounded-lg border border-edge bg-black/30 px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-grey/70">
                El test descarga desde el edge de Cloudflare (el CDN más cercano a ti): mide TU enlace, no un servidor lejano. Los resultados pueden variar ±10% entre ejecuciones por el propio protocolo TCP (slow start).
              </p>
            </div>

            <div className="card p-5">
              <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-grey">si los números no cuadran</h3>
              <ul className="space-y-1.5 text-[11.5px] text-grey">
                <li>▸ <b>WiFi vs cable:</b> el WiFi real suele ser 30-60% del contrato. Mide por cable para comparar.</li>
                <li>▸ <b>VPN activa:</b> el tráfico va al servidor VPN: miden ese túnel, no tu línea.</li>
                <li>▸ <b>Otros dispositivos</b> consumiendo (Netflix, Steam) comen el test.</li>
                <li>▸ <b>Router viejo:</b> puertos Fast Ethernet = 94 Mbps máximo, tengas la fibra que tengas.</li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
