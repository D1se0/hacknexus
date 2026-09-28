import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Eraser, Bot, User, Gauge, Play } from 'lucide-react'
import {
  Badge,
  Button,
  InfoBanner,
  KV,
  Reveal,
  ToolHeader,
} from '../components/ui'
import {
  type KeyEvent,
  analyzeSession,
  type KeystrokeProfile,
  simulateBot,
  simulateHuman,
  BIOMETRICS_LESSONS,
  BIOMETRICS_LIMITS,
} from '../lib/biometrics'

type Tab = 'live' | 'demo'
const TABS: { id: Tab; label: string; icon: typeof Play }[] = [
  { id: 'live', label: 'Captura en vivo', icon: Keyboard },
  { id: 'demo', label: 'Humano vs Bot', icon: Bot },
]

function verdictBadge(v: KeystrokeProfile['verdict']) {
  switch (v) {
    case 'human':
      return <Badge tone="ok">humano</Badge>
    case 'suspect':
      return <Badge tone="warn">sospechoso</Badge>
    case 'bot':
      return <Badge tone="bad">bot</Badge>
    default:
      return <Badge tone="info">datos insuficientes</Badge>
  }
}

function ProfileCard({ p, title }: { p: KeystrokeProfile; title: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {verdictBadge(p.verdict)}
      </div>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <KV k="WPM" v={String(p.wpm)} />
        <KV k="Flight medio" v={`${p.flightMean} ms (±${p.flightSd})`} />
        <KV k="Dwell medio" v={`${p.dwellMean} ms (±${p.dwellSd})`} />
        <KV k="Variación (CV)" v={p.flightMean > 0 ? `${((p.flightSd / p.flightMean) * 100).toFixed(0)}%` : '—'} />
        <KV k="Ritmo (metrónomo)" v={`${p.rhythmScore}/100`} />
        <KV k="Puntuación bot" v={`${p.botScore}/100`} />
      </div>
      {p.pairProfiles.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Digrafos dominantes</p>
          <div className="flex flex-wrap gap-2">
            {p.pairProfiles.map((pp) => (
              <Badge key={pp.pair} tone={pp.rhythm === 'metrónomo' ? 'bad' : 'info'}>
                «{pp.pair}» {pp.flightMean}ms ×{pp.n}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {p.keyProfiles.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Teclas más pulsadas (dwell)</p>
          <div className="space-y-1">
            {p.keyProfiles.slice(0, 6).map((kp) => (
              <div key={kp.key} className="flex items-center gap-2 text-xs">
                <span className="w-8 rounded bg-white/10 px-1 text-center font-mono">{kp.key === ' ' ? '␣' : kp.key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-white/5">
                  <div className="h-full bg-acento/70" style={{ width: `${Math.min(100, (kp.dwellMean / 250) * 100)}%` }} />
                </div>
                <span className="w-28 text-right text-white/50">{kp.dwellMean} ms ×{kp.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Biometrics() {
  const [tab, setTab] = useState<Tab>('live')

  /* ---- Captura en vivo ---- */
  const [events, setEvents] = useState<KeyEvent[]>([])
  const [liveText, setLiveText] = useState('')
  const [profile, setProfile] = useState<KeystrokeProfile | null>(null)
  const startRef = useRef<number | null>(null)
  const captureRef = useRef<HTMLDivElement | null>(null)

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      if (startRef.current === null) startRef.current = performance.now()
      setEvents((prev) => [...prev.slice(-400), { key: e.key.length === 1 ? e.key : '\n', down: performance.now() }])
      if (e.key.length === 1) setLiveText((t) => t + e.key)
      else if (e.key === 'Backspace') setLiveText((t) => t.slice(0, -1))
      else setLiveText((t) => t + '\n')
    }
  }, [])

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    const k = e.key.length === 1 ? e.key : `\n`
    setEvents((prev) => {
      // marca el último evento sin up de esa tecla
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i]!.key === k && prev[i]!.up === undefined) {
          const copy = [...prev]
          copy[i] = { ...copy[i]!, up: performance.now() }
          return copy
        }
      }
      return prev
    })
  }, [])

  function resetCapture() {
    setEvents([])
    setLiveText('')
    setProfile(null)
    startRef.current = null
  }

  /* ---- Demo bot vs humano ---- */
  const demoText = 'el ataque silencioso llega sin ruido desde el norte'
  const [demoRun, setDemoRun] = useState(false)

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Keyboard}
        title="Biometrics"
        desc="Biometría conductual del teclado: dwell y flight time por pulsación, perfil estadístico de tu escritura y detección de bots por ritmo — el MFA invisible de los bancos"
        badge="Ronda 19"
      />

      <InfoBanner>
        Cada tecla que pulsas trae dos huellas temporales: <b>dwell</b> (cuánto dura pulsada) y <b>flight</b> (el vuelo
        hasta la siguiente). Juntas forman un patrón tan personal como una firma. Todo se captura y analiza{' '}
        <b>en tu navegador</b> — nada sale de esta página.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'live' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <p className="mb-2 text-xs text-white/60">
                Escribe unas 2-3 frases con naturalidad (mínimo ~40 caracteres). No escribas contraseñas reales.
              </p>
              <div
                ref={captureRef}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                className="cursor-text rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-acento/60"
              >
                {liveText || <span className="text-white/30">Haz clic aquí y escribe…</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setProfile(analyzeSession(events, startRef.current ?? undefined))}
                  disabled={events.length < 12}
                  className="gap-2"
                >
                  <Gauge size={14} /> Analizar patrón ({events.length} eventos)
                </Button>
                <Button variant="ghost" onClick={resetCapture} className="gap-2">
                  <Eraser size={14} /> Reiniciar
                </Button>
                {profile && verdictBadge(profile.verdict)}
              </div>
            </div>
            {profile && <ProfileCard p={profile} title="Tu perfil de escritura" />}
          </div>
        </Reveal>
      )}

      {tab === 'demo' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <p className="mb-3 text-xs text-white/60">
                El mismo texto escrito por un humano simulado (variabilidad natural) y por un bot (intervalos
                perfectamente constantes). Observa cómo salta el detector:
              </p>
              <Button onClick={() => setDemoRun(true)} className="gap-2">
                <Play size={14} /> Ejecutar simulación
              </Button>
            </div>
            {demoRun && (
              <>
                <ProfileCard p={analyzeSession(simulateHuman(demoText))} title="🧑 Humano simulado" />
                <ProfileCard p={analyzeSession(simulateBot(demoText))} title="🤖 Bot simulado" />
                <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-xs text-warn">
                  El bot tiene variación ≈ 0% (metrónomo perfecto) y el humano 30-60%: ese único número es el detector
                  más barato de credential stuffing.
                </div>
              </>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <User size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones de la biometría conductual</h3>
          </div>
          <div className="space-y-2">
            {BIOMETRICS_LESSONS.map((l) => (
              <div key={l.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <span className="text-sm font-semibold">{l.title}</span>
                <p className="mt-1 text-xs text-white/60">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {BIOMETRICS_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
