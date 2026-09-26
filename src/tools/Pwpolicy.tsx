import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { PW_PRESETS, buildPwPolicyConf, buildPamConfig, buildWinPolicy, PW_POLICY_NOTES, type PwPolicy } from '../lib/pwpolicy'

export default function Pwpolicy() {
  const [policy, setPolicy] = useState<PwPolicy>(PW_PRESETS[0].policy)
  const toast = useToast()
  const patch = (p: Partial<PwPolicy>) => setPolicy((x) => ({ ...x, ...p }))
  const pamConf = useMemo(() => buildPamConfig(policy), [policy])
  const winConf = useMemo(() => buildWinPolicy(policy), [policy])
  const summary = useMemo(() => buildPwPolicyConf(policy), [policy])

  const toggle = (k: 'requireUpper' | 'requireLower' | 'requireDigit' | 'requireSpecial' | 'dictionaryCheck' | 'passphraseEncouraged') =>
    patch({ [k]: !policy[k] } as Partial<PwPolicy>)

  return (
    <div>
      <ToolHeader icon={ShieldCheck} title="Password Policy Builder" desc="Políticas de contraseñas coherentes entre Linux y Windows basadas en NIST 800-63B: longitud sobre complejidad, sin rotación suicida, con bloqueo y verificación de filtraciones" />

      <InfoBanner>
        <b>NIST 800-63B cambió las reglas del juego:</b> la complejidad forzada y la rotación a 90 días producen P@ssw0rd! y Pataton2 — peores que una passphrase larga sin cambios. Esta tool genera la config real para <span className="font-mono">pwquality.conf</span>/PAM y para <span className="font-mono">net accounts</span>/GPO con el enfoque moderno.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap gap-2 p-4">
          {PW_PRESETS.map((p) => (
            <Button key={p.id} variant="ghost" onClick={() => { setPolicy(p.policy); toast(p.label) }} className="max-w-72 px-3 py-2 text-xs" title={p.desc}>
              {p.label}
            </Button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">parámetros</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="longitud mínima" hint="NIST: ≥ 8, recomendado 12-16">
              <TextInput type="number" value={String(policy.minLength)} onChange={(e) => patch({ minLength: Number(e.target.value) || 8 })} className="font-mono" />
            </Field>
            <Field label="expiración (días)" hint="0 = sin expiración (NIST)">
              <TextInput type="number" value={String(policy.maxAgeDays)} onChange={(e) => patch({ maxAgeDays: Number(e.target.value) || 0 })} className="font-mono" />
            </Field>
            <Field label="historial de claves">
              <TextInput type="number" value={String(policy.history)} onChange={(e) => patch({ history: Number(e.target.value) || 0 })} className="font-mono" />
            </Field>
            <Field label="bloqueo tras N intentos">
              <TextInput type="number" value={String(policy.lockoutThreshold)} onChange={(e) => patch({ lockoutThreshold: Number(e.target.value) || 5 })} className="font-mono" />
            </Field>
            <Field label="duración del bloqueo (min)">
              <TextInput type="number" value={String(policy.lockoutMinutes)} onChange={(e) => patch({ lockoutMinutes: Number(e.target.value) || 15 })} className="font-mono" />
            </Field>
            <Field label="edad mínima (días)">
              <TextInput type="number" value={String(policy.minAgeDays)} onChange={(e) => patch({ minAgeDays: Number(e.target.value) || 0 })} className="font-mono" />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ['requireUpper', 'mayúsculas'],
                ['requireLower', 'minúsculas'],
                ['requireDigit', 'dígitos'],
                ['requireSpecial', 'símbolos'],
                ['dictionaryCheck', 'anti-diccionario'],
                ['passphraseEncouraged', 'passphrases'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} onClick={() => toggle(k)} className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] ${policy[k] ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-edge bg-black/30 p-4">
            <p className="whitespace-pre-line font-mono text-[11.5px] leading-relaxed text-ink/90">{summary}</p>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">configuración Linux (PAM + login.defs)</h3>
          <CopyBlock text={pamConf} maxH="340" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">configuración Windows (net accounts + GPO)</h3>
          <CopyBlock text={winConf} maxH="300" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">por qué estas reglas</h3>
          <div className="space-y-2">
            {PW_POLICY_NOTES.map(([t, d]) => (
              <details key={t} className="group rounded-xl border border-edge p-3">
                <summary className="cursor-pointer font-mono text-[12px] text-ink group-open:text-acento">{t}</summary>
                <p className="mt-1.5 pl-2 font-mono text-[11px] leading-relaxed text-grey">{d}</p>
              </details>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="ok">longitud &gt; complejidad</Badge>
            <Badge tone="info">sin rotación forzada</Badge>
            <Badge tone="warn">check filtraciones al crear</Badge>
            <Badge tone="accent">MFA &gt; todo esto</Badge>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
