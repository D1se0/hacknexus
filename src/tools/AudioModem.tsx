import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, Play, Square, Mic, Volume2, Signal } from 'lucide-react'
import {
  Badge,
  Button,
  InfoBanner,
  KV,
  Reveal,
  TextArea,
  ToolHeader,
} from '../components/ui'
import {
  BAUD,
  FREQ_0,
  FREQ_1,
  MODEM_LIMITS,
  MODEM_LESSONS,
  MODEM_PROFILES,
  LiveReceiver,
  fskModulate,
  fskDemodulate,
  frameMessage,
} from '../lib/audiomodem'

type Tab = 'send' | 'receive' | 'test'
const TABS: { id: Tab; label: string; icon: typeof Play }[] = [
  { id: 'send', label: 'Transmitir', icon: Volume2 },
  { id: 'receive', label: 'Recibir', icon: Mic },
  { id: 'test', label: 'Loopback', icon: Signal },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

export default function AudioModem() {
  const [tab, setTab] = useState<Tab>('test')
  const [profile, setProfile] = useState(0)
  const prof = MODEM_PROFILES[profile]!

  /* Emisor */
  const [message, setMessage] = useState('HackNexus: datos sin red, por el aire.')
  const [txState, setTxState] = useState<'idle' | 'sending'>('idle')
  const ctxRef = useRef<AudioContext | null>(null)
  const stopRef = useRef(false)

  const bits = useMemo(() => {
    try {
      return { ok: true as const, bits: frameMessage(message) }
    } catch (e) {
      return { ok: false as const, bits: '', err: e instanceof Error ? e.message : 'Error trama' }
    }
  }, [message])

  async function transmit() {
    if (!bits.ok || txState === 'sending') return
    const ctx = ctxRef.current ?? new AudioContext()
    ctxRef.current = ctx
    await ctx.resume()
    setTxState('sending')
    stopRef.current = false
    // 3 repeticiones para que el receptor se sincronice aunque llegue a mitad
    const reps = 3
    const buffers: AudioBuffer[] = []
    for (let r = 0; r < reps; r++) {
      const pcm = fskModulate(bits.bits, prof.baud, prof.f0, prof.f1)
      const buf = ctx.createBuffer(1, pcm.length, 44100)
      buf.copyToChannel(pcm, 0)
      buffers.push(buf)
    }
    for (const buf of buffers) {
      if (stopRef.current) break
      await new Promise<void>((resolve) => {
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.onended = () => resolve()
        src.connect(ctx.destination)
        src.start()
      })
    }
    setTxState('idle')
  }

  function stopTx() {
    stopRef.current = true
    ctxRef.current?.close()
    ctxRef.current = null
    setTxState('idle')
  }

  useEffect(() => () => {
    stopRef.current = true
    ctxRef.current?.close()
  }, [])

  /* Receptor en vivo */
  const [rxState, setRxState] = useState<'idle' | 'listening'>('idle')
  const [rxInfo, setRxInfo] = useState({ bits: 0, energy: 0, message: '', checksumOk: null as boolean | null })
  const rxRef = useRef<{ ctx: AudioContext; stream: MediaStream; rx: LiveReceiver; timer: number } | null>(null)

  async function startRx() {
    if (rxState === 'listening') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
      const ctx = new AudioContext()
      await ctx.resume()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      src.connect(analyser)
      const rx = new LiveReceiver(analyser, prof.baud, prof.f0, prof.f1)
      const timer = window.setInterval(() => {
        rx.tick()
        setRxInfo({ bits: rx.bitsReceived, energy: rx.energy, message: rx.message, checksumOk: rx.checksumOk })
      }, 100)
      rxRef.current = { ctx, stream, rx, timer }
      setRxState('listening')
    } catch {
      setRxInfo({ bits: 0, energy: 0, message: 'Micrófono denegado o no disponible', checksumOk: null })
    }
  }

  function stopRx() {
    const r = rxRef.current
    if (r) {
      clearInterval(r.timer)
      r.stream.getTracks().forEach((t) => t.stop())
      r.ctx.close()
      rxRef.current = null
    }
    setRxState('idle')
  }

  /* Loopback interno (sin audio real: PCM → demodulador directo) */
  const [loopResult, setLoopResult] = useState<string>('')
  function runLoopback() {
    try {
      const bitsStr = frameMessage(message)
      const pcm = fskModulate(bitsStr, prof.baud, prof.f0, prof.f1)
      // ruido blanco suave para estresar el canal
      const noisy = new Float32Array(pcm.length)
      for (let i = 0; i < pcm.length; i++) noisy[i] = pcm[i] + (Math.random() - 0.5) * 0.02
      const t0 = performance.now()
      const res = fskDemodulate(noisy, prof.baud, prof.f0, prof.f1)
      const ms = (performance.now() - t0).toFixed(0)
      setLoopResult(
        `✓ "${res.text}"\nchecksum: ${res.checksumOk ? 'OK' : 'FALLO'} · bits: ${res.bits} · calidad: ${(res.quality * 100).toFixed(0)}% · demodulado en ${ms} ms`,
      )
    } catch (e) {
      setLoopResult(`✗ ${e instanceof Error ? e.message : 'error'}`)
    }
  }


  return (
    <div className="space-y-6">
      <ToolHeader
        icon={AudioLines}
        title="AudioModem"
        desc="Exfiltración y datos por el aire: FSK audible con la Web Audio API, receptor Goertzel en vivo por micrófono, corrección Hamming(8,4) y preámbulo sincronizador — el canal de los air-gaps"
        badge="Ronda 19"
      />

      <InfoBanner>
        Sin Wi-Fi, sin cable, sin Bluetooth: <b>dos tonos audibles</b> transportan bits. Es el principio del módem de
        56k y de la exfiltración por air-gap. El modo Loopback demodula en local para ver la cadena completa; el modo
        Recibir escucha tu micrófono. <b>El canal es de difusión: cualquiera en la sala oye lo mismo.</b>
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-panel p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Mensaje (máx 255 bytes)</label>
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Perfil del módem</label>
            <select className={inputCls} value={profile} onChange={(e) => setProfile(Number(e.target.value))}>
              {MODEM_PROFILES.map((p, i) => (
                <option key={p.name} value={i}>{p.name}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-white/50">{prof.note}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">{prof.baud} baud</Badge>
              <Badge tone="info">f0={prof.f0} Hz</Badge>
              <Badge tone="info">f1={prof.f1} Hz</Badge>
              <Badge tone="info">{(bits.bits.length / prof.baud).toFixed(1)} s de transmisión ×3</Badge>
            </div>
          </div>
        </div>
      </div>

      {tab === 'send' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={transmit} disabled={!bits.ok || txState === 'sending'} className="gap-2">
                  <Play size={14} /> {txState === 'sending' ? 'Transmitiendo…' : 'Transmitir por el altavoz (×3)'}
                </Button>
                {txState === 'sending' && (
                  <Button variant="ghost" onClick={stopTx} className="gap-2">
                    <Square size={14} /> Parar
                  </Button>
                )}
              </div>
              {bits.ok && (
                <div className="mt-3 space-y-1 text-xs text-white/60">
                  <p>Trama: preámbulo 0101… ×8 + SOH + longitud + payload Hamming(8,4) + checksum XOR</p>
                  <p className="font-mono break-all text-white/40">{bits.bits.slice(0, 96)}… ({bits.bits.length} bits)</p>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-xs text-info">
              Sube el volumen al 80% y reproduce: el modo «Recibir» de otro dispositivo (o de este mismo, con
              auriculares para evitar eco) decodificará el mensaje. Prueba también grabar la salida y demodularla.
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'receive' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="flex flex-wrap gap-3">
                {rxState === 'idle' ? (
                  <Button onClick={startRx} className="gap-2">
                    <Mic size={14} /> Escuchar micrófono
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={stopRx} className="gap-2">
                    <Square size={14} /> Parar
                  </Button>
                )}
                {rxState === 'listening' && <Badge tone="ok">escuchando…</Badge>}
              </div>
              {rxState === 'listening' && (
                <div className="mt-3 space-y-2">
                  <div className="grid gap-x-6 sm:grid-cols-3">
                    <KV k="Bits recibidos" v={String(rxInfo.bits)} />
                    <KV k="Energía (señal)" v={rxInfo.energy > 0.001 ? 'presente' : 'silencio'} />
                    <KV k="Checksum" v={rxInfo.checksumOk === null ? '—' : rxInfo.checksumOk ? 'OK' : 'FALLO'} />
                  </div>
                  {rxInfo.message && (
                    <div className="rounded-lg border border-acento/40 bg-acento/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Mensaje recibido</p>
                      <p className="mt-1 font-mono text-sm text-acento">{rxInfo.message}</p>
                    </div>
                  )}
                  <div className="h-2 w-full overflow-hidden rounded bg-white/5">
                    <div className="h-full bg-acento transition-all" style={{ width: `${Math.min(100, rxInfo.energy * 2000)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'test' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <p className="mb-3 text-xs text-white/60">
                Demodulación en local con ruido blanco añadido: demuestra la cadena completa (bits → PCM → Goertzel →
                bits → Hamming → texto) sin depender del hardware de audio.
              </p>
              <Button onClick={runLoopback} className="gap-2">
                <Signal size={14} /> Ejecutar loopback
              </Button>
              {loopResult && <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs text-acento">{loopResult}</pre>}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <AudioLines size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones del canal acústico</h3>
          </div>
          <div className="space-y-2">
            {MODEM_LESSONS.map((l) => (
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
            {MODEM_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
