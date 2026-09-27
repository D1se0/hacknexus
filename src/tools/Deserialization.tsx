import { useMemo, useState } from 'react'
import { PackageOpen, Info, Fingerprint } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput, CopyBlock } from '../components/ui'
import { deserPayloads } from '../lib/injection'

const LANG_LABEL: Record<string, string> = { php: 'PHP', python: 'Python', java: 'Java', dotnet: '.NET', node: 'Node.js' }

const MAGICS = [
  { sig: 'O:8:"...', fmt: 'PHP serialized (unserialize)', note: 'empieza por O (object), a:num:"Class":… — el formato más legible a simple vista' },
  { sig: 'gASV… / 80 04 95', fmt: 'Python pickle (protocolo 2+)', note: 'bytes 80 04 en hex o base64 gASV: si lo ves en una cookie, RCE casi seguro' },
  { sig: 'ac ed 00 05', fmt: 'Java native serialization', note: 'magic 0xACED0005: streams Java serializados. Base64 empieza por rO0AB' },
  { sig: '/wEP…', fmt: '.NET ViewState', note: 'base64 de LosFormatter: descifra con ViewState decoder y mira el MAC' },
  { sig: '_$$ND_FUNC$$_', fmt: 'node-serialize', note: 'marca de funciones serializadas: el IIFE ()() la ejecuta al deserializar' },
]

export default function Deserialization() {
  const [callback, setCallback] = useState('http://TU-SERVIDOR.burpcollaborator.net')
  const payloads = useMemo(() => deserPayloads(callback), [callback])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={PackageOpen}
        title="Insecure Deserialization Arsenal"
        desc="Payloads de deserialización por lenguaje (PHP, Python pickle, Java, .NET ViewState, Node) con su gadget, cómo detectar el formato en la naturaleza y la defensa"
        badge="web"
      />

      <InfoBanner>
        La deserialización insegura casi nunca es un payload único: es encontrar el FORMATO (magic bytes en cookies, headers, cuerpos base64) y luego la CADENA DE GADGETS para las librerías del target. Aquí tienes los formatos, el concepto de cada cadena y las sondas OOB para confirmar sin romper nada.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-5">
          <Field label="servidor OOB de laboratorio" hint="curl/TU-DNS en los payloads">
            <TextInput value={callback} onChange={(e) => setCallback(e.target.value)} className="font-mono text-[12px]" />
          </Field>
          <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
            Sustituye esto por tu Collaborator, interactsh o un server propio: la petición entrante ES la prueba de ejecución. Nunca apuntes payloads a terceros.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.03}>
        <div className="card mb-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Fingerprint size={15} className="text-acento" /> cómo detectar el formato (magic bytes)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {MAGICS.map((m) => (
              <div key={m.fmt} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                <code className="font-mono text-[11.5px] font-bold text-acento">{m.sig}</code>
                <p className="mt-0.5 font-mono text-[11px] text-ink">{m.fmt}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-grey">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="space-y-3">
        {payloads.map((p, i) => (
          <Reveal key={p.name} delay={Math.min(i * 0.03, 0.15)}>
            <div className="card p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{LANG_LABEL[p.lang]}</Badge>
                <h3 className="font-mono text-[13px] font-bold text-white">{p.name}</h3>
                <Badge tone={p.severity === 'crítica' ? 'bad' : 'warn'}>{p.severity}</Badge>
              </div>
              <p className="mb-1 font-mono text-[11px] text-grey">gadget: <span className="text-acento">{p.gadget}</span></p>
              <p className="mb-3 text-[12px] leading-relaxed text-grey">{p.why}</p>
              <CopyBlock text={p.payload} label={`${p.lang}-payload`} maxH="max-h-36" />
              <p className="mt-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-[12px] leading-relaxed text-info">🔎 {p.detect}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="card mt-4 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> la única defensa seria</h3>
          <p className="text-[12.5px] leading-relaxed text-grey">
            <b className="text-ink">No deserializar datos de usuarios con formatos de objetos nativos</b> — punto. Usa JSON (texto plano, sin comportamiento), valida esquema y firma los payloads que viajan (cookies de estado, tokens) con HMAC. Las "soluciones" de filtrar clases (look-ahead de Java) se bypassean con gadgets nuevos: el fix real es de diseño, no de filtro.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
