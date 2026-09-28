import { useMemo, useState } from 'react'
import { History, Search, Globe2, KeyRound } from 'lucide-react'
import {
  Badge,
  Button,
  InfoBanner,
  KV,
  Reveal,
  ToolHeader,
} from '../components/ui'
import {
  WAYBACK_LESSONS,
  WAYBACK_LIMITS,
  cdxQuery,
  extractSubdomains,
  interestingPaths,
  parseTs,
  summarize,
} from '../lib/wayback'
import type { CdxRecord } from '../lib/wayback'

type Mode = 'timeline' | 'subs' | 'paths'
const MODES: { id: Mode; label: string; icon: typeof Search }[] = [
  { id: 'timeline', label: 'Timeline', icon: History },
  { id: 'subs', label: 'Subdominios históricos', icon: Globe2 },
  { id: 'paths', label: 'Rutas interesantes', icon: KeyRound },
]

const inputCls =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-acento/60'

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

export default function WaybackMachine() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('timeline')
  const [records, setRecords] = useState<CdxRecord[] | null>(null)
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    const d = normalizeDomain(input)
    if (!d || loading) return
    setLoading(true)
    setError('')
    setRecords(null)
    setDomain(d)
    try {
      const matchType = mode === 'subs' ? 'domain' : 'host'
      const limit = mode === 'subs' ? 20000 : 5000
      const recs = await cdxQuery({ url: d, matchType, limit })
      setRecords(recs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error consultando la CDX API')
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => (records ? summarize(records) : null), [records])
  const subs = useMemo(() => (records && mode === 'subs' ? extractSubdomains(records, domain) : null), [records, mode, domain])
  const paths = useMemo(() => (records && mode === 'paths' ? interestingPaths(records, domain) : null), [records, mode, domain])

  function snapshotUrl(ts: string, url: string): string {
    return `https://web.archive.org/web/${ts}/${url}`
  }

  const maxYear = summary ? Math.max(...summary.perYear.map((y) => y.snapshots)) : 1

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={History}
        title="Wayback Time Machine"
        desc="OSINT pasivo con la Wayback Machine: timeline completa del dominio, subdominios que existieron (candidatos a takeover), rutas interesantes indexadas y acceso directo a cada snapshot — vía CDX API, sin tocar el target"
        badge="Ronda 18"
      />

      <InfoBanner>
        El histórico de un dominio es <b>recon del pasado</b>: endpoints borrados que nadie protege, subdominios huérfanos
        (takeover), antiguos paneles de admin. Esta tool consulta <b>solo archive.org</b> — el target nunca recibe
        tráfico tuyo. Ética: todo es público e indexado; el buen uso es auditar TU superficie o con autorización.
      </InfoBanner>

      <div className="rounded-xl border border-white/10 bg-panel p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className={inputCls}
            placeholder="dominio.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading} className="gap-2 whitespace-nowrap">
            <Search size={14} /> {loading ? 'Consultando…' : 'Buscar en el tiempo'}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Button key={m.id} variant={mode === m.id ? 'primary' : 'ghost'} onClick={() => setMode(m.id)} className="gap-2 text-xs">
              <m.icon size={13} /> {m.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/50">
          {mode === 'subs'
            ? 'matchType=domain: incluye TODOS los subdominios indexados (consulta más lenta, hasta 20k registros).'
            : 'matchType=host: solo el host exacto (rápido). Cambia a subdominios para ampliar.'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">{error}</div>
      )}

      {records && summary && (
        <>
          {records.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-panel p-4 text-sm text-white/60">
              Sin snapshots indexados para <b>{domain}</b>: la Wayback Machine no rastrea todo (prueba con matchType domain o
              sin filtros).
            </div>
          )}
          {records.length > 0 && (
            <>
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <div className="grid gap-x-6 sm:grid-cols-4">
                  <KV k="Snapshots" v={summary.total.toLocaleString('es')} />
                  <KV k="URLs únicas" v={summary.uniqueUrls.toLocaleString('es')} />
                  <KV k="Primera captura" v={summary.first ? parseTs(summary.first.timestamp).toLocaleDateString('es', { year: 'numeric', month: 'short' }) : '—'} />
                  <KV k="Última captura" v={summary.last ? parseTs(summary.last.timestamp).toLocaleDateString('es', { year: 'numeric', month: 'short' }) : '—'} />
                </div>
              </div>

              {mode === 'timeline' && (
                <Reveal>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-panel p-4">
                      <h4 className="mb-3 text-sm font-semibold">Capturas por año</h4>
                      <div className="flex items-end gap-1" style={{ height: 120 }}>
                        {summary.perYear.map((y) => (
                          <div key={y.year} className="group relative flex-1">
                            <div
                              className="w-full rounded-t bg-acento/70 transition-all group-hover:bg-acento"
                              style={{ height: `${Math.max(2, (y.snapshots / maxYear) * 110)}px` }}
                              title={`${y.year}: ${y.snapshots} capturas`}
                            />
                            <div className="mt-1 text-center text-[10px] text-white/40">{y.year}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-panel p-4">
                      <h4 className="mb-3 text-sm font-semibold">Estado HTTP y tipos de contenido</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          {summary.statusBreakdown.slice(0, 6).map((s) => (
                            <div key={s.code} className="mb-1 flex items-center gap-2 text-xs">
                              <Badge tone={s.code.startsWith('2') ? 'ok' : s.code.startsWith('3') ? 'info' : s.code.startsWith('4') || s.code.startsWith('5') ? 'bad' : 'info'}>
                                {s.code || '—'}
                              </Badge>
                              <div className="h-1.5 flex-1 rounded bg-white/5">
                                <div className="h-full rounded bg-info/60" style={{ width: `${(s.count / summary.total) * 100}%` }} />
                              </div>
                              <span className="text-white/40">{s.count}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          {summary.mimeBreakdown.slice(0, 6).map((m) => (
                            <div key={m.mime} className="mb-1 flex items-center gap-2 text-xs">
                              <span className="w-32 truncate font-mono text-white/60">{m.mime}</span>
                              <div className="h-1.5 flex-1 rounded bg-white/5">
                                <div className="h-full rounded bg-acento/60" style={{ width: `${(m.count / summary.total) * 100}%` }} />
                              </div>
                              <span className="text-white/40">{m.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-panel p-4">
                      <h4 className="mb-3 text-sm font-semibold">Snapshots recientes</h4>
                      <div className="max-h-72 space-y-1 overflow-y-auto font-mono text-xs">
                        {[...records].slice(-40).reverse().map((r, i) => (
                          <a key={i} href={snapshotUrl(r.timestamp, r.original)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded border border-white/5 bg-black/20 px-3 py-1.5 hover:border-acento/40">
                            <span className="text-white/70">{r.timestamp}</span>
                            <span className="flex-1 truncate text-white/50">{r.original}</span>
                            <Badge tone={r.statuscode.startsWith('2') ? 'ok' : 'info'}>{r.statuscode}</Badge>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </Reveal>
              )}

              {mode === 'subs' && subs && (
                <Reveal>
                  <div className="rounded-xl border border-white/10 bg-panel p-4">
                    <h4 className="mb-3 text-sm font-semibold">Subdominios que existieron ({subs.length})</h4>
                    {subs.length === 0 && <p className="text-xs text-white/50">Ninguno indexado con este dominio raíz.</p>}
                    <div className="space-y-1">
                      {subs.slice(0, 60).map((s) => (
                        <div key={s.subdomain} className="flex flex-wrap items-center gap-3 rounded border border-white/5 bg-black/20 px-3 py-2 text-xs">
                          <span className="font-mono font-semibold text-white/80">{s.subdomain}</span>
                          <Badge tone={s.firstY < new Date().getFullYear() - 5 && s.lastY < new Date().getFullYear() - 3 ? 'warn' : 'info'}>
                            {s.firstY} → {s.lastY}
                          </Badge>
                          <span className="text-white/40">{s.snapshots} capturas</span>
                          <a className="ml-auto text-info hover:underline" href={snapshotUrl(s.lastUrl.slice(0, 14), s.lastUrl)} target="_blank" rel="noreferrer">
                            último snapshot →
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-warn">
                      ⚠ Subdominios viejos con firstY≠lastY recientes: candidatos a subdomain takeover — verifica con dns
                      si el CNAME apunta a un servicio liberado (S3, Heroku, GitHub Pages).
                    </p>
                  </div>
                </Reveal>
              )}

              {mode === 'paths' && paths && (
                <Reveal>
                  <div className="rounded-xl border border-white/10 bg-panel p-4">
                    <h4 className="mb-3 text-sm font-semibold">Rutas interesantes indexadas ({paths.length})</h4>
                    {paths.length === 0 && (
                      <p className="text-xs text-white/50">
                        Ninguna ruta de la lista (admin, backup, .env, api…) aparece en el índice para este host.
                      </p>
                    )}
                    <div className="space-y-1">
                      {paths.slice(0, 50).map((p) => (
                        <div key={p.path} className="flex flex-wrap items-center gap-3 rounded border border-white/5 bg-black/20 px-3 py-2 font-mono text-xs">
                          <span className="font-semibold text-white/80">{p.path}</span>
                          <Badge tone={p.status.startsWith('2') ? 'ok' : p.status.startsWith('3') ? 'info' : 'bad'}>{p.status}</Badge>
                          <span className="text-white/40">×{p.count}</span>
                          <a className="ml-auto text-info hover:underline" href={snapshotUrl(p.last.slice(0, 14), `${domain}${p.path}`)} target="_blank" rel="noreferrer">
                            snapshot →
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-white/50">
                      Estas rutas EXISTIERON: si el servidor las mantiene, son el primer diccionario para dirb/ffuf. Si
                      fueron borradas del índice, mejor aún: quedan fuera de la vista de otros.
                    </p>
                  </div>
                </Reveal>
              )}
            </>
          )}
        </>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones de OSINT temporal</h3>
          </div>
          <div className="space-y-2">
            {WAYBACK_LESSONS.map((l) => (
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
            {WAYBACK_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
