import { useMemo, useState, useSyncExternalStore } from 'react'
import { Palette, Shuffle, RotateCcw, Check, Wand2, Type, Sparkles, SlidersHorizontal } from 'lucide-react'
import { ToolHeader, Field, TextInput, TextArea, Select, Button, Badge, Toggle, CopyBlock, InfoBanner, Reveal, useToast } from '../components/ui'
import {
  PRESETS, DEFAULT_THEME, FONT_OPTIONS, getThemeSnapshot, subscribeTheme, setTheme,
  resetTheme, applyPreset, randomPalette, themeAnalysis, isHexColor,
  type ThemeConfig,
} from '../lib/theme'
import { cn } from '../lib/util'

/* Suscripción simple al store del tema (fuera de React vive en theme.ts). */
function useTheme(): ThemeConfig {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot)
}

const COLOR_FIELDS: { key: keyof ThemeConfig; label: string; hint: string }[] = [
  { key: 'bg', label: 'Fondo', hint: 'color base de toda la página' },
  { key: 'panel', label: 'Paneles', hint: 'tarjetas y cajas' },
  { key: 'border', label: 'Bordes', hint: 'líneas y marcos (edge)' },
  { key: 'text', label: 'Texto', hint: 'texto principal (ink)' },
  { key: 'muted', label: 'Texto secundario', hint: 'descripciones y labels (grey)' },
  { key: 'accent', label: 'Acento', hint: 'botones, enlaces y brillo global' },
  { key: 'info', label: 'Info', hint: 'avisos informativos' },
  { key: 'warn', label: 'Warn', hint: 'avisos y amonestaciones' },
  { key: 'bad', label: 'Peligro', hint: 'errores y crítico' },
  { key: 'ok', label: 'OK', hint: 'éxito y estado vivo' },
]

const RADIUS_OPTIONS = [
  { value: '0', label: '0 — recto (brutal)' },
  { value: '4', label: '4 — casi recto' },
  { value: '8', label: '8 — suave' },
  { value: '12', label: '12 — actual por defecto' },
  { value: '18', label: '18 — redondeado' },
  { value: '26', label: '26 — muy redondeado' },
]

function ColorRow({ c, k, label, hint }: { c: ThemeConfig; k: keyof ThemeConfig; label: string; hint: string }) {
  const value = c[k] as string
  const valid = isHexColor(value)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-edge/70 bg-black/20 px-3 py-2">
      <label
        className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-edge"
        style={{ backgroundColor: valid ? value : '#333' }}
        title="Abrir selector de color"
      >
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => setTheme({ [k]: e.target.value })}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] uppercase tracking-wider text-grey">{label}</div>
        <div className="truncate text-[10px] text-grey/50">{hint}</div>
      </div>
      <input
        value={value}
        onChange={(e) => setTheme({ [k]: e.target.value })}
        spellCheck={false}
        className={cn(
          'w-24 shrink-0 rounded-md border bg-black/40 px-2 py-1 text-center font-mono text-xs',
          valid ? 'border-edge text-ink focus:border-acento/60' : 'border-bad/60 text-bad',
        )}
      />
    </div>
  )
}

export default function ThemeEditor() {
  const theme = useTheme()
  const toast = useToast()
  const [importText, setImportText] = useState('')

  const analysis = useMemo(() => themeAnalysis(theme), [theme])
  const presetId = useMemo(() => {
    for (const p of PRESETS) {
      const keys = Object.keys(p.config) as (keyof ThemeConfig)[]
      if (keys.every((k) => (p.config[k] as string) === (theme[k] as string))) return p.id
    }
    return null
  }, [theme])

  const doImport = () => {
    try {
      const raw = JSON.parse(importText)
      const candidate: Partial<ThemeConfig> = {}
      for (const f of COLOR_FIELDS) if (isHexColor(raw[f.key])) (candidate as Record<string, string>)[f.key] = raw[f.key]
      if (typeof raw.radius === 'number' && raw.radius >= 0 && raw.radius <= 28) candidate.radius = raw.radius
      if (typeof raw.glow === 'boolean') candidate.glow = raw.glow
      if (typeof raw.grid === 'boolean') candidate.grid = raw.grid
      if (typeof raw.scanlines === 'boolean') candidate.scanlines = raw.scanlines
      if (raw.font === 'inter' || raw.font === 'mono' || raw.font === 'system') candidate.font = raw.font
      if (Object.keys(candidate).length === 0) throw new Error('no hay ajustes válidos')
      setTheme(candidate)
      toast('Tema importado y aplicado', 'ok')
      setImportText('')
    } catch {
      toast('JSON no válido: revisa el formato', 'error')
    }
  }

  return (
    <div>
      <ToolHeader icon={Palette} title="Personalización" badge="EN VIVO" desc="Cambia colores, tipografía y diseño de toda la aplicación en tiempo real. Todo se guarda solo en tu navegador y aplica al instante — sin recargas." />
      <InfoBanner>
        <b>Todo queda en tu equipo:</b> la configuración se guarda en <code className="font-mono">localStorage</code> y los colores se aplican con CSS variables al instante. Ninguna preferencia sale del navegador. <code className="font-mono">Alt/Option + T</code> abre esta página desde cualquier sitio.
      </InfoBanner>

      {/* ── presets ── */}
      <Reveal>
        <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-acento"><Sparkles size={14} /> Temas predefinidos</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {PRESETS.map((p) => {
            const active = presetId === p.id
            return (
              <button
                key={p.id}
                onClick={() => { applyPreset(p.id); toast(`Tema aplicado: ${p.name}`) }}
                className={cn(
                  'card card-hover group p-3 text-left',
                  active ? 'border-acento/70 shadow-glow' : '',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[p.config.bg ?? '#000', p.config.panel ?? '#111', p.config.accent ?? '#2ee88a'].map((col, i) => (
                      <span key={i} className="h-5 w-5 rounded-md border border-black/40" style={{ backgroundColor: col }} />
                    ))}
                  </div>
                  {active && <Check size={14} className="text-acento" />}
                </div>
                <div className="mt-2.5 truncate font-mono text-xs font-bold text-ink group-hover:text-acento">{p.name}</div>
                <div className="truncate text-[10px] text-grey">{p.desc}</div>
              </button>
            )
          })}
        </div>
      </Reveal>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ── colores ── */}
        <Reveal delay={0.05}>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-acento"><SlidersHorizontal size={14} /> Colores</h2>
          <div className="card space-y-2 p-4">
            {COLOR_FIELDS.map((f) => (
              <ColorRow key={f.key} c={theme} k={f.key} label={f.label} hint={f.hint} />
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="ghost" className="text-xs" onClick={() => { setTheme(randomPalette()); toast('Paleta aleatoria generada', 'info') }}>
                <Shuffle size={13} /> Paleta aleatoria
              </Button>
              <Button variant="ghost" className="text-xs" onClick={() => { resetTheme(); toast('Tema restaurado a los valores por defecto') }}>
                <RotateCcw size={13} /> Restaurar todo
              </Button>
            </div>
            {!analysis.ok && (
              <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-[11px] text-warn">
                {analysis.issues.map((iss, i) => <div key={i}>⚠ {iss}</div>)}
              </div>
            )}
          </div>
        </Reveal>

        {/* ── diseño ── */}
        <Reveal delay={0.1}>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-acento"><Wand2 size={14} /> Diseño y efectos</h2>
          <div className="card space-y-5 p-4">
            <Field label="Redondeo global" hint="esquinas de tarjetas, botones y cajas">
              <Select
                options={RADIUS_OPTIONS}
                value={String(theme.radius)}
                onChange={(e) => setTheme({ radius: Number(e.target.value) })}
              />
            </Field>
            <Field label="Tipografía de la interfaz">
              <Select
                options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
                value={theme.font}
                onChange={(e) => setTheme({ font: e.target.value as ThemeConfig['font'] })}
              />
            </Field>
            <div className="space-y-3 border-t border-edge/60 pt-4">
              <Toggle checked={theme.glow} onChange={(v) => setTheme({ glow: v })} label="Resplandores neón (glow y halos)" />
              <Toggle checked={theme.grid} onChange={(v) => setTheme({ grid: v })} label="Rejilla animada de fondo" />
              <Toggle checked={theme.scanlines} onChange={(v) => setTheme({ scanlines: v })} label="Banda de escaneo" />
            </div>
            <div className="rounded-lg border border-edge/70 bg-black/30 p-3 text-[11px] leading-relaxed text-grey">
              <b className="text-ink">Ejemplo en vivo:</b> la pantalla entera ya usa tu selección. <span className="text-acento">Este texto usa el acento</span>, <span className="text-warn">este avisa</span> y <span className="text-bad">este alarma</span>. <code className="rounded bg-black/50 px-1">--radius</code> controla esta caja.
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── import/export ── */}
      <Reveal delay={0.15}>
        <h2 className="mb-3 mt-8 flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-acento"><Type size={14} /> Copia y comparte tu tema</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-grey">Exporta tu configuración como JSON para respaldarla o compartirla:</p>
            <CopyBlock text={JSON.stringify(theme, null, 2)} label="tema actual (json)" maxH="max-h-56" />
          </div>
          <div>
            <p className="mb-2 text-xs text-grey">Pega aquí un tema exportado y púlsalo para aplicarlo:</p>
            <TextArea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"bg":"#0b0f0d","accent":"#2ee88a",...}' className="min-h-36" />
            <div className="mt-3 flex gap-2">
              <Button onClick={doImport} disabled={!importText.trim()}>Importar y aplicar</Button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── créditos ── */}
      <Reveal delay={0.2}>
        <div className="mt-8 flex items-center justify-between rounded-xl border border-edge/60 bg-black/30 px-4 py-3 font-mono text-[11px] text-grey">
          <span>Valor por defecto del acento: <span className="text-ink">{DEFAULT_THEME.accent}</span> · los presets solo cambian colores, no tu diseño</span>
          <Badge tone="accent">100% local</Badge>
        </div>
      </Reveal>
    </div>
  )
}
