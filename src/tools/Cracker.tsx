import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Unlock, Play, Square, Upload, Gauge, Trophy } from 'lucide-react'
import { ToolHeader, Badge, Button, Field, Select, TextInput, CopyBtn, ErrorBox, useToast, Reveal, Counter } from '../components/ui'
import { WORDLIST_SOURCES, loadWordlist, parseWordlistFile } from '../lib/rockyou'
import { fmtNum, fmtBytes } from '../lib/util'

type Algo = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'NTLM'

interface WorkerMsg {
  type: 'progress' | 'cracked' | 'done'
  tried?: number
  rate?: number
  found?: Record<string, string>
  hash?: string
  word?: string
}

const CHARSETS: Record<string, string> = {
  'minúsculas': 'abcdefghijklmnopqrstuvwxyz',
  'mayúsculas': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'dígitos': '0123456789',
  'alfanum': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  'alfanum+símbolos': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*_-',
}

export default function Cracker() {
  const [targetsText, setTargetsText] = useState('5d41402abc4b2a76b9719d911017c592')
  const [algo, setAlgo] = useState<Algo>('MD5')
  const [listId, setListId] = useState('core')
  const [rules, setRules] = useState(true)
  const [mode, setMode] = useState<'dict' | 'brute'>('dict')
  const [charset, setCharset] = useState('alfanum')
  const [minLen, setMinLen] = useState(1)
  const [maxLen, setMaxLen] = useState(6)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [tried, setTried] = useState(0)
  const [rate, setRate] = useState(0)
  const [found, setFound] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const workerRef = useRef<Worker | null>(null)
  const t0Ref = useRef(0)
  const toast = useToast()

  const targets = useMemo(() => targetsText.split(/\r?\n/).map((t) => t.trim()).filter(Boolean), [targetsText])
  const customFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => workerRef.current?.terminate(), [])

  useEffect(() => {
    if (!running) return
    const iv = setInterval(() => setElapsed((performance.now() - t0Ref.current) / 1000), 250)
    return () => clearInterval(iv)
  }, [running])

  const stop = () => {
    workerRef.current?.terminate()
    workerRef.current = null
    setRunning(false)
  }

  const start = async () => {
    setError(null)
    setFound({})
    setTried(0)
    setRate(0)
    setElapsed(0)
    if (!targets.length) {
      setError('Introduce al menos un hash objetivo')
      return
    }
    let words: string[] = []
    if (mode === 'dict') {
      try {
        if (listId === 'custom') {
          words = customWords
          if (!words.length) {
            setError('Sube un archivo de wordlist primero')
            return
          }
        } else {
          setLoading(listId)
          words = await loadWordlist(listId)
        }
      } catch (e) {
        setError(`Error cargando wordlist: ${(e as Error).message}`)
        setLoading(null)
        return
      }
      setLoading(null)
    }
    const worker = new Worker(new URL('../workers/cracker.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const m = e.data
      if (m.type === 'progress') {
        setTried(m.tried ?? 0)
        setRate(m.rate ?? 0)
        if (m.found && Object.keys(m.found).length) setFound(m.found)
      } else if (m.type === 'cracked') {
        setFound((f) => ({ ...f, [m.hash!]: m.word! }))
        toast(`¡Crackeada: ${m.word}`, 'ok')
      } else if (m.type === 'done') {
        setTried(m.tried ?? 0)
        setRate(m.rate ?? 0)
        if (m.found) setFound(m.found)
        setRunning(false)
        worker.terminate()
        workerRef.current = null
        toast(Object.keys(m.found ?? {}).length ? 'Cracking completado' : 'Sin resultados: prueba otra wordlist', Object.keys(m.found ?? {}).length ? 'ok' : 'info')
      }
    }
    t0Ref.current = performance.now()
    setRunning(true)
    worker.postMessage(
      mode === 'dict'
        ? { mode: 'dict', algo, targets, words, rules }
        : { mode: 'brute', algo, targets, charset: CHARSETS[charset], minLen, maxLen },
    )
  }

  const [customWords, setCustomWords] = useState<string[]>([])

  const onCustomFile = async (f: File) => {
    const text = await f.text()
    const words = parseWordlistFile(text)
    setCustomWords(words)
    setListId('custom')
    toast(`${fmtNum(words.length)} palabras de ${f.name}`)
  }

  const foundCount = Object.keys(found).length

  return (
    <div>
      <ToolHeader icon={Unlock} title="Hash Cracker" desc="Diccionario (rockyou incluido) y fuerza bruta en un Web Worker — 100% local y con estadísticas en vivo" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hashes objetivo (uno por línea)" hint={`${targets.length} objetivo(s)`}>
                <textarea
                  value={targetsText}
                  onChange={(e) => setTargetsText(e.target.value)}
                  spellCheck={false}
                  className="min-h-24 w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-acento/60 focus:shadow-glow"
                />
              </Field>
              <div className="grid content-start gap-4">
                <Field label="Algoritmo">
                  <Select
                    value={algo}
                    onChange={(e) => setAlgo(e.target.value as Algo)}
                    options={[
                      { value: 'MD5', label: 'MD5' },
                      { value: 'SHA1', label: 'SHA-1' },
                      { value: 'SHA256', label: 'SHA-256' },
                      { value: 'SHA512', label: 'SHA-512' },
                      { value: 'NTLM', label: 'NTLM (Windows)' },
                    ]}
                  />
                </Field>
                <div className="flex gap-2">
                  {(['dict', 'brute'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 rounded-lg border px-3 py-2 font-mono text-xs transition-all ${
                        mode === m ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'
                      }`}
                    >
                      {m === 'dict' ? '📘 diccionario' : '⚡ fuerza bruta'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {mode === 'dict' ? (
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-4 font-mono text-sm font-bold text-white">Wordlist</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {WORDLIST_SOURCES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setListId(s.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      listId === s.id ? 'border-acento/60 bg-acento/10' : 'border-edge hover:border-acento/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-ink">{s.name}</span>
                      <Badge tone={listId === s.id ? 'accent' : 'neutral'}>{s.size}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-grey">{s.desc}</p>
                  </button>
                ))}
                <button
                  onClick={() => customFileRef.current?.click()}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    listId === 'custom' ? 'border-acento/60 bg-acento/10' : 'border-edge hover:border-acento/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-xs font-bold text-ink">
                      <Upload size={13} /> Tu rockyou.txt
                    </span>
                    {customWords.length > 0 && <Badge tone="accent">{fmtNum(customWords.length)} palabras</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] text-grey">Sube tu rockyou.txt local (hasta ~200MB según RAM)</p>
                </button>
                <input ref={customFileRef} type="file" hidden accept=".txt,.lst,.dic" onChange={(e) => e.target.files?.[0] && onCustomFile(e.target.files[0])} />
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-2 font-mono text-xs text-grey">
                <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="accent-[#2ee88a]" />
                aplicar reglas ligeras (mayúsculas, +1, +123, !) ×10 intentos
              </label>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-4 font-mono text-sm font-bold text-white">Fuerza bruta</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Charset">
                  <Select value={charset} onChange={(e) => setCharset(e.target.value)} options={Object.keys(CHARSETS).map((k) => ({ value: k, label: k }))} />
                </Field>
                <Field label="Longitud mín">
                  <TextInput type="number" min={1} max={10} value={minLen} onChange={(e) => setMinLen(+e.target.value)} />
                </Field>
                <Field label="Longitud máx" hint="máx 10">
                  <TextInput type="number" min={1} max={10} value={maxLen} onChange={(e) => setMaxLen(+e.target.value)} />
                </Field>
                <div className="flex items-end">
                  <div className="w-full rounded-lg border border-edge bg-black/30 px-3 py-2.5 font-mono text-[11px] text-grey">
                    espacio: <span className="text-warn">{fmtNum(CHARSETS[charset].length ** Math.min(maxLen, 10))}</span> keys
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}
        {loading && (
          <div className="card flex items-center gap-3 p-4 font-mono text-xs text-grey">
            <span className="h-4 w-4 animate-spin360 rounded-full border-2 border-acento/30 border-t-acento" />
            descargando wordlist {loading} (CDN jsDelivr)…
          </div>
        )}

        <Reveal>
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-3">
              {!running ? (
                <Button onClick={start} className="gap-2">
                  <Play size={14} /> Lanzar ataque
                </Button>
              ) : (
                <Button variant="danger" onClick={stop} className="gap-2">
                  <Square size={14} /> Detener
                </Button>
              )}
              <span className="font-mono text-[11px] text-grey">
                {running ? 'worker activo — el navegador sigue fluido' : 'el worker corre en un hilo aparte'}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { l: 'probadas', v: fmtNum(tried), icon: Gauge },
                { l: 'velocidad', v: `${fmtNum(Math.round(rate))} h/s`, icon: Gauge },
                { l: 'tiempo', v: `${elapsed.toFixed(1)}s`, icon: Gauge },
                { l: 'crackeadas', v: `${foundCount}/${targets.length}`, icon: Trophy },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-edge bg-black/30 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-grey">{s.l}</div>
                  <div className="mt-1 font-mono text-lg font-bold text-acento tabular-nums">{s.v}</div>
                </div>
              ))}
            </div>

            {running && (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-edge">
                <motion.div
                  className="h-full bg-gradient-to-r from-acento-dark via-acento to-acento-bright"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  style={{ width: '50%' }}
                />
              </div>
            )}

            <AnimatePresence>
              {foundCount > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-2">
                  <div className="font-mono text-xs font-bold text-ok">✓ resultados</div>
                  {Object.entries(found).map(([hash, word]) => (
                    <div key={hash} className="flex flex-wrap items-center gap-2 rounded-lg border border-ok/30 bg-ok/5 p-3">
                      <code className="min-w-0 break-all font-mono text-[11px] text-grey">{hash}</code>
                      <span className="font-mono text-sm font-bold text-ok">{word}</span>
                      <CopyBtn text={word} className="ml-auto" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>

        <Reveal>
          <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
            💡 La wordlist “Top 1.000.000” equivale al corazón de rockyou.txt (las contraseñas más frecuentes del leak de 2009).
            Para rockyou completo (14.3M) sube tu archivo local. Aviso: esto es fuerza bruta client-side (~100k-2M h/s en JS),
            ideal para CTFs y hashes sueltos; para volúmenes grandes usa hashcat/JtR con GPU.
          </div>
        </Reveal>
      </div>
    </div>
  )
}