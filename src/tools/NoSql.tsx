import { useMemo, useState } from 'react'
import { Database, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput, CopyBlock } from '../components/ui'
import { nosqlPayloads } from '../lib/injection'

export default function NoSql() {
  const [url, setUrl] = useState('https://target.com/login')
  const [user, setUser] = useState('user')
  const [pass, setPass] = useState('password')

  const payloads = useMemo(() => nosqlPayloads(url, user, pass), [url, user, pass])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Database}
        title="NoSQL Injection Forge"
        desc="Operadores Mongo ($ne, $gt, $regex, $where) y array smuggling urlencoded: JSON y URL listos para POST y GET, con el criterio de confirmación de cada uno"
        badge="web"
      />

      <InfoBanner>
        La NoSQLi no busca romper strings como la SQLi: busca que el DRIVER reciba un objeto donde el código esperaba un string. Por eso el vector estrella es <code className="text-ink">password[$ne]=x</code> en bodies urlencoded — el parser lo convierte en objeto ANTES de que tu código valide nada.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 grid gap-3 p-5 sm:grid-cols-3">
          <Field label="endpoint de login">
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono text-[12px]" />
          </Field>
          <Field label="param usuario">
            <TextInput value={user} onChange={(e) => setUser(e.target.value)} className="font-mono text-[12px]" />
          </Field>
          <Field label="param contraseña">
            <TextInput value={pass} onChange={(e) => setPass(e.target.value)} className="font-mono text-[12px]" />
          </Field>
        </div>
      </Reveal>

      <div className="space-y-3">
        {payloads.map((p, i) => (
          <Reveal key={p.name} delay={Math.min(i * 0.03, 0.15)}>
            <div className="card p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-[13px] font-bold text-white">{p.name}</h3>
                <Badge tone="info">{p.db}</Badge>
              </div>
              <p className="mb-3 text-[12px] leading-relaxed text-grey">{p.why}</p>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">body JSON (POST application/json):</p>
                  <CopyBlock text={p.json} label="payload.json" maxH="max-h-40" />
                </div>
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">query string (GET o form-urlencoded):</p>
                  <CopyBlock text={p.url} label="url" maxH="max-h-40" />
                </div>
              </div>
              <p className="mt-2 rounded-lg border border-ok/30 bg-ok/5 px-3 py-2 text-[12px] leading-relaxed text-ok">✓ {p.detect}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="card mt-4 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> por dónde empezar de verdad</h3>
          <ol className="space-y-2 text-[12.5px] leading-relaxed text-grey">
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">1.</span><span>Intercepta el login y mira si el body es JSON o form-urlencoded: en form, prueba primero <code className="text-acento">{pass}[$ne]=invalid</code> — es el que funciona en PHP/Express/Rack sin tocar nada más.</span></li>
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">2.</span><span>Si el body es JSON pero el login falla con objeto, puede que el backend valide <code className="text-acento">typeof password === 'string'</code>: prueba entonces el reflejo en OTHERS endpoints (search, filtros, reset) que rara vez validan tipo.</span></li>
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">3.</span><span>Con $regex confirma y EXTRAE: automatiza el prefijo (^a, ^b, ^aa…) y tendrás la contraseña carácter a carácter en minutos, sin romper el hash ni tocar la base.</span></li>
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">4.</span><span>El criterio de éxito es SIEMPRE diferencial: misma petición, dos valores, dos resultados distintos. Si no hay diferencia, no hay inyección.</span></li>
          </ol>
        </div>
      </Reveal>
    </div>
  )
}
