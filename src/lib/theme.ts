/* ─── HackNexus Theme Engine ─────────────────────────────────────────────
   Sistema de apariencia en tiempo real: convierte la paleta Tailwind a CSS
   variables y las reescribe en vivo sobre documentElement. Todo con
   persistencia en localStorage y sin tocar el DOM más allá de :root.
   100% client-side: ningún ajuste sale del navegador. */

export interface ThemeConfig {
  /* colores base (hex) */
  bg: string // fondo principal (base)
  panel: string // paneles y tarjetas
  border: string // bordes (edge)
  text: string // texto principal (ink)
  muted: string // texto secundario (grey)
  accent: string // color de acento (acento)
  info: string
  warn: string
  bad: string
  ok: string
  /* diseño */
  radius: number // px de redondeo global
  font: 'inter' | 'mono' | 'system'
  glow: boolean // sombras neón y text-glow
  grid: boolean // rejilla animada de fondo
  scanlines: boolean // banda de escaneo y drift
}

export const DEFAULT_THEME: ThemeConfig = {
  bg: '#0b0f0d',
  panel: '#121714',
  border: '#232b26',
  text: '#d9e2db',
  muted: '#8a948d',
  accent: '#2ee88a',
  info: '#4fb0ff',
  warn: '#ffb454',
  bad: '#ff5c78',
  ok: '#3fb850',
  radius: 12,
  font: 'inter',
  glow: true,
  grid: true,
  scanlines: true,
}

export interface ThemePreset {
  id: string
  name: string
  desc: string
  config: Partial<ThemeConfig>
}

/* Presets: cada uno redefine la paleta completa para que el cambio sea
   dramático y coherente (nada de acentos verdes sobre temas claros). */
export const PRESETS: ThemePreset[] = [
  {
    id: 'terminal',
    name: 'Terminal Verde',
    desc: 'El original: fósforo verde sobre negro profundo',
    config: { ...DEFAULT_THEME },
  },
  {
    id: 'cyberblue',
    name: 'Cyber Blue',
    desc: 'Azul eléctrico estilo SOC nocturno',
    config: { bg: '#090d14', panel: '#0f1520', border: '#1e2a3d', text: '#d6e2f2', muted: '#7c8ba1', accent: '#3da9fc', info: '#7dd3fc', warn: '#ffb454', bad: '#ff5c78', ok: '#3fb850' },
  },
  {
    id: 'bloodmoon',
    name: 'Blood Moon',
    desc: 'Rojo carmesí, modo ofensiva total',
    config: { bg: '#0f0a0b', panel: '#170f11', border: '#331e22', text: '#f2dcdc', muted: '#a18a8a', accent: '#ff4757', info: '#f98080', warn: '#ffb454', bad: '#ff2d3d', ok: '#3fb850' },
  },
  {
    id: 'purpledream',
    name: 'Purple Haze',
    desc: 'Violeta neón para largas noches de CTF',
    config: { bg: '#0d0a14', panel: '#141021', border: '#2a2140', text: '#e6ddf5', muted: '#948aa1', accent: '#b388ff', info: '#82aaff', warn: '#ffcb6b', bad: '#ff5370', ok: '#43d9a3' },
  },
  {
    id: 'ambercrt',
    name: 'Amber CRT',
    desc: 'Monitor de fósforo ámbar de los 80',
    config: { bg: '#100d07', panel: '#181207', border: '#33270f', text: '#f5e6c8', muted: '#a9977a', accent: '#ffb454', info: '#ffd28a', warn: '#ffcf7d', bad: '#ff6b6b', ok: '#b8cc6a' },
  },
  {
    id: 'ice',
    name: 'Glacier Ice',
    desc: 'Cian frío, minimalist glacial',
    config: { bg: '#070d10', panel: '#0c1418', border: '#1b2b31', text: '#d9eef2', muted: '#7a959c', accent: '#2dd4bf', info: '#67e8f9', warn: '#fbbf24', bad: '#fb7185', ok: '#4ade80' },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    desc: 'Rosa y cian sobre asfalto nocturno',
    config: { bg: '#0e0913', panel: '#171022', border: '#302148', text: '#f3e7ff', muted: '#9b8bab', accent: '#f472b6', info: '#22d3ee', warn: '#fbbf24', bad: '#fb4d6d', ok: '#34d399' },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    desc: 'Fósforo puro y contraste máximo',
    config: { bg: '#000000', panel: '#050805', border: '#123318', text: '#c8ffd4', muted: '#5f8f6a', accent: '#00ff41', info: '#54e0ff', warn: '#ffd166', bad: '#ff5964', ok: '#00ff41' },
  },
]

const FONT_STACKS: Record<ThemeConfig['font'], string> = {
  inter: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
}

export const FONT_OPTIONS: { value: ThemeConfig['font']; label: string }[] = [
  { value: 'inter', label: 'Inter (actual)' },
  { value: 'mono', label: 'JetBrains Mono (todo terminal)' },
  { value: 'system', label: 'System UI (nativo)' },
]

const STORAGE_KEY = 'hn-theme-v1'

/* ─── utilidades de color ─────────────────────────────────────────────── */

export function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v.trim())
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0))
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

/** Aclara (dl > 0) u oscurece (dl < 0) un hex en puntos de luminosidad HSL. */
export function shade(hex: string, dl: number, ds = 0): string {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const out = hslToRgb(h, Math.max(0, Math.min(100, s + ds)), Math.max(0, Math.min(100, l + dl)))
  return rgbToHex(out.r, out.g, out.b)
}

/** Contraste percibido (WCAG simplificado) de un hex sobre negro. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/* ─── aplicación en vivo ──────────────────────────────────────────────── */

export function configToCssVars(c: ThemeConfig): Record<string, string> {
  const rgb = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`
  }
  return {
    /* hex: para CSS directo (body, .gradient-text, scrollbars…) */
    '--base': c.bg,
    '--panel': c.panel,
    '--edge': c.border,
    '--ink': c.text,
    '--grey': c.muted,
    '--acento': c.accent,
    '--acento-bright': shade(c.accent, 16, 4),
    '--acento-dark': shade(c.accent, -26, -6),
    '--info': c.info,
    '--warn': c.warn,
    '--bad': c.bad,
    '--ok': c.ok,
    /* tripletas RGB space-separated: Tailwind + modificadores de opacidad */
    '--base-rgb': rgb(c.bg),
    '--panel-rgb': rgb(c.panel),
    '--edge-rgb': rgb(c.border),
    '--ink-rgb': rgb(c.text),
    '--grey-rgb': rgb(c.muted),
    '--acento-rgb': rgb(c.accent),
    '--acento-bright-rgb': rgb(shade(c.accent, 16, 4)),
    '--acento-dark-rgb': rgb(shade(c.accent, -26, -6)),
    '--info-rgb': rgb(c.info),
    '--warn-rgb': rgb(c.warn),
    '--bad-rgb': rgb(c.bad),
    '--ok-rgb': rgb(c.ok),
    '--radius': `${c.radius}px`,
    '--font-sans': FONT_STACKS[c.font],
  }
}

/** Aplica el tema al documento. Se llama en cada cambio: es barato (13 props). */
export function applyTheme(c: ThemeConfig): void {
  const root = document.documentElement
  const vars = configToCssVars(c)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  /* efectos globales vía clase: un solo selector en index.css */
  root.classList.toggle('fx-off-glow', !c.glow)
  root.classList.toggle('fx-off-grid', !c.grid)
  root.classList.toggle('fx-off-scan', !c.scanlines)
  /* notifica a los listener no-React (scrollbars, meta theme-color…) */
  for (const fn of listeners) fn(c)
}

/* ─── store reactivo (sin context provider: funciona a cualquier profundidad) ── */

type Listener = (c: ThemeConfig) => void
const listeners = new Set<Listener>()
let current: ThemeConfig = load()

function sanitize(raw: unknown): ThemeConfig {
  const c = { ...DEFAULT_THEME }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const hexKeys: (keyof ThemeConfig)[] = ['bg', 'panel', 'border', 'text', 'muted', 'accent', 'info', 'warn', 'bad', 'ok']
    for (const k of hexKeys) if (typeof r[k] === 'string' && isHexColor(r[k] as string)) (c as Record<string, unknown>)[k] = r[k]
    if (typeof r.radius === 'number' && r.radius >= 0 && r.radius <= 28) c.radius = r.radius
    if (r.font === 'inter' || r.font === 'mono' || r.font === 'system') c.font = r.font
    for (const k of ['glow', 'grid', 'scanlines'] as const) if (typeof r[k] === 'boolean') c[k] = r[k]
  }
  return c
}

function load(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_THEME }
    return sanitize(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_THEME }
  }
}

function persist(c: ThemeConfig): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch { /* almacenamiento lleno o bloqueado: la sesión sigue viva en memoria */ }
}

export function getTheme(): ThemeConfig {
  return current
}

export function setTheme(patch: Partial<ThemeConfig>): void {
  current = sanitize({ ...current, ...patch })
  persist(current)
  applyTheme(current)
}

export function resetTheme(): void {
  current = { ...DEFAULT_THEME }
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
  applyTheme(current)
}

export function applyPreset(id: string): void {
  const p = PRESETS.find((x) => x.id === id)
  if (!p) return
  const base = { ...DEFAULT_THEME }
  current = sanitize({ ...base, ...p.config, radius: current.radius, font: current.font, glow: current.glow, grid: current.grid, scanlines: current.scanlines })
  persist(current)
  applyTheme(current)
}

export function onThemeChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* hook de React para leer el estado actual (useSyncExternalStore-ready) */
let snapshotVersion = 0
let snapCache: { v: number; c: ThemeConfig } = { v: -1, c: current }

export function getThemeSnapshot(): ThemeConfig {
  if (snapCache.v !== snapshotVersion) snapCache = { v: snapshotVersion, c: { ...current } }
  return snapCache.c
}

const bump = () => { snapshotVersion++ }
onThemeChange(bump)

export function subscribeTheme(fn: () => void): () => void {
  return onThemeChange(fn)
}

/* ─── accesibilidad / análisis del tema ─────────────────────────────── */

export function themeAnalysis(c: ThemeConfig): { ok: boolean; issues: string[] } {
  const issues: string[] = []
  if (luminance(c.text) < 0.28) issues.push('El texto principal es muy oscuro sobre fondo negro: sube su luminosidad')
  if (luminance(c.accent) < 0.2) issues.push('El acento apenas resalta sobre el fondo: acláralo')
  if (luminance(c.bg) > 0.25) issues.push('El fondo es bastante claro: los halos y glows están diseñados para temas oscuros')
  if (c.bg.toLowerCase() === c.panel.toLowerCase()) issues.push('Fondo y panel son idénticos: las tarjetas no se distinguirán')
  if (c.bg.toLowerCase() === c.border.toLowerCase() || c.panel.toLowerCase() === c.border.toLowerCase()) issues.push('El borde se funde con fondo o panel: dale más contraste')
  return { ok: issues.length === 0, issues }
}

/** Genera una paleta aleatoria armónica a partir de un matiz al azar. */
export function randomPalette(): Partial<ThemeConfig> {
  const h = Math.floor(Math.random() * 360)
  const comp = (h + 180 + (Math.random() * 60 - 30)) % 360
  const rgb = (hh: number, s: number, l: number) => { const { r, g, b } = hslToRgb(hh, s, l); return rgbToHex(r, g, b) }
  return {
    bg: rgb(h, 22, 5),
    panel: rgb(h, 20, 8),
    border: rgb(h, 24, 16),
    text: rgb(h, 18, 90),
    muted: rgb(h, 12, 62),
    accent: rgb(h, 82, 58),
    info: rgb(comp, 70, 62),
    warn: rgb((h + 40) % 360, 85, 64),
    bad: rgb((h + 340) % 360, 85, 62),
    ok: rgb((h + 120) % 360, 60, 48),
  }
}
