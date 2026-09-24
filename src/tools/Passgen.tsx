import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, RefreshCw, Copy, ShieldCheck } from 'lucide-react'
import { ToolHeader, Badge, Button, Field, TextInput, CopyBtn, Reveal } from '../components/ui'
import { generatePassword, generatePassphrase, generatePin, CHARSETS, type GenOptions } from '../lib/passwords'
import { analyzeStrength } from '../lib/passwords'

type Mode = 'random' | 'passphrase' | 'pin'

export default function Passgen() {
  const [mode, setMode] = useState<Mode>('random')
  const [opts, setOpts] = useState<GenOptions>({ length: 20, upper: true, lower: true, digits: true, symbols: true, noAmbiguous: true })
  const [words, setWords] = useState(4)
  const [sep, setSep] = useState('-')
  const [pinLen, setPinLen] = useState(6)
  const [batch, setBatch] = useState<string[]>([])
  const [active, setActive] = useState(0)

  const gen = () => {
    const n = 5
    const out: string[] = []
    for (let i = 0; i < n; i++) {
      if (mode === 'random') out.push(generatePassword(opts))
      else if (mode === 'passphrase') out.push(generatePassphrase(words, sep, true, true))
      else out.push(generatePin(pinLen))
    }
    setBatch(out)
    setActive(0)
  }

  useEffect(() => {
    gen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, opts, words, sep, pinLen])

  const pw = batch[active] ?? ''
  const strength = pw ? analyzeStrength(pw) : null

  const entropyBits = (() => {
    if (mode === 'pin') return pinLen * Math.log2(10)
    if (mode === 'passphrase') return words * Math.log2(98) + Math.log2(100)
    let pool = 0
    if (opts.lower) pool += CHARSETS.lower.length
    if (opts.upper) pool += CHARSETS.upper.length
    if (opts.digits) pool += CHARSETS.digits.length
    if (opts.symbols) pool += CHARSETS.symbols.length
    if (!pool) return 0
    return opts.length * Math.log2(pool)
  })()

  const crackTime = (() => {
    // 1e11 intentos/s (offline GPU)
    const seconds = 2 ** entropyBits / 1e11
    if (seconds < 1) return { text: 'instantáneo', tone: 'bad' as const }
    const units: [number, string, 'bad' | 'warn' | 'ok' | 'info'][] = [
      [1, 'segundo', 'bad'], [60, 'minuto', 'bad'], [3600, 'hora', 'bad'], [86400, 'día', 'warn'],
      [2592000, 'mes', 'warn'], [31536000, 'año', 'info'], [31536000000, 'milenio', 'ok'],
    ]
    let best: [number, string, 'bad' | 'warn' | 'ok' | 'info'] = units[0]
    for (const u of units) if (seconds / u[0] >= 1) best = u
    const v = seconds / best[0]
    return { text: `${v >= 100 ? Math.round(v).toLocaleString('es-ES') : v.toFixed(1)} ${best[1]}${v >= 2 ? 's' : ''}`, tone: best[2] }
  })()

  return (
    <div>
      <ToolHeader icon={KeyRound} title="Generador de Contraseñas" desc="crypto.getRandomValues puro: contraseñas, frases (passphrase) y PINs con análisis de entropía en vivo" />

      <div className="grid gap-6">
        <Reveal>
          <div className="flex gap-2">
            {([['random', 'aleatoria'], ['passphrase', 'frase'], ['pin', 'PIN']] as const).map(([m, l]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border px-4 py-2.5 font-mono text-sm transition-all ${
                  mode === m ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Reveal>

        {mode === 'random' && (
          <Reveal>
            <div className="card grid gap-5 p-6 md:grid-cols-2">
              <Field label="Longitud" hint={String(opts.length)}>
                <input type="range" min={4} max={64} value={opts.length} onChange={(e) => setOpts({ ...opts, length: +e.target.value })} className="w-full accent-[#2ee88a]" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['upper', 'ABC'],
                  ['lower', 'abc'],
                  ['digits', '0-9'],
                  ['symbols', '#@$%'],
                ] as const).map(([k, l]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg border border-edge px-3 py-2 font-mono text-xs text-grey hover:border-acento/40">
                    <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} className="accent-[#2ee88a]" />
                    {l}
                  </label>
                ))}
              </div>
              <label className="col-span-full flex cursor-pointer items-center gap-2 font-mono text-xs text-grey">
                <input type="checkbox" checked={opts.noAmbiguous} onChange={(e) => setOpts({ ...opts, noAmbiguous: e.target.checked })} className="accent-[#2ee88a]" />
                excluir caracteres ambiguos (l, 1, I, O, 0)
              </label>
            </div>
          </Reveal>
        )}

        {mode === 'passphrase' && (
          <Reveal>
            <div className="card grid gap-4 p-6 md:grid-cols-3">
              <Field label="Palabras" hint={String(words)}>
                <input type="range" min={3} max={8} value={words} onChange={(e) => setWords(+e.target.value)} className="w-full accent-[#2ee88a]" />
              </Field>
              <Field label="Separador">
                <TextInput value={sep} onChange={(e) => setSep(e.target.value)} maxLength={3} />
              </Field>
              <div className="flex items-end font-mono text-[11px] text-grey">
                wordlist en español (~100 palabras) + dígito aleatorio
              </div>
            </div>
          </Reveal>
        )}

        {mode === 'pin' && (
          <Reveal>
            <div className="card p-6">
              <Field label="Dígitos" hint={String(pinLen)}>
                <input type="range" min={4} max={12} value={pinLen} onChange={(e) => setPinLen(+e.target.value)} className="w-full accent-[#2ee88a]" />
              </Field>
            </div>
          </Reveal>
        )}

        {/* Resultado principal */}
        <AnimatePresence mode="popLayout">
          <motion.div key={pw} initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }} className="card relative overflow-hidden p-6">
            <div className="scanline-band opacity-50" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xl font-bold text-acento md:text-2xl">{pw}</code>
              <CopyBtn text={pw} label="copiar contraseña" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-edge bg-black/30 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-grey">entropía</div>
                <div className="mt-1 font-mono text-lg font-bold text-white">{entropyBits.toFixed(0)} bits</div>
              </div>
              <div className="rounded-lg border border-edge bg-black/30 p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-grey">crackeo (offline 1e11 h/s)</div>
                <div className={`mt-1 font-mono text-lg font-bold ${
                  crackTime.tone === 'ok' ? 'text-ok' : crackTime.tone === 'info' ? 'text-info' : crackTime.tone === 'warn' ? 'text-warn' : 'text-bad'
                }`}>{crackTime.text}</div>
              </div>
              <div className="col-span-2 rounded-lg border border-edge bg-black/30 p-3 md:col-span-1">
                <div className="font-mono text-[10px] uppercase tracking-widest text-grey">zxcvbn</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-2 w-5 rounded-full ${strength && i <= strength.score ? (strength.score >= 3 ? 'bg-ok' : strength.score >= 2 ? 'bg-warn' : 'bg-bad') : 'bg-edge'}`} />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-grey">{strength?.label}</span>
                </div>
              </div>
            </div>
            <Button onClick={gen} className="mt-5 gap-2">
              <RefreshCw size={14} /> regenerar lote
            </Button>
          </motion.div>
        </AnimatePresence>

        {batch.length > 1 && (
          <Reveal>
            <div className="card p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-grey">más del lote (clic para activar)</div>
              <div className="grid gap-1.5">
                {batch.map((b, i) => (
                  <motion.button
                    key={b + i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setActive(i)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left font-mono text-[13px] transition-colors ${
                      i === active ? 'border border-acento/40 bg-acento/10 text-acento' : 'border border-transparent text-grey hover:bg-panel'
                    }`}
                  >
                    {i === active ? <ShieldCheck size={13} /> : <Copy size={12} className="opacity-40" />}
                    <span className="min-w-0 flex-1 break-all">{b}</span>
                    <CopyBtn text={b} className="border-0 bg-transparent px-1" />
                  </motion.button>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  )
}