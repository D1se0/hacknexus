import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, AlertTriangle, Eye, Network, Route, GraduationCap, Wand2, BookOpen } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, TextInput, Select } from '../components/ui'
import { CodeBlock } from '../components/highlight'
import { WI_CONCEPTS, WI_FILTERS, WI_TRICKS, WI_PATH, WI_NOTE, type WiLevel } from '../lib/wifilterdoc'

const LEVELS: (WiLevel | 'todos')[] = ['todos', 'nivel 0', 'básico', 'intermedio', 'experto']
const LEVEL_TONE: Record<string, 'ok' | 'info' | 'warn' | 'accent'> = { 'nivel 0': 'accent', 'básico': 'ok', 'intermedio': 'info', 'experto': 'warn' }
const CATS = ['todos', ...Array.from(new Set(WI_FILTERS.map((w) => w.cat)))]

export default function WiFilterDoc() {
  const [q, setQ] = useState('')
  const [lvl, setLvl] = useState<WiLevel | 'todos'>('todos')
  const [cat, setCat] = useState('todos')

  const list = useMemo(
    () =>
      WI_FILTERS.filter(
        (w) =>
          (lvl === 'todos' || w.level === lvl) &&
          (cat === 'todos' || w.cat === cat) &&
          (q.trim() === '' || (w.f + ' ' + w.what + ' ' + w.behind).toLowerCase().includes(q.toLowerCase())),
      ),
    [q, lvl, cat],
  )

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Network}
        title="WiFilter Academy"
        desc="Academia de Wireshark: los filtros display que de verdad se usan, cada uno explicado con lo que hace el disector por detrás y las trampas del mundo real — más trucos de tshark, estadísticas y la ruta de aprendizaje desde nivel 0 hasta DFIR"
        badge="wireshark"
      />

      <InfoBanner>{WI_NOTE}</InfoBanner>

      {/* ─── CONCEPTOS: entender antes de memorizar ─── */}
      <Reveal>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
          <BookOpen size={17} className="text-acento" /> Cómo piensa Wireshark (léelo antes de los filtros)
        </h2>
        <p className="mb-4 text-[12.5px] leading-relaxed text-grey">
          Un display filter no es magia: es una consulta sobre campos que los disectores extraen de los bytes. Entender ESTO te ahorra memorizar cientos de filtros.
        </p>
      </Reveal>
      <div className="grid gap-3 md:grid-cols-2">
        {WI_CONCEPTS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.03}>
            <div className="card h-full p-4">
              <h3 className="mb-1.5 font-mono text-[13px] font-bold text-white">{c.title}</h3>
              <p className="text-[12px] leading-relaxed text-grey">{c.body}</p>
              {c.example && (
                <code className="mt-2 block rounded bg-black/50 px-2.5 py-1.5 font-mono text-[11.5px] text-acento">{c.example}</code>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      {/* ─── CATÁLOGO DE FILTROS ─── */}
      <Reveal>
        <h2 className="mb-1 mt-8 flex items-center gap-2 text-lg font-bold text-white">
          <Search size={17} className="text-acento" /> El catálogo: {WI_FILTERS.length} filtros verificados
        </h2>
        <p className="mb-3 text-[12.5px] leading-relaxed text-grey">
          Filtra por nivel o categoría, o busca por palabra. Cada tarjeta tiene el filtro copiable, qué hace, QUÉ PASA POR DETRÁS y la trampa si la hay.
        </p>
      </Reveal>
      <Reveal delay={0.03}>
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput placeholder="buscar filtro, protocolo, trampa…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select
            value={lvl}
            onChange={(e) => setLvl(e.target.value as WiLevel | 'todos')}
            options={LEVELS.map((l) => ({ value: l, label: l }))}
            className="w-40"
          />
          <Select value={cat} onChange={(e) => setCat(e.target.value)} options={CATS.map((c) => ({ value: c, label: c === 'otros' ? 'otros protocolos' : c === 'experto' ? 'meta/experto' : c }))} className="w-44" />
          <Badge tone="accent">{list.length} / {WI_FILTERS.length}</Badge>
        </div>
      </Reveal>
      <div className="grid gap-3 xl:grid-cols-2">
        {list.map((w, i) => (
          <Reveal key={w.f} delay={Math.min(i * 0.02, 0.2)}>
            <motion.div whileHover={{ y: -2 }} className="card h-full p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone={LEVEL_TONE[w.level]}>{w.level}</Badge>
                <Badge tone="neutral">{w.cat}</Badge>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <code className="flex-1 rounded bg-black/60 px-2.5 py-1.5 font-mono text-[12px] font-bold text-acento break-all">{w.f}</code>
              </div>
              <p className="text-[12px] leading-relaxed text-ink/90">{w.what}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-grey">
                <GraduationCap size={12} className="mt-0.5 shrink-0 text-info" />
                <span><span className="text-info">por detrás:</span> {w.behind}</span>
              </p>
              {w.gotcha && (
                <p className="mt-1.5 flex items-start gap-1.5 rounded border border-warn/30 bg-warn/5 px-2 py-1.5 text-[11.5px] leading-relaxed text-warn/95">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w.gotcha}
                </p>
              )}
              {w.counts && (
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-ok">
                  <Eye size={11} /> {w.counts}
                </p>
              )}
            </motion.div>
          </Reveal>
        ))}
      </div>

      {/* ─── TRUCOS ─── */}
      <Reveal>
        <h2 className="mb-1 mt-10 flex items-center gap-2 text-lg font-bold text-white">
          <Wand2 size={17} className="text-acento" /> Trucos del día a día: tshark, streams y estadísticas
        </h2>
        <p className="mb-4 text-[12.5px] leading-relaxed text-grey">
          Los filtros solo son la mitad. La otra mitad son las herramientas alrededor: exportar campos, seguir streams, estadísticas y logística de capturas. Todos los comandos fueron ejecutados.
        </p>
      </Reveal>
      <div className="space-y-4">
        {WI_TRICKS.map((t, i) => (
          <Reveal key={t.title} delay={i * 0.03}>
            <motion.div whileHover={{ x: 3 }} className="card overflow-hidden">
              <div className="border-b border-edge bg-black/20 px-5 py-3">
                <h3 className="font-mono text-sm font-bold text-white">{t.title}</h3>
              </div>
              <div className="space-y-3 p-5">
                <p className="text-[12.5px] leading-relaxed text-grey">{t.body}</p>
                <CodeBlock code={t.cmds.join('\n')} lang="bash" label={t.title.split(':')[0].toLowerCase().replace(/\s+/g, '-')} />
                {t.expect && (
                  <div className="rounded-lg border border-ok/25 bg-ok/5 px-3.5 py-2.5">
                    <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ok"><Eye size={11} /> qué esperar (salida real)</p>
                    <p className="text-[12px] leading-relaxed text-ink/90">{t.expect}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>

      {/* ─── RUTA DE APRENDIZAJE ─── */}
      <Reveal>
        <h2 className="mb-1 mt-10 flex items-center gap-2 text-lg font-bold text-white">
          <Route size={17} className="text-acento" /> La ruta: de nivel 0 a DFIR
        </h2>
        <p className="mb-4 text-[12.5px] leading-relaxed text-grey">
          Cuatro etapas. Cada una tiene objetivos concretos y los filtros con los que practicarlos — en orden.
        </p>
      </Reveal>
      <div className="grid gap-3 md:grid-cols-2">
        {WI_PATH.map((p, i) => (
          <Reveal key={p.level} delay={i * 0.04}>
            <div className="card h-full p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-acento/40 bg-acento/10 font-mono text-xs font-bold text-acento">{i}</span>
                <h3 className="font-mono text-[13px] font-bold text-white">{p.level}</h3>
              </div>
              <ul className="mb-3 space-y-1.5">
                {p.goals.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-[12px] leading-relaxed text-grey">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-acento" /> {g}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1.5">
                {p.filters.map((f) => (
                  <code key={f} className="rounded border border-edge bg-black/40 px-2 py-1 font-mono text-[10.5px] text-acento">{f}</code>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
