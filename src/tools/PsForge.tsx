import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileTerminal, Plus, Trash2, ChevronUp, ChevronDown, BookOpen, AlertTriangle } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Button, Badge, Reveal, CopyBlock } from '../components/ui'
import { PS_BLOCK_DEFS, PS_KIND_ORDER, PS_DEFAULT_SCRIPT, buildPsScript, newPsBlock, type PSBlock, type PSBlockKind } from '../lib/psforge'

export default function PsForge() {
  const [blocks, setBlocks] = useState<PSBlock[]>(PS_DEFAULT_SCRIPT.map((k, i) => newPsBlock(k, i)))
  const [openId, setOpenId] = useState<string | null>(null)

  const result = buildPsScript(blocks)

  const add = (kind: PSBlockKind) => setBlocks((b) => [...b, newPsBlock(kind, b.length)])
  const remove = (id: string) => setBlocks((b) => b.filter((x) => x.id !== id))
  const move = (idx: number, dir: -1 | 1) => setBlocks((b) => {
    const n = [...b]
    const j = idx + dir
    if (j < 0 || j >= n.length) return b
    ;[n[idx], n[j]] = [n[j], n[idx]]
    return n
  })
  const setParam = (id: string, key: string, v: string | number | boolean) => setBlocks((b) =>
    b.map((x) => (x.id === id ? { ...x, params: { ...x.params, [key]: v } } : x)),
  )

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={FileTerminal}
        title="PowerShell Script Forge"
        desc="Compón scripts PowerShell por bloques: StrictMode, param() tipado, Test-NetConnection, transcript y try/catch — con explicación de cada pieza"
        badge="PS 5.1 / 7"
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[380px_1fr]">
        {/* ─── paleta + bloques ─── */}
        <div className="min-w-0 space-y-4">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-grey">
                <Plus size={13} className="text-acento" /> añadir bloque
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
                {PS_KIND_ORDER.map((k) => {
                  const d = PS_BLOCK_DEFS[k]
                  return (
                    <button
                      key={k}
                      onClick={() => add(k)}
                      title={d.desc}
                      className="flex items-center gap-2 rounded-lg border border-edge px-2.5 py-2 text-left font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:bg-acento/5 hover:text-acento"
                    >
                      <span>{d.icon}</span>
                      <span className="truncate">{d.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>

          <div className="space-y-2">
            {blocks.map((b, i) => {
              const d = PS_BLOCK_DEFS[b.kind]
              const open = openId === b.id
              return (
                <motion.div key={b.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden p-0">
                  <div className="flex items-center gap-2 px-3.5 py-2.5">
                    <span className="font-mono text-[10px] text-grey/50">{String(i + 1).padStart(2, '0')}</span>
                    <span>{d.icon}</span>
                    <button onClick={() => setOpenId(open ? null : b.id)} className="flex-1 truncate text-left font-mono text-xs text-ink hover:text-acento">
                      {d.label}
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-grey hover:text-acento disabled:opacity-20"><ChevronUp size={13} /></button>
                      <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="rounded p-1 text-grey hover:text-acento disabled:opacity-20"><ChevronDown size={13} /></button>
                      <button onClick={() => remove(b.id)} className="rounded p-1 text-grey hover:text-bad"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-3 border-t border-edge px-3.5 py-3">
                          <p className="text-[11px] leading-relaxed text-grey">{d.desc}</p>
                          {d.fields.map((f) => (
                            <Field key={f.key} label={f.label}>
                              {f.type === 'toggle' ? (
                                <button
                                  onClick={() => setParam(b.id, f.key, !b.params[f.key])}
                                  className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all ${b.params[f.key] ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey'}`}
                                >
                                  {b.params[f.key] ? 'activado' : 'desactivado'}
                                </button>
                              ) : f.type === 'select' ? (
                                <select
                                  value={String(b.params[f.key])}
                                  onChange={(e) => setParam(b.id, f.key, e.target.value)}
                                  className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-acento/60"
                                >
                                  {(f.options ?? []).map((o) => <option key={o} value={o} className="bg-panel">{o}</option>)}
                                </select>
                              ) : f.area ? (
                                <TextArea value={String(b.params[f.key])} onChange={(e) => setParam(b.id, f.key, e.target.value)} className="min-h-20 text-xs" placeholder={f.ph} />
                              ) : (
                                <TextInput value={String(b.params[f.key])} onChange={(e) => setParam(b.id, f.key, e.target.value)} className="py-2 text-xs" placeholder={f.ph} />
                              )}
                            </Field>
                          ))}
                          <div className="rounded-lg border border-info/25 bg-info/5 px-3 py-2.5 text-[11px] leading-relaxed text-info/90">
                            💡 {d.learn}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* ─── salida ─── */}
        <div className="min-w-0 space-y-4">
          <Reveal delay={0.05}>
            <CopyBlock text={result.script} label={`script.ps1 · ${result.lines} líneas`} maxH="max-h-[560px]" />
          </Reveal>

          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-xs font-bold text-warn">
                <AlertTriangle size={13} /> avisos
              </div>
              <ul className="list-inside list-disc font-mono text-[11px] text-warn/80">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <Reveal delay={0.1}>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                <BookOpen size={15} className="text-acento" /> cómo ejecutarlo
              </h3>
              <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-grey">
                <li><Badge tone="accent">1</Badge> Guarda el script como <code className="text-info">script.ps1</code> y copia con el botón.</li>
                <li><Badge tone="accent">2</Badge> Si te bloquea la política de ejecución (por defecto en Windows): <code className="text-info">Set-ExecutionPolicy -Scope Process Bypass</code>.</li>
                <li><Badge tone="accent">3</Badge> Ejecuta con <code className="text-info">.\\script.ps1 -ComputerName DC01</code>: los parámetros del bloque param() salen en el tabulador.</li>
              </ol>
              <p className="mt-3 rounded-lg border border-edge bg-black/30 px-3.5 py-2.5 font-mono text-[11px] text-grey">
                Set-ExecutionPolicy -Scope Process Bypass; .\script.ps1 -ComputerName DC01
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-grey/70">
                El transcript es tu mejor amigo: graba consola y objetos a fichero con timestamp, ideal como evidencia en administración y blue team. Recuerda que PS pasa OBJETOS por el pipeline, no texto: es su superpoder frente a bash.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
