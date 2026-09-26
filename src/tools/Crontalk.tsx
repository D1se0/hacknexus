import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Reveal, InfoBanner } from '../components/ui'
import { explainCron, cronToOnCalendar, CRON_PRESETS, CRON_NOTES, CRON_FAQ } from '../lib/crontalk'

export default function Crontalk() {
  const [expr, setExpr] = useState('*/15 * * * *')

  const r = useMemo(() => explainCron(expr), [expr])
  const onCalendar = useMemo(() => cronToOnCalendar(expr), [expr])

  return (
    <>
      <ToolHeader icon={CalendarClock} title="Cron Translator" desc="Escribe una expresión cron y entiende EXACTAMENTE cuándo corre: explicación en cristiano, trampas clásicas (dom+dow, horarios de verano, PATH mínimo) y equivalente systemd OnCalendar" />

      <InfoBanner>
        <b>¿Por qué otra herramienta de cron?</b> Las demás traducen a inglés; esta explica en español, señala los patrones
        sospechosos (cada minuto = malware persistente típico) y te da la conversión a systemd timers, que es lo que
        deberías usar en 2026.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Field label="Expresión cron (5 campos: min hora día-mes mes día-semana)" hint="o @daily / @reboot">
            <TextInput value={expr} onChange={(e) => setExpr(e.target.value)} className="font-mono" />
          </Field>

          <div className={`rounded-lg border px-4 py-3 ${r.ok ? 'border-acento/40 bg-acento/5' : 'border-bad/40 bg-bad/5'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-bold text-ink">{expr}</div>
                <p className={`mt-1 text-sm ${r.ok ? 'text-ok' : 'text-bad'}`}>{r.human}</p>
              </div>
              {r.ok && onCalendar && <CopyBtn text={onCalendar} label="Copiar OnCalendar" />}
            </div>
            {r.ok && onCalendar && (
              <div className="mt-2 border-t border-edge pt-2 font-mono text-xs text-info">
                systemd OnCalendar: <span className="text-ink">{onCalendar}</span>
              </div>
            )}
            {r.notes.map((n) => (
              <p key={n} className="mt-2 rounded border border-warn/30 bg-warn/5 px-2 py-1 text-[11px] text-warn">⚠ {n}</p>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {CRON_PRESETS.map((p) => (
              <button
                key={p.expr + p.label}
                onClick={() => setExpr(p.expr)}
                className="rounded border border-edge px-3 py-2 text-left transition-colors hover:border-acento/50"
              >
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-acento">{p.expr}</code>
                  <span className="text-xs text-ink">{p.label}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-grey/70">{p.when}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded border border-edge bg-black/30 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Referencia rápida de campos</h4>
            <div className="space-y-1 font-mono text-[11px] text-grey">
              <div><span className="text-ink">* </span> cualquier valor</div>
              <div><span className="text-ink">*/n</span> cada n unidades</div>
              <div><span className="text-ink">a-b</span> rango</div>
              <div><span className="text-ink">a,b</span> lista</div>
              <div><span className="text-ink">a-b/n</span> rango con paso</div>
            </div>
          </div>

          <div className="rounded border border-edge bg-black/30 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Notas de campo</h4>
            <ul className="space-y-1.5 text-[11px] text-grey">
              {CRON_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>

          <div className="rounded border border-edge bg-black/30 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">FAQ</h4>
            <ul className="space-y-2 text-[11px]">
              {CRON_FAQ.map(([q, a]) => (
                <li key={q}>
                  <span className="font-mono text-warn">"{q}"</span>
                  <p className="text-grey">{a}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <CopyBlock text={'# mini-referencia\n# ┌───────── min (0-59)\n# │ ┌─────── hora (0-23)\n# │ │ ┌───── día del mes (1-31)\n# │ │ │ ┌─── mes (1-12)\n# │ │ │ │ ┌─ día de la semana (0-6, 0=domingo)\n# * * * * * comando'} label="anatomía de una expresión cron" maxH="12rem" />
    </>
  )
}
