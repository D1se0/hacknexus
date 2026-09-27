import { useMemo, useState } from 'react'
import { Lock, KeySquare, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Button, Field, TextInput, CopyBlock } from '../components/ui'
import { parseJwks, JWKS_TIPS, type JwkInfo } from '../lib/jwks'

const SAMPLE = JSON.stringify(
  {
    keys: [
      { kty: 'RSA', use: 'sig', kid: '2024-main', n: '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtfOv2V8dQZ0S8jlldmnMKDDZsJGE', e: 'AQAB', alg: 'RS256' },
      { kty: 'RSA', use: 'enc', kid: 'enc-legacy', n: 'sXchBQshdN1BSlCGWJi8bCcdQuW9m6bEFggMGNpFbW4', e: 'AQAB', alg: 'RSA1_5' },
      { kty: 'EC', use: 'sig', kid: 'ec-p256', crv: 'P-256', x: 'MKBCTNIcKUSDii11ySs3526iDZ8AiTo7Tu6KPAqv7D4', y: '4Etl6SRW2YiLUrN5vfvVHuhp7x8PxltmWWlbbM4IFyM', alg: 'ES256' },
    ],
  },
  null,
  2,
)

export default function Jwks() {
  const [url, setUrl] = useState('')
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const jwksText = raw.trim() || ''
  const keys = useMemo<{ list: JwkInfo[]; err?: string }>(() => {
    if (!jwksText) return { list: [] }
    try {
      return { list: parseJwks(jwksText) }
    } catch (e) {
      return { list: [], err: (e as Error).message }
    }
  }, [jwksText])

  const fetchJwks = async () => {
    setError(null)
    if (!url.trim()) return
    setLoading(true)
    try {
      const res = await fetch(url.trim())
      const json = await res.json()
      setRaw(JSON.stringify(json, null, 2))
    } catch (e) {
      setError(`no se pudo descargar el JWKS: ${(e as Error).message}. La mayoría requieren CORS: si falla, descarga el JSON y pégalo aquí.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Lock}
        title="JWK Set (JWKS) Inspector"
        desc="Pega un JWKS o cárgalo por URL y desglosa cada clave: kty/alg/use, longitud de módulo RSA, curvas EC, riesgo por diseño y errores típicos (alg mixed, keys enc junto a sig, RSA-PSS sin soporte)"
        badge="auth"
      />

      <InfoBanner>
        El JWKS es el almacén de claves PÚBLICAS de un issuer OIDC/JWT: <code className="text-ink">/​.well-known/jwks.json</code>. Verlo no es vulnerabilidad — pero su DISEÑO delata cómo firman: algoritmos legacy, claves de firma y cifrado mezcladas, módulos cortos y la ausencia de rotación (kid viejo = rotación dormida).
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[420px_1fr]">
        <Reveal>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><KeySquare size={15} className="text-acento" /> JWKS</h3>
            <Field label="url del jwks" hint="opcional">
              <div className="flex gap-1.5">
                <TextInput
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://auth.target.com/.well-known/jwks.json"
                  className="font-mono text-[11.5px]"
                />
                <Button variant="ghost" className="shrink-0 px-3 py-2 text-[12px]" onClick={() => void fetchJwks()} disabled={loading}>
                  {loading ? '…' : 'cargar'}
                </Button>
              </div>
            </Field>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              placeholder={SAMPLE}
              className="mt-3 min-h-[240px] w-full resize-y rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-[11px] text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => setRaw(SAMPLE)}>cargar ejemplo</Button>
              {raw && <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => { setRaw(''); setError(null) }}>limpiar</Button>}
            </div>
            {error && <p className="mt-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-[11.5px] text-warn">{error}</p>}
            {keys.err && <p className="mt-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 font-mono text-[11.5px] text-bad">{keys.err}</p>}
          </div>
        </Reveal>

        <div className="min-w-0 space-y-4">
          {!jwksText && (
            <Reveal>
              <div className="card p-8 text-center">
                <Lock size={28} className="mx-auto text-acento" />
                <p className="mt-3 font-mono text-sm text-ink">pega un JWKS o cárgalo por URL</p>
                <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-grey">
                  Cada clave cuenta una decisión de diseño: RSA-2048 con RS256 es el estándar resistido; ES256/EdDSA el moderno; RSA1_5 es cifrado roto por Bleichenbacher; y un kid que no cambia en años dice que la rotación es teórica.
                </p>
              </div>
            </Reveal>
          )}

          {keys.list.length > 0 && (
            <>
              <Reveal delay={0.03}>
                <p className="font-mono text-[12px] text-grey">
                  {keys.list.length} clave(s) · kty: {Array.from(new Set(keys.list.map((k) => k.kty))).join(', ')} · algs: {Array.from(new Set(keys.list.map((k) => k.alg ?? '(sin alg)'))).join(', ')}
                </p>
              </Reveal>
              {keys.list.map((k, i) => (
                <Reveal key={k.kid ?? i} delay={0.04 + i * 0.03}>
                  <div className="card p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-mono text-[13px] font-bold text-white">{k.kid ?? '(sin kid)'}</h3>
                      <Badge tone="accent">{k.kty}</Badge>
                      {k.alg && <Badge tone="neutral">{k.alg}</Badge>}
                      {k.use && <Badge tone="info">{k.use}</Badge>}
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {[
                        ['tipo', k.ktyLabel],
                        ['algoritmo', k.algLabel],
                        ['uso', k.useLabel],
                        ...k.extra,
                      ].map(([kk, v]) => (
                        <div key={kk} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                          <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{kk}</p>
                          <p className="break-all font-mono text-[11.5px] text-ink">{v}</p>
                        </div>
                      ))}
                    </div>
                    {k.risks.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {k.risks.map((r) => (
                          <p key={r} className="rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-[12px] leading-relaxed text-warn">⚠ {r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
              <Reveal delay={0.1}>
                <div className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> hunting con el JWKS</h3>
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    {JWKS_TIPS.map((t) => (
                      <div key={t.title} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                        <p className="font-mono text-[12px] font-bold text-ink">{t.title}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-grey">{t.body}</p>
                      </div>
                    ))}
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">decisiones de diseño que delata un JWKS</h3>
                  <ul className="space-y-2 text-[12.5px] leading-relaxed text-grey">
                    <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">kids con fecha:</b> "2024-main" vs "key1" — los primeros rotan de verdad; los segundos llevan igual desde el deploy.</span></li>
                    <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">use mezclado:</b> sig y enc en el mismo set es válido pero raro: si ves enc keys, el issuer cifra tokens — busca dónde se usan y con qué algoritmo.</span></li>
                    <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">alg ausente:</b> la clave sin alg acepta lo que el cliente pida: pista de validación laxa en el RS (prueba alg confusion, el clásico HS256 con la clave pública).</span></li>
                    <li className="flex gap-2"><span className="text-acento">▸</span><span><b className="text-ink">x5c presente:</b> si incluye el certificado, puedes verificar la cadena y fechas de expiración — info que el JSON puro no da.</span></li>
                  </ul>
                </div>
              </Reveal>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
