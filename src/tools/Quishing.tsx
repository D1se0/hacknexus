import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Palette as PaletteIcon, GraduationCap } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Badge, CopyBlock, InfoBanner, Reveal } from '../components/ui'
import { QUISH_TEMPLATES, QUISH_STYLE_PRESETS, PHISHKIT_ETHICS, type QuishStyle } from '../lib/phishkit'

export default function Quishing() {
  const [domain, setDomain] = useState('parking-madrid-team.example')
  const [path, setPath] = useState('/pay')
  const [tplId, setTplId] = useState('parking')
  const [styleId, setStyleId] = useState('brand')
  const [qrData, setQrData] = useState('')
  const tpl = QUISH_TEMPLATES.find((t) => t.id === tplId) ?? QUISH_TEMPLATES[0]
  const preset = QUISH_STYLE_PRESETS.find((s) => s.id === styleId) ?? QUISH_STYLE_PRESETS[0]

  const payload = useMemo(() => tpl.payload({ domain, path, target: 'usuaria@empresa.com' }), [tpl, domain, path])

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(payload, {
      width: preset.style.width,
      margin: preset.style.margin,
      color: { dark: preset.style.dark, light: preset.style.light },
      errorCorrectionLevel: 'M',
    })
      .then((url) => { if (alive) setQrData(url) })
      .catch(() => { if (alive) setQrData('') })
    return () => { alive = false }
  }, [payload, preset])

  const fullHtml = `<!-- Plantilla de campaña de awareness AUTORIZADA -->
<div class="quishing-demo">
  <img src="${qrData}" alt="QR de demostración" width="${preset.style.width}" />
  <p class="note">${tpl.note}</p>
</div>`

  return (
    <div>
      <ToolHeader icon={QrCode} title="Quishing Lab" badge="AWARENESS" desc="Laboratorio de QR phishing: genera QR con estilo legítimo para campañas de concientización autorizadas y aprende por qué engañan." />

      <InfoBanner>
        <b>Uso exclusivo educativo.</b> Los dominios de ejemplo (.example) no existen: sirve para enseñar a tu equipo a desconfiar de QR pegados sobre QR. El 68% de la gente escanea sin mirar — esta tool existe para bajar ese número.
      </InfoBanner>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* controles */}
        <Reveal>
          <div className="card space-y-4 p-5">
            <Field label="Plantilla de escenario">
              <div className="grid gap-1.5">
                {QUISH_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTplId(t.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition-all ${tplId === t.id ? 'border-acento/60 bg-acento/10' : 'border-edge/60 bg-black/20 hover:border-edge'}`}
                  >
                    <span className="mr-2">{t.icon}</span>
                    <span className={`font-mono text-xs font-bold ${tplId === t.id ? 'text-acento' : 'text-ink'}`}>{t.name}</span>
                  </button>
                ))}
              </div>
 </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Dominio del atacante (ficticio)">
                <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} spellCheck={false} />
              </Field>
              <Field label="Ruta">
                <TextInput value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} />
              </Field>
            </div>

            <Field label="Estilo del QR">
              <div className="grid gap-1.5">
                {QUISH_STYLE_PRESETS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    className={`rounded-lg border px-3 py-2 text-left transition-all ${styleId === s.id ? 'border-acento/60 bg-acento/10' : 'border-edge/60 bg-black/20 hover:border-edge'}`}
                  >
                    <span className={`font-mono text-xs font-bold ${styleId === s.id ? 'text-acento' : 'text-ink'}`}>{s.name}</span>
                    <p className="mt-0.5 text-[10px] text-grey">{s.note}</p>
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Reveal>

        {/* preview + lecciones */}
        <div className="space-y-4">
          <Reveal delay={0.05}>
            <div className="card flex flex-col items-center gap-4 p-6">
              {qrData ? (
                <img src={qrData} alt="QR de demostración" className="rounded-lg border border-edge" style={{ width: Math.min(preset.style.width, 260) }} />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-bad/40 text-sm text-bad">error generando QR</div>
              )}
              <div className="flex items-center gap-2">
                <Badge tone="accent">{tpl.name}</Badge>
                <Badge tone="neutral">{preset.name}</Badge>
              </div>
              <p className="max-w-md text-center text-xs leading-relaxed text-grey">{tpl.note}</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <CopyBlock label="payload del QR" text={payload} maxH="max-h-24" />
          </Reveal>

          <Reveal delay={0.15}>
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-grey"><GraduationCap size={14} /> Lecciones para tu equipo</h2>
              <ul className="space-y-2 text-xs leading-relaxed text-grey">
                <li>• <b className="text-ink">Los QR no se pueden leer de vista</b>: por eso engañan. La única verificación es la app del servicio (parking, banco, hotel).</li>
                <li>• <b className="text-ink">Estilo legítimo</b>: blanco plano con margen genera más confianza que un QR sucio. Los atacantes lo saben.</li>
                <li>• <b className="text-ink">El logo encima</b>: pegar un logo encima del QR explota la confianza visual. Mira si hay elementos SOBRE el código.</li>
                <li>• <b className="text-ink">QR en email</b>: cada vez más campañas meten el QR en el email para saltarse los filtros de URL (quishing por correo).</li>
                <li>• <b className="text-ink">Verificación universal</b>: antes de escanear, pregúntate: ¿el QR está en un cartel oficial? ¿está pegado SOBRE otro? ¿la URL tras escanear coincide con la marca?</li>
              </ul>
              <div className="mt-4 space-y-1.5 border-t border-edge/60 pt-4">
                {PHISHKIT_ETHICS.map((e, i) => (
                  <p key={i} className="text-[11px] leading-relaxed text-grey/80">⚖ {e}</p>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-grey/60">
                <PaletteIcon size={12} /> Los estilos están calibrados con los patrones reales de campañas públicas documentadas.
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
