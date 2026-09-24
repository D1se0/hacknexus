import { useState } from 'react'
import { Radar, Loader2, Trash2, Copy } from 'lucide-react'
import { motion } from 'framer-motion'
import { ToolHeader, Badge, Field, TextInput, TextArea, Button, Reveal, ErrorBox, InfoBanner, useToast } from '../components/ui'
import { copyText } from '../lib/util'

interface Row {
  path: string
  status: number
  ms: number
  size: number
  contentType: string
  words: number
  lines: number
  err?: string
}

const COMMON_PATHS = ['admin', 'login', 'robots.txt', '.git/HEAD', 'backup', 'api', 'uploads', 'config.php.bak', '.env', 'server-status', 'wp-admin', 'phpinfo.php']

export default function Webfuzzer() {
  const [base, setBase] = useState('httpbin.org')
  const [wordlist, setWordlist] = useState('admin\nlogin\nrobots.txt\napi\nassets')
  const [method, setMethod] = useState('GET')
  const [concurrency, setConcurrency] = useState(6)
  const [running, setRunning] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [progress, setProgress] = useState(0)
  const toast = useToast()

  const statusTone = (s: number): 'ok' | 'warn' | 'info' | 'bad' => (s >= 200 && s < 300 ? 'ok' : s === 401 || s === 403 ? 'warn' : s < 400 ? 'info' : 'bad')

  const fuzz = async () => {
    const words = wordlist.split('\n').map((w) => w.trim()).filter(Boolean).slice(0, 300)
    if (!words.length) return
    let root = base.trim()
    if (!/^https?:\/\//i.test(root)) root = 'http://' + root
    if (root.endsWith('/')) root = root.slice(0, -1)

    setRunning(true)
    setRows([])
    setProgress(0)
    const results: Row[] = []
    let done = 0
    let idx = 0

    const worker = async () => {
      while (idx < words.length) {
        const my = idx++
        const path = words[my]
        const t0 = performance.now()
        const row: Row = { path, status: 0, ms: 0, size: 0, contentType: '', words: 0, lines: 0 }
        try {
          const res = await fetch(`${root}/${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(10_000) })
          row.ms = performance.now() - t0
          row.status = res.status
          row.contentType = (res.headers.get('content-type') ?? '').split(';')[0]
          if (method !== 'HEAD') {
            const text = await res.text()
            row.size = text.length
            row.words = text.split(/\s+/).filter(Boolean).length
            row.lines = text.split('\n').length
          } else {
            row.size = Number(res.headers.get('content-length') ?? 0)
          }
        } catch (e) {
          row.err = (e as Error).name === 'TimeoutError' ? 'timeout' : 'bloqueado (CORS/red)'
        }
        results.push(row)
        done++
        setProgress(Math.round((done / words.length) * 100))
        setRows([...results].sort((a, b) => a.status - b.status || a.path.localeCompare(b.path)))
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))
    setRunning(false)
    toast(`${results.filter((r) => r.status && r.status < 400).length} rutas activas`)
  }

  const interesting = rows.filter((r) => r.status && r.status !== 404)

  return (
    <div>
      <ToolHeader icon={Radar} title="Web Fuzzer" desc="Fuzzing concurrente de rutas y recursos con método configurable, filtros y comparación de respuestas" />

      <InfoBanner>
        Las peticiones salen desde tu navegador. Muchos servidores bloquean por CORS: verás «bloqueado» aunque la ruta exista.
        Respuestas 401/403 son especialmente interesantes (el recurso existe pero está protegido).
      </InfoBanner>

      <Reveal>
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_120px]">
            <Field label="URL base" hint="sin ruta final">
              <TextInput value={base} onChange={(e) => setBase(e.target.value)} className="font-mono" placeholder="https://objetivo.com" />
            </Field>
            <Field label="método">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
                {['GET', 'HEAD', 'POST'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="concurrency">
              <TextInput type="number" min={1} max={20} value={concurrency} onChange={(e) => setConcurrency(Math.max(1, Math.min(20, parseInt(e.target.value) || 6)))} />
            </Field>
          </div>

          <Field label="wordlist (una ruta por línea, máx 300)" hint="se concatena a la URL base">
            <TextArea value={wordlist} onChange={(e) => setWordlist(e.target.value)} className="min-h-36 font-mono" />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-grey">quick list:</span>
            {COMMON_PATHS.map((p) => (
              <button
                key={p}
                onClick={() => setWordlist((w) => (w.split('\n').filter(Boolean).includes(p) ? w : w.trimEnd() + '\n' + p))}
                className="rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-grey transition-all hover:border-acento/50 hover:text-acento"
              >
                + {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={fuzz} disabled={running}>{running ? <Loader2 size={15} className="animate-spin" /> : '▶ lanzar fuzzing'}</Button>
            {running && (
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-edge">
                  <motion.div className="h-full bg-acento" animate={{ width: `${progress}%` }} />
                </div>
                <span className="mt-1 block font-mono text-[10px] text-grey">{progress}% · {rows.length} respuestas</span>
              </div>
            )}
            {rows.length > 0 && !running && <Button variant="ghost" onClick={() => setRows([])}>limpiar</Button>}
          </div>
        </div>
      </Reveal>

      {rows.length > 0 && (
        <Reveal>
          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] text-grey">
              <Badge tone="ok">{interesting.length} interesantes</Badge>
              <Badge tone="neutral">{rows.length} escaneadas</Badge>
              <span className="ml-auto text-[10px]">404 = no existe · 401/403 = existe protegido</span>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-left font-mono text-[12px]">
                <thead className="sticky top-0 bg-panel">
                  <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-grey">
                    <th className="px-4 py-2">status</th>
                    <th className="px-4 py-2">ruta</th>
                    <th className="px-4 py-2 text-right">ms</th>
                    <th className="px-4 py-2 text-right">size</th>
                    <th className="px-4 py-2 text-right">words</th>
                    <th className="px-4 py-2 text-right">lines</th>
                    <th className="px-4 py-2">tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <motion.tr
                      key={r.path}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.4) }}
                      className="cursor-pointer border-b border-edge/40 transition-colors hover:bg-acento/5"
                      onClick={() => { copyText(`${base.replace(/\/$/, '')}/${r.path}`); toast('URL copiada') }}
                    >
                      <td className="px-4 py-1.5"><Badge tone={r.err ? 'bad' : statusTone(r.status)}>{r.err ? 'ERR' : r.status}</Badge></td>
                      <td className="px-4 py-1.5 text-ink">/{r.path} <Copy size={9} className="inline text-grey opacity-0 group-hover:opacity-100" /></td>
                      <td className="px-4 py-1.5 text-right text-grey">{r.ms ? r.ms.toFixed(0) : '—'}</td>
                      <td className="px-4 py-1.5 text-right text-grey">{r.size || '—'}</td>
                      <td className="px-4 py-1.5 text-right text-grey">{r.words || '—'}</td>
                      <td className="px-4 py-1.5 text-right text-grey">{r.lines || '—'}</td>
                      <td className="px-4 py-1.5 text-grey">{r.contentType || r.err || '—'}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  )
}
