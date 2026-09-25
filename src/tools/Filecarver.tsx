import { useMemo, useRef, useState } from 'react'
import { Layers, Upload, Loader2, Download, Image as ImageIcon, SearchCode, FileSearch } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, CopyBlock, ErrorBox, InfoBanner } from '../components/ui'
import { syncHash } from '../lib/hash'
import { download, fmtBytes, toHex } from '../lib/util'

interface CarveSig { id: string; name: string; ext: string; mime: string; head: number[]; end?: number[]; endPlus?: number }

const SIGS: CarveSig[] = [
  { id: 'png', name: 'Imagen PNG', ext: 'png', mime: 'image/png', head: [0x89, 0x50, 0x4e, 0x47], end: [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82] },
  { id: 'jpg', name: 'Imagen JPEG', ext: 'jpg', mime: 'image/jpeg', head: [0xff, 0xd8, 0xff], end: [0xff, 0xd9] },
  { id: 'gif', name: 'Imagen GIF', ext: 'gif', mime: 'image/gif', head: [0x47, 0x49, 0x46, 0x38], end: [0x00, 0x3b] },
  { id: 'pdf', name: 'Documento PDF', ext: 'pdf', mime: 'application/pdf', head: [0x25, 0x50, 0x44, 0x46], end: [0x25, 0x25, 0x45, 0x4f, 0x46], endPlus: 5 },
  { id: 'zip', name: 'Archivo ZIP/OOXML/JAR', ext: 'zip', mime: 'application/zip', head: [0x50, 0x4b, 0x03, 0x04], end: [0x50, 0x4b, 0x05, 0x06], endPlus: 22 },
  { id: 'rar', name: 'Archivo RAR', ext: 'rar', mime: 'application/vnd.rar', head: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07] },
  { id: '7z', name: 'Archivo 7-Zip', ext: '7z', mime: 'application/x-7z-compressed', head: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { id: 'gzip', name: 'GZIP (posible SQL dump/backup)', ext: 'gz', mime: 'application/gzip', head: [0x1f, 0x8b, 0x08] },
]

interface Carved {
  n: number
  offset: number
  sig: CarveSig
  size: number
  truncated: boolean
  sha256: string
  url?: string
}

const matchesAt = (b: Uint8Array, off: number, pat: number[]): boolean => {
  if (off + pat.length > b.length) return false
  for (let i = 0; i < pat.length; i++) if (b[off + i] !== pat[i]) return false
  return true
}

const indexOf = (b: Uint8Array, pat: number[], from: number): number => {
  outer: for (let i = Math.max(0, from); i <= b.length - pat.length; i++) {
    for (let j = 0; j < pat.length; j++) if (b[i + j] !== pat[j]) continue outer
    return i
  }
  return -1
}

export default function Filecarver() {
  const [bytes, setBytes] = useState<Uint8Array<ArrayBuffer> | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>(['png', 'jpg', 'pdf', 'zip'])
  const [minSize, setMinSize] = useState(512)
  const [carved, setCarved] = useState<Carved[] | null>(null)
  const [scanned, setScanned] = useState(false)
  const [magicQuery, setMagicQuery] = useState('')
  const [preview, setPreview] = useState<Carved | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (file: File) => {
    setLoading(true)
    setErr(null)
    setCarved(null)
    setScanned(false)
    setPreview(null)
    setBytes(null)
    setFileName(file.name)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      if (buf.length > 30 * 1024 * 1024) throw new Error('Fichero demasiado grande (máx 30 MB)')
      setBytes(buf)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const runCarve = () => {
    if (!bytes) return
    setScanned(true)
    setPreview(null)
    const sigs = SIGS.filter((s) => selected.includes(s.id))
    // todas las fronteras conocidas para acotar tamaños
    const bounds: number[] = []
    for (const s of sigs) {
      let from = 0
      for (;;) {
        const idx = indexOf(bytes, s.head, from)
        if (idx < 0) break
        bounds.push(idx)
        from = idx + 1
        if (bounds.length > 5000) break
      }
    }
    bounds.sort((a, b) => a - b)

    const out: Carved[] = []
    let n = 0
    for (const s of sigs) {
      let from = 0
      for (;;) {
        const start = indexOf(bytes, s.head, from)
        if (start < 0) break
        from = start + 1
        const nextBound = bounds.find((b) => b > start) ?? bytes.length
        let end = -1
        let truncated = false
        if (s.end) {
          const e = indexOf(bytes, s.end, start + s.head.length)
          if (e >= 0 && e < nextBound + 4096) end = e + s.end.length + (s.endPlus ?? 0)
        }
        if (end < 0) {
          end = Math.min(nextBound, start + 10 * 1024 * 1024)
          truncated = end < nextBound ? false : nextBound === bytes.length
          if (end - start < (minSize || 1)) continue
        }
        const size = end - start
        if (size < minSize || size > 25 * 1024 * 1024) continue
        const slice = bytes.subarray(start, end)
        let sha = ''
        try { sha = syncHash('SHA256', slice) } catch { /* noop */ }
        let url: string | undefined
        if (s.mime.startsWith('image/')) {
          try { url = URL.createObjectURL(new Blob([slice], { type: s.mime })) } catch { /* noop */ }
        }
        out.push({ n: ++n, offset: start, sig: s, size, truncated, sha256: sha, url })
        if (out.length >= 400) break
      }
      if (out.length >= 400) break
    }
    out.sort((a, b) => a.offset - b.offset)
    setCarved(out)
  }

  const magicHits = useMemo(() => {
    if (!bytes || !magicQuery.trim()) return null
    const q = magicQuery.trim()
    const hits: { off: number; ascii: string; utf16: string }[] = []
    const ascii = [...q].map((c) => c.charCodeAt(0) & 0xff)
    const utf16: number[] = []
    for (const c of q) { utf16.push(c.charCodeAt(0) & 0xff, (c.charCodeAt(0) >> 8) & 0xff) }
    let from = 0
    for (;;) {
      const i = indexOf(bytes, ascii, from)
      if (i < 0) break
      hits.push({ off: i, ascii: toHex(bytes.subarray(i, i + 16), ' '), utf16: '—' })
      from = i + 1
      if (hits.length >= 200) break
    }
    from = 0
    for (;;) {
      const i = indexOf(bytes, utf16, from)
      if (i < 0) break
      const h = hits.find((x) => x.off === i)
      if (h) h.utf16 = '✔ (también UTF-16LE)'
      else hits.push({ off: i, ascii: '(solo UTF-16LE)', utf16: toHex(bytes.subarray(i, i + 16), ' ') })
      from = i + 1
      if (hits.length >= 300) break
    }
    return hits.sort((a, b) => a.off - b.off).slice(0, 200)
  }, [bytes, magicQuery])

  const totalBytes = carved?.reduce((a, c) => a + c.size, 0) ?? 0

  return (
    <div>
      <ToolHeader icon={Layers} title="File Carver" desc="Recupera imágenes, PDFs, ZIP y backups embebidos en dumps, discos o binarios escaneando magic bytes — todo local" />

      <InfoBanner>
        El carving busca firmas de ficheros dentro de cualquier blob: una imagen oculta tras un PDF, un ZIP dentro de un binario, fotos en un dump de memoria. Los ficheros recuperados se reconstruyen byte a byte y <b>nunca se suben</b>.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f) }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-edge py-10 transition-colors hover:border-acento/50"
          >
            {loading ? <Loader2 size={26} className="animate-spin text-acento" /> : <Upload size={26} className="text-grey" />}
            <p className="font-mono text-sm text-ink">{loading ? 'leyendo…' : 'suelta el dump/binario/imagen o haz clic'}</p>
            <p className="font-mono text-[10px] text-grey">máx 30 MB · procesado íntegramente en tu navegador</p>
            <input ref={inputRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f) }} />
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {bytes && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{fileName}</Badge>
                <Badge tone="neutral">{fmtBytes(bytes.length)}</Badge>
              </div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-grey">firmas a buscar</p>
              <div className="flex flex-wrap gap-2">
                {SIGS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected((sel) => (sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id]))}
                    className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all ${selected.includes(s.id) ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr] sm:items-end">
                <Field label="tamaño mínimo" hint="bytes">
                  <TextInput type="number" min={16} value={minSize} onChange={(e) => setMinSize(Math.max(16, parseInt(e.target.value) || 512))} />
                </Field>
                <Button onClick={runCarve} className="gap-2"><SearchCode size={15} /> escanear firmas</Button>
              </div>
            </div>
          </Reveal>

          {scanned && carved && (
            <Reveal>
              <div className="card mt-6 p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">resultados del carving</h3>
                  <Badge tone={carved.length ? 'ok' : 'warn'}>{carved.length} ficheros</Badge>
                  {carved.length > 0 && <Badge tone="neutral">{fmtBytes(totalBytes)} recuperados</Badge>}
                </div>
                {carved.length === 0 ? (
                  <p className="font-mono text-xs text-grey">No se encontraron firmas con los criterios actuales. Prueba a bajar el tamaño mínimo o añadir más tipos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead>
                        <tr className="text-left text-grey/60">
                          <th className="pb-2 pr-3">#</th>
                          <th className="pb-2 pr-3">offset</th>
                          <th className="pb-2 pr-3">tipo</th>
                          <th className="pb-2 pr-3">tamaño</th>
                          <th className="pb-2 pr-3">SHA-256</th>
                          <th className="pb-2">acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-edge/60">
                        {carved.map((c) => (
                          <tr key={`${c.offset}-${c.sig.id}`} className={preview?.offset === c.offset ? 'bg-acento/5' : ''}>
                            <td className="py-2 pr-3 text-grey">{c.n}</td>
                            <td className="py-2 pr-3 text-acento">0x{c.offset.toString(16).toUpperCase()}</td>
                            <td className="py-2 pr-3 text-ink">{c.sig.name}{c.truncated && <span className="ml-1 text-warn">(cortado)</span>}</td>
                            <td className="py-2 pr-3 text-grey">{fmtBytes(c.size)}</td>
                            <td className="py-2 pr-3 text-grey/70">{c.sha256.slice(0, 12)}…</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                {c.url && (
                                  <button onClick={() => setPreview(c)} className="flex items-center gap-1 text-info hover:text-acento">
                                    <ImageIcon size={13} /> ver
                                  </button>
                                )}
                                <button
                                  onClick={() => download(`carve_${c.offset.toString(16)}.${c.sig.ext}`, new Blob([bytes.subarray(c.offset, c.offset + c.size)], { type: c.sig.mime }), c.sig.mime)}
                                  className="flex items-center gap-1 text-acento hover:text-acento-bright"
                                >
                                  <Download size={13} /> descargar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {preview?.url && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><FileSearch size={13} /> previsualización</h3>
                <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
                  <img src={preview.url} alt={`carve ${preview.n}`} className="max-h-80 rounded-xl border border-edge bg-black/40 object-contain p-2" />
                  <div className="grid content-start gap-x-6 font-mono text-xs sm:grid-cols-2">
                    <p><span className="text-grey">tipo:</span> <span className="text-ink">{preview.sig.name}</span></p>
                    <p><span className="text-grey">offset:</span> <span className="text-acento">0x{preview.offset.toString(16).toUpperCase()}</span></p>
                    <p><span className="text-grey">tamaño:</span> <span className="text-ink">{fmtBytes(preview.size)}</span></p>
                    <p><span className="text-grey">sha-256:</span> <span className="break-all text-grey/70">{preview.sha256}</span></p>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">búsqueda de cadena (ASCII + UTF-16LE)</h3>
              <p className="mb-3 font-mono text-[11px] text-grey">Localiza offsets de URLs, nombres de usuario o marcas en el dump — útil para construir tu propio YARA</p>
              <Field label="cadena a buscar" hint="p. ej. https://, password=, BEGIN:VCARD">
                <TextInput value={magicQuery} onChange={(e) => setMagicQuery(e.target.value)} placeholder="https://" className="font-mono" />
              </Field>
              {magicHits && (
                <div className="mt-4">
                  <Badge tone={magicHits.length ? 'info' : 'warn'}>{magicHits.length} coincidencia(s)</Badge>
                  <div className="mt-3">
                    <CopyBlock
                      text={magicHits.map((h) => `0x${h.off.toString(16).toUpperCase().padStart(8, '0')}  ${h.ascii === '(solo UTF-16LE)' ? '[UTF-16LE]' : h.ascii}`).join('\n') || 'sin coincidencias'}
                      label="offsets"
                      maxH="max-h-64"
                    />
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
