import { useMemo, useState } from 'react'
import { Search, ExternalLink, Copy } from 'lucide-react'
import { ToolHeader, Badge, Reveal, TextInput, InfoBanner, useToast } from '../components/ui'
import { DORK_GROUPS, DORK_ENGINES, dorkUrl, countDorks, type DorkEngine } from '../lib/dorks'

const ENGINE_COLOR: Record<DorkEngine, string> = {
  Google: 'text-info',
  Bing: 'text-acento',
  GitHub: 'text-[#c084fc]',
  Shodan: 'text-warn',
  Censys: 'text-ok',
}

export default function Dorkgen() {
  const [engine, setEngine] = useState<DorkEngine | 'todos'>('todos')
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState('objetivo.com')
  const toast = useToast()

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DORK_GROUPS.filter((g) => engine === 'todos' || g.engine === engine)
      .map((g) => ({ ...g, dorks: q ? g.dorks.filter((d) => d.q.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q)) : g.dorks }))
      .filter((g) => g.dorks.length > 0)
  }, [engine, query])

  const total = countDorks(groups)

  const withTarget = (q: string) => q.replace(/objetivo\.com/g, target || 'objetivo.com')

  return (
    <div>
      <ToolHeader icon={Search} title="Dork Arsenal" desc="{total} dorks de Google, Bing, GitHub, Shodan y Censys listos para OSINT y reconocimiento autorizado" />

      <InfoBanner>
        Sustituye <span className="font-mono">objetivo.com</span> por tu objetivo (el campo de abajo lo cambia en todos los dorks de golpe). Úsalo solo sobre <b>activos propios o con autorización</b> (bug bounty in-scope): hacer dorking sobre terceros sin permiso puede violar sus términos y la ley. Cada botón abre la búsqueda real en una pestaña nueva.
      </InfoBanner>

      <Reveal>
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-56 flex-1">
            <TextInput value={target} onChange={(e) => setTarget(e.target.value)} placeholder="dominio del objetivo…" className="font-mono" />
          </div>
          <div className="min-w-52 flex-1">
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filtrar dorks…" />
          </div>
        </div>
      </Reveal>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['todos', ...DORK_ENGINES] as const).map((e) => (
          <button
            key={e}
            onClick={() => setEngine(e as DorkEngine | 'todos')}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${engine === e ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
          >
            {e}
          </button>
        ))}
        <Badge tone="neutral" className="ml-auto">{total} dorks visibles</Badge>
      </div>

      {groups.map((g) => (
        <Reveal key={g.name}>
          <div className="card mt-5 p-6">
            <h3 className="mb-1 flex items-center gap-2 font-mono text-sm font-bold text-white">
              {g.name} <Badge tone="accent" className={ENGINE_COLOR[g.engine]}>{g.engine}</Badge>
            </h3>
            <div className="mt-3 divide-y divide-edge/60">
              {g.dorks.map((d) => {
                const finalQ = withTarget(d.q)
                const url = dorkUrl(g.engine, finalQ)
                return (
                  <div key={d.q} className="group flex flex-wrap items-center gap-2 py-2.5">
                    <code className="break-all font-mono text-[12.5px] text-ink">{finalQ}</code>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => { navigator.clipboard.writeText(finalQ).catch(() => {}); toast('dork copiado') }}
                        className="rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-grey transition-all hover:border-acento/50 hover:text-acento"
                        title="copiar"
                      >
                        <Copy size={11} className="inline" /> copiar
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-1.5 rounded-md border border-info/40 px-2 py-1 font-mono text-[10px] text-info transition-all hover:bg-info/10"
                      >
                        <ExternalLink size={11} /> abrir
                      </a>
                    </span>
                    <p className="w-full font-mono text-[11px] text-grey/70">↳ {d.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>
      ))}

      <Reveal>
        <p className="mt-6 font-mono text-[10px] leading-relaxed text-grey/60">
          💡 Los dorks de GitHub buscan en código público: son la fuente nº1 de filtraciones accidentales de tu propia organización. Correlos contra ti mismo antes que lo haga otro. En Shodan/Censys, org/ASN suele dar mejores resultados que hostname suelto.
        </p>
      </Reveal>
    </div>
  )
}
