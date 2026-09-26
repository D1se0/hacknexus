import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Loader2, ShieldAlert, ShieldCheck, ArrowUpRight } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, ErrorBox, InfoBanner, useToast } from '../components/ui'
import { dnsQuery, resolveDnsSet, type DnsRecord } from '../lib/netapi'
import { auditDns, controlQuality, RISK_COLORS, type DnsSecRecord } from '../lib/dnsaudit'
import { cn } from '../lib/util'

const TYPES = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'CAA', 'SRV', 'PTR'] as const

/* ── barra de riesgo semicircular ── */
function RiskGauge({ score, label, grade }: { score: number; label: string; grade: string }) {
  const color = RISK_COLORS[label as keyof typeof RISK_COLORS]
  const R = 54
  const circumference = Math.PI * R // semicírculo
  const filled = (score / 100) * circumference
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 140 78" className="h-[78px] w-[140px] shrink-0">
        <path d="M 16 70 A 54 54 0 0 1 124 70" fill="none" stroke="#1c2b33" strokeWidth="11" strokeLinecap="round" />
        <motion.path
          d="M 16 70 A 54 54 0 0 1 124 70"
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x="70" y="58" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="26" fontWeight="bold" fill={color}>
          {score}
        </text>
      </svg>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-grey">riesgo de suplantación</div>
        <div className="font-mono text-xl font-bold" style={{ color }}>{label}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="rounded border border-edge px-1.5 font-mono text-[10px] text-ink">nota {grade}</span>
          <a
            href="https://mxtoolbox.com/dmarc.aspx"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-0.5 font-mono text-[10px] text-grey hover:text-acento"
          >
            profundizar <ArrowUpRight size={9} />
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── medidor horizontal por control ── */
function ControlBar({ label, quality, present, hint, delay }: { label: string; quality: number; present: boolean; hint: string; delay: number }) {
  const color = quality >= 100 ? '#2ee88a' : quality >= 60 ? '#f59e0b' : quality > 0 ? '#fb923c' : '#f43f5e'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
        <span className="font-bold text-ink">{label}</span>
        <span className="flex items-center gap-1.5 text-grey">
          {hint}
          <Badge tone={present ? (quality >= 100 ? 'ok' : 'warn') : 'bad'}>{present ? 'presente' : 'ausente'}</Badge>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/60">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${quality}%` }}
          transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

const LEVEL_TONE: Record<string, 'bad' | 'warn' | 'info' | 'neutral' | 'ok'> = {
  critico: 'bad', alto: 'warn', medio: 'warn', bajo: 'info', ok: 'ok',
}

export default function Dns() {
  const [domain, setDomain] = useState('github.com')
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [queryType, setQueryType] = useState<string>('ALL')
  const [auditDomain, setAuditDomain] = useState('')
  const toast = useToast()

  const analyze = (recs: DnsRecord[]) => {
    const txt = recs.filter((r) => r.type === 'TXT').map((r) => r.value)
    return {
      spf: txt.find((t) => t.toLowerCase().startsWith('v=spf1')),
      dkim: txt.some((t) => t.includes('v=DKIM1') || /^p=[A-Za-z0-9+/]{50,}/.test(t)),
      dmarc: txt.find((t) => t.toLowerCase().includes('v=dmarc1')),
      caa: recs.filter((r) => r.type === 'CAA').map((r) => r.value),
    } satisfies Pick<DnsSecRecord, 'spf' | 'dkim' | 'dmarc' | 'caa'>
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
      if (recs.length) {
        setAuditDomain(d)
        toast(`${recs.length} registros`)
      } else {
        setErr('Sin registros devueltos para ese tipo (el dominio puede existir pero no tener ese registro)')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const sec = analyze(records)
  const nsList = records.filter((r) => r.type === 'NS').map((r) => r.value.replace(/\.$/, ''))
  const mxList = records.filter((r) => r.type === 'MX').map((r) => r.value)
  const auditRec: DnsSecRecord | null = records.length > 0
    ? { ...sec, mx: mxList, ns: nsList, dnskey: records.some((r) => r.type === 'TXT' && r.value.includes('DNSKEY')) || false, ds: false }
    : null
  const audit = auditRec ? auditDns({ ...auditRec, dnskey: false, ds: false }) : null
  const controls = auditRec ? controlQuality({ ...auditRec, dnskey: false, ds: false }) : []
  const grouped = TYPES.map((t) => ({ type: t, list: records.filter((r) => r.type === t) })).filter((g) => g.list.length > 0)

  return (
    <div>
      <ToolHeader icon={Globe} title="DNS Lookup (DoH)" desc="Consulta A/AAAA/MX/NS/TXT/CAA/SOA vía DNS-over-HTTPS y audita la seguridad del dominio: SPF, DKIM, DMARC, CAA y DNSSEC con puntuación de riesgo y hallazgos explicados" />

      <InfoBanner>
        Esta herramienta consulta <span className="font-mono">dns.google/resolve</span> (API pública con CORS). El dominio consultado viaja a los servidores de Google DNS. La auditoría de riesgo es heurística: DKIM solo se comprueba en TXT genéricos (los selectores específicos pueden no verse).
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

      {/* ── auditoría de riesgo ── */}
      {audit && auditDomain && (
        <Reveal>
          <div className="card mt-6 overflow-hidden p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-edge bg-black/30 px-4 py-2.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-acento">auditoría de seguridad</span>
              <Badge tone="neutral">{auditDomain}</Badge>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[auto_1fr]">
              <div className="flex flex-col justify-center gap-3">
                <RiskGauge score={audit.riskScore} label={audit.riskLabel} grade={audit.grade} />
                {/* semáforo de hallazgos */}
                <div className="flex gap-1.5">
                  {(['critico', 'alto', 'medio', 'bajo'] as const).map((lv) => {
                    const n = audit.findings.filter((f) => f.level === lv).length
                    return (
                      <span key={lv} className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px]', n > 0 ? 'border-edge text-ink' : 'border-edge/50 text-grey/40')}>
                        {n}× {lv}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                {controls.map((c, i) => (
                  <ControlBar key={c.label} label={c.label} quality={c.quality} present={c.present} hint={c.hint} delay={i * 0.08} />
                ))}
              </div>
            </div>

            {/* hallazgos */}
            <div className="space-y-2 border-t border-edge p-5">
              <h4 className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-grey">
                <ShieldAlert size={11} /> hallazgos ({audit.findings.length})
              </h4>
              {audit.findings.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-edge bg-black/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={LEVEL_TONE[f.level]}>{f.level}</Badge>
                    <span className="text-sm font-semibold text-ink">{f.title}</span>
                    {f.weight > 0 && <span className="ml-auto font-mono text-[10px] text-grey">+{f.weight} riesgo</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-grey">{f.detail}</p>
                </motion.div>
              ))}
              {audit.positives.length > 0 && (
                <div className="rounded-lg border border-ok/30 bg-ok/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ok">
                    <ShieldCheck size={11} /> bien configurado
                  </div>
                  <ul className="space-y-0.5 text-xs text-grey">
                    {audit.positives.map((p) => <li key={p}>✓ {p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      )}

      {/* registros */}
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
          <div className="mt-6">
            <CopyBlock text={records.map((r) => `${r.type}\t${r.value}`).join('\n')} label="todo (texto)" />
          </div>
        </Reveal>
      )}
    </div>
  )
}
