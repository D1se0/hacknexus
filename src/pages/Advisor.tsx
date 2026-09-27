import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Compass, ChevronRight } from 'lucide-react'
import { cn } from '../lib/util'
import { searchTasks, TASK_CATS, TASK_CAT_LABEL, type TaskEntry } from '../lib/taskguide'
import { findTool } from '../lib/registry'

/* Orientador de herramientas: "quiero hacer X" → tools adecuadas con pasos.
   Antes vivía dentro de la comparativa de OS; ahora es sección propia. */

export default function Advisor() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<TaskEntry['category'] | 'todas'>('todas')
  const [openId, setOpenId] = useState<string | null>(null)

  const tasks = useMemo(() => {
    let list = searchTasks(q)
    if (cat !== 'todas') list = list.filter((t) => t.category === cat)
    return list
  }, [q, cat])

  const goToTool = (id: string) => {
    window.location.hash = '/' + id
  }

  return (
    <div className="min-w-0">
      {/* hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-acento">
          <Compass size={13} /> // orientador
        </div>
        <h1 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
          ¿Qué <span className="gradient-text">herramienta</span> necesito?<span className="text-acento">_</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-grey md:text-base">
          Con {`más de 100`} tools es fácil perderse: dime qué quieres conseguir y te llevo directo a la herramienta
          adecuada con los pasos por donde empezar. Sin saberse el catálogo de memoria.
        </p>
      </motion.div>

      {/* buscador */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="relative mt-8 max-w-xl">
          <Compass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-grey" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="busca tu tarea… (firewall, vpn, ssh, wordlist, informe, wifi…)"
            className="w-full rounded-lg border border-edge bg-black/40 py-2.5 pl-10 pr-4 font-mono text-sm text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60 focus:shadow-glow"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['todas', ...TASK_CATS] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as TaskEntry['category'] | 'todas')}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] transition-colors ${cat === c ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-acento/40 hover:text-ink'}`}
            >
              {c === 'todas' ? 'todas' : TASK_CAT_LABEL[c as TaskEntry['category']]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* tarjetas de tarea */}
      <div className="mt-6 grid gap-2 md:grid-cols-2">
        {tasks.map((t, i) => {
          const open = openId === t.id
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
              className={cn('card rounded-lg p-4 transition-all', open && 'md:col-span-2')}
            >
              <button onClick={() => setOpenId(open ? null : t.id)} className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-sm font-semibold text-white">{t.task}</span>
                  <span className="ml-auto rounded-full border border-edge px-2 py-0.5 font-mono text-[9px] text-grey">{TASK_CAT_LABEL[t.category]}</span>
                  <ChevronRight size={14} className={cn('shrink-0 text-grey transition-transform', open && 'rotate-90')} />
                </div>
                <p className="mt-1 text-xs text-grey">{t.desc}</p>
              </button>
              {open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="mt-3 grid gap-4 border-t border-edge pt-3 md:grid-cols-2">
                    <div>
                      <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-acento">por dónde empezar</h4>
                      <ol className="space-y-1 text-xs text-grey">
                        {t.steps.map((s, j) => <li key={s}><span className="text-acento">{j + 1}.</span> {s}</li>)}
                      </ol>
                    </div>
                    <div>
                      <h4 className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-acento">herramientas para esto</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {t.tools.map((tid) => {
                          const tool = findTool(tid)
                          return (
                            <button
                              key={tid}
                              onClick={() => goToTool(tid)}
                              title={tool?.desc}
                              className="rounded border border-acento/40 bg-acento/5 px-2 py-1 font-mono text-[11px] text-acento transition-all hover:bg-acento/15"
                            >
                              {tool?.short ?? tid} →
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
        {tasks.length === 0 && (
          <div className="rounded border border-edge py-6 text-center font-mono text-xs text-grey md:col-span-2">
            sin tareas para “{q}” — prueba con firewall, vpn, osint, informe…
          </div>
        )}
      </div>
    </div>
  )
}
