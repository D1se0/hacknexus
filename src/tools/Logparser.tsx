import { useMemo, useRef, useState } from 'react'
import { ScrollText, Upload, Loader2, FileDown, ShieldAlert, Clock, Users, Globe, FileText } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, ErrorBox, InfoBanner } from '../components/ui'
import { parseLog, SAMPLE_SYSLOG, type LogStats } from '../lib/logparse'
import { download, fmtNum } from '../lib/util'

export default function Logparser() {
  const [raw, setRaw] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async (file: File) => {
    setLoading(true)
    setErr(null)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Log demasiado grande (máx 20 MB)')
      setRaw(await file.text())
      setFileName(file.name)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const stats: LogStats | null = useMemo(() => {
    if (!raw.trim()) return null
    try {
      return parseLog(raw)
    } catch {
      return null
    }
  }, [raw])

  const maxHour = stats ? Math.max(...stats.hours.map((h) => h.count), 1) : 1

  const exportJson = () => {
    if (!stats) return
    download('forense-log.json', JSON.stringify(stats, null, 2), 'application/json')
  }

  return (
    <div>
      <ToolHeader icon={ScrollText} title="Log Forensics" desc="Análisis de auth.log/syslog y eventos Windows (EVTX-XML): fuerza bruta, logins, sudo, cuenta creada, log limpiado — 100% local" />

      <InfoBanner>
        Pega el log o suelta el fichero. Formato autodetectado: <b>syslog</b> (auth.log, secure, messages) o <b>EVTX-XML</b> (Visor de eventos → Guardar como XML, o <code>evtx_export.exe</code>). Nada sale de tu navegador.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => inputRef.current?.click()} className="gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} cargar fichero
            </Button>
            <Button variant="ghost" onClick={() => { setRaw(SAMPLE_SYSLOG); setFileName('auth.log (ejemplo)') }} className="gap-2">
              <FileText size={14} /> cargar ejemplo
            </Button>
            {fileName && <Badge tone="accent">{fileName}</Badge>}
            <input ref={inputRef} type="file" hidden accept=".log,.txt,.xml,.evtx.xml,text/plain,application/xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f) }} />
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            placeholder={'Mar 14 02:14:19 srv01 sshd[2210]: Failed password for root from 185.220.101.34 port 40212 ssh2\n… o pega aquí el XML del Visor de eventos de Windows'}
            className="min-h-40 w-full resize-y rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-acento/60"
          />
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {stats && (
        <>
          {/* resumen */}
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">resumen</h3>
                <Badge tone={stats.format === 'evtx' ? 'info' : 'accent'}>{stats.format === 'evtx' ? 'Windows EVTX-XML' : 'syslog Unix'}</Badge>
                <Badge tone="neutral">{fmtNum(stats.total)} líneas</Badge>
                {stats.failed > 0 && <Badge tone="bad">{fmtNum(stats.failed)} fallos auth</Badge>}
                {stats.accepted > 0 && <Badge tone="ok">{fmtNum(stats.accepted)} accesos OK</Badge>}
                {stats.sudo > 0 && <Badge tone="warn">{fmtNum(stats.sudo)} sudo/4672</Badge>}
                {stats.suspicious.length > 0 && <Badge tone="bad">{stats.suspicious.length} sospechosos</Badge>}
                <Button variant="ghost" className="ml-auto gap-2 px-3 py-1.5 text-xs" onClick={exportJson}>
                  <FileDown size={13} /> JSON
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  { l: 'eventos', v: fmtNum(stats.total), c: 'text-white' },
                  { l: 'fallos auth', v: fmtNum(stats.failed), c: 'text-bad' },
                  { l: 'accesos ok', v: fmtNum(stats.accepted), c: 'text-ok' },
                  { l: 'sudo / 4672', v: fmtNum(stats.sudo), c: 'text-warn' },
                  { l: 'sospechosos', v: String(stats.suspicious.length), c: 'text-[#c084fc]' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-edge bg-black/30 p-3 text-center">
                    <span className={`block font-mono text-2xl font-bold ${s.c}`}>{s.v}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-grey">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* top IPs + usuarios */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {stats.ips.length > 0 && (
              <Reveal>
                <div className="card h-full p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Globe size={13} /> top IPs (fallos)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead><tr className="text-left text-grey/60"><th className="pb-2">IP</th><th className="pb-2">total</th><th className="pb-2">fallos</th><th className="pb-2">tipo</th></tr></thead>
                      <tbody className="divide-y divide-edge/60">
                        {stats.ips.slice(0, 10).map((ip) => (
                          <tr key={ip.ip}>
                            <td className="py-2 text-ink">{ip.ip}</td>
                            <td className="py-2 text-grey">{ip.count}</td>
                            <td className={`py-2 ${ip.failed > 5 ? 'text-bad' : 'text-warn'}`}>{ip.failed}</td>
                            <td className="py-2">{ip.isPrivate ? <Badge tone="info">interna</Badge> : <Badge tone="warn">externa</Badge>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>
            )}
            {stats.users.length > 0 && (
              <Reveal delay={0.05}>
                <div className="card h-full p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Users size={13} /> usuarios</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-xs">
                      <thead><tr className="text-left text-grey/60"><th className="pb-2">usuario</th><th className="pb-2">fallos</th><th className="pb-2">ok</th></tr></thead>
                      <tbody className="divide-y divide-edge/60">
                        {stats.users.slice(0, 10).map((u) => (
                          <tr key={u.name}>
                            <td className="py-2 text-ink">{u.name}</td>
                            <td className={`py-2 ${u.failed > 3 ? 'text-bad' : u.failed ? 'text-warn' : 'text-grey'}`}>{u.failed || '—'}</td>
                            <td className="py-2 text-ok">{u.accepted || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Reveal>
            )}
          </div>

          {/* histograma horario */}
          {stats.hours.length > 1 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Clock size={13} /> actividad por hora</h3>
                <div className="flex h-28 items-end gap-1 rounded-xl border border-edge bg-black/40 p-3">
                  {stats.hours.map((h) => (
                    <div key={h.label} className="group relative flex-1" title={`${h.label}: ${h.count} eventos (${h.failed} fallos)`}>
                      <div
                        className={`w-full rounded-t ${h.failed > 0 ? 'bg-bad/80' : 'bg-acento/60'}`}
                        style={{ height: `${Math.max(4, (h.count / maxHour) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[10px] text-grey">rojo = hora con fallos de autenticación · pasa el ratón para detalle</p>
              </div>
            </Reveal>
          )}

          {/* sospechosos */}
          {stats.suspicious.length > 0 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><ShieldAlert size={13} /> eventos sospechosos ({stats.suspicious.length})</h3>
                <div className="space-y-2">
                  {stats.suspicious.slice(0, 60).map((s, i) => (
                    <div key={i} className={`rounded-lg border px-3 py-2 font-mono text-[11px] ${s.sev === 'bad' ? 'border-bad/40 bg-bad/5' : 'border-warn/30 bg-warn/5'}`}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge tone={s.sev}>{s.sev === 'bad' ? 'crítico' : 'aviso'}</Badge>
                        {s.ts && <span className="text-grey">{s.ts}</span>}
                        <span className="text-acento">{s.reason}</span>
                      </div>
                      <p className="break-all text-ink/80">{s.text}</p>
                    </div>
                  ))}
                </div>
                {stats.suspicious.length > 60 && <p className="mt-3 font-mono text-[10px] text-grey">…y {stats.suspicious.length - 60} más (exporta el JSON para verlos todos)</p>}
              </div>
            </Reveal>
          )}

          {/* timeline crudo */}
          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">log cargado (primeras 200 líneas)</h3>
              <CopyBlock text={raw.split(/\r?\n/).slice(0, 200).join('\n')} label="log original" maxH="max-h-72" />
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
