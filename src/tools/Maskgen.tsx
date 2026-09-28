import { useMemo, useState } from 'react'
import { Wand2, Play, AlertTriangle } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, CopyBlock, InfoBanner, Reveal, KV } from '../components/ui'
import { parseMask, maskStats, maskSamples, MASK_HELP } from '../lib/passforge'

const PRESETS = [
  { mask: '?u?l?l?l?l?l?d?d?d?d', label: 'Capital + 6 minúsculas + año' },
  { mask: '?u?l?l?l?l?l?l?d?d?d?d?d?d?d', label: 'Nombre largo + 7 dígitos' },
  { mask: '?d?d?d?d?d?d', label: 'PIN de 6' },
  { mask: '?d?d?d?d?d?d?d?d', label: 'PIN de 8' },
  { mask: '?u?l?l?l?l?l?l?l?s?d?d', label: 'Palabra + símbolo + 2 dígitos' },
  { mask: '?h?h?h?h?h?h?h?h', label: 'hex de 32 bits' },
]

export default function Maskgen() {
  const [mask, setMask] = useState('?u?l?l?l?l?l?d?d?d?d')
  const stats = useMemo(() => maskStats(mask), [mask])
  const [tick, setTick] = useState(0)
  const samples = useMemo(() => maskSamples(mask, 12), [mask, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const error = 'error' in stats ? stats.error : null
  const ok = stats as Exclude<typeof stats, { error: string }>

  return (
    <div>
      <ToolHeader icon={Wand2} title="Mask Gen" badge="HASHCAT" desc="Diseña máscaras de contraseñas estilo hashcat (?u?l?d?s), mide el keyspace exacto y genera candidatos de ejemplo al instante." />

      <InfoBanner>
        Las máscaras son la forma <b>dirigida</b> de hacer fuerza bruta: en vez de probar todo, prueban el patrón que la gente realmente usa (<code className="font-mono">Mayúscula+palabra+año</code>). Esta tool calcula si tu patrón es viable <b>y</b> te enseña a evaluar qué tan débiles son los patrones que estás auditando.
      </InfoBanner>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Reveal>
          <div className="card space-y-4 p-5">
            <Field label="Máscara" hint="?u ?l ?d ?s ?h ?a ?b">
              <TextInput value={mask} onChange={(e) => setMask(e.target.value)} placeholder="?u?l?l?l?l?l?d?d?d?d" spellCheck={false} />
            </Field>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.mask}
                  onClick={() => setMask(p.mask)}
                  className="rounded-md border border-edge bg-black/30 px-2 py-1 font-mono text-[10px] text-grey transition-colors hover:border-acento/50 hover:text-acento"
                  title={p.mask}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-edge/60 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-grey">
              {MASK_HELP.map((h) => (
                <div key={h.token}><span className="text-acento">{h.token}</span> — {h.desc}</div>
              ))}
            </div>

            <Button className="w-full" onClick={() => setTick((t) => t + 1)}>
              <Play size={14} /> Regenerar muestras
            </Button>
          </div>
        </Reveal>

        <div className="space-y-4">
          {error ? (
            <Reveal>
              <div className="card flex items-center gap-3 border-bad/40 p-5 text-sm text-bad">
                <AlertTriangle size={18} /> {error}
              </div>
            </Reveal>
          ) : (
            <>
              <Reveal delay={0.05}>
                <div className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-mono text-sm uppercase tracking-widest text-grey">Keyspace</h2>
                    <Badge tone={ok.keyspace < 1e6 ? 'bad' : ok.keyspace < 1e12 ? 'warn' : 'ok'}>
                      {ok.badIdea.length === 0 ? 'sin avisos' : `${ok.badIdea.length} avisos`}
                    </Badge>
                  </div>
                  <div className="mt-3 font-mono text-3xl font-extrabold text-acento">{ok.keyspace.toExponential(3).replace('e+', '×10^')}</div>
                  <div className="mt-1 font-mono text-xs text-grey">≈ 10^{ok.exponent.toFixed(1)} candidatos · {ok.atoms.length} átomos</div>

                  <div className="mt-4 space-y-1">
                    <KV k="estructura" v={ok.atoms.map((a) => a.token).join(' ')} />
                    <KV k="comando hashcat" v={<span className="text-acento">{ok.hashcatHint}</span>} copyable />
                  </div>

                  {ok.badIdea.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {ok.badIdea.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-[11px] text-warn">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="card p-5">
                  <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-grey">Desglose átomo a átomo</h2>
                  <div className="space-y-1">
                    {ok.atoms.map((a, i) => (
                      <KV key={i} k={a.token} v={<span className="text-grey">{a.desc} · {a.size === 256 ? '256 valores' : `${a.size} valores`}</span>} />
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.15}>
                <CopyBlock label="muestras generadas" text={samples.join('\n')} maxH="max-h-48" />
              </Reveal>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
