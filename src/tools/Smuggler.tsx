import { useMemo, useState } from 'react'
import { Boxes, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput, CopyBlock } from '../components/ui'
import { SMUGGLE_TECHNIQUES, buildSmuggleRequest, smuggleProbeLoop, smuggleDefenses, type SmuggleTech } from '../lib/smuggler'

type Goal = 'probe' | 'steal' | 'redirect'
const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: 'probe', label: 'detección', desc: 'petición mínima que desincroniza y rompe la siguiente respuesta' },
  { id: 'steal', label: 'captura de cabeceras', desc: 'smuggled request que refleja las cabeceras del siguiente usuario hacia tu servidor' },
  { id: 'redirect', label: 'acceso a ruta interna', desc: 'GET /admin como si viniera de localhost (X-Forwarded-For forjado)' },
]

export default function Smuggler() {
  const [tech, setTech] = useState<SmuggleTech>('cl-te')
  const [goal, setGoal] = useState<Goal>('probe')
  const [host, setHost] = useState('TU-COLLABORATOR.burpcollaborator.net')
  const [path, setPath] = useState('/admin')
  const [target, setTarget] = useState('target.com')

  const request = useMemo(() => buildSmuggleRequest(tech, goal, host, path), [tech, goal, host, path])
  const technique = SMUGGLE_TECHNIQUES.find((t) => t.id === tech) ?? SMUGGLE_TECHNIQUES[0]

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Boxes}
        title="HTTP Request Smuggler"
        desc="Generador de peticiones desincronizadas CL.TE / TE.CL / TE.TE: quién interpreta qué, la petición exacta byte a byte, el loop de detección y las defensas"
        badge="web"
      />

      <InfoBanner>
        El smuggling explota que front-end y back-end DISCORDAN sobre dónde termina una petición. El resultado: tu prefijo envenena la petición del SIGUIENTE usuario. Solo contra infraestructura propia o con autorización expresa — el impacto en producción real es alto.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="host objetivo">
            <TextInput value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono text-[12px]" />
          </Field>
          <Field label="tu servidor (OOB)" hint="para captura">
            <TextInput value={host} onChange={(e) => setHost(e.target.value)} className="font-mono text-[11.5px]" />
          </Field>
          <Field label="ruta interna" hint="para /admin smuggled">
            <TextInput value={path} onChange={(e) => setPath(e.target.value)} className="font-mono text-[12px]" />
          </Field>
          <Field label="objetivo del PoC">
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className="w-full rounded-lg border border-edge bg-black/40 px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
              {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </Field>
        </div>
      </Reveal>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {SMUGGLE_TECHNIQUES.map((t) => (
          <button key={t.id} onClick={() => setTech(t.id)} className={`rounded-lg border px-3 py-1.5 font-mono text-[11.5px] transition-all ${tech === t.id ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
            {t.id.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Reveal delay={0.03}>
          <div className="card p-5">
            <h3 className="mb-3 font-mono text-sm font-bold text-white">petición desincronizada ({GOALS.find((g) => g.id === goal)?.label})</h3>
            <CopyBlock text={request} label="raw-request (\\r\\n literales)" maxH="max-h-80" />
            <p className="mt-2 text-[11.5px] leading-relaxed text-grey">
              En Burp usa <b className="text-ink">Repeater → Inspector → cambia el body a HEX</b> para controlar los \\r\\n exactos, o manda el raw con netcat/openssl. Un solo espacio mal puesto y no hay desincronización.
            </p>
            <div className="mt-3">
              <CopyBlock text={smuggleProbeLoop(target)} label="detect.sh" maxH="max-h-40" />
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">{technique.id.toUpperCase()}: quién cree qué</h3>
              <div className="space-y-2">
                <div className="rounded-lg border border-info/30 bg-info/5 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-info">front-end</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink/90">{technique.frontend}</p>
                </div>
                <div className="rounded-lg border border-warn/30 bg-warn/5 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-warn">back-end</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink/90">{technique.backend}</p>
                </div>
                <div className="rounded-lg border border-bad/30 bg-bad/5 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-bad">consecuencia</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink/90">{technique.why}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.07}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> defensas</h3>
              <div className="space-y-1.5">
                {smuggleDefenses().map((d) => (
                  <p key={d.check} className="text-[12px] leading-relaxed text-grey"><b className="text-ink">{d.check}:</b> {d.why}</p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="info">Turbo Intruder</Badge>
                <Badge tone="info">HTTP Request Smuggler (extensión Burp)</Badge>
                <Badge tone="neutral">nc / openssl s_client para raw</Badge>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
