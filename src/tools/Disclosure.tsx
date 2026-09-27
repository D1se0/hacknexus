import { useMemo, useState } from 'react'
import { Eye, Search, Info } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, TextInput, CopyBlock } from '../components/ui'
import { DISCLOSURE_VECTORS } from '../lib/web'

const SEV_TONE = { info: 'neutral', media: 'warn', alta: 'info', crítica: 'bad' } as const

export default function Disclosure() {
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState(DISCLOSURE_VECTORS[0].id)

  const list = useMemo(
    () => DISCLOSURE_VECTORS.filter((v) => !q || (v.name + v.where + v.leak).toLowerCase().includes(q.toLowerCase())),
    [q],
  )
  const sel = DISCLOSURE_VECTORS.find((v) => v.id === selId) ?? list[0] ?? DISCLOSURE_VECTORS[0]

  const probeScript = useMemo(
    () =>
      [
        '# sondas rápidas de disclosure (sobre targets autorizados):',
        `curl -sI ${'${TARGET}'} | grep -iE 'server|x-powered|x-aspnet|x-generator|via'`,
        `for p in .git/HEAD .env config.json backup.zip dump.sql phpinfo.php actuator/env openapi.json .DS_Store app.js.map robots.txt; do`,
        `  code=$(curl -s -o /dev/null -w "%{http_code}" ${'${TARGET}'}/$p)`,
        `  [ "$code" != "404" ] && echo "$code → /$p"`,
        `done`,
        ``,
        '# CORS mal configurado (refleja origin?):',
        `curl -sI -H "Origin: https://evil.com" ${'${TARGET}'}/api/user | grep -i access-control`,
        ``,
        '# source maps:',
        `curl -s ${'${TARGET}'}/app.js | grep -o 'sourceMappingURL=[^ ]*'`,
      ].join('\n'),
    [],
  )

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Eye}
        title="Information Disclosure Hunter"
        desc="12 vectores de fuga de información con su sonda exacta: .git expuesto, .env, actuator, source maps, CORS reflejo, buckets… priorizados por impacto"
        badge="web"
      />

      <InfoBanner>
        La fuga de información es el hallazgo más subestimado: por sí sola parece "info", pero es la materia prima de todo lo demás — secretos para pivotar, versiones para CVEs, endpoints internos para atacar. Recompensa en programas: de informativo a crítico según lo que se fuga.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[360px_1fr]">
        <Reveal>
          <div className="card p-3">
            <div className="mb-2 flex items-center gap-2 px-2">
              <Search size={14} className="text-acento" />
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="filtrar vectores…" className="py-1.5 text-[12px]" />
            </div>
            <div className="max-h-[520px] space-y-1 overflow-y-auto">
              {list.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelId(v.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${selId === v.id ? 'border-acento/50 bg-acento/10' : 'border-edge bg-black/20 hover:border-edge'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-bold text-ink">{v.name}</span>
                    <Badge tone={SEV_TONE[v.severity]}>{v.severity}</Badge>
                  </div>
                  <p className="truncate font-mono text-[10.5px] text-grey">{v.where}</p>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.03}>
            <div className="card p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-white">{sel.name}</h3>
                <Badge tone={SEV_TONE[sel.severity]}>{sel.severity}</Badge>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-grey">dónde</p>
                  <p className="font-mono text-[12px] text-ink">{sel.where}</p>
                </div>
                <div className="rounded-lg border border-info/30 bg-info/5 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-info">sonda</p>
                  <p className="font-mono text-[12px] text-ink">{sel.probe}</p>
                </div>
                <div className="rounded-lg border border-bad/30 bg-bad/5 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-bad">qué se fuga</p>
                  <p className="text-[12px] leading-relaxed text-ink/90">{sel.leak}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">script de reconocimiento automático</h3>
              <CopyBlock text={probeScript} label="disclosure-scan.sh" maxH="max-h-64" />
              <p className="mt-2 text-[11.5px] leading-relaxed text-grey">Exporta <code className="text-acento">TARGET=https://target.com</code> antes de lanzarlo. Los códigos != 404 merecen mirada manual (403 también puede indicar que existe).</p>
            </div>
          </Reveal>

          <Reveal delay={0.07}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Info size={15} className="text-acento" /> cómo reportarlo bien</h3>
              <p className="text-[12.5px] leading-relaxed text-grey">
                Un reporte de disclosure vale por su IMPACTO demostrado: no digas "hay un .env", muestra <b className="text-ink">qué credenciales filtra y qué permite hacer con ellas</b> (sin explotar más de lo necesario). Si es un 404-listing sin nada sensible, es informativo — sé honesto con la severidad y tu credibilidad sube.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
