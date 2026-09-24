import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FileKey, ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextArea, TextInput, Button, Badge, Reveal, ErrorBox, KV } from '../components/ui'
import { decodeJwt, verifyJwtHS, signJwt } from '../lib/jwt'
import { fmtDate, relTime } from '../lib/util'

const WEAK_SECRETS = ['secret', 'password', '123456', 'jwt_secret', 'your-256-bit-secret', 'key', 'changeme', 'supersecret', 'shhhhh']

export default function Jwt() {
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsIm5hbWUiOiJEIVNlMCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.t2HWZ0YK4hVvXsS7G1kMo3yN8Z8sKZ8bQ2o3dM4fG5g',
  )
  const [secret, setSecret] = useState('secret')
  const [verify, setVerify] = useState<{ valid: boolean; reason?: string } | null>(null)
  const [weak, setWeak] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [now, setNow] = useState(Date.now())

  // editor para firmar
  const [alg, setAlg] = useState('HS256')
  const [headerJson, setHeaderJson] = useState('{"alg":"HS256","typ":"JWT"}')
  const [payloadJson, setPayloadJson] = useState('{"sub":"user1","role":"user","exp":' + Math.floor(Date.now() / 1000 + 3600) + '}')
  const [signed, setSigned] = useState('')
  const [signErr, setSignErr] = useState<string | null>(null)

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const parts = useMemo(() => decodeJwt(token), [token])

  useEffect(() => {
    setVerify(null)
    setWeak(null)
    if (parts.error || !parts.header) return
    const algName = String(parts.header.alg ?? '')
    if (!algName.startsWith('HS')) return
    setChecking(true)
    verifyJwtHS(token, secret).then((v) => {
      setVerify(v)
      setChecking(false)
    })
    // probe secrets débiles
    const probe = async () => {
      for (const s of WEAK_SECRETS) {
        const r = await verifyJwtHS(token, s)
        if (r.valid) {
          setWeak(s)
          return
        }
      }
    }
    probe()
  }, [token, secret, parts])

  const doSign = async () => {
    setSignErr(null)
    try {
      const h = JSON.parse(headerJson)
      const p = JSON.parse(payloadJson)
      setSigned(await signJwt({ ...h, alg }, p, secret))
    } catch (e) {
      setSignErr((e as Error).message)
    }
  }

  const claims = parts.payload
  const exp = typeof claims?.exp === 'number' ? claims.exp * 1000 : null
  const iat = typeof claims?.iat === 'number' ? claims.iat * 1000 : null
  const nbf = typeof claims?.nbf === 'number' ? claims.nbf * 1000 : null
  const expired = exp !== null && exp < now

  return (
    <div>
      <ToolHeader icon={FileKey} title="JWT Toolkit" desc="Decodifica, verifica firma HS*, detecta secrets débiles y firma tus propios tokens — sin enviar nada a servidores" />

      {parts.error && <ErrorBox>{parts.error}</ErrorBox>}

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <Field label="Token JWT" hint="header.payload.signature">
              <TextArea value={token} onChange={(e) => setToken(e.target.value)} spellCheck={false} className="font-mono text-[12px]" />
            </Field>
          </div>
        </Reveal>

        {parts.header && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Reveal>
              <div className="card h-full overflow-hidden">
                <div className="border-b border-edge bg-black/30 px-4 py-2 font-mono text-[11px] text-grey">HEADER <Badge tone="info">{String(parts.header.alg ?? '?')}</Badge></div>
                <pre className="overflow-auto p-4 font-mono text-[12px] text-info">{JSON.stringify(parts.header, null, 2)}</pre>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="card h-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-edge bg-black/30 px-4 py-2">
                  <span className="font-mono text-[11px] text-grey">PAYLOAD</span>
                  {exp !== null && (
                    <Badge tone={expired ? 'bad' : 'ok'}>
                      {expired ? `expiró ${relTime(exp)}` : `válido por ${Math.max(0, Math.round((exp - now) / 1000))}s`}
                    </Badge>
                  )}
                </div>
                <pre className="max-h-80 overflow-auto p-4 font-mono text-[12px] text-acento">{JSON.stringify(parts.payload, null, 2)}</pre>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="card h-full overflow-hidden">
                <div className="border-b border-edge bg-black/30 px-4 py-2 font-mono text-[11px] text-grey">SIGNATURE (base64url)</div>
                <div className="p-4">
                  <code className="block break-all font-mono text-[11px] text-warn">{parts.signature || '(sin firma — alg=none)'}</code>
                  <div className="mt-4 space-y-1">
                    {iat && <KV k="iat" v={`${fmtDate(iat)} · ${relTime(iat)}`} />}
                    {nbf && <KV k="nbf" v={fmtDate(nbf)} />}
                    {exp && <KV k="exp" v={fmtDate(exp)} />}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        )}

        {parts.header && String(parts.header.alg ?? '').startsWith('HS') && (
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-4 font-mono text-sm font-bold text-white">Verificación de firma</h3>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Secret" className="flex-1 min-w-48">
                  <TextInput value={secret} onChange={(e) => setSecret(e.target.value)} />
                </Field>
                {checking && <span className="mb-3 font-mono text-xs text-grey">verificando…</span>}
                {!checking && verify && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-1 flex items-center gap-2">
                    {verify.valid ? (
                      <Badge tone="ok"><ShieldCheck size={12} /> firma VÁLIDA con este secret</Badge>
                    ) : (
                      <Badge tone="bad"><ShieldX size={12} /> firma inválida {verify.reason ? `(${verify.reason})` : ''}</Badge>
                    )}
                  </motion.div>
                )}
              </div>
              {weak && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start gap-3 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-xs text-bad">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    <b>¡Secret débil crackeado en cliente!</b> El token firma con <code className="font-mono">"{weak}"</code>.
                    Cualquiera puede forjar tokens válidos: cambia el secret inmediatamente (o mejor: usa RS256/ES256).
                  </span>
                </motion.div>
              )}
              {parts.header && parts.header.alg === 'none' && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-xs text-bad">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span><b>alg=none:</b> token sin firmar. Vulnerabilidad clásica de JWT si la librería acepta "none".</span>
                </div>
              )}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="card p-6">
            <h3 className="mb-4 font-mono text-sm font-bold text-white">Firmar tu propio token</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Header JSON">
                <TextArea value={headerJson} onChange={(e) => setHeaderJson(e.target.value)} className="min-h-20" />
              </Field>
              <Field label="Payload JSON">
                <TextArea value={payloadJson} onChange={(e) => setPayloadJson(e.target.value)} className="min-h-20" />
              </Field>
              <div className="content-start">
                <Field label="Algoritmo">
                  <div className="flex gap-1.5">
                    {['HS256', 'HS384', 'HS512'].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAlg(a)}
                        className={`flex-1 rounded-lg border px-2 py-2 font-mono text-[11px] transition-all ${alg === a ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Secret" className="mt-3">
                  <TextInput value={secret} onChange={(e) => setSecret(e.target.value)} />
                </Field>
                <Button onClick={doSign} className="mt-3">firmar</Button>
              </div>
            </div>
            {signErr && <div className="mt-3"><ErrorBox>{signErr}</ErrorBox></div>}
            {signed && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-ok/30 bg-ok/5 p-3">
                <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-ok">{signed}</code>
                <CopyBtn text={signed} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setPayloadJson(JSON.stringify({ ...JSON.parse(payloadJson || '{}'), exp: Math.floor(Date.now() / 1000) + 3600 }, null, 2))} className="chip hover:border-acento/50">+1h exp</button>
              <button onClick={() => setPayloadJson(JSON.stringify({ ...JSON.parse(payloadJson || '{}'), exp: Math.floor(Date.now() / 1000) - 1 }, null, 2))} className="chip hover:border-bad/50">expirado (para tests)</button>
              <button onClick={() => setPayloadJson(JSON.stringify({ ...JSON.parse(payloadJson || '{}'), role: 'admin' }, null, 2))} className="chip hover:border-warn/50">role=admin</button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}