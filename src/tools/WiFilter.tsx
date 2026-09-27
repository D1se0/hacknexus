import { useMemo, useState } from 'react'
import { Filter, Wand2, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react'
import { ToolHeader, Select, TextInput, Button, Badge, Reveal, CopyBlock } from '../components/ui'
import { WI_PROTOCOLS, WI_PRESETS, validateFilter, combineParts } from '../lib/wifilter'

const OPS = ['==', '!=', 'contains', 'matches', '>', '<', '>=', '<='] as const

export default function WiFilter() {
  const [parts, setParts] = useState<string[]>(['tcp.port == 4444'])
  const [joiner, setJoiner] = useState<'&&' | '||'>('&&')
  const [draft, setDraft] = useState({ proto: 'tcp', field: 'tcp.port', op: '==', value: '4444' })

  const filter = useMemo(() => parts.filter(Boolean).length ? combineParts(parts.map((p) => ({ expr: p })), joiner) : '', [parts, joiner])
  const check = useMemo(() => validateFilter(filter), [filter])

  const addPart = () => {
    if (!draft.field) return
    const needsValue = !draft.field.includes('analysis') && !draft.field.includes('flags.mf') && !draft.field.includes('duplicate')
    const expr = needsValue ? `${draft.field} ${draft.op} ${/^\d+$/.test(draft.value) ? draft.value : `"${draft.value}"`}` : draft.field
    setParts((p) => [...p, expr])
  }

  const proto = WI_PROTOCOLS.find((p) => p.id === draft.proto)

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Filter}
        title="Wireshark Display Filters"
        desc="Constructor visual de display filters con catálogo explicado por protocolo, presets de caza (escaneos, exfil DNS, credenciales en claro) y validación en vivo"
        badge="pcap"
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-4">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
                <Wand2 size={15} className="text-acento" /> constructor
              </h3>
              <div className="grid gap-2 sm:grid-cols-[160px_1fr_110px_1fr_auto]">
                <Select
                  value={draft.proto}
                  onChange={(e) => {
                    const p = WI_PROTOCOLS.find((x) => x.id === e.target.value)!
                    setDraft((d) => ({ ...d, proto: p.id, field: p.fields[0].field }))
                  }}
                  options={WI_PROTOCOLS.map((p) => ({ value: p.id, label: `${p.icon} ${p.label}` }))}
                />
                <Select
                  value={draft.field}
                  onChange={(e) => setDraft((d) => ({ ...d, field: e.target.value }))}
                  options={(proto?.fields ?? []).map((f) => ({ value: f.field, label: `${f.field} — ${f.name}` }))}
                />
                <Select value={draft.op} onChange={(e) => setDraft((d) => ({ ...d, op: e.target.value }))} options={OPS.map((o) => ({ value: o, label: o }))} />
                <TextInput value={draft.value} onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} className="py-2 text-xs" placeholder="valor…" />
                <Button onClick={addPart} className="!px-3">añadir</Button>
              </div>
              {proto?.fields.find((f) => f.field === draft.field) && (
                <p className="mt-2 text-[11.5px] leading-snug text-grey">
                  <b className="text-ink">{proto.fields.find((f) => f.field === draft.field)!.name}:</b> {proto.fields.find((f) => f.field === draft.field)!.desc}
                  <span className="ml-2 font-mono text-[10.5px] text-acento">ej: {proto.fields.find((f) => f.field === draft.field)!.example}</span>
                </p>
              )}

              <div className="mt-4 space-y-1.5">
                {parts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-edge bg-black/30 px-3 py-1.5">
                    {i > 0 && <Badge tone="accent">{joiner}</Badge>}
                    <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-ink">{p}</code>
                    <button onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))} className="shrink-0 font-mono text-[10px] text-grey hover:text-bad">✕</button>
                  </div>
                ))}
                {parts.length > 1 && (
                  <button onClick={() => setJoiner((j) => (j === '&&' ? '||' : '&&'))} className="font-mono text-[10px] text-grey hover:text-acento">
                    combinar con: {joiner} (pica para alternar)
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">tu filtro</h3>
              {filter ? (
                <>
                  <CopyBlock text={filter} label="display filter · pega en la barra de Wireshark" maxH="max-h-24" />
                  <div className="mt-3">
                    {check.ok ? (
                      <p className="flex items-center gap-2 font-mono text-[11.5px] text-ok"><CheckCircle2 size={13} /> sintaxis plausible — la palabra final la tiene tshark/Wireshark</p>
                    ) : (
                      <div className="flex items-start gap-2 font-mono text-[11.5px] text-bad"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{check.warnings.join(' · ')}</div>
                    )}
                    {check.ok && check.warnings.length > 0 && <p className="mt-1 font-mono text-[10.5px] text-warn">⚠ {check.warnings.join(' · ')}</p>}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-grey">añade condiciones o pilla un preset →</p>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">referencia por protocolo</h3>
              <div className="space-y-4">
                {WI_PROTOCOLS.map((p) => (
                  <div key={p.id}>
                    <p className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-acento">{p.icon} {p.label}</p>
                    <div className="grid gap-1 md:grid-cols-2">
                      {p.fields.map((f) => (
                        <button
                          key={f.field}
                          onClick={() => setDraft((d) => ({ ...d, proto: p.id, field: f.field }))}
                          title={f.desc}
                          className="rounded border border-edge bg-black/20 px-2.5 py-1.5 text-left transition-colors hover:border-acento/40"
                        >
                          <code className="block truncate font-mono text-[10.5px] text-ink">{f.field}</code>
                          <span className="text-[10px] text-grey">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.04}>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
              <BookOpen size={14} className="text-acento" /> presets de caza
            </h3>
            <div className="space-y-2">
              {WI_PRESETS.map((p) => (
                <div key={p.name} className="rounded-lg border border-edge bg-black/30 p-3">
                  <p className="font-mono text-[11.5px] font-bold text-white">{p.name}</p>
                  <code className="mt-1 block break-all font-mono text-[10.5px] leading-snug text-acento">{p.filter}</code>
                  <p className="mt-1.5 text-[10.5px] leading-snug text-grey">{p.why}</p>
                  <Button variant="ghost" className="mt-2 !px-2 !py-1 !text-[10px]" onClick={() => setParts(p.filter.split(/\s*\|\|\s*/))}>
                    usar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
