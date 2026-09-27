import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftRight, AlertTriangle, Info, CheckCircle2, Wand2, FileCode2, Percent, ListChecks } from 'lucide-react'
import { ToolHeader, Field, TextArea, Button, Badge, Reveal, CopyBlock, CopyBtn } from '../components/ui'
import { translate, TRANS_LANGS, TRANS_EXAMPLES, langMeta, type TransLang } from '../lib/langtrans'

const LANG_COLORS: Record<TransLang, string> = {
  python: '#3776ab', javascript: '#f7df1e', typescript: '#3178c6', java: '#e76f00',
  csharp: '#68217a', go: '#00add8', ruby: '#cc342d', php: '#777bb4',
}

export default function LangTrans() {
  const [from, setFrom] = useState<TransLang>('python')
  const [to, setTo] = useState<TransLang>('java')
  const [src, setSrc] = useState(TRANS_EXAMPLES.python)

  const result = useMemo(() => translate(src, from, to), [src, from, to])

  const swap = () => {
    const f = from
    setFrom(to)
    setTo(f)
    // el código de salida era del lenguaje destino: lo usamos como nueva entrada si no era TODO/comments
    if (!/TODO \(línea/.test(result.code)) setSrc(result.code)
  }

  const loadExample = (l: TransLang) => {
    setSrc(TRANS_EXAMPLES[l])
    setFrom(l)
  }

  const confTone = result.confidence >= 90 ? 'ok' : result.confidence >= 60 ? 'warn' : 'bad'

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={ArrowLeftRight}
        title="Lang Trans"
        desc="Traduce código entre Python, JavaScript, TypeScript, Java, C#, Go, Ruby y PHP — parser local sin IA ni servidores, con % de confianza real y marcado de lo que no entiende"
        badge="100% local"
      />

      {/* selector de lenguajes */}
      <Reveal>
        <div className="card p-5">
          <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Field label="lenguaje origen">
              <div className="flex flex-wrap gap-1.5">
                {TRANS_LANGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { if (l.id !== to) { setFrom(l.id); if (!src.trim() || src === TRANS_EXAMPLES[from]) setSrc(TRANS_EXAMPLES[l.id]) } }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                      from === l.id ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[l.id] }} />
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex justify-center pb-1">
              <button
                onClick={swap}
                title="intercambiar origen y destino"
                className="rounded-full border border-acento/40 bg-acento/10 p-2.5 text-acento transition-all hover:scale-110 hover:bg-acento/20"
              >
                <ArrowLeftRight size={16} />
              </button>
            </div>
            <Field label="lenguaje destino">
              <div className="flex flex-wrap gap-1.5">
                {TRANS_LANGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { if (l.id !== from) setTo(l.id) }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                      to === l.id ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[l.id] }} />
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
        {/* ─── entrada ─── */}
        <Reveal>
          <div className="card min-w-0 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs text-grey">
                <FileCode2 size={14} className="text-acento" />
                código en {langMeta(from).label} <span className="text-grey/50">(.{langMeta(from).ext})</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => loadExample(from)} className="rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-grey transition-colors hover:border-acento/50 hover:text-acento">
                  ejemplo
                </button>
                <CopyBtn text={src} className="border-0 bg-transparent px-1 py-0.5" />
              </div>
            </div>
            <TextArea
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              spellCheck={false}
              className="min-h-[380px] font-mono text-[12.5px] leading-relaxed"
              placeholder={`pega aquí tu código ${langMeta(from).label}…`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TRANS_LANGS.filter((l) => l.id !== from).slice(0, 7).map((l) => (
                <button
                  key={l.id}
                  onClick={() => loadExample(l.id)}
                  className="rounded border border-edge/60 px-2 py-0.5 font-mono text-[10px] text-grey/80 transition-colors hover:border-acento/40 hover:text-acento"
                >
                  demo {l.label}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ─── salida ─── */}
        <Reveal delay={0.08}>
          <div className="min-w-0 space-y-4">
            {/* stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: 'confianza', v: `${result.confidence}%`, icon: Percent, tone: confTone },
                { k: 'sentencias', v: `${result.stats.translated}/${result.stats.statements}`, icon: ListChecks, tone: 'accent' },
                { k: 'sin traducir', v: `${result.stats.raw}`, icon: AlertTriangle, tone: result.stats.raw > 0 ? 'warn' : 'ok' },
                { k: 'funciones', v: `${result.stats.funcs}`, icon: Wand2, tone: 'info' },
              ].map((s) => (
                <div key={s.k} className="card p-3.5">
                  <s.icon size={15} className={s.tone === 'ok' ? 'text-ok' : s.tone === 'warn' ? 'text-warn' : s.tone === 'bad' ? 'text-bad' : s.tone === 'info' ? 'text-info' : 'text-acento'} />
                  <p className="mt-1.5 font-mono text-lg font-bold text-white">{s.v}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-grey">{s.k}</p>
                </div>
              ))}
            </div>

            <CopyBlock text={result.code} label={`${langMeta(to).label} · ${langMeta(to).ext}`} maxH="max-h-[300px]" />

            {/* issues */}
            <AnimatePresence>
              {result.issues.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-warn/30 bg-warn/5 p-4">
                  <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold text-warn">
                    <AlertTriangle size={14} /> {result.issues.length} aviso(s) del parser
                  </div>
                  <ul className="space-y-1 font-mono text-[11px] text-warn/80">
                    {result.issues.slice(0, 8).map((i, n) => (
                      <li key={n}>{i.line ? <span className="text-grey">línea {i.line}:</span> : ''} {i.text}</li>
                    ))}
                    {result.issues.length > 8 && <li className="text-grey">…y {result.issues.length - 8} más</li>}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* notas */}
            <div className="rounded-xl border border-edge bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold text-info">
                <Info size={14} /> cómo interpretar la traducción
              </div>
              <ul className="space-y-1.5 text-[12px] leading-relaxed text-grey">
                {result.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-acento">▸</span> {n}
                  </li>
                ))}
              </ul>
            </div>

            {result.confidence === 100 && result.stats.statements > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 font-mono text-xs text-ok">
                <CheckCircle2 size={14} /> Todas las sentencias se tradujeron: revisa igualmente los tipos en lenguajes estáticos.
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.12}>
        <div className="card mt-6 p-5">
          <h3 className="flex items-center gap-2 font-mono text-sm font-bold text-white">
            <Wand2 size={15} className="text-acento" /> ¿Cómo funciona (y hasta dónde llega)?
          </h3>
          <div className="mt-3 grid gap-4 text-[12.5px] leading-relaxed text-grey md:grid-cols-3">
            <div>
              <Badge tone="accent">1 · parse</Badge>
              <p className="mt-2">Un parser por familia de sintaxis (indentación de Python, llaves de C-family, <code className="text-info">end</code> de Ruby, reglas de PHP/Go) convierte tu código a un árbol intermedio (IR).</p>
            </div>
            <div>
              <Badge tone="accent">2 · IR neutro</Badge>
              <p className="mt-2">El IR normaliza construcciones comunes: variables, operadores, interpolación de strings, listas, if/elif/else, bucles for/while/foreach, funciones, print, conversiones y lectura de teclado.</p>
            </div>
            <div>
              <Badge tone="accent">3 · emit</Badge>
              <p className="mt-2">Un emisor por lenguaje genera el código destino con esqueletos (class Main, package+imports) y helpers automáticos. Lo que el IR no entiende queda como <code className="text-warn">TODO (línea N)</code> con el original, jamás se inventa código.</p>
            </div>
          </div>
          <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-warn/90">
            ⚠ No es un compilador: traduce el subconjunto común de construcciones. POO, excepciones, librerías y APIs específicas de cada lenguaje NO se traducen (aparecen marcadas). El % de confianza te dice exactamente cuánto tienes que revisar. Siempre revisa y ejecuta el resultado.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
