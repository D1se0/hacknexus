/* OSINT de nombres de usuario: enumera en qué plataformas existe un alias
   (PATRÓN DE FUERZA BRUTA PASIVA, todo client-side), genera dorks por
   plataforma, y analiza el propio alias (fecha probable, patrón, leaking). */

export interface SiteDef {
  name: string
  category: 'social' | 'dev' | 'gaming' | 'foros' | 'arte' | 'música' | 'fotos' | 'vídeo' | 'otros'
  url: (u: string) => string
  note: string
}

export const SITES: SiteDef[] = [
  { name: 'GitHub', category: 'dev', url: (u) => `https://github.com/${u}`, note: 'perfil público, repos y actividad' },
  { name: 'GitLab', category: 'dev', url: (u) => `https://gitlab.com/${u}`, note: 'perfil y proyectos' },
  { name: 'Stack Overflow', category: 'dev', url: (u) => `https://stackoverflow.com/users?tab=Reputation&filter=all&search=${u}`, note: 'búsqueda de usuarios' },
  { name: 'Hacker News', category: 'foros', url: (u) => `https://news.ycombinator.com/user?id=${u}`, note: 'perfil y comentarios' },
  { name: 'Reddit', category: 'foros', url: (u) => `https://www.reddit.com/user/${u}`, note: 'historial completo público' },
  { name: 'X (Twitter)', category: 'social', url: (u) => `https://x.com/${u}`, note: 'perfil y biografía' },
  { name: 'Mastodon (busca)', category: 'social', url: (u) => `https://mastodon.social/search?q=${u}`, note: 'busca en la instancia grande' },
  { name: 'Bluesky', category: 'social', url: (u) => `https://bsky.app/profile/${u}.bsky.social`, note: 'handle por defecto' },
  { name: 'Instagram', category: 'fotos', url: (u) => `https://www.instagram.com/${u}/`, note: 'perfil público si no es privado' },
  { name: 'Flickr', category: 'fotos', url: (u) => `https://www.flickr.com/people/${u}`, note: 'fotos y álbumes' },
  { name: 'YouTube', category: 'vídeo', url: (u) => `https://www.youtube.com/@${u}`, note: 'canal con handle' },
  { name: 'Twitch', category: 'vídeo', url: (u) => `https://www.twitch.tv/${u}`, note: 'canal en vivo y VODs' },
  { name: 'Steam', category: 'gaming', url: (u) => `https://steamcommunity.com/id/${u}`, note: 'perfil y juegos' },
  { name: 'Xbox Gamertag', category: 'gaming', url: (u) => `https://xboxgamertag.com/search/${u}`, note: 'buscador de gamertags' },
  { name: 'Speedrun.com', category: 'gaming', url: (u) => `https://www.speedrun.com/user/${u}`, note: 'récords y runs' },
  { name: 'SoundCloud', category: 'música', url: (u) => `https://soundcloud.com/${u}`, note: 'pistas y playlists' },
  { name: 'Bandcamp', category: 'música', url: (u) => `https://bandcamp.com/${u}`, note: 'colección y fandom' },
  { name: 'DeviantArt', category: 'arte', url: (u) => `https://www.deviantart.com/${u}`, note: 'galería' },
  { name: 'ArtStation', category: 'arte', url: (u) => `https://www.artstation.com/${u}`, note: 'portafolio pro' },
  { name: 'Behance', category: 'arte', url: (u) => `https://www.behance.net/${u}`, note: 'portafolio diseño' },
  { name: 'Medium', category: 'otros', url: (u) => `https://medium.com/@${u}`, note: 'artículos' },
  { name: 'Keybase', category: 'otros', url: (u) => `https://keybase.io/${u}`, note: 'identidad cripto verificada' },
  { name: 'Gravatar', category: 'otros', url: (u) => `https://gravatar.com/${u}`, note: 'avatar vinculado a emails' },
  { name: 'Taringa (histórico)', category: 'foros', url: (u) => `https://www.taringa.net/${u}`, note: 'muy usado en LATAM' },
]

export const SITE_CATEGORIES = ['social', 'dev', 'gaming', 'foros', 'arte', 'música', 'fotos', 'vídeo', 'otros'] as const

/** Dorks para localizar menciones del alias en motores públicos. */
export function usernameDorks(u: string): { engine: string; query: string; url: string }[] {
  const enc = encodeURIComponent(u)
  return [
    { engine: 'Google', query: `"${u}" (site:instagram.com OR site:twitter.com OR site:x.com OR site:reddit.com)`, url: `https://www.google.com/search?q=${encodeURIComponent(`"${u}" (site:instagram.com OR site:twitter.com OR site:x.com OR site:reddit.com)`)}` },
    { engine: 'Google', query: `"${u}" (intitle:"index.of" OR ext:log OR ext:txt OR ext:cnf)`, url: `https://www.google.com/search?q=${encodeURIComponent(`"${u}" (intitle:"index.of" OR ext:log OR ext:txt OR ext:cnf)`)}` },
    { engine: 'Google', query: `"${u}" (leak OR dump OR pastebin OR paste)`, url: `https://www.google.com/search?q=${encodeURIComponent(`"${u}" (leak OR dump OR pastebin OR paste)`)}` },
    { engine: 'Bing', query: `"${u}" site:pastebin.com OR site:ghostbin.com OR site:justpaste.it`, url: `https://www.bing.com/search?q=${encodeURIComponent(`"${u}" site:pastebin.com OR site:ghostbin.com OR site:justpaste.it`)}` },
    { engine: 'GitHub', query: `"${u}" (password OR token OR api_key)`, url: `https://github.com/search?q=${encodeURIComponent(`"${u}" (password OR token OR api_key)`)}&type=code` },
    { engine: 'DuckDuckGo', query: `"${u}" intitle:"index of"`, url: `https://duckduckgo.com/?q=${encodeURIComponent(`"${u}" intitle:"index of"`)}` },
  ]
}

/* ── análisis del alias ───────────────────────────────────────── */

export interface AliasAnalysis {
  length: number
  hasDigits: boolean
  hasUnderscore: boolean
  hasYear: boolean
  probableYear: string | null
  hasLeet: boolean
  hasSeparator: boolean
  words: string[]
  uniqChars: number
  entropyBits: number
  style: string
  tips: string[]
}

/** Análisis heurístico del alias: estilo, año probable, entropía. */
export function analyzeAlias(u: string): AliasAnalysis {
  const len = u.length
  const lower = u.toLowerCase()
  const hasDigits = /\d/.test(u)
  const hasUnderscore = /[_\-.]/.test(u)
  const yearMatch = lower.match(/(19[89]\d|20[0-3]\d)/)
  const probableYear = yearMatch ? yearMatch[1] : null
  const leet = /[4@3137$]/.test(lower)
  const separator = /[_\-.]/.test(u)
  const uniq = new Set(lower).size
  const entropy = Math.log2(Math.max(2, uniq)) * len

  const words: string[] = []
  // split simple por separadores y camelCase
  const parts = u.split(/[_\-.]+/).flatMap((p) => p.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/))
  for (const p of parts) {
    const w = p.toLowerCase().replace(/\d+/g, '')
    if (w.length >= 3) words.push(w)
  }

  let style = 'aleatorio'
  if (len <= 5 && !hasDigits) style = 'corto y limpio (alias puro, difícil de buscar)'
  else if (probableYear) style = 'con año: suele ser el nacimiento, graduación o año de creación'
  else if (leet) style = 'leet-speak: común en gaming y seguridad'
  else if (separator && words.length) style = 'compuesto con separador (nombre+rol, nick+ciudad...)'
  else if (hasDigits && !separator) style = 'alias+dígitos (muy común en auto-registro)'

  const tips: string[] = []
  if (probableYear) tips.push(`el año ${probableYear} sugiere fecha personal: busca "${u.slice(0, probableYear ? u.indexOf(probableYear) : len)}" sin año en foros antiguos`)
  if (words.length >= 2) tips.push(`prueba búsquedas de "${words[0]}" + "${words[words.length - 1]}" por separado: la gente reutiliza mitades de su alias`)
  if (hasUnderscore) tips.push('busca también variantes con punto, guion y sin separador: se reutilizan indistintamente')
  if (len <= 6) tips.push('alias corto: busca en archives de foros y registros antiguos (Wayback, dumps históricos)')
  if (entropy < 20) tips.push('baja entropía: es probable que existan variantes con el mismo patrón')

  return { length: len, hasDigits, hasUnderscore, hasYear: !!probableYear, probableYear, hasLeet: leet, hasSeparator: separator, words, uniqChars: uniq, entropyBits: Math.round(entropy), style, tips }
}

/** Genera variantes de un alias para busquedas cruzadas. */
export function aliasVariants(u: string): string[] {
  const base = u.toLowerCase()
  const variants = new Set<string>([base])
  variants.add(base.replace(/[_\-.]/g, ''))
  variants.add(base.replace(/[_\-.]/g, '.'))
  variants.add(base.replace(/[_\-.]/g, '_'))
  variants.add(base + '1')
  variants.add(base + 'x')
  if (/\d+$/.test(base)) variants.add(base.replace(/\d+$/, ''))
  if (!/\d$/.test(base)) variants.add(base + '99')
  return [...variants].filter((v) => v.length >= 3).slice(0, 10)
}

export const OSINT_ETHICS: string[] = [
  'Esto es OSINT pasivo: consultar URLs públicas que cualquiera puede ver. No se interactúa con las cuentas ni se evade ningún control.',
  'No contactes a la persona, no hagas phishing con los datos, no intentes acceder a nada. Solo es recono de superficie.',
  'Úsalo para tu propia huella (¿cuánto saben de ti?), investigaciones autorizadas o CTFs.',
  'Varias plataformas tos prohíben el scraping: aquí solo se generan enlaces, no se hace scraping automático.',
]
