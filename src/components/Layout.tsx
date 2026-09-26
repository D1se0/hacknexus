import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Github, ShieldAlert, Command, X, Menu, ChevronRight, ChevronDown, BookOpen, Laptop, Star, FolderTree } from 'lucide-react'
import { TOOLS, CATEGORIES, CATEGORY_COLORS, SUBSECTIONS, subsectionOf, type ToolDef } from '../lib/registry'
import { cn } from '../lib/util'
import { Typewriter } from './ui'

export type Nav = (id: string) => void

/* ---------------- Páginas especiales ---------------- */

const SPECIAL_PAGES: { id: string; name: string; desc: string; icon: React.ElementType; hint?: string }[] = [
  { id: 'docs', name: 'Documentación', desc: 'Docs detalladas de cada herramienta: qué hace, parámetros y usos', icon: BookOpen, hint: 'nuevo' },
  { id: 'os-compare', name: 'Comparativa de OS', desc: 'Kali, Arch, Parrot, RHEL… con repos de entornos customizados', icon: Laptop, hint: 'nuevo' },
]

/* ---------------- Command Palette ⌘K ---------------- */

function CommandPalette({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: Nav }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const results = useMemo<{ special: (typeof SPECIAL_PAGES)[number] | null; tool: ToolDef | null }[]>(() => {
    const qn = q.trim().toLowerCase()
    const pages = SPECIAL_PAGES
      .filter((p) => !qn || (p.name + p.desc).toLowerCase().includes(qn))
      .map((p) => ({ special: p, tool: null as ToolDef | null }))
    const tools = TOOLS.filter(
      (t) => !qn || t.name.toLowerCase().includes(qn) || t.desc.toLowerCase().includes(qn) || t.category.toLowerCase().includes(qn) || t.id.includes(qn),
    ).map((t) => ({ special: null, tool: t as ToolDef }))
    return [...pages, ...tools]
  }, [q])
  useEffect(() => setSel(0), [q])
  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-edge bg-panel shadow-glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-edge px-4 py-3.5">
              <Search size={16} className="text-acento" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
                  if (e.key === 'Enter' && results[sel]) { nav(results[sel].special?.id ?? results[sel].tool?.id ?? 'home'); onClose() }
                  if (e.key === 'Escape') onClose()
                }}
                placeholder="Buscar herramienta… (ej: hash, dns, pcap, jwt)"
                className="flex-1 bg-transparent font-mono text-sm text-ink outline-none placeholder:text-grey/50"
              />
              <span className="kbd">ESC</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <div className="px-4 py-8 text-center font-mono text-xs text-grey">Sin resultados para “{q}”</div>}
              {results.map((r, i) => {
                if (r.special) {
                  const p = r.special
                  return (
                    <button
                      key={p.id}
                      onClick={() => { nav(p.id); onClose() }}
                      onMouseEnter={() => setSel(i)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        i === sel ? 'bg-acento/10 text-ink' : 'text-grey hover:bg-panel',
                      )}
                    >
                      <p.icon size={16} className="shrink-0 text-acento" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                        <div className="truncate text-xs text-grey">{p.desc}</div>
                      </div>
                      <span className="shrink-0 rounded-full border border-acento/40 px-1.5 py-0.5 font-mono text-[9px] uppercase text-acento">{p.hint}</span>
                    </button>
                  )
                }
                const t = r.tool
                if (!t) return null
                return (
                  <button
                    key={t.id}
                    onClick={() => { nav(t.id); onClose() }}
                    onMouseEnter={() => setSel(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      i === sel ? 'bg-acento/10 text-ink' : 'text-grey hover:bg-panel',
                    )}
                  >
                    <t.icon size={16} className={cn('shrink-0', CATEGORY_COLORS[t.category])} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{t.name}</div>
                      <div className="truncate text-xs text-grey">{t.desc}</div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-grey/60">{t.category}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-edge px-4 py-2.5 font-mono text-[10px] text-grey">
              <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navegar</span>
              <span className="flex items-center gap-1"><span className="kbd">↵</span> abrir</span>
              <span className="ml-auto">{results.length} herramientas</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Background ---------------- */

function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="grid-bg absolute inset-0 opacity-60 animate-gridDrift" />
      <div className="halo left-[-10%] top-[-15%] h-[520px] w-[520px] bg-acento/10" />
      <div className="halo right-[-12%] top-[30%] h-[460px] w-[460px] bg-info/10" />
      <div className="halo bottom-[-20%] left-[30%] h-[500px] w-[500px] bg-acento-dark/10" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 90% 65% at 50% 0%, transparent 40%, #0b0f0d 100%)' }}
      />
    </div>
  )
}

/* ---------------- Sidebar ---------------- */

function Sidebar({ route, nav, mobileOpen, setMobileOpen }: { route: string; nav: Nav; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const [openSubs, setOpenSubs] = useState<Set<string>>(() => new Set())
  // abre la subsección que contiene la ruta activa
  useEffect(() => {
    const sub = SUBSECTIONS.find((s) => s.toolIds.includes(route))
    if (sub) setOpenSubs((prev) => new Set(prev).add(sub.id))
  }, [route])

  const toggleSub = (id: string) => setOpenSubs((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const renderToolButton = (t: ToolDef) => (
    <button
      key={t.id}
      onClick={() => { nav(t.id); setMobileOpen(false) }}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[13px] transition-all',
        route === t.id ? 'bg-acento/10 text-acento' : 'text-grey hover:bg-panel hover:text-ink',
      )}
    >
      <t.icon size={14} className={cn('shrink-0', route === t.id ? 'text-acento' : 'text-grey group-hover:text-ink')} />
      <span className="truncate">{t.short}</span>
      {t.ported && <span className="ml-auto shrink-0 font-mono text-[8px] uppercase tracking-wider text-grey/50">port</span>}
    </button>
  )

  const content = (
    <div className="flex h-full flex-col overflow-y-auto">
      <button onClick={() => { nav('home'); setMobileOpen(false) }} className="flex items-center gap-2.5 border-b border-edge px-5 py-4 text-left">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-acento/40 bg-acento/15 font-mono text-sm font-bold text-acento shadow-glow">{'>_'}</span>
        <span className="font-mono text-base font-bold text-white">
          Hack<span className="text-acento">Nexus</span>
          <span className="animate-blink text-acento">_</span>
        </span>
      </button>

      <div className="flex-1 px-3 py-4">
        <button
          onClick={() => { nav('home'); setMobileOpen(false) }}
          className={cn(
            'mb-3 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-mono text-[13px] transition-colors',
            route === 'home' ? 'bg-acento/10 text-acento' : 'text-grey hover:bg-panel hover:text-ink',
          )}
        >
          <ChevronRight size={14} /> Inicio
        </button>

        {/* páginas destacadas */}
        <div className="mb-4">
          <div className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.25em] text-acento">// destacado</div>
          {SPECIAL_PAGES.map((p) => (
            <button
              key={p.id}
              onClick={() => { nav(p.id); setMobileOpen(false) }}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all',
                route === p.id ? 'bg-acento/10 text-acento' : 'text-grey hover:bg-panel hover:text-ink',
              )}
            >
              <p.icon size={14} className={cn('shrink-0', route === p.id ? 'text-acento' : 'text-grey group-hover:text-ink')} />
              <span className="truncate">{p.name}</span>
              <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full border border-acento/40 px-1.5 py-0.5 font-mono text-[8px] uppercase text-acento">
                <Star size={7} /> nuevo
              </span>
            </button>
          ))}
        </div>

        {CATEGORIES.map((cat) => {
          const catTools = TOOLS.filter((t) => t.category === cat)
          const catSubs = SUBSECTIONS.filter((s) => s.category === cat)
          const subIds = new Set(catSubs.flatMap((s) => s.toolIds))
          const looseTools = catTools.filter((t) => !subIds.has(t.id))
          return (
            <div key={cat} className="mb-4">
              <div className={cn('mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.25em]', CATEGORY_COLORS[cat])}>
                {'// '}{cat}
              </div>
              {looseTools.map(renderToolButton)}
              {catSubs.map((sub) => {
                const open = openSubs.has(sub.id)
                const anyActive = sub.toolIds.includes(route)
                return (
                  <div key={sub.id} className="mt-1">
                    <button
                      onClick={() => toggleSub(sub.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[12.5px] transition-all',
                        anyActive ? 'text-acento' : 'text-grey hover:bg-panel hover:text-ink',
                      )}
                    >
                      <FolderTree size={13} className="shrink-0" />
                      <span className="truncate font-medium">{sub.label}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-1">
                        <span className="rounded border border-edge px-1 font-mono text-[9px] text-grey/70">{sub.toolIds.length}</span>
                        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-3 border-l border-edge pl-2">
                            {sub.toolIds.map((tid) => {
                              const t = TOOLS.find((x) => x.id === tid)
                              return t ? renderToolButton(t) : null
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="border-t border-edge px-5 py-3.5">
        <a
          href="https://github.com/D1se0"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 font-mono text-[11px] text-grey transition-colors hover:text-acento"
        >
          <Github size={13} /> github.com/D1se0
        </a>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-grey/60">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> v1.0.0 — 100% client-side
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-edge bg-base/90 backdrop-blur-xl lg:block">{content}</aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-[70] w-64 border-r border-edge bg-base lg:hidden"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-grey hover:text-ink"><X size={18} /></button>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------------- Layout ---------------- */

export function Layout({ route, nav, children }: { route: string; nav: Nav; children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <Sidebar route={route} nav={nav} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="lg:pl-60">
        {/* topbar */}
        <header
          className={cn(
            'fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b px-4 transition-all duration-300 lg:left-60',
            scrolled ? 'border-edge bg-base/85 shadow-glass backdrop-blur-xl' : 'border-transparent bg-transparent',
          )}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-md border border-edge p-1.5 text-grey lg:hidden"><Menu size={16} /></button>
            <span className="hidden font-mono text-[11px] text-grey md:block">
              <span className="text-acento">d1se0@hacknexus</span>:<span className="text-info">~/tools</span>$ {route === 'home' ? 'ls -la' : `open ${route}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-edge bg-panel/70 px-3 py-1.5 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-ink"
            >
              <Search size={12} />
              <span className="hidden sm:inline">Buscar herramienta…</span>
              <span className="flex items-center gap-0.5">
                <Command size={10} /><span className="kbd ml-1 scale-90 px-1 py-0">K</span>
              </span>
            </button>
            <a
              href="https://github.com/D1se0"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-acento/40 p-1.5 text-acento transition-all hover:bg-acento/10 hover:shadow-glow"
            >
              <Github size={16} />
            </a>
          </div>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24 pt-20 md:px-8">{children}</main>

        <footer className="border-t border-edge px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 font-mono text-[11px] text-grey md:flex-row">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
              HackNexus v1.0.0 — by <span className="text-ink">D1se0</span>
            </span>
            <span className="text-center">Uso exclusivo en auditorías autorizadas y educación. No me hago responsable del mal uso.</span>
          </div>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} nav={nav} />
    </div>
  )
}

/* ---------------- Hero (home) ---------------- */

export { Typewriter }