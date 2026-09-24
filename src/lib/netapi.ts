/* APIs públicas de red (todo con CORS abierto, sin backend propio) */

export interface DnsRecord { type: string; value: string; ttl?: number }

const GOOGLE_DNS = 'https://dns.google/resolve'

export async function dnsQuery(domain: string, type: string): Promise<DnsRecord[]> {
  const url = `${GOOGLE_DNS}?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error(`Error HTTP ${res.status} consultando DNS`)
  const data = (await res.json()) as {
    Status: number
    Answer?: { name: string; type: number; TTL: number; data: string }[]
  }
  if (data.Status !== 0 && !data.Answer) throw new Error(`DNS Status=${data.Status} (3 = NXDOMAIN: el dominio no existe)`)
  const typeNames: Record<number, string> = {
    1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR', 15: 'MX', 16: 'TXT', 28: 'AAAA',
    25: 'CAA', 33: 'SRV', 255: 'ANY', 99: 'SPF', 43: 'DS', 48: 'DNSKEY',
  }
  return (data.Answer ?? []).map((a) => ({
    type: typeNames[a.type] ?? String(a.type),
    value: a.data,
    ttl: a.TTL,
  }))
}

export async function resolveDnsSet(domain: string): Promise<DnsRecord[]> {
  const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'CAA']
  const results = await Promise.allSettled(types.map((t) => dnsQuery(domain, t)))
  const out: DnsRecord[] = []
  const security: DnsRecord[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      for (const rec of r.value) {
        const rec2 = rec.type === types[i] ? rec : { ...rec, type: types[i] }
        if (['TXT', 'CAA'].includes(rec2.type)) security.push(rec2)
        else out.push(rec2)
      }
    }
  })
  return [...out, ...security]
}

/* ---------------- IP info (ipapi.co / ipwho.is con CORS) ---------------- */

export interface IpInfo {
  ip: string
  city?: string
  region?: string
  country?: string
  countryCode?: string
  postal?: string
  latitude?: number
  longitude?: number
  timezone?: string
  org?: string
  asn?: string
  isp?: string
  isDatacenter?: boolean
  raw: unknown
}

export async function ipInfo(ip: string): Promise<IpInfo> {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip.trim())}`, { signal: AbortSignal.timeout(12_000) })
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
  const d = (await res.json()) as Record<string, unknown>
  if (d.success === false) throw new Error(String(d.message ?? 'IP inválida o no encontrada'))
  return {
    ip: String(d.ip ?? ip),
    city: d.city as string,
    region: d.region as string,
    country: d.country as string,
    countryCode: d.country_code as string,
    postal: d.postal as string,
    latitude: d.latitude as number,
    longitude: d.longitude as number,
    timezone: (d.timezone as { id?: string })?.id,
    org: d.connection && (d.connection as Record<string, unknown>).org ? String((d.connection as Record<string, unknown>).org) : undefined,
    asn: d.connection && (d.connection as Record<string, unknown>).asn ? `AS${(d.connection as Record<string, unknown>).asn}` : undefined,
    isp: d.connection && (d.connection as Record<string, unknown>).isp ? String((d.connection as Record<string, unknown>).isp) : undefined,
    isDatacenter: d.type === 'business' || d.type === 'hosting',
    raw: d,
  }
}

export async function myIp(): Promise<IpInfo> {
  return ipInfo('')
}

/* ---------------- HTTP inspector (metadatos de cabeceras) ---------------- */

export interface HttpResult {
  status: number
  statusText: string
  ok: boolean
  redirected: boolean
  finalUrl: string
  headers: Record<string, string>
  headerList: { name: string; value: string }[]
  serverTime?: string
  securityHeaders: { name: string; present: boolean; value?: string; good: boolean; why: string }[]
  contentType?: string
  type: string
  bodySize: number
  corsBlocked: boolean
}

const SEC_HEADERS: { name: string; good: (v: string | undefined) => boolean; why: string }[] = [
  { name: 'strict-transport-security', good: (v) => !!v, why: 'Fuerza HTTPS (HSTS)' },
  { name: 'content-security-policy', good: (v) => !!v, why: 'Mitiga XSS y de inyección de contenido' },
  { name: 'x-content-type-options', good: (v) => v === 'nosniff', why: 'Evita MIME-sniffing' },
  { name: 'x-frame-options', good: (v) => !!v, why: 'Mitiga clickjacking' },
  { name: 'referrer-policy', good: (v) => !!v, why: 'Controla fuga de referers' },
  { name: 'permissions-policy', good: (v) => !!v, why: 'Limita APIs del navegador' },
  { name: 'server', good: (v) => !v, why: 'Exponer Server ayuda a fingerprinting' },
  { name: 'x-powered-by', good: (v) => !v, why: 'Exponer tecnología ayuda a fingerprinting' },
]

export async function inspectHttp(rawUrl: string, method: 'GET' | 'HEAD' = 'HEAD'): Promise<HttpResult> {
  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  const started = performance.now()
  let res: Response
  let corsBlocked = false
  try {
    res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(20_000) })
  } catch (e) {
    // intenta con no-cors para distinguir CORS de "no existe"
    try {
      await fetch(url, { method, mode: 'no-cors', signal: AbortSignal.timeout(20_000) })
      corsBlocked = true
      throw new Error('El servidor respondió pero la política CORS oculta las cabeceras al navegador. Usa un backend/proxy o curl para verlas.')
    } catch {
      throw new Error(`No se pudo conectar: ${(e as Error).message}${corsBlocked ? '' : ' (¿DNS/caída/firewall?)'}`)
    }
  }
  const elapsed = performance.now() - started
  const headers: Record<string, string> = {}
  res.headers.forEach((v, k) => (headers[k] = v))
  const headerList = Array.from(res.headers.entries()).map(([name, value]) => ({ name, value }))
  const contentType = res.headers.get('content-type') ?? undefined
  let bodySize = 0
  if (method === 'GET' && res.body) {
    try {
      const buf = await res.clone().arrayBuffer()
      bodySize = buf.byteLength
    } catch { /* ignora */ }
  }
  return {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    redirected: res.redirected,
    finalUrl: res.url,
    headers,
    headerList,
    serverTime: headers['date'],
    securityHeaders: SEC_HEADERS.map((h) => {
      const value = headers[h.name]
      return { name: h.name, present: value !== undefined, value, good: h.good(value), why: h.why }
    }),
    contentType,
    type: contentType?.split(';')[0] ?? 'desconocido',
    bodySize: bodySize || Number(headers['content-length'] ?? 0),
    corsBlocked,
  }
}

/* ---------------- Ping aproximado (timing HTTP) ---------------- */

export interface PingResult {
  samples: number[]
  min: number
  avg: number
  max: number
  lost: number
  sent: number
  finalUrl?: string
}

export async function httpPing(target: string, count = 5): Promise<PingResult> {
  let url = target.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  const samples: number[] = []
  let lost = 0
  let finalUrl: string | undefined
  for (let i = 0; i < count; i++) {
    try {
      const t0 = performance.now()
      const r = await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(10_000) })
      const dt = performance.now() - t0
      if (r.type === 'opaque') {
        samples.push(dt)
      } else {
        samples.push(dt)
      }
      if (r.url) finalUrl = r.url
    } catch {
      lost++
    }
    if (i < count - 1) await new Promise((r) => setTimeout(r, 250))
  }
  const sent = count
  return {
    samples,
    min: samples.length ? Math.min(...samples) : 0,
    avg: samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0,
    max: samples.length ? Math.max(...samples) : 0,
    lost,
    sent,
    finalUrl,
  }
}

/* ---------------- CVE (api cve.org) ---------------- */

export interface CveItem {
  id: string
  published: string
  lastModified: string
  status: string
  descriptions: { lang: string; value: string }[]
  metrics: Record<string, unknown>
  references: { url: string; source?: string; tags?: string[] }[]
  severity?: string
  score?: number
}

export async function lookupCve(cveId: string): Promise<CveItem[]> {
  const id = cveId.trim().toUpperCase()
  if (!/^CVE-\d{4}-\d{4,7}$/.test(id)) throw new Error('Formato esperado: CVE-2024-12345')
  const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Error HTTP ${res.status} (la NVD aplica rate-limit: reintenta en unos segundos)`)
  const data = (await res.json()) as {
    totalResults: number
    vulnerabilities: {
      cve: {
        id: string
        published: string
        lastModified: string
        vulnStatus: string
        descriptions: { lang: string; value: string }[]
        metrics?: Record<string, unknown>
        references?: { url: string; source?: string; tags?: string[] }[]
      }
    }[]
  }
  return data.vulnerabilities.map(({ cve }) => {
    let score: number | undefined
    let severity: string | undefined
    const metrics = cve.metrics ?? {}
    const cvssMetric =
      (metrics['cvssMetricV31'] as { cvssData?: { baseScore?: number; baseSeverity?: string } }[]) ??
      (metrics['cvssMetricV30'] as { cvssData?: { baseScore?: number; baseSeverity?: string } }[]) ??
      (metrics['cvssMetricV2'] as { cvssData?: { baseScore?: number; baseSeverity?: string } }[])
    if (cvssMetric?.[0]?.cvssData) {
      score = cvssMetric[0].cvssData.baseScore
      severity = cvssMetric[0].cvssData.baseSeverity
    }
    return {
      id: cve.id,
      published: cve.published,
      lastModified: cve.lastModified,
      status: cve.vulnStatus,
      descriptions: cve.descriptions,
      metrics,
      references: cve.references ?? [],
      severity,
      score,
    }
  })
}
