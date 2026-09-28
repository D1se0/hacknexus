import { useMemo, useState } from 'react'
import { Phone, ScanSearch, List, AlertTriangle, Radar, KeyRound, Trash2 } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Select, Button, Badge, InfoBanner, Reveal, KV, CopyBlock, Spinner, useToast } from '../components/ui'
import {
  parsePhone, parseImei, bulkSummary, PHONE_DORKS, HLR_FACTS, PHONE_ETHICS, COUNTRIES,
  verifyPhoneExists, saveVeriphoneKey, getVeriphoneKey, clearVeriphoneKey, LIVECHECK_NOTES,
  type ParsedPhone, type LiveVerification,
} from '../lib/phoneosint'

export default function PhoneValidator() {
  const toast = useToast()
  const [raw, setRaw] = useState('+34 612 345 678')
  const [iso, setIso] = useState('ES')
  const [imei, setImei] = useState('')
  const [imeiRes, setImeiRes] = useState<ReturnType<typeof parseImei> | null>(parseImei(''))

  const parsed = useMemo(() => parsePhone(raw, iso), [raw, iso])

  /* verificación de existencia en vivo (HLR + mensajería) */
  const [verifKey, setVerifKey] = useState(getVeriphoneKey())
  const [numverifyKey, setNumverifyKey] = useState('')
  const [live, setLive] = useState<LiveVerification | null>(null)
  const [liveBusy, setLiveBusy] = useState(false)
  const runLive = async () => {
    if (!parsed.e164) return
    setLiveBusy(true)
    try {
      setLive(await verifyPhoneExists(parsed.e164, verifKey, numverifyKey))
    } finally {
      setLiveBusy(false)
    }
  }

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
      <ToolHeader icon={Phone} title="Phone Validator & OSINT" badge="E.164 + HLR" desc="Valida que un número es realmente válido según el plan nacional (55 países), identifica país, tipo y operador, COMPRUEBA EN VIVO si existe y está registrado (HLR vía Veriphone/numverify + sonda WhatsApp), y valida IMEI con Luhn." />

      <InfoBanner>
        <b>Validación en 3 capas:</b> ① sintáctica contra el plan nacional (instantánea, offline), ② de EXISTENCIA en vivo mediante consultas HLR al operador — la misma que usan bancos y delivery — con claves gratuitas de Veriphone (500 req/mes) o numverify (100 req/mes) que se guardan solo en tu navegador, y ③ sonda pública de WhatsApp. Sin claves, la tool sigue validando formato y te da la ruta manual (wa.me en incógnito) en 30 segundos.
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

      {/* verificación de existencia en vivo */}
      <Reveal delay={0.05}>
        <div className="card mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-mono text-sm font-bold text-ink"><Radar size={15} /> ¿Existe y está registrado? Verificación en vivo</h2>
            {parsed.e164 && (
              <Button onClick={runLive} disabled={liveBusy} className="text-xs">
                {liveBusy ? <Spinner /> : <Radar size={14} />} Comprobar {parsed.e164}
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-grey">
            Tres sondas en paralelo: <b className="text-ink">Veriphone</b> y <b className="text-ink">numverify</b> preguntan al <b className="text-ink">HLR del operador</b> (la base de datos que responde si el número está asignado y activo, con operador real) y <b className="text-ink">WhatsApp</b> hace una sonda pública del endpoint wa.me. Las claves viajan solo del proveedor a tu navegador.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Field label="Clave Veriphone (gratis en veriphone.io)" hint="500 req/mes">
              <TextInput value={verifKey} onChange={(e) => setVerifKey(e.target.value)} onBlur={() => saveVeriphoneKey(verifKey)} placeholder="pega tu clave…" type="password" spellCheck={false} />
            </Field>
            <Field label="Clave numverify (gratis en numverify.com)" hint="100 req/mes">
              <TextInput value={numverifyKey} onChange={(e) => setNumverifyKey(e.target.value)} placeholder="pega tu clave…" type="password" spellCheck={false} />
            </Field>
            <div className="flex items-end gap-2">
              <Button variant="ghost" className="text-xs" onClick={() => { saveVeriphoneKey(verifKey); toast('Claves guardadas solo en este navegador', 'ok') }}><KeyRound size={13} /> Guardar</Button>
              <Button variant="ghost" className="text-xs" onClick={() => { clearVeriphoneKey(); setVerifKey(''); setNumverifyKey(''); toast('Claves borradas') }}><Trash2 size={13} /> Borrar</Button>
            </div>
          </div>

          {live && (
            <div className="mt-4 space-y-2">
              <div className={`rounded-lg border px-4 py-3 font-mono text-xs ${live.verified ? 'border-ok/40 bg-ok/10 text-ok' : 'border-warn/40 bg-warn/10 text-warn'}`}>
                {live.summary}
              </div>
              {[live.veriphone, live.numverify, live.whatsapp].map((r) => (
                <div key={r.provider} className="flex items-start justify-between gap-3 rounded-lg border border-edge/70 bg-black/20 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{r.provider}</span>
                      <Badge tone={r.status === 'active' ? 'ok' : r.status === 'inactive' ? 'bad' : r.status === 'error' ? 'bad' : 'neutral'}>{r.status}</Badge>
                      <span className="font-mono text-[9px] uppercase text-grey/50">{r.source}</span>
                    </div>
                    <p className="mt-0.5 break-all text-[11px] leading-relaxed text-grey">{r.detail}</p>
                  </div>
                  {r.provider === 'WhatsApp' && parsed.e164 && (
                    <a href={parsed.formats.waUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-info hover:border-info/50">abrir ↗</a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-1.5 border-t border-edge/60 pt-3">
            {LIVECHECK_NOTES.map((n, i) => <p key={i} className="text-[11px] leading-relaxed text-grey/80">💡 {n}</p>)}
          </div>
        </div>
      </Reveal>

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
