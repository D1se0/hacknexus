import { useMemo, useState } from 'react'
import { FileWarning } from 'lucide-react'
import { ToolHeader, Badge, Reveal, TextInput, CopyBlock } from '../components/ui'
import { WIN_EVENTS, EVENT_CATEGORIES, searchEvents, type WinEvent } from '../lib/winevents'

const CAT_TONE: Record<WinEvent['category'], 'ok' | 'warn' | 'bad' | 'info' | 'accent' | 'neutral'> = {
  logon: 'info',
  account: 'accent',
  priv: 'warn',
  policy: 'warn',
  'audit-clear': 'bad',
  other: 'neutral',
}

const catLabel = (c: WinEvent['category']): string => EVENT_CATEGORIES.find((x) => x.key === c)?.label ?? c

export default function Winlog() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<WinEvent['category'] | 'all'>('all')

  const list = useMemo(() => {
    const base = searchEvents(query)
    return cat === 'all' ? base : base.filter((e) => e.category === cat)
  }, [query, cat])

  const powershell = `# Detectar fuerza bruta (4625) de las últimas 24h, top IPs:
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddDays(-1)} |
  ForEach-Object { ($_.Properties[19].Value) } |
  Group-Object | Sort-Object Count -Descending | Select-Object -First 10 Count,Name

# Ver todos los 4624 con Logon Type 10 (RDP):
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} |
  Where-Object { $_.Properties[8].Value -eq 10 } | Select-Object -First 10 TimeCreated,Message

# Alertar si alguien borró el log de Security (1102):
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102} -MaxEvents 5`

  return (
    <div>
      <ToolHeader icon={FileWarning} title="Windows Event IDs" desc="Qué significa cada evento del log Security/System y cómo convertirlo en una detección (blue team) o en una pista (forense)" />

      <Reveal>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="buscar ID (4625), evento (kerberos) o técnica (kerberoast)…" className="min-w-56 flex-1" />
          <div className="flex flex-wrap gap-1.5">
            {EVENT_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-all ${cat === c.key ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((e) => (
          <Reveal key={`${e.id}-${e.name}`}>
            <div className="card h-full p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-acento/40 bg-acento/10 px-2.5 py-1 font-mono text-lg font-extrabold text-acento">{e.id}</span>
                <span className="font-mono text-sm font-bold text-white">{e.name}</span>
                <Badge tone={CAT_TONE[e.category]} className="ml-auto">{catLabel(e.category)}</Badge>
              </div>
              <div className="space-y-2 font-mono text-[11.5px] leading-relaxed">
                <p className="break-words text-ink/85"><span className="text-info">◈ ataque:</span> {e.attack}</p>
                <p className="break-words text-ink/85"><span className="text-ok">◈ detección:</span> {e.detect}</p>
              </div>
              <p className="mt-2 font-mono text-[10px] text-grey/60">log: {e.log}</p>
            </div>
          </Reveal>
        ))}
        {list.length === 0 && (
          <Reveal><div className="card p-8 text-center font-mono text-sm text-grey">sin resultados para “{query}” — prueba “4624”, “kerberos” o “borrado”</div></Reveal>
        )}
      </div>

      <Reveal>
        <div className="mt-6"><CopyBlock text={powershell} label="queries PowerShell de detección" maxH="max-h-96" /></div>
      </Reveal>

      <Reveal>
        <p className="mt-6 font-mono text-[10px] leading-relaxed text-grey/60">
          💡 En el informe: cita IDs exactos y criterio de alerta, no frases vagas ("revisar logins"). Los 1102 (log borrado) y 4719 (política de auditoría cambiada) deberían ser alertas críticas SIEMPRE: nadie los genera de forma legítima sin cambio de cambio planificado.
        </p>
      </Reveal>
    </div>
  )
}
