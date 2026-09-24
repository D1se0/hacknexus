import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Plus, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, useToast } from '../components/ui'
import { subnetInfo, vlsm, maskFromCidr, toBinaryIp, intToIp, type VlsmBlock, type SubnetInfo } from '../lib/subnet'
import { download } from '../lib/util'

const PRESETS: { label: string; base: string; reqs: { name: string; hosts: number }[] }[] = [
  { label: 'demo clásica', base: '192.168.1.0/24', reqs: [{ name: 'RRHH', hosts: 50 }, { name: 'IT', hosts: 120 }, { name: 'Servidores', hosts: 20 }] },
  { label: 'empresa /16', base: '10.0.0.0/16', reqs: [{ name: 'Sede-Madrid', hosts: 500 }, { name: 'Sede-BCN', hosts: 250 }, { name: 'DMZ', hosts: 60 }, { name: 'VoIP', hosts: 1000 }, { name: 'WiFi', hosts: 400 }, { name: 'Gestión', hosts: 10 }] },
  { label: 'lab CTF', base: '172.16.0.0/20', reqs: [{ name: 'pivote', hosts: 2 }, { name: 'victimas', hosts: 100 }, { name: 'atacante', hosts: 5 }] },
]

const BLOCK_HUES = [152, 200, 45, 280, 0, 100, 230, 320, 170, 60]

/** Colorea los octetos binarios: rojo=parte de red, gris=parte de host */
function BinOctets({ bits, cidr }: { bits: string; cidr: number }) {
  const octets = bits.split('.')
  return (
    <span className="font-mono text-[10.5px] leading-relaxed">
      {octets.map((o, i) => {
        const start = i * 8
        const isNet = start + 8 <= cidr
        const isHost = start >= cidr
        return (
          <span key={i}>
            <span className={isNet ? 'text-bad' : isHost ? 'text-grey/40' : 'text-warn'}>{o}</span>
            {i < 3 && <span className="text-grey/30">.</span>}
          </span>
        )
      })}
    </span>
  )
}

export default function Vlsm() {
  const [base, setBase] = useState('192.168.1.0/24')
  const [reqs, setReqs] = useState([{ name: 'RRHH', hosts: 50 }, { name: 'IT', hosts: 120 }, { name: 'Servidores', hosts: 20 }])
  const [expanded, setExpanded] = useState<number | null>(null)
  const toast = useToast()

  const baseParsed = useMemo(() => {
    try {
      const m = base.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/)
      if (!m) throw new Error('formato')
      return subnetInfo(m[1], m[2] !== undefined ? parseInt(m[2]) : 24)
    } catch {
      return null
    }
  }, [base])

  const result = useMemo(() => {
    if (!baseParsed) return null
    const clean = reqs.map((r) => ({ name: r.name.trim() || `subred-${r.hosts}`, hosts: parseInt(String(r.hosts)) || 0 })).filter((r) => r.hosts > 0)
    if (!clean.length) return null
    try {
      return { base: baseParsed, ...vlsm(baseParsed.ip, baseParsed.cidr, clean) }
    } catch {
      return null
    }
  }, [baseParsed, reqs])

  // bloques ordenados por posición real dentro de la red base (para el mapa y huecos)
  const positioned = useMemo(() => {
    if (!result) return []
    return result.blocks.filter((b) => b.ok).sort((a, b) => a.netInt - b.netInt)
  }, [result])

  const mapSegs = useMemo(() => {
    if (!result || !positioned.length) return []
    const start = result.base.networkInt
    const end = start + result.base.totalHosts
    const segs: { kind: 'block' | 'free'; block?: VlsmBlock; start: number; size: number }[] = []
    let cursor = start
    for (const b of positioned) {
      if (b.netInt > cursor) segs.push({ kind: 'free', start: cursor, size: b.netInt - cursor })
      segs.push({ kind: 'block', block: b, start: b.netInt, size: b.total })
      cursor = b.netInt + b.total
    }
    if (cursor < end) segs.push({ kind: 'free', start: cursor, size: end - cursor })
    return segs
  }, [result, positioned])

  const stats = useMemo(() => {
    if (!result || !positioned.length) return null
    const totalBase = result.base.totalHosts
    const used = positioned.reduce((a, b) => a + b.total, 0)
    const usableAssigned = positioned.reduce((a, b) => a + b.usable, 0)
    const hostsRequested = positioned.reduce((a, b) => a + b.hosts, 0)
    const wastedByReserve = positioned.reduce((a, b) => a + (b.cidr <= 30 ? 2 : 0), 0) // red+broadcast
    const freeAddresses = totalBase - used
    return {
      totalBase,
      used,
      usableAssigned,
      hostsRequested,
      wastedByReserve,
      freeAddresses,
      usedPct: (used / totalBase) * 100,
      efficiency: used > 0 ? (usableAssigned / used) * 100 : 0,
      fit: positioned.every((b) => b.usable >= b.hosts),
    }
  }, [result, positioned])

  const asText = (blocks: VlsmBlock[]): string => {
    const rows = blocks.map((b) => `${b.name.padEnd(16)} ${b.network}/${b.cidr}\t${b.mask}\t${b.firstHost} - ${b.lastHost}\tusable: ${b.usable} (pide ${b.hosts})`)
    return `# VLSM de ${base}\n` + rows.join('\n')
  }

  const asCsv = (): string => {
    const header = 'nombre,hosts_pedidos,red,cidr,mascara,primer_host,ultimo_host,broadcast,usables,libres,total_direcciones'
    const rows = (result?.blocks ?? []).map((b) => [b.name, b.hosts, `${b.network}/${b.cidr}`, b.cidr, b.mask, b.firstHost, b.lastHost, b.broadcast, b.usable, b.leftover, b.total].join(','))
    return [header, ...rows].join('\n')
  }

  const exportCsv = () => {
    download(`vlsm-${base.replace(/[/.]/g, '_')}.csv`, asCsv(), 'text/csv')
    toast('CSV descargado')
  }

  return (
    <div className="min-w-0">
      <ToolHeader icon={Calculator} title="Calculadora VLSM" desc="Segmenta una red base en subredes por hosts: mapa visual, binarios, eficiencia, huecos y export CSV — portado de calculadora_vlsm" badge="ported" />

      <Reveal>
        <div className="card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Red base" hint="192.168.1.0/24">
              <TextInput value={base} onChange={(e) => setBase(e.target.value)} className="font-mono" />
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              {PRESETS.map((p) => (
                <Button key={p.label} variant="ghost" onClick={() => { setBase(p.base); setReqs(p.reqs.map((r) => ({ ...r }))); toast(`preset ${p.label} cargado`) }}>
                  {p.label}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => setReqs([])}>limpiar</Button>
            </div>
          </div>

          <div className="mt-5">
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-grey">subredes solicitadas</span>
            <div className="space-y-2">
              {reqs.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-2">
                  <TextInput
                    value={r.name}
                    placeholder="nombre"
                    onChange={(e) => setReqs((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    className="w-44 min-w-0"
                  />
                  <TextInput
                    value={String(r.hosts)}
                    placeholder="hosts"
                    type="number"
                    min={1}
                    onChange={(e) => setReqs((rs) => rs.map((x, j) => (j === i ? { ...x, hosts: parseInt(e.target.value) || 0 } : x)))}
                    className="w-32"
                  />
                  <span className="flex items-center font-mono text-[10px] text-grey">
                    {(() => { try { const c = 32 - Math.ceil(Math.log2((parseInt(String(r.hosts)) || 1) + 2)); return `→ /${c} (${(2 ** (32 - c)).toLocaleString('es-ES')} dir.)` } catch { return '' } })()}
                  </span>
                  <button
                    onClick={() => setReqs((rs) => rs.filter((_, j) => j !== i))}
                    className="rounded-lg border border-edge px-3 text-grey transition-colors hover:border-bad/50 hover:text-bad"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
            <Button className="mt-3" variant="ghost" onClick={() => setReqs((rs) => [...rs, { name: `subred-${rs.length + 1}`, hosts: 30 }])}>
              <Plus size={14} /> añadir subred
            </Button>
          </div>
        </div>
      </Reveal>

      {result && (
        <>
          {/* ─── resumen de la base ─── */}
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone="accent">base: {result.base.network}/{result.base.cidr}</Badge>
                <Badge tone="info">clase {result.base.klass}</Badge>
                <Badge tone={result.base.isPrivate ? 'warn' : 'ok'}>{result.base.isPrivate ? 'privada (RFC1918)' : 'pública'}</Badge>
                <Badge tone={result.error ? 'bad' : 'ok'}>{result.error ? 'con avisos' : 'sin solapamientos'}</Badge>
                {stats && <Badge tone={stats.fit ? 'ok' : 'bad'}>{stats.fit ? 'todas las subredes caben' : '⚠ alguna subred no cubre sus hosts'}</Badge>}
              </div>

              <div className="grid gap-3 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['red / broadcast', `${result.base.network} · ${result.base.broadcast}`],
                  ['máscara / wildcard', `${result.base.mask} · ${result.base.wildcard}`],
                  ['rango útil', `${result.base.firstHost} – ${result.base.lastHost}`],
                  ['capacidad', `${result.base.usableHosts.toLocaleString('es-ES')} útiles de ${(2 ** (32 - result.base.cidr)).toLocaleString('es-ES')} totales`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-grey">{k}</div>
                    <div className="mt-0.5 break-all font-mono text-ink">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-2 font-mono text-[10.5px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-28 shrink-0 text-grey">binario red</span>
                  <BinOctets bits={toBinaryIp(result.base.networkInt)} cidr={result.base.cidr} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-28 shrink-0 text-grey">binario máscara</span>
                  <BinOctets bits={toBinaryIp(result.base.maskInt)} cidr={result.base.cidr} />
                </div>
              </div>
            </div>
          </Reveal>

          {/* ─── mapa visual de la red base ─── */}
          {stats && positioned.length > 0 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">mapa de la red base</h3>
                  <span className="font-mono text-[10px] text-grey">{stats.used.toLocaleString('es-ES')} / {stats.totalBase.toLocaleString('es-ES')} direcciones ({stats.usedPct.toFixed(1)}%)</span>
                </div>
                <div className="flex h-12 w-full min-w-0 overflow-hidden rounded-lg border border-edge bg-black/40">
                  {mapSegs.map((s, i) => {
                    const wPct = (s.size / stats.totalBase) * 100
                    const hue = BLOCK_HUES[i % BLOCK_HUES.length]
                    return s.kind === 'block' ? (
                      <motion.div
                        key={i}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="relative flex min-w-0 items-center justify-center overflow-hidden border-r border-black/40 last:border-0"
                        style={{ width: `${Math.max(wPct, 1.2)}%`, background: `hsl(${hue} 65% 40% / 0.55)` }}
                        title={`${s.block!.name}: ${s.block!.network}/${s.block!.cidr}`}
                      >
                        <span className="truncate px-1 font-mono text-[10px] font-bold text-white">{s.block!.name}</span>
                      </motion.div>
                    ) : (
                      <div key={i} className="min-w-0 border-r border-edge/60 last:border-0" style={{ width: `${Math.max(wPct, 0.6)}%` }} title={`libre: ${intToIp(s.start)} (${s.size.toLocaleString('es-ES')} dir.)`} />
                    )
                  })}
                </div>
                <div className="mt-3 grid gap-2 font-mono text-[10.5px] sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-edge bg-black/30 px-3 py-2"><span className="text-grey">solicitado</span><span className="float-right text-ink">{stats.hostsRequested.toLocaleString('es-ES')} hosts</span></div>
                  <div className="rounded-lg border border-edge bg-black/30 px-3 py-2"><span className="text-grey">útiles asignados</span><span className="float-right text-ink">{stats.usableAssigned.toLocaleString('es-ES')}</span></div>
                  <div className="rounded-lg border border-edge bg-black/30 px-3 py-2"><span className="text-grey">direcciones libres</span><span className="float-right text-ok">{stats.freeAddresses.toLocaleString('es-ES')}</span></div>
                  <div className="rounded-lg border border-edge bg-black/30 px-3 py-2"><span className="text-grey">eficiencia (útiles/total)</span><span className="float-right text-acento">{stats.efficiency.toFixed(1)}%</span></div>
                </div>
              </div>
            </Reveal>
          )}

          {/* ─── tabla de subredes ─── */}
          <Reveal>
            <div className="card mt-6 min-w-0 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">subredes generadas (orden de asignación: mayor a menor)</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={exportCsv}><Download size={13} /> CSV</Button>
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[820px] font-mono text-[12px]">
                  <thead>
                    <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-grey">
                      <th className="py-2 pr-3"></th>
                      <th className="py-2 pr-3">nombre</th>
                      <th className="py-2 pr-3">hosts pedidos</th>
                      <th className="py-2 pr-3">red / CIDR</th>
                      <th className="py-2 pr-3">máscara</th>
                      <th className="py-2 pr-3">rango útil</th>
                      <th className="py-2 pr-3">broadcast</th>
                      <th className="py-2 pr-3 text-right">usables</th>
                      <th className="py-2 pr-3 text-right">libres</th>
                      <th className="py-2 text-right">uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.blocks.map((b, i) => {
                      const hue = BLOCK_HUES[positioned.findIndex((p) => p.name === b.name && p.netInt === b.netInt) % BLOCK_HUES.length]
                      const usePct = b.usable > 0 ? Math.min(100, (b.hosts / b.usable) * 100) : 0
                      return (
                        <motion.tr
                          key={b.name + i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.4) }}
                          className="cursor-pointer border-b border-edge/40 transition-colors hover:bg-acento/5"
                          onClick={() => setExpanded(expanded === i ? null : i)}
                        >
                          <td className="py-2 pr-3">
                            {expanded === i ? <ChevronDown size={13} className="text-acento" /> : <ChevronRight size={13} className="text-grey" />}
                          </td>
                          <td className="py-2 pr-3 font-bold text-white">
                            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: `hsl(${hue} 65% 45%)` }} />
                            {b.name}
                          </td>
                          <td className="py-2 pr-3 text-grey">{b.hosts.toLocaleString('es-ES')}</td>
                          <td className={`py-2 pr-3 ${b.ok ? 'text-acento' : 'text-bad'}`}>{b.network}/{b.cidr}</td>
                          <td className="py-2 pr-3 text-ink">{b.mask}</td>
                          <td className="py-2 pr-3 text-ink">{b.firstHost} – {b.lastHost}</td>
                          <td className="py-2 pr-3 text-ink">{b.broadcast}</td>
                          <td className="py-2 pr-3 text-right text-ink">{b.usable.toLocaleString('es-ES')}</td>
                          <td className={`py-2 pr-3 text-right ${b.leftover < 0 ? 'text-bad' : 'text-ok'}`}>{b.leftover.toLocaleString('es-ES')}</td>
                          <td className="py-2">
                            <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-black/50">
                              <div className={`h-full rounded-full ${usePct > 90 ? 'bg-warn' : 'bg-acento'}`} style={{ width: `${usePct}%` }} title={`${usePct.toFixed(0)}% usado`} />
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {result.error && <p className="mt-3 break-all font-mono text-xs text-warn">⚠ {result.error}</p>}

              {/* ─── detalle expandible por subred ─── */}
              {result.blocks.map((b, i) =>
                expanded === i ? (
                  <motion.div
                    key={`detail-${i}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 overflow-hidden rounded-lg border border-acento/30 bg-black/30 p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{b.name}</Badge>
                      <Badge tone="info">/{b.cidr} = 2^{32 - b.cidr} = {b.total.toLocaleString('es-ES')} direcciones</Badge>
                      {b.cidr <= 30 && <Badge tone="neutral">-2 (red+broadcast)</Badge>}
                      {b.cidr === 31 && <Badge tone="neutral">punto a punto (RFC 3021)</Badge>}
                    </div>
                    <div className="grid gap-2 font-mono text-[10.5px]">
                      <div className="flex flex-wrap items-center gap-2"><span className="w-36 shrink-0 text-grey">binario red</span><BinOctets bits={toBinaryIp(b.netInt)} cidr={b.cidr} /></div>
                      <div className="flex flex-wrap items-center gap-2"><span className="w-36 shrink-0 text-grey">binario broadcast</span><BinOctets bits={toBinaryIp(b.netInt + b.total - 1)} cidr={b.cidr} /></div>
                      <div className="flex flex-wrap items-center gap-2"><span className="w-36 shrink-0 text-grey">binario máscara</span><BinOctets bits={toBinaryIp(maskFromCidr(b.cidr))} cidr={b.cidr} /></div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-36 shrink-0 text-grey">wildcard</span>
                        <span className="text-ink">{intToIp(~maskFromCidr(b.cidr) >>> 0)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-36 shrink-0 text-grey">dirección de red</span>
                        <span className="text-ink">{b.network}</span>
                        <span className="text-grey">— primer host:</span>
                        <span className="text-ok">{b.firstHost}</span>
                        <span className="text-grey">— último host:</span>
                        <span className="text-ok">{b.lastHost}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-36 shrink-0 text-grey">desperdicio</span>
                        <span className="text-warn">{b.total - Math.max(0, b.usable) - Math.max(0, b.leftover) >= 0 ? `${(b.usable - b.hosts).toLocaleString('es-ES')} hosts libres + ${b.cidr <= 30 ? 2 : 0} de red/broadcast` : 'sin desperdicio'}</span>
                      </div>
                    </div>
                    <p className="mt-3 font-mono text-[10px] text-grey">
                      💡 {b.usable.toLocaleString('es-ES')} útiles ≥ {b.hosts.toLocaleString('es-ES')} pedidos → la mínima máscara que cabe es /{b.cidr} (2^{32 - b.cidr} - 2 = {b.usable.toLocaleString('es-ES')})
                      {b.leftover > 0 && ` · sobran ${b.leftover.toLocaleString('es-ES')} hosts para crecer`}
                    </p>
                  </motion.div>
                ) : null,
              )}

              <div className="mt-5">
                <CopyBlock text={asText(result.blocks)} label="resumen vlsm" />
              </div>
            </div>
          </Reveal>
        </>
      )}

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 VLSM asigna primero la subred más grande: para 250 hosts hace falta /24 (254 útiles), para 60 → /26, para 2 → /30.
          Los bloques se alinean a su tamaño (una /26 siempre empieza en múltiplos de 64). Haz clic en una fila para ver los binarios y el detalle completo.
        </div>
      </Reveal>
    </div>
  )
}
