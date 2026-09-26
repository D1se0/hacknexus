import { useMemo, useState } from 'react'
import { BookMarked } from 'lucide-react'
import { ToolHeader, Badge, TextInput, Reveal } from '../components/ui'
import { ACRONYMS, ACRO_CATS, searchAcronyms, type AcroCat } from '../lib/acronyms'
import { cn } from '../lib/util'

export default function Acronyms() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<AcroCat | 'todas'>('todas')

  const list = useMemo(() => searchAcronyms(q, cat), [q, cat])

  return (
    <>
      <ToolHeader icon={BookMarked} title="Diccionario de Acrónimos" desc={`${ACRONYMS.length} acrónimos de ciberseguridad con definición en español: ofensivo, defensivo, redes, cripto, Windows/AD, Linux, web, cloud, gobierno y forense — para entender reuniones, informes y certificaciones sin googleo cada 2 minutos`} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar sigla o definición… (SOC, kerberos, MTU, MITRE)" className="max-w-md" />
        <span className="font-mono text-[11px] text-grey">{list.length} / {ACRONYMS.length}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {([{ id: 'todas' as const, label: 'todas', icon: '🌐' }, ...ACRO_CATS]).map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id as AcroCat | 'todas')}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] transition-colors',
              cat === c.id ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink',
            )}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="columns-1 gap-2 md:columns-2 xl:columns-3">
        {list.map((x, i) => (
          <Reveal key={x.a} delay={Math.min(i * 0.006, 0.2)} className="break-inside-avoid">
            <div className="mb-2 rounded-lg border border-edge p-3 transition-colors hover:border-acento/30">
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm font-bold text-acento">{x.a}</code>
                <Badge tone="neutral">{ACRO_CATS.find((c) => c.id === x.cat)?.label}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-grey">{x.d}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {list.length === 0 && (
        <div className="rounded border border-edge py-10 text-center font-mono text-xs text-grey">sin resultados para "{q}"</div>
      )}
    </>
  )
}
