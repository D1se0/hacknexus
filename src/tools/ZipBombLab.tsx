import { useMemo, useState } from 'react'
import { PackageOpen, Bomb, Download, FolderTree, ScanSearch } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  InfoBanner,
  KV,
  Reveal,
  ToolHeader,
} from '../components/ui'
import {
  BOMB_RECIPES,
  ZIPBOMB_LESSONS,
  ZIPBOMB_LIMITS,
  amplicationTree,
  assembleZip,
  auditZip,
  buildNestedBomb,
  humanBytes,
} from '../lib/zipbomb'
import type { BombBuild } from '../lib/zipbomb'

type Tab = 'build' | 'audit' | 'catalog'
const TABS: { id: Tab; label: string; icon: typeof Bomb }[] = [
  { id: 'build', label: 'Constructor capado', icon: Bomb },
  { id: 'audit', label: 'Analizador', icon: ScanSearch },
  { id: 'catalog', label: 'Catálogo y lecciones', icon: FolderTree },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

export default function ZipBombLab() {
  const [tab, setTab] = useState<Tab>('build')

  /* Constructor */
  const [runKB, setRunKB] = useState(1000) // KB de ceros por fichero hoja
  const [files, setFiles] = useState(8)
  const [levels, setLevels] = useState(3)
  const [building, setBuilding] = useState(false)
  const [result, setResult] = useState<BombBuild | null>(null)
  const [buildErr, setBuildErr] = useState('')

  async function build() {
    setBuilding(true)
    setBuildErr('')
    setResult(null)
    try {
      const r = await buildNestedBomb({ runBytes: runKB * 1024, filesPerLevel: files, levels })
      setResult(r)
    } catch (e) {
      setBuildErr(e instanceof Error ? e.message : 'Error construyendo la bomba')
    } finally {
      setBuilding(false)
    }
  }

  function download() {
    if (!result) return
    const blob = new Blob([result.bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /* Analizador */
  const [auditBytes, setAuditBytes] = useState<Uint8Array | null>(null)
  const [auditName, setAuditName] = useState('')
  const audit = useMemo(() => (auditBytes ? auditZip(auditBytes) : null), [auditBytes])

  /* Catálogo */
  const [demoFiles, setDemoFiles] = useState(16)
  const [demoRun, setDemoRun] = useState(4_300_000) // como 42.zip: 4.3 MB leaf
  const [demoLevels, setDemoLevels] = useState(16)
  const tree = useMemo(() => amplicationTree(BigInt(demoRun), demoFiles, Math.min(demoLevels, 24)), [demoFiles, demoRun, demoLevels])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={PackageOpen}
        title="Zip Bomb Lab"
        desc="La matemática de 42.zip sin armas reales: construye bombs anidadas CAPADAS (máx 100 MB expandidos), mide la amplificación con BigInt, audita ZIPs sospechosos sin descomprimir y estudia las bombs históricas"
        badge="Ronda 18"
      />

      <InfoBanner>
        Una zip bomb no contiene «datos»: contiene <b>aritmética sobre el peor caso de DEFLATE</b> (runs de ceros a
        ~0.03 bits/byte). Aquí fabricamos la estructura real pero <b>capada</b> — el total expandido nunca supera ~1 GB —
        para medir, aprender y probar extractores con límites. Nunca extraigas bombs de terceros fuera de una sandbox.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'build' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Ceros por fichero hoja: {runKB} KB
                  </label>
                  <input type="range" min={1} max={10240} step={1} value={runKB} onChange={(e) => setRunKB(Number(e.target.value))} className="w-full accent-[var(--color-acento)]" />
                  <p className="mt-1 text-xs text-white/40">1 KB – 10 MB (capa de seguridad)</p>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Ficheros por nivel: {files}
                  </label>
                  <input type="range" min={1} max={16} step={1} value={files} onChange={(e) => setFiles(Number(e.target.value))} className="w-full accent-[var(--color-acento)]" />
                  <p className="mt-1 text-xs text-white/40">16 en 42.zip (16 niveles)</p>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                    Niveles de anidación: {levels}
                  </label>
                  <input type="range" min={1} max={8} step={1} value={levels} onChange={(e) => setLevels(Number(e.target.value))} className="w-full accent-[var(--color-acento)]" />
                  <p className="mt-1 text-xs text-white/40">42.zip usa 16; aquí máximo 8</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={build} disabled={building} className="gap-2">
                  <Bomb size={14} /> {building ? 'Comprimiendo…' : 'Construir bomba capada'}
                </Button>
                <span className="text-xs text-white/50">
                  Total expandido previsto: <b className="text-warn">{humanBytes(BigInt(runKB * 1024) * BigInt(files) ** BigInt(levels))}</b>
                </span>
              </div>
              {buildErr && <p className="mt-3 text-sm text-warn">{buildErr}</p>}
            </div>

            {result && (
              <Reveal>
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-panel p-4">
                    <div className="mb-3 grid gap-x-6 sm:grid-cols-4">
                      <KV k="ZIP final" v={`${(result.bytes.length / 1024).toFixed(1)} KB`} />
                      <KV k="Ficheros hoja" v={result.leafCount.toLocaleString('es')} />
                      <KV k="Expandido total" v={humanBytes(BigInt(result.leafExpandedTotal))} />
                      <KV k="Amplificación" v={`${result.amplification.toFixed(0)}:1`} />
                    </div>
                    <div className="space-y-1">
                      {result.layers.map((l, i) => (
                        <div key={i} className="flex items-center justify-between rounded border border-white/5 bg-black/20 px-3 py-1.5 text-xs">
                          <span className="font-mono">{l.name}</span>
                          <span className="text-white/50">
                            {l.innerFiles} ficheros × {(l.innerFileSize / 1024).toFixed(1)} KB → ZIP {(l.zipBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-xs text-warn">
                    La bomba es real pero <b>capada</b>: al extraerla por completo consumirá como máximo{' '}
                    <b>{humanBytes(BigInt(result.leafExpandedTotal))}</b> y unos segundos. Úsala para probar los límites
                    de tu extractor (unzip, 7z, libarchive) — si alguno se queda sin disco con esto, tiene un problema grave.
                  </div>
                  <Button variant="ghost" onClick={download} className="w-full gap-2">
                    <Download size={14} /> Descargar {result.filename} ({(result.bytes.length / 1024).toFixed(1)} KB)
                  </Button>
                </div>
              </Reveal>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'audit' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Analiza un ZIP sin descomprimir nada
              </label>
              <input
                type="file"
                accept=".zip"
                className={inputCls}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setAuditName(f.name)
                  f.arrayBuffer().then((buf) => setAuditBytes(new Uint8Array(buf)))
                }}
              />
              <p className="mt-2 text-xs text-white/50">
                Lee el central directory y el EOCD: tamaños declarados, ratios, anidación. Jamás ejecuta el
                descompresor — el análisis de una bomba real es seguro.
              </p>
            </div>
            {audit && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Badge tone={audit.verdict === 'normal' ? 'ok' : audit.verdict === 'sospechoso' ? 'warn' : 'bad'}>{audit.verdict}</Badge>
                    <span className="text-xs text-white/60">{auditName}</span>
                  </div>
                  <div className="grid gap-x-6 sm:grid-cols-4">
                    <KV k="Entradas" v={String(audit.entries.length)} />
                    <KV k="Comprimido" v={humanBytes(BigInt(audit.totalCompressed))} />
                    <KV k="Declarado" v={humanBytes(BigInt(audit.totalUncompressed))} />
                    <KV k="Ratio máximo" v={`${audit.maxRatio.toFixed(1)}:1`} />
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-white/70">
                    {audit.reasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
                {audit.entries.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-panel p-4">
                    <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs font-semibold uppercase tracking-wider text-white/40">
                      <span>Nombre</span>
                      <span>Comprimido</span>
                      <span>Original</span>
                      <span>Ratio</span>
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
                      {audit.entries.map((e, i) => (
                        <div key={i} className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 ${e.suspicious ? 'text-warn' : 'text-white/70'}`}>
                          <span className="truncate">{e.name}</span>
                          <span>{(e.compressed / 1024).toFixed(1)} KB</span>
                          <span>{(e.uncompressed / 1024).toFixed(1)} KB</span>
                          <span>{e.ratio.toFixed(1)}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-xs text-info">
              Defensa de referencia: libarchive limita por defecto a 1 GB y 8192 ficheros; unzip avisa con «error: invalid
              compressed data to inflate»… cuando ya es tarde. Tu extractor debe poner el límite ANTES de empezar.
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'catalog' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h4 className="mb-3 text-sm font-semibold">Calculadora del árbol de anidación (estilo 42.zip)</h4>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-white/50">Ficheros por nivel</label>
                  <input type="number" min={1} max={64} value={demoFiles} onChange={(e) => setDemoFiles(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/50">Tamaño del fichero hoja (bytes)</label>
                  <input type="number" min={1} value={demoRun} onChange={(e) => setDemoRun(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/50">Niveles</label>
                  <input type="number" min={1} max={24} value={demoLevels} onChange={(ex) => setDemoLevels(Number(ex.target.value))} className={inputCls} />
                </div>
              </div>
              <div className="mt-4 space-y-1 font-mono text-xs">
                {tree.steps.slice(0, 8).map((s) => (
                  <div key={s.level} className="flex justify-between rounded border border-white/5 bg-black/20 px-3 py-1.5">
                    <span>nivel {s.level}</span>
                    <span className="text-white/50">
                      {s.copiesTotal.toString()} copias × {(Number(s.copiesTotal) * demoRun >= 1e12 ? '≈' : '')}
                      {humanBytes(s.expandedTotal)}
                    </span>
                  </div>
                ))}
                {tree.steps.length > 8 && <p className="text-white/40">… y {tree.steps.length - 8} niveles más</p>}
              </div>
              <p className="mt-3 text-sm">
                Total final: <b className="text-acento">{humanBytes(tree.totalExpanded)}</b>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <h4 className="mb-3 text-sm font-semibold">Las bombs que hicieron historia</h4>
              <div className="space-y-2">
                {BOMB_RECIPES.map((r) => (
                  <div key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="bad">{r.name}</Badge>
                      <span className="font-mono text-xs text-info">{r.famous}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{r.approach}</p>
                    <p className="mt-1 text-xs text-warn">{r.danger}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <FolderTree size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones</h3>
          </div>
          <div className="space-y-2">
            {ZIPBOMB_LESSONS.map((l) => (
              <div key={l.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <span className="text-sm font-semibold">{l.title}</span>
                <p className="mt-1 text-xs text-white/60">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {ZIPBOMB_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
