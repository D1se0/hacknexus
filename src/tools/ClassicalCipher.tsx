import { useMemo, useState } from 'react'
import { FlaskConical, Key, Lightbulb, ScanSearch, Sigma } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  InfoBanner,
  KV,
  Reveal,
  TextArea,
  ToolHeader,
} from '../components/ui'
import {
  CLASSCIPHER_LIMITS,
  CLASSCIPHER_PRIMER,
  atbash,
  caesarBreak,
  diagnose,
  indexOfCoincidence,
  kasiskiDistances,
  rot47,
  substitutionSolve,
  vigenereKeyLength,
  vigenereSolve,
  xorBruteforce,
} from '../lib/classcipher'
import type { Lang } from '../lib/classcipher'
import { hexToBytes } from '../lib/util'

type Tab = 'detect' | 'caesar' | 'vigenere' | 'substitution' | 'simple'

const TABS: { id: Tab; label: string; icon: typeof Key }[] = [
  { id: 'detect', label: '① ¿Qué cifrado es?', icon: ScanSearch },
  { id: 'caesar', label: '② Caesar', icon: Key },
  { id: 'vigenere', label: '③ Vigenère', icon: Key },
  { id: 'substitution', label: '④ Sustitución', icon: FlaskConical },
  { id: 'simple', label: '⑤ Simples / XOR', icon: Sigma },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

const DEMO_CIPHER = 'Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj'
const DEMO_VIGENERE =
  'Lxfop v ef rn hryyxmgjhe v tzxst lqhh gpwwhm ew lmgksxo xh tqhv pwbl plgw pv wmgewmv sqaejir'

export default function ClassicalCipher() {
  const [tab, setTab] = useState<Tab>('detect')
  const [lang, setLang] = useState<Lang>('es')

  const [cipherText, setCipherText] = useState(DEMO_CIPHER)
  const diag = useMemo(() => (cipherText.trim().length > 5 ? diagnose(cipherText) : null), [cipherText])
  const ic = useMemo(() => indexOfCoincidence(cipherText), [cipherText])

  const caesarTop = useMemo(() => (cipherText.trim() ? caesarBreak(cipherText, lang, 3) : []), [cipherText, lang])
  const kasiski = useMemo(() => kasiskiDistances(cipherText), [cipherText])
  const keyLens = useMemo(() => vigenereKeyLength(cipherText), [cipherText])

  const [vigenereMode, setVigenereMode] = useState<'auto' | 'manual'>('auto')
  const [manualKeyLen, setManualKeyLen] = useState(5)
  const vigenere = useMemo(
    () => (cipherText.trim().length > 20 ? vigenereSolve(cipherText, lang, vigenereMode === 'manual' ? manualKeyLen : undefined) : null),
    [cipherText, lang, vigenereMode, manualKeyLen],
  )

  const [subText, setSubText] = useState(
    'Qta wkja qdsxia esqq gktxa wq tq dsb qxwdwkdt esqq gktxa wq tqrwxeq ot uxdt osmmx',
  )
  const substitution = useMemo(
    () => (subText.trim().length >= 20 ? substitutionSolve(subText, lang) : null),
    [subText, lang],
  )

  const [xorInput, setXorInput] = useState('1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b')
  const xorResults = useMemo(() => {
    try {
      const bytes = hexToBytes(xorInput.trim())
      return xorBruteforce(bytes, 3)
    } catch {
      return []
    }
  }, [xorInput])

  const [simpleInput, setSimpleInput] = useState(DEMO_CIPHER)
  const [affineA, setAffineA] = useState(5)
  const [affineB, setAffineB] = useState(8)

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={Key}
        title="Classical Cipher Breaker"
        desc="Criptoanálisis real, no un catálogo: Caesar se resuelve solo (chi-cuadrado), Vigenère por Kasiski + índice de coincidencia, sustitución por hill-climbing, XOR por fuerza bruta — ES y EN"
        badge="Ronda 17"
      />

      <InfoBanner>
        Pega el texto cifrado y elige idioma. El <b>índice de coincidencia</b> te dice qué familia de cifrado es antes de
        tocar nada: ~0.066 = sustitución simple (la estructura del idioma sigue viva), ~0.038 = polialfabético o aleatorio.
        La lección de esta tool: <b>todos estos cifrados caen en milisegundos</b>.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      <Reveal>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-64">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Texto cifrado (compartido entre pestañas)
              </label>
              <TextArea value={cipherText} onChange={(e) => setCipherText(e.target.value)} rows={3} className="font-mono" />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">Idioma</label>
              <select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div className="grid gap-x-6 sm:grid-cols-3">
            <KV k="Índice de coincidencia" v={ic.toFixed(4)} />
            <KV k="Letras (a-z)" v={String(cipherText.toLowerCase().replace(/[^a-z]/g, '').length)} />
            <KV k="Diagnóstico" v={diag ? diag.guess : '—'} />
          </div>
        </div>
      </Reveal>

      {tab === 'detect' && diag && (
        <Reveal>
          <div className="rounded-xl border border-white/10 bg-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <ScanSearch size={16} className="text-acento" />
              <h3 className="text-sm font-semibold">Diagnóstico heurístico</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold text-acento">{diag.guess}</p>
                <p className="mt-1 text-xs text-white/60"><b>Por qué:</b> {diag.why}</p>
                <p className="mt-1 text-xs text-ok"><b>Siguiente paso:</b> {diag.nextStep}</p>
              </div>
              <p className="text-xs text-white/50">
                Referencia IC: natural ≈ 0.0667 (es/en) · aleatorio ≈ 0.0385. Tu texto: <b className="font-mono">{ic.toFixed(4)}</b>
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'caesar' && caesarTop.length > 0 && (
        <Reveal>
          <div className="rounded-xl border border-white/10 bg-panel p-4">
            <h3 className="mb-3 text-sm font-semibold">Top 3 turnos por chi-cuadrado (26 probados)</h3>
            <div className="space-y-3">
              {caesarTop.map((g, i) => (
                <div key={g.shift} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge tone={i === 0 ? 'ok' : 'neutral'}>
                      {i === 0 ? 'mejor candidato' : `#${i + 1}`}
                    </Badge>
                    <span className="text-sm">shift = <b className="font-mono">{g.shift}</b> (clave «{String.fromCharCode(97 + g.shift)}»)</span>
                    <span className="text-xs text-white/40">χ² = {g.chi.toFixed(3)}</span>
                  </div>
                  <CopyBlock text={g.plain} label={`shift ${g.shift}`} maxH="6rem" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/50">
              El chi-cuadrado compara la frecuencia de letras del intento con la del idioma: el turno correcto minimiza la
              distancia. Funciona con ~20 letras ya.
            </p>
          </div>
        </Reveal>
      )}

      {tab === 'vigenere' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">Paso 1 — longitud de clave</h3>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-white/40">Por IC de columnas (top 5)</p>
                  {keyLens.map((k) => (
                    <div key={k.keyLen} className="flex items-center gap-2 text-xs">
                      <span className="w-16 font-mono">k={k.keyLen}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/10">
                        <div className="h-full rounded bg-acento" style={{ width: `${Math.min(100, (k.avgIc / 0.07) * 100)}%` }} />
                      </div>
                      <span className="font-mono text-white/50">{k.avgIc.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-white/40">Repeticiones (Kasiski)</p>
                  {kasiski.length === 0 && <p className="text-xs text-white/50">Sin repeticiones de trigramas: texto corto o clave larga</p>}
                  {kasiski.map((k) => (
                    <p key={k.seq} className="text-xs">
                      <span className="font-mono text-acento">«{k.seq}»</span> distancias: {k.distances.join(', ')}
                      {k.distances.length > 0 && <span className="text-white/40"> → GCD probable: {k.distances.reduce(gcd)}</span>}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-semibold">Paso 2 — resolver</h3>
                <div className="flex gap-2">
                  <Button variant={vigenereMode === 'auto' ? 'primary' : 'ghost'} onClick={() => setVigenereMode('auto')} className="text-xs">
                    auto
                  </Button>
                  <Button variant={vigenereMode === 'manual' ? 'primary' : 'ghost'} onClick={() => setVigenereMode('manual')} className="text-xs">
                    forzar longitud
                  </Button>
                  {vigenereMode === 'manual' && (
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={manualKeyLen}
                      onChange={(e) => setManualKeyLen(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                      className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
                    />
                  )}
                </div>
              </div>
              {vigenere && (
                <>
                  <div className="mb-3 grid gap-x-6 sm:grid-cols-3">
                    <KV k="Clave deducida" v={vigenere.key || '—'} copyable />
                    <KV k="Longitud" v={String(vigenere.keyLength)} />
                    <KV k="IC del texto plano" v={vigenere.avgIc.toFixed(4)} />
                  </div>
                  <CopyBlock text={vigenere.plain} label="texto descifrado" maxH="12rem" />
                </>
              )}
              <p className="mt-3 text-xs text-white/50">
                Demo con texto de prueba: pega el texto del ejemplo («Lxfopv ef rn…» es Vigenère con clave «lemon») y mira
                cómo lo resuelve sin saber la clave.
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'substitution' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Ciphertext de sustitución (≥ 100 letras = confianza alta)
              </label>
              <TextArea value={subText} onChange={(e) => setSubText(e.target.value)} rows={4} className="font-mono" />
            </div>
            {substitution && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={substitution.confidence === 'alta' ? 'ok' : substitution.confidence === 'media' ? 'warn' : 'bad'}>
                    confianza {substitution.confidence}
                  </Badge>
                  <span className="text-xs text-white/50">
                    puntuación {substitution.score.toFixed(0)} · {substitution.iterations} swaps evaluados
                  </span>
                </div>
                <CopyBlock text={substitution.plain} label="texto plano" maxH="12rem" />
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-white/50">Ver mapeo completo (cifra → plano)</summary>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                    {Object.entries(substitution.keyMap)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([c, p]) => (
                        <span key={c} className="font-mono">
                          {c} → <b className="text-acento">{p}</b>
                        </span>
                      ))}
                  </div>
                </details>
                <p className="mt-3 text-xs text-white/50">
                  Hill-climbing: parte de un mapeo por frecuencia y va intercambiando pares mientras la puntuación de
                  cuadrigramas mejora. No siempre clava el 100% con textos cortos: la confianza es honesta.
                </p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'simple' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">XOR de un byte (fuerza bruta de 256 claves)</h3>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Bytes en hex</label>
              <TextArea value={xorInput} onChange={(e) => setXorInput(e.target.value)} rows={2} className="font-mono" />
              {xorResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {xorResults.map((r, i) => (
                    <div key={r.key} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge tone={i === 0 ? 'ok' : 'neutral'}>{i === 0 ? 'mejor' : `#${i + 1}`}</Badge>
                        <span className="text-sm">
                          clave <b className="font-mono">0x{r.key.toString(16).padStart(2, '0')}</b> («{String.fromCharCode(r.key)}»)
                        </span>
                        <span className="text-xs text-white/40">score {r.score.toFixed(3)}</span>
                      </div>
                      <p className="break-all font-mono text-xs text-white/80">{r.plain}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">Cifrados simples aplicados</h3>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Texto</label>
              <TextArea value={simpleInput} onChange={(e) => setSimpleInput(e.target.value)} rows={2} className="font-mono" />
              <div className="mt-3 space-y-2">
                <SimpleRow label="Atbash (a↔z)" value={atbash(simpleInput)} />
                <SimpleRow label="ROT47" value={rot47(simpleInput)} />
                <SimpleRow label={`Afín (a=${affineA}, b=${affineB}) descifrar`} value={affinePreview(simpleInput, affineA, affineB)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  a:
                  <input type="number" value={affineA} onChange={(e) => setAffineA(Number(e.target.value) || 1)} className="w-16 rounded border border-white/10 bg-black/30 px-2 py-1" />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  b:
                  <input type="number" value={affineB} onChange={(e) => setAffineB(Number(e.target.value) || 0)} className="w-16 rounded border border-white/10 bg-black/30 px-2 py-1" />
                </label>
                <span className="text-xs text-white/40">a debe ser coprimo con 26 (1,3,5,7,9,11,15,17,19,21,23,25)</span>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Primer de cifrados clásicos — por qué caen</h3>
          </div>
          <div className="space-y-2">
            {CLASSCIPHER_PRIMER.map((p) => (
              <div key={p.cipher} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold">{p.cipher}</span>
                  <span className="text-xs text-white/40">{p.era}</span>
                </div>
                <p className="mt-1 text-xs text-white/60">{p.how}</p>
                <p className="mt-1 text-xs text-bad"><b>Cómo se rompe:</b> {p.howBroken}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {CLASSCIPHER_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}

function SimpleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2">
      <p className="text-xs font-semibold text-white/70">{label}</p>
      <p className="break-all font-mono text-xs text-white/60">{value}</p>
    </div>
  )
}

function affinePreview(text: string, a: number, b: number): string {
  try {
    const modInv = (x: number, m: number): number | null => {
      for (let i = 1; i < m; i++) if (((x % m) + m) * (i % m) % m === 1) return i
      return null
    }
    const aInv = modInv(((a % 26) + 26) % 26, 26)
    if (aInv === null) return `a=${a} no es invertible mod 26`
    let out = ''
    for (const ch of text) {
      const code = ch.codePointAt(0)!
      if (code >= 97 && code <= 122) out += String.fromCharCode(((((aInv * (code - 97 - b)) % 26) + 26) % 26) + 97)
      else if (code >= 65 && code <= 90) out += String.fromCharCode(((((aInv * (code - 65 - b)) % 26) + 26) % 26) + 65)
      else out += ch
    }
    return out
  } catch {
    return '—'
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
