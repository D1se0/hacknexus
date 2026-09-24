import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TerminalSquare, Copy, ChevronRight } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextInput, Badge, CopyBlock, Reveal, useToast } from '../components/ui'
import { REV_SHELLS, listeners } from '../lib/payloads'
import { b64Encode, urlEncode } from '../lib/encoders'
import { cn } from '../lib/util'

export default function Revshells() {
  const [ip, setIp] = useState('10.10.14.5')
  const [port, setPort] = useState('443')
  const [cat, setCat] = useState('Todas')
  const [query, setQuery] = useState('')
  const [obf, setObf] = useState<'raw' | 'b64' | 'url'>('raw')
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const toast = useToast()

  const cats = ['Todas', ...new Set(REV_SHELLS.map((s) => s.category))]
  const filtered = useMemo(() => {
    let list = cat === 'Todas' ? REV_SHELLS : REV_SHELLS.filter((s) => s.category === cat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
    }
    return list
  }, [cat, query])

  const encode = (cmd: string): string => {
    if (obf === 'b64') return `echo ${b64Encode(cmd)} | base64 -d | bash`
    if (obf === 'url') return urlEncode(cmd)
    return cmd
  }

  const copyShell = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    toast('Payload copiado — escucha preparada?')
  }

  return (
    <div>
      <ToolHeader icon={TerminalSquare} title="Reverse Shells" desc="36 payloads multiplataforma con sustitución automática de IP/puerto, listeners y upgrade a PTY — portado de revShellsGenerator-page" badge="ported" />

      <Reveal>
        <div className="card grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto_auto]">
          <Field label="LHOST (tu IP)">
            <TextInput value={ip} onChange={(e) => setIp(e.target.value)} className="font-mono" />
          </Field>
          <Field label="LPORT">
            <TextInput value={port} onChange={(e) => setPort(e.target.value)} className="font-mono" />
          </Field>
          <div className="content-end">
            <div className="flex gap-1">
              {(['raw', 'b64', 'url'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setObf(m)}
                  className={cn(
                    'rounded-md border px-2.5 py-2 font-mono text-[11px] transition-all',
                    obf === m ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="content-end">
            <div className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 font-mono text-[11px] text-ok">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> escucha en :{port}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 font-mono text-xs transition-all',
                cat === c ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-acento/40 hover:text-ink',
              )}
            >
              {c}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filtrar…"
            className="ml-auto w-40 rounded-lg border border-edge bg-black/40 px-3 py-1.5 font-mono text-xs text-ink outline-none focus:border-acento/60"
          />
        </div>
      </Reveal>

      <div className="mt-5 grid gap-3">
        <AnimatePresence>
          {filtered.map((s, i) => {
            const cmd = encode(s.command(ip, port))
            const open = openIdx === i
            return (
              <motion.div
                key={s.name}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="card overflow-hidden"
              >
                <button onClick={() => setOpenIdx(open ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <ChevronRight size={14} className={cn('shrink-0 text-grey transition-transform', open && 'rotate-90')} />
                  <span className="font-mono text-sm font-bold text-white">{s.name}</span>
                  <Badge tone={s.os === 'linux' ? 'accent' : s.os === 'windows' ? 'info' : 'neutral'}>{s.os}</Badge>
                  <Badge tone="neutral">{s.category}</Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyShell(cmd) }}
                    className="ml-auto flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento"
                  >
                    <Copy size={11} /> copiar payload
                  </button>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4">
                        <CopyBlock text={cmd} label={s.name} />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {listeners(ip, port).slice(0, 4).map((l) => (
                            <button
                              key={l.name}
                              onClick={() => { navigator.clipboard.writeText(l.cmd); toast(`Listener copiado: ${l.name}`) }}
                              className="rounded-md border border-edge bg-panel px-2.5 py-1.5 font-mono text-[10px] text-grey transition-all hover:border-ok/50 hover:text-ok"
                              title={l.cmd}
                            >
                              ▶ {l.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-4 font-mono text-sm font-bold text-white">⬆️ Upgrade a TTY completo (Linux)</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <CopyBlock label="1. python PTY" text={'python3 -c \'import pty; pty.spawn("/bin/bash")\''} />
            <CopyBlock label="2. Ctrl+Z y en TU máquina" text={'stty raw -echo; fg\nexport TERM=xterm'} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CopyBlock label="script (más fiable)" text={'script -qc /bin/bash /dev/null\n# luego Ctrl+Z → stty raw -echo; fg'} />
            <CopyBlock label="extras dentro de la shell" text={'export SHELL=bash; export TERM=xterm-256color\nstty rows 40 cols 160'} />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-warn/90">
          ⚠️ Uso exclusivo en entornos autorizados (labs, CTFs, pentests con contrato). El uso no autorizado es ilegal.
        </div>
      </Reveal>
    </div>
  )
}