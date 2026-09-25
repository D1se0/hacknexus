import { useMemo, useState } from 'react'
import { FileLock2 } from 'lucide-react'
import { ToolHeader, Badge, Reveal, Field, TextInput, CopyBlock, InfoBanner } from '../components/ui'
import { umaskEffects, octal, modeToRwx, UMASK_PRESETS, DIGIT_MEANING, umaskVerdict } from '../lib/umask'

const DIGIT_LABEL: Record<string, string> = { '0': '0 — nada quitado', '1': '1 — quita x', '2': '2 — quita w', '3': '3 — quita wx', '4': '4 — quita r', '5': '5 — quita rx', '6': '6 — quita rw', '7': '7 — quita todo' }

export default function Umaskgen() {
  const [d1, setD1] = useState('0')
  const [d2, setD2] = useState('2')
  const [d3, setD3] = useState('2')
  const [custom, setCustom] = useState('')

  const digits = custom !== '' && /^[0-7]{1,4}$/.test(custom.trim()) ? custom.trim().padStart(4, '0').slice(-4).split('') : [d1, d2, d3]
  const umaskValue = parseInt(digits.join(''), 8) & 0o777
  const { file, dir } = umaskEffects(umaskValue)
  const verdict = umaskVerdict(umaskValue)

  const shellCmd = `umask ${octal(umaskValue)}`
  const permCmd = `# permanente para el usuario:
echo 'umask ${octal(umaskValue)}' >> ~/.bashrc
# para servicios (systemd):
#   UMask=${octal(umaskValue)}  en el [Service] del unit
# para SSH:
#   print 'umask ${octal(umaskValue)}' >> /etc/pam.d/sshd  (o en /etc/login.defs: UMASK ${octal(umaskValue)})`

  const rows = useMemo(
    () => [
      { base: '666 (fichero)', result: file, rwx: modeToRwx(file) },
      { base: '777 (directorio)', result: dir, rwx: modeToRwx(dir) },
    ],
    [file, dir],
  )

  const setAll = (a: string, b: string, c: string) => { setCustom(''); setD1(a); setD2(b); setD3(c) }

  return (
    <div>
      <ToolHeader icon={FileLock2} title="Generador Umask" desc="Calcula qué permisos tendrán los ficheros nuevos según la máscara, con veredicto de seguridad y presets" />

      <InfoBanner>
        umask <b>no concede permisos, los quita</b>: los ficheros nacen en 666 y los directorios en 777, y la máscara resta bits. Por eso no existe umask que produzca un fichero ejecutable de serie (x se quita siempre de la base 666).
      </InfoBanner>

      <Reveal>
        <div className="card grid gap-6 p-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">máscara (3 dígitos)</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: d1, set: setD1, label: 'dueño (u)' },
                { v: d2, set: setD2, label: 'grupo (g)' },
                { v: d3, set: setD3, label: 'otros (o)' },
              ].map((d, i) => (
                <div key={i}>
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-grey">{d.label}</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['0', '1', '2', '3', '4', '5', '6', '7'].map((n) => (
                      <button
                        key={n}
                        onClick={() => { d.set(n); setCustom('') }}
                        className={`rounded-md border py-1.5 font-mono text-xs transition-all ${d.v === n ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-acento/40 hover:text-ink'}`}
                        title={DIGIT_LABEL[n]}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Field label="o escribe una umask" hint="0-777 octal" className="mt-4">
              <TextInput value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-7]/g, ''))} placeholder="ej: 027" className="font-mono" />
            </Field>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="rounded-xl border border-edge bg-black/40 p-5 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-grey">umask resultante</div>
              <div className="mt-1 font-mono text-5xl font-extrabold text-acento">{octal(umaskValue)}</div>
              <div className="mt-1 font-mono text-xs text-grey">simbólica: u={modeToRwx((~umaskValue >> 6) & 7).replace(/-/g, '')}, g={modeToRwx((~umaskValue >> 3) & 7).replace(/-/g, '')}, o={modeToRwx(~umaskValue & 7).replace(/-/g, '')}</div>
            </div>
            <Badge tone={verdict.tone} className="justify-center py-2 text-center whitespace-pre-wrap">{verdict.text}</Badge>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.base} className="card p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-grey">nuevo {r.base}</span>
                <span className="font-mono text-2xl font-bold text-white">{octal(r.result)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-grey">
                <span className="tracking-widest">{r.rwx}</span>
                <span className="flex gap-3">
                  <span>r:{(r.result >> 6) & 4 ? 'sí' : 'no'} · w:{(r.result >> 3) & 2 ? 'grupo sí' : 'no'} · o:{r.result & 7 ? 'algo' : 'nada'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Reveal><CopyBlock text={shellCmd} label="comando shell" maxH="max-h-24" /></Reveal>
        <Reveal><CopyBlock text={permCmd} label="hacerla permanente" maxH="max-h-40" /></Reveal>
      </div>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">presets habituales</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {UMASK_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setAll(p.label[0], p.label[1], p.label[2])}
                className={`rounded-lg border p-3 text-left transition-all hover:border-acento/50 hover:bg-acento/5 ${octal(umaskValue) === p.label ? 'border-acento/60 bg-acento/10' : 'border-edge'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-acento">{p.label}</span>
                  <span className="font-mono text-[10px] text-grey">{p.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <h3 className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">qué quita cada dígito</h3>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead><tr className="text-left text-grey/60"><th className="pb-2 pr-4">dígito</th><th className="pb-2 pr-4">fichero (de rw-)</th><th className="pb-2">directorio (de rwx)</th></tr></thead>
              <tbody className="divide-y divide-edge/60">
                {DIGIT_MEANING.map((d) => (
                  <tr key={d.digit}>
                    <td className="py-1.5 pr-4 text-acento">{d.digit}</td>
                    <td className="py-1.5 pr-4 tracking-widest text-ink">{d.file}</td>
                    <td className="py-1.5 tracking-widest text-ink">{d.dir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-mono text-[11px] text-grey/70">
            💡 Prueba real en tu shell: <span className="text-info">umask 027 &amp;&amp; touch f &amp;&amp; mkdir d &amp;&amp; ls -l f d</span>
          </p>
        </div>
      </Reveal>
    </div>
  )
}
