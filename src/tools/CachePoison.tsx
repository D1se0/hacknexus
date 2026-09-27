import { useMemo, useState } from 'react'
import { Ghost, Shuffle, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput, CopyBlock } from '../components/ui'
import { CACHE_TECHS, cachePoisonExample, cacheDeceptionPaths, cacheDeceptionTest } from '../lib/web'

export default function CachePoison() {
  const [target, setTarget] = useState('https://target.com/')
  const [attacker, setAttacker] = useState('TU-SERVIDOR.com')

  const poison = useMemo(() => cachePoisonExample(target, attacker), [target, attacker])
  const deception = useMemo(() => cacheDeceptionTest(target), [target])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Ghost}
        title="Web Cache Poisoning & Deception"
        desc="Envenena la caché para otros usuarios (headers sin clave, fat GET, ofuscación) y engáñala para que guarde datos autenticados bajo una URL pública"
        badge="web"
      />

      <InfoBanner>
        <b className="text-ink">Poisoning</b> = metes TU contenido en la respuesta cacheada que sirve a TODOS. <b className="text-ink">Deception</b> = consigues que la caché guarde TU página autenticada bajo una URL que otro puede leer. Mismo componente, dirección opuesta del abuso.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 grid gap-3 p-5 sm:grid-cols-2">
          <Field label="url objetivo"><TextInput value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono text-[12px]" /></Field>
          <Field label="tu servidor (OOB/JS host)"><TextInput value={attacker} onChange={(e) => setAttacker(e.target.value)} className="font-mono text-[12px]" /></Field>
        </div>
      </Reveal>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Reveal delay={0.03}>
            <div className="card h-full p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Ghost size={15} className="text-acento" /> poisoning: técnicas</h3>
              <div className="space-y-2">
                {CACHE_TECHS.map((t) => (
                  <details key={t.id} className="group rounded-lg border border-edge bg-black/20 open:border-acento/40">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5">
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold text-ink">{t.name}</span>
                      <span className="text-grey transition-transform group-open:rotate-90">▸</span>
                    </summary>
                    <div className="border-t border-edge px-3.5 py-3">
                      <p className="text-[12px] leading-relaxed text-grey">{t.how}</p>
                      <p className="mt-2 rounded border border-info/30 bg-info/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-info">prueba: {t.probe}</p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ok">✓ {t.detect}</p>
                    </div>
                  </details>
                ))}
              </div>
              <div className="mt-3">
                <CopyBlock text={poison.curl} label="poison-poc.sh" maxH="max-h-48" />
                <p className="mt-2 text-[11.5px] leading-relaxed text-grey">{poison.explanation}</p>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="space-y-4">
          <Reveal delay={0.05}>
            <div className="card h-full p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Shuffle size={15} className="text-acento" /> deception: rutas que engañan a la caché</h3>
              <div className="space-y-2">
                {cacheDeceptionPaths().map((p) => (
                  <div key={p.path} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                    <code className="break-all font-mono text-[11.5px] text-acento">{p.path}</code>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-grey">{p.why}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <CopyBlock text={deception} label="deception-test.sh" maxH="max-h-48" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.07}>
        <div className="card mt-4 p-5">
          <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> metodología en 4 pasos</h3>
          <ol className="space-y-2 text-[12.5px] leading-relaxed text-grey">
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">1.</span><span><b className="text-ink">Identifica la caché:</b> cabeceras de age (Age, X-Cache, CDN-Cache), timeouts y qué se cachea (a veces solo assets, a veces HTML con query strings).</span></li>
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">2.</span><span><b className="text-ink">Encuentra reflejos sin clave:</b> mete un valor único (canary) en cada header y parámetro, y busca el reflejo. Param Miner automatiza la parte de headers.</span></li>
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">3.</span><span><b className="text-ink">Verifica el cache hit:</b> repite la petición desde otra sesión/sin cookies: si el reflejo sigue ahí, envenenaste la entrada de otros usuarios.</span></li>
            <li className="flex gap-2"><span className="font-mono font-bold text-acento">4.</span><span><b className="text-ink">Escala el impacto:</b> reflejo de header → import de JS → XSS persistente. Un reflejo tonto sin sink es "informativo"; con sink, es crítico.</span></li>
          </ol>
        </div>
      </Reveal>
    </div>
  )
}
