import { useMemo, useState } from 'react'
import { Eye, Ghost, ScanFace, ShieldAlert, Sigma } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  InfoBanner,
  KV,
  Reveal,
  TextArea,
  ToolHeader,
} from '../components/ui'
import {
  HOMOGLYPH_ATTACKS,
  HOMOGLYPH_LIMITS,
  INVISIBLES,
  analyzeHomoglyph,
  generateEvilTwins,
  riskTone,
} from '../lib/homoglyph'
import type { HomoglyphReport } from '../lib/homoglyph'

function ReportCard({ r }: { r: HomoglyphReport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={riskTone(r.risk)}>{r.risk.toUpperCase()}</Badge>
        <span className="text-sm text-white/70">{r.riskReason}</span>
      </div>

      <div className="grid gap-x-6 sm:grid-cols-2">
        <KV k="Confusables" v={String(r.confusables)} />
        <KV k="Invisibles" v={String(r.invisibles)} />
        <KV k="Caracteres bidi" v={String(r.bidiChars)} />
        <KV k="Punycode (xn--)" v={r.hasPunycode ? r.punycodeLabels.join(' · ') : 'no'} />
        <KV k="Guiones mezclados" v={r.mixedScripts ? `sí: ${r.scriptsFound.join(', ')}` : 'no'} />
        <KV k="Longitud analizada" v={`${Array.from(r.original).length} caracteres`} />
      </div>

      {r.punycodeLabels.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Punycode decodificado</p>
          <CopyBlock text={r.punycodeLabels.join('\n')} label="labels" maxH="8rem" />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Forma limpia</p>
          <CopyBlock text={r.cleaned} label="cleaned" maxH="6rem" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Esqueleto (comparador)</p>
          <CopyBlock text={r.skeleton} label="skeleton" maxH="6rem" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">ASCII puro</p>
          <CopyBlock text={r.asciiOnly} label="ascii" maxH="6rem" />
        </div>
      </div>

      {r.findings.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">
            Hallazgos carácter a carácter ({r.findings.length})
          </p>
          <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
            {r.findings.slice(0, 60).map((f, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="w-10 font-mono text-white/40">#{f.index}</span>
                <span className="rounded bg-white/10 px-1.5 font-mono">{f.char === ' ' ? '␣' : f.char}</span>
                <span className="font-mono text-white/50">{f.codePoint}</span>
                {f.category === 'confusable' && (
                  <Badge tone="bad">confusable {f.script} → «{f.mapsTo}»</Badge>
                )}
                {f.category === 'invisible' && <Badge tone="warn">invisible: {f.name}</Badge>}
                {f.category === 'bidi' && <Badge tone="bad">bidi: {f.name}</Badge>}
                {f.category === 'tag' && <Badge tone="bad">TAG Unicode (canal oculto)</Badge>}
                {f.category === 'nonascii-ok' && <Badge tone="info">{f.script}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomoglyphScanner() {
  const [input, setInput] = useState('xn--pple-43d.com')
  const [twinBase, setTwinBase] = useState('paypal.com')
  const report = useMemo(() => (input.trim() ? analyzeHomoglyph(input) : null), [input])
  const twins = useMemo(() => generateEvilTwins(twinBase), [twinBase])

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={ScanFace}
        title="Homoglyph Scanner"
        desc="Detecta dominios y textos que se ven igual pero no lo son: punycode, confusables cirílicos/griegos, invisibles y bidi — con esqueleto comparador y generador de evil twins para testear filtros"
        badge="Ronda 17"
      />

      <InfoBanner>
        <b>аpple.com</b> con «а» cirílica NO es apple.com: es el ataque de phishing IDN más clásico. Pega aquí cualquier
        dominio, email, nombre de usuario o fragmento de texto y verás qué caracteres son impostores, qué hay oculto
        (zero-width, bidi, tags) y cómo queda la forma «limpia». Nada sale de tu navegador.
      </InfoBanner>

      <Reveal>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
            Dominio / texto a analizar
          </label>
          <TextArea value={input} onChange={(e) => setInput(e.target.value)} rows={3} className="font-mono" placeholder="dominio.com, usuario@email, texto con caracteres sospechosos…" />
          {report && <div className="mt-4"><ReportCard r={report} /></div>}
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Ghost size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Generador de evil twins (para testear TUS filtros)</h3>
          </div>
          <p className="mb-3 text-xs text-white/50">
            Genera variantes homoglifo de un dominio legítimo: si tu detector de phishing (o tu CI) no las marca,
            tienes un hueco.
          </p>
          <div className="mb-4 max-w-md">
            <input
              value={twinBase}
              onChange={(e) => setTwinBase(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
              placeholder="dominio-legitimo.com"
            />
          </div>
          <div className="space-y-2">
            {twins.map((t, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="warn">{t.technique}</Badge>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Variante real</p>
                    <p className="break-all font-mono text-sm text-bad">{t.variant}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40">Lo que vería un humano</p>
                    <p className="break-all font-mono text-sm text-white/80">{t.visible}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <CopyBlock text={t.variant} label="copiar variante" maxH="4rem" />
                </div>
              </div>
            ))}
            {twins.length === 0 && <p className="text-xs text-white/50">Introduce un dominio base.</p>}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Los 4 ataques homoglifo que debes conocer</h3>
          </div>
          <div className="space-y-3">
            {HOMOGLYPH_ATTACKS.map((a) => (
              <div key={a.name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="mt-1 text-xs text-white/60"><b>Mecánica:</b> {a.how}</p>
                <p className="mt-1 font-mono text-xs text-warn">{a.example}</p>
                <p className="mt-1 text-xs text-ok"><b>Defensa:</b> {a.defense}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Caracteres invisibles en mi tabla ({INVISIBLES.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-white/40">
                <tr>
                  <th className="py-1 pr-3">Codepoint</th>
                  <th className="py-1 pr-3">Nombre</th>
                  <th className="py-1 pr-3">Tipo</th>
                  <th className="py-1 pr-3">Riesgo</th>
                  <th className="py-1">Uso abusivo típico</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {INVISIBLES.map((inv) => (
                  <tr key={inv.cp.codePointAt(0)} className="border-t border-white/5">
                    <td className="py-1.5 pr-3">U+{inv.cp.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}</td>
                    <td className="py-1.5 pr-3">{inv.name}</td>
                    <td className="py-1.5 pr-3">{inv.kind}</td>
                    <td className="py-1.5 pr-3"><Badge tone={inv.risk === 'high' ? 'bad' : 'warn'}>{inv.risk}</Badge></td>
                    <td className="py-1.5 text-white/60">{inv.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sigma size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Límites honestos</h3>
          </div>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {HOMOGLYPH_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
