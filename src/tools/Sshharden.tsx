import { useMemo, useState } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { KeySquare } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, TextInput, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { SSH_OPTIONS, SSH_PROFILES, buildSshdConfig, SSH_VERIFY, type SshGroup } from '../lib/sshharden'

const GROUP_LABELS: Record<SshGroup, string> = { basics: 'básico', auth: 'autenticación', crypto: 'cifrados', limits: 'límites y sesiones', misc: 'miscelánea' }

export default function Sshharden() {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const o of SSH_OPTIONS) init[o.key] = o.value
    return init
  })
  const [profile, setProfile] = useState<string>('paranoico')
  const toast = useToast()

  const applyProfile = (id: string) => {
    const p = SSH_PROFILES.find((x) => x.id === id)
    if (!p) return
    setValues((v) => ({ ...v, ...p.values }))
    setProfile(id)
    toast(`perfil "${p.label}" aplicado`)
  }

  const conf = useMemo(() => buildSshdConfig(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''))), [values])

  const grouped = useMemo(() => {
    const g: Partial<Record<SshGroup, typeof SSH_OPTIONS>> = {}
    for (const o of SSH_OPTIONS) (g[o.groups[0]] ??= []).push(o)
    return g
  }, [])

  const insecure = useMemo(() => {
    const flags: string[] = []
    if (values['PermitRootLogin'] === 'yes') flags.push('root puede loguear por SSH')
    if (values['PasswordAuthentication'] === 'yes') flags.push('contraseñas habilitadas (fuerza bruta viable)')
    if (values['X11Forwarding'] === 'yes') flags.push('X11 forwarding abierto')
    if (values['AllowAgentForwarding'] === 'yes') flags.push('agent forwarding abierto (robo de claves)')
    return flags
  }, [values])

  return (
    <div>
      <ToolHeader icon={KeySquare} title="SSH Hardening" desc="Genera un sshd_config endurecido con explicación directa de cada directiva: solo claves, cifrados AEAD, límites de sesión y sin forwarding innecesario" />
      <SnapshotButtons
        toolId="sshharden"
        label="directivas + perfil"
        getData={() => ({ values, profile })}
        onLoad={(d) => { if (d.values) setValues(d.values); if (d.profile) setProfile(d.profile) }}
      />

      <InfoBanner>
        <b>sshd es la puerta de entrada número uno a servidores Linux.</b> Este editor marca los flags rojos en tiempo real: root login, PasswordAuthentication yes, forwarding abierto. Tras aplicar, ejecuta <span className="font-mono">sshd -t</span> y verifica desde <b>otra terminal</b> antes de cerrar la sesión actual — quedarte fuera es el error #1.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap gap-2 p-4">
          {SSH_PROFILES.map((p) => (
            <Button key={p.id} variant={profile === p.id ? 'primary' : 'ghost'} onClick={() => applyProfile(p.id)} className="px-3 py-2 text-xs" title={p.desc}>
              {p.label}
            </Button>
          ))}
        </div>
      </Reveal>

      {insecure.length > 0 && (
        <div className="card mb-4 border-bad/40 bg-bad/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-bad">⚠ configuración débil detectada</p>
          <ul className="mt-2 space-y-1">
            {insecure.map((f) => <li key={f} className="font-mono text-[12px] text-ink/90">— {f}</li>)}
          </ul>
        </div>
      )}

      <Reveal>
        <div className="card mb-4 p-6">
          {(Object.keys(GROUP_LABELS) as SshGroup[]).map((g) => (
            <div key={g} className="mb-6 last:mb-0">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">{GROUP_LABELS[g]}</h3>
              <div className="space-y-2">
                {(grouped[g] ?? []).map((o) => (
                  <div key={o.key} className="flex flex-wrap items-center gap-3 rounded-xl border border-edge p-3">
                    <div className="min-w-48 flex-1">
                      <code className="font-mono text-[12px] text-ink">{o.key}</code>
                      <p className="font-mono text-[11px] leading-relaxed text-grey">{o.desc}</p>
                    </div>
                    <TextInput value={values[o.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [o.key]: e.target.value }))} placeholder="—" className="w-56 font-mono text-xs" />
                    <Badge tone={o.tone}>{o.tone === 'ok' ? 'recomendado' : o.tone === 'warn' ? 'peligroso abierto' : 'contexto'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">sshd_config resultante</h3>
          <CopyBlock text={conf} maxH="420" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">verificación posterior</h3>
          <div className="space-y-2">
            {SSH_VERIFY.map(([cmd, what]) => (
              <div key={cmd} className="flex flex-wrap items-baseline gap-2 border-b border-edge/50 pb-2 last:border-0">
                <code className="font-mono text-[12px] text-acento">{cmd}</code>
                <span className="font-mono text-[11px] text-grey">{what}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
