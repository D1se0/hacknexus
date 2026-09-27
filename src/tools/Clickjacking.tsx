import { useMemo, useState } from 'react'
import { MousePointerClick, Eye, ShieldCheck } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, Field, TextInput, CopyBlock } from '../components/ui'
import { defaultClickjackConfig, clickjackHtml, clickjackVariants, clickjackDefense, type ClickjackConfig } from '../lib/web'

export default function Clickjacking() {
  const [cfg, setCfg] = useState<ClickjackConfig>(defaultClickjackConfig())
  const set = <K extends keyof ClickjackConfig>(k: K) => (v: ClickjackConfig[K]) => setCfg((c) => ({ ...c, [k]: v }))

  const html = useMemo(() => clickjackHtml(cfg), [cfg])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={MousePointerClick}
        title="Clickjacking Forge"
        desc="Generador de páginas señuelo con iframe invisible alineado: ajusta posición, tamaño y opacidad, ve el preview en vivo y copia el HTML — con las variantes de ataque y la defensa"
        badge="web"
      />

      <InfoBanner>
        El clickjacking funciona si el TARGET no envía CSP frame-ancestors ni X-Frame-Options, y la acción es destructiva de un click. Solo para laboratorio y programas de bug bounty que lo incluyan en su política: es de los hallazgos que más se aceptan mal.
      </InfoBanner>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[380px_1fr]">
        <Reveal>
          <div className="card space-y-3 p-5">
            <h3 className="font-mono text-sm font-bold text-white">configuración</h3>
            <Field label="url del target (acción crítica)"><TextInput value={cfg.targetUrl} onChange={(e) => set('targetUrl')(e.target.value)} className="font-mono text-[11.5px]" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ancho iframe"><TextInput type="number" value={cfg.width} onChange={(e) => set('width')(Number(e.target.value))} /></Field>
              <Field label="alto iframe"><TextInput type="number" value={cfg.height} onChange={(e) => set('height')(Number(e.target.value))} /></Field>
              <Field label="offset X (left)"><TextInput type="number" value={cfg.left} onChange={(e) => set('left')(Number(e.target.value))} /></Field>
              <Field label="offset Y (top)"><TextInput type="number" value={cfg.top} onChange={(e) => set('top')(Number(e.target.value))} /></Field>
            </div>
            <Field label="opacidad del iframe" hint={`${cfg.opacity}`}>
              <input type="range" min={0} max={1} step={0.0001} value={cfg.opacity} onChange={(e) => set('opacity')(Number(e.target.value))} className="w-full accent-[var(--acento)]" />
            </Field>
            <p className="text-[11.5px] leading-relaxed text-grey">Sube la opacidad a 1.0 durante el DESARROLLO para ver dónde queda el botón del target; déjala en 0.0001 para el PoC final (invisible pero clicable).</p>
            <Field label="título del señuelo"><TextInput value={cfg.decoyTitle} onChange={(e) => set('decoyTitle')(e.target.value)} /></Field>
            <Field label="texto del señuelo"><TextInput value={cfg.decoyBody} onChange={(e) => set('decoyBody')(e.target.value)} /></Field>
            <Field label="botón del señuelo"><TextInput value={cfg.decoyButton} onChange={(e) => set('decoyButton')(e.target.value)} /></Field>
          </div>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={0.03}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><Eye size={15} className="text-acento" /> preview del señuelo (iframe simulado)</h3>
              <div className="relative mx-auto flex min-h-56 w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-edge bg-white p-8 text-center" style={{ color: '#111' }}>
                <div>
                  <h4 className="text-xl font-extrabold">{cfg.decoyTitle}</h4>
                  <p className="mt-1 text-sm opacity-70">{cfg.decoyBody}</p>
                  <button className="mt-4 rounded-lg px-6 py-2.5 text-base font-bold text-white" style={{ background: '#e11d48' }}>{cfg.decoyButton}</button>
                </div>
                {/* simulación del iframe posicionado */}
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-acento/70"
                  style={{
                    width: cfg.width, height: cfg.height, left: `calc(50% + ${cfg.left}px)`, top: `calc(50% + ${cfg.top}px)`, opacity: Math.max(cfg.opacity, 0.55),
                  }}
                  title="posición del iframe del target"
                >
                  <span className="absolute -top-5 left-0 whitespace-nowrap font-mono text-[9px] text-acento">iframe → {cfg.targetUrl}</span>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-grey">
                El rectángulo verde marca dónde queda el iframe del target. El truco del ataque: que el BOTÓN de la acción crítica (borrar cuenta, transferir, aceptar) caiga exactamente bajo el botón del señuelo — el usuario clica su "RECLAMAR PREMIO" y en realidad clica el botón del target.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="card p-5">
              <h3 className="mb-3 font-mono text-sm font-bold text-white">HTML del PoC</h3>
              <CopyBlock text={html} label="poc-clickjacking.html" maxH="max-h-80" />
            </div>
          </Reveal>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="card h-full p-5">
            <h3 className="mb-3 font-mono text-sm font-bold text-white">variantes del ataque</h3>
            <div className="space-y-2">
              {clickjackVariants().map((v) => (
                <div key={v.name} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                  <p className="text-[12.5px] font-bold text-ink">{v.name}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-grey">{v.idea}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <div className="card h-full p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><ShieldCheck size={15} className="text-acento" /> cómo se defiende (y cómo auditarlo)</h3>
            <div className="space-y-2">
              {clickjackDefense().map((d) => (
                <div key={d.check} className="rounded-lg border border-edge bg-black/20 px-3.5 py-2.5">
                  <p className="font-mono text-[12px] font-bold text-ink">{d.check}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ok">✓ {d.ok}</p>
                  <p className="text-[11.5px] leading-relaxed text-bad">✗ {d.fail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-grey">
              Prueba rápida: <code className="text-acento">curl -sI https://target.com/accion-critica | grep -iE 'frame|csp'</code> — si no hay frame-ancestors ni XFO, enmarca la página y monta el PoC.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
