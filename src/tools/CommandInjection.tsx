import { useMemo, useState } from 'react'
import { Terminal, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput } from '../components/ui'
import { CodeBlock } from '../components/highlight'
import { cmdPayloads, type CmdCtx, type CmdGoal } from '../lib/injection'

const GOALS: CmdGoal[] = ['ejecución simple', 'output en la respuesta', 'cega (time-based)', 'cega (OOB/DNS)', 'lectura de fichero', 'reverse shell de lab']

export default function CommandInjection() {
  const [ctx, setCtx] = useState<CmdCtx>('unix')
  const [goal, setGoal] = useState<CmdGoal>('ejecución simple')
  const [param, setParam] = useState('filename')
  const [value, setValue] = useState('report.pdf')
  const [attacker, setAttacker] = useState('TU-IP:4444')

  const payloads = useMemo(() => cmdPayloads(ctx, goal), [ctx, goal])

  const inject = (cmd: string, sep: string): string => {
    const sepTok = sep === '$()' ? '$(' : sep === '` `'
      ? '`'
      : sep === '\n' ? '%0a' : sep
    if (sep === '$()') return `${value}$(${cmd})`
    if (sep === '` `') return `${value}\`${cmd}\``
    return `${value}${sepTok}${cmd.replace(/ATTACKER/g, attacker)}`
  }

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Terminal}
        title="Command Injection Forge"
        desc="Generador de inyecciones de comandos por sistema operativo y objetivo: ejecución visible, ciego time-based, OOB por DNS, lectura de ficheros y reverse shells de laboratorio"
        badge="web"
      />

      <InfoBanner>
        Cada payload muestra el parámetro INYECTADO completo para pegarlo directo en Burp/curl. El patrón siempre es el mismo: un input del usuario llega a <code className="text-ink">exec()/system()/shell</code> sin aislar del intérprete. En tu lab, la detección es la mitad del aprendizaje: cada payload trae su señal.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="sistema">
            <div className="flex gap-1.5">
              {(['unix', 'windows'] as const).map((c) => (
                <button key={c} onClick={() => { setCtx(c); setGoal('ejecución simple') }} className={`flex-1 rounded-lg border px-2 py-2 font-mono text-[12px] transition-all ${ctx === c ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
                  {c === 'unix' ? 'Linux/Unix' : 'Windows'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="parámetro vulnerable">
            <TextInput value={param} onChange={(e) => setParam(e.target.value)} />
          </Field>
          <Field label="valor legítimo">
            <TextInput value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="attacker (lab)" hint="para reverse/OOB">
            <TextInput value={attacker} onChange={(e) => setAttacker(e.target.value)} className="font-mono text-[12px]" />
          </Field>
        </div>
      </Reveal>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {GOALS.map((g) => (
          <button key={g} onClick={() => setGoal(g)} className={`rounded-lg border px-3 py-1.5 font-mono text-[11.5px] transition-all ${goal === g ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
            {g}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {payloads.map((p, i) => {
          const injected = `${param}=${encodeURIComponent(inject(p.cmd, p.sep))}`
          return (
            <Reveal key={i} delay={i * 0.03}>
              <div className="card p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{p.sep === '` `' ? 'backticks' : p.sep === '\n' ? 'salto de línea' : p.sep}</Badge>
                  <code className="font-mono text-[11.5px] text-acento">{p.cmd.replace(/ATTACKER/g, attacker)}</code>
                </div>
                <CodeBlock code={`${param}=${inject(p.cmd, p.sep)}`} lang="bash" label={`${param} (valor inyectado, sin URL-encode)`} />
                <div className="mt-2">
                  <CopyBlockSimple text={injected} label={`${param} urlencoded para la petición`} />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-grey"><b className="text-ink">por qué funciona:</b> {p.why}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-info"><b>detección:</b> {p.detect}</p>
              </div>
            </Reveal>
          )
        })}
      </div>

      <Reveal delay={0.1}>
        <div className="card mt-4 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> la defensa que de verdad funciona</h3>
          <p className="text-[12.5px] leading-relaxed text-grey">
            No es filtrar caracteres (siempre hay bypass): es <b className="text-ink">no invocar shell nunca</b>. <code className="text-acento">execFile('pdftotext', [input])</code> en vez de <code className="text-acento">exec('pdftotext ' + input)</code> — array de argumentos, sin intérprete, sin inyección posible. Si el diseño exige shell: whitelist estricta de VALORES (no de caracteres) y el usuario de servicio sin permisos para nada más.
          </p>
        </div>
      </Reveal>
    </div>
  )
}

/* bloque copiable mínimo inline (sin resaltado) */
import { CopyBtn } from '../components/ui'
const CopyBlockSimple = ({ text, label }: { text: string; label: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-black/40 px-3.5 py-2">
    <div className="min-w-0">
      <p className="font-mono text-[9px] uppercase tracking-widest text-grey">{label}</p>
      <p className="break-all font-mono text-[11.5px] text-ink/90">{text}</p>
    </div>
    <CopyBtn text={text} className="shrink-0" />
  </div>
)
