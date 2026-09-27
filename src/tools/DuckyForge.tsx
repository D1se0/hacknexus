import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, Plus, Trash2, ChevronUp, ChevronDown, BookOpen, AlertTriangle, Download, Usb } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Button, Badge, Reveal, CopyBlock, InfoBanner } from '../components/ui'
import { download } from '../lib/util'
import {
  DUCKY_BLOCK_DEFS, DUCKY_KIND_ORDER, DUCKY_PRESETS, presetToBlocks,
  buildDuckyScript, newDuckyBlock, type DuckyBlock, type DuckyKind, type DuckyTarget,
} from '../lib/duckyforge'

const TARGETS: { id: DuckyTarget; label: string; hint: string }[] = [
  { id: 'classic', label: 'Rubber Ducky clásico', hint: 'DuckyScript v1 · Twin Duck · igual válido en Flipper' },
  { id: 'flipper', label: 'Flipper Zero (badUSB)', hint: 'DuckyScript v1 + extensiones Flipper' },
]

export default function DuckyForge() {
  const [target, setTarget] = useState<DuckyTarget>('classic')
  const [blocks, setBlocks] = useState<DuckyBlock[]>(() => presetToBlocks(DUCKY_PRESETS[0]))
  const [openId, setOpenId] = useState<string | null>(null)

  const result = buildDuckyScript(blocks, target)

  const add = (kind: DuckyKind) => setBlocks((b) => [...b, newDuckyBlock(kind)])
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
  const applyPreset = (pid: string) => {
    const p = DUCKY_PRESETS.find((x) => x.id === pid)
    if (!p) return
    setTarget(p.target)
    setBlocks(presetToBlocks(p))
    setOpenId(null)
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Keyboard}
        title="DuckyScript Builder"
        desc="Compón payloads badUSB por bloques para USB Rubber Ducky y Flipper Zero: presets didácticos, compatibilidad por objetivo y explicación de cada instrucción — para laboratorio y awareness"
        badge="badUSB"
      />

      <InfoBanner>
        ⚖ Un badUSB se hace pasar por teclado: el SO confía ciegamente en él. Úsalo SOLO en tu equipo o laboratorio autorizado — conectarlo a equipos ajenos sin permiso es delito de acceso no autorizado.
      </InfoBanner>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[380px_1fr]">
        {/* ─── objetivo + presets + paleta + bloques ─── */}
        <div className="min-w-0 space-y-4">
          <Reveal>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-grey">
                <Usb size={13} className="text-acento" /> objetivo
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTarget(t.id)}
                    className={`rounded-lg border px-3 py-2 text-left font-mono text-[11px] transition-all ${target === t.id ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:border-acento/40'}`}
                  >
                    {t.label}
                    <span className="mt-0.5 block text-[9.5px] leading-snug text-grey/70">{t.hint}</span>
                  </button>
                ))}
              </div>
              <h3 className="mb-3 mt-5 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-grey">
                <BookOpen size={13} className="text-acento" /> presets didácticos
              </h3>
              <div className="space-y-1.5">
                {DUCKY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    title={p.desc}
                    className="w-full rounded-lg border border-edge px-3 py-2 text-left transition-all hover:border-acento/50 hover:bg-acento/5"
                  >
                    <p className="flex items-center gap-2 font-mono text-[11.5px] font-bold text-ink">
                      <span>{p.icon}</span>{p.name}
                      <Badge tone={p.target === 'flipper' ? 'info' : 'neutral'} className="ml-auto shrink-0">{p.target === 'flipper' ? 'flipper' : 'clásico'}</Badge>
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-grey">{p.note ?? p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.04}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-grey">
                <Plus size={13} className="text-acento" /> añadir instrucción
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
                {DUCKY_KIND_ORDER.map((k) => {
                  const d = DUCKY_BLOCK_DEFS[k]
                  return (
                    <button
                      key={k}
                      onClick={() => add(k)}
                      title={d.desc}
                      className="flex items-center gap-2 rounded-lg border border-edge px-2.5 py-2 text-left font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:bg-acento/5 hover:text-acento"
                    >
                      <span>{d.icon}</span>
                      <span className="truncate">{d.label}</span>
                      {d.flipperOnly && <span className="ml-auto shrink-0 text-[9px] text-info">flipper</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </Reveal>

          {/* bloques añadidos */}
          <div className="space-y-2">
            {blocks.map((b, i) => {
              const d = DUCKY_BLOCK_DEFS[b.kind]
              const open = openId === b.id
              return (
                <motion.div key={b.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden p-0">
                  <div className="flex items-center gap-2 px-3.5 py-2.5">
                    <span className="font-mono text-[10px] text-grey/50">{String(i + 1).padStart(2, '0')}</span>
                    <span>{d.icon}</span>
                    <button onClick={() => setOpenId(open ? null : b.id)} className="flex-1 truncate text-left font-mono text-xs text-ink hover:text-acento">
                      {d.label}
                    </button>
                    {d.flipperOnly && <span className="shrink-0 font-mono text-[9px] text-info">F</span>}
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
                              {f.type === 'select' ? (
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
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] text-grey">
                payload.txt · {result.lines} líneas · <span className="text-acento">{blocks.length}</span> bloques · objetivo <span className="text-acento">{target === 'flipper' ? 'Flipper Zero' : 'clásico'}</span>
              </p>
              <Button variant="ghost" onClick={() => { download('payload.txt', result.script, 'text/plain') }}>
                <Download size={14} /> descargar .txt
              </Button>
            </div>
            <div className="mt-2">
              <CopyBlock text={result.script} label="payload.txt · DuckyScript" maxH="max-h-[520px]" />
            </div>
          </Reveal>

          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-xs font-bold text-warn">
                <AlertTriangle size={13} /> avisos de compatibilidad
              </div>
              <ul className="list-inside list-disc font-mono text-[11px] text-warn/80">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <Reveal delay={0.1}>
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
                <BookOpen size={15} className="text-acento" /> cómo se usa
              </h3>
              <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-grey">
                <li><Badge tone="accent">1</Badge> Elige un preset o compón tu payload con la paleta: cada bloque trae su explicación y se reordena con las flechas.</li>
                <li><Badge tone="accent">2</Badge> En el Flipper Zero: qFlipper → carpeta <code className="text-info">badusb</code> → guarda el .txt → ábrelo y pulsa «Run». En el Ducky clásico: guarda la micro-SD como <code className="text-info">payload.dd</code> ( Twin Duck / DuckEncoder).</li>
                <li><Badge tone="accent">3</Badge> El <code className="text-info">DELAY 3000</code> inicial no es opcional: es el tiempo que tarda el SO en montar el «teclado». Sin él, el payload empieza a teclear al vacío.</li>
              </ol>
              <p className="mt-3 rounded-lg border border-bad/25 bg-bad/5 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-bad/90">
                ⚖ Regla del laboratorio: badUSB solo contra hardware tuyo o autorizado por escrito. Los presets de aquí son reversibles y didácticos a propósito; lo que hagas después con la técnica es responsabilidad tuya.
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-grey/70">
                Dato azul: las defensas reales contra badUSB no son el antivirus sino políticas de bloqueo de USB HID no listadas (usbguard), deshabilitar Autorun… y formar a la gente: el payload de awareness está en los presets por algo.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
