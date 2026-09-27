import { useMemo, useState } from 'react'
import { AlarmClock, ShieldAlert, Trash2, Search, FileWarning } from 'lucide-react'
import { ToolHeader, Field, TextInput, Select, Button, Badge, Reveal, CopyBlock, InfoBanner } from '../components/ui'
import { buildCronApt, LOCATION_META, SCHEDULE_PRESETS, type CronAptConfig } from '../lib/cronapt'

const TABS = [
  { id: 'cron', label: '⏰ la tarea' },
  { id: 'install', label: '📥 instalación' },
  { id: 'rollback', label: '🧹 rollback' },
  { id: 'sigma', label: '🛡️ regla Sigma' },
  { id: 'yara', label: '🧬 regla YARA' },
  { id: 'hunting', label: '🔎 hunting' },
] as const

export default function CronApt() {
  const [cfg, setCfg] = useState<CronAptConfig>({
    schedule: '*/5 * * * *',
    location: 'crontab',
    taskName: 'sys-maint',
    user: 'root',
    c2: '10.10.14.8:4444',
    payload: 'marker',
  })
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('cron')

  const result = useMemo(() => buildCronApt(cfg), [cfg])
  const set = <K extends keyof CronAptConfig>(k: K, v: CronAptConfig[K]) => setCfg((c) => ({ ...c, [k]: v }))

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={AlarmClock}
        title="Cron/AT Persistence Lab"
        desc="Simulador de persistencia T1053 para TU laboratorio: genera la tarea programada, su instalación y rollback, y las detecciones que la cazan (Sigma, YARA, hunting) — entender el ataque para escribir mejor la detección"
        badge="T1053"
      />

      <InfoBanner>
        ⚖ <b>Solo en tu laboratorio:</b> instalar persistencia en equipos de terceros es delito. El payload «marker» es inofensivo a propósito; úsalo para validar tus detecciones antes de pensar en nada más agresivo.
      </InfoBanner>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[340px_1fr]">
        <Reveal>
          <div className="card space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-grey">
              <ShieldAlert size={13} className="text-warn" /> configuración
            </h3>
            <Field label="mecanismo">
              <Select
                value={cfg.location}
                onChange={(e) => set('location', e.target.value as CronAptConfig['location'])}
                options={Object.entries(LOCATION_META).map(([id, m]) => ({ value: id, label: m.label }))}
              />
            </Field>
            <p className="rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-[11px] leading-snug text-info/90">
              {LOCATION_META[cfg.location].why} <b>Detección:</b> {LOCATION_META[cfg.location].detect}
            </p>
            {!cfg.location.includes('systemd') && !cfg.location.includes('at') && (
              <Field label="expresión cron">
                <TextInput value={cfg.schedule} onChange={(e) => set('schedule', e.target.value)} className="py-2 font-mono text-xs" />
              </Field>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SCHEDULE_PRESETS.map((p) => (
                <button key={p.expr} title={p.human} onClick={() => set('schedule', p.expr)} className="rounded-full border border-edge px-2.5 py-1 font-mono text-[10px] text-grey hover:border-acento/50 hover:text-acento">
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="nombre de tarea"><TextInput value={cfg.taskName} onChange={(e) => set('taskName', e.target.value)} className="py-2 text-xs" /></Field>
              <Field label="usuario"><TextInput value={cfg.user} onChange={(e) => set('user', e.target.value)} className="py-2 text-xs" /></Field>
            </div>
            <Field label="C2 de laboratorio (IP:puerto)" hint="tu listener">
              <TextInput value={cfg.c2} onChange={(e) => set('c2', e.target.value)} className="py-2 font-mono text-xs" />
            </Field>
            <Field label="payload">
              <Select
                value={cfg.payload}
                onChange={(e) => set('payload', e.target.value as CronAptConfig['payload'])}
                options={[
                  { value: 'marker', label: 'marker — inofensivo (recomendado)' },
                  { value: 'shell', label: 'shell — conexión a TU listener (solo lab)' },
                  { value: 'downloader', label: 'downloader — stage-2 de TU server (solo lab)' },
                ]}
              />
            </Field>
            <div className="rounded-lg border border-bad/25 bg-bad/5 px-3 py-2 font-mono text-[10.5px] leading-snug text-bad/90">
              El texto del payload es didáctico y contiene marcadores obvios (LAB). Nunca ejecutes nada de esto fuera de una máquina propia.
            </div>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all ${tab === t.id ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:border-acento/40'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'cron' && (
            <Reveal>
              <div className="card p-5">
                <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><AlarmClock size={14} className="text-acento" /> la tarea programada</h3>
                <CopyBlock text={result.cronLine} label={cfg.location === 'at' ? 'comando at' : cfg.location === 'systemd-timer' ? 'OnCalendar' : 'línea de crontab'} />
                <p className="mt-3 text-[12px] leading-relaxed text-grey">
                  Fichero del payload: <code className="font-mono text-acento">{result.payloadFile}</code> — fuera de los paths que los analistas revisan por rutina, ese es el juego.
                </p>
              </div>
            </Reveal>
          )}
          {tab === 'install' && (
            <Reveal>
              <CopyBlock text={result.installScript} label="instalación (lab propio)" maxH="max-h-[480px]" />
            </Reveal>
          )}
          {tab === 'rollback' && (
            <Reveal>
              <div className="card p-5">
                <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Trash2 size={14} className="text-ok" /> limpieza completa</h3>
                <p className="mb-3 text-[12px] text-grey">La parte que casi nadie documenta y que SIEMPRE debes dejar en un pentest con persistencia autorizada:</p>
                <CopyBlock text={result.rollback} label="rollback" />
              </div>
            </Reveal>
          )}
          {tab === 'sigma' && (
            <Reveal>
              <CopyBlock text={result.sigma} label="regla Sigma (YAML)" maxH="max-h-[480px]" />
            </Reveal>
          )}
          {tab === 'yara' && (
            <Reveal>
              <CopyBlock text={result.yara} label="regla YARA" maxH="max-h-[480px]" />
            </Reveal>
          )}
          {tab === 'hunting' && (
            <Reveal>
              <div className="card p-5">
                <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Search size={14} className="text-info" /> queries de hunting</h3>
                <div className="space-y-2">
                  {result.hunting.map((h, i) => (
                    <div key={i} className="rounded-lg border border-edge bg-black/30 px-3 py-2 font-mono text-[11px] text-ink">{h}</div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.08}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><FileWarning size={14} className="text-warn" /> notas del analista</h3>
              <ul className="space-y-1.5 text-[12px] leading-relaxed text-grey">
                {result.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <Badge tone={n.startsWith('⚖') ? 'bad' : 'info'} className="mt-0.5 shrink-0">{n.startsWith('⚖') ? '⚖' : '→'}</Badge>
                    <span>{n.replace('⚖ ', '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
