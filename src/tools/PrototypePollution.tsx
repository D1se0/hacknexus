import { useState } from 'react'
import { Variable, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, CopyBlock } from '../components/ui'
import { PP_SINKS, ppProbeList } from '../lib/web'

export default function PrototypePollution() {
  const [sel, setSel] = useState(PP_SINKS[0].name)

  const sink = PP_SINKS.find((s) => s.name === sel) ?? PP_SINKS[0]

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Variable}
        title="Prototype Pollution Lab"
        desc="Contaminar Object.prototype para escalar a XSS o RCE: sondas por vector (query, JSON, constructor), sinks que convierten la polución en impacto y cómo verificarla"
        badge="web"
      />

      <InfoBanner>
        La pollution NO es el impacto: es el trampolín. Un <code className="text-ink">__proto__[x]=y</code> que no llega a un sink (innerHTML, spawn, config) es solo una curiosidad. El trabajo real es mapear la app: qué objetos base se copian y qué sink los consume.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="card h-full p-5">
            <h3 className="mb-3 font-mono text-sm font-bold text-white">sondas por vector</h3>
            <div className="space-y-2">
              {ppProbeList().map((p) => (
                <div key={p.param} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                  <code className="break-all font-mono text-[11.5px] text-acento">{p.param}</code>
                  <p className="mt-0.5 text-[11.5px] text-grey">{p.what}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-info/30 bg-info/5 px-3.5 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-info">cómo verificar la polución</p>
              <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-ink">
                En consola del navegador: <code className="text-acento">({'{}'}).polluted</code>
                <br />Si devuelve <code className="text-acento">&quot;polluted&quot;</code>, Object.prototype está contaminado: la petición pasó el filtro y el merge.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.04}>
          <div className="card h-full p-5">
            <h3 className="mb-3 font-mono text-sm font-bold text-white">sinks → impacto real</h3>
            <div className="space-y-1.5">
              {PP_SINKS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => setSel(s.name)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-[12px] font-bold transition-all ${sel === s.name ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge bg-black/20 text-ink hover:border-edge'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-edge bg-black/20 px-3.5 py-3">
              <p className="font-mono text-[10.5px] text-grey">gadget: <span className="text-acento">{sink.gadget}</span></p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-grey">{sink.why}</p>
            </div>
            <div className="mt-3">
              <CopyBlock text={sink.payload} label="payload" maxH="max-h-24" />
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.06}>
        <div className="card mt-4 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> defensas que funcionan</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['Objects.freeze(Object.prototype)', 'a nivel de app: la polución falla en silencio (o lanza en strict mode). Rápido y sin tocar código de negocio.'],
              ['Maps en vez de objetos planos', 'un Map no tiene prototype explotable: cambia la estructura de datos, no el filtro.'],
              ['Parsers con protección real', 'qs reciente, secure-json-parse, ajv con allErrors:false — rechazan __proto__ por diseño.'],
              ['Merge conOwnProperty check', 'hasOwnProperty(k) antes de escribir: el fix mínimo si no puedes cambiar el parser.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                <p className="font-mono text-[12px] font-bold text-ink">{t}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-grey">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
