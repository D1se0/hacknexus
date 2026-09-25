import { useMemo, useState } from 'react'
import { Link2, ShieldAlert, Globe, Zap } from 'lucide-react'
import { ToolHeader, Badge, Reveal, KV, CopyBlock, InfoBanner, Field, TextInput } from '../components/ui'
import { analyzeUrl, HOMOGLYPHS } from '../lib/phishing'
import { fmtBytes } from '../lib/util'

const EXAMPLES = [
  'http://xn--pypal-4ve.com/login',
  'http://192.168.44.10:8080/office365/secure/login.php',
  'https://secure.paypal-verify.com.sessionid9383.top/login',
  'https://bit.ly/3xY2zAb',
  'https://github.com/D1se0/hacknexus',
]

const riskTone = (r: string) => (r === 'alta' ? 'bad' : r === 'media' ? 'warn' : 'ok')

function charFlags(host: string): { c: string; flagged: boolean }[] {
  return [...host].map((c) => ({ c, flagged: c.charCodeAt(0) > 127 || !!HOMOGLYPHS[c] }))
}

export default function Urlphish() {
  const [input, setInput] = useState('')

  const rep = useMemo(() => analyzeUrl(input), [input])

  return (
    <div>
      <ToolHeader icon={Link2} title="URL Phishing Inspector" desc="Desmonta URLs sospechosas: punycode, homoglyphs, typosquatting de marcas, credenciales incrustadas, acortadores y presión social en el path" />

      <InfoBanner>
        Pega la URL que te llegó por correo/WhatsApp. Se analiza <b>solo su estructura</b> — no se visita el destino, no hay fetching. Detecta el truco del subdominio largo (`https://paypal.com.evil.top`) mostrando siempre cuál es el <b>dominio real</b> registrado.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <Field label="URL a analizar" hint="no se visita: análisis puramente estructural">
            <TextInput value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://… o dominio suelto" className="font-mono" />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((u) => (
              <button key={u} onClick={() => setInput(u)} className="rounded-lg border border-edge px-2.5 py-1 font-mono text-[10px] text-grey transition-colors hover:border-acento/50 hover:text-acento">
                {u.length > 45 ? u.slice(0, 42) + '…' : u}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {rep && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">veredicto</h3>
                <Badge tone={riskTone(rep.risk)}>riesgo {rep.risk}</Badge>
                {rep.punycode && <Badge tone="bad">punycode</Badge>}
                {rep.credentialInUrl && <Badge tone="bad">credenciales en URL</Badge>}
                {rep.isShortener && <Badge tone="warn">acortador</Badge>}
                {rep.brand && <Badge tone="warn">marca "{rep.brand}"</Badge>}
              </div>

              {/* host carácter a carácter */}
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">host carácter a carácter (los sospechosos en rojo)</p>
              <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-edge bg-black/40 p-3">
                {charFlags(rep.host).map((f, i) => (
                  <span
                    key={i}
                    title={f.flagged ? 'carácter no ASCII / homoglyph' : undefined}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded border font-mono text-sm ${f.flagged ? 'border-bad/60 bg-bad/15 text-bad' : 'border-edge text-ink'}`}
                  >
                    {f.c}
                  </span>
                ))}
              </div>

              <div className="grid gap-x-8 md:grid-cols-2">
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="URL" v={rep.url} />
                  <KV k="host real" v={<span className="text-acento">{rep.host}</span>} copyable />
                  <KV k="esquema" v={rep.scheme} />
                </div>
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="path + query" v={rep.path || '—'} />
                  <KV k="usa IP directa" v={rep.usesIp ? 'sí ⚠' : 'no'} />
                  <KV k="host unicode" v={rep.unicodeHost !== rep.host ? rep.unicodeHost : 'idéntico al punycode'} />
                </div>
              </div>
            </div>
          </Reveal>

          {rep.findings.length > 0 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><ShieldAlert size={13} /> hallazgos ({rep.findings.length})</h3>
                <div className="space-y-2">
                  {rep.findings.map((f, i) => (
                    <div key={i} className={`rounded-lg border px-3 py-2 font-mono text-[11px] ${
                      f.sev === 'bad' ? 'border-bad/40 bg-bad/5 text-ink/90'
                      : f.sev === 'warn' ? 'border-warn/30 bg-warn/5 text-ink/90'
                      : f.sev === 'ok' ? 'border-ok/30 bg-ok/5 text-ok/90'
                      : 'border-edge bg-black/30 text-grey'}`}>
                      <Badge tone={f.sev === 'info' ? 'neutral' : f.sev} className="mr-2">{f.sev === 'bad' ? 'crítico' : f.sev === 'warn' ? 'aviso' : f.sev === 'ok' ? 'ok' : 'info'}</Badge>
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Globe size={13} /> desglose de la URL</h3>
              <CopyBlock
                label="anatomía"
                text={[
                  `URL completa : ${rep.url}`,
                  `esquema      : ${rep.scheme}`,
                  `host         : ${rep.host}${rep.unicodeHost !== rep.host ? `  (= ${rep.unicodeHost})` : ''}`,
                  `path         : ${rep.path || '(vacío)'}`,
                  '',
                  `regla de oro: lo que importa es lo que queda ANTES del primer '/' tras el esquema.`,
                  `En https://paypal.com.evil.top/login el dominio real es evil.top, no paypal.com.`,
                ].join('\n')}
                maxH="max-h-64"
              />
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] text-grey">
                <Zap size={11} className="text-warn" />
                Consejo: expande acortadores con curl -sI https://bit.ly/xxx | grep -i location (cabecera Location = destino real)
              </div>
              <p className="mt-2 font-mono text-[10px] text-grey/60">URL de {fmtBytes(new TextEncoder().encode(rep.url).length)} · análisis estructural local, no se ha contactado con el destino</p>
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
