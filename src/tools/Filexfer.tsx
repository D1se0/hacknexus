import { useMemo, useState } from 'react'
import { FileInput } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, Field, TextInput, Reveal, InfoBanner } from '../components/ui'
import { XFER_METHODS, XFER_NOTES, XFER_DETECTION, buildXfer, type XferDir, type XferOS } from '../lib/filexfer'

export default function Filexfer() {
  const [host, setHost] = useState('10.10.14.1')
  const [port, setPort] = useState('8000')
  const [file, setFile] = useState('linpeas.sh')
  const [outName, setOutName] = useState('/tmp/lpe.sh')
  const [os, setOs] = useState<XferOS | 'ambos'>('ambos')
  const [dir, setDir] = useState<XferDir | 'ambos'>('ambos')

  const list = useMemo(() => XFER_METHODS.filter((m) => (os === 'ambos' || m.os === os || m.os === 'ambos') && (dir === 'ambos' || m.dir === dir || m.dir === 'ambos')), [os, dir])

  return (
    <>
      <ToolHeader icon={FileInput} title="File Transfer Arsenal" desc="14 métodos de transferencia atacante ↔ víctima con los comandos EXACTOS generados para tu IP y fichero: HTTP, netcat, scp, base64 inline, /dev/tcp, certutil, PowerShell, SMB, bitsadmin, FTP…" />

      <InfoBanner>
        <b>Elige sentido:</b> "descarga" = la víctima baja el fichero DESDE ti · "subida" = la víctima te manda datos A TI.
        Verifica SIEMPRE el hash en ambos extremos. En CTFs: HTTP server + wget (Linux) o certutil (Windows).
      </InfoBanner>

      <div className="mb-4 grid gap-2 md:grid-cols-4">
        <Field label="Tu IP (atacante)"><TextInput value={host} onChange={(e) => setHost(e.target.value)} className="font-mono" /></Field>
        <Field label="Puerto"><TextInput value={port} onChange={(e) => setPort(e.target.value)} className="font-mono" /></Field>
        <Field label="Fichero"><TextInput value={file} onChange={(e) => setFile(e.target.value)} className="font-mono" /></Field>
        <Field label="Destino en la víctima"><TextInput value={outName} onChange={(e) => setOutName(e.target.value)} className="font-mono" /></Field>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(['ambos', 'linux', 'windows'] as const).map((o) => (
          <button key={o} onClick={() => setOs(o)} className={`rounded border px-3 py-1.5 text-xs ${os === o ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey'}`}>
            {o === 'ambos' ? 'todos los SO' : o}
          </button>
        ))}
        {(['ambos', 'down', 'up'] as const).map((d) => (
          <button key={d} onClick={() => setDir(d)} className={`rounded border px-3 py-1.5 text-xs ${dir === d ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey'}`}>
            {d === 'ambos' ? 'ambos sentidos' : d === 'down' ? '⬇ víctima descarga' : '⬆ víctima sube'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((m, i) => {
          const cmd = buildXfer(m.id, { host, port, file, outName })
          return (
            <Reveal key={m.id} delay={Math.min(i * 0.015, 0.25)}>
              <div className="rounded-lg border border-edge p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{m.label}</span>
                  <Badge tone={m.os === 'windows' ? 'info' : m.os === 'linux' ? 'ok' : 'neutral'}>{m.os}</Badge>
                  <Badge tone={m.dir === 'down' ? 'accent' : m.dir === 'up' ? 'warn' : 'neutral'}>
                    {m.dir === 'down' ? '⬇ descarga' : m.dir === 'up' ? '⬆ subida' : '⇅ ambos'}
                  </Badge>
                  {cmd && <span className="ml-auto"><CopyBtn text={cmd} /></span>}
                </div>
                {cmd && <pre className="overflow-x-auto rounded bg-black/50 px-2 py-1.5 font-mono text-[11.5px] text-ok">{cmd}</pre>}
                {m.note && <p className="mt-1 text-[11px] text-grey">{m.note}</p>}
              </div>
            </Reveal>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-edge bg-black/30 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">OPSEC y trampas</h4>
          <ul className="space-y-1.5 text-[11px] text-grey">
            {XFER_NOTES.map((n) => <li key={n}>• {n}</li>)}
          </ul>
        </div>
        <div className="rounded border border-warn/30 bg-warn/5 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-warn">Cómo se detecta (blue team)</h4>
          <ul className="space-y-2 text-[11px]">
            {XFER_DETECTION.map(([k, v]) => (
              <li key={k}><span className="font-mono text-ink">{k}</span><p className="text-grey">{v}</p></li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
