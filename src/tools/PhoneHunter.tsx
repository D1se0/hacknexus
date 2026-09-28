import { useMemo, useState } from 'react'
import { Crosshair, KeyRound, FileText, Copy, Search } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, InfoBanner, Reveal, CopyBlock, useToast } from '../components/ui'
import { parsePhone, COUNTRIES } from '../lib/phoneosint'
import {
  buildPhoneDossier, generateSAR, SOURCE_CATEGORIES, HUNTER_ETHICS, HUNTER_TIPS,
} from '../lib/phoneintel'

export default function PhoneHunter() {
  const toast = useToast()
  const [raw, setRaw] = useState('+34 612 345 678')
  const [iso, setIso] = useState('ES')
  const [holderName, setHolderName] = useState('')
  const [cat, setCat] = useState<string | null>(null)

  const parsed = useMemo(() => parsePhone(raw, iso), [raw, iso])
  const dossier = useMemo(() => buildPhoneDossier(parsed), [parsed])
  const sar = useMemo(() => generateSAR(parsed.country?.iso, parsed.e164 ?? '', holderName || '[TU NOMBRE]'), [parsed, holderName])

  const sources = cat ? dossier.sources.filter((s) => s.category === cat) : dossier.sources

  const exportMd = useMemo(() => {
    const lines: string[] = [`# Dossier telefónico — ${dossier.headline}`, '', `_Generado con HackNexus · ${new Date().toLocaleString('es-ES')} · fuentes públicas, uso sujeto a ${parsed.country?.iso === 'ES' ? 'RGPD/LOPDGDD' : 'la ley local'}_`, '']
    for (const s of dossier.sections) {
      lines.push(`## ${s.icon} ${s.title}`, '')
      for (const r of s.rows) lines.push(`| **${r.k}** | ${r.v.replaceAll('|', '\\|')} |`)
      lines.push('')
    }
    lines.push('## 🧭 Plan de investigación', '')
    for (const p of dossier.probes) lines.push(`${p.n}. **${p.title}** (${p.time}) — ${p.detail}`)
    lines.push('', '## ⚖️ Nota ética', '')
    for (const e of HUNTER_ETHICS) lines.push(`- ${e}`)
    return lines.join('\n')
  }, [dossier, parsed])

  return (
    <div>
      <ToolHeader icon={Crosshair} title="Phone Hunter" badge="OSINT PRO" desc="Dossier completo de identidad detrás de un número: lo que el número revela por sí mismo, un plan de investigación en 10 pasos con 20+ fuentes de identidad, marco legal por país y generador de solicitudes ARCO/RGPD." />

      <InfoBanner>
        <b>Metodología profesional, no magia:</b> ningún servicio gratuito te da el nombre de un titular (eso es HLR + bases privadas de pago). Lo que hace esta tool es sintetizar lo que el número REVELA (país, operador, tipo, región, existencia), organizar las <b>20+ fuentes públicas</b> que sí dan identidad (caller ID crowdsourced, mensajería, agregadores, filtraciones, anuncios) en un plan con orden y tiempos, y darte la vía <b>legal</b> (solicitud ARCO/RGPD) que obliga a las empresas a responder. Tres fuentes independientes = identidad; una = candidato.
      </InfoBanner>

      {/* entrada */}
      <Reveal>
        <div className="card space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_170px]">
            <Field label="Número a investigar" hint="E.164 o nacional">
              <TextInput value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="+34 612 345 678" spellCheck={false} />
            </Field>
            <Field label="País si no hay +">
              <Select2 value={iso} onChange={setIso} />
            </Field>
          </div>
          {parsed.error && <p className="font-mono text-xs text-bad">⚠ {parsed.error}</p>}
          <div className="rounded-lg border border-acento/30 bg-acento/5 px-4 py-3 font-mono text-xs text-acento">
            🎯 {dossier.headline}
          </div>
        </div>
      </Reveal>

      {/* secciones del dossier */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {dossier.sections.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.04}>
            <div className="card h-full p-5">
              <h2 className="mb-3 font-mono text-sm font-bold text-ink">{s.icon} {s.title}</h2>
              <div className="space-y-1.5">
                {s.rows.map((r, j) => (
                  <div key={j} className="flex items-start justify-between gap-4 border-b border-edge/40 pb-1.5 last:border-0">
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-grey">{r.k}</span>
                    <span className="break-words text-right text-[11.5px] leading-relaxed text-ink">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* plan de investigación */}
      <Reveal delay={0.1}>
        <div className="card mt-4 p-5">
          <h2 className="mb-1 font-mono text-sm font-bold text-ink">🧭 Plan de investigación en 10 pasos</h2>
          <p className="mb-4 text-[11px] text-grey">{dossier.confidenceNote}</p>
          <div className="space-y-2">
            {dossier.probes.map((p) => (
              <div key={p.n} className="relative rounded-lg border border-edge/70 bg-black/20 px-4 py-3 pl-12">
                <span className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-acento/40 bg-panel font-mono text-[11px] font-bold text-acento">{p.n}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink">{p.title}</span>
                  <Badge tone="neutral">{p.time}</Badge>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="rounded-md border border-edge px-2 py-0.5 font-mono text-[10px] text-info hover:border-info/50">
                      {p.urlLabel ?? 'abrir'} ↗
                    </a>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-grey">{p.detail}</p>
                <p className="mt-1 font-mono text-[10px] text-ok/80">→ esperas: {p.expectation}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* fuentes de identidad */}
      <Reveal delay={0.15}>
        <div className="card mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><Search size={15} /> Catálogo de fuentes ({dossier.sources.length})</h2>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button onClick={() => setCat(null)} className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${cat === null ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
              todas
            </button>
            {SOURCE_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${cat === c.id ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid gap-1.5 md:grid-cols-2">
            {sources.map((s) => {
              const e164 = parsed.e164 ?? ''
              const url = s.url(e164, parsed.national, parsed.country?.iso ?? 'ES')
              return (
                <a key={s.name} href={url} target="_blank" rel="noreferrer" className="group rounded-lg border border-edge/70 bg-black/20 px-3 py-2 transition-colors hover:border-acento/50">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-ink group-hover:text-acento">{s.name}</span>
                    <span className="flex items-center gap-1">
                      <Badge tone={s.auth === 'sin cuenta' ? 'ok' : s.auth === 'cuenta gratis' ? 'info' : 'warn'}>{s.auth}</Badge>
                      <span className="font-mono text-[10px]" title={`fuerza de la señal: ${s.strength}/3`}>{'●'.repeat(s.strength)}{'○'.repeat(3 - s.strength)}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-grey">{s.what}</p>
                  {s.note && <p className="mt-0.5 font-mono text-[9.5px] text-warn/80">⚠ {s.note}</p>}
                </a>
              )
            })}
          </div>
        </div>
      </Reveal>

      {/* solicitud de derechos */}
      <Reveal delay={0.2}>
        <div className="card mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><FileText size={15} /> La vía legal: ejercicio de derechos</h2>
          <div className="grid gap-3 md:grid-cols-[240px_1fr]">
            <div>
              <Field label="Tu nombre (para la plantilla)">
                <TextInput value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nombre Apellido" />
              </Field>
              <div className="mt-3 space-y-1.5 rounded-lg border border-edge/70 bg-black/20 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-grey">plazo de respuesta</div>
                <div className="text-[11px] leading-relaxed text-ink">{sar.deadline}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-grey">si no responden</div>
                <div className="text-[11px] leading-relaxed text-ink">{sar.to}</div>
              </div>
              <Button variant="ghost" className="mt-3 w-full text-xs" onClick={() => { navigator.clipboard.writeText(`${sar.subject}\n\n${sar.body}`); toast('Solicitud copiada al portapapeles') }}>
                <Copy size={13} /> Copiar solicitud completa
              </Button>
            </div>
            <CopyBlock label={`asunto: ${sar.subject}`} text={sar.body} maxH="max-h-96" />
          </div>
        </div>
      </Reveal>

      {/* export dossier */}
      <Reveal delay={0.25}>
        <div className="card mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><KeyRound size={15} /> Dossier completo (Markdown)</h2>
          <CopyBlock text={exportMd} label="dossier.md" maxH="max-h-80" />
        </div>
      </Reveal>

      {/* ética + tips */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal delay={0.3}>
          <div className="card p-5">
            <h2 className="mb-3 font-mono text-sm font-bold text-ink">⚖️ Marco ético y legal</h2>
            {HUNTER_ETHICS.map((e, i) => <p key={i} className="mb-2 text-[11px] leading-relaxed text-grey/85">{e}</p>)}
          </div>
        </Reveal>
        <Reveal delay={0.35}>
          <div className="card p-5">
            <h2 className="mb-3 font-mono text-sm font-bold text-ink">💡 Tips de campo</h2>
            {HUNTER_TIPS.map((t, i) => <p key={i} className="mb-2 text-[11px] leading-relaxed text-grey/85">{t}</p>)}
          </div>
        </Reveal>
      </div>
    </div>
  )
}

/* Select de países local (mismo patrón que PhoneValidator) */
function Select2({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none transition-all focus:border-acento/60 focus:shadow-glow"
    >
      {COUNTRIES.map((c) => (
        <option key={c.iso} value={c.iso} className="bg-panel">{c.name} (+{c.cc})</option>
      ))}
    </select>
  )
}
