import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Plus, Trash2, ChevronUp, ChevronDown, BookOpen, AlertTriangle } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Button, Badge, Reveal } from '../components/ui'
import { CodeBlock } from '../components/highlight'
import { BLOCK_DEFS, KIND_ORDER, DEFAULT_SCRIPT, buildScript, newBlock, type ForgeBlock, type BlockKind } from '../lib/bashforge'

export default function BashForge() {
  const [blocks, setBlocks] = useState<ForgeBlock[]>(DEFAULT_SCRIPT.map((k, i) => newBlock(k, i)))
  const [openId, setOpenId] = useState<string | null>(null)

  const result = buildScript(blocks)

  const add = (kind: BlockKind) => setBlocks((b) => [...b, newBlock(kind, b.length)])
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
        icon={Terminal}
        title="Bash Script Forge"
        desc="Compón scripts Bash por bloques: modo estricto, argumentos, bucles, checks de red, logging coloreado y trap de limpieza — con explicación de cada pieza"
        badge="bash 5"
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
                {KIND_ORDER.map((k) => {
                  const d = BLOCK_DEFS[k]
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

          {/* bloques añadidos */}
          <div className="space-y-2">
            {blocks.map((b, i) => {
              const d = BLOCK_DEFS[b.kind]
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
                                <TextArea
                                  value={String(b.params[f.key])}
                                  onChange={(e) => setParam(b.id, f.key, e.target.value)}
                                  className="min-h-20 text-xs"
                                  placeholder={f.ph}
                                />
                              ) : (
                                <TextInput
                                  value={String(b.params[f.key])}
                                  onChange={(e) => setParam(b.id, f.key, e.target.value)}
                                  className="py-2 text-xs"
                                  placeholder={f.ph}
                                />
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
            <CodeBlock code={result.script} lang="bash" label={`script.sh · ${result.lines} líneas`} maxH="max-h-[560px]" />
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
                <BookOpen size={15} className="text-acento" /> cómo usarlo
              </h3>
              <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-grey">
                <li><Badge tone="accent">1</Badge> Añade bloques desde la paleta: se componen en el orden en que los ves a la izquierda (reordena con las flechas).</li>
                <li><Badge tone="accent">2</Badge> Pulsa sobre el nombre de un bloque para configurarlo; cada uno trae su explicación de por qué se escribe así en bash.</li>
                <li><Badge tone="accent">3</Badge> Copia el resultado, guárdalo como <code className="text-info">script.sh</code>, dale permisos con <code className="text-info">chmod +x</code> y ejecútalo.</li>
              </ol>
              <p className="mt-3 rounded-lg border border-edge bg-black/30 px-3.5 py-2.5 font-mono text-[11px] text-grey">
                chmod +x script.sh && ./script.sh
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-grey/70">
                El <code className="text-info">set -Eeuo pipefail</code> del primer bloque hace que el script aborte ante errores silenciosos: un buen hábito que el 80% de scripts de internet no tiene. El trap de limpieza usa mktemp para que los ficheros temporales no queden huérfanos.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
