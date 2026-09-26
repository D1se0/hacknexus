import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Select, Reveal, InfoBanner } from '../components/ui'
import { ttlGuess, TTL_BASES, mtuBreakdown, COMMON_MTUS, MTU_NOTES, wildcardAcl, prefixToMask, prefixToWildcard, maskToPrefix, CIDR_TABLE, vlanPlan, VLAN_NOTES, RESERVED_VLANS, tosBreakdown, dscpToTos, DSCP_NAMES, transferTime, BW_NOTES, type VlanDef } from '../lib/netcalc'

type Tab = 'ttl' | 'mtu' | 'acl' | 'vlan' | 'dscp' | 'transfer' | 'cidr'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'ttl', label: 'TTL → SO', icon: '🏓' },
  { id: 'mtu', label: 'MTU / MSS', icon: '📦' },
  { id: 'acl', label: 'Wildcards ACL', icon: '🧮' },
  { id: 'vlan', label: 'Plan de VLANs', icon: '🏢' },
  { id: 'dscp', label: 'ToS / DSCP', icon: '🎯' },
  { id: 'transfer', label: 'Transferencias', icon: '⏱️' },
  { id: 'cidr', label: 'Tabla CIDR', icon: '📊' },
]

export default function Netcalc() {
  const [tab, setTab] = useState<Tab>('ttl')

  // TTL
  const [ttl, setTtl] = useState('57')
  const ttlR = useMemo(() => {
    const n = parseInt(ttl)
    return Number.isFinite(n) && n >= 1 && n <= 255 ? ttlGuess(n) : null
  }, [ttl])

  // MTU
  const [mtu, setMtu] = useState('1500')
  const mtuR = useMemo(() => {
    const n = parseInt(mtu)
    return Number.isFinite(n) && n >= 68 && n <= 9600 ? mtuBreakdown(n) : null
  }, [mtu])

  // ACL
  const [aclIp, setAclIp] = useState('192.168.1.130')
  const [aclP, setAclP] = useState('26')
  const aclR = useMemo(() => {
    const p = parseInt(aclP)
    if (!Number.isFinite(p) || p < 0 || p > 32) return null
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(aclIp)) return null
    return wildcardAcl(aclIp, p)
  }, [aclIp, aclP])
  const [revMask, setRevMask] = useState('255.255.255.192')
  const revPrefix = useMemo(() => maskToPrefix(revMask), [revMask])

  // VLANs
  const [vlans, setVlans] = useState<VlanDef[]>([
    { id: 10, name: 'datos', hosts: 100 },
    { id: 20, name: 'voz', hosts: 50 },
    { id: 30, name: 'mgmt', hosts: 10 },
    { id: 99, name: 'invitados', hosts: 30 },
  ])
  const [baseNet, setBaseNet] = useState('10.0.0.0')
  const [basePrefix, setBasePrefix] = useState('16')
  const plan = useMemo(() => {
    const bp = parseInt(basePrefix)
    if (!Number.isFinite(bp) || bp < 8 || bp > 24) return null
    return vlanPlan(vlans, baseNet, bp)
  }, [vlans, baseNet, basePrefix])

  // DSCP
  const [dscpVal, setDscpVal] = useState('46')
  const dscpR = useMemo(() => {
    const d = parseInt(dscpVal)
    return Number.isFinite(d) && d >= 0 && d <= 63 ? { dscp: d, name: DSCP_NAMES[d] ?? `DSCP ${d} (no estándar)`, tos: dscpToTos(d) } : null
  }, [dscpVal])
  const [tosVal, setTosVal] = useState('184')
  const tosR = useMemo(() => {
    const t = parseInt(tosVal)
    return Number.isFinite(t) && t >= 0 && t <= 255 ? tosBreakdown(t) : null
  }, [tosVal])

  // Transferencias
  const [sizeMB, setSizeMB] = useState('1024')
  const [mbps, setMbps] = useState('100')
  const [overhead, setOverhead] = useState('5')
  const transfer = useMemo(() => {
    const s = parseFloat(sizeMB), b = parseFloat(mbps), o = parseFloat(overhead)
    return Number.isFinite(s) && Number.isFinite(b) && s > 0 && b > 0 ? transferTime(s, b, Number.isFinite(o) ? o : 5) : null
  }, [sizeMB, mbps, overhead])

  return (
    <>
      <ToolHeader icon={Calculator} title="Network Admin Calculators" desc="7 calculadoras que un administrador de redes usa a diario: identificación por TTL, MTU/MSS con tests de ping listos, wildcards de ACL Cisco, dimensionado de VLANs con router-on-a-stick, ToS/DSCP, tiempos de transferencia y tabla CIDR de referencia" />

      <InfoBanner>
        Cada calculadora da el resultado <b>y el comando para verificarlo</b>: el ping de MTU, la ACL copiable, el router-on-a-stick.
        Pensada para el día a día de sysadmin de redes — sin magia, con los porqués.
      </InfoBanner>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${tab === t.id ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TTL */}
      {tab === 'ttl' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="TTL observado en un ping" hint="1-255">
              <TextInput value={ttl} onChange={(e) => setTtl(e.target.value)} className="font-mono" />
            </Field>
            {ttlR && (
              <Reveal>
                <div className="rounded-lg border border-acento/40 bg-acento/5 p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-3xl font-bold text-acento">{ttlR.hops}</span>
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-grey">saltos estimados</div>
                      <div className="text-sm text-ink">{ttlR.hopsDesc}</div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-edge pt-3">
                    <Badge tone="info">TTL inicial probable: {ttlR.base}</Badge>
                    <p className="mt-2 text-sm font-medium text-ok">{ttlR.os}</p>
                    <p className="mt-1 text-xs text-grey">{ttlR.note}</p>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
          <div className="rounded border border-edge bg-black/30 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Bases TTL conocidas</h4>
            <div className="space-y-1.5">
              {TTL_BASES.map((b) => (
                <div key={b.base} className="flex items-baseline gap-2 text-xs">
                  <code className="w-10 shrink-0 font-mono font-bold text-ink">{b.base}</code>
                  <div><span className="text-ok">{b.os}</span> <span className="text-grey/70">— {b.note}</span></div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-grey/70">Truco: la distancia al siguiente TTL base de abajo hacia arriba te dice los saltos. Windows responde con ping de forma distinta a Linux (usa el tamaño y el patrón de respuesta como segundo indicio).</p>
          </div>
        </div>
      )}

      {/* MTU */}
      {tab === 'mtu' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="MTU de la interfaz / ruta">
              <TextInput value={mtu} onChange={(e) => setMtu(e.target.value)} className="font-mono" />
            </Field>
            <Field label="O elige la situación típica">
              <Select value={mtu} onChange={(e) => setMtu(e.target.value)} options={COMMON_MTUS.map((m) => ({ value: String(m.mtu), label: `${m.mtu} — ${m.label}` }))} />
              {COMMON_MTUS.find((m) => String(m.mtu) === mtu) && (
                <p className="mt-1 text-[11px] text-grey/70">{COMMON_MTUS.find((m) => String(m.mtu) === mtu)!.note}</p>
              )}
            </Field>
            {mtuR && (
              <Reveal>
                <div className="rounded-lg border border-edge bg-black/40 p-4 font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>MSS IPv4: <span className="text-ok">{mtuR.tcpMss4}</span></div>
                    <div>MSS IPv6: <span className="text-ok">{mtuR.tcpMss6}</span></div>
                    <div>payload IP: <span className="text-ink">{mtuR.ipPayload}</span></div>
                    <div>ping máx: <span className="text-ink">{mtuR.pingSize}</span> bytes</div>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
          <div className="space-y-3">
            {mtuR && (
              <>
                <CopyBlock text={mtuR.pingCmd} label="test Linux (no fragmenta)" maxH="6rem" />
                <CopyBlock text={mtuR.pingWin} label="test Windows (-f = DF bit)" maxH="6rem" />
              </>
            )}
            <div className="rounded border border-edge bg-black/30 p-3">
              <ul className="space-y-1.5 text-[11px] text-grey">
                {MTU_NOTES.map((n) => <li key={n}>• {n}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ACL */}
      {tab === 'acl' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="IP de ejemplo dentro de la red">
              <TextInput value={aclIp} onChange={(e) => setAclIp(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Prefijo (/)">
              <TextInput value={aclP} onChange={(e) => setAclP(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Máscara → prefijo (traductor inverso)">
              <TextInput value={revMask} onChange={(e) => setRevMask(e.target.value)} className="font-mono" />
            </Field>
            {revPrefix !== null ? <Badge tone="ok">{revMask} = /{revPrefix}</Badge> : <Badge tone="bad">máscara no contigua o inválida</Badge>}
          </div>
          <div className="space-y-2">
            {aclR && (
              <>
                <Reveal>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-edge bg-black/40 p-3 font-mono text-xs">
                    <div>máscara: <span className="text-ok">{aclR.mask}</span></div>
                    <div>wildcard: <span className="text-warn">{aclR.wildcard}</span></div>
                  </div>
                </Reveal>
                <CopyBlock text={aclR.ciscoStd} label="ACL estándar Cisco" maxH="5rem" />
                <CopyBlock text={aclR.ciscoExt} label="ACL extendida Cisco" maxH="5rem" />
                <CopyBlock text={aclR.nft} label="equivalente nftables" maxH="5rem" />
              </>
            )}
          </div>
        </div>
      )}

      {/* VLANs */}
      {tab === 'vlan' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
            <Field label="Red base">
              <TextInput value={baseNet} onChange={(e) => setBaseNet(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Prefijo base">
              <TextInput value={basePrefix} onChange={(e) => setBasePrefix(e.target.value)} className="font-mono" />
            </Field>
            <div className="self-end text-[11px] text-grey/70">Cada VLAN recibe el bloque más pequeño que acoge sus hosts, alineado dentro de la red base</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-edge text-left font-mono text-[10px] uppercase tracking-wider text-grey">
                  <th className="pb-2 pr-2">VLAN</th><th className="pb-2 pr-2">nombre</th><th className="pb-2 pr-2">hosts</th>
                  <th className="pb-2 pr-2">red</th><th className="pb-2 pr-2">prefijo</th><th className="pb-2 pr-2">máscara</th>
                  <th className="pb-2 pr-2">gateway</th><th className="pb-2 pr-2">usable</th><th className="pb-2 pr-2">margen</th><th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {vlans.map((v, i) => (
                  <tr key={i} className="border-b border-edge/50 font-mono">
                    <td className="py-1.5 pr-2"><input value={v.id} onChange={(e) => setVlans((x) => x.map((y, j) => j === i ? { ...y, id: parseInt(e.target.value) || 0 } : y))} className="w-14 rounded border border-edge bg-black/40 px-1.5 py-0.5" /></td>
                    <td className="py-1.5 pr-2"><input value={v.name} onChange={(e) => setVlans((x) => x.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} className="w-24 rounded border border-edge bg-black/40 px-1.5 py-0.5" /></td>
                    <td className="py-1.5 pr-2"><input value={v.hosts} onChange={(e) => setVlans((x) => x.map((y, j) => j === i ? { ...y, hosts: parseInt(e.target.value) || 0 } : y))} className="w-14 rounded border border-edge bg-black/40 px-1.5 py-0.5" /></td>
                    <td className="py-1.5 pr-2 text-ok">{plan?.rows[i]?.network ?? '—'}</td>
                    <td className="py-1.5 pr-2 text-ink">/{plan?.rows[i]?.prefix ?? '—'}</td>
                    <td className="py-1.5 pr-2 text-grey">{plan?.rows[i]?.mask ?? '—'}</td>
                    <td className="py-1.5 pr-2 text-info">{plan?.rows[i]?.gateway ?? '—'}</td>
                    <td className="py-1.5 pr-2">{plan?.rows[i]?.usable ?? '—'}</td>
                    <td className="py-1.5 pr-2 text-acento">+{plan?.rows[i]?.waste ?? '—'}</td>
                    <td className="py-1.5"><button onClick={() => setVlans((x) => x.filter((_, j) => j !== i))} className="text-bad">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setVlans((x) => [...x, { id: 40, name: 'nueva', hosts: 20 }])} className="rounded border border-acento/40 px-3 py-1.5 text-xs text-acento hover:bg-acento/10">+ añadir VLAN</button>

          {plan && plan.errors.length > 0 && (
            <div className="rounded border border-bad/40 bg-bad/5 px-3 py-2 text-xs text-bad">
              {plan.errors.map((e) => <div key={e}>⚠ {e}</div>)}
            </div>
          )}

          {plan && plan.ok && <CopyBlock text={plan.routerOnAStick} label="router-on-a-stick (Cisco + Linux)" maxH="24rem" />}

          <div className="rounded border border-edge bg-black/30 p-3">
            <ul className="space-y-1.5 text-[11px] text-grey">
              {VLAN_NOTES.map((n) => <li key={n}>• {n}</li>)}
              {RESERVED_VLANS.map(([id, note]) => <li key={id}>⚠ <span className="text-warn">{note}</span></li>)}
            </ul>
          </div>
        </div>
      )}

      {/* DSCP */}
      {tab === 'dscp' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="DSCP (0-63)">
              <TextInput value={dscpVal} onChange={(e) => setDscpVal(e.target.value)} className="font-mono" />
            </Field>
            {dscpR && (
              <Reveal>
                <div className="rounded-lg border border-edge bg-black/40 p-4 text-sm">
                  <div className="font-bold text-ok">{dscpR.name}</div>
                  <div className="mt-2 space-y-1 font-mono text-xs text-grey">
                    <div>campo ToS (byte completo): <span className="text-ink">{dscpR.tos}</span> (0x{dscpR.tos.toString(16).toUpperCase().padStart(2, '0')})</div>
                    <div>binario: <span className="text-ink">{dscpR.tos.toString(2).padStart(8, '0')}</span></div>
                  </div>
                  <div className="mt-2 text-[11px] text-grey/70">DSCP ocupa los 6 bits altos del byte ToS; los 2 bajos son ECN</div>
                </div>
              </Reveal>
            )}
            <Field label="…o traducir byte ToS capturado → DSCP">
              <TextInput value={tosVal} onChange={(e) => setTosVal(e.target.value)} className="font-mono" />
            </Field>
            {tosR && (
              <div className="rounded border border-edge bg-black/40 p-3 font-mono text-xs">
                <div className="text-ok">{tosR.dscpName}</div>
                <div className="mt-1 text-grey">DSCP {tosR.dscp} · ECN: {tosR.ecnDesc} · binario: {tosR.binary}</div>
              </div>
            )}
          </div>
          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Clases DSCP que importan</h4>
            <div className="space-y-1 font-mono text-[11px]">
              {Object.entries(DSCP_NAMES).map(([d, n]) => (
                <div key={d} className="flex gap-2">
                  <span className="w-8 text-right text-acento">{d}</span>
                  <span className={n.includes('EF') || n.includes('VOZ') ? 'text-ok' : 'text-grey'}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transferencias */}
      {tab === 'transfer' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Field label="Tamaño (MB)"><TextInput value={sizeMB} onChange={(e) => setSizeMB(e.target.value)} className="font-mono" /></Field>
              <Field label="Ancho (Mbps)"><TextInput value={mbps} onChange={(e) => setMbps(e.target.value)} className="font-mono" /></Field>
              <Field label="Overhead %"><TextInput value={overhead} onChange={(e) => setOverhead(e.target.value)} className="font-mono" /></Field>
            </div>
            {transfer && (
              <Reveal>
                <div className="rounded-lg border border-acento/40 bg-acento/5 p-4 text-center">
                  <div className="font-mono text-3xl font-bold text-acento">{transfer.human}</div>
                  <div className="mt-1 text-xs text-grey">rendimiento efectivo: {transfer.effective.toFixed(0)} Mbps (con {overhead}% de overhead de protocolo)</div>
                </div>
              </Reveal>
            )}
            <div className="grid grid-cols-4 gap-2">
              {[10, 100, 1000, 10000].map((b) => (
                <button key={b} onClick={() => setMbps(String(b))} className="rounded border border-edge px-2 py-1 font-mono text-[11px] text-grey hover:border-acento/40 hover:text-ink">
                  {b >= 1000 ? b / 1000 + ' Gb' : b + ' Mb'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded border border-edge bg-black/30 p-3">
            <ul className="space-y-1.5 text-[11px] text-grey">
              {BW_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* CIDR */}
      {tab === 'cidr' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="border-b border-edge text-left font-mono text-[10px] uppercase tracking-wider text-grey">
                <th className="pb-2 pr-3">prefijo</th><th className="pb-2 pr-3">máscara</th><th className="pb-2 pr-3">wildcard</th>
                <th className="pb-2 pr-3">hosts útiles</th><th className="pb-2">uso típico</th>
              </tr>
            </thead>
            <tbody>
              {CIDR_TABLE.map((r) => (
                <tr key={r.p} className="border-b border-edge/50">
                  <td className="py-1.5 pr-3 font-mono font-bold text-acento">/{r.p}</td>
                  <td className="py-1.5 pr-3 font-mono text-ink">{prefixToMask(r.p)}</td>
                  <td className="py-1.5 pr-3 font-mono text-warn">{prefixToWildcard(r.p)}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.hosts.toLocaleString('es-ES')}</td>
                  <td className="py-1.5 text-grey">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
