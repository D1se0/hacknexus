import { useMemo, useState } from 'react'
import { Swords } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, Field, TextInput, Reveal, InfoBanner } from '../components/ui'
import { searchGtfobins, gtfobinVerdict, FUNC_INFO, CTX_INFO, GTFO_STATS, GTFO_NOTES, GTFO_METHOD, type GtfFunc, type GtfResult } from '../lib/gtfobins'
import { cn } from '../lib/util'

const FUNC_IDS = Object.keys(FUNC_INFO) as GtfFunc[]

function ContextBadge({ ctx, value }: { ctx: string; value: string | boolean | null | undefined }) {
  if (value === null || value === undefined) return null
  const label = ctx === 'sudo' ? 'sudo' : ctx === 'suid' ? 'SUID' : ctx === 'capabilities' ? 'caps' : ctx
  return <Badge tone="accent">{label}</Badge>
}

function BinDetail({ r }: { r: GtfResult }) {
  const v = gtfobinVerdict(r.name)!
  const tone = v.risk === 'crítico' ? 'bad' : v.risk === 'alto' ? 'warn' : 'info'
  return (
    <div className="mt-2 border-t border-edge pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={tone as 'bad' | 'warn' | 'info'}>riesgo: {v.risk}</Badge>
        <span className="text-xs text-grey">{v.summary}</span>
      </div>
      <div className="space-y-3">
        {Object.entries(r.bin.functions).map(([fname, entries]) => {
          const info = FUNC_INFO[fname as GtfFunc]
          return (
            <div key={fname} className="rounded border border-edge bg-black/40 p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span>{info?.icon ?? '•'}</span>
                <span className="font-mono text-xs font-bold text-ink">{info?.label ?? fname}</span>
                {info && <span className="text-[11px] text-grey/70">{info.desc}</span>}
                {info?.mitre.map((m) => <span key={m} className="rounded border border-edge px-1 font-mono text-[9px] text-grey">{m}</span>)}
              </div>
              <div className="space-y-2">
                {entries.map((e, i) => (
                  <div key={i} className="rounded bg-black/50 px-2.5 py-2">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {Object.entries(e.contexts).map(([c, val]) => (
                        <ContextBadge key={c} ctx={c} value={val} />
                      ))}
                      {e.from && <span className="font-mono text-[10px] text-info">hereda de: {e.from}</span>}
                      <span className="ml-auto"><CopyBtn text={e.code} label="Copiar comando" /></span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[12px] text-ok">{e.code}</pre>
                    {e.comment && <p className="mt-1 text-[11px] text-grey">{e.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Gtfobins() {
  const [q, setQ] = useState('')
  const [funcs, setFuncs] = useState<GtfFunc[]>([])
  const [ctx, setCtx] = useState<'cualquiera' | 'sudo' | 'suid' | 'capabilities'>('cualquiera')
  const [open, setOpen] = useState<string | null>(null)

  const results = useMemo(() => searchGtfobins({ q, funcs, ctx }), [q, funcs, ctx])

  const toggleFunc = (f: GtfFunc) => setFuncs((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))

  return (
    <>
      <ToolHeader icon={Swords} title="GTFOBins Explorer" desc={`Base de datos completa de GTFOBins embebida: ${GTFO_STATS.total} binarios UNIX con todos sus comandos de abuso por contexto (sudo, SUID, capabilities) — para escalar privilegios en auditorías autorizadas y para saber qué binarios blindar`} />

      <InfoBanner>
        <b>458 binarios · {GTFO_STATS.byFunc.shell ?? 0} con shell · {GTFO_STATS.suid} con variantes SUID.</b> El contexto lo es todo:
        el mismo binario es inofensivo para un usuario normal y crítico con <span className="font-mono">sudo NOPASSWD</span> o el bit SUID.
        Enumera con <span className="font-mono">sudo -l</span> y <span className="font-mono">find / -perm -4000</span>, y consulta aquí.
      </InfoBanner>

      <div className="mb-3 grid gap-3 md:grid-cols-4">
        {[
          ['binarios', GTFO_STATS.total],
          ['con shell', GTFO_STATS.byFunc.shell ?? 0],
          ['con file-read', GTFO_STATS.byFunc['file-read'] ?? 0],
          ['con upload/download', (GTFO_STATS.byFunc.upload ?? 0) + (GTFO_STATS.byFunc.download ?? 0)],
        ].map(([l, n]) => (
          <div key={l as string} className="rounded-lg border border-edge bg-black/30 px-4 py-3 text-center">
            <div className="font-mono text-2xl font-bold text-acento">{n as number}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-grey">{l as string}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <Field label="Buscar binario">
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="vim, find, awk, python…" />
          </Field>

          <Field label="Función de abuso">
            <div className="flex flex-wrap gap-1.5">
              {FUNC_IDS.filter((f) => f !== 'inherit').map((f) => (
                <button
                  key={f}
                  onClick={() => toggleFunc(f)}
                  className={cn(
                    'rounded border px-2 py-1 text-[11px] transition-all',
                    funcs.includes(f) ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink',
                  )}
                  title={FUNC_INFO[f].desc}
                >
                  {FUNC_INFO[f].icon} {FUNC_INFO[f].label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Contexto requerido">
            <div className="flex flex-wrap gap-1.5">
              {(['cualquiera', 'sudo', 'suid', 'capabilities'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCtx(c)}
                  className={cn(
                    'rounded border px-2 py-1 font-mono text-[11px] transition-all',
                    ctx === c ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {ctx !== 'cualquiera' && (
              <p className="mt-1 text-[11px] text-grey/70">{CTX_INFO.find((x) => x.id === ctx)?.desc}</p>
            )}
          </Field>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Método</h4>
            <ul className="space-y-1.5 text-[11px] text-grey">
              {GTFO_METHOD.map(([step, how]) => (
                <li key={step}><span className="font-mono text-ink">{step}</span> — {how}</li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Notas</h4>
            <ul className="space-y-1.5 text-[11px] text-grey">
              {GTFO_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[11px] text-grey">{results.length} binarios</div>
          <div className="space-y-1.5">
            {results.slice(0, 80).map((r, i) => {
              const isOpen = open === r.name
              return (
                <Reveal key={r.name} delay={Math.min(i * 0.008, 0.3)}>
                  <div className={cn('rounded-lg border px-3 py-2 transition-all', isOpen ? 'border-acento/50 bg-acento/5' : 'border-edge hover:border-acento/30')}>
                    <button onClick={() => setOpen(isOpen ? null : r.name)} className="w-full text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-sm font-bold text-ink">{r.name}</code>
                        {r.funcs.filter((f) => f !== 'inherit').map((f) => (
                          <span key={f} className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-grey" title={FUNC_INFO[f]?.desc}>
                            {FUNC_INFO[f]?.icon} {FUNC_INFO[f]?.label}
                          </span>
                        ))}
                        <span className="ml-auto flex gap-1">
                          {r.ctx.map((c) => <ContextBadge key={c} ctx={c} value={true} />)}
                        </span>
                      </div>
                    </button>
                    {isOpen && <BinDetail r={r} />}
                  </div>
                </Reveal>
              )
            })}
            {results.length > 80 && (
              <div className="rounded border border-edge py-3 text-center font-mono text-[11px] text-grey">
                mostrando 80 de {results.length} — afina la búsqueda o los filtros
              </div>
            )}
            {results.length === 0 && (
              <div className="rounded border border-edge py-8 text-center font-mono text-xs text-grey">
                sin resultados — ¿seguro que ese binario está en GTFOBins? (solo UNIX)
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
