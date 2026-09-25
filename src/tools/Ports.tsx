import { useMemo, useState } from 'react'
import { Plug } from 'lucide-react'
import { ToolHeader, Badge, Reveal, TextInput } from '../components/ui'
import { PORTS, PORT_GROUPS, searchPorts, type PortEntry } from '../lib/ports'

const GROUP_TONE: Record<PortEntry['group'], 'ok' | 'warn' | 'bad' | 'info' | 'accent' | 'neutral'> = {
  web: 'info',
  remote: 'bad',
  ad: 'accent',
  db: 'warn',
  mail: 'ok',
  files: 'info',
  infra: 'neutral',
  misc: 'neutral',
}

const PROTO_LABEL: Record<PortEntry['proto'], string> = { tcp: 'TCP', udp: 'UDP', 'tcp/udp': 'TCP/UDP' }

export default function Ports() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<PortEntry['group'] | 'all'>('all')

  const list = useMemo(() => {
    const base = searchPorts(query)
    return group === 'all' ? base : base.filter((p) => p.group === group)
  }, [query, group])

  return (
    <div>
      <ToolHeader icon={Plug} title="Ports & Services" desc="Referencia rápida de puertos: qué corren, por qué importan en un pentest y qué tool de HackNexus usar contra cada uno" />

      <Reveal>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="buscar puerto (443), servicio (smb) o técnica (kerberoast)…" className="min-w-56 flex-1" />
          <div className="flex flex-wrap gap-1.5">
            {PORT_GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGroup(g.key)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition-all ${group === g.key ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] font-mono text-xs">
              <thead>
                <tr className="border-b border-edge text-left text-grey/60">
                  <th className="px-4 py-3">puerto</th>
                  <th className="px-4 py-3">servicio</th>
                  <th className="px-4 py-3">qué es</th>
                  <th className="px-4 py-3">ángulo de pentest</th>
                  <th className="px-4 py-3">grupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {list.map((p) => (
                  <tr key={`${p.port}-${p.proto}`} className="align-top transition-colors hover:bg-acento/5">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-base font-bold text-acento">{p.port}</span>
                      <span className="ml-1.5 text-[10px] text-grey">{PROTO_LABEL[p.proto]}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-ink">{p.service}</td>
                    <td className="max-w-56 px-4 py-3 text-grey">{p.desc}</td>
                    <td className="max-w-80 break-words px-4 py-3 text-ink/85">{p.hack}</td>
                    <td className="px-4 py-3"><Badge tone={GROUP_TONE[p.group]}>{p.group}</Badge></td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-grey">sin resultados para “{query}” — prueba “kerberos”, “mysql” o un número de puerto</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <p className="mt-6 font-mono text-[10px] leading-relaxed text-grey/60">
          💡 nmap rápido: <span className="text-info">nmap -sV -sC -T4 --top-ports 1000 objetivo</span> · para sacar todo: <span className="text-info">-p-</span> · UDP lento pero valioso: <span className="text-info">sudo nmap -sU --top-ports 50 objetivo</span>. Esta tabla es memoria de consulta: el detalle siempre manda, y contra sistemas reales solo con autorización.
        </p>
      </Reveal>
    </div>
  )
}
