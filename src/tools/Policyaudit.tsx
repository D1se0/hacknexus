import { useMemo, useState } from 'react'
import { ClipboardList, ShieldCheck, FileTerminal, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { ToolHeader, Field, TextInput, Select, Button, Badge, Toggle, CopyBlock, InfoBanner, Reveal } from '../components/ui'
import { auditPolicy, type PolicyInput } from '../lib/passforge'

const PRESETS: { id: string; label: string; input: Partial<PolicyInput> }[] = [
  {
    id: 'legacy', label: 'Corporativo clásico 2003',
    input: { minLength: 8, minClasses: 4, requireUpper: true, requireLower: true, requireDigit: true, requireSymbol: true, maxLength: 14, maxAgeDays: 30, history: 24, lockoutAttempts: 0, lockoutMinutes: 0, blacklist: false, mfa: false },
  },
  {
    id: 'nist', label: 'NIST 800-63B moderno',
    input: { minLength: 12, minClasses: 0, requireUpper: false, requireLower: false, requireDigit: false, requireSymbol: false, maxLength: 0, maxAgeDays: 0, history: 10, lockoutAttempts: 8, lockoutMinutes: 15, blacklist: true, mfa: true },
  },
  {
    id: 'highsec', label: 'Alto secreto / defensa',
    input: { minLength: 16, minClasses: 3, requireUpper: true, requireLower: true, requireDigit: true, requireSymbol: false, maxLength: 0, maxAgeDays: 180, history: 24, lockoutAttempts: 5, lockoutMinutes: 30, blacklist: true, mfa: true },
  },
]

const SEV_META = {
  critical: { icon: XCircle, color: 'text-bad', bg: 'border-bad/40 bg-bad/10' },
  warn: { icon: AlertTriangle, color: 'text-warn', bg: 'border-warn/40 bg-warn/10' },
  info: { icon: Info, color: 'text-info', bg: 'border-info/40 bg-info/10' },
  ok: { icon: CheckCircle2, color: 'text-ok', bg: 'border-ok/30 bg-ok/5' },
} as const

export default function Policyaudit() {
  const [p, setP] = useState<PolicyInput>({
    minLength: 12, requireUpper: false, requireLower: false, requireDigit: false, requireSymbol: false,
    minClasses: 0, maxLength: 0, maxAgeDays: 0, history: 24, lockoutAttempts: 8, lockoutMinutes: 15,
    blacklist: true, mfa: true,
  })
  const verdict = useMemo(() => auditPolicy(p), [p])
  const set = (patch: Partial<PolicyInput>) => setP((prev) => ({ ...prev, ...patch }))

  const gradeColor = verdict.score >= 75 ? 'text-ok' : verdict.score >= 60 ? 'text-warn' : 'text-bad'

  return (
    <div>
      <ToolHeader icon={ClipboardList} title="Password Policy Auditor" badge="NIST" desc="Audita una política de contraseñas contra NIST 800-63B y genera las configuraciones Linux/Windows coherentes para arreglarla." />

      <InfoBanner>
        El debate ya está cerrado: <b>longitud &gt; complejidad</b>, blacklist de filtraciones y bloqueo progresivo. Las políticas de complejidad+rotación de los 2000 producen <code className="font-mono">Verano2024!</code> — y NIST 800-63B lo desaconseja con datos. Pega los valores de tu organización y mira qué dice el informe.
      </InfoBanner>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setP({ ...p, ...preset.input })}
            className="rounded-md border border-edge bg-black/30 px-2.5 py-1 font-mono text-[11px] text-grey transition-colors hover:border-acento/50 hover:text-acento"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* formulario */}
        <Reveal>
          <div className="card space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Longitud mínima">
                <TextInput type="number" min={4} max={64} value={p.minLength} onChange={(e) => set({ minLength: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Longitud máxima (0=∞)">
                <TextInput type="number" min={0} max={256} value={p.maxLength} onChange={(e) => set({ maxLength: Number(e.target.value) || 0 })} />
              </Field>
            </div>

            <Field label="Clases mínimas exigidas" hint="0 = solo longitud">
              <Select
                options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 0 ? '0 — sin exigencia (NIST)' : `${n} clases distintas` }))}
                value={String(p.minClasses)}
                onChange={(e) => set({ minClasses: Number(e.target.value) })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Caduca en días (0=nunca)">
                <TextInput type="number" min={0} max={9999} value={p.maxAgeDays} onChange={(e) => set({ maxAgeDays: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Historial">
                <TextInput type="number" min={0} max={50} value={p.history} onChange={(e) => set({ history: Number(e.target.value) || 0 })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bloqueo tras (0=nunca)">
                <TextInput type="number" min={0} max={100} value={p.lockoutAttempts} onChange={(e) => set({ lockoutAttempts: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Bloqueo dura (min)">
                <TextInput type="number" min={0} max={1440} value={p.lockoutMinutes} onChange={(e) => set({ lockoutMinutes: Number(e.target.value) || 0 })} />
              </Field>
            </div>

            <div className="space-y-3 border-t border-edge/60 pt-4">
              <Toggle checked={p.blacklist} onChange={(v) => set({ blacklist: v })} label="Blacklist de filtraciones (HIBP k-anonymity)" />
              <Toggle checked={p.mfa} onChange={(v) => set({ mfa: v })} label="MFA desplegado en la organización" />
            </div>
          </div>
        </Reveal>

        {/* veredicto */}
        <div className="space-y-4">
          <Reveal delay={0.05}>
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey"><ShieldCheck size={14} /> Veredicto</h2>
                <Badge tone={verdict.nistAligned ? 'ok' : 'bad'}>{verdict.nistAligned ? 'alineado con NIST 800-63B' : 'hallazgos críticos'}</Badge>
              </div>
              <div className="mt-3 flex items-end gap-4">
                <span className={`font-mono text-5xl font-extrabold ${gradeColor}`}>{verdict.score}</span>
                <span className={`font-mono text-2xl font-bold ${gradeColor}`}>{verdict.grade}</span>
                <span className="pb-2 text-xs text-grey">sobre 100 · la nota que pondría un auditor NIST</span>
                  </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${verdict.score}%`, backgroundColor: verdict.score >= 75 ? 'var(--ok)' : verdict.score >= 60 ? 'var(--warn)' : 'var(--bad)' }} />
              </div>
            </div>
          </Reveal>

          {/* hallazgos */}
          <Reveal delay={0.1}>
            <div className="space-y-2">
              {verdict.findings.map((f, i) => {
                const meta = SEV_META[f.severity]
                const Icon = meta.icon
                return (
                  <div key={i} className={`rounded-lg border px-4 py-3 ${meta.bg}`}>
                    <div className={`flex items-center gap-2 font-mono text-[12px] font-bold ${meta.color}`}>
                      <Icon size={14} /> {f.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink/80">{f.detail}</p>
                    {f.fix && <p className="mt-1 font-mono text-[11px] text-grey">→ {f.fix}</p>}
                  </div>
                )
              })}
            </div>
          </Reveal>

          {/* configs generadas */}
          <Reveal delay={0.15}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-grey"><FileTerminal size={13} /> Linux — pwquality.conf</h3>
                <CopyBlock text={verdict.linuxPam} label="pwquality.conf" maxH="max-h-64" />
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-grey"><FileTerminal size={13} /> Windows — PSO PowerShell</h3>
                <CopyBlock text={verdict.windowsGpo} label="fine-grained policy" maxH="max-h-64" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
