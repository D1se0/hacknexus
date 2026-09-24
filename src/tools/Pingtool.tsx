import { useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ToolHeader, Field, TextInput, Button, Reveal, ErrorBox, InfoBanner, Badge } from '../components/ui'
import { httpPing, type PingResult } from '../lib/netapi'

export default function Pingtool() {
  const [target, setTarget] = useState('https://github.com')
  const [count, setCount] = useState(8)
  const [res, setRes] = useState<PingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const ping = async () => {
    setLoading(true)
    setErr(null)
    setRes(null)
    try {
      const r = await httpPing(target, count)
      setRes(r)
      if (!r.samples.length) setErr('Sin respuesta: el host no responde o el navegador bloqueó las peticiones')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const maxMs = res ? Math.max(...res.samples, 1) : 1

  return (
    <div>
      <ToolHeader icon={Activity} title="Ping & Latencia web" desc="Mide latencia HTTP real desde tu navegador con estadísticas min/avg/max y gráfica de barras" />

      <InfoBanner>
        Es «ping» HTTP: mide RTT de peticiones <span className="font-mono">HEAD</span> (incluye handshake TLS de la primera), no ICMP.
        Útil para comparar latencias entre endpoints desde tu ubicación.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <Field label="Objetivo" hint="url o host">
            <div className="flex gap-2">
              <TextInput value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ping()} className="font-mono" placeholder="https://objetivo.com" />
              <Button onClick={ping} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : `ping ×${count}`}
              </Button>
            </div>
          </Field>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-grey">nº pings</span>
            <input type="range" min={3} max={30} value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-48 accent-[#2ee88a]" />
            <span className="font-mono text-sm font-bold text-acento">{count}</span>
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {res && res.samples.length > 0 && (
        <Reveal>
          <div className="card mt-6 p-6">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: 'min', v: `${res.min.toFixed(1)} ms`, tone: 'ok' as const },
                { l: 'avg', v: `${res.avg.toFixed(1)} ms`, tone: 'accent' as const },
                { l: 'max', v: `${res.max.toFixed(1)} ms`, tone: 'warn' as const },
                { l: 'pérdida', v: `${Math.round((res.lost / res.sent) * 100)}% (${res.lost}/${res.sent})`, tone: res.lost ? ('bad' as const) : ('ok' as const) },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-edge bg-black/30 p-4 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-grey">{s.l}</div>
                  <div className="mt-1 font-mono text-lg font-bold text-acento">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="flex h-40 items-end gap-1 rounded-xl border border-edge bg-black/40 p-4">
              {res.samples.map((ms, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, (ms / maxMs) * 100)}%` }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: 'easeOut' }}
                  title={`${ms.toFixed(1)} ms`}
                  className="group relative flex-1 rounded-t bg-gradient-to-t from-acento/40 to-acento"
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-acento opacity-0 transition-opacity group-hover:opacity-100">
                    {ms.toFixed(0)}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-grey">
              <span>seq 1</span>
              <span>{res.samples.length} muestras · max {maxMs.toFixed(0)} ms</span>
            </div>

            {res.lost > 0 && (
              <p className="mt-3 font-mono text-xs text-bad">⚠ {res.lost} peticiones fallidas (timeout/firewall). Un firewall no devuelve ICMP pero sí puede descartar HTTP.</p>
            )}
            {res.finalUrl && <p className="mt-2 font-mono text-[10px] text-grey">URL final: {res.finalUrl}</p>}
            <div className="mt-3 flex gap-2">
              <Badge tone="info">modo: HTTP HEAD</Badge>
              <Badge tone="neutral">sin ICMP desde el navegador</Badge>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
