import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Binary, Upload, FileCode2, AlertTriangle, Table2 } from 'lucide-react'
import { ToolHeader, Badge, Reveal, CopyBlock, InfoBanner } from '../components/ui'
import { parseJavaClass, parsePyc, extractStrings, SUSPICIOUS_RE, type JavaClassInfo, type PycInfo } from '../lib/bytecode'

type Loaded =
  | { name: string; kind: 'class'; info: JavaClassInfo; suspicious: string[] }
  | { name: string; kind: 'pyc'; info: PycInfo; suspicious: string[] }

export default function Bytecode() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = async (file: File) => {
    setErr(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const suspicious = extractStrings(bytes, 5).filter((s) => SUSPICIOUS_RE.test(s)).slice(0, 60)
      if (file.name.endsWith('.class') || (bytes[0] === 0xca && bytes[1] === 0xfe)) {
        setLoaded({ name: file.name, kind: 'class', info: parseJavaClass(bytes), suspicious })
      } else if (file.name.endsWith('.pyc')) {
        setLoaded({ name: file.name, kind: 'pyc', info: parsePyc(bytes), suspicious })
      } else {
        setErr('extensión no reconocida: usa un .class (Java) o .pyc (Python). El magic de los primeros bytes decide si hay duda.')
      }
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const cls = loaded?.kind === 'class' ? loaded.info : null
  const pyc = loaded?.kind === 'pyc' ? loaded.info : null

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Binary}
        title="Bytecode Inspector"
        desc="Descompilador didáctico de bytecode: .class de Java (constant pool, fields, methods) y .pyc de Python (cabecera, strings) — solo lectura de bytes, nada se ejecuta"
        badge="reverse"
      />

      <InfoBanner>
        El bytecode <b>es</b> el programa: estos ficheros llevan nombres de clases, métodos y constantes en claro. Antes de ofuscar, piensa en lo que cuenta tu .class; antes de confiar en un .pyc de internet, mira qué strings trae.
      </InfoBanner>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void read(f) }}
        onClick={() => inputRef.current?.click()}
        className={`card mb-6 cursor-pointer border-dashed p-8 text-center transition-all ${drag ? 'border-acento bg-acento/5' : ''}`}
      >
        <input ref={inputRef} type="file" accept=".class,.pyc" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f) }} />
        <Upload size={26} className="mx-auto text-acento" />
        <p className="mt-2 font-mono text-sm text-ink">arrastra un <b>.class</b> o <b>.pyc</b> aquí — o pica para elegir</p>
        <p className="mt-1 font-mono text-[10.5px] text-grey">java: javac MiClase.java · python: compila cualquier módulo en __pycache__/</p>
      </div>

      {err && <p className="mb-6 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 font-mono text-xs text-bad">{err}</p>}

      {loaded && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-4">
            {cls && (
              <Reveal>
                <div className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><FileCode2 size={15} className="text-acento" /> cabecera del .class</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['magic', cls.magicOk ? '✅ CAFEBABE' : '❌ inválido'],
                      ['versión Java', `${cls.javaVersion} (major=${cls.major}, minor=${cls.minor})`],
                      ['clase', cls.thisClass],
                      ['superclase', cls.superClass],
                      ['flags', cls.classFlags],
                      ['constante pool', `${cls.cpCount} entradas`],
                      ['interfaces', cls.interfaces.join(', ') || '—'],
                      ['atributos de clase', cls.attributes.join(', ') || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                        <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{k}</p>
                        <p className="break-all font-mono text-[12px] text-ink">{v}</p>
                      </div>
                    ))}
                  </div>
                  {cls.error && <p className="mt-2 font-mono text-[11px] text-warn">⚠ {cls.error}</p>}
                </div>
              </Reveal>
            )}
            {cls && (
              <Reveal delay={0.05}>
                <div className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Table2 size={15} className="text-acento" /> fields y methods</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {[{ t: `fields (${cls.fields.length})`, list: cls.fields }, { t: `methods (${cls.methods.length})`, list: cls.methods }].map((g) => (
                      <div key={g.t}>
                        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-grey">{g.t}</p>
                        <div className="space-y-1">
                          {g.list.map((m, i) => (
                            <div key={i} className="rounded border border-edge bg-black/20 px-2.5 py-1.5 font-mono text-[11px]">
                              <p className="break-all text-ink">{m.name}</p>
                              <p className="text-[9.5px] text-grey">{m.flags}</p>
                            </div>
                          ))}
                          {!g.list.length && <p className="font-mono text-[11px] text-grey">— ninguno</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-[11px] leading-snug text-info/90">
                    💡 Los descriptores usan notación JVM: <code>Ljava/lang/String;</code> = String, <code>([I)V</code> = recibe int[] y devuelve void. Para decompilar de verdad: <b>jadx</b> (Java) o <b>pycdc/uncompyle6</b> (Python).
                  </div>
                </div>
              </Reveal>
            )}
            {cls && (
              <Reveal delay={0.08}>
                <div className="card p-5">
                  <h3 className="mb-3 font-mono text-sm font-bold text-white">constant pool ({cls.cp.length})</h3>
                  <div className="max-h-[420px] overflow-auto rounded-lg border border-edge">
                    <table className="w-full font-mono text-[11px]">
                      <thead className="sticky top-0 bg-black/60 text-left text-[9.5px] uppercase tracking-wider text-grey">
                        <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">tag</th><th className="px-3 py-2">valor</th></tr>
                      </thead>
                      <tbody>
                        {cls.cp.slice(0, 200).map((e) => (
                          <tr key={e.index} className="border-t border-edge/40">
                            <td className="px-3 py-1 text-grey">#{e.index}</td>
                            <td className="px-3 py-1 text-acento">{e.tag_name}</td>
                            <td className="break-all px-3 py-1 text-ink">{e.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>
            )}
            {pyc && (
              <Reveal>
                <div className="card p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><FileCode2 size={15} className="text-acento" /> cabecera del .pyc</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['magic', `0x${pyc.magic.toString(16)} (${pyc.magic})`],
                      ['versión Python', pyc.pythonVersion],
                      ['validación', pyc.hashBased ? `hash-based${pyc.checkSource ? ' (check activo)' : ' (unchecked)'}` : 'timestamp-based'],
                      ['mtime del fuente', pyc.mtime ?? '—'],
                      ['tamaño del fuente', pyc.sourceSize !== null ? `${pyc.sourceSize.toLocaleString('es-ES')} bytes` : '—'],
                      ['hash del fuente', pyc.sourceHash ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                        <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{k}</p>
                        <p className="break-all font-mono text-[12px] text-ink">{v}</p>
                      </div>
                    ))}
                  </div>
                  {pyc.error && <p className="mt-2 font-mono text-[11px] text-warn">⚠ {pyc.error}</p>}
                  <p className="mt-3 rounded-lg border border-info/25 bg-info/5 px-3 py-2 text-[11px] leading-snug text-info/90">
                    💡 Los .pyc de __pycache__ guardan el marshal del code object: los nombres de funciones, variables y docstrings van en claro. Decompiladores: <b>pycdc</b> (Decompyle++) o <b>uncompyle6</b> para ≤3.8.
                  </p>
                </div>
              </Reveal>
            )}
          </div>

          <Reveal delay={0.06}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><AlertTriangle size={14} className="text-warn" /> strings sospechosos</h3>
              <p className="mb-3 text-[11.5px] text-grey">Rutas, URLs, comandos y secretos en claro dentro del binario — lo primero que un analista busca:</p>
              {loaded.suspicious.length ? (
                <div className="max-h-[420px] space-y-1 overflow-auto">
                  {loaded.suspicious.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }} className="break-all rounded border border-bad/25 bg-bad/5 px-2.5 py-1.5 font-mono text-[10.5px] text-bad/90">
                      {s}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[11px] text-ok">sin patrones sospechosos en claro</p>
              )}
              <div className="mt-4">
                <Badge tone="neutral">{(loaded.info.size / 1024).toFixed(1)} KB analizados localmente</Badge>
              </div>
              {loaded.kind === 'class' && (
                <div className="mt-4">
                  <CopyBlock text={loaded.info.strings.slice(0, 120).join('\n')} label="todas las strings (120)" maxH="max-h-56" />
                </div>
              )}
            </div>
          </Reveal>
        </div>
      )}
    </div>
  )
}
