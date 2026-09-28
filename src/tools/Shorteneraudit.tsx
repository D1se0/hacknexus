import { useMemo, useState } from 'react'
import { Link2, AlertTriangle, ExternalLink, ScanSearch, ShieldCheck } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, CopyBlock, InfoBanner, Reveal, KV, Spinner } from '../components/ui'
import { analyzeUrlFlags, unshorten, SHORTENERS, SHORTENER_DEFENSES, type ChainResult } from '../lib/phishkit'

export default function Shorteneraudit() {
  const [raw, setRaw] = useState('https://bit.ly/3xY2zW1')
  const [busy, setBusy] = useState(false)
  const [chain, setChain] = useState<ChainResult | null>(null)
  const flags = useMemo(() => analyzeUrlFlags(raw), [raw])

  const doUnshorten = async () => {
    setBusy(true)
    setChain(null)
    try {
      const res = await unshorten(raw)
      setChain(res)
    } finally {
      setBusy(false)
    }
  }

  const risk = useMemo(() => {
    const hits = [flags.hasCredentialsInUrl, flags.hasIpHost, flags.isPunycode, flags.hasDeepSubdomains, flags.hasTyposquat, flags.suspiciousTld, flags.hasOpenRedirect].filter(Boolean).length
    if (hits >= 3) return { tone: 'bad' as const, label: 'ALTO RIESGO' }
    if (hits >= 1) return { tone: 'warn' as const, label: 'SOSPECHOSA' }
    return { tone: 'ok' as const, label: 'sin señales automáticas' }
  }, [flags])

  return (
    <div>
      <ToolHeader icon={Link2} title="Shortener Audit" badge="REDIRECTS" desc="Expande acortadores en vivo, descompone la URL y detecta los patrones clásicos de phishing: credenciales, punycode, typosquatting y redirects abiertos." />

      <InfoBanner>
        <b>Locura de los shorteners:</b> el acortador conoce el destino, tú no. Antes de hacer clic en un enlace acortado, pégalo aquí. La expansión usa <code className="font-mono">fetch</code> desde tu navegador: si el acortador bloquea CORS, la tool te da los enlaces de expansión manual.
      </InfoBanner>

      <Reveal>
        <div className="card space-y-4 p-5">
          <Field label="URL a auditar" hint="acortador o completa">
            <TextInput value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="https://bit.ly/..." spellCheck={false} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={doUnshorten} disabled={busy || !raw.trim()}>
              {busy ? <Spinner /> : <ScanSearch size={15} />} Expandir y analizar
            </Button>
            <Badge tone={risk.tone}>{risk.label}</Badge>
          </div>
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal delay={0.05}>
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey"><AlertTriangle size={14} /> Análisis estático</h2>
            <div className="space-y-1">
              <KV k="host" v={safeHost(raw)} />
              <KV k="credenciales en URL" v={<Badge tone={flags.hasCredentialsInUrl ? 'bad' : 'ok'}>{flags.hasCredentialsInUrl ? 'sí — el host real va tras el @' : 'no'}</Badge>} />
              <KV k="host es IP" v={<Badge tone={flags.hasIpHost ? 'bad' : 'ok'}>{flags.hasIpHost ? 'sí' : 'no'}</Badge>} />
              <KV k="punycode (xn--)" v={<Badge tone={flags.isPunycode ? 'bad' : 'ok'}>{flags.isPunycode ? 'sí' : 'no'}</Badge>} />
              <KV k="subdominios profundos" v={<Badge tone={flags.hasDeepSubdomains ? 'warn' : 'ok'}>{flags.hasDeepSubdomains ? `sí (${flags.hasDeepSubdomains})` : 'no'}</Badge>} />
              <KV k="typosquatting" v={<Badge tone={flags.hasTyposquat ? 'bad' : 'ok'}>{flags.hasTyposquat ? 'sospechoso' : 'no detectado'}</Badge>} />
              <KV k="TLD sospechoso" v={<Badge tone={flags.suspiciousTld ? 'warn' : 'ok'}>{flags.suspiciousTld ? 'sí' : 'no'}</Badge>} />
              <KV k="redirect abierto" v={<Badge tone={flags.hasOpenRedirect ? 'warn' : 'ok'}>{flags.hasOpenRedirect ? 'sí' : 'no'}</Badge>} />
            </div>
            {flags.notes.length > 0 && (
              <div className="mt-3 space-y-1">
                {flags.notes.map((n, i) => (
                  <p key={i} className="font-mono text-[11px] text-warn">⚠ {n}</p>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey"><ExternalLink size={14} /> Cadena de redirecciones</h2>
            {!chain && !busy && <p className="text-xs text-grey">Pulsa "Expandir y analizar" para seguir la cadena con fetch desde tu navegador.</p>}
            {busy && <p className="flex items-center gap-2 text-xs text-grey"><Spinner /> siguiendo la cadena…</p>}
            {chain && (
              <div className="space-y-2">
                {chain.steps.map((s, i) => (
                  <div key={i} className="rounded-lg border border-edge/70 bg-black/20 px-3 py-2">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-grey">#{i + 1}</span>
                      <span className="truncate text-ink">{s.url}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px]">
                      <span className={s.status && s.status >= 400 ? 'text-bad' : 'text-ok'}>{s.status ?? '—'}</span>
                      {s.location && <span className="truncate text-info">→ {s.location}</span>}
                    </div>
                  </div>
                ))}
                {chain.error && <p className="font-mono text-[11px] text-warn">⚠ {chain.error} — usa la expansión manual de abajo</p>}
                {chain.finalUrl && !chain.error && <KV k="destino final" v={chain.finalUrl} copyable />}
              </div>
            )}

            <div className="mt-4 border-t border-edge/60 pt-3">
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-grey">Expansión manual (sin CORS)</h3>
              <div className="flex flex-wrap gap-1.5">
                {manualExpanders(raw).map((e) => (
                  <a key={e.label} href={e.url} target="_blank" rel="noreferrer" className="rounded-md border border-edge bg-black/30 px-2 py-1 font-mono text-[10px] text-info transition-colors hover:border-info/50">
                    {e.label} ↗
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-grey/60">Estos servicios expanden en su servidor: el acortador no ve tu IP en el proceso… pero el expander sí la ve. Para URLs sensibles, mejor desde una VM.</p>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <div className="card mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey"><ShieldCheck size={14} /> Acortadores conocidos</h2>
          <div className="grid gap-1.5 md:grid-cols-2">
            {SHORTENERS.map((s) => (
              <div key={s.name} className="rounded-lg border border-edge/70 bg-black/20 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-ink">{s.domains.join(', ')}</span>
                  <span className="font-mono text-[10px] text-grey">{s.preview}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-grey">{s.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-edge/60 pt-3">
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-grey">Defensas que funcionan</h3>
            <ul className="space-y-1.5 text-xs leading-relaxed text-grey">
              {SHORTENER_DEFENSES.map((d, i) => <li key={i}>• {d}</li>)}
            </ul>
          </div>
        </div>
      </Reveal>
    </div>
  )
}

function safeHost(raw: string): string {
  try { return new URL(raw.includes('://') ? raw : `http://${raw}`).hostname } catch { return '—' }
}

function manualExpanders(url: string): { label: string; url: string }[] {
  const enc = encodeURIComponent(url)
  return [
    { label: 'checkshorturl', url: `https://checkshorturl.com/expand.php?u=${enc}` },
    { label: 'urlex', url: `https://urlex.org/?url=${enc}` },
    { label: 'unshorten.dev', url: `https://unshorten.dev/api/v1/resolve-long-url?url=${enc}` },
    { label: 'getlinkinfo', url: `https://getlinkinfo.com/info?link=${enc}` },
  ]
}
