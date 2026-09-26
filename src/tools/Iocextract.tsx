import { useMemo, useState } from 'react'
import { Crosshair, Download, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, TextArea, CopyBtn, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { extractIocs, looksLikeFalsePositive, iocLinks, iocSummary, IOC_STIX_TEMPLATE, type IocHit } from '../lib/ioc'
import { download } from '../lib/util'

const SAMPLE = `Alerta incidente 2026-09-24 — servidor web-front-01
Se detectó beaconing desde 45.33.32.156 hacia hxxps://cdn-update[.]check-pkg[.]com/gate.php
Adicionalmente el usuario svc_backup@corp-ejemplo.com descargó:
  sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  md5: d41d8cd98f00b204e9800998ecf8427e
El binario persiste via tarea "GoogleUpdateTask" y mutex Global\\_qweopasnmx_
Relacionado: CVE-2026-12345, técnica T1059.001 (PowerShell), wallet del ransomware:
  bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
Más IOCs en https://app.any.run/task/abc123 y contacto en soc@miempresa.es
Registro: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater`

const KIND_TONE: Record<string, 'ok' | 'info' | 'warn' | 'bad' | 'accent' | 'neutral'> = {
  ipv4: 'bad', cidr: 'warn', ipv6: 'warn', url: 'bad', email: 'info',
  'hash-md5': 'accent', 'hash-sha1': 'accent', 'hash-sha256': 'accent',
  cve: 'warn', mitre: 'info', btc: 'accent', xmr: 'accent', telegram: 'info',
  asn: 'neutral', registry: 'info', mutex: 'warn', dominio: 'bad', defanged: 'info',
}

export default function Iocextract() {
  const [text, setText] = useState(SAMPLE)
  const [filter, setFilter] = useState('')
  const [hideFp, setHideFp] = useState(true)
  const toast = useToast()

  const all = useMemo(() => extractIocs(text), [text])
  const hits = useMemo(() => {
    let out = all
    if (hideFp) out = out.filter((h) => !looksLikeFalsePositive(h))
    if (filter.trim()) {
      const f = filter.toLowerCase()
      out = out.filter((h) => h.value.toLowerCase().includes(f) || h.kind.includes(f))
    }
    return out
  }, [all, filter, hideFp])

  const kinds = useMemo(() => [...new Set(all.map((h) => h.kind))], [all])

  const exportCsv = () => {
    const head = 'type,value,context'
    const rows = hits.map((h) => `${h.kind},"${h.value.replace(/"/g, '""')}","${h.context.replace(/"/g, '""')}"`)
    download('iocs.csv', '\ufeff' + head + '\n' + rows.join('\n'), 'text/csv;charset=utf-8')
    toast(`${hits.length} IOCs exportados`)
  }

  const exportStix = () => {
    download('iocs.stix.json', IOC_STIX_TEMPLATE(hits, 'hacknexus-extract'), 'application/json')
    toast('bundle STIX 2.1 descargado')
  }

  return (
    <div>
      <ToolHeader icon={Crosshair} title="IOC Extractor" desc="Pega un informe, log, tweet o correo y extrae todos los indicadores de compromiso: IPs, dominios, hashes, CVEs, wallets, mutexes, técnicas MITRE — con contexto y enlaces de análisis listos" />

      <InfoBanner>
        <b>Del texto crudo a los IOCs en un clic.</b> Entiende defanging (<span className="font-mono">hxxp[://]evil[.]com</span>) automáticamente para el análisis y te devuelve los valores refangados. Los enlaces van a VirusTotal, AbuseIPDB, Shodan, MalwareBazaar, NVD… según el tipo. Exporta CSV para tu SIEM o STIX 2.1 para plataformas MISP/OpenCTI.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">texto de entrada</h3>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" className="gap-1 px-2 py-1 text-xs" onClick={() => setText('')}><Trash2 size={12} /> limpiar</Button>
              <Button variant="ghost" className="gap-1 px-2 py-1 text-xs" onClick={() => setText(SAMPLE)}>cargar ejemplo</Button>
            </div>
          </div>
          <Field label="pega aquí el informe, log o mensaje">
            <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="Pega aquí el informe de incidente, el log, el tweet del threat actor…" className="min-h-40 font-mono text-[12px]" />
          </Field>
          <p className="mt-2 font-mono text-[11px] text-grey">{iocSummary(all)}</p>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          <TextInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filtrar por valor o tipo…" className="min-w-48 flex-1 font-mono" />
          <button onClick={() => setHideFp(!hideFp)} className={`rounded-lg border px-3 py-2 font-mono text-[11px] ${hideFp ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>
            ocultar FP: {hideFp ? 'ON' : 'OFF'}
          </button>
          <Button variant="ghost" onClick={exportCsv} className="gap-2 px-3 py-2 text-xs"><Download size={13} /> CSV</Button>
          <Button variant="ghost" onClick={exportStix} className="gap-2 px-3 py-2 text-xs"><Download size={13} /> STIX 2.1</Button>
        </div>
      </Reveal>

      {kinds.length > 0 && (
        <Reveal>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {kinds.map((k) => {
              const n = all.filter((h) => h.kind === k).length
              return <Badge key={k} tone={KIND_TONE[k] ?? 'neutral'}>{k}: {n}</Badge>
            })}
          </div>
        </Reveal>
      )}

      <div className="space-y-2">
        {hits.map((h, i) => (
          <Reveal key={i}>
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={KIND_TONE[h.kind] ?? 'neutral'}>{h.kind}</Badge>
                <code className="break-all font-mono text-[13px] text-ink">{h.value}</code>
                {h.count > 1 && <Badge tone="neutral">×{h.count}</Badge>}
                {looksLikeFalsePositive(h) && <Badge tone="warn">posible FP</Badge>}
                <CopyBtn text={h.value} className="ml-auto" />
              </div>
              <p className="mt-1.5 break-words font-mono text-[10.5px] text-grey">contexto: {h.context}</p>
              {iocLinks(h).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {iocLinks(h).map((l) => (
                    <a key={l.label} href={l.url} target="_blank" rel="noreferrer noopener" className="rounded-lg border border-edge px-2.5 py-1 font-mono text-[10.5px] text-info transition-colors hover:border-info/50 hover:bg-info/5">
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        ))}
        {hits.length === 0 && all.length === 0 && <div className="card p-6 text-center font-mono text-xs text-grey">pega texto con IOCs para analizarlo</div>}
      </div>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">formato MISP / OpenCTI (STIX 2.1)</h3>
          <CopyBlock text={hits.length ? IOC_STIX_TEMPLATE(hits.slice(0, 10), 'preview') : '# analiza texto para generar el bundle'} label="STIX preview (10 primeros)" maxH="260" />
        </div>
      </Reveal>
    </div>
  )
}
