import { useMemo, useRef, useState } from 'react'
import { FileSearch, Upload, Loader2, Lock, Unlock } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, ErrorBox, KV } from '../components/ui'
import { identifySignature, shannonEntropy, extractStrings, entropyVerdict } from '../lib/files'
import { syncHash } from '../lib/hash'
import { fmtBytes, toHex } from '../lib/util'

export default function Fileanalyzer() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [minLen, setMinLen] = useState(6)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (file: File) => {
    setLoading(true)
    setErr(null)
    setBytes(null)
    setFileName(file.name)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      if (buf.length > 25 * 1024 * 1024) throw new Error('Archivo demasiado grande (máx 25 MB en el navegador)')
      setBytes(buf)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const sig = useMemo(() => (bytes ? identifySignature(bytes) : null), [bytes])
  const entropy = useMemo(() => (bytes ? shannonEntropy(bytes) : null), [bytes])
  const hashes = useMemo(() => {
    if (!bytes) return null
    try {
      return {
        md5: syncHash('MD5', bytes),
        sha1: syncHash('SHA1', bytes),
        sha256: syncHash('SHA256', bytes),
      }
    } catch {
      return null
    }
  }, [bytes])
  const strings = useMemo(() => (bytes ? extractStrings(bytes, minLen) : []), [bytes, minLen])
  const hexHead = useMemo(() => (bytes ? toHex(bytes.slice(0, 64), ' ') : ''), [bytes])
  const verdict = entropy ? entropyVerdict(entropy.global) : null

  const maxBlock = entropy ? Math.max(...entropy.blocks, 0.1) : 1

  return (
    <div>
      <ToolHeader icon={FileSearch} title="File Analyzer" desc="Identificación por magic bytes, entropía de Shannon por bloques, strings y hashes — todo local" />

      <Reveal>
        <div className="card p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f) }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-edge py-12 transition-colors hover:border-acento/50"
          >
            {loading ? <Loader2 size={28} className="animate-spin text-acento" /> : <Upload size={28} className="text-grey" />}
            <p className="font-mono text-sm text-ink">{loading ? 'leyendo…' : 'suelta cualquier archivo o haz clic'}</p>
            <p className="font-mono text-[10px] text-grey">máx 25 MB · nunca se sube a ningún servidor</p>
            <input ref={inputRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f) }} />
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {bytes && sig && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{fileName || 'archivo'}</Badge>
                <Badge tone={sig.sig ? 'ok' : 'warn'}>{sig.sig?.name ?? 'firma desconocida'}</Badge>
                {sig.sig && <Badge tone="info">{sig.sig.category}</Badge>}
                <Badge tone="neutral">{fmtBytes(bytes.length)}</Badge>
              </div>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="firma detectada" v={sig.sig ? `${sig.sig.name} (${sig.sig.ext})` : '—'} />
                  <KV k="magic bytes" v={<span className="text-acento">{sig.matched}</span>} />
                  <KV k="mime" v={sig.sig?.mime ?? 'application/octet-stream'} />
                  {sig.sig?.note && <KV k="nota" v={sig.sig.note} mono={false} />}
                </div>
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  {hashes && (
                    <>
                      <KV k="MD5" v={hashes.md5} copyable />
                      <KV k="SHA-1" v={hashes.sha1} copyable />
                      <KV k="SHA-256" v={hashes.sha256} copyable />
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">primeros 64 bytes (hex)</p>
                <CopyBlock text={hexHead} label="hex dump" maxH="max-h-28" />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">entropía de shannon</h3>
                {verdict && <Badge tone={verdict.tone}>{verdict.label}</Badge>}
                {entropy && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xl font-bold text-acento">{entropy.global.toFixed(3)}</span>
                    <span className="font-mono text-xs text-grey">/ 8 bits</span>
                  </div>
                )}
                {entropy && entropy.global >= 7.5 ? <Unlock size={16} className="text-bad" /> : entropy ? <Lock size={16} className="text-ok" /> : null}
              </div>
              {entropy && entropy.blocks.length > 1 && (
                <div className="flex h-24 items-end gap-px rounded-xl border border-edge bg-black/40 p-3">
                  {entropy.blocks.map((h, i) => (
                    <div
                      key={i}
                      title={`bloque ${i}: ${h.toFixed(2)} bits`}
                      className={`flex-1 rounded-t ${h >= 7.5 ? 'bg-bad/80' : h >= 6 ? 'bg-warn/80' : 'bg-acento/70'}`}
                      style={{ height: `${Math.max(3, (h / maxBlock) * 100)}%` }}
                    />
                  ))}
                </div>
              )}
              <p className="mt-2 font-mono text-[10px] text-grey">
                &gt;7.5 = cifrado/comprimido · 6–7.5 = posible payload oculto (estego, payload adjuntado) · &lt;4 = texto/estructurado
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">strings ({strings.length})</h3>
                <label className="flex items-center gap-2 font-mono text-[11px] text-grey">
                  longitud mínima
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={minLen}
                    onChange={(e) => setMinLen(Math.max(3, Math.min(20, parseInt(e.target.value) || 6)))}
                    className="w-16 rounded-md border border-edge bg-black/40 px-2 py-1 font-mono text-ink outline-none focus:border-acento/60"
                  />
                </label>
              </div>
              <CopyBlock text={strings.slice(0, 300).join('\n') || '—'} label={`strings (300/${strings.length})`} maxH="max-h-96" />
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
