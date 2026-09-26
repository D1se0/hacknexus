import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, RotateCcw, Loader2, CheckCircle2, XCircle, BookOpen, FlaskConical, Terminal } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, InfoBanner, CopyBtn } from './ui'
import { CodeArea, CodeView } from './CodeArea'
import { LANG_INDEX } from '../lib/langs'
import { runCode, RUNTIME_LABEL, type RunResult } from '../lib/coderun'
import { cn } from '../lib/util'

const ICON: Record<string, string> = {
  python: '🐍', javascript: '🟨', typescript: '🔷', java: '☕', csharp: '🎯', c: '🔧', cpp: '⚙️',
  php: '🐘', ruby: '💎', go: '🐹', rust: '🦀', lua: '🌙', bash: '🐚', sql: '🗄️', html: '🌐', css: '🎨',
}

export default function LangLab({ langId }: { langId: string }) {
  const lang = LANG_INDEX[langId]
  if (!lang) return <p className="font-mono text-sm text-bad">lenguaje desconocido: {langId}</p>

  const [tab, setTab] = useState<'chuleta' | 'playground'>('chuleta')
  const [code, setCode] = useState(lang.defaultCode)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [autoRun, setAutoRun] = useState(false)
  const [previewDoc, setPreviewDoc] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isWeb = langId === 'html' || langId === 'css'

  // cambia de tool → resetea código (el componente se re-monta por route key, esto cubre HMR)
  useEffect(() => { setCode(lang.defaultCode); setResult(null) }, [langId]) // eslint-disable-line react-hooks/exhaustive-deps

  const doRun = useCallback(async () => {
    if (isWeb) {
      const demo = (lang as typeof lang & { demoHtml?: string }).demoHtml
      const html = langId === 'html'
        ? code
        : demo
          ? demo.replace(/<style>[\s\S]*?<\/style>/, `<style>\n${code}\n</style>`)
          : `<style>\n${code}\n</style><h1>Tu CSS</h1><div class="card"><h2>Card</h2><p>pasa el ratón</p><button class="btn">botón</button></div>`
      setPreviewDoc(html)
      setResult({ ok: true, stdout: 'renderizado en la vista previa ↓', stderr: '', engine: 'iframe', ms: 0 })
      return
    }
    setRunning(true)
    setResult(null)
    setProgress('')
    try {
      const r = await runCode(langId, code, setProgress)
      setResult(r)
    } finally {
      setRunning(false)
      setProgress('')
    }
  }, [code, langId, isWeb])

  // primera ejecución automática al abrir el playground
  useEffect(() => {
    if (tab === 'playground' && !autoRun) {
      setAutoRun(true)
      void doRun()
    }
  }, [tab, autoRun, doRun])

  const statusColor = result ? (result.ok ? 'text-ok' : 'text-bad') : 'text-grey'

  return (
    <div>
      <ToolHeader
        icon={BookOpen}
        title={`CheatSheet ${lang.name}`}
        badge={ICON[langId]}
        desc={`${lang.tagline} — con playground: ejecuta el código de verdad y edita lo que quieras`}
      />

      {/* tabs */}
      <div className="mb-4 flex gap-2">
        {([['chuleta', '📖 Chuleta'], ['playground', '⚡ Playground']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-lg border px-3.5 py-2 font-mono text-xs transition-all',
              tab === id ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'chuleta' ? (
        <div className="space-y-3">
          <InfoBanner>
            <b>{lang.name}</b> — {lang.tagline} <span className="text-grey">· Motor: {lang.engineNote}</span>
          </InfoBanner>
          {lang.sections.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.03}>
              <div className="card p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-grey">0{i + 1}</span>
                  <h3 className="font-mono text-sm font-bold text-white">{s.title}</h3>
                  <CopyBtn text={s.snippet} className="ml-auto" />
                </div>
                <p className="mb-3 text-xs text-grey">{s.desc}</p>
                <CodeView code={s.snippet} language={lang.prism} maxH="22rem" />
              </div>
            </Reveal>
          ))}
          <button
            onClick={() => setTab('playground')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-acento/40 py-3 font-mono text-sm text-acento transition-colors hover:bg-acento/10"
          >
            <FlaskConical size={15} /> probar todo en el playground →
          </button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          {/* editor + consola */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="info">{ICON[langId]} {lang.name}</Badge>
              <Badge tone="neutral">motor: {RUNTIME_LABEL[result?.engine ?? (isWeb ? 'iframe' : langId === 'python' ? 'pyodide' : langId === 'javascript' ? 'js' : 'wandbox')]}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={doRun} disabled={running} className="!px-3 !py-1.5 !text-xs">
                  {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  {running ? 'ejecutando…' : 'ejecutar'}
                </Button>
                <button
                  onClick={() => { setCode(lang.defaultCode); setResult(null) }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey transition-colors hover:text-ink"
                >
                  <RotateCcw size={12} /> reset
                </button>
              </div>
            </div>

            <CodeArea value={code} onChange={setCode} language={lang.prism} minRows={isWeb ? 18 : 16} />

            {isWeb ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-edge">
                <div className="flex items-center gap-2 border-b border-edge bg-black/40 px-3 py-1.5">
                  <span className="flex gap-1"><span className="h-2.5 w-2.5 rounded-full bg-bad/70" /><span className="h-2.5 w-2.5 rounded-full bg-warn/70" /><span className="h-2.5 w-2.5 rounded-full bg-ok/70" /></span>
                  <span className="font-mono text-[10px] text-grey">vista previa · sandbox</span>
                </div>
                <iframe
                  ref={iframeRef}
                  title="preview"
                  sandbox="allow-scripts allow-modals"
                  srcDoc={previewDoc || '<p style="font-family:monospace;color:#666;padding:1rem">pica ▶ ejecutar para renderizar…</p>'}
                  className="h-[380px] w-full bg-white"
                />
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-edge bg-black/60">
                <div className="flex items-center gap-2 border-b border-edge bg-black/40 px-3 py-1.5">
                  <Terminal size={11} className="text-grey" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-grey">salida</span>
                  {result && (
                    <span className={cn('ml-auto flex items-center gap-1.5 font-mono text-[10px]', statusColor)}>
                      {result.ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {result.ok ? 'ok' : 'error'} · {result.ms}ms · {RUNTIME_LABEL[result.engine]}
                    </span>
                  )}
                </div>
                <pre className="code-hx max-h-[340px] overflow-auto p-3 text-[12px] leading-relaxed">
                  {running && progress && <span className="text-warn">{progress}\n</span>}
                  {result ? (
                    <>
                      {result.stdout && <span className="text-ink">{result.stdout}</span>}
                      {result.stderr && <span className="text-bad">{result.stderr}</span>}
                      {!result.stdout && !result.stderr && <span className="text-grey">(sin salida — el programa terminó correctamente)</span>}
                    </>
                  ) : !running ? (
                    <span className="text-grey">pica ▶ ejecutar para correr el código…</span>
                  ) : (
                    <span className="text-grey animate-pulse">esperando resultado…</span>
                  )}
                </pre>
              </div>
            )}
          </div>

          {/* panel lateral */}
          <div className="space-y-3">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-edge bg-black/30 p-4">
              <h4 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-acento">cómo se ejecuta</h4>
              <p className="text-[11.5px] leading-relaxed text-grey">{lang.engineNote}</p>
              {!isWeb && (
                <ul className="mt-3 space-y-1.5 text-[11px] text-grey">
                  <li>• <b className="text-ink">Python</b> corre en tu navegador (WASM): tu código no sale de la máquina.</li>
                  <li>• El resto se envía a Wandbox (compilador online público): solo viaja el código del editor.</li>
                  <li>• Timeout de 60s; si un runtime está saturado, reintenta en un minuto.</li>
                </ul>
              )}
            </motion.div>

            <div className="rounded-lg border border-edge bg-black/30 p-4">
              <h4 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-acento">ideas para romper cosas</h4>
              <ul className="space-y-1.5 text-[11px] text-grey">
                {langId === 'python' && <><li>• Cambia la lista <code className="text-acento">puertos</code> y añade el 8080</li><li>• Prueba a romper el JSON del try/except</li><li>• Añade un <code className="text-acento">while True</code>… y descubre el límite de tiempo</li></>}
                {langId === 'javascript' && <><li>• <code className="text-acento">console.table</code> con objetos anidados</li><li>• Provoca un TypeError a propósito</li><li>• Prueba <code className="text-acento">[] + {}</code> y <code className="text-acento">{'}' + '+[]'}</code></li></>}
                {langId === 'java' && <><li>• Cambia <code className="text-acento">class main</code> a <code className="text-acento">public class Main</code> y lee el error</li><li>• Añade un Stream con filter por longitud</li></>}
                {langId === 'sql' && <><li>· Añade una tabla <code className="text-acento">flags</code> con FOREIGN KEY</li><li>· Prueba el payload <code className="text-acento">' OR '1'='1</code> del final</li></>}
                {langId === 'bash' && <><li>· Ejecuta <code className="text-acento">uname -a</code> y <code className="text-acento">id</code></li><li>· Rompe un if sin fi y lee stderr</li></>}
                {langId === 'c' && <><li>· Quitar el free() — sin consecuencias aquí, pero acostúmbrate</li><li>· sprintf(buf, &quot;%s&quot;, algo_muy_largo)</li></>}
                {!['python','javascript','java','sql','bash','c'].includes(langId) && <li>· Modifica el código, ejecuta, compara salidas. Así se aprende un lenguaje: rompiéndolo.</li>}
              </ul>
            </div>

            {result && !isWeb && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn('rounded-lg border p-4', result.ok ? 'border-ok/40 bg-ok/5' : 'border-bad/40 bg-bad/5')}>
                <div className="flex items-center gap-2">
                  {result.ok ? <CheckCircle2 size={14} className="text-ok" /> : <XCircle size={14} className="text-bad" />}
                  <span className={cn('font-mono text-xs font-bold', statusColor)}>{result.ok ? 'ejecución correcta' : 'terminó con error'}</span>
                  <span className="ml-auto font-mono text-[10px] text-grey">{result.ms}ms</span>
                </div>
                {result.version && <p className="mt-1 font-mono text-[10px] text-grey">{result.version}</p>}
              </motion.div>
            )}

            <div className="rounded-lg border border-edge bg-black/30 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-acento"><BookOpen size={10} /> la chuleta</h4>
              <p className="text-[11px] text-grey">{lang.sections.length} secciones con snippets listos para copiar. Vuelve a la pestaña <b className="text-ink">📖 Chuleta</b> cuando te atascas; al playground cuando dudas.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
