import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Loader2 } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, ErrorBox, InfoBanner, useToast } from '../components/ui'
import { dnsQuery, resolveDnsSet, type DnsRecord } from '../lib/netapi'

const TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'CAA', 'SRV', 'PTR'] as const

export default function Dns() {
  const [domain, setDomain] = useState('github.com')
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [queryType, setQueryType] = useState<string>('ALL')
  const toast = useToast()

  const analyze = (recs: DnsRecord[]) => {
    const txt = recs.filter((r) => r.type === 'TXT').map((r) => r.value)
    return {
      spf: txt.find((t) => t.toLowerCase().startsWith('v=spf1')),
      dkim: txt.find((t) => t.includes('v=DKIM1') || /^p=[A-Za-z0-9+/]{50,}/.test(t)),
      dmarc: txt.find((t) => t.toLowerCase().includes('v=dmarc1')),
      caa: recs.filter((r) => r.type === 'CAA').map((r) => r.value),
    }
  }

  const lookup = async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').split('/')[0]
    if (!d) return
    setLoading(true)
    setErr(null)
    setRecords([])
    try {
      const recs = queryType === 'ALL' ? await resolveDnsSet(d) : await dnsQuery(d, queryType)
      setRecords(recs)
      if (!recs.length) setErr('Sin registros devueltos para ese tipo (el dominio puede existir pero no tener ese registro)')
      else toast(`${recs.length} registros`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const sec = analyze(records)
  const grouped = TYPES.map((t) => ({ type: t, list: records.filter((r) => r.type === t) })).filter((g) => g.list.length > 0)

  return (
    <div>
      <ToolHeader icon={Globe} title="DNS Lookup (DoH)" desc="Consulta A/AAAA/MX/NS/TXT/CAA/SOA vía DNS-over-HTTPS de Google y analiza SPF, DKIM y DMARC" />

      <InfoBanner>
        Esta herramienta consulta <span className="font-mono">dns.google/resolve</span> (API pública con CORS). El dominio consultado viaja a los servidores de Google DNS.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <Field label="Dominio o IP (para PTR)" hint="github.com">
            <div className="flex gap-2">
              <TextInput
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookup()}
                className="font-mono"
                placeholder="dominio.com"
              />
              <Button onClick={lookup} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : 'consultar'}
              </Button>
            </div>
          </Field>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(['ALL', ...TYPES] as string[]).map((t) => (
              <button
                key={t}
                onClick={() => setQueryType(t)}
                className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all ${
                  queryType === t ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:border-acento/50 hover:text-acento'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {grouped.map((g, gi) => (
        <Reveal key={g.type} delay={gi * 0.04}>
          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-edge bg-black/30 px-4 py-2.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-acento">{g.type}</span>
              <Badge tone="neutral">{g.list.length} registros</Badge>
            </div>
            <div className="divide-y divide-edge/50">
              {g.list.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex flex-wrap items-baseline gap-x-4 px-4 py-2.5">
                  <span className="break-all font-mono text-[13px] text-ink">{r.value}</span>
                  {r.ttl !== undefined && <span className="ml-auto font-mono text-[10px] text-grey">TTL {r.ttl}s</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      ))}

      {records.length > 0 && (
        <Reveal>
          <div className="card mt-6 p-6">
            <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">análisis de seguridad de dominio</h3>
            <div className="space-y-3">
              {[
                { label: 'SPF', value: sec.spf, why: 'Define quién puede enviar email por el dominio (anti-spoofing)' },
                { label: 'DKIM', value: sec.dkim, why: 'Firma criptográfica del correo saliente' },
                { label: 'DMARC', value: sec.dmarc, why: 'Política sobre qué hacer con email que falla SPF/DKIM' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-edge bg-black/30 p-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={s.value ? 'ok' : 'warn'}>{s.value ? 'presente' : 'no encontrado'}</Badge>
                    <span className="font-mono text-sm font-bold text-white">{s.label}</span>
                  </div>
                  {s.value && <p className="mt-2 break-all font-mono text-[11px] text-acento">{s.value}</p>}
                  <p className="mt-1 font-mono text-[10px] text-grey/70">{s.why}</p>
                </div>
              ))}
              {sec.caa.length > 0 && (
                <div className="rounded-lg border border-edge bg-black/30 p-3">
                  <Badge tone="ok">CAA presente</Badge>
                  <p className="mt-2 font-mono text-[11px] text-ink">{sec.caa.join(' · ')}</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {records.length > 0 && (
        <Reveal>
          <div className="mt-6">
            <CopyBlock text={records.map((r) => `${r.type}\t${r.value}`).join('\n')} label="todo (texto)" />
          </div>
        </Reveal>
      )}
    </div>
  )
}
