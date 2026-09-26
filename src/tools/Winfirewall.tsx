import { useMemo, useState } from 'react'
import { ShieldCheck, Plus, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { FW_PRESETS, buildNetshRule, removeRuleCmd, fwWarnings, FW_HARDENING_SNIPPETS, FW_VERIFY, type FwRule } from '../lib/winfirewall'

let rid = 0
const blank = (): FwRule => ({ id: `r${++rid}`, name: 'Nueva regla', dir: 'in', action: 'allow', proto: 'tcp', ports: '', program: '', remoteip: '', profile: 'any' })

export default function Winfirewall() {
  const [rules, setRules] = useState<FwRule[]>(() => FW_PRESETS.map((p, i) => ({ id: `preset${i}`, ...p.rule })))
  const toast = useToast()

  const script = useMemo(() => {
    const L = [
      '# Requires -RunAsAdministrator',
      '# Reglas de Windows Defender Firewall generadas por HackNexus',
      '# backup antes de tocar: netsh advfirewall export "C:\\fw-backup.wfw"',
      '',
    ]
    for (const r of rules) {
      L.push(`# ${r.name} — ${r.action === 'allow' ? 'permite' : 'bloquea'} ${r.proto} ${r.ports || '(cualquier puerto)'} ${r.dir === 'in' ? 'entrante' : 'saliente'}${r.remoteip ? ` desde ${r.remoteip}` : ''}`)
      L.push(buildNetshRule(r))
      const warns = fwWarnings(r)
      for (const w of warns) if (w.tone === 'bad') L.push(`#   ⚠ ${w.text}`)
      L.push('')
    }
    L.push('# verificar:')
    L.push('# netsh advfirewall firewall show rule name=all | Select-String "Nueva regla"')
    return L.join('\n')
  }, [rules])

  const update = (id: string, patch: Partial<FwRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const allBad = useMemo(() => rules.flatMap((r) => fwWarnings(r).filter((w) => w.tone === 'bad').map((w) => ({ ...w, rule: r.name }))), [rules])

  return (
    <div>
      <ToolHeader icon={ShieldCheck} title="Firewall Windows" desc="Genera reglas netsh advfirewall con mínimo privilegio: presets seguros, detección de puertos de administración abiertos y script listo para PowerShell" />

      <InfoBanner>
        <b>El firewall de Windows es deny-by-default entrante</b> pero muchos instaladores abren agujeros sin avisar. Esta tool marca en rojo las combinaciones típicas de incidente: RDP/SMB abiertos a "any", allow en todos los perfiles, reglas sin programa fijado. Haz <span className="font-mono">netsh advfirewall export</span> antes de tocar nada.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">reglas ({rules.length})</h3>
          <div className="space-y-3">
            {rules.map((r, i) => {
              const warns = fwWarnings(r)
              return (
                <div key={r.id} className="rounded-xl border border-edge p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-grey">#{i + 1}</span>
                    <TextInput value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="min-w-40 flex-1 font-mono" />
                    <Badge tone={r.action === 'allow' ? 'ok' : 'bad'}>{r.action} {r.dir === 'in' ? '→ in' : '→ out'}</Badge>
                    {warns.some((w) => w.tone === 'bad') && <Badge tone="bad">⚠ revisar</Badge>}
                    <Button variant="danger" className="px-2 py-1" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}><Trash2 size={13} /></Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="acción">
                      <Select value={r.action} onChange={(e) => update(r.id, { action: e.target.value as FwRule['action'] })} options={[{ value: 'allow', label: 'allow' }, { value: 'block', label: 'block' }]} />
                    </Field>
                    <Field label="dirección">
                      <Select value={r.dir} onChange={(e) => update(r.id, { dir: e.target.value as FwRule['dir'] })} options={[{ value: 'in', label: 'entrante (in)' }, { value: 'out', label: 'saliente (out)' }]} />
                    </Field>
                    <Field label="protocolo">
                      <Select value={r.proto} onChange={(e) => update(r.id, { proto: e.target.value as FwRule['proto'] })} options={['tcp', 'udp', 'any', 'icmpv4', 'icmpv6'].map((p) => ({ value: p, label: p }))} />
                    </Field>
                    <Field label="puertos locales" hint="80, 5000-5010, 80,443 o vacío">
                      <TextInput value={r.ports} onChange={(e) => update(r.id, { ports: e.target.value })} className="font-mono" />
                    </Field>
                    <Field label="programa" hint="vacío = cualquiera">
                      <TextInput value={r.program} onChange={(e) => update(r.id, { program: e.target.value })} placeholder="C:\\Apps\\app.exe" className="font-mono" />
                    </Field>
                    <Field label="IP remota" hint="vacío, CIDR o localsubnet">
                      <TextInput value={r.remoteip} onChange={(e) => update(r.id, { remoteip: e.target.value })} placeholder="localsubnet / 10.0.0.5" className="font-mono" />
                    </Field>
                    <Field label="perfil">
                      <Select value={r.profile} onChange={(e) => update(r.id, { profile: e.target.value as FwRule['profile'] })} options={['domain', 'private', 'public', 'any'].map((p) => ({ value: p, label: p }))} />
                    </Field>
                  </div>
                  <div className="mt-2 space-y-1">
                    {warns.map((w, j) => (
                      <p key={j} className={`font-mono text-[10px] ${w.tone === 'bad' ? 'text-bad' : w.tone === 'warn' ? 'text-warn' : 'text-ok'}`}>{w.tone === 'bad' ? '⚠' : 'ℹ'} {w.text}</p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <Button variant="ghost" className="mt-3 gap-1 px-2 py-1 text-xs" onClick={() => setRules((rs) => [...rs, blank()])}><Plus size={12} /> nueva regla</Button>
        </div>
      </Reveal>

      {allBad.length > 0 && (
        <div className="card mb-4 border-bad/40 bg-bad/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-bad">⚠ reglas peligrosas detectadas</p>
          {allBad.map((w, i) => <p key={i} className="mt-1 font-mono text-[12px] text-ink/90">— <b>{w.rule}</b>: {w.text}</p>)}
        </div>
      )}

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">script PowerShell</h3>
          <CopyBlock text={script} maxH="420" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">hardening base del firewall</h3>
          <div className="space-y-3">
            {FW_HARDENING_SNIPPETS.map((s) => (
              <div key={s.title} className="rounded-xl border border-edge p-3">
                <p className="font-mono text-[12px] text-ink">{s.title}</p>
                <code className="mt-1 block break-all font-mono text-[11px] text-acento">{s.cmd}</code>
                <p className="mt-1 font-mono text-[10px] text-grey">{s.desc}</p>
              </div>
            ))}
          </div>
          <h4 className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-grey">verificación</h4>
          <div className="space-y-1.5">
            {FW_VERIFY.map(([cmd, what]) => (
              <div key={cmd} className="flex flex-wrap items-baseline gap-2">
                <code className="font-mono text-[11px] text-acento">{cmd}</code>
                <span className="font-mono text-[10px] text-grey">{what}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
