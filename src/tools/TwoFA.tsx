import { useCallback, useEffect, useMemo, useState } from 'react'
import { Smartphone, RefreshCw, ShieldAlert, Info } from 'lucide-react'
import QRCode from 'qrcode'
import { ToolHeader, Badge, Reveal, InfoBanner, Button, Field, TextInput, CopyBlock } from '../components/ui'
import { newLabSecret, generateRecoveryCodes, OTP_WEAKNESSES, buildOtpBruteScript, otpTestRequests } from '../lib/twofa'
import { totp } from '../lib/totp'

const SEV_TONE = { crítica: 'bad', alta: 'warn', media: 'info' } as const

export default function TwoFA() {
  const [lab, setLab] = useState(() => newLabSecret())
  const [code, setCode] = useState('--')
  const [secsLeft, setSecsLeft] = useState(30)
  const [endpoint, setEndpoint] = useState('/2fa/verify')
  const [session, setSession] = useState('TU_SESION_INTERMEDIA')
  const [qr, setQr] = useState('')

  const regen = useCallback(() => setLab(newLabSecret()), [])
  useEffect(() => { regen() }, [regen])

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const r = await totp(lab.secret)
        if (!alive) return
        setCode(r.code)
        setSecsLeft(r.remainingSeconds)
      } catch { /* secret malformado: no tumba la página */ }
    }
    void tick()
    const iv = setInterval(tick, 1000)
    return () => { alive = false; clearInterval(iv) }
  }, [lab])

  useEffect(() => {
    QRCode.toDataURL(lab.uri, { margin: 1, width: 160, color: { dark: '#2ee88a', light: '#0b0f0d' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [lab])

  const recovery = useMemo(() => generateRecoveryCodes(10), [])
  const brute = useMemo(() => buildOtpBruteScript(endpoint, session), [endpoint, session])
  const tests = useMemo(() => otpTestRequests(endpoint), [endpoint])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Smartphone}
        title="2FA / OTP Lab"
        desc="Segundo factor en tu laboratorio: TOTP vivo con QR, códigos de recuperación con entropía real, debilidades típicas del 2FA con su prueba y el brute force que lo mata"
        badge="auth"
      />

      <InfoBanner>
        Este lab genera SU PROPIO secreto TOTP para que practiques con un factor real sin tocar cuentas ajenas. Las debilidades de abajo son las que verás en auditorías: el 2FA mal implementado es decoración, no seguridad.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[340px_1fr]">
        <Reveal>
          <div className="card p-5 text-center">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Smartphone size={15} className="text-acento" /> tu TOTP de laboratorio</h3>
            {qr && <img src={qr} alt="QR del secreto TOTP" className="mx-auto rounded-lg border border-edge" />}
            <p className="mt-3 font-mono text-3xl font-extrabold tracking-widest text-acento">{code}</p>
            <p className="mt-1 font-mono text-[11px] text-grey">expira en {secsLeft}s</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-black/40">
              <div className="h-full bg-acento transition-all" style={{ width: `${(secsLeft / 30) * 100}%` }} />
            </div>
            <p className="mt-3 break-all rounded-lg border border-edge bg-black/30 px-3 py-2 font-mono text-[10.5px] text-grey">{lab.secret}</p>
            <Button variant="ghost" onClick={regen} className="mt-3 w-full">
              <RefreshCw size={14} /> nuevo secreto
            </Button>
            <p className="mt-2 text-[11px] leading-relaxed text-grey">Escríbelo en cualquier app authenticator y tienes un 2FA real para practicar los ataques de la derecha.</p>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.03}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">códigos de recuperación con entropía real</h3>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {recovery.map((c) => (
                  <code key={c} className="rounded border border-edge bg-black/30 px-2 py-1.5 text-center font-mono text-[11px] text-ink">{c}</code>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
                10 caracteres de un alfabeto de 32 sin ambigüedades (~50 bits): comparable a una contraseña larga. Si los códigos de recovery de un target son de 4-6 dígitos o secuenciales, son el punto más débil de todo su 2FA.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">testing rápido de un 2FA real</h3>
              <Field label="endpoint de verificación">
                <TextInput value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="font-mono text-[12px]" />
              </Field>
              <div className="mt-3">
                <CopyBlock text={tests} label="2fa-checks.sh" maxH="max-h-44" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.06}>
        <div className="card mt-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><ShieldAlert size={15} className="text-acento" /> debilidades típicas del segundo factor</h3>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {OTP_WEAKNESSES.map((w) => (
              <div key={w.id} className="rounded-lg border border-edge bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-bold text-ink">{w.title}</span>
                  <Badge tone={SEV_TONE[w.severity]}>{w.severity}</Badge>
                </div>
                <p className="mt-0.5 font-mono text-[10.5px] text-grey">{w.where}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-grey">{w.why}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink/90"><b className="text-acento">prueba:</b> {w.test}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="card mt-4 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> script de brute force didáctico (solo tu lab)</h3>
          <CopyBlock text={brute} label="turbo-intruder.py" maxH="max-h-56" />
          <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
            El ataque single-packet de HTTP/2 manda los 1M códigos prácticamente en paralelo: si el servidor no bloquea tras 3-5 fallos, el "segundo factor" solo añade una pestaña de progreso al ataque.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
