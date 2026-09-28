import { useMemo, useState } from 'react'
import { Phone, ScanSearch, List, AlertTriangle } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Select, Button, Badge, InfoBanner, Reveal, KV, CopyBlock } from '../components/ui'
import {
  parsePhone, parseImei, bulkSummary, PHONE_DORKS, HLR_FACTS, PHONE_ETHICS, COUNTRIES,
  type ParsedPhone,
} from '../lib/phoneosint'

export default function PhoneValidator() {
  const [raw, setRaw] = useState('+34 612 345 678')
  const [iso, setIso] = useState('ES')
  const [imei, setImei] = useState('')
  const [imeiRes, setImeiRes] = useState<ReturnType<typeof parseImei> | null>(parseImei(''))

  const parsed = useMemo(() => parsePhone(raw, iso), [raw, iso])

  /* modo lista */
  const [bulk, setBulk] = useState('')
  const [bulkResults, setBulkResults] = useState<ParsedPhone[] | null>(null)
  const runBulk = () => {
    const lines = bulk.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    setBulkResults(lines.map((l) => parsePhone(l, iso)))
  }
  const summary = useMemo(() => (bulkResults ? bulkSummary(bulkResults) : null), [bulkResults])

  const tone = (b: boolean, warn = false): 'ok' | 'warn' | 'bad' => (b ? 'ok' : warn ? 'warn' : 'bad')

  return (
    <div>
      <ToolHeader icon={Phone} title="Phone Validator & OSINT" badge="E.164" desc="Valida que un número es realmente válido según el plan nacional, identifica país, tipo (móvil/fijo), geografía y operador histórico, y genera los enlaces para verificar si está activo." />

      <InfoBanner>
        <b>La verdad incómoda:</b> saber si un teléfono "existe" de verdad exige una consulta <b>HLR</b> (de pago, vía Twilio/Vonage/numverify). Lo que esta tool hace —y hace bien— es validar el número contra el plan nacional (~45 países), detectar fakes, clasificar móvil/fijo y darte los enlaces públicos para seguir investigando. El IMEI se valida con Luhn.
      </InfoBanner>

      {/* número individual */}
      <Reveal>
        <div className="card space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_170px]">
            <Field label="Número de teléfono" hint="con o sin +, cualquier formato">
              <TextInput value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="+34 612 345 678" spellCheck={false} />
            </Field>
            <Field label="País si no hay +">
              <Select
                options={[{ value: '', label: '— elige país —' }, ...COUNTRIES.map((c) => ({ value: c.iso, label: `${c.name} (+${c.cc})` }))]}
                value={iso}
                onChange={(e) => setIso(e.target.value)}
              />
            </Field>
          </div>
          {parsed.error && <p className="flex items-center gap-2 font-mono text-xs text-bad"><AlertTriangle size={13} /> {parsed.error}</p>}
        </div>
      </Reveal>

      {/* resultados individuales */}
      {!parsed.error && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-mono text-sm font-bold text-ink">Identificación</h2>
                <Badge tone={tone(parsed.valid)}>{parsed.valid ? 'NÚMERO VÁLIDO' : 'NO VÁLIDO'}</Badge>
              </div>
              <div className="mt-2 space-y-1">
                <KV k="E.164" v={parsed.e164 ?? '—'} copyable />
                <KV k="país" v={parsed.country ? `${parsed.country.name} (+${parsed.country.cc})` : '—'} />
                <KV k="tipo" v={parsed.type} />
                {parsed.geo && <KV k="región" v={parsed.geo} />}
                {parsed.operatorHist && <KV k="operador (histórico)" v={parsed.operatorHist} />}
                <KV k="longitud nacional" v={`${parsed.national.length} dígitos`} />
              </div>
              {parsed.flags.length > 0 && (
                <div className="mt-3 space-y-1">
                  {parsed.flags.map((f, i) => (
                    <p key={i} className="font-mono text-[11px] text-warn">⚠ {f}</p>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="card p-5">
              <h2 className="mb-2 font-mono text-sm font-bold text-ink">Formatos y URIs</h2>
              <div className="space-y-1">
                <KV k="internacional" v={parsed.formats.international} copyable />
                <KV k="nacional" v={parsed.formats.national} copyable />
                <KV k="tel: URI" v={parsed.formats.telUri} copyable />
                <KV k="RFC 3966" v={parsed.formats.rfc3966} copyable />
                <KV k="wa.me" v={<a href={parsed.formats.waUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">{parsed.formats.waUrl}</a>} />
              </div>
            </div>
          </Reveal>

          {/* dorks */}
          <Reveal delay={0.15}>
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-3 font-mono text-sm font-bold text-ink">¿Está registrado/activo? Siguiente paso</h2>
              <div className="grid gap-1.5 md:grid-cols-2">
                {PHONE_DORKS.map((d) => {
                  const url = d.url(parsed.e164 ?? '', parsed.national, parsed.country?.iso ?? 'ES')
                  return (
                    <a key={d.label} href={url} target="_blank" rel="noreferrer" className="group rounded-lg border border-edge/70 bg-black/20 px-3 py-2 transition-colors hover:border-acento/50">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-ink group-hover:text-acento">{d.label}</span>
                        <span className="font-mono text-[9px] uppercase text-grey/60">verificar</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-grey">{d.what}</p>
                    </a>
                  )
                })}
              </div>
              <div className="mt-4 border-t border-edge/60 pt-3">
                {HLR_FACTS.map((f, i) => (
                  <p key={i} className="mb-1.5 text-[11px] leading-relaxed text-grey/80">💡 {f}</p>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      )}

      {/* IMEI */}
      <Reveal delay={0.1}>
        <div className="card mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><ScanSearch size={15} /> IMEI (Luhn + TAC)</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="IMEI (15 dígitos)" hint="marcar *#06# en el teléfono">
              <TextInput value={imei} onChange={(e) => setImei(e.target.value)} placeholder="490154203237518" spellCheck={false} />
            </Field>
            <Button variant="ghost" onClick={() => setImeiRes(parseImei(imei))} disabled={imei.replace(/\D/g, '').length !== 15}>Validar</Button>
          </div>
          {imeiRes && imei.replace(/\D/g, '').length > 0 && (
            <div className="mt-3">
              {imeiRes.error ? (
                <p className="font-mono text-xs text-bad">✗ {imeiRes.error}</p>
              ) : (
                <div className="space-y-1">
                  <KV k="IMEI válido" v={<Badge tone="ok">sí — Luhn OK</Badge>} />
                  <KV k="TAC (fabricante+modelo)" v={imeiRes.tac ?? '—'} />
                  <KV k="serial" v={imeiRes.serial ?? '—'} />
                  <KV k="dígito control" v={imeiRes.check ?? '—'} />
                </div>
              )}
            </div>
          )}
        </div>
      </Reveal>

      {/* modo lista */}
      <Reveal delay={0.15}>
        <div className="card mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-ink"><List size={15} /> Modo lista</h2>
          <Field label="Pega números (uno por línea)" hint="respeta el país del selector">
            <TextArea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'+34 612 345 678\n+1 415 555 0100\n612 345 678'} className="min-h-24" />
          </Field>
          <div className="mt-3">
            <Button onClick={runBulk} disabled={!bulk.trim()}>
              <List size={14} /> Validar lista
            </Button>
          </div>
          {summary && bulkResults && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="accent">{summary.total} números</Badge>
                <Badge tone="ok">{summary.valid} válidos</Badge>
                <Badge tone="bad">{summary.invalid} inválidos</Badge>
                <Badge tone="info">{summary.mobile} móviles</Badge>
                <Badge tone="neutral">{summary.landline} fijos</Badge>
                {summary.duplicated > 0 && <Badge tone="warn">{summary.duplicated} duplicados</Badge>}
                {summary.fakeSuspect > 0 && <Badge tone="bad">{summary.fakeSuspect} sospechosos de fake</Badge>}
              </div>
              {summary.byCountry.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {summary.byCountry.map((c) => (
                    <span key={c.iso} className="rounded-md border border-edge bg-black/30 px-2 py-0.5 font-mono text-[10px] text-grey">{c.iso}: {c.count}</span>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <CopyBlock
                  label="resultados (csv)"
                  text={bulkResults.map((r) => `${r.e164 ?? 'INVALID'},${r.valid ? 'OK' : 'BAD'},${r.type},${r.country?.iso ?? ''},${r.flags.join(' | ')}`).join('\n')}
                  maxH="max-h-64"
                />
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* ética */}
      <Reveal delay={0.2}>
        <div className="card p-5">
          {PHONE_ETHICS.map((e, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-grey/80">⚖ {e}</p>
          ))}
        </div>
      </Reveal>
    </div>
  )
}
