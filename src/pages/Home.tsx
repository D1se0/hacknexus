import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Terminal, ShieldCheck, Zap, Search, Github, BookOpen, Laptop, Star } from 'lucide-react'
import { TOOLS, CATEGORIES, CATEGORY_COLORS, type ToolDef } from '../lib/registry'
import { Counter, Reveal, Typewriter, LiveTerminal, Badge } from '../components/ui'
import { cn } from '../lib/util'

type Nav = (id: string) => void

function ToolCard({ tool, i, nav }: { tool: ToolDef; i: number; nav: Nav }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(i * 0.035, 0.5), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      onClick={() => nav(tool.id)}
      className="card card-hover group relative flex w-full flex-col items-start gap-3 p-5 text-left"
    >
      <div className="absolute right-3 top-3 font-mono text-[9px] uppercase tracking-widest text-grey/40 opacity-0 transition-opacity group-hover:opacity-100">
        {tool.category}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-acento/25 bg-acento/10 text-acento transition-all duration-300 group-hover:scale-105 group-hover:shadow-glow">
        <tool.icon size={18} />
      </div>
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          {tool.name}
          {tool.ported && <span className="font-mono text-[9px] text-grey/60">port</span>}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-grey">{tool.desc}</p>
      </div>
      <span className="mt-auto flex items-center gap-1 font-mono text-[11px] text-acento opacity-0 transition-all group-hover:opacity-100">
        abrir <ChevronRight size={12} />
      </span>
    </motion.button>
  )
}

export default function Home({ nav }: { nav: Nav }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase()
    if (!qn) return TOOLS
    return TOOLS.filter((t) => (t.name + t.desc + t.category + t.id).toLowerCase().includes(qn))
  }, [q])

  return (
    <div className="overflow-x-hidden">
      {/* ─── HERO ─── */}
      <section className="relative py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-5 flex flex-wrap items-center gap-2">
              <span className="chip flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
                d1se0@hacknexus:~#&nbsp;<Typewriter phrases={['suite de hacking ético', 'forense digital client-side', 'networking + cripto', 'docs y comparativa de OS', '40 herramientas, 0 servidores']} />
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-6xl"
            >
              Tu <span className="gradient-text">arsenal completo</span> de<br />
              hacking ético en <span className="text-acento text-glow">un solo lugar_</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-5 max-w-xl text-base leading-relaxed text-grey md:text-lg">
              <span className="font-semibold text-ink">Hashes, cracking con rockyou, cifrados, JWT, DNS, VLSM, PCAP, EXIF, reverse shells</span> y mucho más.
              Todo se ejecuta <span className="text-acento">100% en tu navegador</span>: nada se sube a ningún servidor.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={() => nav('hash')} className="group flex items-center gap-2 rounded-lg bg-acento px-5 py-3 font-mono text-sm font-bold text-base shadow-glow transition-all hover:bg-acento-bright">
                Empezar a hookear <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => nav('revshells')} className="flex items-center gap-2 rounded-lg border border-edge px-5 py-3 font-mono text-sm text-ink transition-all hover:border-acento/50 hover:bg-acento/5">
                <Terminal size={15} /> Reverse shells
              </button>
              <button onClick={() => nav('pcap')} className="flex items-center gap-2 rounded-lg border border-edge px-5 py-3 font-mono text-sm text-ink transition-all hover:border-acento/50 hover:bg-acento/5">
                <Zap size={15} /> Analizar PCAP
              </button>
              <button onClick={() => nav('docs')} className="flex items-center gap-2 rounded-lg border border-acento/40 px-5 py-3 font-mono text-sm text-acento transition-all hover:bg-acento/10">
                <BookOpen size={15} /> Documentación
              </button>
              <button onClick={() => nav('os-compare')} className="flex items-center gap-2 rounded-lg border border-edge px-5 py-3 font-mono text-sm text-ink transition-all hover:border-acento/50 hover:bg-acento/5">
                <Laptop size={15} /> Comparativa de OS
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-7 flex flex-wrap gap-2">
              {['crypto', 'redes', 'forense', 'web', 'linux', 'windows', 'ingeniería inversa'].map((t, i) => (
                <motion.span
                  key={t}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
                  className="chip"
                >
                  {t}
                </motion.span>
              ))}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative">
            <div className="halo -inset-10 bg-acento/20" />
            <LiveTerminal />
          </motion.div>
        </div>
      </section>

      {/* ─── STATS BAND ─── */}
      <Reveal>
        <section className="my-10 grid grid-cols-2 gap-4 rounded-2xl border-y border-edge bg-panel/40 py-8 md:grid-cols-4">
          {[
            { v: TOOLS.length, l: 'herramientas', s: 'y creciendo', tone: 'text-acento' },
            { v: 7, l: 'tools portadas', s: 'de mis repos', tone: 'text-white' },
            { v: 100, l: '% client-side', s: 'nada sale de tu navegador*', tone: 'text-white' },
            { v: 14, l: 'M+ contraseñas', s: 'rockyou disponible en cracker', tone: 'text-ok' },
          ].map((s) => (
            <div key={s.l} className="flex flex-col items-center text-center">
              <span className={cn('text-3xl font-extrabold md:text-4xl', s.tone)}>
                <Counter to={s.v} />
              </span>
              <span className="mt-1 font-mono text-[11px] uppercase tracking-widest text-grey">{s.l}</span>
              <span className="mt-0.5 text-[11px] text-grey/60">{s.s}</span>
            </div>
          ))}
        </section>
      </Reveal>

      {/* ─── APRENDE: DOCS + OS ─── */}
      <section className="py-10">
        <Reveal>
          <div className="section-tag mb-2">// aprende</div>
          <h2 className="mb-8 text-2xl font-extrabold text-white md:text-4xl">Aprende con HackNexus<span className="text-acento">_</span></h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              id: 'docs', icon: BookOpen, t: 'Documentación de cada herramienta', d: 'Qué hace exactamente cada tool, sus parámetros, usos reales del día a día, aplicaciones en hacking ético y tips. Nivel de detalle bestial: la lees una vez y ya sabes sacarle todo el jugo.', cta: 'explorar docs', accent: true,
            },
            {
              id: 'os-compare', icon: Laptop, t: 'Comparativa de OS de hacking ético', d: 'Kali, Arch, Parrot, RHEL, Windows Server, Tails… con estadísticas animadas, pros/contras, veredicto honesto y repos de entornos customizados (incluidos los de D1se0) para dejar tu distro lista en minutos.', cta: 'comparar sistemas', accent: false,
            },
          ].map((s, i) => (
            <Reveal key={s.id} delay={i * 0.08}>
              <button onClick={() => nav(s.id)} className="card card-hover group relative flex h-full w-full flex-col items-start gap-3 overflow-hidden p-6 text-left">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-acento/5 blur-2xl transition-all group-hover:bg-acento/10" />
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-acento/25 bg-acento/10 text-acento transition-all group-hover:scale-105 group-hover:shadow-glow">
                  <s.icon size={20} />
                </div>
                <h3 className="flex items-center gap-2 font-bold text-white">{s.t}
                  <span className="flex items-center gap-0.5 rounded-full border border-acento/40 px-1.5 py-0.5 font-mono text-[8px] uppercase text-acento"><Star size={7} /> nuevo</span>
                </h3>
                <p className="text-sm leading-relaxed text-grey">{s.d}</p>
                <span className="mt-auto flex items-center gap-1 font-mono text-[11px] text-acento">
                  {s.cta} <ChevronRight size={12} className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── BUSCADOR + GRID ─── */}
      <section id="tools" className="py-10">
        <Reveal>
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="section-tag mb-2">// arsenal</div>
              <h2 className="text-2xl font-extrabold text-white md:text-4xl">
                Herramientas<span className="text-acento">_</span>
              </h2>
            </div>
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-grey" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="filtrar arsenal…"
                className="w-full rounded-lg border border-edge bg-black/40 py-2.5 pl-10 pr-4 font-mono text-sm text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60 focus:shadow-glow"
              />
            </div>
          </div>
        </Reveal>

        {CATEGORIES.map((cat) => {
          const tools = filtered.filter((t) => t.category === cat)
          if (!tools.length) return null
          return (
            <div key={cat} className="mb-10">
              <Reveal>
                <div className="mb-4 flex items-center gap-3">
                  <span className={cn('font-mono text-xs uppercase tracking-[0.3em]', CATEGORY_COLORS[cat])}>{'// '}{cat}</span>
                  <span className="h-px flex-1 bg-edge" />
                  <span className="font-mono text-[10px] text-grey">{tools.length}</span>
                </div>
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t, i) => (
                  <ToolCard key={t.id} tool={t} i={i} nav={nav} />
                ))}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-16 text-center font-mono text-sm text-grey">nada coincide con “{q}”</p>
        )}
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-10">
        <Reveal>
          <div className="section-tag mb-2">// filosofía</div>
          <h2 className="mb-8 text-2xl font-extrabold text-white md:text-4xl">Por qué HackNexus<span className="text-acento">_</span></h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: 'Privacidad total', d: 'Sin backend, sin cookies de tracking, sin telemetría. Todo el cómputo ocurre en tu navegador: hashes, cracking, PCAP y EXIF nunca salen de tu máquina.' },
            { icon: Zap, t: 'Rápido y ligero', d: 'Cada herramienta es un módulo perezoso: carga instantánea por rutas, workers para cracking pesado y animaciones a 60fps.' },
            { icon: Terminal, t: 'Diseñada para pentesters', d: 'UX de terminal premium: mono en todas partes, copiar con un clic, estadísticas de criticidad y flujos pensados para campo.' },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.1}>
              <div className="card card-hover relative h-full p-6">
                <div className="absolute right-0 top-0 rounded-bl-lg border-b border-l border-edge bg-base/60 px-2 py-1 font-mono text-[9px] text-grey">0{i + 1}</div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-acento/25 bg-acento/10 text-acento">
                  <f.icon size={18} />
                </div>
                <h3 className="font-bold text-white">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-grey">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── PORTADAS ─── */}
      <section className="py-10">
        <Reveal>
          <div className="section-tag mb-2">// ported from github</div>
          <h2 className="mb-8 text-2xl font-extrabold text-white md:text-4xl">Tus 7 herramientas, integradas<span className="text-acento">_</span></h2>
        </Reveal>
        <div className="grid gap-3 md:grid-cols-2">
          {TOOLS.filter((t) => t.ported).map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i * 0.06, 0.4)}>
              <button onClick={() => nav(t.id)} className="group flex w-full items-center gap-4 rounded-xl border border-edge bg-panel/50 px-5 py-3.5 text-left transition-all hover:border-acento/50 hover:bg-panel">
                <t.icon size={18} className="shrink-0 text-acento" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="truncate font-mono text-[11px] text-grey">github.com/D1se0/{t.origin}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-grey transition-transform group-hover:translate-x-1 group-hover:text-acento" />
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── DISCLAIMER + CTA ─── */}
      <section className="py-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-edge bg-panel/60 p-8 md:p-12">
            <div className="grid-bg absolute inset-0 opacity-40 animate-gridDrift" />
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-acento/40 bg-acento/15 text-acento shadow-glow">
                <Github size={22} />
              </div>
              <h2 className="gradient-text text-2xl font-extrabold md:text-4xl">Código abierto y desplegable en un clic</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-grey md:text-base">
                Todo el código está en GitHub y se despliega automáticamente en GitHub Pages con Actions.
                Solo herramientas para <span className="text-ink">auditorías autorizadas, CTFs y aprendizaje</span>.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://github.com/D1se0" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-acento px-5 py-3 font-mono text-sm font-bold text-base shadow-glow transition-all hover:bg-acento-bright">
                  <Github size={15} /> Ver GitHub
                </a>
                <button onClick={() => nav('cheatsheets')} className="rounded-lg border border-edge px-5 py-3 font-mono text-sm text-ink transition-all hover:border-acento/50">
                  Explorar cheatsheets
                </button>
              </div>
              <div className="mt-8 flex items-start gap-3 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-xs text-warn/90">
                <Badge tone="warn">disclaimer</Badge>
                <span>
                  *Las herramientas de red (DNS, IP info, HTTP inspector) consultan APIs públicas (Google DNS, ipwho.is, NVD)
                  para funcionar desde el navegador: esas consultas van a esos servicios, no a ningún backend propio. El resto
                  (hashes, cracking, PCAP, EXIF, estego…) es 100% local.
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}