/* ── Wayback Time Machine · Ronda 18 ──────────────────────────────────────
   OSINT pasivo con la Wayback Machine: el histórico de un dominio revela
   endpoints que ya no existen (y que nadie protege), subdominios olvidados
   (tomover de subdomain takeover), cambios de hosting/IP/neg y la evolución
   tecnológica. Todo vía CDX API (CORS abierto) — solo se consulta la URL
   que el usuario escribe. */

export const WAYBACK_LIMITS: string[] = [
  'La CDX API es un índice: lista snapshots, no permite extraer contenido masivamente (respeta robots y tos de archive.org).',
  'Solo se consulta lo que el usuario escribe: no hay crawling, ni ampliación automática de dominios, ni consultas a terceros.',
  'Los resultados dependen del rastreo de archive.org: un dominio pequeño puede no tener snapshots, y «sin resultados» no significa «sin histórico».',
  'El CDN y los captures dependen del exterior: sin conexión a archive.org, la tool muestra el error y sugiere reintentar.',
]

export const WAYBACK_LESSONS: { title: string; lesson: string }[] = [
  { title: 'Los muertos no parchean', lesson: 'Un endpoint expuesto en 2016 que hoy nadie recuerda sigue existiendo en el servidor: dirb sobre el histórico del target = lista de rutas VULNERABLES que nadie monitoriza.' },
  { title: 'Subdomain takeover', lesson: 'Si un subdominio histórico apuntaba a un bucket/heroku/gh-pages que ya se liberó, el DNS huérfano permite CLONAR el servicio: el índice CDX muestra qué existió y cuándo desapareció.' },
  { title: 'La BIOS del dominio', lesson: 'Los snapshots son una biopsia: qué CMS usaba en 2013, cuándo migró a cloudflare, cuándo registró mail.* y vpn.*: la superficie de ataque completa, ordenada por fecha.' },
  { title: 'Defensa', lesson: 'Busca TU dominio en la CDX: lo que archive.org guardó también lo tiene un atacante. Endpoints de staging/admin en el índice = deuda técnica pública: bórralos con pruning de archive.org o escudo con auth.' },
]

/* ---------- 1. CDX API ---------- */

export interface CdxRecord {
  urlkey: string
  timestamp: string
  original: string
  mimetype: string
  statuscode: string
  digest: string
  length: string
}

export interface CdxQuery {
  url: string
  matchType: 'exact' | 'prefix' | 'host' | 'domain'
  from?: string
  to?: string
  limit?: number
}

const CDX_FIELDS = 'urlkey,timestamp,original,mimetype,statuscode,digest,length'

/** Consulta la CDX API de archive.org (CORS abierto). */
export async function cdxQuery(q: CdxQuery): Promise<CdxRecord[]> {
  const params = new URLSearchParams({
    url: q.url,
    matchType: q.matchType,
    fl: CDX_FIELDS,
    collapse: 'urlkey',
  })
  if (q.from) params.set('from', q.from)
  if (q.to) params.set('to', q.to)
  if (q.limit) params.set('limit', String(q.limit))
  const res = await fetch(`https://web.archive.org/cdx/search/cdx?${params.toString()}`)
  if (res.status === 429) throw new Error('Rate limit de archive.org: espera unos segundos y reintenta')
  if (!res.ok) throw new Error(`CDX API respondió ${res.status}`)
  const text = await res.text()
  if (!text.trim()) return []
  return text
    .trim()
    .split('\n')
    .map((line) => {
      const [urlkey, timestamp, original, mimetype, statuscode, digest, length] = line.split(' ')
      return { urlkey, timestamp, original, mimetype, statuscode, digest, length }
    })
}

/* ---------- 2. Timeline y métricas ---------- */

export function parseTs(ts: string): Date {
  const y = Number(ts.slice(0, 4))
  const mo = Number(ts.slice(4, 6)) - 1
  const d = Number(ts.slice(6, 8))
  const h = Number(ts.slice(8, 10) || '0')
  const mi = Number(ts.slice(10, 12) || '0')
  return new Date(Date.UTC(y, mo, d, h, mi))
}

export interface YearBucket {
  year: number
  snapshots: number
}

export interface TimelineSummary {
  first: CdxRecord | null
  last: CdxRecord | null
  total: number
  uniqueUrls: number
  perYear: YearBucket[]
  statusBreakdown: { code: string; count: number }[]
  mimeBreakdown: { mime: string; count: number }[]
}

export function summarize(records: CdxRecord[]): TimelineSummary {
  const sorted = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const years = new Map<number, number>()
  const status = new Map<string, number>()
  const mime = new Map<string, number>()
  const urls = new Set<string>()
  for (const r of sorted) {
    const y = Number(r.timestamp.slice(0, 4))
    if (y >= 1990 && y <= 2100) years.set(y, (years.get(y) ?? 0) + 1)
    status.set(r.statuscode, (status.get(r.statuscode) ?? 0) + 1)
    const m = r.mimetype === '-' || !r.mimetype ? 'desconocido' : r.mimetype.split(';')[0]!
    mime.set(m, (mime.get(m) ?? 0) + 1)
    urls.add(r.original)
  }
  return {
    first: sorted[0] ?? null,
    last: sorted[sorted.length - 1] ?? null,
    total: sorted.length,
    uniqueUrls: urls.size,
    perYear: [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, snapshots]) => ({ year, snapshots })),
    statusBreakdown: [...status.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count })),
    mimeBreakdown: [...mime.entries()].sort((a, b) => b[1] - a[1]).map(([mime, count]) => ({ mime, count })),
  }
}

/* ---------- 3. Subdominios históricos (matchType=domain) ---------- */

export interface SubdomainInfo {
  subdomain: string
  snapshots: number
  firstY: number
  lastY: number
  lastUrl: string
}

/** Con matchType=domain extrae los subdominios que existieron, cuándo y con qué volumen. */
export function extractSubdomains(records: CdxRecord[], root: string): SubdomainInfo[] {
  const map = new Map<string, { count: number; firstY: number; lastY: number; lastUrl: string }>()
  const rootSuffix = '.' + root
  for (const r of records) {
    const m = /https?:\/\/([^/]+)/i.exec(r.original)
    if (!m) continue
    const host = m[1]!.toLowerCase().replace(/:\d+$/, '')
    if (host !== root && !host.endsWith(rootSuffix)) continue
    const snapY = Number(r.timestamp.slice(0, 4))
    const prev = map.get(host)
    map.set(host, {
      count: (prev?.count ?? 0) + 1,
      firstY: prev ? Math.min(prev.firstY, snapY) : snapY,
      lastY: prev ? Math.max(prev.lastY, snapY) : snapY,
      lastUrl: r.original,
    })
  }
  return [...map.entries()]
    .map(([subdomain, v]) => ({ subdomain, snapshots: v.count, firstY: v.firstY, lastY: v.lastY, lastUrl: v.lastUrl }))
    .sort((a, b) => b.snapshots - a.snapshots)
}

/* ---------- 4. Fuzzing de rutas borradas ---------- */

const INTERESTING = [
  'admin', 'login', 'backup', 'backups', 'db', 'sql', 'config', 'phpinfo', 'phpmyadmin',
  'test', 'dev', 'staging', 'beta', 'old', 'new', 'temp', 'tmp', 'git', 'svn', '.git',
  '.env', '.svn', 'wp-admin', 'wp-login', 'administrator', 'panel', 'cpanel', 'webmail',
  'api', 'api/v1', 'api/v2', 'swagger', 'graphql', 'actuator', 'debug', 'console',
  'server-status', 'server-info', '.DS_Store', 'robots.txt', 'sitemap.xml', 'crossdomain.xml',
]

/** Genera la lista de rutas interesantes para probar contra la CDX (fuzzing pasivo). */
export function fuzzCandidates(base: string): string[] {
  return INTERESTING.map((p) => `${base}/${p}`)
}

/** De los registros, extrae las rutas «interesantes» que EXISTIERON con status OK. */
export function interestingPaths(records: CdxRecord[], root: string): { path: string; status: string; last: string; count: number }[] {
  const map = new Map<string, { status: string; last: string; count: number }>()
  for (const r of records) {
    const m = /https?:\/\/[^/]+(\/[^?]*)/i.exec(r.original)
    const path = m?.[1] ?? '/'
    if (path === '/' || path === '') continue
    const lower = path.toLowerCase()
    const hit = INTERESTING.some((k) => lower.includes(k.toLowerCase()))
    if (!hit) continue
    const prev = map.get(path)
    map.set(path, { status: r.statuscode, last: r.timestamp, count: (prev?.count ?? 0) + 1 })
  }
  return [...map.entries()]
    .map(([path, v]) => ({ path, ...v }))
    .sort((a, b) => b.count - a.count)
}
