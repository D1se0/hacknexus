/* ─── Email OSINT: huella de una dirección de correo ────────────────────
   Todo pasivo y 100% client-side. Tres fuentes CON CORS verificado:
   1) Gravatar: avatar (HEAD) + perfil público (JSON) → registro + identidad.
   2) XposedOrNot: si el email aparece en filtraciones conocidas.
   3) GitHub commit search: si firmó commits públicos con ese email.
   Más: análisis de proveedor/descartables, dorks y verificación manual. */

/* ═════════════════════ hashing ═════════════════════ */

/** MD5 puro en TS (para Gravatar): implementación local, sin dependencias. */
export function md5(str: string): string {
  const rl = (n: number, c: number) => (n << c) | (n >>> (32 - c))
  const add = (a: number, b: number) => (((a >> 16) + (b >> 16) + (((a & 0xffff) + (b & 0xffff)) >> 16)) << 16) | (((a & 0xffff) + (b & 0xffff)) & 0xffff)
  const cmn = (q: number, a: number, b: number, x: number, s: number, t: number) => add(rl(add(add(a, q), add(x, t)), s), b)
  const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & c) | (~b & d), a, b, x, s, t)
  const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & d) | (c & ~d), a, b, x, s, t)
  const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(b ^ c ^ d, a, b, x, s, t)
  const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(c ^ (b | ~d), a, b, x, s, t)

  const utf8 = unescape(encodeURIComponent(str))
  const n = utf8.length
  const words: number[] = []
  for (let i = 0; i < n; i++) words[i >> 2] = (words[i >> 2] || 0) | (utf8.charCodeAt(i) << ((i % 4) * 8))
  words[n >> 2] = (words[n >> 2] || 0) | (0x80 << ((n % 4) * 8))
  const len = (((n + 8) >> 6) + 1) * 16
  for (let i = 0; i < len; i++) words[i] = words[i] || 0
  words[len - 2] = n * 8

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
  for (let i = 0; i < len; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d]
    a = ff(a, b, c, d, words[i], 7, -680876936); d = ff(d, a, b, c, words[i + 1], 12, -389564586); c = ff(c, d, a, b, words[i + 2], 17, 606105819); b = ff(b, c, d, a, words[i + 3], 22, -1044525330)
    a = ff(a, b, c, d, words[i + 4], 7, -176418897); d = ff(d, a, b, c, words[i + 5], 12, 1200080426); c = ff(c, d, a, b, words[i + 6], 17, -1473231341); b = ff(b, c, d, a, words[i + 7], 22, -45705983)
    a = ff(a, b, c, d, words[i + 8], 7, 1770035416); d = ff(d, a, b, c, words[i + 9], 12, -1958414417); c = ff(c, d, a, b, words[i + 10], 17, -42063); b = ff(b, c, d, a, words[i + 11], 22, -1990404162)
    a = ff(a, b, c, d, words[i + 12], 7, 1804603682); d = ff(d, a, b, c, words[i + 13], 12, -40341101); c = ff(c, d, a, b, words[i + 14], 17, -1502002290); b = ff(b, c, d, a, words[i + 15], 22, 1236535329)
    a = gg(a, b, c, d, words[i + 1], 5, -165796510); d = gg(d, a, b, c, words[i + 6], 9, -1069501632); c = gg(c, d, a, b, words[i + 11], 14, 643717713); b = gg(b, c, d, a, words[i], 20, -373897302)
    a = gg(a, b, c, d, words[i + 5], 5, -701558691); d = gg(d, a, b, c, words[i + 10], 9, 38016083); c = gg(c, d, a, b, words[i + 15], 14, -660478335); b = gg(b, c, d, a, words[i + 4], 20, -405537848)
    a = gg(a, b, c, d, words[i + 9], 5, 568446438); d = gg(d, a, b, c, words[i + 14], 9, -1019803690); c = gg(c, d, a, b, words[i + 3], 14, -187363961); b = gg(b, c, d, a, words[i + 8], 20, 1163531501)
    a = gg(a, b, c, d, words[i + 13], 5, -1444681467); d = gg(d, a, b, c, words[i + 2], 9, -51403784); c = gg(c, d, a, b, words[i + 7], 14, 1735328473); b = gg(b, c, d, a, words[i + 12], 20, -1926607734)
    a = hh(a, b, c, d, words[i + 5], 4, -378558); d = hh(d, a, b, c, words[i + 8], 11, -2022574463); c = hh(c, d, a, b, words[i + 11], 16, 1839030562); b = hh(b, c, d, a, words[i + 14], 23, -35309556)
    a = hh(a, b, c, d, words[i + 1], 4, -1530992060); d = hh(d, a, b, c, words[i + 4], 11, 1272893353); c = hh(c, d, a, b, words[i + 7], 16, -155497632); b = hh(b, c, d, a, words[i + 10], 23, -1094730640)
    a = hh(a, b, c, d, words[i + 13], 4, 681279174); d = hh(d, a, b, c, words[i], 11, -358537222); c = hh(c, d, a, b, words[i + 3], 16, -722521979); b = hh(b, c, d, a, words[i + 6], 23, 76029189)
    a = hh(a, b, c, d, words[i + 9], 4, -640364487); d = hh(d, a, b, c, words[i + 12], 11, -421815835); c = hh(c, d, a, b, words[i + 15], 16, 530742520); b = hh(b, c, d, a, words[i + 2], 23, -995338651)
    a = ii(a, b, c, d, words[i], 6, -198630844); d = ii(d, a, b, c, words[i + 7], 10, 1126891415); c = ii(c, d, a, b, words[i + 14], 15, -1416354905); b = ii(b, c, d, a, words[i + 5], 21, -57434055)
    a = ii(a, b, c, d, words[i + 12], 6, 1700485571); d = ii(d, a, b, c, words[i + 3], 10, -1894986606); c = ii(c, d, a, b, words[i + 10], 15, -1051523); b = ii(b, c, d, a, words[i + 1], 21, -2054922799)
    a = ii(a, b, c, d, words[i + 8], 6, 1873313359); d = ii(d, a, b, c, words[i + 15], 10, -30611744); c = ii(c, d, a, b, words[i + 6], 15, -1560198380); b = ii(b, c, d, a, words[i + 13], 21, 1309151649)
    a = ii(a, b, c, d, words[i + 4], 6, -145523070); d = ii(d, a, b, c, words[i + 11], 10, -1120210379); c = ii(c, d, a, b, words[i + 2], 15, 718787259); b = ii(b, c, d, a, words[i + 9], 21, -343485551)
    a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od)
  }
  const hex = (num: number) => {
    let s = ''
    for (let j = 0; j < 4; j++) s += ((num >> (j * 8 + 4)) & 0x0f).toString(16) + ((num >> (j * 8)) & 0x0f).toString(16)
    return s
  }
  return hex(a) + hex(b) + hex(c) + hex(d)
}

/** Normaliza un email antes de hashear (trim + lowercase, estilo Gravatar). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const gravatarHash = (email: string): string => md5(normalizeEmail(email))

/* ═════════════════════ 1) Gravatar ═════════════════════ */

export interface GravatarProfile {
  registered: boolean
  hash: string
  profileUrl?: string
  displayName?: string
  preferredUsername?: string
  thumbnailUrl?: string
  currentLocation?: string
  aboutMe?: string
  accounts?: { domain: string; url: string; shortname: string }[]
}

/** Consulta el perfil público de Gravatar por hash MD5. CORS: *. */
export async function gravatarProfile(email: string): Promise<GravatarProfile> {
  const hash = gravatarHash(email)
  try {
    const res = await fetch(`https://en.gravatar.com/${hash}.json`, { credentials: 'omit' })
    if (!res.ok) return { registered: res.status !== 404, hash }
    const data = await res.json()
    const entry = data?.entry?.[0]
    if (!entry) return { registered: false, hash }
    return {
      registered: true,
      hash,
      profileUrl: entry.profileUrl,
      displayName: entry.displayName,
      preferredUsername: entry.preferredUsername,
      thumbnailUrl: entry.thumbnailUrl,
      currentLocation: entry.currentLocation,
      aboutMe: entry.aboutMe,
      accounts: (entry.accounts ?? []).map((a: { domain: string; url: string; shortname: string }) => ({ domain: a.domain, url: a.url, shortname: a.shortname })),
    }
  } catch {
    return { registered: false, hash }
  }
}

/** Sondra el avatar (d=404): 200 = registrado, 404 = sin Gravatar. */
export async function gravatarAvatarProbe(email: string): Promise<{ exists: boolean; url: string; hash: string }> {
  const hash = gravatarHash(email)
  const url = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'omit' })
    return { exists: res.ok, url: `https://www.gravatar.com/avatar/${hash}?s=200`, hash }
  } catch {
    return { exists: false, url: `https://www.gravatar.com/avatar/${hash}?s=200`, hash }
  }
}

/* ═════════════════════ 2) XposedOrNot ═════════════════════ */

export interface BreachResult {
  exposed: boolean
  breaches: string[]
  error: string | null
}

/** ¿Aparece el email en alguna filtración conocida? CORS: * (verificado). */
export async function checkBreaches(email: string): Promise<BreachResult> {
  try {
    const res = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`, { credentials: 'omit' })
    if (!res.ok) return { exposed: false, breaches: [], error: `HTTP ${res.status}` }
    const data = await res.json()
    if (data?.status === 'error') return { exposed: false, breaches: [], error: String(data.error ?? 'error desconocido') }
    const raw = data?.breaches
    const breaches: string[] = Array.isArray(raw)
      ? Array.isArray(raw[0]) ? raw[0] : raw
      : []
    return { exposed: breaches.length > 0, breaches, error: null }
  } catch (e) {
    return { exposed: false, breaches: [], error: (e as Error).message }
  }
}

export const BREACH_GUIDE: { name: string; what: string; tip: string }[] = [
  { name: 'LinkedIn (2021)', what: ' scraping de perfiles públicos', tip: 'email + puesto + empresa: base del spear phishing' },
  { name: 'Adobe (2013)', what: 'emails + hashes de contraseñas', tip: 'si estás ahí, rota esa contraseña YA' },
  { name: 'Collection#1-5', what: 'listas de credenciales reutilizadas', tip: 'la prueba del credential stuffing masivo' },
  { name: 'Naz.API (2023)', what: 'credenciales con malware infostealer', tip: 'si sale aquí, el equipo estaba infectado' },
  { name: 'AntiPublic Combo', what: 'credenciales de múltiples fuentes', tip: 'el paquete clásico de los ataques de reutilización' },
]

/* ═════════════════════ 3) GitHub ═════════════════════ */

export interface GithubCommitResult {
  found: boolean
  total: number
  sample: { repo: string; sha: string; message: string; url: string; date: string }[]
  error: string | null
}

/** Busca commits públicos firmados con ese email (GitHub expone el email
   del autor en el API de commits). CORS: *. 10 req/min sin token. */
export async function githubCommitSearch(email: string): Promise<GithubCommitResult> {
  try {
    const res = await fetch(
      `https://api.github.com/search/commits?q=author-email:${encodeURIComponent(email)}&sort=author-date&order=desc&per_page=5`,
      { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit' },
    )
    if (!res.ok) return { found: false, total: 0, sample: [], error: `HTTP ${res.status}` }
    const data = await res.json()
    const items = (data.items ?? []).map((it: { repository: { full_name: string }; sha: string; commit: { message: string; author: { date: string } }; html_url: string }) => ({
      repo: it.repository?.full_name ?? '?',
      sha: it.sha?.slice(0, 8) ?? '?',
      message: (it.commit?.message ?? '').split('\n')[0].slice(0, 90),
      url: it.html_url,
      date: it.commit?.author?.date ?? '',
    }))
    return { found: (data.total_count ?? 0) > 0, total: data.total_count ?? 0, sample: items, error: null }
  } catch (e) {
    return { found: false, total: 0, sample: [], error: (e as Error).message }
  }
}

/* ═════════════════════ análisis local del email ═════════════════════ */

export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'throwawaymail.com', 'getnada.com', 'dispostable.com', 'sharklasers.com',
  'trashmail.com', 'getairmail.com', 'maildrop.cc', 'mohmal.com', 'emailondeck.com',
  'fakeinbox.com', 'mailnesia.com', 'tempinbox.com', 'spambog.com', 'mytemp.email',
])

export const PROVIDER_INFO: Record<string, { name: string; type: 'consumidor' | 'empresa' | 'privacidad'; note: string }> = {
  'gmail.com': { name: 'Gmail', type: 'consumidor', note: 'acepta aliases con + y puntos: base+nóminas@gmail.com rastrea quién filtra' },
  'outlook.com': { name: 'Outlook', type: 'consumidor', note: 'aliases de Microsoft con +tag' },
  'hotmail.com': { name: 'Hotmail', type: 'consumidor', note: 'cuentas antiguas: probable credencial reutilizada' },
  'yahoo.com': { name: 'Yahoo', type: 'consumidor', note: 'su filtración de 2013 afectó a todas las cuentas' },
  'proton.me': { name: 'Proton Mail', type: 'privacidad', note: 'usuario consciente: cuidado con el pretexto' },
  'protonmail.com': { name: 'Proton Mail', type: 'privacidad', note: 'usuario consciente de seguridad' },
  'tutanota.com': { name: 'Tutanota', type: 'privacidad', note: 'usuario privacy-first' },
  'icloud.com': { name: 'iCloud', type: 'consumidor', note: 'Hide My Email genera aliases aleatorios' },
  'me.com': { name: 'iCloud', type: 'consumidor', note: 'alias antiguo de Apple' },
}

export interface EmailAnalysis {
  valid: boolean
  local: string
  domain: string
  provider: { name: string; type: string; note: string } | null
  isDisposable: boolean
  hasPlusTag: boolean
  hasDotTrick: boolean // solo gmail: ignora puntos
  roleAccount: boolean // info@, admin@, noreply@
  notes: string[]
}

const ROLE_PREFIXES = ['info', 'admin', 'contact', 'support', 'noreply', 'no-reply', 'help', 'sales', 'billing', 'security', 'abuse', 'hr', 'jobs']

export function analyzeEmail(email: string): EmailAnalysis {
  const notes: string[] = []
  const clean = email.trim().toLowerCase()
  const valid = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)
  const [local = '', domain = ''] = clean.split('@')
  const hasPlusTag = local.includes('+')
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com'
  const hasDotTrick = isGmail && local.includes('.')
  const roleAccount = ROLE_PREFIXES.some((r) => local.startsWith(r))
  const provider = PROVIDER_INFO[domain] ?? null
  const isDisposable = DISPOSABLE_DOMAINS.has(domain)

  if (!valid) notes.push('formato no válido: los servicios la rechazarían en el registro')
  if (isDisposable) notes.push('dominio descartable: se crea y se tira, típica de registros de prueba o fraude')
  if (hasPlusTag) notes.push(`subaddressing: ${local.split('+')[0]}@${domain} es la bandeja real — quita el tag para unificar identidades`)
  if (hasDotTrick) notes.push('Gmail ignora los puntos: a.b@gmail.com y ab@gmail.com son la MISMA cuenta')
  if (roleAccount) notes.push('cuenta de rol (no personal): el OSINT de persona tiene que ir por el dominio, no por el email')
  if (domain.endsWith('.edu') || domain.endsWith('.ac.uk')) notes.push('dominio académico: suele aparecer en filtraciones de universidades')
  if (provider?.type === 'privacidad') notes.push('proveedor de privacidad: el usuario protege activamente su identidad')

  return {
    valid,
    local,
    domain,
    provider: provider ? { name: provider.name, type: provider.type, note: provider.note } : null,
    isDisposable,
    hasPlusTag,
    hasDotTrick,
    roleAccount,
    notes,
  }
}

/** El email canónico tras quitar +tag y puntos (Gmail). */
export function canonicalEmail(email: string): string {
  const { local, domain, valid } = analyzeEmail(email)
  if (!valid) return email
  let l = local.split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') l = l.replace(/\./g, '')
  return `${l}@${domain}`
}

/* ─── dorks y verificación manual ─────────────────────────────────────── */

export interface DorkRow { engine: string; query: string; url: string; what: string }

export function emailDorks(email: string): DorkRow[] {
  const e = encodeURIComponent(`"${email}"`)
  const canonical = encodeURIComponent(`"${canonicalEmail(email)}"`)
  return [
    { engine: 'Google', query: `"${email}"`, url: `https://www.google.com/search?q=${e}`, what: 'menciones exactas en la web abierta' },
    { engine: 'Google', query: `"${email}" (site:pastebin.com OR site:justpaste.it OR ext:txt OR ext:csv)`, url: `https://www.google.com/search?q=${encodeURIComponent(`"${email}" (site:pastebin.com OR site:justpaste.it OR ext:txt OR ext:csv)`)}`, what: 'volcados y pegados públicos' },
    { engine: 'Bing', query: `"${email}" (leak OR dump OR password)`, url: `https://www.bing.com/search?q=${encodeURIComponent(`"${email}" (leak OR dump OR password)`)}`, what: 'filtraciones indexadas (resultados distintos a Google)' },
    { engine: 'GitHub', query: `"${email}"`, url: `https://github.com/search?q=${e}&type=code`, what: 'código, configs y commits que la exponen' },
    { engine: 'DuckDuckGo', query: `"${canonicalEmail(email)}"`, url: `https://duckduckgo.com/?q=${canonical}`, what: 'la dirección canónica (sin +tag ni puntos)' },
  ]
}

export interface ManualCheck { name: string; url: (e: string) => string; what: string; category: 'breaches' | 'social' | 'verificación' }

export const MANUAL_CHECKS: ManualCheck[] = [
  { name: 'Have I Been Pwned', url: (e) => `https://haveibeenpwned.com/unifiedsearch/${encodeURIComponent(e)}`, what: 'la referencia en filtraciones (su API completa requiere clave, la web es pública)', category: 'breaches' },
  { name: 'Intelligence X', url: (e) => `https://intelx.io/?s=${encodeURIComponent(e)}`, what: 'buscador de leaks y pastebins históricos', category: 'breaches' },
  { name: 'DeHashed', url: (e) => `https://dehashed.com/search?query=${encodeURIComponent(e)}`, what: 'base de credenciales filtradas (requiere cuenta)', category: 'breaches' },
  { name: 'Holehe (CLI)', url: () => 'https://github.com/megadose/holehe', what: 'comprueba registro en 120+ sitios vía el "forgot password" (lo ejecutas tú, no desde aquí)', category: 'verificación' },
  { name: 'Gravatar perfil', url: (e) => `https://gravatar.com/${gravatarHash(e)}`, what: 'el perfil público completo en la web', category: 'social' },
  { name: 'GitHub commits', url: (e) => `https://github.com/search?q=author-email%3A${encodeURIComponent(e)}&type=commits`, what: 'los mismos commits que consulta el API, en la web', category: 'verificación' },
]

export const EMAIL_OSINT_ETHICS: string[] = [
  'Todo lo que consulta esta tool es público y pasivo: perfiles públicos, bases de filtraciones ya publicadas y APIs abiertas.',
  'Las filtraciones se consultan para saber si TU email está comprometido o en incidentes autorizados: no para acceder a cuentas.',
  'Los resultados de "registrado en X" son señales, no pruebas: confirma siempre manualmente.',
  'El email es dato personal (RGPD): investigar a alguien sin base legítima puede ser acoso. Úsalo en tu huella, CTFs y auditorías autorizadas.',
]
