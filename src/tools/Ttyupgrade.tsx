import { useState } from 'react'
import { MonitorPlay } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, Reveal, InfoBanner } from '../components/ui'
import { TTY_METHODS, TTY_PRECHECKS, TTY_TROUBLESHOOT, TTY_NOTES, type TtyMethodId } from '../lib/ttyupgrade'

export default function Ttyupgrade() {
  const [active, setActive] = useState<TtyMethodId>('python3')
  const m = TTY_METHODS.find((x) => x.id === active)!

  return (
    <>
      <ToolHeader icon={MonitorPlay} title="TTY Upgrade" desc="De reverse shell tonta a terminal interactiva completa: python pty, script, socat, rlwrap y calibración de stty — con los pasos exactos, el orden correcto y el troubleshooting de siempre" />

      <InfoBanner>
        <b>El método Python (3 comandos) resuelve el 95% de los casos:</b> pty.spawn → Ctrl+Z → stty raw -echo; fg →
        TERM + rows/cols. Los demás métodos son para cuando no hay Python o quieres calidad de socat desde el inicio.
      </InfoBanner>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {TTY_PRECHECKS.map(([q, a]) => (
          <div key={q} className="rounded border border-edge px-3 py-2">
            <div className="font-mono text-[11px] text-warn">{q}</div>
            <code className="mt-0.5 block break-all font-mono text-[11px] text-grey">{a}</code>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TTY_METHODS.map((x) => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${active === x.id ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Reveal key={m.id}>
          <div className="card rounded-xl border border-acento/30 p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{m.label}</h3>
              <Badge tone="ok">{m.quality}</Badge>
              <span className="ml-auto"><CopyBtn text={m.steps.filter((s) => !s.startsWith('#') && s.trim() && !/^\d+\./.test(s.trim()) && !s.startsWith('(') && !s.startsWith('Alternativa')).join('\n')} label="Copiar comandos" /></span>
            </div>
            <p className="mb-1 text-sm text-grey">{m.desc}</p>
            <p className="mb-3 text-xs text-info">cuándo: {m.when}</p>
            <div className="rounded-lg bg-black/60 p-4 font-mono text-[12.5px] leading-6">
              {m.steps.map((s, i) => (
                <div key={i} className={s.match(/^\s*\d+\./) || s.match(/^#/) ? 'text-warn' : s.trim() === '' ? '' : 'text-ok'}>
                  {s.match(/^\s*\d+\./) ? <span className="font-bold">{s}</span> : s.trim() === '' ? <br /> : <span className="whitespace-pre-wrap">{s}</span>}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-grey/70">requiere: {m.requirements}</p>
          </div>
        </Reveal>

        <div className="space-y-3">
          <div className="rounded border border-warn/30 bg-warn/5 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-warn">Troubleshooting</h4>
            <ul className="space-y-2 text-[11px]">
              {TTY_TROUBLESHOOT.map(([q, a]) => (
                <li key={q}><span className="font-mono text-ink">"{q}"</span><p className="text-grey">{a}</p></li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Notas</h4>
            <ul className="space-y-1.5 text-[11px] text-grey">
              {TTY_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
