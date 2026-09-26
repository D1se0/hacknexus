import { useMemo, useState } from 'react'
import { Gauge, Check, X } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { SYSCTL_CATALOG, SYSCTL_PROFILES, buildSysctlConf } from '../lib/sysctl'

export default function Sysctlgen() {
  const [active, setActive] = useState<string[]>(() => SYSCTL_CATALOG.filter((i) => i.tone === 'ok').map((i) => i.key))
  const [extra, setExtra] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const toast = useToast()

  const toggle = (k: string) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]))
  const applyProfile = (id: string) => {
    const p = SYSCTL_PROFILES.find((x) => x.id === id)
    if (p) {
      setActive([...p.keys])
      toast(`perfil "${p.label}" aplicado (${p.keys.length} claves)`)
    }
  }

  const conf = useMemo(() => buildSysctlConf(active, extra.filter((e) => e.key.trim() && e.value.trim())), [active, extra])

  return (
    <div>
      <ToolHeader icon={Gauge} title="Sysctl Hardening" desc="Configura el kernel Linux en frío: catálogo explicado de claves net/* y kernel/*, perfiles por tipo de máquina y conf listo para /etc/sysctl.d" />

      <InfoBanner>
        <b>sysctl es la caja de interruptores del kernel.</b> Las claves correctas cierran ataques clásicos: SYN flood, ARP spoofing, exploits de ptrace, BPF no privilegiado, fugas de punteros del kernel. El perfil <b>máximo endurecimiento</b> puede romper flatpaks/sandboxes — pruébalo antes en staging. Aplica con <span className="font-mono">sudo sysctl --system</span>.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap gap-2 p-4">
          {SYSCTL_PROFILES.map((p) => (
            <Button key={p.id} variant="ghost" onClick={() => applyProfile(p.id)} className="gap-2 px-3 py-2 text-xs" title={p.desc}>
              {p.label}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setActive([])} className="px-3 py-2 text-xs">limpiar</Button>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">catálogo ({active.length}/{SYSCTL_CATALOG.length} activos)</h3>
          <div className="space-y-1.5">
            {SYSCTL_CATALOG.map((i) => {
              const on = active.includes(i.key)
              return (
                <button key={i.key} onClick={() => toggle(i.key)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${on ? 'border-acento/40 bg-acento/5' : 'border-edge hover:border-grey/40'}`}>
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-acento bg-acento/20 text-acento' : 'border-grey/40'}`}>
                    {on && <Check size={11} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-[12px] text-ink">{i.key}</code>
                      <Badge tone={i.tone}>{i.value}</Badge>
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] leading-relaxed text-grey">{i.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">claves personalizadas (fuera del catálogo)</h3>
          <div className="space-y-2">
            {extra.map((e, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <TextInput value={e.key} onChange={(ev) => setExtra((xs) => xs.map((x, j) => (j === i ? { ...x, key: ev.target.value } : x)))} placeholder="vm.dirty_ratio" className="min-w-40 flex-1 font-mono" />
                <TextInput value={e.value} onChange={(ev) => setExtra((xs) => xs.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))} placeholder="15" className="w-28 font-mono" />
                <Button variant="ghost" className="px-2 py-1" onClick={() => setExtra((xs) => xs.filter((_, j) => j !== i))}><X size={13} /></Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-2 gap-1 px-2 py-1 text-xs" onClick={() => setExtra((xs) => [...xs, { key: '', value: '' }])}>+ añadir clave</Button>
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey">
            /etc/sysctl.d/99-hacknexus.conf
            <Field label=""><span /></Field>
          </h3>
          <CopyBlock text={conf} maxH="340" />
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] text-grey/70">
            <span>aplicar: <span className="text-info">sudo sysctl --system</span></span>
            <span>· verificar: <span className="text-info">sysctl -a 2&gt;/dev/null | grep accept_redirects</span></span>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
