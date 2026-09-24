import { useRef, useState } from 'react'
import { Waves, Upload, Loader2 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, ErrorBox, InfoBanner } from '../components/ui'
import { parsePcap, type PcapAnalysis } from '../lib/pcap'
import { fmtBytes } from '../lib/util'

export default function Pcap() {
  const [analysis, setAnalysis] = useState<PcapAnalysis | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'dns' | 'http' | 'suspicious'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (file: File) => {
    setLoading(true)
    setErr(null)
    setAnalysis(null)
    setFileName(file.name)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const result = parsePcap(bytes)
      setAnalysis(result)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const packets = analysis
    ? filter === 'all'
      ? analysis.packets
      : filter === 'dns'
        ? analysis.packets.filter((p) => p.isDns)
        : filter === 'http'
          ? analysis.packets.filter((p) => p.isHttp)
          : analysis.packets.filter((p) => p.suspicious?.length)
    : []

  return (
    <div>
      <ToolHeader icon={Waves} title="PCAP Analyzer" desc="Analiza capturas pcap/pcapng al completo en tu navegador: protocolos, top talkers, DNS/HTTP y alertas" />

      <InfoBanner>
        100% local: el archivo nunca sale de tu navegador. Soporta pcap (little/big endian) y pcapng (bloques EPB).
        Genera una captura de prueba con <span className="font-mono">tcpdump -i any -c 50 -w test.pcap</span>.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f) }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-edge py-12 transition-colors hover:border-acento/50"
          >
            {loading ? <Loader2 size={28} className="animate-spin text-acento" /> : <Upload size={28} className="text-grey" />}
            <p className="font-mono text-sm text-ink">{loading ? 'parseando…' : 'suelta un .pcap/.pcapng o haz clic'}</p>
            <p className="font-mono text-[10px] text-grey">máx 20.000 paquetes · todo se procesa en el cliente</p>
            <input ref={inputRef} type="file" accept=".pcap,.pcapng,.cap,application/vnd.tcpdump.pcap" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f) }} />
          </div>
          {fileName && <p className="mt-3 text-center font-mono text-[11px] text-grey">archivo: <span className="text-acento">{fileName}</span></p>}
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {analysis && (
        <>
          <Reveal>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: 'paquetes', v: analysis.stats.totalPackets.toLocaleString('es-ES') },
                { l: 'duración', v: `${analysis.stats.durationSec.toFixed(1)} s` },
                { l: 'tráfico', v: fmtBytes(analysis.stats.totalBytes) },
                { l: ' IPs únicas', v: analysis.stats.uniqueIps.length.toLocaleString('es-ES') },
              ].map((s) => (
                <div key={s.l} className="card p-4 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-grey">{s.l}</div>
                  <div className="mt-1 font-mono text-xl font-bold text-acento">{s.v}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {analysis.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {analysis.warnings.map((w, i) => (
                <div key={i} className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-2.5 font-mono text-xs text-warn">⚠ {w}</div>
              ))}
            </div>
          )}

          <Reveal>
            <div className="card mt-6 grid gap-6 p-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">protocolos</h3>
                <div className="space-y-1.5">
                  {Object.entries(analysis.stats.byProto).sort((a, b) => b[1] - a[1]).map(([proto, n]) => (
                    <div key={proto} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 truncate font-mono text-[11px] text-ink">{proto}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                        <div className="h-full rounded-full bg-acento/70" style={{ width: `${(n / analysis.stats.totalPackets) * 100}%` }} />
                      </div>
                      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-grey">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">top talkers (bytes)</h3>
                <div className="space-y-1.5">
                  {analysis.stats.topTalkers.slice(0, 8).map((t) => (
                    <div key={t.ip} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 truncate font-mono text-[11px] text-ink">{t.ip}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                        <div className="h-full rounded-full bg-info/70" style={{ width: `${(t.bytes / (analysis.stats.topTalkers[0]?.bytes || 1)) * 100}%` }} />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-[10px] text-grey">{fmtBytes(t.bytes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">resumen</h3>
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{analysis.stats.dnsQueries} queries DNS</Badge>
                <Badge tone="info">{analysis.stats.httpRequests} requests HTTP</Badge>
                <Badge tone={analysis.stats.suspicious.length ? 'bad' : 'ok'}>{analysis.stats.suspicious.length} paquetes sospechosos</Badge>
              </div>
              {analysis.stats.uniqueDns.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">dominios consultados</p>
                  <CopyBlock text={analysis.stats.uniqueDns.join('\n')} label="dns queries" maxH="max-h-40" />
                </div>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-black/30 px-4 py-2.5">
                {(['all', 'dns', 'http', 'suspicious'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all ${
                      filter === f ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'
                    }`}
                  >
                    {f === 'all' ? 'todo' : f}
                  </button>
                ))}
                <span className="ml-auto font-mono text-[10px] text-grey">{packets.length} paquetes</span>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full min-w-[820px] text-left font-mono text-[11.5px]">
                  <thead className="sticky top-0 bg-panel">
                    <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-grey">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">tiempo</th>
                      <th className="px-3 py-2">origen → destino</th>
                      <th className="px-3 py-2">proto</th>
                      <th className="px-3 py-2">puertos</th>
                      <th className="px-3 py-2">info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packets.slice(0, 400).map((p) => (
                      <tr key={p.index} className={`border-b border-edge/40 transition-colors hover:bg-acento/5 ${p.suspicious?.length ? 'bg-bad/5' : ''}`}>
                        <td className="px-3 py-1.5 text-grey">{p.index}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-grey">{p.tsStr}</td>
                        <td className="px-3 py-1.5 text-ink"><span className="text-info">{p.src ?? '?'}</span> → <span className="text-warn">{p.dst ?? '?'}</span></td>
                        <td className="px-3 py-1.5 text-acento">{p.proto ?? p.linkLayer}</td>
                        <td className="px-3 py-1.5 text-grey">{p.srcPort ?? ''}{p.dstPort ? ` → ${p.dstPort}` : ''}</td>
                        <td className="max-w-[280px] truncate px-3 py-1.5 text-grey" title={p.payloadPreview}>
                          {p.dnsName ? `DNS ${p.dnsName}` : p.httpMethod ? `${p.httpMethod} ${p.httpPath ?? ''}${p.httpHost ? ` (${p.httpHost})` : ''}` : p.payloadPreview || p.flags?.join(',') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {packets.length > 400 && <div className="border-t border-edge px-4 py-2 font-mono text-[10px] text-grey">mostrando 400 de {packets.length} (filtra por dns/http/sospechosos)</div>}
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
