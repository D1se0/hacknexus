import { useEffect, useMemo, useState } from 'react'
import { Dices, ShieldCheck, Wrench } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  InfoBanner,
  KV,
  Reveal,
  ToolHeader,
} from '../components/ui'
import {
  BIP39_LIMITS,
  BIP39_SECURITY,
  BIP39_STRENGTHS,
  bip39Anatomy,
  bip39BruteFix,
  bip39Generate,
  bip39Seed,
  bip39Validate,
} from '../lib/bip39'
import type { Bip39Strength } from '../lib/bip39'

type Tab = 'gen' | 'validate' | 'fix'

const TABS: { id: Tab; label: string; icon: typeof Dices }[] = [
  { id: 'gen', label: 'Generar', icon: Dices },
  { id: 'validate', label: 'Validar & anatomía', icon: ShieldCheck },
  { id: 'fix', label: 'Reparar', icon: Wrench },
]

const DEMO_FIX = 'legal winner thank year wave sausage worth useful legal winner thank yellow'

export default function Bip39Lab() {
  const [tab, setTab] = useState<Tab>('gen')

  /* Generar */
  const [strength, setStrength] = useState<Bip39Strength>(12)
  const [generated, setGenerated] = useState<string[]>([])
  const genEntropyBits = BIP39_STRENGTHS.find((s) => s.words === strength)?.entropyBits ?? 128

  /* Validar */
  const [input, setInput] = useState('')
  const validation = useMemo(() => (input.trim() ? bip39Validate(input) : null), [input])
  const anatomy = useMemo(() => bip39Anatomy(input.trim().toLowerCase().split(/\s+/).filter(Boolean)), [input])
  const [seedHex, setSeedHex] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [seedBusy, setSeedBusy] = useState(false)
  useEffect(() => {
    if (!validation || !validation.ok) {
      setSeedHex('')
      return
    }
    let alive = true
    setSeedBusy(true)
    bip39Seed(input.trim(), passphrase)
      .then((hex) => {
        if (alive) setSeedHex(hex)
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setSeedBusy(false)
      })
    return () => {
      alive = false
    }
  }, [input, passphrase, validation])

  /* Reparar */
  const [fixInput, setFixInput] = useState(DEMO_FIX)
  const [fixPos, setFixPos] = useState(2)
  const [fixResult, setFixResult] = useState<ReturnType<typeof bip39BruteFix> | null>(null)

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Dices}
        title="BIP39 Seed Lab"
        desc="Genera mnemonics reales e interoperables (entropía criptográfica + checksum SHA-256 + wordlist oficial embebida), valida la anatomía bit a bit y repara una palabra corrupta por fuerza bruta"
        badge="Ronda 17"
      />

      <InfoBanner>
        <b>Si pegas aquí tu mnemonic REAL de una wallet, considérralo comprometido.</b> Este lab existe para entender la
        anatomía de la seed con frases de prueba: cómo 128 bits de entropía + 7 de checksum se convierten en 12 palabras,
        cómo un solo bit corrupto revienta el checksum y por qué la 25ª palabra (passphrase) es la única defensa real si
        alguien ve tu papel.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'gen' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">Longitud:</label>
                {BIP39_STRENGTHS.map((s) => (
                  <Button
                    key={s.words}
                    variant={strength === s.words ? 'primary' : 'ghost'}
                    className="text-xs"
                    onClick={() => setStrength(s.words)}
                  >
                    {s.words} palabras
                  </Button>
                ))}
                <Badge tone="info">{genEntropyBits} bits de entropía + {BIP39_STRENGTHS.find((s) => s.words === strength)?.checksumBits} de checksum</Badge>
              </div>
              <Button onClick={() => setGenerated(bip39Generate(strength))}>
                <Dices size={14} /> Generar mnemonic de prueba
              </Button>
              {generated.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-ok/40 bg-ok/5 p-4">
                    <p className="font-mono text-lg leading-relaxed text-ok">{generated.join(' ')}</p>
                  </div>
                  <CopyBlock text={generated.join(' ')} label="mnemonic (12/15/18/21/24)" />
                  <div className="grid gap-x-6 sm:grid-cols-3">
                    <KV k="Palabras" v={String(generated.length)} />
                    <KV k="Entropía" v={`${genEntropyBits} bits (${genEntropyBits / 8} bytes de crypto.getRandomValues)`} />
                    <KV k="Combinaciones" v={`2^${genEntropyBits} ≈ 10^${Math.round(genEntropyBits * Math.log10(2))}`} />
                  </div>
                  <p className="text-xs text-white/50">
                    Válido en cualquier wallet conforme a BIP39. La seed (PBKDF2-HMAC-SHA512, 2048 iteraciones) se deriva
                    en la pestaña «Validar».
                  </p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'validate' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Mnemonic a validar (solo de prueba, no reales)
              </label>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm outline-none focus:border-acento/60"
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="legal winner thank year wave sausage worth useful legal winner thank yellow"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setInput('legal winner thank year wave sausage worth useful legal winner thank yellow')}
                >
                  vector oficial 12 palabras (válido)
                </Button>
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setInput('legal winner thank year wave sausage worth useful legal winner thank yellow'.replace('year', 'gear'))}
                >
                  mismo con UNA palabra corrupta (checksum roto)
                </Button>
              </div>
            </div>

            {validation && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={validation.ok ? 'ok' : 'bad'}>{validation.ok ? 'MNEMONIC VÁLIDO' : 'INVÁLIDO'}</Badge>
                  <span className="text-sm">{validation.wordCount} palabras</span>
                  {validation.strengthBits && <Badge tone="info">{validation.strengthBits} bits de entropía</Badge>}
                </div>
                {validation.errors.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {validation.errors.map((e, i) => (
                      <p key={i} className="text-xs text-bad">✗ {e}</p>
                    ))}
                  </div>
                )}
                {validation.ok && (
                  <div className="space-y-3">
                    <div className="grid gap-x-6 sm:grid-cols-2">
                      <KV k="Entropía (hex)" v={validation.entropyHex} copyable />
                      <KV k="Checksum codificado" v={validation.actualChecksum} mono />
                      <KV k="Checksum esperado" v={validation.expectedChecksum} mono />
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                        Seed BIP39 (PBKDF2-HMAC-SHA512 · 2048 iteraciones)
                      </p>
                      {seedBusy && <p className="text-xs text-white/50">Derivando…</p>}
                      {seedHex && <CopyBlock text={seedHex} label="seed de 512 bits" maxH="6rem" />}
                    </div>
                    <div className="max-w-sm">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">
                        Passphrase (25ª palabra, opcional)
                      </label>
                      <input
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder="vacía por defecto"
                      />
                    </div>
                    <p className="text-xs text-white/50">
                      Con passphrase, la seed cambia POR COMPLETO: sin ella, las mismas palabras dan siempre la misma
                      seed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {anatomy && validation?.ok && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h3 className="mb-3 text-sm font-semibold">Anatomía bit a bit (11 bits por palabra)</h3>
                <div className="space-y-1.5">
                  {anatomy.groups.map((g, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="w-24 font-mono font-semibold text-acento">{g.word}</span>
                      <span className="font-mono text-white/70">{g.bits.slice(0, 11)}</span>
                      <span className="font-mono text-white/30">= índice {g.index}</span>
                      {g.isChecksumMark && <Badge tone="warn">contiene checksum</Badge>}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/50">
                  Cada palabra codifica 11 bits (2¹¹ = 2048). Los últimos bits de la última palabra son el checksum
                  SHA-256 de la entropía: por eso una palabra mal elegida «no cuadra».
                </p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'fix' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Mnemonic con UNA palabra corrupta
              </label>
              <textarea
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm outline-none focus:border-acento/60"
                rows={3}
                value={fixInput}
                onChange={(e) => setFixInput(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Posición sospechosa (0-index)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={fixInput.trim().split(/\s+/).length - 1}
                    value={fixPos}
                    onChange={(e) => setFixPos(Number(e.target.value) || 0)}
                    className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  />
                </div>
                <Button onClick={() => setFixResult(bip39BruteFix(fixInput, fixPos))}>
                  <Wrench size={14} /> Probar las 2048 palabras
                </Button>
              </div>
            </div>
            {fixResult && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <Badge tone={fixResult.found ? 'ok' : 'bad'}>
                  {fixResult.found ? `${fixResult.candidates.length} candidato(s)` : 'sin candidatos'}
                </Badge>
                <p className="mt-2 text-xs text-white/60">{fixResult.note}</p>
                {fixResult.candidates.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {fixResult.candidates.map((c) => (
                      <div key={c.word} className="rounded-lg border border-ok/30 bg-ok/5 p-3">
                        <p className="text-sm">
                          Posición {c.wordIndex}: <b className="font-mono text-acento">{c.word}</b>{' '}
                          <span className="text-xs text-white/40">(índice {c.index})</span>
                        </p>
                        <Button
                          variant="ghost"
                          className="mt-1 text-xs"
                          onClick={() => {
                            const words = fixInput.trim().toLowerCase().split(/\s+/)
                            words[c.wordIndex] = c.word
                            setInput(words.join(' '))
                            setTab('validate')
                          }}
                        >
                          aplicar y validar →
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-white/50">
                  {fixResult.tried} palabras probadas contra el checksum. El checksum filtra: solo ~1 de cada 16 palabras
                  aleatorias «cuadra» en una posición dada, por eso puede haber varios candidatos.
                </p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Lecciones de seguridad (las duras)</h3>
          <div className="space-y-2">
            {BIP39_SECURITY.map((s) => (
              <div key={s.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-1 text-xs text-white/60">{s.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {BIP39_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
