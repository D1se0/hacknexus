import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, GitCompareArrows, Shuffle } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, Reveal } from '../components/ui'
import { fingerprint, similarity, sha256Hex, looksLikeHash, type Fingerprint } from '../lib/hashvisual'

function Identicon({ fp, size = 200 }: { fp: Fingerprint; size?: number }) {
  const cells = fp.grid.length
  const cell = size / cells
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-xl border border-edge">
      <rect width={size} height={size} fill={fp.bg} />
      {fp.grid.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${y}-${x}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={fp.fg} rx={cell * 0.18} /> : null,
        ),
      )}
    </svg>
  )
}

export default function HashVisual() {
  const [a, setA] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  const [b, setB] = useState('d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592')
  const [text, setText] = useState('')
  const [hashed, setHashed] = useState<string | null>(null)

  const fpA = useMemo(() => fingerprint(a), [a])
  const fpB = useMemo(() => fingerprint(b), [b])
  const sim = useMemo(() => similarity(fpA, fpB), [fpA, fpB])
  const sameHash = a.trim().toLowerCase() === b.trim().toLowerCase()

  const hashText = async () => {
    if (!text.trim()) return
    const h = await sha256Hex(text)
    setHashed(h)
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={LayoutGrid}
        title="Hash Visual Fingerprint"
        desc="Convierte cualquier hash en un identicon determinista: mismo hash → misma imagen, siempre. Compara certificados, binarios o claves de un vistazo sin leer 64 caracteres hex"
        badge="visual"
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-4 flex items-center gap-2 font-mono text-sm font-bold text-white">
                <GitCompareArrows size={15} className="text-acento" /> comparador
              </h3>
              <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                {[{ fp: fpA, v: a, set: setA, label: 'hash A' }, { fp: fpB, v: b, set: setB, label: 'hash B' }].map((side) => (
                  <div key={side.label} className={side.label === 'hash B' ? 'sm:order-3' : 'sm:order-1'}>
                    <Field label={side.label}>
                      <TextInput value={side.v} onChange={(e) => side.set(e.target.value)} className="py-2 text-[11px]" spellCheck={false} />
                    </Field>
                    <div className="mt-3 flex justify-center">
                      <motion.div key={side.v.slice(0, 16)} initial={{ scale: 0.94, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}>
                        <Identicon fp={side.fp} />
                      </motion.div>
                    </div>
                    {!looksLikeHash(side.v) && <p className="mt-2 text-center font-mono text-[10px] text-grey/60">no parece un hash: se usa el texto tal cual como semilla</p>}
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2 sm:order-2">
                  <Badge tone={sameHash ? 'ok' : sim > 70 ? 'warn' : 'info'}>{sameHash ? 'IDÉNTICOS' : `${sim}% celdas iguales`}</Badge>
                  <p className="max-w-[140px] text-center font-mono text-[10px] leading-snug text-grey">
                    {sameHash ? 'mismo input: misma imagen garantizada' : sim > 70 ? 'parecidos: ojo, visualmente cercano ≠ igual. Compara hex siempre.' : 'claramente distintos a simple vista'}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">¿por qué funciona?</h3>
              <ul className="space-y-2 text-[12.5px] leading-relaxed text-grey">
                <li>▸ El hash alimenta un <b className="text-ink">PRNG determinista</b> (xmur3 + mulberry32): 1 bit cambiado del hash cambia ~la mitad del dibujo — el efecto avalancha hecho imagen.</li>
                <li>▸ La <b className="text-ink">simetría en espejo</b> hace que tu cerebro compare patrones sin leer hex: el identicon de un certificado renovado (misma clave, nuevo serial) se distingue de uno sustituido.</li>
                <li>▸ Úsalo para: verificar que el SHA-256 de tu ISO coincide ANTES de instalar, comparar claves públicas SSH, detectar typos en hashes pegados a mano.</li>
              </ul>
              <p className="mt-3 rounded-lg border border-warn/25 bg-warn/5 px-3 py-2 font-mono text-[10.5px] leading-snug text-warn/90">
                ⚠ El dibujo es una AYUDA visual, nunca una prueba: dos hashes comparten ~50% de celdas por azar. El veredicto final es el hex completo.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
              <Shuffle size={14} className="text-acento" /> hashear texto (SHA-256)
            </h3>
            <Field label="texto → SHA-256 → identicon">
              <TextInput
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void hashText() }}
                placeholder="hacknexus"
                className="py-2 font-mono text-xs"
              />
            </Field>
            <Button variant="ghost" onClick={() => void hashText()} className="mt-2 w-full !py-2 !text-xs">hashear y dibujar</Button>
            {hashed && (
              <div className="mt-4 space-y-2">
                <p className="break-all font-mono text-[10.5px] text-acento">{hashed}</p>
                <div className="flex justify-center"><Identicon fp={fingerprint(hashed)} size={160} /></div>
                <Button variant="ghost" className="w-full !py-1.5 !text-[11px]" onClick={() => setA(hashed)}>usar como hash A</Button>
              </div>
            )}
            <p className="mt-4 rounded-lg border border-edge bg-black/30 px-3 py-2 font-mono text-[10px] leading-snug text-grey/70">
              SHA-256 calculado con WebCrypto en tu navegador: nada sale de aquí.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
