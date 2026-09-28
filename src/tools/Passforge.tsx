import { useMemo, useState } from 'react'
import { KeyRound, Dices, ShieldCheck } from 'lucide-react'
import { ToolHeader, Field, Select, Button, Badge, Toggle, CopyBlock, InfoBanner, Reveal, KV } from '../components/ui'
import {
  generatePassphraseBatch, crackTime, strengthTier, CRACKER_SPEEDS, WORDLIST_SIZE,
  type PassphraseOptions,
} from '../lib/passforge'

const SEPARATORS = [
  { value: ' ', label: 'Espacio — "Cobre Lobo Menta"' },
  { value: '-', label: 'Guion — "Cobre-Lobo-Menta"' },
  { value: '.', label: 'Punto — "Cobre.Lobo.Menta"' },
  { value: '_', label: 'Guion bajo — "Cobre_Lobo_Menta"' },
  { value: '', label: 'Sin separador — "CobreLoboMenta"' },
  { value: ',', label: 'Coma — "Cobre,Lobo,Menta"' },
]

export default function Passforge() {
  const [words, setWords] = useState(4)
  const [separator, setSeparator] = useState(' ')
  const [capitalize, setCapitalize] = useState(true)
  const [appendNumber, setAppendNumber] = useState(true)
  const [leet, setLeet] = useState(false)
  const [count, setCount] = useState(5)
  const [tick, setTick] = useState(0)

  const opts: PassphraseOptions = { words, separator, capitalize, appendNumber, leet }
  const phrases = useMemo(() => generatePassphraseBatch(count, opts), [words, separator, capitalize, appendNumber, leet, count, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const best = phrases[0]
  const tier = strengthTier(best.entropyBits)

  const regenerate = () => setTick((t) => t + 1)

  return (
    <div>
      <ToolHeader icon={KeyRound} title="Passphrase Forge" badge="DICEWARE" desc="Contraseñas-frase memorables con entropía real de WebCrypto: la alternativa que el enfoque NIST recomienda sobre el galimatías de símbolos." />

      <InfoBanner>
        <b>¿Por qué passphrases?</b> Cuatro palabras al azar de una lista aportan más entropía que <code className="font-mono">P@ssw0rd!</code> y son infinitamente más fáciles de escribir y recordar. La generación es 100% local con <code className="font-mono">crypto.getRandomValues</code>: nada sale de tu navegador.
      </InfoBanner>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* controles */}
        <Reveal>
          <div className="card space-y-5 p-5">
            <Field label="Palabras" hint={`${words} palabras`}>
              <input
                type="range" min={3} max={12} value={words}
                onChange={(e) => setWords(Number(e.target.value))}
                className="w-full accent-[var(--acento)]"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-grey/60"><span>3</span><span>12</span></div>
            </Field>

            <Field label="Separador">
              <Select options={SEPARATORS} value={separator} onChange={(e) => setSeparator(e.target.value)} />
            </Field>

            <Field label="Cuántas generar" hint="1-20">
              <input
                type="range" min={1} max={20} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[var(--acento)]"
              />
            </Field>

            <div className="space-y-3 border-t border-edge/60 pt-4">
              <Toggle checked={capitalize} onChange={setCapitalize} label="Capitalizar cada palabra (+1 bit cada una)" />
              <Toggle checked={appendNumber} onChange={setAppendNumber} label="Añadir 2 dígitos aleatorios (+6,6 bits)" />
              <Toggle checked={leet} onChange={setLeet} label="Estética leet (no añade entropía)" />
            </div>

            <Button className="w-full" onClick={regenerate}>
              <Dices size={16} /> Generar {count} passphrases
            </Button>

            <div className="rounded-lg border border-edge/60 bg-black/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-grey">
              wordlist integrada: <span className="text-ink">{WORDLIST_SIZE.toLocaleString('es-ES')}</span> palabras · <span className="text-ink">{(Math.log2(WORDLIST_SIZE)).toFixed(1)}</span> bits/palabra
            </div>
          </div>
        </Reveal>

        {/* resultados */}
        <div className="space-y-4">
          <Reveal delay={0.05}>
            <div className="card p-5" style={{ borderColor: `${tier.color}66` }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey">
                  <ShieldCheck size={14} /> Mejor candidata
                </h2>
                <span className="rounded-full px-2.5 py-0.5 font-mono text-[11px]" style={{ color: tier.color, backgroundColor: `${tier.color}1a`, border: `1px solid ${tier.color}55` }}>
                  {tier.label} · {best.entropyBits} bits
                </span>
              </div>
              <div className="mt-3 break-all font-mono text-xl font-bold text-ink">{best.text}</div>
              <p className="mt-1 text-xs text-grey">{tier.advice}</p>
              <div className="mt-4 space-y-1">
                {CRACKER_SPEEDS.map((s) => (
                  <KV key={s.label} k={s.label} v={<span className="text-ink">{crackTime(best.entropyBits, s.rate)}</span>} />
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <CopyBlock
              label={`todas las candidatas (${phrases.length})`}
              text={phrases.map((p) => `${p.text}   [${p.entropyBits} bits · ${strengthTier(p.entropyBits).label}]`).join('\n')}
              maxH="max-h-72"
            />
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid gap-2 md:grid-cols-2">
              {phrases.map((p, i) => {
                const t = strengthTier(p.entropyBits)
                return (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-edge/70 bg-black/20 px-3 py-2">
                    <span className="truncate font-mono text-[13px] text-ink">{p.text}</span>
                    <span className="shrink-0 font-mono text-[10px]" style={{ color: t.color }}>{p.entropyBits}b</span>
                  </div>
                )
              })}
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="card p-4 text-xs leading-relaxed text-grey">
              <b className="text-ink">Cómo usarla bien:</b> el gestor de contraseñas para todo lo que puedas, y esta passphrase para las 2-3 cosas que debes teclear de memoria (disco de arranque, llave del gestor, sesión de otro PC). La entropía mostrada asume que el atacante conoce la wordlist — si no la conoce, aún peor para él: nunca cuentes con eso.
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
