import { useState } from 'react'
import { motion } from 'framer-motion'
import { Hourglass, Play, AlertTriangle, CheckCircle2, FlaskConical, Timer } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, Reveal, InfoBanner } from '../components/ui'
import { staticAnalysis, runDynamic, DEMOS, type DynamicResult, type StaticFinding } from '../lib/redos'

const sevTone = (s: StaticFinding['severity']): 'bad' | 'warn' | 'info' => (s === 'alta' ? 'bad' : s === 'media' ? 'warn' : 'info')
const GROWTH_COLOR: Record<DynamicResult['growth'], string> = {
  exponencial: '#f43f5e',
  polinómico: '#f59e0b',
  lineal: '#2ee88a',
  insuficiente: '#38bdf8',
  error: '#64748b',
}

export default function Redos() {
  const [pattern, setPattern] = useState('^(a+)+$')
  const [flags, setFlags] = useState('')
  const [unit, setUnit] = useState('a')
  const [suffix, setSuffix] = useState('!')
  const [dyn, setDyn] = useState<DynamicResult | null>(null)
  const [running, setRunning] = useState(false)

  const findings = staticAnalysis(pattern)

  const analyze = async () => {
    setRunning(true)
    setDyn(null)
    try {
      setDyn(await runDynamic(pattern, { flags, unit, suffix }))
    } finally {
      setRunning(false)
    }
  }

  const maxMs = dyn ? Math.max(...dyn.samples.map((s) => s.ms), 1) : 1

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Hourglass}
        title="Regex ReDOS Analyzer"
        desc="Detecta backtracking catastrófico en tus expresiones regulares: análisis estructural + medición del tiempo real de matching en un worker — antes de que un input de 50 KB tumbe tu API"
        badge="DoS"
      />

      <InfoBanner>
        Un regex con backtracking exponencial es un <b>DoS sin ancho de banda</b>: una sola petición valida un input crafted y el worker no responde en minutos. Se explota en login, validadores de email, parsers de logs y WAFs caseros.
      </InfoBanner>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* input + estático */}
        <Reveal>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
              <AlertTriangle size={15} className="text-warn" /> patrón a analizar
            </h3>
            <Field label="regex" hint="sintaxis JavaScript">
              <TextInput value={pattern} onChange={(e) => { setPattern(e.target.value); setDyn(null) }} className="py-2.5 font-mono text-sm" />
            </Field>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Field label="flags"><TextInput value={flags} onChange={(e) => setFlags(e.target.value)} className="py-2 text-xs" placeholder="gims" /></Field>
              <Field label="carácter repetido"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} className="py-2 text-xs" /></Field>
              <Field label="sufijo que falla"><TextInput value={suffix} onChange={(e) => setSuffix(e.target.value)} className="py-2 text-xs" /></Field>
            </div>
            <Button onClick={analyze} disabled={running || !pattern} className="mt-4 w-full">
              {running ? <><Timer size={14} className="animate-pulse" /> midiendo en worker…</> : <><Play size={14} /> analizar y medir</>}
            </Button>

            <div className="mt-5 space-y-2">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-grey">análisis estructural</h4>
              {findings.map((f, i) => (
                <motion.div key={f.title + i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-lg border border-edge bg-black/30 p-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={sevTone(f.severity)}>{f.severity}</Badge>
                    <span className="font-mono text-[11.5px] font-bold text-white">{f.title}</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-grey">{f.detail}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* dinámico */}
        <div className="min-w-0 space-y-4">
          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
                <FlaskConical size={15} className="text-acento" /> medición dinámica
              </h3>
              {!dyn && <p className="text-[12.5px] leading-relaxed text-grey">{running ? 'Midiendo el matching con entradas cada vez más grandes (256 → 67M chars) en un worker aislado…' : 'Pulsa «analizar y medir»: cada punto duplica+octuplica el input y mide el tiempo real de matching. Si el tiempo explota, tu regex es explotable.'}</p>}
              {dyn && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: GROWTH_COLOR[dyn.growth] }} />
                    <Badge tone={dyn.growth === 'exponencial' ? 'bad' : dyn.growth === 'polinómico' ? 'warn' : dyn.growth === 'lineal' ? 'ok' : 'info'}>{dyn.growth}</Badge>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-grey">{dyn.verdict}</p>
                  {dyn.error && <p className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 font-mono text-[11px] text-bad">{dyn.error}</p>}
                  {dyn.samples.length > 0 && (
                    <div className="space-y-1.5">
                      {dyn.samples.map((s) => (
                        <div key={s.size} className="flex items-center gap-2">
                          <span className="w-24 shrink-0 font-mono text-[10px] text-grey">{s.size.toLocaleString('es-ES')} chars</span>
                          <div className="h-4 min-w-0 flex-1 overflow-hidden rounded bg-black/40">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, (s.ms / maxMs) * 100)}%` }}
                              className="h-full rounded"
                              style={{ background: GROWTH_COLOR[dyn.growth] }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right font-mono text-[10px] text-ink">{s.timedOut ? 'TIMEOUT' : `${s.ms} ms`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="font-mono text-[10px] text-grey/60">timeout por muestra: 1.5 s · cada paso multiplica el input ×8</p>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">explosivos clásicos (y su cura)</h3>
              <div className="space-y-2">
                {DEMOS.map((d) => (
                  <div key={d.name} className="rounded-lg border border-edge bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11.5px] font-bold text-ink">{d.name}</span>
                      <Button variant="ghost" className="!px-2 !py-1 !text-[10px]" onClick={() => { setPattern(d.pattern); setUnit(d.unit); setSuffix(d.suffix); setDyn(null) }}>
                        cargar
                      </Button>
                    </div>
                    <code className="mt-1 block break-all font-mono text-[10.5px] text-acento">{d.pattern}</code>
                    <p className="mt-1.5 flex gap-1.5 text-[11px] leading-snug text-grey"><CheckCircle2 size={12} className="mt-0.5 shrink-0 text-ok" />{d.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
