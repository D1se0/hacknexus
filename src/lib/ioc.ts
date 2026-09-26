/* Extractor de IOCs (Indicators of Compromise): pega un informe, un log,
   un tweet o un correo y obtén todas las entidades extraíbles con contexto.
   Todo 100% client-side. */

export type IocKind =
  | 'ipv4' | 'ipv6' | 'dominio' | 'url' | 'email' | 'hash-md5' | 'hash-sha1' | 'hash-sha256'
  | 'cve' | 'mitre' | 'btc' | 'xmr' | 'telegram' | 'asn' | 'cidr' | 'mutex' | 'registry' | 'defanged'

export interface IocHit {
  kind: IocKind
  value: string
  context: string // frase en la que aparece
  count: number
}

const IOC_REGEX: { kind: IocKind; re: RegExp; group?: number }[] = [
  { kind: 'url', re: /\b(?:https?:\/\/|hxxps?:\/\/|hxxp|www\.)[^\s"'<>()[\]{}]{6,200}/gi },
  { kind: 'email', re: /\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b/g },
  { kind: 'ipv4', re: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g },
  { kind: 'cidr', re: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\/(?:3[0-2]|[12]?\d)\b/g },
  { kind: 'ipv6', re: /\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g },
  { kind: 'hash-sha256', re: /\b[A-Fa-f0-9]{64}\b/g },
  { kind: 'hash-sha1', re: /\b[A-Fa-f0-9]{40}\b/g },
  { kind: 'hash-md5', re: /\b[A-Fa-f0-9]{32}\b/g },
  { kind: 'cve', re: /\bCVE-\d{4}-\d{4,7}\b/gi },
  { kind: 'mitre', re: /\bT\d{4}(?:\.\d{3})?\b/g },
  { kind: 'btc', re: /\b(?:bc1[a-zA-Z0-9]{20,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g },
  { kind: 'xmr', re: /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/g },
  { kind: 'telegram', re: /\bt\.me\/[A-Za-z0-9_]{4,32}\b/gi },
  { kind: 'registry', re: /\bHKEY_[A-Z_]+(?:\\[^\s"']+)/g },
  { kind: 'mutex', re: /\bGlobal\\[A-Za-z0-9_-]{3,60}\b/g },
  { kind: 'asn', re: /\bAS\d{1,10}\b/g },
]

/** Normaliza defanging (hxxp, [.], {dot}, etc.) para clasificar mejor. */
export function refang(s: string): string {
  return s
    .replace(/\[\.\]|\(\.\)|\{\.\}|\s*\[dot\]\s*/gi, '.')
    .replace(/\[\:\]|\(\:\)/g, ':')
    .replace(/\[@\]|\(\@\)/g, '@')
    .replace(/h(?:xx|tt)p(\[?\.?\]?)/gi, (m) => (m.toLowerCase().startsWith('hxx') ? 'http' : 'http'))
    .replace(/^hxxp/i, 'http')
    .replace(/^hxxps/i, 'https')
}

/** Extrae todos los IOCs de un texto con su contexto. */
export function extractIocs(text: string): IocHit[] {
  const out: IocHit[] = []
  const lines = text.split(/\r?\n/)

  for (const { kind, re } of IOC_REGEX) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const raw = m[0]
      // contexto: la línea completa (o hasta 120 chars alrededor)
      const upto = m.index
      const lineStart = text.lastIndexOf('\n', upto) + 1
      const lineEnd = text.indexOf('\n', upto)
      const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
      const context = line.length > 160 ? line.slice(0, 160) + '…' : line

      out.push({
        kind,
        value: kind === 'url' || kind === 'email' ? refang(raw) : raw,
        context,
        count: 1,
      })
      if (m.index === re.lastIndex) re.lastIndex++ // safety para zero-length
    }
  }
  void lines

  // fusionar duplicados por kind+value
  const dedup = new Map<string, IocHit>()
  for (const h of out) {
    const k = `${h.kind}:${h.value}`
    const prev = dedup.get(k)
    if (prev) prev.count++
    else dedup.set(k, h)
  }
  return [...dedup.values()].sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind))
}

/** Falsos positivos típico que conviene excluir con un clic. */
const FP_PATTERNS = [
  /^(0{1,3}\.){3}0$/, // 0.0.0.0
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/, // privadas
  /^(255\.|224\.)/, // multicast/broadcast
  /^example\.|\.example$/, // RFC
  /\.(png|jpg|gif|css|js|woff2?)$/i, // assets estáticos
  /^CVE-\d{4}-0{4,}/, // CVE con ceros imposibles
]

export function looksLikeFalsePositive(h: IocHit): boolean {
  return FP_PATTERNS.some((re) => re.test(h.value))
}

/** Enlaces de análisis por tipo de IOC. */
export function iocLinks(h: IocHit): { label: string; url: string }[] {
  const v = encodeURIComponent(h.value)
  switch (h.kind) {
    case 'ipv4':
    case 'cidr':
      return [
        { label: 'AbuseIPDB', url: `https://www.abuseipdb.com/check/${v}` },
        { label: 'Shodan', url: `https://www.shodan.io/host/${v}` },
        { label: 'VirusTotal', url: `https://www.virustotal.com/gui/ip-address/${v}` },
        { label: 'GreyNoise', url: `https://viz.greynoise.io/ip/${v}` },
      ]
    case 'dominio':
      return [
        { label: 'VirusTotal', url: `https://www.virustotal.com/gui/domain/${v}` },
        { label: 'crt.sh', url: `https://crt.sh/?q=${v}` },
        { label: 'urlscan', url: `https://urlscan.io/domain/${v}` },
      ]
    case 'url':
      return [
        { label: 'urlscan', url: `https://urlscan.io/api/v1/search/?q=page.url%3A%22${v}%22` },
        { label: 'VirusTotal', url: `https://www.virustotal.com/gui/search/${v}` },
        { label: 'Any.Run', url: `https://app.any.run/tasks/?q=${v}` },
      ]
    case 'hash-md5':
    case 'hash-sha1':
    case 'hash-sha256':
      return [
        { label: 'VirusTotal', url: `https://www.virustotal.com/gui/file/${v}` },
        { label: 'Hybrid Analysis', url: `https://www.hybrid-analysis.com/search?query=${v}` },
        { label: 'MalwareBazaar', url: `https://bazaar.abuse.ch/browse.php?search=sha256:${v}` },
      ]
    case 'cve':
      return [
        { label: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${h.value}` },
        { label: 'MITRE CVE', url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${v}` },
        { label: 'EPSS', url: `https://api.first.org/data/v1/epss?cve=${v}` },
      ]
    case 'mitre':
      return [{ label: 'ATT&CK', url: `https://attack.mitre.org/techniques/${h.value.replace('.', '/')}/` }]
    case 'btc':
      return [{ label: 'Blockchain.com', url: `https://www.blockchain.com/explorer/addresses/btc/${v}` }]
    case 'xmr':
      return [{ label: 'ExploreMonero', url: `https://exploREMonero.com/search/${v}` }]
    case 'email':
      return [{ label: 'HaveIBeenPwned', url: `https://haveibeenpwned.com/account/${v}` }]
    case 'telegram':
      return [{ label: 'TGStat', url: `https://tgstat.com/${h.value.replace('https://t.me/', '')}` }]
    case 'asn':
      return [{ label: 'bgp.he.net', url: `https://bgp.he.net/${h.value}` }]
    default:
      return []
  }
}

/** Resumen ejecutivo para pegar en un informe. */
export function iocSummary(hits: IocHit[]): string {
  const by = new Map<IocKind, number>()
  for (const h of hits) by.set(h.kind, (by.get(h.kind) ?? 0) + h.count)
  const parts = [...by.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`)
  return `${hits.length} IOCs únicos (${parts.join(', ') || 'ninguno'})`
}

export const IOC_STIX_TEMPLATE = (hits: IocHit[], name: string): string =>
  JSON.stringify(
    {
      type: 'bundle',
      id: `bundle--${crypto.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000'}`,
      objects: hits.map((h) => ({
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${crypto.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000'}`,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        name: `${h.kind}: ${h.value}`,
        pattern: `[${h.kind === 'ipv4' ? 'ipv4-addr:value' : h.kind.startsWith('hash') ? 'file:hashes."SHA-256"' : h.kind === 'dominio' || h.kind === 'url' ? 'url:value' : 'x-custom:value'} = '${h.value}']`,
        pattern_type: 'stix',
        valid_from: new Date().toISOString(),
        labels: [h.kind],
        description: h.context,
      })),
    },
    null,
    2,
  )
