import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, KV, CopyBtn } from '../components/ui'
import { analyzeStrength, checkPwned } from '../lib/passwords'

const SCORE_BAR = [
  { label: 'Muy débil', color: 'bg-bad', text: 'text-bad' },
  { label: 'Débil', color: 'bg-bad', text: 'text-bad' },
  { label: 'Aceptable', color: 'bg-warn', text: 'text-warn' },
  { label: 'Fuerte', color: 'bg-ok', text: 'text-ok' },
  { label: 'Muy fuerte', color: 'bg-acento', text: 'text-acento' },
]

export default function Passaudit() {
  const [pw, setPw] = useState('Superman123!')
  const [show, setShow] = useState(false)
  const [pwned, setPwned] = useState<{ count: number; sha1: string } | null>(null)
  const [pwnedBusy, setPwnedBusy] = useState(false)
  const [pwnedErr, setPwnedErr] = useState<string | null>(null)

  const strength = pw ? analyzeStrength(pw) : null
  const bar = strength ? SCORE_BAR[strength.score] : null

  const doCheck = async () => {
    setPwnedErr(null)
    setPwnedBusy(true)
    try {
      setPwned(await checkPwned(pw))
    } catch (e) {
      setPwnedErr((e as Error).message)
    } finally {
      setPwnedBusy(false)
    }
  }

  return (
    <div>
      <ToolHeader icon={ShieldCheck} title="Auditor de Contraseñas" desc="zxcvbn local + k-anonymity de HaveIBeenPwned (solo viajan 5 caracteres del SHA-1)" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <Field label="Contraseña a auditar" hint="nunca sale de tu navegador">
              <div className="relative">
                <TextInput
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="pr-10 text-lg"
                />
                <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-grey hover:text-ink">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          </div>
        </Reveal>

        {strength && bar && (
          <>
            <Reveal>
              <div className="card p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-grey">puntuación zxcvbn</span>
                  <Badge tone={strength.score >= 3 ? 'ok' : strength.score >= 2 ? 'warn' : 'bad'}>{strength.label}</Badge>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className={`h-3 flex-1 rounded-full origin-left ${i <= strength.score ? bar.color : 'bg-edge'}`}
                    />
                  ))}
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <KV k="estimación de guesses" v={`10^${strength.guessesLog10.toFixed(1)}`} />
                  <KV k="tiempo de crackeo (1e11 h/s)" v={strength.crackTime} />
                  <KV k="patrones detectados" v={strength.feedback} />
                  <KV k="longitud" v={`${pw.length} caracteres`} />
                </div>
                {strength.suggestions.length > 0 && (
                  <div className="mt-4 rounded-lg border border-warn/30 bg-warn/5 p-4">
                    <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-warn">sugerencias</div>
                    <ul className="space-y-1 text-xs text-ink">
                      {strength.suggestions.map((s) => (
                        <li key={s} className="flex gap-2"><span className="text-warn">›</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal>
              <div className="card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={doCheck} disabled={pwnedBusy || !pw} variant="ghost">
                    {pwnedBusy ? 'consultando…' : '¿ha sido filtrada? (HIBP k-anonymity)'}
                  </Button>
                  <span className="font-mono text-[10px] text-grey">solo se envían los 5 primeros hex del SHA-1</span>
                </div>
                {pwnedErr && <div className="mt-3 font-mono text-xs text-bad">{pwnedErr}</div>}
                {pwned && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                      pwned.count > 0 ? 'border-bad/40 bg-bad/10 text-bad' : 'border-ok/40 bg-ok/10 text-ok'
                    }`}
                  >
                    {pwned.count > 0 ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <ShieldCheck size={18} className="mt-0.5 shrink-0" />}
                    <div>
                      {pwned.count > 0 ? (
                        <>
                          <b>¡Filtrada!</b> Aparece <b>{pwned.count.toLocaleString('es-ES')}</b> veces en breaches conocidos.
                          No la uses jamás. <span className="font-mono text-[11px] opacity-70">SHA-1: {pwned.sha1}</span>
                        </>
                      ) : (
                        <><b>No aparece en breaches conocidos.</b> Eso no la hace segura por sí solo: sigue la puntuación de arriba.</>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </Reveal>
          </>
        )}
      </div>
    </div>
  )
}