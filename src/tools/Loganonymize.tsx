import { useMemo, useState } from 'react'
import { EyeOff, Eye, Download } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, TextArea, CopyBlock, InfoBanner, useToast } from '../components/ui'
import { anonymizeLog, deanonymizeLog, ANON_DEFAULTS, ANON_FAQ, ANON_USECASES, type AnonOptions, type AnonMatch } from '../lib/anonymize'
import { download } from '../lib/util'

const SAMPLE = `Sep 24 07:12:01 web-prod-01 sshd[2831]: Failed password for invalid user admin from 45.155.205.233 port 40222 ssh2
Sep 24 07:12:05 web-prod-01 sshd[2831]: Connection closed by 45.155.205.233 [preauth]
Sep 24 07:14:22 web-prod-01 sshd[3110]: Accepted publickey for deploy from 88.24.111.7 port 51444 ssh2
Sep 24 07:15:01 web-prod-01 CRON[3188]: (www-data) CMD (php /var/www/cron.php)
Sep 24 07:16:44 db01.corp mysqld[911]: Access denied for user 'app_read'@'10.0.3.44' (using password: YES)
Sep 24 07:18:02 web-prod-01 nginx: 203.0.113.42 - - [24/Sep/2026:07:18:02 +0000] "GET /admin HTTP/1.1" 403 153 "-" "curl/8.5.0"
Sep 24 07:20:11 mail.corp postfix/smtpd[4402]: warning: unknown[192.0.2.88] SASL login authentication failed: authentication failure for servicio@midominio.es`

export default function Loganonymize() {
  const [text, setText] = useState(SAMPLE)
  const [opts, setOpts] = useState<AnonOptions>(ANON_DEFAULTS)
  const [salt, setSalt] = useState('caso-2026-09')
  const [result, setResult] = useState<{ result: string; matches: AnonMatch[] } | null>(null)
  const [showMap, setShowMap] = useState(true)
  const toast = useToast()

  const run = () => {
    const out = anonymizeLog(text, { ...opts, salt })
    setResult(out)
    toast(`${out.matches.length} entidades anonimizadas`)
  }

  const revert = () => {
    if (!result) return
    const back = deanonymizeLog(result.result, result.matches)
    setText(back)
    setResult(null)
    toast('texto restaurado con el mapa de pseudónimos')
  }

  const exportMap = () => {
    if (!result) return
    const csv = 'original,token,tipo\n' + result.matches.map((m) => `"${m.original}","${m.token}",${m.kind}`).join('\n')
    download('anon-map.csv', csv, 'text/csv')
    toast('mapa de pseudónimos exportado (guárdalo bajo llave)')
  }

  const kindTone = (k: string): 'ok' | 'info' | 'warn' | 'bad' | 'accent' | 'neutral' =>
    k === 'ipv4' ? 'bad' : k === 'email' ? 'accent' : k === 'usuario' ? 'warn' : 'info'

  return (
    <div>
      <ToolHeader icon={EyeOff} title="Log Anonymizer" desc="Comparte logs y ficheros de configuración sin exponer IPs, usuarios ni dominios reales: pseudonimización consistente, reversible con el mapa y lista para foros, tickets e informes" />

      <InfoBanner>
        <b>Pseudonimización CONSISTENTE:</b> la misma IP produce siempre el mismo token (10.x.y.z), así el análisis de frecuencia y correlación sigue funcionando tras anonimizar. Con la <b>salt</b> compartida puedes anonimizar varios ficheros del mismo caso y cruzarlos; con sales distintas, no. El mapa original→token es lo que permite revertir: guárdalo cifrado o bórralo.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="salt del caso" hint="igual para todos los ficheros del mismo caso">
              <TextInput value={salt} onChange={(e) => setSalt(e.target.value)} className="font-mono" />
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              {(
                [
                  ['ip4', 'IPv4'],
                  ['ip6', 'IPv6'],
                  ['emails', 'emails'],
                  ['users', 'usuarios'],
                  ['macs', 'MACs'],
                  ['domains', 'dominios'],
                  ['hostnames', 'hostnames'],
                ] as [keyof AnonOptions, string][]
              ).map(([k, label]) => (
                <button key={k} onClick={() => setOpts((o) => ({ ...o, [k]: !o[k] }))} className={`rounded-lg border px-2.5 py-2 font-mono text-[11px] ${opts[k] ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">texto original</h3>
          <TextArea value={text} onChange={(e) => setText(e.target.value)} className="min-h-44 font-mono text-[12px]" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={run} className="gap-2"><EyeOff size={14} /> anonimizar</Button>
            {result && (
              <>
                <Button variant="ghost" onClick={revert} className="gap-2"><Eye size={14} /> revertir sobre el original</Button>
                <Button variant="ghost" onClick={exportMap} className="gap-2"><Download size={14} /> exportar mapa</Button>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {result && (
        <Reveal>
          <div className="card mb-4 p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">resultado anonimizado ({result.matches.length} entidades)</h3>
            <CopyBlock text={result.result} maxH="340" />
          </div>
        </Reveal>
      )}

      {result && showMap && (
        <Reveal>
          <div className="card mb-4 p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">mapa de pseudónimos (confidencial)</h3>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {result.matches.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-edge px-3 py-2">
                  <Badge tone={kindTone(m.kind)}>{m.kind}</Badge>
                  <code className="font-mono text-[12px] text-ink">{m.original}</code>
                  <span className="font-mono text-[11px] text-grey">→</span>
                  <code className="font-mono text-[12px] text-info">{m.token}</code>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">cuándo y por qué</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-grey">casos de uso reales</h4>
              <ul className="space-y-1">
                {ANON_USECASES.map((u) => <li key={u} className="font-mono text-[11px] leading-relaxed text-grey">— {u}</li>)}
              </ul>
            </div>
            <div>
              {ANON_FAQ.map(([q, a]) => (
                <details key={q} className="group mb-2">
                  <summary className="cursor-pointer font-mono text-[11px] text-ink group-open:text-acento">{q}</summary>
                  <p className="mt-1 pl-3 font-mono text-[10.5px] leading-relaxed text-grey">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
