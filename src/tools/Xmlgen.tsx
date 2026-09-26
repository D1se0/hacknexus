import { useMemo, useState } from 'react'
import { FileCode2 } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, Field, TextInput, Reveal, InfoBanner } from '../components/ui'
import { XML_TEMPLATES, XML_NOTES, XML_HUNT, type XmlTemplate } from '../lib/xmlgen'

export default function Xmlgen() {
  const [file, setFile] = useState('/etc/passwd')
  const [host, setHost] = useState('10.10.14.1')
  const [port, setPort] = useState('8080')
  const [cat, setCat] = useState<string>('todas')

  const list = useMemo(() => (cat === 'todas' ? XML_TEMPLATES : XML_TEMPLATES.filter((t) => t.category === cat)), [cat])

  const render = (t: XmlTemplate) =>
    t.template.replace(/\{FILE\}/g, file).replace(/\{HOST\}/g, host).replace(/\{PORT\}/g, port).replace(/\{CMD\}/g, 'id')

  const cats = ['todas', 'xxe', 'oob', 'xinclude', 'xslt', 'util']

  return (
    <>
      <ToolHeader icon={FileCode2} title="XML & XXE Arsenal" desc="10 plantillas listas: XXE directo, out-of-band con evil.dtd, vía error message, XInclude cuando el DOCTYPE está bloqueado, XSLT hasta RCE, SSRF SOAP y detección de parsers" />

      <InfoBanner>
        <b>El flujo de un test XXE:</b> 1) confirma que el servidor parsea XML → 2) prueba entidades directas → 3) si no hay
        respuesta, exfiltra OOB a tu servidor → 4) si no hay salida a internet, usa el método de error. Cada plantilla marca qué necesita.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <Field label="Fichero a leer" hint="linux: /etc/passwd · windows: c:/windows/win.ini">
            <TextInput value={file} onChange={(e) => setFile(e.target.value)} className="font-mono" />
          </Field>
          <Field label="Tu IP (para OOB)">
            <TextInput value={host} onChange={(e) => setHost(e.target.value)} className="font-mono" />
          </Field>
          <Field label="Puerto de tu servidor">
            <TextInput value={port} onChange={(e) => setPort(e.target.value)} className="font-mono" />
          </Field>

          <Field label="Categoría">
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`rounded border px-2 py-1 font-mono text-[11px] ${cat === c ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey'}`}>
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Guía de detección</h4>
            <ul className="space-y-2 text-[11px]">
              {XML_HUNT.map(([q, a]) => (
                <li key={q}><span className="font-mono text-warn">{q}</span><p className="text-grey">{a}</p></li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-edge bg-black/30 p-3">
            <ul className="space-y-1.5 text-[11px] text-grey">
              {XML_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          {list.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i * 0.02, 0.25)}>
              <div className="rounded-lg border border-edge p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={t.category === 'oob' ? 'warn' : t.category === 'xslt' ? 'bad' : 'info'}>{t.category}</Badge>
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  {t.needs.map((n) => <span key={n} className="rounded border border-edge px-1 font-mono text-[9px] text-grey">usa: {n}</span>)}
                  <span className="ml-auto"><CopyBtn text={render(t)} /></span>
                </div>
                <pre className="overflow-x-auto rounded bg-black/50 px-2 py-1.5 font-mono text-[11.5px] text-ok">{render(t)}</pre>
                <p className="mt-1 text-[11px] text-grey">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  )
}
