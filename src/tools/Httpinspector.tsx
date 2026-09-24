import { useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, KV, ErrorBox, InfoBanner } from '../components/ui'
import { inspectHttp, type HttpResult } from '../lib/netapi'

export default function Httpinspector() {
  const [url, setUrl] = useState('https://github.com')
  const [method, setMethod] = useState<'GET' | 'HEAD'>('HEAD')
  const [res, setRes] = useState<HttpResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const inspect = async (m: 'GET' | 'HEAD') => {
    setMethod(m)
    setLoading(true)
    setErr(null)
    setRes(null)
    try {
      const r = await inspectHttp(url, m)
      setRes(r)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const good = res?.securityHeaders.filter((h) => h.good) ?? []
  const bad = res?.securityHeaders.filter((h) => !h.good) ?? []

  return (
    <div>
      <ToolHeader icon={Activity} title="HTTP Inspector" desc="Auditoría de cabeceras HTTP y cabeceras de seguridad (HSTS, CSP, XFO…) de cualquier URL" />

      <InfoBanner>
        Las cabeceras se leen desde el navegador: si el servidor no permite CORS verás un aviso (limitación del navegador, no del servidor).
        Con GET además se mide el tamaño del body.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <Field label="URL objetivo" hint="https://objetivo.com">
            <div className="flex gap-2">
              <TextInput
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inspect(method)}
                className="font-mono"
                placeholder="https://objetivo.com"
              />
              <Button onClick={() => inspect('HEAD')} disabled={loading}>{loading ? <Loader2 size={15} className="animate-spin" /> : 'HEAD'}</Button>
              <Button variant="ghost" onClick={() => inspect('GET')} disabled={loading}>GET</Button>
            </div>
          </Field>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['https://github.com', 'https://httpbin.org/get', 'https://api.github.com'].map((p) => (
              <button key={p} onClick={() => { setUrl(p); inspect(method) }} className="rounded-md border border-edge px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                {p.replace('https://', '')}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {res && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone={res.ok ? 'ok' : 'bad'}>{res.status} {res.statusText}</Badge>
                {res.redirected && <Badge tone="warn">redirect → {res.finalUrl.slice(0, 60)}</Badge>}
                {res.contentType && <Badge tone="info">{res.type}</Badge>}
                {res.bodySize > 0 && <Badge tone="neutral">{(res.bodySize / 1024).toFixed(1)} KB</Badge>}
                {res.serverTime && <Badge tone="neutral">{res.serverTime}</Badge>}
              </div>

              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">cabeceras de seguridad ({good.length}/{res.securityHeaders.length} correctas)</h3>
              <div className="overflow-hidden rounded-xl border border-edge">
                {res.securityHeaders.map((h) => (
                  <div key={h.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge/60 px-4 py-2.5 last:border-0">
                    <Badge tone={h.good ? 'ok' : h.present ? 'warn' : 'bad'}>{h.good ? 'ok' : h.present ? 'revisar' : 'ausente'}</Badge>
                    <span className="font-mono text-[12px] font-bold text-ink">{h.name}</span>
                    {h.value && <span className="break-all font-mono text-[11px] text-grey">{h.value.slice(0, 120)}</span>}
                    <span className="w-full font-mono text-[10px] text-grey/60">{h.why}</span>
                  </div>
                ))}
              </div>
              {bad.length > 0 && (
                <p className="mt-3 font-mono text-xs text-warn">
                  ⚠ {bad.length} cabecera(s) mejorables — añádelas en el servidor (nginx: add_header, Apache: Header always set).
                </p>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 overflow-hidden">
              <div className="border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey">todas las cabeceras de respuesta ({res.headerList.length})</div>
              <div className="max-h-96 divide-y divide-edge/40 overflow-y-auto">
                {res.headerList.map((h) => (
                  <KV key={h.name} k={h.name} v={h.value} copyable />
                ))}
              </div>
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
