import { useMemo, useState } from 'react'
import { Terminal } from 'lucide-react'
import { ToolHeader, Badge, Reveal, TextInput, InfoBanner } from '../components/ui'
import { ADMIN_GROUPS, ADMIN_CMDS, ADMIN_NOTES, ADMIN_TIPS_LAB, type AdminGroup } from '../lib/admincmds'

export default function Admincmds() {
  const [group, setGroup] = useState<AdminGroup>('usuarios')
  const [q, setQ] = useState('')

  const cmds = useMemo(() => {
    const base = ADMIN_CMDS[group]
    if (!q.trim()) return base
    const qn = q.toLowerCase()
    // si hay búsqueda, busca en TODOS los grupos
    return Object.values(ADMIN_CMDS).flat().filter((c) => (c.cmd + c.why + (c.trap ?? '')).toLowerCase().includes(qn))
  }, [group, q])

  return (
    <>
      <ToolHeader icon={Terminal} title="Linux Admin Commander" desc="Formador y recetario de administración de sistemas: 56 comandos organizados por dominio (usuarios, paquetes, servicios, logs, red, cron, procesos, kernel) con el por qué de cada uno y la trampa que lo rompe" />

      <InfoBanner>
        Cada comando explica <b>qué hace y qué rompe si te equivocas</b>. Los marcados en rojo son los que en un incidente
        o auditoría miras PRIMERO (y los que un atacante toca primero también).
      </InfoBanner>

      <div className="mb-3">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar en todos los grupos… (ej: inode, bpf, journalctl, suid)" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ADMIN_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => { setGroup(g.id); setQ('') }}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${group === g.id && !q ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-acento/40 hover:text-ink'}`}
          >
            <span className="mr-1">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {cmds.map((c, i) => (
          <Reveal key={c.cmd} delay={i * 0.015}>
            <div className={`rounded-lg border px-4 py-3 ${c.danger ? 'border-bad/40 bg-bad/5' : 'border-edge'}`}>
              <div className="flex items-start justify-between gap-3">
                <code className="block break-all font-mono text-[12.5px] text-ink">{c.cmd}</code>
                {c.danger && <Badge tone="bad">auditoría</Badge>}
              </div>
              <p className="mt-1.5 text-xs text-grey">{c.why}</p>
              {c.trap && (
                <p className="mt-1 rounded border border-warn/30 bg-warn/5 px-2 py-1 text-[11px] text-warn">
                  ⚠ trampa: {c.trap}
                </p>
              )}
            </div>
          </Reveal>
        ))}
        {cmds.length === 0 && <div className="py-8 text-center font-mono text-xs text-grey">sin resultados para "{q}"</div>}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-edge bg-black/30 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Filosofía</h4>
          <ul className="space-y-1.5 text-xs text-grey">
            {ADMIN_NOTES.map((n) => <li key={n}>• {n}</li>)}
          </ul>
        </div>
        <div className="rounded border border-edge bg-black/30 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Practica sin miedo</h4>
          <ul className="space-y-1.5 text-xs text-grey">
            {ADMIN_TIPS_LAB.map(([t, d]) => (
              <li key={t}><span className="font-mono text-ink">{t}:</span> {d}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
