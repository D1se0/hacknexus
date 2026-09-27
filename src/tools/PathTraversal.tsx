import { useMemo, useState } from 'react'
import { FolderInput, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, Toggle } from '../components/ui'
import { CodeBlock } from '../components/highlight'
import { ptPayloads, targetsOf, PT_CONTEXTS, ptDetection, ptDefenses, type PtOs, type PtDepth, type PtEncoding } from '../lib/pathtraversal'

const ENC_LABEL: Record<PtEncoding, string> = { plain: 'sin codificar', url: 'URL-encode', double: 'double-encode', unicode: 'UTF-8 overlong', mixed: 'mixto' }

export default function PathTraversal() {
  const [os, setOs] = useState<PtOs>('unix')
  const [depth, setDepth] = useState<PtDepth>('auto')
  const [enc, setEnc] = useState<PtEncoding>('plain')
  const [showAllTargets, setShowAllTargets] = useState(false)
  const [param, setParam] = useState('file')

  const allTargets = useMemo(() => targetsOf(os), [os])
  const [selected, setSelected] = useState<string[]>([])

  const payloads = useMemo(
    () => ptPayloads(os, depth, enc, showAllTargets ? [] : selected.length ? selected : []),
    [os, depth, enc, showAllTargets, selected],
  )

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={FolderInput}
        title="Path Traversal Forge"
        desc="Generador de traversals por SO, profundidad y codificación: targets valiosos con su valor real, contextos de explotación (param, upload, zip slip, proxy) y señales de detección"
        badge="web"
      />

      <InfoBanner>
        El traversal no es solo «../../etc/passwd»: el 80% del trabajo es entender QUÉ normaliza cada capa (app, framework, proxy) y QUÉ fichero vale la pena leer. Los payloads de aquí cubren los filtros clásicos; la lectura de la respuesta te dice cuál pasó.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="sistema objetivo">
            <div className="flex gap-1.5">
              {(['unix', 'windows', 'java'] as const).map((o) => (
                <button key={o} onClick={() => { setOs(o); setSelected([]) }} className={`flex-1 rounded-lg border px-2 py-2 font-mono text-[11.5px] transition-all ${os === o ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
                  {o}
                </button>
              ))}
            </div>
          </Field>
          <Field label="profundidad">
            <select value={depth} onChange={(e) => setDepth(e.target.value as PtDepth)} className="w-full rounded-lg border border-edge bg-black/40 px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
              <option value="auto">auto (1→8 niveles)</option>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n} nivel{n > 1 ? 'es' : ''}</option>)}
            </select>
          </Field>
          <Field label="codificación">
            <select value={enc} onChange={(e) => setEnc(e.target.value as PtEncoding)} className="w-full rounded-lg border border-edge bg-black/40 px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
              {(Object.keys(ENC_LABEL) as PtEncoding[]).map((k) => <option key={k} value={k}>{ENC_LABEL[k]}</option>)}
            </select>
          </Field>
          <Field label="parámetro de ejemplo">
            <input value={param} onChange={(e) => setParam(e.target.value)} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60" />
          </Field>
        </div>
      </Reveal>

      <Reveal delay={0.03}>
        <div className="card mb-4 p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-sm font-bold text-white">targets por valor ({allTargets.length})</h3>
            <Toggle checked={showAllTargets} onChange={setShowAllTargets} label="generar para todos" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTargets.map((t) => {
              const active = showAllTargets || selected.includes(t.path)
              return (
                <button
                  key={t.path}
                  onClick={() => setSelected((s) => (s.includes(t.path) ? s.filter((x) => x !== t.path) : [...s, t.path]))}
                  title={t.why}
                  className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] transition-all ${active ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
                >
                  {t.path}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-grey">Pasa el cursor sobre cada uno para ver qué aporta leerlo. Sin selección se generan los 4 primeros.</p>
        </div>
      </Reveal>

      <div className="space-y-2">
        {payloads.map((p, i) => (
          <Reveal key={i} delay={Math.min(i * 0.02, 0.2)}>
            <div className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <CodeBlock code={`?${param}=${encodeURIComponent(p.payload).replaceAll('%2e', '.').replaceAll('%2f', '/')}`} lang="bash" label={p.tag} maxH="max-h-32" />
              </div>
              <div className="w-full sm:w-72">
                <p className="text-[11.5px] leading-relaxed text-grey">{p.note}</p>
                <Badge tone="neutral" className="mt-1.5">{p.payload.length} chars</Badge>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="card h-full p-5">
            <h3 className="mb-3 font-mono text-sm font-bold text-white">contextos donde aparece</h3>
            <div className="space-y-2">
              {PT_CONTEXTS.map((c) => (
                <div key={c.id} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                  <p className="text-[12.5px] font-bold text-ink">{c.name} <code className="ml-1.5 font-mono text-[10.5px] text-acento">{c.example}</code></p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-grey">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <div className="space-y-4">
          <Reveal delay={0.04}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">qué me dice la respuesta</h3>
              <div className="space-y-1.5">
                {ptDetection().map((d) => (
                  <div key={d.sign} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2">
                    <code className="font-mono text-[11px] text-acento">{d.sign}</code>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-grey">{d.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> defensas reales</h3>
              <div className="space-y-1.5">
                {ptDefenses().map((d) => (
                  <p key={d.check} className="text-[12px] leading-relaxed text-grey"><b className="text-ink">{d.check}:</b> {d.why}</p>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
