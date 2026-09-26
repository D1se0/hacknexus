import { useMemo, useState } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { BrickWall, Plus, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { NFT_SERVICES, ACTION_INFO, buildNftRuleset, NFT_VERIFY, NFT_NOTES, type NftRule, type RuleAction } from '../lib/nftables'

let rid = 0
const blankRule = (): NftRule => ({ id: `r${++rid}`, proto: 'tcp', port: '443', source: '', action: 'accept', comment: '' })

export default function Nftgen() {
  const [iface, setIface] = useState('eth0')
  const [defaultInput, setDefaultInput] = useState<'drop' | 'accept'>('drop')
  const [allowEstablished, setAllowEstablished] = useState(true)
  const [logDrops, setLogDrops] = useState(true)
  const [rateLimitSsh, setRateLimitSsh] = useState(true)
  const [dropInvalid, setDropInvalid] = useState(true)
  const [rules, setRules] = useState<NftRule[]>([
    { id: 'r1', proto: 'tcp', port: '443', source: '', action: 'accept', comment: 'HTTPS' },
    { id: 'r2', proto: 'tcp', port: '80', source: '', action: 'accept', comment: 'HTTP' },
    { id: 'r3', proto: 'icmp', port: '', source: '', action: 'accept', comment: 'ping' },
    { id: 'r4', proto: 'icmpv6', port: '', source: '', action: 'accept', comment: 'ICMPv6 (necesario en IPv6)' },
  ])
  const toast = useToast()

  const ruleset = useMemo(() => buildNftRuleset({ iface, defaultInput, allowEstablished, logDrops, rateLimitSsh, dropInvalid, rules }), [iface, defaultInput, allowEstablished, logDrops, rateLimitSsh, dropInvalid, rules])

  const addFromService = (idx: number) => {
    const s = NFT_SERVICES[idx]
    if (!s) return
    setRules((rs) => [...rs, { id: `r${++rid}`, proto: s.proto, port: s.port, source: '', action: 'accept', comment: s.label }])
    toast(`${s.label} añadido como regla`)
  }

  const update = (id: string, patch: Partial<NftRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const Toggle = ({ label, on, set, hint }: { label: string; on: boolean; set: (v: boolean) => void; hint?: string }) => (
    <button onClick={() => set(!on)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[11px] transition-colors ${on ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`} title={hint}>
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-acento' : 'bg-grey/40'}`} />
      {label}
    </button>
  )

  return (
    <div>
      <ToolHeader icon={BrickWall} title="NFTables Builder" desc="Genera rulesets nft con mínimo privilegio: policy drop, established/related, rate limit SSH y reglas por servicio con explicación de cada acción" />
      <SnapshotButtons
        toolId="nftgen"
        label="ruleset completo"
        getData={() => ({ iface, defaultInput, allowEstablished, logDrops, rateLimitSsh, dropInvalid, rules })}
        onLoad={(d) => { if (d.iface) setIface(d.iface); if (d.defaultInput) setDefaultInput(d.defaultInput); if (d.rules) setRules(d.rules); if (d.allowEstablished !== undefined) setAllowEstablished(d.allowEstablished); if (d.logDrops !== undefined) setLogDrops(d.logDrops); if (d.rateLimitSsh !== undefined) setRateLimitSsh(d.rateLimitSsh); if (d.dropInvalid !== undefined) setDropInvalid(d.dropInvalid) }}
      />

      <InfoBanner>
        <b>nftables reemplaza iptables</b> en kernels modernos (una sola sintaxis para IPv4+IPv6). La estructura correcta es: policy drop en input + aceptar established/related + abrir solo lo necesario. <b>Peligro:</b> si aplicas por SSH sin protección puedes cortarte el acceso — deja un <span className="font-mono">sleep 120 && nft flush ruleset</span> corriendo en background como red de seguridad.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">política general</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="interfaz principal (solo informativo)">
              <TextInput value={iface} onChange={(e) => setIface(e.target.value)} placeholder="eth0" className="font-mono" />
            </Field>
            <Field label="policy de input">
              <Select value={defaultInput} onChange={(e) => setDefaultInput(e.target.value as 'drop' | 'accept')} options={[{ value: 'drop', label: 'drop (mínimo privilegio)' }, { value: 'accept', label: 'accept (solo para labs)' }]} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Toggle label="establecidas+relacionadas" on={allowEstablished} set={setAllowEstablished} hint="imprescindible: sin esto ninguna conexión saliente recibe respuesta" />
            <Toggle label="descartar inválidos" on={dropInvalid} set={setDropInvalid} hint="paquetes con flags/state imposibles" />
            <Toggle label="rate limit SSH" on={rateLimitSsh} set={setRateLimitSsh} hint="6 conexiones nuevas/minuto por IP" />
            <Toggle label="log de drops" on={logDrops} set={setLogDrops} hint="muestra en el journal lo descartado por la policy" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">añadir servicio predefinido</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {NFT_SERVICES.map((s, idx) => (
              <Button key={s.label} variant="ghost" onClick={() => addFromService(idx)} className="gap-2 px-3 py-1.5 text-xs" title={s.desc}>
                + {s.label}
              </Button>
            ))}
          </div>

          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">reglas ({rules.length})</h3>
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-edge p-3">
                <span className="font-mono text-[10px] text-grey">#{i + 1}</span>
                <Select value={r.proto} onChange={(e) => update(r.id, { proto: e.target.value as NftRule['proto'] })} options={['tcp', 'udp', 'icmp', 'icmpv6'].map((p) => ({ value: p, label: p }))} className="w-24" />
                <TextInput value={r.port} onChange={(e) => update(r.id, { port: e.target.value })} placeholder="puerto" className="w-24 font-mono" disabled={r.proto === 'icmp' || r.proto === 'icmpv6'} />
                <TextInput value={r.source} onChange={(e) => update(r.id, { source: e.target.value })} placeholder="origen (CIDR, vacío=any)" className="min-w-36 flex-1 font-mono" />
                <Select value={r.action} onChange={(e) => update(r.id, { action: e.target.value as RuleAction })} options={Object.keys(ACTION_INFO).map((a) => ({ value: a, label: a }))} className="w-28" />
                <TextInput value={r.comment} onChange={(e) => update(r.id, { comment: e.target.value })} placeholder="comentario" className="min-w-32 flex-1 font-mono" />
                <Button variant="danger" className="px-2 py-1" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}><Trash2 size={13} /></Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-3 gap-1 px-2 py-1 text-xs" onClick={() => setRules((rs) => [...rs, blankRule()])}><Plus size={12} /> regla manual</Button>

          <div className="mt-4 space-y-1">
            {rules.filter((r) => r.action !== 'accept').map((r) => (
              <p key={r.id} className="font-mono text-[10px] text-grey/70">ℹ {r.action}: {ACTION_INFO[r.action]}</p>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">ruleset nft</h3>
          <CopyBlock text={ruleset} maxH="460" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">aplicar y verificar</h4>
              <div className="space-y-1.5">
                {NFT_VERIFY.map(([cmd, what]) => (
                  <div key={cmd} className="flex flex-wrap items-baseline gap-2">
                    <code className="font-mono text-[11px] text-acento">{cmd}</code>
                    <span className="font-mono text-[10px] text-grey">{what}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">notas importantes</h4>
              <ul className="space-y-1">
                {NFT_NOTES.map((n) => <li key={n} className="font-mono text-[10px] leading-relaxed text-grey">— {n}</li>)}
              </ul>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {['flush ruleset: borra TODO lo activo', 'inet = IPv4+IPv6 en una tabla', 'priority filter = 0 (estándar)', 'comment en reglas: documentación viva'].map((t) => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
