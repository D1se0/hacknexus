import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, AlertTriangle, Eye, Microscope, Route, GraduationCap, Wrench } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner } from '../components/ui'
import { CodeBlock } from '../components/highlight'
import { FOR_DECISIONS, VOL_STEPS, TSK_STEPS, FILES_STEPS, EVTX_STEPS, PREFETCH_STEPS, REGISTRY_STEPS, FOR_CASES, FOR_ENV_NOTE, type ForSection } from '../lib/forensicsdoc'

const SECTIONS: ForSection[] = [...VOL_STEPS, TSK_STEPS, FILES_STEPS, EVTX_STEPS, PREFETCH_STEPS, REGISTRY_STEPS]

const LEVEL_TONE = { 'básico': 'ok', 'intermedio': 'info', 'experto': 'warn' } as const

export default function ForensicsDoc() {
  const [sel, setSel] = useState<string | null>(null)

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Microscope}
        title="Forensics Playbook"
        desc="Guía completa de análisis forense testada sobre evidencias reales: volcados de RAM (Volatility 3), discos y USBs (The Sleuth Kit), ficheros (file/binwalk/carving), EVTX Sysmon, Prefetch comprimido y registro Windows — con el árbol de decisión de «tengo este archivo, ¿qué hago?»"
        badge="DFIR"
      />

      <InfoBanner>{FOR_ENV_NOTE}</InfoBanner>

      {/* ─── ÁRBOL DE DECISIÓN: tengo X, ¿qué hago? ─── */}
      <Reveal>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
          <Search size={17} className="text-acento" /> El árbol de decisión: «me han dado este fichero»
        </h2>
        <p className="mb-4 text-[12.5px] leading-relaxed text-grey">
          Todo reto forense empieza igual: una carpeta con archivos raros. Ejecuta <code className="rounded bg-black/50 px-1 font-mono text-[11px] text-acento">file *</code> y clasifica cada resultado con esta tabla. La primera regla que aplique, gana.
        </p>
      </Reveal>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {FOR_DECISIONS.map((d, i) => (
          <Reveal key={d.title} delay={i * 0.03}>
            <motion.div
              whileHover={{ y: -3 }}
              className="card h-full cursor-pointer p-4"
              onClick={() => { setSel(d.sections[0]); document.getElementById('sec-' + d.sections[0])?.scrollIntoView({ behavior: 'smooth' }) }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">{d.icon}</span>
                <h3 className="font-mono text-[13px] font-bold text-white">{d.title}</h3>
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {d.ext.map((e) => <Badge key={e} tone="neutral">{e}</Badge>)}
              </div>
              <p className="mb-3 text-[11.5px] leading-relaxed text-grey">{d.verdict}</p>
              <CodeBlock code={d.firstCmds.join('\n')} lang="bash" label="primeros comandos" maxH="max-h-40" />
            </motion.div>
          </Reveal>
        ))}
      </div>

      {/* ─── NAVEGADOR DE SECCIONES ─── */}
      <Reveal>
        <div className="mt-8 mb-4 flex flex-wrap items-center gap-2">
          <Route size={16} className="text-acento" />
          <button
            onClick={() => setSel(null)}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${sel === null ? 'border-acento bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
          >
            todas las secciones
          </button>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSel(s.id)}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${sel === s.id ? 'border-acento bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}
            >
              {s.icon} {s.title.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </Reveal>

      {/* ─── SECCIONES ─── */}
      <div className="space-y-10">
        {SECTIONS.filter((s) => !sel || s.id === sel).map((sec) => (
          <div key={sec.id} id={'sec-' + sec.id}>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl">{sec.icon}</span>
                <h2 className="text-xl font-bold text-white">{sec.title}</h2>
                <Badge tone={LEVEL_TONE[sec.level]}>nivel {sec.level}</Badge>
              </div>
              <p className="mt-2 max-w-4xl text-[12.5px] leading-relaxed text-grey">{sec.intro}</p>
            </Reveal>

            {/* arsenal */}
            <Reveal delay={0.03}>
              <div className="card mt-4 overflow-hidden">
                <h3 className="flex items-center gap-2 border-b border-edge bg-black/20 px-5 py-3 font-mono text-sm font-bold text-white">
                  <Wrench size={14} className="text-acento" /> el arsenal — cada herramienta y para qué
                </h3>
                <div className="divide-y divide-edge/60">
                  {sec.tools.filter((t) => t.desc).map((t) => (
                    <div key={t.cmd} className="px-5 py-2.5">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <code className="font-mono text-[12.5px] font-bold text-acento">{t.cmd}</code>
                        {t.install && <Badge tone="info">{t.install}</Badge>}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-grey">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* pasos */}
            <div className="mt-4 space-y-4">
              {sec.steps.map((st, i) => (
                <Reveal key={st.title} delay={i * 0.03}>
                  <motion.div whileHover={{ x: 3 }} className="card overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-black/20 px-5 py-3">
                      <h3 className="font-mono text-sm font-bold text-white">{st.title}</h3>
                      {st.trap && <Badge tone="warn">trampa</Badge>}
                    </div>
                    <div className="space-y-3 p-5">
                      <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-grey">
                        <GraduationCap size={14} className="mt-0.5 shrink-0 text-acento" />
                        {st.why}
                      </p>
                      {st.cmds.map((c, j) => (
                        <CodeBlock key={j} code={c} lang="bash" label={`${sec.id} · comando ${j + 1}`} />
                      ))}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-ok/25 bg-ok/5 px-3.5 py-2.5">
                          <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ok"><Eye size={11} /> qué esperar (salida real)</p>
                          <p className="text-[12px] leading-relaxed text-ink/90">{st.expect}</p>
                        </div>
                        {st.trap && (
                          <div className="rounded-lg border border-warn/40 bg-warn/5 px-3.5 py-2.5">
                            <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-warn"><AlertTriangle size={11} /> trampa del día a día</p>
                            <p className="text-[12px] leading-relaxed text-warn/95">{st.trap}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── CASOS REALES ─── */}
      <Reveal>
        <h2 className="mb-1 mt-10 flex items-center gap-2 text-lg font-bold text-white">
          <Route size={17} className="text-acento" /> Casos reales: los retos de Atenea paso a paso
        </h2>
        <p className="mb-4 text-[12.5px] leading-relaxed text-grey">
          Los tres writeups que inspiran esta guía, condensados en la RUTA que siguió el analista. Si te enfrentas a un reto parecido, esta es la secuencia que funciona.
        </p>
      </Reveal>
      <div className="grid gap-4 lg:grid-cols-3">
        {FOR_CASES.map((c, i) => (
          <Reveal key={c.name} delay={i * 0.05}>
            <div className="card h-full p-5">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white">{c.name}</h3>
                <Badge tone={c.level === 'Easy' ? 'ok' : 'warn'}>{c.level}</Badge>
              </div>
              <p className="mb-3 font-mono text-[11px] text-grey">{c.artefact}</p>
              <ol className="space-y-1.5">
                {c.path.map((p, j) => (
                  <li key={j} className="flex items-start gap-2 font-mono text-[11.5px] leading-relaxed text-ink/85">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-acento/40 bg-acento/10 text-[9px] text-acento">{j + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
              <p className="mt-3 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-[11.5px] leading-relaxed text-info/90">
                💡 {c.lesson}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
