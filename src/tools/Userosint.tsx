import { useMemo, useState } from 'react'
import { UserSearch, ExternalLink } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, TextInput, CopyBtn, InfoBanner } from '../components/ui'
import { SITES, SITE_CATEGORIES, usernameDorks, analyzeAlias, aliasVariants, OSINT_ETHICS } from '../lib/userosint'

export default function Userosint() {
  const [username, setUsername] = useState('')
  const [cat, setCat] = useState<string>('todas')
  const clean = username.trim().replace(/^@/, '')

  const analysis = useMemo(() => (clean ? analyzeAlias(clean) : null), [clean])
  const dorks = useMemo(() => (clean ? usernameDorks(clean) : []), [clean])
  const variants = useMemo(() => (clean ? aliasVariants(clean) : []), [clean])

  const sites = useMemo(() => {
    const list = clean ? SITES.map((s) => ({ ...s, url: s.url(clean) })) : []
    return cat === 'todas' ? list : list.filter((s) => s.category === cat)
  }, [clean, cat])

  return (
    <div>
      <ToolHeader icon={UserSearch} title="Username OSINT" desc="Investiga un alias: en qué plataformas existe, qué patrón sigue (año, leet, separadores), qué variantes buscar y dorks listos para Google/GitHub — todo pasivo y 100% en tu navegador" />

      <InfoBanner>
        <b>OSINT pasivo:</b> esta tool genera enlaces a páginas públicas, no contacta con nadie ni scrapea nada. Úsalo para auditar tu propia huella digital, en investigaciones autorizadas o CTFs. No sirve para acosar: los perfiles públicos son públicos, pero las personas tienen derecho a su privacidad.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="escribe un alias… ej. neo_matrix_99" className="font-mono text-lg" />
          {analysis && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-edge bg-black/30 p-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">análisis del alias</p>
                <div className="space-y-1 font-mono text-[11px]">
                  <p className="text-ink">estilo: <span className="text-acento">{analysis.style}</span></p>
                  <p className="text-grey">longitud {analysis.length} · {analysis.uniqChars} caracteres únicos · ~{analysis.entropyBits} bits de entropía</p>
                  <p className="text-grey">
                    {analysis.hasDigits && 'tiene dígitos · '}
                    {analysis.hasSeparator && 'usa separadores · '}
                    {analysis.hasLeet && 'leet-speak · '}
                    {analysis.hasYear && <span className="text-warn">contiene año ({analysis.probableYear})</span>}
                  </p>
                  {analysis.words.length > 0 && <p className="text-grey">palabras detectadas: {analysis.words.map((w) => <span key={w} className="text-info">{w} </span>)}</p>}
                </div>
              </div>
              <div className="rounded-xl border border-edge bg-black/30 p-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">pistas de investigación</p>
                <ul className="space-y-1">
                  {analysis.tips.map((t) => <li key={t} className="font-mono text-[11px] leading-relaxed text-grey">→ {t}</li>)}
                </ul>
              </div>
            </div>
          )}
          {variants.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-grey">variantes:</span>
              {variants.map((v) => <Badge key={v} tone="neutral">{v}</Badge>)}
            </div>
          )}
        </div>
      </Reveal>

      {clean && (
        <>
          <Reveal>
            <div className="card mb-4 p-6">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">dorks de búsqueda por alias</h3>
              <div className="space-y-2">
                {dorks.map((d, i) => (
                  <div key={i} className="rounded-xl border border-edge p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{d.engine}</Badge>
                      <a href={d.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 font-mono text-[11px] text-info hover:underline">
                        abrir búsqueda <ExternalLink size={11} />
                      </a>
                      <CopyBtn text={d.query} className="ml-auto" />
                    </div>
                    <code className="mt-1.5 block break-all font-mono text-[11px] text-grey">{d.query}</code>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card mb-4 flex flex-wrap gap-2 p-4">
              <button onClick={() => setCat('todas')} className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${cat === 'todas' ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>todas ({SITES.length})</button>
              {SITE_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${cat === c ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>{c}</button>
              ))}
            </div>
          </Reveal>

          <div className="grid gap-2 md:grid-cols-2">
            {sites.map((s) => (
              <Reveal key={s.name}>
                <a href={s.url} target="_blank" rel="noreferrer noopener" className="card flex items-center gap-3 p-4 transition-colors hover:border-acento/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] text-white">{s.name}</span>
                      <Badge tone="neutral">{s.category}</Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[10.5px] text-grey">{s.note}</p>
                  </div>
                  <ExternalLink size={15} className="shrink-0 text-grey" />
                </a>
              </Reveal>
            ))}
          </div>
        </>
      )}

      {!clean && (
        <div className="card p-10 text-center">
          <UserSearch size={40} className="mx-auto mb-3 text-grey/40" />
          <p className="font-mono text-xs text-grey">escribe un alias arriba para generar la matriz de plataformas, los dorks y el análisis</p>
        </div>
      )}

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">ética y límites</h3>
          <ul className="space-y-1.5">
            {OSINT_ETHICS.map((e) => <li key={e} className="font-mono text-[11px] leading-relaxed text-grey">— {e}</li>)}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
