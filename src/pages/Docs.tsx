import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Search, ChevronRight, BookMarked, Wrench, Lightbulb, Shield, Coffee, ArrowLeft } from 'lucide-react'
import { TOOLS, CATEGORIES, CATEGORY_COLORS, type ToolDef } from '../lib/registry'
import { DOCS } from '../lib/docs'
import { cn } from '../lib/util'

type Nav = (id: string) => void

function DocBlock({ icon: Icon, title, items, color, delay }: { icon: React.ElementType; title: string; items: string[]; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-xl border border-edge bg-black/25 p-5"
    >
      <div className={cn('mb-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest', color)}>
        <Icon size={13} /> {title}
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink">
            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', color.replace('text-', 'bg-'))} />
            <span className="min-w-0 break-words">{it}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function ParamTable({ params }: { params: { name: string; type: string; required?: boolean; desc: string }[] }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-edge">
      <table className="w-full min-w-[560px] font-mono text-[12px]">
        <thead>
          <tr className="border-b border-edge bg-black/30 text-left text-[10px] uppercase tracking-wider text-grey">
            <th className="px-4 py-2.5">parámetro</th>
            <th className="px-4 py-2.5">tipo</th>
            <th className="px-4 py-2.5">descripción</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} className="border-b border-edge/40 last:border-0">
              <td className="px-4 py-2.5 align-top">
                <span className="text-acento">{p.name}</span>
                {p.required && <span className="ml-1.5 rounded border border-bad/40 px-1 text-[9px] uppercase text-bad">req</span>}
              </td>
              <td className="px-4 py-2.5 align-top text-info">{p.type}</td>
              <td className="px-4 py-2.5 align-top text-ink">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ToolDocView({ tool, onBack }: { tool: ToolDef; onBack: () => void }) {
  const doc = DOCS[tool.id]
  if (!doc) {
    return (
      <div className="py-20 text-center font-mono text-sm text-grey">
        documentación de <span className="text-acento">{tool.id}</span> en camino…
      </div>
    )
  }
  return (
    <div className="min-w-0">
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 font-mono text-xs text-grey transition-colors hover:text-acento">
        <ArrowLeft size={13} /> volver a todos los docs
      </button>

      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-acento/30 bg-acento/10 text-acento shadow-glow">
          <tool.icon size={22} />
        </div>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold text-white md:text-3xl">
            {tool.name}
            <span className={cn('font-mono text-xs', CATEGORY_COLORS[tool.category])}>{tool.category}</span>
          </h1>
          <p className="mt-1 text-sm text-grey">{tool.desc}</p>
        </div>
        <button
          onClick={() => (window.location.hash = `/${tool.id}`)}
          className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-lg bg-acento px-4 py-2 font-mono text-xs font-bold text-base shadow-glow transition-all hover:bg-acento-bright sm:flex"
        >
          abrir tool <ChevronRight size={13} />
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 rounded-xl border border-info/30 bg-info/5 p-5">
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-info">
          <BookOpen size={13} /> ¿qué hace exactamente?
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink">{doc.what}</p>
      </motion.div>

      {doc.params.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-grey">
            <Wrench size={13} /> parámetros y entradas
          </div>
          <ParamTable params={doc.params} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <DocBlock icon={Coffee} title="usos en el día a día" items={doc.daily} color="text-ok" delay={0.05} />
        <DocBlock icon={Shield} title="usos en hacking ético" items={doc.ethical} color="text-bad" delay={0.1} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 rounded-xl border border-warn/30 bg-warn/5 p-5"
      >
        <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-warn">
          <Lightbulb size={13} /> tips y avisos
        </div>
        <ul className="space-y-2">
          {doc.tips.map((t, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink">
              <span className="mt-0.5 font-mono text-[11px] text-warn">▸</span>
              <span className="min-w-0 break-words">{t}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => (window.location.hash = `/${tool.id}`)}
          className="flex items-center gap-1.5 rounded-lg border border-acento/40 px-4 py-2 font-mono text-xs text-acento transition-all hover:bg-acento/10"
        >
          probar {tool.name} ahora <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export default function Docs({ nav }: { nav: Nav }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const qn = q.trim().toLowerCase()
  const documented = useMemo(() => TOOLS.filter((t) => DOCS[t.id]), [])

  const filtered = useMemo(() => {
    if (!qn) return documented
    return documented.filter((t) => {
      const d = DOCS[t.id]
      const haystack = [t.name, t.desc, d.what, ...d.daily, ...d.ethical, ...d.tips, ...d.params.map((p) => p.name + ' ' + p.desc)].join(' ').toLowerCase()
      return haystack.includes(qn)
    })
  }, [documented, qn])

  if (selected) {
    const tool = TOOLS.find((t) => t.id === selected)
    if (tool) return <ToolDocView tool={tool} onBack={() => setSelected(null)} />
  }

  return (
    <div className="min-w-0">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-acento">
          <BookMarked size={13} /> // documentación
        </div>
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">
          Docs de cada herramienta<span className="text-acento">_</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-grey md:text-base">
          Qué hace cada tool, sus parámetros, usos reales del día a día, aplicaciones en hacking ético y tips de quien la usa a diario.
          Nivel de detalle bestial, sin humo.
        </p>
      </motion.div>

      <div className="relative mt-6 max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-grey" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar en la documentación… (ej: jwt, privesc, cookies)"
          className="w-full rounded-lg border border-edge bg-black/40 py-2.5 pl-10 pr-4 font-mono text-sm text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60 focus:shadow-glow"
        />
      </div>

      {CATEGORIES.map((cat) => {
        const tools = filtered.filter((t) => t.category === cat)
        if (!tools.length) return null
        return (
          <div key={cat} className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <span className={cn('font-mono text-xs uppercase tracking-[0.3em]', CATEGORY_COLORS[cat])}>{'// '}{cat}</span>
              <span className="h-px flex-1 bg-edge" />
              <span className="font-mono text-[10px] text-grey">{tools.length} docs</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {tools.map((t, i) => {
                const d = DOCS[t.id]
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
                    whileHover={{ y: -3 }}
                    onClick={() => setSelected(t.id)}
                    className="card card-hover group flex min-w-0 flex-col items-start gap-2 p-5 text-left"
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-acento/25 bg-acento/10 text-acento transition-all group-hover:shadow-glow">
                        <t.icon size={16} />
                      </div>
                      <span className="truncate text-sm font-bold text-white">{t.name}</span>
                      <ChevronRight size={14} className="ml-auto shrink-0 text-grey transition-transform group-hover:translate-x-1 group-hover:text-acento" />
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-grey">{d?.what ?? t.desc}</p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-1 font-mono text-[9px] text-grey/70">
                      <span className="rounded border border-edge px-1.5 py-0.5">{d?.params.length ?? 0} parámetros</span>
                      <span className="rounded border border-edge px-1.5 py-0.5">{d?.daily.length ?? 0} usos</span>
                      <span className="rounded border border-edge px-1.5 py-0.5">{d?.ethical.length ?? 0} casos éticos</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && <p className="py-16 text-center font-mono text-sm text-grey">nada en la documentación coincide con “{q}”</p>}
    </div>
  )
}
