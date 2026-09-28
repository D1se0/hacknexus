import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cable, Terminal as TerminalIcon, Radio, Square, ScanSearch, HelpCircle } from 'lucide-react'
import {
  Badge,
  Button,
  InfoBanner,
  KV,
  Reveal,
  ToolHeader,
} from '../components/ui'
import {
  type SerialCaps,
  FLIPPER_COMMANDS,
  FLIPPER_LESSONS,
  FLIPPER_LIMITS,
  SAMPLE_SUBGHZ_RX,
  FlipperSerial,
  parseSubGhzRx,
  serialCapabilities,
  simulateCommand,
} from '../lib/flipperterm'

type Tab = 'term' | 'parse' | 'ref'
const TABS: { id: Tab; label: string; icon: typeof TerminalIcon }[] = [
  { id: 'term', label: 'Terminal', icon: TerminalIcon },
  { id: 'parse', label: 'Parser subghz rx', icon: ScanSearch },
  { id: 'ref', label: 'Referencia', icon: HelpCircle },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

interface TermLine {
  text: string
  kind: 'in' | 'out' | 'err' | 'sys'
}

const LINE_COLOR: Record<TermLine['kind'], string> = {
  in: 'text-white',
  out: 'text-white/60',
  err: 'text-red-400',
  sys: 'text-acento',
}

const QUICK_CMDS = ['help', 'device_info', 'subghz rx 433920000', 'rfid read', 'nfc read', 'nrf sniff', 'ibtn read']

export default function FlipperTerm() {
  const [tab, setTab] = useState<Tab>('term')

  /* ---- Terminal simulada ---- */
  const [lines, setLines] = useState<TermLine[]>([
    { text: 'Flipper Zero CLI — simulador educativo (sin hardware). Escribe help.', kind: 'sys' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const simState = useRef({ uptime: 42 * 60000, battery: 87, firmware: 'hacknexus-sim 1.2 (Ronda 19)' })
  const termRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight })
  }, [lines])

  function pushLines(out: string[], kind: TermLine['kind']) {
    setLines((prev) => [...prev.slice(-300), ...out.map((text) => ({ text, kind }))])
  }

  const runSim = useCallback((raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    setLines((prev) => [...prev.slice(-300), { text: `>: ${cmd}`, kind: 'in' }])
    setHistory((h) => [cmd, ...h].slice(0, 50))
    setHistIdx(-1)
    const res = simulateCommand(cmd, simState.current)
    pushLines(res.output, res.kind === 'error' ? 'err' : 'out')
    simState.current.uptime += 5000
  }, [])

  /* ---- Serial real (Web Serial API) ---- */
  const caps: SerialCaps = serialCapabilities()
  const [serial, setSerial] = useState<FlipperSerial | null>(null)
  const [serialBusy, setSerialBusy] = useState(false)
  const serialRef = useRef<FlipperSerial | null>(null)

  async function connectSerial() {
    setSerialBusy(true)
    try {
      const term = new FlipperSerial({
        onLine: (line) => {
          setLines((prev) => [...prev.slice(-300), { text: line, kind: 'out' }])
        },
      })
      await term.connect()
      serialRef.current = term
      setSerial(term)
      pushLines([`✓ Puerto serial abierto a ${term.baudRate} baudios — los comandos se envían tal cual + CR`], 'sys')
    } catch (e) {
      pushLines([`✗ ${e instanceof Error ? e.message : 'no se pudo abrir el puerto'}`], 'err')
    } finally {
      setSerialBusy(false)
    }
  }

  function disconnectSerial() {
    serialRef.current?.disconnect()
    serialRef.current = null
    setSerial(null)
    pushLines(['Puerto serial cerrado'], 'sys')
  }

  function submit() {
    const cmd = input
    setInput('')
    if (serialRef.current?.isOpen) {
      setLines((prev) => [...prev.slice(-300), { text: `>: ${cmd}`, kind: 'in' }])
      void serialRef.current
        .send(cmd)
        .catch((e) => pushLines([e instanceof Error ? e.message : 'error de escritura'], 'err'))
    } else {
      runSim(cmd)
    }
  }

  function onTermKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      if (next >= 0) {
        setHistIdx(next)
        setInput(history[next]!)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = histIdx - 1
      setHistIdx(next)
      setInput(next >= 0 ? history[next]! : '')
    }
  }

  /* ---- Parser subghz ---- */
  const [rxDump, setRxDump] = useState(SAMPLE_SUBGHZ_RX)
  const parsed = useMemo(() => parseSubGhzRx(rxDump), [rxDump])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Cable}
        title="FlipperTerm"
        desc="Terminal para Flipper Zero vía Web Serial API con simulador educativo completo: comandos subghz/ir/nrf/rfid/nfc, parser de capturas y lecciones de radio insegura"
        badge="Ronda 19"
      />

      <InfoBanner>
        El Flipper Zero es un multi-herramienta de pentesting físico. Aquí tienes su CLI en un{' '}
        <b>simulador completo sin hardware</b> y, si usas Chrome/Edge de escritorio, conexión serial real. Todas las
        capturas del simulador son <b>ficticias</b> — la meta es entender por qué la radio de 433 MHz de tu garaje no
        es seguridad.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'term' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                {caps.available && !serial && (
                  <Button onClick={connectSerial} disabled={serialBusy} className="gap-2">
                    <Cable size={14} /> {serialBusy ? 'Abriendo puerto…' : 'Conectar Flipper real (USB)'}
                  </Button>
                )}
                {serial && (
                  <>
                    <Button variant="ghost" onClick={disconnectSerial} className="gap-2">
                      <Square size={14} /> Desconectar serial
                    </Button>
                    <Badge tone="ok">serial abierto @ {serial.baudRate} baud</Badge>
                  </>
                )}
                {!caps.available && <Badge tone="warn">{caps.reason}</Badge>}
              </div>
              <div
                ref={termRef}
                className="mt-3 h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs leading-5"
              >
                {lines.map((l, i) => (
                  <div key={i} className={`whitespace-pre-wrap ${LINE_COLOR[l.kind]}`}>
                    {l.text}
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <input
                  className={inputCls}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onTermKeyDown}
                  placeholder="help · subghz rx 433920000 · rfid read …"
                  spellCheck={false}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_CMDS.map((c) => (
                  <button
                    key={c}
                    onClick={() => runSim(c)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 transition-colors hover:border-acento/50 hover:text-white"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'parse' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <p className="mb-2 text-xs text-white/60">
                Pega la salida de «subghz rx» (CLI del Flipper) y extrae frecuencia, protocolo y claves capturadas:
              </p>
              <textarea
                className={`${inputCls} font-mono text-xs`}
                rows={7}
                value={rxDump}
                onChange={(e) => setRxDump(e.target.value)}
                spellCheck={false}
              />
              <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                <KV k="Frecuencia" v={parsed.frequency ?? '—'} />
                <KV k="Modulación" v={parsed.modulation ?? '—'} />
              </div>
              {parsed.captures.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Capturas ({parsed.captures.length})</p>
                  {parsed.captures.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
                      <Badge tone="info">{c.protocol}</Badge>
                      <span className="font-mono text-white/70">{c.key ?? 'sin clave'}</span>
                      {c.bitLen !== undefined && <span className="text-white/40">{c.bitLen} bits</span>}
                      <span className="text-white/40">@ {c.freq}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
                Una clave de 24 bits en fixed-code es reenviable y forceable: esto es lo que ve un atacante con un
                dispositivo de 50€. Rolling code (KeeLoq) evita el replay — pero no el rolljam.
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'ref' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="mb-3 flex items-center gap-2">
                <Radio size={16} className="text-acento" />
                <h3 className="text-sm font-semibold">Comandos del CLI (referencia educativa)</h3>
              </div>
              <div className="space-y-2">
                {FLIPPER_COMMANDS.map((c) => (
                  <div key={c.cmd} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <code className="text-sm font-semibold text-acento">{c.cmd}</code>
                    <p className="mt-1 text-xs text-white/60">{c.desc}</p>
                    {c.danger && <p className="mt-1 text-xs text-warn">⚠ {c.danger}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">Lecciones de radio insegura</h3>
              <div className="space-y-2">
                {FLIPPER_LESSONS.map((l) => (
                  <div key={l.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <span className="text-sm font-semibold">{l.title}</span>
                    <p className="mt-1 text-xs text-white/60">{l.lesson}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
              <div className="space-y-1">
                {FLIPPER_LIMITS.map((l, i) => (
                  <p key={i} className="text-xs text-white/60">▸ {l}</p>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
