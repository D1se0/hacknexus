import { useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Fish, QrCode, Download, FileDown, MailOpen, TriangleAlert } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, CopyBlock, InfoBanner, Field, TextInput, TextArea, ErrorBox, useToast } from '../components/ui'
import { PHISH_TEMPLATES, buildPhishEmail, buildLandingHtml, type PhishTemplate } from '../lib/phishing'
import { download } from '../lib/util'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const trackId = (): string => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

export default function Phishpage() {
  const [tpl, setTpl] = useState<PhishTemplate>(PHISH_TEMPLATES[1])
  const [domain, setDomain] = useState('phishing-lab.empresa.com')
  const [brand, setBrand] = useState('MiEmpresa')
  const [id] = useState(trackId)
  const [mailQr, setMailQr] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const toast = useToast()

  const email = useMemo(() => buildPhishEmail(tpl, domain, id), [tpl, domain, id])
  const landing = useMemo(() => buildLandingHtml(tpl, brand, id), [tpl, brand, id])

  const genQr = async (text: string, setter: (v: string) => void) => {
    setErr(null)
    try { setter(await QRCode.toDataURL(text, { width: 300, margin: 2, errorCorrectionLevel: 'M' })) }
    catch (e) { setErr((e as Error).message) }
  }

  return (
    <div>
      <ToolHeader icon={Fish} title="Awareness Campaign Builder" desc="Genera plantillas de email y landings de entrenamiento anti-phishing con tracking simulado — solo material formativo, con disclaimers" />

      <InfoBanner>
        <b>Uso exclusivo formativo.</b> Este generador crea material de concienciación para formación de usuarios: las plantillas marcan el simulacro en el asunto del mailto, las landings llevan banner de aviso y el tracking es <b>simulado</b> (no se envía ningún dato). Lanza campañas reales solo con autorización escrita y herramientas corporativas (GoPhish en tu infraestructura).
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-grey">plantilla de ataque simulado</p>
          <div className="flex flex-wrap gap-2">
            {PHISH_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTpl(t)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all ${tpl.id === t.id ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="dominio del simulacro" hint="usa subdominio interno de lab">
              <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} className="font-mono" />
            </Field>
            <Field label="marca / organización">
              <TextInput value={brand} onChange={(e) => setBrand(e.target.value)} className="font-mono" />
            </Field>
          </div>
          <div className="mt-4 rounded-lg border border-edge bg-black/30 p-4 font-mono text-[11px]">
            <p className="text-acento">técnica: {tpl.technique}</p>
            <p className="mt-1 text-ink/85"><span className="text-grey">asunto:</span> {tpl.subject}</p>
            <p className="mt-1 text-ink/85"><span className="text-grey">pretexto:</span> {tpl.pretext}</p>
            <p className="mt-1 text-ink/85"><span className="text-grey">CTA:</span> {tpl.cta}</p>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* email */}
        <Reveal>
          <div className="card flex h-full flex-col p-6">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><MailOpen size={13} /> email de entrenamiento</h3>
            <CopyBlock text={email} label="cuerpo del email (plantilla)" maxH="max-h-80" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" className="gap-2 px-3 py-1.5 text-xs" onClick={() => { download(`phish-email-${tpl.id}.txt`, email, 'text/plain'); toast('email descargado') }}>
                <FileDown size={13} /> .txt
              </Button>
              <Button variant="ghost" className="gap-2 px-3 py-1.5 text-xs" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent('[SIMULACRO] ' + tpl.subject)}&body=${encodeURIComponent(email)}` }}>
                <MailOpen size={13} /> abrir en cliente
              </Button>
            </div>
          </div>
        </Reveal>

        {/* landing */}
        <Reveal delay={0.05}>
          <div className="card flex h-full flex-col p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">landing de entrenamiento (HTML)</h3>
            <CopyBlock text={landing} label="index.html simulado" maxH="max-h-80" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="ghost" className="gap-2 px-3 py-1.5 text-xs" onClick={() => { download('landing-entrenamiento.html', landing, 'text/html'); toast('landing descargada') }}>
                <Download size={13} /> descargar HTML
              </Button>
              <Button variant="ghost" className="gap-2 px-3 py-1.5 text-xs" onClick={() => {
                const w = window.open('', '_blank')
                if (w) { w.document.write(landing); w.document.close() } else toast('permite pop-ups para previsualizar', 'info')
              }}>
                previsualizar
              </Button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* QR (quishing) */}
      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><QrCode size={13} /> quishing — QR para la campaña</h3>
          <p className="mb-4 font-mono text-[11px] text-grey">Los QR "evaden" los filtros de email (el scanner ve una imagen, no una URL). En formación enseña a desconfiar de QR que piden login: la landing lleva banner de entrenamiento.</p>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2" onClick={() => genQr(`https://${domain}/login?sid=${id}`, setMailQr)}>
                generar QR de la landing
              </Button>
              {mailQr && (
                <Button variant="ghost" className="gap-2" onClick={() => { download(`quishing-${id}.png`, dataUrlToBlob(mailQr), 'image/png'); toast('QR descargado') }}>
                  <Download size={14} /> PNG
                </Button>
              )}
            </div>
            <div className="flex items-center justify-center rounded-xl border border-edge bg-black/40 p-4">
              {mailQr ? (
                <img src={mailQr} alt="QR de entrenamiento" className="w-full max-w-[260px]" />
              ) : (
                <p className="font-mono text-xs text-grey">genera el QR…</p>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><TriangleAlert size={13} /> reglas de oro del simulacro</h3>
          <CopyBlock
            label="checklist de campaña ética"
            maxH="max-h-56"
            text={[
              '1. Autorización escrita de dirección/RRHH ANTES de nada (scope, fechas, destinatarios)',
              '2. Marca los emails como simulacro en cabeceras (X-Mailer) y evita datos reales en el pretexto',
              '3. La landing NUNCA almacena credenciales: formulario dummy + banner de aviso',
              '4. Tracking simulado aquí; en campañas reales, GoPhish propio y no herramientas de terceros',
              '5. Debrief inmediato: quién cayó no se castiga, se forma (micro-vídeo + reuse de contraseña)',
              '6. Métricas útiles: tasa de apertura, clic, reporte al botón "Phishing" — la tendencia manda',
            ].join('\n')}
          />
        </div>
      </Reveal>
    </div>
  )
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
