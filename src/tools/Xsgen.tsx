import { useMemo, useState } from 'react'
import { Bug } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, Field, TextInput, Select, Reveal, InfoBanner } from '../components/ui'
import { XS_TEMPLATES, XS_CONTEXT_INFO, XS_NOTES, XS_HUNT, buildXs, type XsContext, type XsTemplate } from '../lib/xsgen'
import { cn } from '../lib/util'

const VECTORS = ['básico', 'evento', 'etiqueta rara', 'evasión', 'sin <', 'mDNS/edge'] as const

export default function Xsgen() {
  const [q, setQ] = useState('')
  const [vector, setVector] = useState<string>('todos')
  const [ctx, setCtx] = useState<XsContext | 'todos'>('todos')
  const [alertText, setAlertText] = useState('XSS-HackNexus')
  const [encode, setEncode] = useState<'nada' | 'url' | 'html'>('nada')
  const [wrap, setWrap] = useState(false)

  const list = useMemo(() => {
    const qn = q.toLowerCase()
    return XS_TEMPLATES.filter((t) => {
      if (vector !== 'todos' && t.vector !== vector) return false
      if (ctx !== 'todos' && !t.contexts.includes(ctx)) return false
      if (qn && !(t.payload.toLowerCase().includes(qn) || t.desc.toLowerCase().includes(qn))) return false
      return true
    })
  }, [q, vector, ctx])

  const render = (t: XsTemplate) => buildXs(t, { alertText, encode, wrap })

  return (
    <>
      <ToolHeader icon={Bug} title="XSS Payload Generator" desc="26 payloads clasificados por vector (básico, evento, etiquetas raras, evasión, sin <) y por contexto de inyección (HTML, atributo, string JS, URL) — con guía de dónde cae tu input y cómo evadir filtros" />

      <InfoBanner>
        <b>Solo en aplicaciones tuyas o con autorización escrita.</b> El flujo correcto: localiza DÓNDE cae tu input en el DOM
        (guía de caza abajo), elige el payload del contexto adecuado, y demuestra impacto (robo de sesión) más allá del alert.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <Field label="Buscar payload">
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="svg, onerror, evasión…" />
          </Field>
          <Field label="Vector">
            <Select value={vector} onChange={(e) => setVector(e.target.value)} options={[{ value: 'todos', label: 'todos los vectores' }, ...VECTORS.map((v) => ({ value: v, label: v }))]} />
          </Field>
          <Field label="Contexto de inyección">
            <Select value={ctx} onChange={(e) => setCtx(e.target.value as XsContext | 'todos')} options={[{ value: 'todos', label: 'todos los contextos' }, ...(Object.keys(XS_CONTEXT_INFO) as XsContext[]).map((c) => ({ value: c, label: XS_CONTEXT_INFO[c].label }))]} />
            {ctx !== 'todos' && <p className="mt-1 text-[11px] text-grey/70">{XS_CONTEXT_INFO[ctx].hint}</p>}
          </Field>
          <Field label="Texto del alert (demo ética)">
            <TextInput value={alertText} onChange={(e) => setAlertText(e.target.value)} />
          </Field>
          <Field label="Encoding de salida">
            <Select value={encode} onChange={(e) => setEncode(e.target.value as 'nada' | 'url' | 'html')} options={[{ value: 'nada', label: 'sin encoding' }, { value: 'url', label: 'URL-encoded (para parámetros)' }, { value: 'html', label: 'HTML entities (prueba de doble decode)' }]} />
          </Field>
          <label className="flex items-center gap-2 text-xs text-grey">
            <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="accent-[var(--acento)]" />
            envolver con comentario de prueba autorizada
          </label>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Guía de caza</h4>
            <ul className="space-y-2 text-[11px]">
              {XS_HUNT.map(([q2, a]) => (
                <li key={q2}><span className="font-mono text-warn">{q2}</span><p className="text-grey">{a}</p></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-mono text-[11px] text-grey">{list.length} payloads</div>
          {list.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i * 0.015, 0.25)}>
              <div className="rounded-lg border border-edge p-3 transition-colors hover:border-acento/30">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={t.vector === 'evasión' ? 'warn' : t.vector === 'básico' ? 'info' : 'neutral'}>{t.vector}</Badge>
                  {t.contexts.map((c) => <span key={c} className="rounded border border-edge px-1 font-mono text-[9px] text-grey">{c}</span>)}
                  {t.needsUserInteraction && <Badge tone="accent">requiere interacción</Badge>}
                  <span className="ml-auto"><CopyBtn text={render(t)} /></span>
                </div>
                <code className="block break-all rounded bg-black/50 px-2 py-1.5 font-mono text-[12px] text-ok">{render(t)}</code>
                <p className="mt-1 text-[11px] text-grey">{t.desc}</p>
              </div>
            </Reveal>
          ))}
          {list.length === 0 && <div className="rounded border border-edge py-8 text-center font-mono text-xs text-grey">sin payloads para ese filtro</div>}

          <div className="rounded border border-edge bg-black/30 p-3">
            <ul className="space-y-1.5 text-[11px] text-grey">
              {XS_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
