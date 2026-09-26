/* Cliente WiGLE (https://api.wigle.net) API v2 — la mayor base de datos
   pública de redes WiFi del mundo (>1.000M de redes observadas por la
   comunidad). Las credenciales (API Name + API Token de wigle.net/account)
   se guardan SOLO en localStorage del navegador y viajan únicamente hacia
   api.wigle.net (que sirve CORS explícito con Authorization). */

export interface WigleCreds {
  apiName: string
  apiToken: string
}

export interface WigleNetwork {
  netid: string // BSSID (MAC)
  ssid: string
  type?: string // 'WPA3', 'WPA2', 'WEP', 'none'...
  authmode?: string
  crypto?: string
  band?: number // 2.4 | 5 | 6 (WiGLE lo devuelve a veces en "band")
  frequency?: number // MHz
  channel?: number
  rcois?: string
  trcois?: string
  qos?: number
  showalt?: number
  lasttime?: string // 'YYYY-MM-DDTHH:mm:ss'
  lastupdt?: string
  lat: number
  lon: number
  comment?: string
  note?: string
  fermata?: number
}

export interface WigleSearchResponse {
  success: boolean
  results: WigleNetwork[]
  resultCount: number
  totalResults?: number
  searchAfter?: number
  notice?: string
  moreResults?: boolean
}

export const WIGLE_LS_KEY = 'hacknexus-wigle-creds-v1'
const WIGLE_BASE = 'https://api.wigle.net'

export const loadWigleCreds = (): WigleCreds | null => {
  try {
    const raw = localStorage.getItem(WIGLE_LS_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as WigleCreds
    return c.apiName && c.apiToken ? c : null
  } catch {
    return null
  }
}

export const saveWigleCreds = (c: WigleCreds | null) => {
  if (c) localStorage.setItem(WIGLE_LS_KEY, JSON.stringify(c))
  else localStorage.removeItem(WIGLE_LS_KEY)
}

/* WiGLE limita: rango máx ~0.35° por eje, 100 resultados por página
   (99 recomendado), 50 queries/hora/día en cuentas registradas. */
export const WIGLE_LIMITS = {
  maxRangeDeg: 0.35,
  maxResults: 100,
  header: 'WIGLE_MAX_AREA_EXCEEDED',
}

export class WigleError extends Error {
  status: number
  constructor(status: number, msg: string) {
    super(msg)
    this.status = status
  }
}

/** GET /api/v2/network/search por caja (latrange/longrange). */
export async function wigleSearch(
  creds: WigleCreds,
  box: { lat1: number; lat2: number; lon1: number; lon2: number },
  opts: { ssid?: string; maxResults?: number; signal?: AbortSignal } = {},
): Promise<WigleSearchResponse> {
  const clampLat = (v: number) => Math.max(-90, Math.min(90, v))
  const clampLon = (v: number) => Math.max(-180, Math.min(180, v))
  const lat1 = clampLat(Math.min(box.lat1, box.lat2))
  const lat2 = clampLat(Math.max(box.lat1, box.lat2))
  const lon1 = clampLon(Math.min(box.lon1, box.lon2))
  const lon2 = clampLon(Math.max(box.lon1, box.lon2))

  const q = new URLSearchParams({
    latrange1: lat1.toFixed(6),
    latrange2: lat2.toFixed(6),
    longrange1: lon1.toFixed(6),
    longrange2: lon2.toFixed(6),
    onlymine: 'false',
  })
  if (opts.ssid?.trim()) q.set('ssid', opts.ssid.trim())
  const n = Math.min(opts.maxResults ?? 100, WIGLE_LIMITS.maxResults)
  q.set('resultsPerPage', String(n))

  const auth = 'Basic ' + btoa(`${creds.apiName}:${creds.apiToken}`)
  const res = await fetch(`${WIGLE_BASE}/api/v2/network/search?${q}`, {
    headers: { Authorization: auth, Accept: 'application/json' },
    signal: opts.signal,
  })
  if (res.status === 401) throw new WigleError(401, 'credenciales WiGLE inválidas o expiradas (API Name + Token de wigle.net/account)')
  if (res.status === 429) throw new WigleError(429, 'rate limit de WiGLE alcanzado: la API gratuita permite ~50 consultas/hora y día. Espera y reintenta.')
  if (res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as { modelState?: string }
    throw new WigleError(400, body.modelState ? `petición rechazada: ${JSON.stringify(body.modelState)}` : 'petición rechazada por WiGLE (¿caja demasiado grande? máx 0.35° por lado)')
  }
  if (!res.ok) throw new WigleError(res.status, `WiGLE respondió HTTP ${res.status}`)

  const data = (await res.json()) as WigleSearchResponse
  if (!data.success) throw new WigleError(500, 'WiGLE devolvió success=false')
  return data
}

/* ── helpers de presentación ─────────────────────────────────────── */

export type AuthKind = 'abierta' | 'WPA2' | 'WPA3' | 'WEP' | 'desconocida'

/** WiGLE usa "type" (y a veces authmode/crypto). Normalizamos a los 5 tonos de la tool. */
export function normalizeAuth(n: WigleNetwork): AuthKind {
  const raw = `${n.type ?? ''} ${n.authmode ?? ''} ${n.crypto ?? ''}`.toUpperCase()
  if (raw.includes('WPA3') || raw.includes('SAE')) return 'WPA3'
  if (raw.includes('WEP')) return 'WEP'
  if (raw.includes('WPA2') || raw.includes('CCMP') || raw.includes('PSK') || raw.includes('WPA')) return 'WPA2'
  if (raw.includes('NONE') || raw.includes('OPEN') || raw === '') return 'abierta'
  return 'desconocida'
}

/** Banda por frecuencia (MHz) o campo band. */
export function bandLabel(n: WigleNetwork): string | undefined {
  const f = n.frequency
  if (f) {
    if (f > 5925) return '6 GHz'
    if (f > 4900) return '5 GHz'
    if (f > 1000) return '2.4 GHz'
    if (f > 800) return 'sub-GHz'
    return `${Math.round(f)} MHz`
  }
  if (n.band === 5) return '5 GHz'
  if (n.band === 6) return '6 GHz'
  if (n.band === 2.4 || n.band === 2) return '2.4 GHz'
  return undefined
}

export function wigleKwargsFromNetwork(n: WigleNetwork): Partial<{
  auth: string
  band: string
  channel: number
  frequency: number
  bssid: string
  vendor: string
  lastSeen: string
  security: string
  encryption: string
}> {
  return {
    auth: normalizeAuth(n),
    band: bandLabel(n),
    channel: n.channel,
    frequency: n.frequency,
    bssid: n.netid?.toUpperCase(),
    lastSeen: n.lasttime,
    security: n.type || undefined,
    encryption: n.crypto || undefined,
  }
}

/** 'YYYY-MM-DDTHH:mm:ss' → 'hace X' */
export function lastSeenAgo(iso?: string): string | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso.includes('T') ? iso + 'Z' : iso)
  if (Number.isNaN(t)) return undefined
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  const units: [number, string][] = [
    [31536000, 'año'],
    [2592000, 'mes'],
    [86400, 'día'],
    [3600, 'h'],
    [60, 'min'],
  ]
  for (const [sec, name] of units) {
    if (s >= sec) {
      const v = Math.floor(s / sec)
      return `hace ${v} ${name}${v !== 1 && name.length > 2 ? 's' : ''}`
    }
  }
  return 'hace instantes'
}

/** Franja temporal de "viveza" de la red para colorear la ficha. */
export function lastSeenTone(iso?: string): 'ok' | 'info' | 'warn' | 'bad' | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso.includes('T') ? iso + 'Z' : iso)
  if (Number.isNaN(t)) return undefined
  const days = (Date.now() - t) / 86400000
  if (days <= 30) return 'ok'
  if (days <= 180) return 'info'
  if (days <= 730) return 'warn'
  return 'bad'
}

export const WIGLE_FAQ = [
  ['¿De dónde salen las redes?', 'De WiGLE.net (Wi-Fi Geographic Location Engine), la base comunitaria con >1.000 millones de redes observadas desde 2001 por wardrivers de todo el mundo.'],
  ['¿Qué credenciales pide?', 'Un API Name + API Token gratuitos que generas en wigle.net/account (registro gratis). Se guardan SOLO en tu navegador y solo hablan con api.wigle.net.'],
  ['¿Qué puedo pedir?', 'La API gratuita permite ~50 consultas/hora y día, cajas de máx 0.35° por lado y ~100 resultados por consulta. Amplía el zoom o filtra por SSID.'],
  ['¿Es legal?', 'Ver redes observadas públicamente: sí (el SSID/BSSID se emite en beacon). USARLAS sin permiso del dueño no: eso es acceso ilícito a sistemas en la mayoría de países.'],
  ['¿Puedo contribuir?', 'Sí: la app WiGLE Wardriving (Android) sube tus observaciones GPS+WiFi y ganas rango. Nunca subas claves de redes que no administres.'],
]
