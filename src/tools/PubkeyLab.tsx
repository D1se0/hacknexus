import { useMemo, useState } from 'react'
import { ArrowLeftRight, Binary, KeyRound, Lock, Unlock } from 'lucide-react'
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
  DH_PRESETS,
  PUBKEY_LESSONS,
  PUBKEY_LIMITS,
  dhRun,
  modpowSteps,
  rsaApply,
  rsaFactorAttack,
  rsaKeygen,
} from '../lib/pubkeylab'

type Tab = 'dh' | 'rsa' | 'modpow'

const TABS: { id: Tab; label: string; icon: typeof KeyRound }[] = [
  { id: 'dh', label: 'Diffie-Hellman', icon: ArrowLeftRight },
  { id: 'rsa', label: 'RSA textbook', icon: Lock },
  { id: 'modpow', label: 'modpow paso a paso', icon: Binary },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm outline-none focus:border-acento/60'

function parseBig(s: string): bigint | null {
  const t = s.trim()
  if (!/^\d{1,40}$/.test(t)) return null
  try {
    return BigInt(t)
  } catch {
    return null
  }
}

function NumField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">{label}</label>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" />
      {hint && <p className="mt-1 text-[10px] text-white/40">{hint}</p>}
    </div>
  )
}

export default function PubkeyLab() {
  const [tab, setTab] = useState<Tab>('dh')

  /* ── DH ── */
  const [p, setP] = useState('23')
  const [g, setG] = useState('5')
  const [a, setA] = useState('6')
  const [b, setB] = useState('15')
  const dh = useMemo(() => {
    const P = parseBig(p)
    const G = parseBig(g)
    const A = parseBig(a)
    const B = parseBig(b)
    if (!P || !G || !A || !B) return null
    return dhRun(P, G, A, B)
  }, [p, g, a, b])

  /* ── RSA ── */
  const [rp, setRp] = useState('61')
  const [rq, setRq] = useState('53')
  const [re, setRe] = useState('65537')
  const [msg, setMsg] = useState('hola')
  const [attackResult, setAttackResult] = useState<ReturnType<typeof rsaFactorAttack> | null>(null)

  const rsa = useMemo(() => {
    const P = parseBig(rp)
    const Q = parseBig(rq)
    const E = parseBig(re)
    if (!P || !Q || !E) return null
    const kg = rsaKeygen(P, Q, E)
    if (kg.ok && kg.d !== null) {
      const applied = rsaApply(msg, kg.n, E, kg.d)
      return { kg, applied }
    }
    return { kg, applied: null }
  }, [rp, rq, re, msg])

  /* ── modpow ── */
  const [mb, setMb] = useState('7')
  const [me, setMe] = useState('65537')
  const [mm, setMm] = useState('2147483647')
  const mp = useMemo(() => {
    const B = parseBig(mb)
    const E = parseBig(me)
    const M = parseBig(mm)
    if (!B || !E || !M || M <= 1n) return null
    return modpowSteps(B, E, M)
  }, [mb, me, mm])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={KeyRound}
        title="Asymmetric Crypto Playground"
        desc="La matemática de clave pública ejecutándose: Diffie-Hellman completo, RSA textbook con keygen y el ataque de factorización real sobre n pequeño, y modpow binario paso a paso"
        badge="Ronda 17"
      />

      <InfoBanner>
        Todo corre con <b>BigInt nativo</b>: números exactos, sin librerías. Es la misma operación que hace TLS con
        módulos de 2048 bits — aquí con números que puedes leer, para que VEAS por qué invertirla es inviable cuando el
        módulo es grande. <b>Nada de esto sirve para producción</b>: es el laboratorio para entenderlo.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'dh' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {DH_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setP(preset.p)
                      setG(preset.g)
                      setA(preset.a)
                      setB(preset.b)
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NumField label="p (primo público)" value={p} onChange={setP} />
                <NumField label="g (generador)" value={g} onChange={setG} hint="2 ≤ g < p" />
                <NumField label="a (secreto Alice)" value={a} onChange={setA} />
                <NumField label="b (secreto Bob)" value={b} onChange={setB} />
              </div>
            </div>

            {dh && (
              <>
                {dh.errors.length > 0 && (
                  <div className="rounded-xl border border-bad/40 bg-bad/10 p-4 text-sm text-bad">
                    {dh.errors.map((e, i) => (
                      <p key={i}>✗ {e}</p>
                    ))}
                  </div>
                )}
                {dh.ok && (
                  <div className="rounded-xl border border-white/10 bg-panel p-4">
                    <h3 className="mb-3 text-sm font-semibold">Ceremonia paso a paso</h3>
                    <div className="space-y-2">
                      {dh.steps.map((s, i) => (
                        <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={s.who === 'Alice' ? 'info' : s.who === 'Bob' ? 'accent' : 'neutral'}>{s.who}</Badge>
                            <span className="text-xs text-white/60">{s.what}</span>
                          </div>
                          <p className="mt-1 break-all font-mono text-sm text-acento">{s.value}</p>
                        </div>
                      ))}
                      <div className="rounded-lg border border-ok/40 bg-ok/10 p-3">
                        <p className="text-sm font-semibold text-ok">
                          ✓ Secreto compartido: <span className="font-mono">{dh.sharedAlice.toString()}</span>
                          {dh.sharedMatch ? ' — ambas partes calculan lo mismo' : ' — ¡ERROR!'}
                        </p>
                        <p className="mt-1 text-xs text-white/60">
                          Un espía ve p, g, A y B. Para obtener s tendría que resolver el <b>logaritmo discreto</b>: con
                          p de {dh.pBits} bits es trivial; con 2048, inviable.
                        </p>
                      </div>
                    </div>
                    {dh.warnings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {dh.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-warn">⚠ {w}</p>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 rounded-lg border border-warn/30 bg-warn/5 p-3">
                      <p className="text-xs text-warn">{dh.safePrimeNote}</p>
                      <p className="mt-2 text-xs text-white/60">{dh.mitmNote}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'rsa' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">1 · Generación de claves desde dos primos</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumField label="p (primo)" value={rp} onChange={setRp} />
                <NumField label="q (primo)" value={rq} onChange={setRq} />
                <NumField label="e (exponente público)" value={re} onChange={setRe} hint="65537 = 2¹⁶+1" />
              </div>
              {rsa && (
                <div className="mt-4">
                  {rsa.kg.errors.length > 0 ? (
                    <div className="rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
                      {rsa.kg.errors.map((e, i) => (
                        <p key={i}>✗ {e}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-x-6 sm:grid-cols-2">
                      <KV k="n = p·q (módulo)" v={rsa.kg.n.toString()} copyable />
                      <KV k="φ(n) = (p−1)(q−1)" v={rsa.kg.phi.toString()} copyable />
                      <KV k="d = e⁻¹ mod φ (privada)" v={rsa.kg.d?.toString() ?? '—'} copyable />
                      <KV k="Tamaño de n" v={`${rsa.kg.bits} bits`} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {rsa?.applied && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h3 className="mb-3 text-sm font-semibold">2 · Cifrar y descifrar bloque a bloque</h3>
                <div className="mb-3 max-w-md">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">Mensaje (máx 64 chars)</label>
                  <input className={inputCls} value={msg} onChange={(e) => setMsg(e.target.value)} />
                </div>
                {rsa.applied.errors.length > 0 && (
                  <div className="mb-3 rounded-lg border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
                    {rsa.applied.errors.map((e, i) => (
                      <p key={i}>⚠ {e}</p>
                    ))}
                  </div>
                )}
                <div className="mb-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-white/40">
                      <tr>
                        <th className="py-1 pr-3">#</th>
                        <th className="py-1 pr-3">char</th>
                        <th className="py-1 pr-3">m</th>
                        <th className="py-1 pr-3">c = m^e mod n</th>
                        <th className="py-1 pr-3">m' = c^d mod n</th>
                        <th className="py-1">✓</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {rsa.applied.blocks.map((bl) => (
                        <tr key={bl.i} className="border-t border-white/5">
                          <td className="py-1 pr-3 text-white/40">{bl.i}</td>
                          <td className="py-1 pr-3">{bl.char}</td>
                          <td className="py-1 pr-3">{bl.m.toString()}</td>
                          <td className="py-1 pr-3 text-acento">{bl.c.toString()}</td>
                          <td className="py-1 pr-3">{bl.back.toString()}</td>
                          <td className="py-1">{bl.ok ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CopyBlock text={rsa.applied.ciphertextNumbers} label="ciphertext (números)" maxH="6rem" />
                <p className="mt-2 text-xs text-white/50">
                  Fíjate: la «h» cifra SIEMPRE igual (RSA textbook es determinista). El RSA real añade padding OAEP
                  aleatorio justamente para romper esto.
                </p>
              </div>
            )}

            {rsa && rsa.kg.ok && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-semibold">3 · El ataque: factorizar n</h3>
                  <Button
                    variant="danger"
                    className="text-xs"
                    onClick={() => setAttackResult(rsaFactorAttack(rsa.kg.n, 20_000_000))}
                  >
                    <Unlock size={14} /> Lanzar factorización (división de prueba)
                  </Button>
                </div>
                {attackResult && (
                  <div className="space-y-2">
                    <Badge tone={attackResult.found ? 'bad' : 'ok'}>
                      {attackResult.found ? 'n FACTORIZADO' : 'n resiste (hasta el límite)'}
                    </Badge>
                    {attackResult.found ? (
                      <div className="grid gap-x-6 sm:grid-cols-2">
                        <KV k="p recuperado" v={attackResult.p?.toString() ?? '—'} />
                        <KV k="q recuperado" v={attackResult.q?.toString() ?? '—'} />
                      </div>
                    ) : null}
                    <p className="text-xs text-white/60">{attackResult.note}</p>
                    <p className="text-xs text-white/50">
                      Con n de 12 bits (p=61, q=53 → n=3233) vuela. Prueba p y q de 8 dígitos: ya tarda. Así de brutal es
                      la escalada: 2048 bits no es «más difícil», es otro universo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'modpow' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h3 className="mb-3 text-sm font-semibold">Exponenciación modular binaria (square-and-multiply)</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumField label="base" value={mb} onChange={setMb} />
                <NumField label="exponente" value={me} onChange={setMe} hint="mira sus bits abajo" />
                <NumField label="módulo" value={mm} onChange={setMm} />
              </div>
            </div>
            {mp && (
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <div className="mb-3 grid gap-x-6 sm:grid-cols-3">
                  <KV k="Exponente en binario" v={mp.bits} mono />
                  <KV k="Resultado" v={mp.result.toString()} copyable />
                  <KV k="Pasos" v={String(mp.steps.length)} />
                </div>
                <div className="max-h-72 space-y-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
                  {mp.steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 font-mono text-xs">
                      <span className="w-8 text-white/40">bit {s.bit}</span>
                      <Badge tone={s.action === 'cuadrado+multiplicar' ? 'accent' : 'neutral'}>
                        {s.action === 'cuadrado+multiplicar' ? '×b' : '  '}
                      </Badge>
                      <span className="text-white/70">{s.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-white/50">
                  Esta es LA primitiva: DH, RSA y las firmas ECDSA de tus certificados son esto, multiplicado por
                  criptografía de curvas y.padding. 65537 solo necesita 17 pasos aunque valga 65 mil.
                </p>
              </div>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Lecciones (lo que el lab demuestra)</h3>
          <div className="space-y-2">
            {PUBKEY_LESSONS.map((l) => (
              <div key={l.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold">{l.title}</p>
                <p className="mt-1 text-xs text-white/60">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {PUBKEY_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
