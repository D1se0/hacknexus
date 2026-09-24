import { useState } from 'react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, ErrorBox, InfoBanner, KV } from '../components/ui'
import { lookupCve, type CveItem } from '../lib/netapi'
import { fmtDate, relTime } from '../lib/util'

export default function Cvelookup() {
  const [query, setQuery] = useState('CVE-2021-44228')
  const [results, setResults] = useState<CveItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const search = async () => {
    setLoading(true)
    setErr(null)
    setResults(null)
    try {
      const r = await lookupCve(query)
      if (!r.length) setErr(`No se encontró ${query.trim().toUpperCase()} en la NVD (revisa el ID)`)
      setResults(r)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const sevTone = (sev?: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL': return 'bad'
      case 'HIGH': return 'bad'
      case 'MEDIUM': return 'warn'
      case 'LOW': return 'info'
      default: return 'neutral'
    }
  }

  const asText = (c: CveItem) =>
    `${c.id} — ${c.severity ?? 'sin CVSS'}${c.score !== undefined ? ` (${c.score})` : ''}\npublicado: ${fmtDate(c.published)}\nestado: ${c.status}\n\n${c.descriptions.find((d) => d.lang === 'en')?.value ?? '—'}\n\nreferencias:\n${c.references.map((r) => `- ${r.url}`).join('\n')}`

  return (
    <div>
      <ToolHeader icon={ShieldAlert} title="CVE Lookup" desc="Consulta vulnerabilidades en la NVD con CVSS, descripción, estado y referencias oficiales" />

      <InfoBanner>
        Consulta la API pública de la <span className="font-mono">NVD (NIST)</span>, que aplica rate-limit: si falla, reintenta en unos segundos.
        El ID consultado viaja a los servidores del NIST.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <Field label="ID de CVE" hint="CVE-AAAA-NNNNN">
            <div className="flex gap-2">
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="font-mono"
                placeholder="CVE-2024-12345"
              />
              <Button onClick={search} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : 'buscar'}
              </Button>
            </div>
          </Field>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['CVE-2021-44228', 'CVE-2014-6271', 'CVE-2019-0708', 'CVE-2023-34362', 'CVE-2017-0144'].map((p) => (
              <button key={p} onClick={() => { setQuery(p); setTimeout(search, 50) }} className="rounded-md border border-edge px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                {p}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-grey/70">
            log4shell · shellshock · bluekeep · moveit · eternalblue (MS17-010)
          </p>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {results?.map((c, i) => (
        <Reveal key={c.id} delay={i * 0.05}>
          <div className="card mt-6 p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold text-white">{c.id}</span>
              {c.severity && <Badge tone={sevTone(c.severity) as 'bad' | 'warn' | 'info' | 'neutral'}>{c.severity}{c.score !== undefined ? ` ${c.score}` : ''}</Badge>}
              <Badge tone="info">{c.status}</Badge>
            </div>

            <p className="rounded-lg border border-edge bg-black/30 p-4 font-mono text-[13px] leading-relaxed text-ink">
              {c.descriptions.find((d) => d.lang === 'en')?.value ?? '—'}
            </p>

            <div className="mt-4 grid gap-x-8 md:grid-cols-2">
              <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                <KV k="publicado" v={fmtDate(c.published)} />
                <KV k="modificado" v={`${fmtDate(c.lastModified)} (${relTime(new Date(c.lastModified))})`} />
                <KV k="puntuación CVSS" v={c.score !== undefined ? `${c.score}/10` : 'no disponible'} />
              </div>
              <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                <KV k="referencias" v={String(c.references.length)} />
                <KV k="métricas" v={Object.keys(c.metrics).join(', ') || '—'} />
              </div>
            </div>

            {c.references.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">referencias</p>
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {c.references.slice(0, 12).map((r, ri) => (
                    <a
                      key={ri}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all rounded-md border border-edge/60 bg-black/30 px-3 py-1.5 font-mono text-[11px] text-info transition-all hover:border-info/50"
                    >
                      {r.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <CopyBlock text={asText(c)} label={`${c.id} (informe)`} maxH="max-h-56" />
            </div>
          </div>
        </Reveal>
      ))}

      {results && results.length > 0 && (
        <Reveal>
          <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
            💡 Busca exploits en: <span className="text-acento">searchsploit {query}</span> · github.com/packetstorm · exploit-db.
            Comprueba la presencia con nessus/nmap -sV --script vuln.
          </div>
        </Reveal>
      )}
    </div>
  )
}
