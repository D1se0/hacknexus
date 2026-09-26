import { useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, CopyBlock, InfoBanner } from '../components/ui'
import { DAY_LABELS, TASK_PRESETS, buildSchtasks, buildPsTask, taskWarnings, TASK_AUDIT, type TaskDef } from '../lib/wintasks'

export default function Schtasks() {
  const [def, setDef] = useState<TaskDef>({
    name: 'BackupDiario',
    trigger: 'daily',
    time: '03:00',
    days: ['MON', 'WED', 'FRI'],
    action: 'robocopy',
    args: 'C:\\Datos D:\\Backup /MIR /R:2 /W:5',
    runLevel: 'limited',
    hidden: false,
    user: '',
  })

  const patch = (p: Partial<TaskDef>) => setDef((d) => ({ ...d, ...p }))
  const warnings = useMemo(() => taskWarnings(def), [def])
  const schtasksCmd = useMemo(() => buildSchtasks(def), [def])
  const psCmd = useMemo(() => buildPsTask(def), [def])

  const applyPreset = (idx: number) => {
    const p = TASK_PRESETS[idx]
    if (p) setDef((d) => ({ ...d, ...p.def }))
  }

  const toggleDay = (d: string) => setDef((t) => ({ ...t, days: t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d] }))

  return (
    <div>
      <ToolHeader icon={Clock} title="Windows Scheduled Tasks" desc="Crea tareas programadas con schtasks y PowerShell, y aprende a detectar las que usan los atacantes como persistencia (MITRE T1053.005)" />

      <InfoBanner>
        <b>Las tareas programadas son el mecanismo de persistencia favorito</b> (ejecución como SYSTEM, ocultables, con triggers de todo tipo). Esta tool genera la tarea desde tu lado de admin <b>y</b> te enseña los patrones con los que el blue team las caza: PowerShell oculto con -enc, binarios en carpetas escribibles, SYSTEM+Hidden. Si lo que ves en tu organización encaja con los avisos rojos, audítalo.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap gap-2 p-4">
          {TASK_PRESETS.map((p, i) => (
            <Button key={p.label} variant="ghost" onClick={() => applyPreset(i)} className="px-3 py-2 text-xs" title={p.desc}>{p.label}</Button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">definición de la tarea</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="nombre de la tarea (TN)">
              <TextInput value={def.name} onChange={(e) => patch({ name: e.target.value })} className="font-mono" />
            </Field>
            <Field label="disparador">
              <Select value={def.trigger} onChange={(e) => patch({ trigger: e.target.value as TaskDef['trigger'] })} options={[
                { value: 'daily', label: 'diario' }, { value: 'weekly', label: 'semanal' }, { value: 'onstart', label: 'al arrancar' },
                { value: 'onidle', label: 'en reposo' }, { value: 'onlogon', label: 'al iniciar sesión' },
              ]} />
            </Field>
            {(def.trigger === 'daily' || def.trigger === 'weekly') && (
              <Field label="hora (HH:MM)">
                <TextInput value={def.time} onChange={(e) => patch({ time: e.target.value })} placeholder="03:00" className="font-mono" />
              </Field>
            )}
            {def.trigger === 'weekly' && (
              <Field label="días de la semana">
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((d) => (
                    <button key={d.value} onClick={() => toggleDay(d.value)} className={`rounded-lg border px-2 py-1 font-mono text-[11px] ${def.days.includes(d.value) ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <Field label="programa a ejecutar" hint="ruta absoluta recomendada">
              <TextInput value={def.action} onChange={(e) => patch({ action: e.target.value })} className="font-mono" />
            </Field>
            <Field label="argumentos">
              <TextInput value={def.args} onChange={(e) => patch({ args: e.target.value })} className="font-mono" />
            </Field>
            <Field label="ejecutar como">
              <Select value={def.user} onChange={(e) => patch({ user: e.target.value })} options={[
                { value: '', label: 'usuario actual' }, { value: 'SYSTEM', label: 'SYSTEM (con /RL HIGHEST)' },
                { value: 'DOM\\cuenta-servicio', label: 'cuenta de dominio' },
              ]} />
            </Field>
            <Field label="nivel de privilegios">
              <Select value={def.runLevel} onChange={(e) => patch({ runLevel: e.target.value as TaskDef['runLevel'] })} options={[{ value: 'limited', label: 'limited (normal)' }, { value: 'highest', label: 'highest (elevado)' }]} />
            </Field>
            <Field label="ocultar la tarea" hint="aparece en listados solo con flags concretos">
              <button onClick={() => patch({ hidden: !def.hidden })} className={`w-full rounded-xl border px-3 py-2 font-mono text-xs ${def.hidden ? 'border-warn/60 bg-warn/10 text-warn' : 'border-edge text-grey'}`}>
                {def.hidden ? 'oculta (patrón sospechoso)' : 'visible'}
              </button>
            </Field>
          </div>

          <div className="mt-4 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className={`font-mono text-[11px] ${w.tone === 'bad' ? 'text-bad' : w.tone === 'warn' ? 'text-warn' : w.tone === 'ok' ? 'text-ok' : 'text-info'}`}>
                {w.tone === 'bad' ? '⚠' : 'ℹ'} {w.text}
              </p>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">dos formas de crearla</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <CopyBlock text={schtasksCmd} label="CMD · schtasks (clásico)" maxH="240" />
            <CopyBlock text={psCmd} label="PowerShell (moderno)" maxH="240" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-1 font-mono text-[11px] uppercase tracking-widest text-grey">auditoría de persistencia (blue team)</h3>
          <p className="mb-3 font-mono text-[10px] text-grey/70">corre esto en tu parque para cazar tareas de atacantes: las de SYSTEM, las ocultas y las que ejecutan desde carpetas de usuario</p>
          <div className="space-y-2">
            {TASK_AUDIT.map(([cmd, what]) => (
              <div key={cmd} className="flex flex-wrap items-baseline gap-2 border-b border-edge/50 pb-2 last:border-0">
                <code className="font-mono text-[11px] text-acento">{cmd}</code>
                <span className="font-mono text-[10px] text-grey">{what}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="bad">T1053.005: Scheduled Task/Job</Badge>
            <Badge tone="warn">SYSTEM + Hidden = revisar ya</Badge>
            <Badge tone="info">Get-ScheduledTask | ? Hidden -eq $true</Badge>
            <Badge tone="neutral">Event ID 4698: tarea creada</Badge>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
