import { useMemo, useState } from 'react'
import { Ban, ArrowDown, ArrowUp } from 'lucide-react'
import { ToolHeader, Badge, TextArea, Button, Reveal, CopyBlock, Toggle } from '../components/ui'
import { defang, refang } from '../lib/encoders'

function detectIocs(text: string): { ips: number; urls: number; emails: number; domains: number } {
  return {
    ips: (text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []).length,
    urls: (text.match(/https?:\/\/[^\s"'<>]+/gi) ?? []).length,
    emails: (text.match(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g) ?? []).length,
    domains: (text.match(/\b(?:[\w-]+\.)+(?:com|net|org|io|es|dev|xyz|info|biz|ru|cn|top|onion)\b/gi) ?? []).length,
  }
}

export default function Defanger() {
  const [mode, setMode] = useState<'defang' | 'refang'>('defang')
  const [input, setInput] = useState(`Alerta: conexión saliente a http://185.220.101.47/payload.bin desde pc-victima.\nTambién DNS a malicioso-evason[.]com y correo de phishing soporte@banca-segura[.]com.\nOtro IOC: hxxps://secure-login.verify-account[.]ru/session`)
  const [fullMode, setFullMode] = useState(true)

  const output = useMemo(() => {
    const fn = mode === 'defang' ? defang : refang
    if (fullMode) return fn(input)
    // modo ligero: solo IPs y dominios, sin tocar http
    return mode === 'defang'
      ? input.replace(/\./g, '[.]')
      : input.replace(/\[\.\]|\(\.\)|\[dot\]/gi, '.')
  }, [input, mode, fullMode])

  const iocs = useMemo(() => detectIocs(input), [input])
  const total = iocs.ips + iocs.urls + iocs.emails + iocs.domains

  return (
    <div>
      <ToolHeader icon={Ban} title="Defanger / Refanger" desc="Neutraliza o restaura IPs, dominios, URLs y correos para compartir IOCs sin riesgo de clic accidental" />

      <Reveal>
        <div className="flex gap-2">
          {([
            ['defang', 'Desactivar (defang)', ArrowDown],
            ['refang', 'Restaurar (refang)', ArrowUp],
          ] as const).map(([m, label, Icon]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-sm transition-all ${
                mode === m ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-4 space-y-4 p-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-grey">entrada</span>
              {total > 0 && (
                <>
                  <Badge tone="info">{iocs.ips} IPs</Badge>
                  <Badge tone="info">{iocs.urls} URLs</Badge>
                  <Badge tone="info">{iocs.emails} emails</Badge>
                  <Badge tone="info">{iocs.domains} dominios</Badge>
                </>
              )}
            </div>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-40 font-mono" />
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <Toggle checked={fullMode} onChange={setFullMode} label={mode === 'defang' ? 'modo completo (http→hxxp, @→[@])' : 'modo completo ([@]→@)'} />
            <Button variant="ghost" onClick={() => setInput('')}>limpiar</Button>
            <span className="ml-auto font-mono text-[10px] text-grey">
              {mode === 'defang' ? '. → [.] · http → hxxp · @ → [@]' : '[.] → . · hxxp → http · [@] → @'}
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6">
          <CopyBlock text={output || '—'} label={`salida (${mode})`} maxH="max-h-96" />
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 Al reportar IOCs en tickets, blogs o threat feeds, defang SIEMPRE: evita que un lector clicke un enlace malicioso
          o que el SIEM resuelva el dominio. Formatos aceptados al refangear: <span className="text-acento">[.] (.) [dot] &#123;dot&#125;</span>.
        </div>
      </Reveal>
    </div>
  )
}
