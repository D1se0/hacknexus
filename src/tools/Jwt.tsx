import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileKey, ShieldCheck, ShieldX, AlertTriangle, Upload, Play, Square, Sparkles } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextArea, TextInput, Button, Badge, Reveal, ErrorBox, KV, useToast } from '../components/ui'
import { decodeJwt, verifyJwtHS, signJwt, crackJwtSecret, b64urlEncode, type CrackProgress } from '../lib/jwt'
import { fmtDate, relTime, fmtNum } from '../lib/util'

const WEAK_SECRETS = ['secret', 'password', '123456', 'jwt_secret', 'your-256-bit-secret', 'key', 'changeme', 'supersecret', 'shhhhh']

const DEFAULT_DICT = ['secret', 'password', '123456', '12345678', 'qwerty', 'abc123', 'admin', 'letmein', 'welcome', 'monkey', 'jwt_secret', 'your-256-bit-secret', 'your-512-bit-secret', 'changeme', 'key', 'clave', 'supersecret', 'super_secret', 'shhhhh', 'topsecret', 's3cr3t', 's3cr3t!', 'p@ssw0rd', 'iloveyou', 'football', 'baseball', 'dragon', 'master', 'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1', 'password1', 'password123', 'jwt', 'token', 'test', 'dev', 'development', 'production', 'prod', 'staging', 'mysecret', 'my-secret', 'my_jwt_secret', 'jwtsecret', 'jwt-secret', 'hs256-secret', 'example', 'example-secret', 'd1se0', 'hacknexus']

export default function Jwt() {
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsIm5hbWUiOiJEIVNlMCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.t2HWZ0YK4hVvXsS7G1kMo3yN8Z8sKZ8bQ2o3dM4fG5g',
  )
  const [secret, setSecret] = useState('secret')
  const [verify, setVerify] = useState<{ valid: boolean; reason?: string } | null>(null)
  const [weak, setWeak] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [now, setNow] = useState(Date.now())
  const toast = useToast()

  // editor para firmar
  const [alg, setAlg] = useState('HS256')
  const [headerJson, setHeaderJson] = useState('{"alg":"HS256","typ":"JWT"}')
  const [payloadJson, setPayloadJson] = useState('{"sub":"user1","role":"user","exp":' + Math.floor(Date.now() / 1000 + 3600) + '}')
  const [signed, setSigned] = useState('')
  const [signErr, setSignErr] = useState<string | null>(null)

  // cracker
  const [dict, setDict] = useState<string[]>(DEFAULT_DICT)
  const [dictName, setDictName] = useState('integrado (56)')
  const [crackRunning, setCrackRunning] = useState(false)
  const [crackProgress, setCrackProgress] = useState<CrackProgress | null>(null)
  const [crackFound, setCrackFound] = useState<string | null>(null)
  const [crackErr, setCrackErr] = useState<string | null>(null)
  const crackStopRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const parts = useMemo(() => decodeJwt(token), [token])
  const tokenAlg = String(parts.header?.alg ?? '')
  const isHS = tokenAlg.startsWith('HS')
  const isNone = tokenAlg === 'none' || (!tokenAlg && !parts.signature)

  useEffect(() => {
    setVerify(null)
    setWeak(null)
    if (parts.error || !parts.header) return
    if (!tokenAlg.startsWith('HS')) return
    setChecking(true)
    verifyJwtHS(token, secret).then((v) => {
      setVerify(v)
      setChecking(false)
    })
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
  }, [token, secret, parts, tokenAlg])

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

  const forgeNone = () => {
    setSignErr(null)
    try {
      const baseHeader = parts.header ?? JSON.parse(headerJson)
      const payload = parts.payload ?? JSON.parse(payloadJson)
      const header = { ...baseHeader, alg: 'none' }
      const t = `${b64urlEncode(new TextEncoder().encode(JSON.stringify(header)))}.${b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))}.`
      setToken(t)
      toast('Token forjado sin firma (alg=none)')
    } catch (e) {
      setSignErr(`no se pudo forjar: ${(e as Error).message}`)
    }
  }

  const loadDictFile = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).map((l) => l.trimEnd())
      const unique = lines.length > 5_000_000 ? lines.filter(Boolean) : Array.from(new Set(lines.filter(Boolean)))
      if (!unique.length) {
        setCrackErr('el diccionario está vacío')
        return
      }
      setDict(unique)
      setDictName(`${file.name} (${fmtNum(unique.length)})`)
      setCrackErr(null)
      toast(`Diccionario cargado: ${fmtNum(unique.length)} secretos`)
    } catch (e) {
      setCrackErr(`no se pudo leer el fichero: ${(e as Error).message}`)
    }
  }

  const runCrack = async () => {
    if (crackRunning || !isHS || !parts.signature) return
    crackStopRef.current = false
    setCrackErr(null)
    setCrackFound(null)
    setCrackProgress(null)
    setCrackRunning(true)
    try {
      const found = await crackJwtSecret(
        token,
        dict,
        (p) => setCrackProgress(p),
        () => crackStopRef.current,
      )
      if (found) {
        setCrackFound(found)
        setSecret(found)
        toast('¡Secret crackeado!')
      }
    } catch (e) {
      setCrackErr((e as Error).message)
    } finally {
      setCrackRunning(false)
    }
  }

  const claims = parts.payload
  const exp = typeof claims?.exp === 'number' ? claims.exp * 1000 : null
  const iat = typeof claims?.iat === 'number' ? claims.iat * 1000 : null
  const nbf = typeof claims?.nbf === 'number' ? claims.nbf * 1000 : null
  const expired = exp !== null && exp < now

  const pct = crackProgress && crackProgress.total > 0 ? Math.min(100, (crackProgress.tested / crackProgress.total) * 100) : 0

  return (
    <div className="min-w-0">
      <ToolHeader icon={FileKey} title="JWT Toolkit" desc="Decodifica, verifica HS*, genera tokens sin firma (alg=none), crackea secrets con diccionario y firma tus propios tokens — 100% local" />

      {parts.error && <ErrorBox>{parts.error}</ErrorBox>}

      {isNone && !parts.error && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start gap-3 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-xs text-bad">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-all">
            <b>alg=none:</b> token SIN firmar. Vulnerabilidad clásica: si la librería del servidor acepta "none",
            cualquiera puede suplantar usuarios cambiando el payload. Genera uno nuevo con el botón «quitar firma» o el algoritmo none del editor.
          </span>
        </motion.div>
      )}

      <div className="grid min-w-0 gap-6">
        <Reveal>
          <div className="card p-6">
            <Field label="Token JWT" hint="header.payload.signature">
              <TextArea value={token} onChange={(e) => setToken(e.target.value)} spellCheck={false} className="font-mono text-[12px]" />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={forgeNone} className="chip hover:border-bad/50">⚡ quitar firma (alg=none)</button>
              {['HS256', 'HS384', 'HS512'].map((a) => (
                <button
                  key={a}
                  onClick={async () => {
                    try {
                      const p = parts.payload ?? JSON.parse(payloadJson)
                      setToken(await signJwt({ alg: a, typ: 'JWT' }, p, secret))
                      setSecret(secret)
                      toast(`refirmado con ${a}`)
                    } catch (e) {
                      setSignErr((e as Error).message)
                    }
                  }}
                  className="chip hover:border-acento/50"
                >
                  refirmar {a}
                </button>
              ))}
            </div>
            {signErr && <div className="mt-3"><ErrorBox>{signErr}</ErrorBox></div>}
          </div>
        </Reveal>

        {parts.header && (
          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <Reveal>
              <div className="card h-full min-w-0 overflow-hidden">
                <div className="border-b border-edge bg-black/30 px-4 py-2 font-mono text-[11px] text-grey">HEADER <Badge tone="info">{String(parts.header.alg ?? '?')}</Badge></div>
                <pre className="overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[12px] text-info">{JSON.stringify(parts.header, null, 2)}</pre>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="card h-full min-w-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-edge bg-black/30 px-4 py-2">
                  <span className="font-mono text-[11px] text-grey">PAYLOAD</span>
                  {exp !== null && (
                    <Badge tone={expired ? 'bad' : 'ok'}>
                      {expired ? `expiró ${relTime(exp)}` : `válido por ${Math.max(0, Math.round((exp - now) / 1000))}s`}
                    </Badge>
                  )}
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[12px] text-acento">{JSON.stringify(parts.payload, null, 2)}</pre>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="card h-full min-w-0 overflow-hidden">
                <div className="border-b border-edge bg-black/30 px-4 py-2 font-mono text-[11px] text-grey">SIGNATURE (base64url)</div>
                <div className="min-w-0 p-4">
                  <code className="block min-w-0 break-all font-mono text-[11px] text-warn">{parts.signature || '(sin firma — alg=none)'}</code>
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

        {parts.header && isHS && (
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-4 font-mono text-sm font-bold text-white">Verificación de firma</h3>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Secret" className="min-w-48 flex-1">
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
                  <span className="min-w-0 break-all">
                    <b>¡Secret débil crackeado en cliente!</b> El token firma con <code className="font-mono">"{weak}"</code>.
                    Cualquiera puede forjar tokens válidos: cambia el secret inmediatamente (o mejor: usa RS256/ES256).
                  </span>
                </motion.div>
              )}
            </div>
          </Reveal>
        )}

        {parts.header && isHS && parts.signature && (
          <Reveal>
            <div className="card min-w-0 p-6">
              <h3 className="mb-1 flex items-center gap-2 font-mono text-sm font-bold text-white"><Sparkles size={14} className="text-acento" /> Cracker de secrets HS*</h3>
              <p className="mb-4 font-mono text-[11px] text-grey">
                Sube un diccionario (rockyou.txt, listas de secrets de repos, etc.) y se probará línea a línea contra la firma del token.
                Todo se calcula en tu navegador con SHA-2 nativo — nada se sube a ningún servidor.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.dic,.lst,.csv,.json,.md,text/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) loadDictFile(f)
                    e.target.value = ''
                  }}
                />
                <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} /> subir diccionario
                </Button>
                <Button variant="ghost" onClick={() => { setDict(DEFAULT_DICT); setDictName('integrado (56)'); setCrackErr(null) }}>
                  dict integrado
                </Button>
                {!crackRunning ? (
                  <Button onClick={runCrack}><Play size={14} /> crackear token</Button>
                ) : (
                  <Button variant="danger" onClick={() => (crackStopRef.current = true)}><Square size={14} /> detener</Button>
                )}
                <Badge tone="neutral" className="max-w-full"><span className="truncate">{dictName}</span></Badge>
              </div>

              {crackErr && <div className="mt-4"><ErrorBox>{crackErr}</ErrorBox></div>}

              {(crackRunning || crackProgress) && (
                <div className="mt-5 min-w-0">
                  <div className="h-2 w-full overflow-hidden rounded-full border border-edge bg-black/40">
                    <motion.div
                      className="h-full rounded-full bg-acento"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-[10px] text-grey">
                    <span>{fmtNum(crackProgress?.tested ?? 0)} / {fmtNum(crackProgress?.total ?? dict.length)} secretos probados</span>
                    <span className="text-acento">{fmtNum(Math.round(crackProgress?.rate ?? 0))} secretos/s</span>
                  </div>
                </div>
              )}

              {crackFound && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-lg border border-ok/40 bg-ok/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold text-ok"><ShieldCheck size={14} /> ¡SECRET ENCONTRADO!</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-lg border border-ok/30 bg-black/50 px-3 py-2 font-mono text-[13px] text-ok">{crackFound}</code>
                    <CopyBtn text={crackFound} label="copiar secret" />
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-grey">ya está cargado en el campo «Secret» de arriba — la verificación ahora dará VÁLIDA</p>
                </motion.div>
              )}

              {!crackFound && crackProgress?.done && !crackRunning && (
                <div className="mt-5 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 font-mono text-xs text-warn">
                  Diccionario agotado ({fmtNum(crackProgress.tested)} secretos): el secret no está en esta lista. Prueba con rockyou.txt o una lista específica de JWT secrets.
                </div>
              )}
            </div>
          </Reveal>
        )}

        <Reveal>
          <div className="card min-w-0 p-6">
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
                    {['HS256', 'HS384', 'HS512', 'none'].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAlg(a)}
                        className={`flex-1 rounded-lg border px-1.5 py-2 font-mono text-[11px] transition-all ${alg === a ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'} ${a === 'none' ? 'text-bad/90' : ''}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Secret" className="mt-3">
                  <TextInput value={secret} onChange={(e) => setSecret(e.target.value)} disabled={alg === 'none'} />
                </Field>
                <Button onClick={doSign} className="mt-3" disabled={alg === 'none' ? false : !secret}>firmar {alg === 'none' ? '(sin secret)' : ''}</Button>
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
