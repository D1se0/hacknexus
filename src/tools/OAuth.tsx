import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, RefreshCw, Link2, Unplug, ShieldAlert } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Button, Field, TextInput, Select, CopyBlock } from '../components/ui'
import { emptyClientConfig, generatePkce, randomToken, buildAuthUrl, buildTokenExchange, parseCallback, OAUTH_ATTACKS, type OAuthClientConfig } from '../lib/oauth'

const DIFF_TONE = { trivial: 'bad', media: 'warn', alta: 'info' } as const

export default function OAuth() {
  const [cfg, setCfg] = useState<OAuthClientConfig>(emptyClientConfig())
  const [authEndpoint, setAuthEndpoint] = useState('https://auth.target.com/authorize')
  const [tokenEndpoint, setTokenEndpoint] = useState('https://auth.target.com/token')
  const [callbackUrl, setCallbackUrl] = useState('')

  const set = <K extends keyof OAuthClientConfig>(k: K) => (v: OAuthClientConfig[K]) => setCfg((c) => ({ ...c, [k]: v }))

  const regen = useCallback(async () => {
    set('state')(randomToken(16))
    set('nonce')(randomToken(16))
    const pkce = await generatePkce()
    set('codeVerifier')(pkce.verifier)
    set('codeChallenge')(pkce.challenge)
  }, [])

  useEffect(() => {
    if (!cfg.state && !cfg.codeChallenge) void regen()
  }, [cfg.state, cfg.codeChallenge, regen])

  const authUrl = useMemo(() => buildAuthUrl(cfg, authEndpoint), [cfg, authEndpoint])
  const parsedCallback = useMemo(() => (callbackUrl.trim() ? parseCallback(callbackUrl) : null), [callbackUrl])
  const curlToken = useMemo(() => buildTokenExchange(cfg, tokenEndpoint, parsedCallback?.code ?? ''), [cfg, tokenEndpoint, parsedCallback])

  const urlParams = useMemo(() => {
    try {
      const u = new URL(authUrl)
      return Array.from(u.searchParams.entries())
    } catch { return [] }
  }, [authUrl])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={KeyRound}
        title="OAuth 2.0 / OIDC Lab"
        desc="Generador de flujos con PKCE real (WebCrypto), desglose de cada parámetro de la URL, parser del callback con su curl de token exchange y catálogo de ataques con detección"
        badge="web"
      />

      <InfoBanner>
        Las URLs aquí se GENERAN para copiarlas a tu navegador/incógnito en pruebas autorizadas del flujo: nada se navega solo. La gracia de auditar OAuth está en ver QUÉ valida (y qué NO) el cliente al recibir el callback: state, redirect_uri exacta, aud/iss del id_token y el binding code↔client.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[380px_1fr]">
        <Reveal>
          <div className="card space-y-3 p-5">
            <h3 className="font-mono text-sm font-bold text-white">cliente OAuth</h3>
            <Field label="flow">
              <Select
                value={cfg.flow}
                onChange={(e) => {
                  const f = e.target.value as OAuthClientConfig['flow']
                  set('flow')(f)
                  set('responseType')(f === 'implicit' ? 'token' : 'code')
                }}
                options={[
                  { value: 'code-pkce', label: 'Authorization Code + PKCE (recomendado)' },
                  { value: 'code', label: 'Authorization Code (confidencial)' },
                  { value: 'implicit', label: 'Implicit (legacy, evítalo)' },
                ]}
              />
            </Field>
            <Field label="client_id"><TextInput value={cfg.clientId} onChange={(e) => set('clientId')(e.target.value)} className="font-mono text-[12px]" placeholder="mi-app-lab" /></Field>
            <Field label="redirect_uri"><TextInput value={cfg.redirectUri} onChange={(e) => set('redirectUri')(e.target.value)} className="font-mono text-[12px]" /></Field>
            <Field label="scope"><TextInput value={cfg.scope} onChange={(e) => set('scope')(e.target.value)} className="font-mono text-[12px]" /></Field>
            <Field label="authorize endpoint"><TextInput value={authEndpoint} onChange={(e) => setAuthEndpoint(e.target.value)} className="font-mono text-[12px]" /></Field>
            <Field label="token endpoint"><TextInput value={tokenEndpoint} onChange={(e) => setTokenEndpoint(e.target.value)} className="font-mono text-[12px]" /></Field>
            <Button variant="ghost" onClick={() => void regen()} className="w-full">
              <RefreshCw size={14} /> regenerar state + nonce + PKCE
            </Button>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.03}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Link2 size={15} className="text-acento" /> URL de autorización</h3>
              <CopyBlock text={authUrl} label="authorize-url" maxH="max-h-32" />
              <div className="mt-3 space-y-1">
                {urlParams.map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-3 rounded border border-edge/60 bg-black/20 px-2.5 py-1.5">
                    <span className="shrink-0 font-mono text-[11px] font-bold text-acento">{k}</span>
                    <span className="break-all text-right font-mono text-[11px] text-ink/85">{v}</span>
                  </div>
                ))}
              </div>
              {cfg.flow === 'code-pkce' && (
                <div className="mt-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">code_verifier (guardar para el exchange):</p>
                  <CopyBlock text={cfg.codeVerifier} label="code_verifier" maxH="max-h-20" />
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Unplug size={15} className="text-acento" /> pega la URL/fragment del callback</h3>
              <TextInput
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder="http://localhost:8080/callback?code=abc123&state=xyz"
                className="font-mono text-[12px]"
              />
              {parsedCallback && (
                <div className="mt-3 space-y-1.5">
                  {(['code', 'state', 'access_token', 'id_token', 'error'] as const).map((k) =>
                    parsedCallback[k] ? (
                      <div key={k} className="flex items-center justify-between gap-3 rounded border border-edge/60 bg-black/20 px-3 py-1.5">
                        <span className="font-mono text-[11px] text-acento">{k}</span>
                        <span className="break-all font-mono text-[11px] text-ink">{parsedCallback[k]}</span>
                      </div>
                    ) : null,
                  )}
                  {parsedCallback.error && <p className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 font-mono text-[11.5px] text-bad">error: {parsedCallback.error_description ?? parsedCallback.error}</p>}
                  {Object.keys(parsedCallback.extra).length > 0 && (
                    <p className="text-[11.5px] text-grey">parámetros extra: {Object.keys(parsedCallback.extra).join(', ')} — revisa si el cliente los procesa sin validar.</p>
                  )}
                  {parsedCallback.code && (
                    <div className="pt-1">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">exchange del code en el token endpoint:</p>
                      <CopyBlock text={curlToken} label="token-exchange.sh" maxH="max-h-40" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.06}>
        <div className="card mt-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><ShieldAlert size={15} className="text-acento" /> ataques OAuth con su prueba</h3>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {OAUTH_ATTACKS.map((a) => (
              <div key={a.id} className="rounded-lg border border-edge bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-ink">{a.name}</span>
                  <Badge tone={DIFF_TONE[a.difficulty]}>{a.difficulty}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-grey">{a.how}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink/90"><b className="text-acento">prueba:</b> {a.payloadHint}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ok">✓ {a.detect}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
