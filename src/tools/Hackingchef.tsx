import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Plus, X, ArrowUp, ArrowDown, Save, Trash2 } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextArea, Badge, Reveal, useToast } from '../components/ui'
import { cn } from '../lib/util'
import {
  b64Encode, b64Decode, hexEncode, hexDecode, urlEncode, urlDecode, binEncode, binDecode,
  rot13, leetspeak, vaporwave, mirror, xorText,
} from '../lib/encoders'
import { emojiEncode, emojiDecode } from '../lib/emoji'
import { syncHash } from '../lib/hash'

interface Op {
  id: number
  name: string
  arg?: string
}

const OPS: Record<string, { fn: (input: string, arg?: string) => string; cat: string; needsArg?: boolean; placeholder?: string }> = {
  'Base64 encode': { fn: (s) => b64Encode(s), cat: 'encode' },
  'Base64 decode': { fn: (s) => safe(b64Decode, s), cat: 'decode' },
  'Hex encode': { fn: (s) => hexEncode(s), cat: 'encode' },
  'Hex decode': { fn: (s) => safe(hexDecode, s), cat: 'decode' },
  'URL encode': { fn: (s) => urlEncode(s), cat: 'encode' },
  'URL decode': { fn: (s) => safe(urlDecode, s), cat: 'decode' },
  'Binary encode': { fn: (s) => binEncode(s), cat: 'encode' },
  'Binary decode': { fn: (s) => safe(binDecode, s), cat: 'decode' },
  'Emoji encode': { fn: (s) => emojiEncode(s), cat: 'encode' },
  'Emoji decode': { fn: (s) => safe(emojiDecode, s), cat: 'decode' },
  'MD5': { fn: (s) => syncHash('MD5', s), cat: 'hash' },
  'SHA-256': { fn: (s) => syncHash('SHA256', s), cat: 'hash' },
  'SHA-512': { fn: (s) => syncHash('SHA512', s), cat: 'hash' },
  'ROT13': { fn: (s) => rot13(s), cat: 'transform' },
  'Leetspeak': { fn: (s) => leetspeak(s), cat: 'fun' },
  'Vaporwave': { fn: (s) => vaporwave(s), cat: 'fun' },
  'Mirror': { fn: (s) => mirror(s), cat: 'fun' },
  'Reverse': { fn: (s) => Array.from(s).reverse().join(''), cat: 'transform' },
  'Uppercase': { fn: (s) => s.toUpperCase(), cat: 'transform' },
  'Lowercase': { fn: (s) => s.toLowerCase(), cat: 'transform' },
  'XOR con clave': { fn: (s, arg) => xorText(s, arg ?? 'kali'), cat: 'cipher', needsArg: true, placeholder: 'clave' },
}

function safe(fn: (s: string, arg?: string) => string, s: string, arg?: string): string {
  try {
    return fn(s, arg)
  } catch (e) {
    return `⚠ ${(e as Error).message}`
  }
}

const RECIPES: Record<string, string[]> = {
  'Base64 triple': ['Base64 encode', 'Base64 encode', 'Base64 encode'],
  'Leet + Base64': ['Leetspeak', 'Base64 encode'],
  'Emoji secreto': ['ROT13', 'Base64 encode', 'Emoji encode'],
  'Firma hash64': ['SHA-256', 'Uppercase', 'Mirror'],
  'URL fantasma': ['Base64 encode', 'URL encode', 'Emoji encode'],
}

export default function Hackingchef() {
  const [input, setInput] = useState('Hack the planet')
  const [ops, setOps] = useState<Op[]>([{ id: 1, name: 'Base64 encode' }])
  const [nextId, setNextId] = useState(2)
  const [saved, setSaved] = useState<Record<string, string[]>>({})
  const toast = useToast()

  useEffect(() => {
    try {
      const s = localStorage.getItem('hacknexus-recipes')
      if (s) setSaved(JSON.parse(s))
    } catch { /* ignora */ }
  }, [])

  const output = useMemo(() => {
    let cur = input
    for (const op of ops) {
      const def = OPS[op.name]
      if (!def) continue
      cur = safe(def.fn, cur, op.arg)
    }
    return cur
  }, [input, ops])

  const addOp = (name: string) => {
    setOps((o) => [...o, { id: nextId, name }])
    setNextId((n) => n + 1)
  }

  const saveRecipe = () => {
    const name = prompt('Nombre de la receta:') // eslint-disable-line no-alert
    if (!name) return
    const next = { ...saved, [name]: ops.map((o) => o.name) }
    setSaved(next)
    localStorage.setItem('hacknexus-recipes', JSON.stringify(next))
    toast(`Receta "${name}" guardada`)
  }

  const loadRecipe = (name: string, opNames: string[]) => {
    setOps(opNames.map((n, i) => ({ id: nextId + i, name: n })))
    setNextId((n) => n + opNames.length)
  }

  const delRecipe = (name: string) => {
    const next = { ...saved }
    delete next[name]
    setSaved(next)
    localStorage.setItem('hacknexus-recipes', JSON.stringify(next))
  }

  const cats = [...new Set(Object.entries(OPS).map(([, d]) => d.cat))]

  return (
    <div>
      <ToolHeader icon={ChefHat} title="HackingChef" desc="Encadena codificaciones, hashes y transformaciones en recetas con resultado en vivo — portado y mejorado desde hackingChef-page" badge="ported" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <Reveal>
            <div className="card p-6">
              <Field label="Entrada">
                <TextArea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
              </Field>
            </div>
          </Reveal>

          <Reveal>
            <div className="card p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">Receta ({ops.length} operaciones)</h3>
                <button onClick={saveRecipe} className="flex items-center gap-1.5 font-mono text-[11px] text-grey hover:text-acento">
                  <Save size={12} /> guardar receta
                </button>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {ops.map((op, i) => (
                    <motion.div
                      key={op.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className="flex items-center gap-2 rounded-lg border border-edge bg-black/30 px-3 py-2"
                    >
                      <span className="font-mono text-[10px] text-grey">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex-1 font-mono text-xs text-acento">{op.name}</span>
                      <button onClick={() => setOps((o) => i > 0 ? [...o.slice(0, i - 1), o[i], o[i - 1], ...o.slice(i + 1)] : o)} className="text-grey hover:text-ink disabled:opacity-30" disabled={i === 0}><ArrowUp size={13} /></button>
                      <button onClick={() => setOps((o) => i < o.length - 1 ? [...o.slice(0, i), o[i + 1], o[i], ...o.slice(i + 2)] : o)} className="text-grey hover:text-ink disabled:opacity-30" disabled={i === ops.length - 1}><ArrowDown size={13} /></button>
                      <button onClick={() => setOps((o) => o.filter((x) => x.id !== op.id))} className="text-grey hover:text-bad"><X size={13} /></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-4 border-t border-edge pt-4">
                {cats.map((cat) => (
                  <div key={cat} className="mb-2">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-grey">{cat}</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Object.entries(OPS).filter(([, d]) => d.cat === cat).map(([name]) => (
                        <button key={name} onClick={() => addOp(name)} className="flex items-center gap-1 rounded-md border border-edge bg-panel px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                          <Plus size={10} /> {name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-edge bg-black/30 px-4 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-widest text-grey">resultado en vivo</span>
                <CopyBtn text={output} />
              </div>
              <pre className="max-h-64 overflow-auto break-all p-4 font-mono text-[13px] text-acento">{output || '—'}</pre>
            </div>
          </Reveal>
        </div>

        <div className="content-start">
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">Recetas</h3>
              <div className="space-y-2">
                {Object.entries({ ...RECIPES, ...saved }).map(([name, opNames]) => (
                  <div key={name} className={cn('group flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all', 'border-edge hover:border-acento/40')}>
                    <button onClick={() => loadRecipe(name, opNames)} className="min-w-0 flex-1 text-left">
                      <div className="font-mono text-xs font-bold text-ink">{name}</div>
                      <div className="truncate font-mono text-[10px] text-grey">{opNames.join(' → ')}</div>
                    </button>
                    {(name in saved) && (
                      <button onClick={() => delRecipe(name)} className="shrink-0 text-grey opacity-0 transition-opacity hover:text-bad group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card mt-6 p-6">
              <h3 className="mb-2 font-mono text-sm font-bold text-white">¿Cómo funciona?</h3>
              <p className="text-xs leading-relaxed text-grey">
                Cada operación toma la salida de la anterior. Combina <Badge tone="accent">encode</Badge> +{' '}
                <Badge tone="info">hash</Badge> + <Badge tone="warn">transform</Badge> para crear pipelines tipo
                CyberChef. Guarda tus recetas: quedan en tu localStorage.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}