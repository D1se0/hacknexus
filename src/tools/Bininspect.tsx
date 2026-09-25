import { useMemo, useRef, useState } from 'react'
import { Cpu, Upload, Loader2, AlertTriangle, Package, FileCode } from 'lucide-react'
import { ToolHeader, Badge, Reveal, CopyBlock, ErrorBox, InfoBanner, KV } from '../components/ui'
import { parseBin, type BinInfo } from '../lib/bin'
import { fmtBytes } from '../lib/util'

export default function Bininspect() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (file: File) => {
    setLoading(true)
    setErr(null)
    setBytes(null)
    setFileName(file.name)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      if (buf.length > 60 * 1024 * 1024) throw new Error('Binario demasiado grande (máx 60 MB)')
      setBytes(buf)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const info: BinInfo | null = useMemo(() => (bytes ? parseBin(bytes) : null), [bytes])

  const importsByDll = useMemo(() => {
    if (!info) return []
    const map = new Map<string, string[]>()
    for (const imp of info.imports) {
      const dll = imp.dll ?? '—'
      const arr = map.get(dll) ?? []
      if (arr.length < 40) arr.push(imp.name)
      map.set(dll, arr)
    }
    return [...map.entries()].slice(0, 30)
  }, [info])

  return (
    <div>
      <ToolHeader icon={Cpu} title="Binary Inspector" desc="Parsea ejecutables PE (Windows) y ELF (Linux): headers, secciones, imports, packers y heurísticas — sin ejecutar nada" />

      <InfoBanner>
        El fichero se lee byte a byte en tu navegador y <b>nunca se ejecuta</b>: es análisis estático puro. Ideal como primera mirada antes de abrir un binario en una VM: saber qué es, contra qué APIs enlaza y si viene empaquetado.
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
            <p className="font-mono text-sm text-ink">{loading ? 'leyendo…' : 'suelta un .exe/.dll/.sys/.so/.bin o haz clic'}</p>
            <p className="font-mono text-[10px] text-grey">PE (MZ) y ELF (0x7F) · máx 60 MB · 0 ejecuciones</p>
            <input ref={inputRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f) }} />
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {bytes && !info && (
        <div className="mt-6"><ErrorBox>No parece un PE (debe empezar con "MZ") ni un ELF (0x7F 'E' 'L' 'F'). Pásalo antes por File Analyzer para ver su firma real.</ErrorBox></div>
      )}

      {bytes && info && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{fileName}</Badge>
                <Badge tone={info.kind === 'PE' ? 'info' : 'ok'}>{info.kind} · {info.bits}-bit · {info.endian}</Badge>
                <Badge tone="neutral">{fmtBytes(bytes.length)}</Badge>
                {info.flags.dll && <Badge tone="warn">DLL</Badge>}
                {info.flags.packed && <Badge tone="bad"><Package size={11} /> posible packer</Badge>}
                {info.flags.signed && <Badge tone="ok">firma Authenticode</Badge>}
                <Badge tone="neutral">{info.flags.gui ? 'GUI' : info.flags.console ? 'consola' : ''}</Badge>
              </div>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="arquitectura" v={info.arch} />
                  <KV k="entry point" v={info.entry} />
                  <KV k="image base" v={info.imageBase} />
                  <KV k="compilado (PE)" v={info.compiled} />
                </div>
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="secciones" v={String(info.sections.length)} />
                  <KV k="imports" v={`${info.imports.length} símbolos`} />
                  <KV k="exports" v={`${info.exports.length} símbolos`} />
                  <KV k="análisis" v="estático · sin ejecución" />
                </div>
              </div>

              {info.notes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {info.notes.map((n, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-[11px] ${i === 0 ? 'border-edge bg-black/30 text-grey' : 'border-info/30 bg-info/5 text-info/90'}`}>
                      <FileCode size={13} className="mt-0.5 shrink-0" /> {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">secciones</h3>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-left text-grey/60">
                      <th className="pb-2 pr-3">nombre</th>
                      <th className="pb-2 pr-3">vaddr</th>
                      <th className="pb-2 pr-3">tamaño</th>
                      <th className="pb-2 pr-3">entropía</th>
                      <th className="pb-2">flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/60">
                    {info.sections.map((s, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 text-ink">{s.name}</td>
                        <td className="py-2 pr-3 text-grey">{s.vaddr}</td>
                        <td className="py-2 pr-3 text-grey">{s.size}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center gap-1.5 ${s.entropy >= 7.2 ? 'text-bad' : s.entropy >= 6 ? 'text-warn' : 'text-ok'}`}>
                            {s.entropy.toFixed(3)}
                            <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-black/60">
                              <span className={`block h-full ${s.entropy >= 7.2 ? 'bg-bad' : s.entropy >= 6 ? 'bg-warn' : 'bg-acento'}`} style={{ width: `${(s.entropy / 8) * 100}%` }} />
                            </span>
                          </span>
                        </td>
                        <td className="py-2 text-grey/80">{s.flags}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 font-mono text-[10px] text-grey">
                entropía &gt;7.2 = comprimido/cifrado (sección empaquetada) · W+X en ELF = self-modifying posible · nombres tipo UPX0/UPX1, .aspack = packer conocido
              </p>
            </div>
          </Reveal>

          {importsByDll.length > 0 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">imports por librería ({info.imports.length} símbolos)</h3>
                <div className="space-y-3">
                  {importsByDll.map(([dll, fns]) => (
                    <div key={dll}>
                      <p className="mb-1 font-mono text-[12px] text-acento">{dll} <span className="text-grey">({fns.length}{fns.length >= 40 ? '+' : ''})</span></p>
                      <p className="break-all font-mono text-[11px] leading-relaxed text-grey">{fns.join(' · ')}</p>
                    </div>
                  ))}
                </div>
                {info.exports.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 font-mono text-[12px] text-ok">exports ({info.exports.length})</p>
                    <p className="break-all font-mono text-[11px] text-grey">{info.exports.slice(0, 60).map((e) => e.name).join(' · ')}{info.exports.length > 60 ? ' …' : ''}</p>
                  </div>
                )}
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><AlertTriangle size={13} /> siguientes pasos sugeridos</h3>
              <CopyBlock
                label="flujo de análisis estático"
                text={[
                  `1. Hash: SHA-256 del binario → búscalo en VirusTotal (sin subirlo)`,
                  `2. Strings: pásalo por File Analyzer (min-len 6) y busca URLs, IPs, claves Registry`,
                  `3. Imports: ${info.imports.slice(0, 6).map((i) => i.name).join(', ') || '—'}… revisa APIs de proceso/red/cripto`,
                  `4. ${info.flags.packed ? 'Empaquetado: prueba `upx -d` o desempaqueta en VM antes de desensamblar' : 'Sin packer evidente: desensamblado directo (Ghidra/radare2)'}`,
                  `5. En Ghidra: importa, analiza, y ve directo al entry point ${info.entry}`,
                ].join('\n')}
                maxH="max-h-64"
              />
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
