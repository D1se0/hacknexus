import { useMemo, useState } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { Shield, Check, RotateCcw } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { HARDENING, HARDENING_PROFILES, buildHardeningScript, HARDENING_AUDIT, type HGroup, type HTweak } from '../lib/hardening'

const GROUP_ORDER: HGroup[] = ['cuentas', 'uac', 'red', 'defender', 'office', 'powershell', 'auditoría', 'bitlocker']

export default function Winharden() {
  const [level, setLevel] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<string[]>(() => HARDENING.filter((t) => t.level === 1).map((t) => t.id))
  const toast = useToast()

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const applyProfile = (lv: 1 | 2) => {
    setLevel(lv)
    setSelected(HARDENING.filter((t) => t.level <= lv).map((t) => t.id))
    toast(`perfil ${lv === 1 ? 'básico' : 'estricto'} aplicado: ${HARDENING.filter((t) => t.level <= lv).length} tweaks`)
  }

  const script = useMemo(() => buildHardeningScript(level, selected), [level, selected])
  const chosen = HARDENING.filter((t) => selected.includes(t.id))

  const grouped = useMemo(() => {
    const g: Partial<Record<HGroup, HTweak[]>> = {}
    for (const t of HARDENING) (g[t.group] ??= []).push(t)
    return g
  }, [])

  return (
    <div>
      <ToolHeader icon={Shield} title="Windows Hardening" desc="Auditoría y tweaks de endurecimiento con justificación, comando de aplicación, verificación y reversión — al estilo CIS but en cristiano" />
      <SnapshotButtons
        toolId="winharden"
        label="nivel + controles"
        getData={() => ({ level, selected })}
        onLoad={(d) => { if (d.level) setLevel(d.level); if (d.selected) setSelected(d.selected) }}
      />

      <InfoBanner>
        <b>Cada tweak incluye el porqué, cómo verificarlo y cómo revertirlo.</b> El nivel 1 (CIS básico) es seguro en cualquier entorno; el nivel 2 puede romper instaladores sin firma o scripts propios. Crea un punto de restauración (el script lo intenta con <span className="font-mono">Checkpoint-Computer</span>) y aplica por bloques, no todo de golpe.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          {HARDENING_PROFILES.map((p) => (
            <Button key={p.id} variant={level === p.level ? 'primary' : 'ghost'} onClick={() => applyProfile(p.level as 1 | 2)} className="px-3 py-2 text-xs" title={p.desc}>{p.label}</Button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-grey">{selected.length}/{HARDENING.length} seleccionados</span>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          {GROUP_ORDER.map((g) => (
            grouped[g] && (
              <div key={g} className="mb-6 last:mb-0">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">{g} ({grouped[g]!.length})</h3>
                <div className="space-y-2">
                  {grouped[g]!.map((t) => {
                    const on = selected.includes(t.id)
                    return (
                      <div key={t.id} className={`rounded-xl border p-4 transition-colors ${on ? 'border-acento/40 bg-acento/5' : 'border-edge'}`}>
                        <div className="flex flex-wrap items-start gap-3">
                          <button onClick={() => toggle(t.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? 'border-acento bg-acento/20 text-acento' : 'border-grey/40'}`}>
                            {on ? <Check size={12} /> : <span className="sr-only">off</span>}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[12px] text-white">{t.title}</span>
                              <Badge tone={t.level === 1 ? 'ok' : 'warn'}>nivel {t.level}</Badge>
                            </div>
                            <p className="mt-1 font-mono text-[11px] leading-relaxed text-grey"><b className="text-ink">por qué:</b> {t.why}</p>
                            <details className="mt-2">
                              <summary className="cursor-pointer font-mono text-[10px] text-info">comandos / verificar / revertir / riesgo</summary>
                              <div className="mt-2 space-y-2 rounded-lg border border-edge bg-black/30 p-3">
                                <div>
                                  <span className="font-mono text-[10px] uppercase text-grey">aplicar</span>
                                  {t.commands.map((c, i) => <code key={i} className="mt-0.5 block break-all font-mono text-[11px] text-acento">{c}</code>)}
                                </div>
                                <div>
                                  <span className="font-mono text-[10px] uppercase text-grey">verificar</span>
                                  <code className="block break-all font-mono text-[11px] text-info">{t.verify}</code>
                                </div>
                                <div>
                                  <span className="font-mono text-[10px] uppercase text-grey">revertir</span>
                                  <code className="block break-all font-mono text-[11px] text-warn">{t.revert}</code>
                                </div>
                                <p className="font-mono text-[10px] text-grey"><b className="text-ink">riesgo:</b> {t.risk}</p>
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">script de hardening ({chosen.length} tweaks)</h3>
          <CopyBlock text={script} maxH="420" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><RotateCcw size={13} /> audita tu estado actual primero</h3>
          <div className="space-y-2">
            {HARDENING_AUDIT.map(([cmd, what]) => (
              <div key={cmd} className="flex flex-wrap items-baseline gap-2 border-b border-edge/50 pb-2 last:border-0">
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
