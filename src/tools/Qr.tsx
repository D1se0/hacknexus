import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download, FileImage, RefreshCw } from 'lucide-react'
import { ToolHeader, Field, TextArea, TextInput, Button, Badge, Reveal, CopyBtn, ErrorBox, useToast } from '../components/ui'

type Mode = 'texto' | 'url' | 'wifi' | 'vcard' | 'email' | 'sms' | 'tel' | 'geo'

const MODES: Mode[] = ['texto', 'url', 'wifi', 'vcard', 'email', 'sms', 'tel', 'geo']

/* ---------- helpers de payload ---------- */

const escapeWifi = (s: string): string => s.replace(/([\\;,"':])/g, '\\$1')

function buildPayload(mode: Mode, f: Record<string, string>): string {
  switch (mode) {
    case 'url':
      return f.url || 'https://'
    case 'wifi':
      return `WIFI:T:${f.auth || 'WPA'};S:${escapeWifi(f.ssid || '')};${f.auth !== 'nopass' ? `P:${escapeWifi(f.password || '')};` : ''}${f.hidden === 'si' ? 'H:true;' : ''};`
    case 'vcard':
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${f.apellidos || ''};${f.nombre || ''};;;`,
        `FN:${f.nombre || ''} ${f.apellidos || ''}`.trim(),
        f.org ? `ORG:${f.org}` : '',
        f.cargo ? `TITLE:${f.cargo}` : '',
        f.tel ? `TEL;TYPE=CELL:${f.tel}` : '',
        f.email ? `EMAIL:${f.email}` : '',
        f.web ? `URL:${f.web}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n')
    case 'email':
      return `mailto:${f.to || ''}${f.subject || f.body ? `?subject=${encodeURIComponent(f.subject || '')}&body=${encodeURIComponent(f.body || '')}` : ''}`
    case 'sms':
      return `SMSTO:${f.to || ''}:${f.body || ''}`
    case 'tel':
      return `tel:${f.to || ''}`
    case 'geo':
      return `geo:${f.lat || '0'},${f.lon || '0'}`
    default:
      return f.texto || ''
  }
}

const FIELDS: Record<Mode, { key: string; label: string; hint?: string; area?: boolean }[]> = {
  texto: [{ key: 'texto', label: 'contenido', area: true, hint: 'cualquier texto' }],
  url: [{ key: 'url', label: 'URL', hint: 'https://…' }],
  wifi: [
    { key: 'ssid', label: 'SSID (nombre de red)' },
    { key: 'password', label: 'contraseña', hint: 'vacía si auth=nopass' },
  ],
  vcard: [
    { key: 'nombre', label: 'nombre' },
    { key: 'apellidos', label: 'apellidos' },
    { key: 'org', label: 'organización' },
    { key: 'cargo', label: 'cargo' },
    { key: 'tel', label: 'teléfono' },
    { key: 'email', label: 'email' },
    { key: 'web', label: 'web' },
  ],
  email: [
    { key: 'to', label: 'para' },
    { key: 'subject', label: 'asunto' },
    { key: 'body', label: 'cuerpo', area: true },
  ],
  sms: [
    { key: 'to', label: 'número' },
    { key: 'body', label: 'mensaje', area: true },
  ],
  tel: [{ key: 'to', label: 'número' }],
  geo: [
    { key: 'lat', label: 'latitud', hint: '40.4168' },
    { key: 'lon', label: 'longitud', hint: '-3.7038' },
  ],
}

const HIDDEN_PLACEHOLDER: Record<string, string> = {
  ssid: 'MiRed', password: 'Passw0rd!', url: 'https://github.com/D1se0', texto: 'HackNexus — hacking ético client-side',
  nombre: 'D1se0', apellidos: '', org: 'HackNexus', cargo: 'Pentester', tel: '+34600000000', email: 'd1se0@ejemplo.com', web: 'https://d1se0.github.io',
  to: 'destino@ejemplo.com', subject: 'Hola', body: 'Mensaje de prueba', lat: '40.4168', lon: '-3.7038',
}

export default function Qr() {
  const [mode, setMode] = useState<Mode>('texto')
  const [fields, setFields] = useState<Record<string, string>>({ texto: 'HackNexus — hacking ético client-side' })
  const [ec, setEc] = useState('M')
  const [dark, setDark] = useState('#0b0f0d')
  const [light, setLight] = useState('#2ee88a')
  const [width, setWidth] = useState(320)
  const [margin, setMargin] = useState(2)
  const [dataUrl, setDataUrl] = useState('')
  const [svgOut, setSvgOut] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const toast = useToast()

  const payload = buildPayload(mode, fields)

  const render = useCallback(async () => {
    if (!payload.trim()) {
      setDataUrl('')
      setSvgOut('')
      return
    }
    try {
      const opts = { errorCorrectionLevel: ec as 'L' | 'M' | 'Q' | 'H', margin, width, color: { dark, light } }
      const [url, svg] = await Promise.all([
        QRCode.toDataURL(payload, opts),
        QRCode.toString(payload, { ...opts, type: 'svg' }),
      ])
      setDataUrl(url)
      setSvgOut(svg)
      setErr(null)
    } catch (e) {
      setErr((e as Error).message)
      setDataUrl('')
      setSvgOut('')
    }
  }, [payload, ec, dark, light, width, margin])

  useEffect(() => {
    const t = setTimeout(render, 180) // debounce
    return () => clearTimeout(t)
  }, [render])

  const set = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }))

  const download = (kind: 'png' | 'svg') => {
    if (kind === 'png' && dataUrl) {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `qr-${mode}.png`
      a.click()
    }
    if (kind === 'svg' && svgOut) {
      const blob = new Blob([svgOut], { type: 'image/svg+xml' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `qr-${mode}.svg`
      a.click()
      URL.revokeObjectURL(a.href)
    }
    toast(`QR ${kind.toUpperCase()} descargado`)
  }

  const activeFields = FIELDS[mode]

  return (
    <div className="min-w-0">
      <ToolHeader icon={QrCode} title="QR Generator" desc="Códigos QR con presets WiFi, vCard, email, SMS, teléfono y geo — genera la imagen en local y descarga PNG/SVG" />

      <Reveal>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setFields({}) }}
              className={`rounded-lg border px-4 py-2 font-mono text-xs transition-all ${
                mode === m ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ─── formulario ─── */}
        <Reveal>
          <div className="card min-w-0 p-6">
            {activeFields.map((f) => (
              <div key={f.key} className="mb-4">
                <Field label={f.label} hint={f.hint}>
                  {f.area ? (
                    <TextArea value={fields[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={HIDDEN_PLACEHOLDER[f.key] ?? ''} spellCheck={false} />
                  ) : (
                    <TextInput
                      value={fields[f.key] ?? ''}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={HIDDEN_PLACEHOLDER[f.key] ?? ''}
                      type={f.key === 'password' ? 'text' : 'text'}
                    />
                  )}
                </Field>
              </div>
            ))}

            {mode === 'wifi' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="autenticación">
                  <select
                    value={fields.auth ?? 'WPA'}
                    onChange={(e) => set('auth', e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60"
                  >
                    {['WPA', 'WEP', 'nopass'].map((o) => <option key={o} value={o} className="bg-panel">{o}</option>)}
                  </select>
                </Field>
                <Field label="red oculta">
                  <select
                    value={fields.hidden ?? 'no'}
                    onChange={(e) => set('hidden', e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60"
                  >
                    {['no', 'si'].map((o) => <option key={o} value={o} className="bg-panel">{o}</option>)}
                  </select>
                </Field>
              </div>
            )}

            <div className="mt-2 rounded-lg border border-edge bg-black/30 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-grey">payload generado</span>
                <CopyBtn text={payload} label="copiar" className="border-0 bg-transparent px-1" />
              </div>
              <code className="block max-h-32 min-w-0 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-info">{payload || '—'}</code>
            </div>

            {mode === 'wifi' && (
              <p className="mt-3 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 font-mono text-[11px] text-warn/90">
                ⚠ El QR de WiFi contiene la contraseña en claro: cualquiera que lo escanee se conecta (y puede recuperar la PSK con un lector). Úsalo para invitados.
              </p>
            )}
          </div>
        </Reveal>

        {/* ─── preview + ajustes ─── */}
        <Reveal delay={0.08}>
          <div className="card min-w-0 p-6">
            <div className="mx-auto flex w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border border-edge bg-black/40 p-4">
              {dataUrl ? (
                <img src={dataUrl} alt="QR generado" className="h-auto w-full" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 font-mono text-xs text-grey">
                  <QrCode size={36} className="opacity-40" />
                  escribe contenido…
                </div>
              )}
            </div>

            {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
            {!err && dataUrl && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Badge tone="ok">nivel {ec}</Badge>
                <Badge tone="neutral">{width}px</Badge>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <Field label="corrección de error" hint="H = más robusto">
                <div className="flex gap-1.5">
                  {['L', 'M', 'Q', 'H'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setEc(l)}
                      className={`flex-1 rounded-lg border py-2 font-mono text-xs transition-all ${ec === l ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="color oscuro">
                  <div className="flex items-center gap-2">
                    <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-edge bg-black/40" />
                    <span className="font-mono text-[11px] text-grey">{dark}</span>
                  </div>
                </Field>
                <Field label="color claro">
                  <div className="flex items-center gap-2">
                    <input type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-edge bg-black/40" />
                    <span className="font-mono text-[11px] text-grey">{light}</span>
                  </div>
                </Field>
              </div>
              <Field label={`tamaño: ${width}px`}>
                <input type="range" min={128} max={1024} step={32} value={width} onChange={(e) => setWidth(parseInt(e.target.value))} className="w-full accent-[#2ee88a]" />
              </Field>
              <Field label={`margen: ${margin} módulos`}>
                <input type="range" min={0} max={8} value={margin} onChange={(e) => setMargin(parseInt(e.target.value))} className="w-full accent-[#2ee88a]" />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => download('png')} disabled={!dataUrl}><Download size={14} /> PNG</Button>
              <Button variant="ghost" onClick={() => download('svg')} disabled={!svgOut}><FileImage size={14} /> SVG</Button>
              <Button variant="ghost" onClick={() => { setDark('#0b0f0d'); setLight('#2ee88a'); setEc('M'); setWidth(320); setMargin(2) }}>
                <RefreshCw size={14} /> reset estilo
              </Button>
            </div>

            <p className="mt-4 font-mono text-[10px] leading-relaxed text-grey/70">
              💡 Los datos se mantienen solo en esta pestaña (estado temporal del navegador): al cerrar o recargar, nada persiste.
              Nivel H aguanta logos encima (~30% de daño), L es el más compacto.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
