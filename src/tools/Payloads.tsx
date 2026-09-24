import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, Copy, ChevronRight } from 'lucide-react'
import { ToolHeader, CopyBtn, Badge, Reveal, useToast } from '../components/ui'
import { SQLI_PAYLOADS, XSS_PAYLOADS, SSRF_PAYLOADS, LFI_PAYLOADS, FUZZ_LISTS } from '../lib/payloads'
import { b64Encode, urlEncodeAll, urlEncode, htmlEntities, unicodeEscape } from '../lib/encoders'
import { cn } from '../lib/util'

interface Group {
  name: string
  payloads: string[] | { name: string; payloads: string[] }[]
}

const TABS = ['SQLi', 'XSS', 'SSRF', 'LFI', 'Fuzzing'] as const
type Tab = (typeof TABS)[number]

type Enc = 'raw' | 'url' | 'urlall' | 'b64' | 'html' | 'unicode'
const ENC_LABEL: Record<Enc, string> = { raw: 'raw', url: 'url', urlall: 'url-all', b64: 'base64', html: 'html', unicode: 'unicode' }

function applyEnc(p: string, enc: Enc): string {
  switch (enc) {
    case 'raw': return p
    case 'url': return urlEncode(p)
    case 'urlall': return urlEncodeAll(p)
    case 'b64': return b64Encode(p)
    case 'html': return htmlEntities(p)
    case 'unicode': return unicodeEscape(p)
  }
}

export default function Payloads() {
  const [tab, setTab] = useState<Tab>('SQLi')
  const [q, setQ] = useState('')
  const [enc, setEnc] = useState<Enc>('raw')
  const [open, setOpen] = useState<string | null>(null)
  const toast = useToast()

  const groups: Group[] = useMemo(() => {
    if (tab === 'SQLi') return SQLI_PAYLOADS
    if (tab === 'XSS') return XSS_PAYLOADS
    if (tab === 'SSRF') return [{ name: 'SSRF / cloud metadata / gopher', payloads: SSRF_PAYLOADS }]
    if (tab === 'LFI') return [{ name: 'Path traversal, php://filters y logs', payloads: LFI_PAYLOADS }]
    return FUZZ_LISTS.map((f) => ({ name: f.name, payloads: f.words }))
  }, [tab])

  const qn = q.trim().toLowerCase()
  const filtered = groups
    .map((g) => {
      const items = Array.isArray(g.payloads)
        ? typeof g.payloads[0] === 'string'
          ? (g.payloads as string[]).filter((p) => !qn || p.toLowerCase().includes(qn))
          : (g.payloads as { name: string; payloads: string[] }[])
              .map((sub) => ({ ...sub, payloads: sub.payloads.filter((p) => !qn || p.toLowerCase().includes(qn) || sub.name.toLowerCase().includes(qn)) }))
              .filter((sub) => sub.payloads.length)
        : []
      return { name: g.name, payloads: items as string[] }
    })
    .filter((g) => (Array.isArray(g.payloads) ? g.payloads.length > 0 : false))

  const copyAll = (payloads: string[]) => {
    navigator.clipboard.writeText(payloads.join('\n'))
    toast(`${payloads.length} payloads copiados`)
  }

  return (
    <div>
      <ToolHeader icon={Bug} title="Payload Arsenal" desc="Inyecciones y payloads curados con encoder integrado — para Burp, ffuf o a mano" />

      <Reveal>
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-lg border px-4 py-2 font-mono text-sm transition-all',
                tab === t ? 'border-acento/60 bg-acento/15 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink',
              )}
            >
              {t}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filtrar payloads…"
            className="ml-auto w-48 rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-acento/60"
          />
          <div className="flex gap-1">
            {(Object.keys(ENC_LABEL) as Enc[]).map((e) => (
              <button
                key={e}
                onClick={() => setEnc(e)}
                className={cn(
                  'rounded-md border px-2 py-2 font-mono text-[10px] transition-all',
                  enc === e ? 'border-info/60 bg-info/15 text-info' : 'border-edge text-grey hover:text-ink',
                )}
                title={`encode ${ENC_LABEL[e]}`}
              >
                {ENC_LABEL[e]}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-4">
        {filtered.map((g, gi) => {
          const key = `${tab}-${g.name}`
          const isOpen = open === key
          const list = Array.isArray(g.payloads) ? (typeof g.payloads[0] === 'string' ? g.payloads : []) : []
          const subgroups = Array.isArray(g.payloads) && typeof g.payloads[0] !== 'string' ? (g.payloads as unknown as { name: string; payloads: string[] }[]) : []
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }} className="card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : key)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
                <ChevronRight size={14} className={cn('text-grey transition-transform', isOpen && 'rotate-90')} />
                <span className="font-mono text-sm font-bold text-white">{g.name}</span>
                <Badge tone="neutral">{list.length || subgroups.reduce((a, s) => a + s.payloads.length, 0)}</Badge>
                {list.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); copyAll(list.map((p) => applyEnc(p, enc))) }}
                    className="ml-auto flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 font-mono text-[10px] text-grey hover:border-acento/50 hover:text-acento"
                  >
                    <Copy size={10} /> copiar todos
                  </button>
                )}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-edge/50 px-5 py-3">
                      {list.map((p) => (
                        <div key={p} className="group flex items-start gap-2 border-b border-edge/40 py-2 last:border-0">
                          <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-ink group-hover:text-white">{applyEnc(p, enc)}</code>
                          <CopyBtn text={applyEnc(p, enc)} className="shrink-0 border-0 bg-transparent px-1 py-0.5 opacity-0 group-hover:opacity-100" />
                        </div>
                      ))}
                      {subgroups.map((sub) => (
                        <div key={sub.name} className="py-2">
                          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-acento">{sub.name}</div>
                          {sub.payloads.map((p) => (
                            <div key={p} className="group flex items-start gap-2 border-b border-edge/40 py-2 last:border-0">
                              <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-ink group-hover:text-white">{applyEnc(p, enc)}</code>
                              <CopyBtn text={applyEnc(p, enc)} className="shrink-0 border-0 bg-transparent px-1 py-0.5 opacity-0 group-hover:opacity-100" />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      <Reveal>
        <div className="mt-6 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-warn/90">
          ⚠️ Solo contra sistemas que autorices. Reemplaza ATTACKER por tu IP/colaborador (Burp Collaborator, interact.sh).
        </div>
      </Reveal>
    </div>
  )
}