/* ─── PhishKit: motores de la categoría Phishing ─────────────────────────
   1) Quishing: QR phishing — payload + estilo para campañas de awareness.
   2) ShortenerAudit: acortadores, unshortening y anatomy de redirects.
   3) PhishMtm: anatomía educativa del MITM moderno (Evilginx-style).
   Todo client-side: sin escaneos de red, sin contacto con targets. */

/* ═════════════════════ 1) Quishing ═════════════════════ */

export interface QuishTemplate {
  id: string
  name: string
  desc: string
  icon: string
  payload: (o: { domain: string; path: string; target: string }) => string
  color: string // color sugerido del QR (hex)
  note: string
}

export const QUISH_TEMPLATES: QuishTemplate[] = [
  {
    id: 'parking',
    name: 'Parking falso',
    desc: 'El clásico del parking: QR pegado sobre el real que apunta a una pasarela de pago del atacante',
    icon: '🅿️',
    payload: ({ domain, path }) => `https://${domain}${path}?ref=qr&pay=1`,
    color: '#2ee88a',
    note: 'Lección: los QR físicos se pueden cubrir. Verifica con la app del operador, nunca con la cámara del sistema.',
  },
  {
    id: 'msession',
    name: 'QR de sesión MFA',
    desc: 'Simula un QR de inicio de sesión (estilo WhatsApp Web) que roba la sesión al escanearlo',
    icon: '📱',
    payload: ({ domain, path, target }) => `https://${domain}${path}?sso=${encodeURIComponent(target)}&session=bind`,
    color: '#4fb0ff',
    note: 'Lección: ningún servicio legítimo te pide escanear un QR de un email o un cartel para "mantener la sesión".',
  },
  {
    id: 'wifi',
    name: 'WiFi cautivo falso',
    desc: 'Preset WiFi del generador apuntando a un SSID cautivo del atacante (robo de credenciales)',
    icon: '📶',
    payload: ({ domain, path }) => `WIFI:T:WPA;S:Café_Guest;P:;H:false;;${domain}${path}`,
    color: '#ffb454',
    note: 'Lección: el preset WiFi es inocuo aquí, pero en un cartel físico redirige a un portal de pago falso.',
  },
  {
    id: 'crypto',
    name: 'QR de cartera (wallet)',
    desc: 'Sustituye una dirección de cartera por la del atacante — el QR "shimming"',
    icon: '🪙',
    payload: ({ domain, path }) => `https://${domain}${path}?swap=eth&wallet=0x9A8f7B6c5D4e3F2a1B0c9D8e7F6a5B4c3d2E1f0A`,
    color: '#f472b6',
    note: 'Lección: las direcciones no se validan a simple vista. Siempre verifica 4+ caracteres inicial/final.',
  },
]

export interface QuishStyle {
  dark: string
  light: string
  margin: number
  width: number
  logoText: string
}

export const QUISH_STYLE_PRESETS: { id: string; name: string; style: QuishStyle; note: string }[] = [
  { id: 'clean', name: 'Corporativo limpio', style: { dark: '#111111', light: '#ffffff', margin: 2, width: 320, logoText: '' }, note: 'El estilo que menos despierta sospechas: blanco, plano, con margen amplio.' },
  { id: 'brand', name: 'Con logo ficticio', style: { dark: '#1a3a6b', light: '#ffffff', margin: 3, width: 320, logoText: 'PARKING' }, note: 'Un "logo" pegado encima refuerza la confianza: así operan los reemplazos reales.' },
  { id: 'urban', name: 'Etiqueta urbana', style: { dark: '#0d0d0d', light: '#f5f5dc', margin: 1, width: 300, logoText: 'SCAN' }, note: 'Papel desgastado y bordes cortos: el QR de calle real.' },
]

/* ═════════════════════ 2) ShortenerAudit ═════════════════════ */

export interface Shortener {
  name: string
  domains: string[]
  method: 'head' | 'direct'
  preview: string // forma de previsualizar (códigos de respuesta)
  note: string
}

export const SHORTENERS: Shortener[] = [
  { name: 'bit.ly', domains: ['bit.ly'], method: 'head', preview: 'GET /xxxxx → 301 con Location', note: 'el más común en phishing corporativo' },
  { name: 't.ly', domains: ['t.ly'], method: 'head', preview: 'GET /xxxx → 302 con Location', note: 'abarato y usado en campañas masivas' },
  { name: 'tinyurl', domains: ['tinyurl.com'], method: 'head', preview: 'GET /xxxx → 301', note: 'los enlaces NO expiran: aún peores' },
  { name: 'is.gd', domains: ['is.gd'], method: 'head', preview: 'GET /xxxx → 301', note: 'popular en spam de foros' },
  { name: 'cutt.ly', domains: ['cutt.ly'], method: 'head', preview: 'GET /xxxx → 302', note: 'permite estadísticas: útil para fingerprinting' },
  { name: 'rebrandly', domains: ['rebrand.ly'], method: 'head', preview: 'GET /xxxx → 301', note: 'dominios personalizados: el más peligroso' },
  { name: 'shorturl', domains: ['shorturl.at'], method: 'head', preview: 'GET /xxxx → 301', note: 'común en fraudes de entradas' },
  { name: 'rb.gy', domains: ['rb.gy'], method: 'head', preview: 'GET /xxxx → 301', note: 'usado en campañas de SMS (smishing)' },
]

export interface UrlChainStep {
  url: string
  status: number | null
  location: string | null
  note: string
}

export interface ChainResult {
  steps: UrlChainStep[]
  error: string | null
  finalUrl: string | null
}

/** Sigue la cadena de redirecciones con fetch sin CORS-follow (modo no-cors
   solo detecta que hay redirección, no el destino; con modo cors resuelve). */
export async function unshorten(url: string, maxHops = 6): Promise<ChainResult> {
  const steps: UrlChainStep[] = []
  let current = url.trim()
  try {
    for (let i = 0; i < maxHops; i++) {
      const res = await fetch(current, { method: 'GET', redirect: 'follow', credentials: 'omit', referrerPolicy: 'no-referrer' })
      steps.push({
        url: current,
        status: res.status,
        location: res.redirected ? res.url : null,
        note: res.redirected ? 'redirigida' : 'final',
      })
      if (!res.redirected) return { steps, error: null, finalUrl: current }
      current = res.url
    }
    return { steps, error: null, finalUrl: current }
  } catch (e) {
    return { steps, error: `bloqueado por CORS o red: ${(e as Error).message}`, finalUrl: current }
  }
}

/** Descompone una URL y señala los patrones clásicos de phishing. */
export interface UrlFlags {
  hasCredentialsInUrl: boolean
  hasIpHost: boolean
  isPunycode: boolean
  hasDeepSubdomains: boolean
  hasTyposquat: boolean
  suspiciousTld: boolean
  hasOpenRedirect: boolean
  notes: string[]
}

const SUSPICIOUS_TLDS = ['tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'buzz', 'click', 'link', 'rest', 'icu', 'cfd']

export function analyzeUrlFlags(raw: string): UrlFlags {
  const notes: string[] = []
  let u: URL
  try {
    u = new URL(raw.includes('://') ? raw : `http://${raw}`)
  } catch {
    return {
      hasCredentialsInUrl: false, hasIpHost: false, isPunycode: false, hasDeepSubdomains: false,
      hasTyposquat: false, suspiciousTld: false, hasOpenRedirect: false,
      notes: ['URL no válida'],
    }
  }
  const host = u.hostname
  const hasCredentialsInUrl = raw.includes('@') && raw.indexOf('@') < raw.indexOf(host)
  const hasIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')
  const isPunycode = host.includes('xn--')
  const parts = host.split('.')
  const hasDeepSubdomains = parts.length >= 4
  const tld = parts[parts.length - 1].toLowerCase()
  const suspiciousTld = SUSPICIOUS_TLDS.includes(tld)

  const KNOWN = ['google', 'microsoft', 'apple', 'amazon', 'paypal', 'facebook', 'instagram', 'netflix', 'bbva', 'santander', 'dhl', 'ups', 'fedex']
  const hasTyposquat = KNOWN.some((k) => {
    const re = new RegExp(`(?!^)${k.slice(0, -1)}`, 'i')
    return parts.some((p) => p !== k && k.length > 3 && re.test(p) && !p.endsWith(k))
  })
  const hasOpenRedirect = /[?&](url|next|redirect|return|goto|continue|dest|destination)=https?/i.test(raw)

  if (hasCredentialsInUrl) notes.push('credenciales en la URL: el host real es lo que va DESPUÉS del @')
  if (hasIpHost) notes.push('el host es una IP: sin certificado ni reputación de dominio')
  if (isPunycode) notes.push('punycode (xn--): puede imitar caracteres Unicode de otro dominio')
  if (hasDeepSubdomains) notes.push(`${parts.length} niveles de subdominio: patrón "paypal.com.secure-login.tk"`)
  if (suspiciousTld) notes.push(`TLD ${tld}: barato y frecuente en campañas desechables`)
  if (hasOpenRedirect) notes.push('parámetro de redirección abierta: el dominio legítimo actúa de trampolín')
  if (hasTyposquat) notes.push('posible typosquatting de una marca conocida')

  return { hasCredentialsInUrl, hasIpHost, isPunycode, hasDeepSubdomains, hasTyposquat, suspiciousTld, hasOpenRedirect, notes }
}

export const SHORTENER_DEFENSES: string[] = [
  'Pasa el cursor (o mantén pulsado en móvil) sobre el enlace: el cliente de correo muestra el destino real.',
  'Nunca abras un shortener desde un email de "tu banco": los bancos no acortan.',
  'Expande con el prefijo del propio servicio: bit.ly/xxxx → bit.ly/xxxx+ (o tinyurl.com/preview/xxxx).',
  'En el navegador: unshorten.dev, urlex.org o checkshorturl.com expanden sin hacer clic.',
  'Si la campaña es corporativa: bloquea shorteners no corporativos en el proxy y en el gateway de email.',
]

/* ═════════════════════ 3) PhishMtm (anatomía Evilginx-style) ═════════════════════ */

export interface MtmStep {
  n: number
  title: string
  actor: 'víctima' | 'atacante' | 'servicio'
  detail: string
  defense: string
}

/** Los 7 pasos del phishing MITM moderno y cómo romper cada uno. */
export const MTM_STEPS: MtmStep[] = [
  {
    n: 1, title: 'El cebo', actor: 'atacante',
    detail: 'Email/SMS con pretexto (DHL, Microsoft, Zoom) que enlaza al proxy, no al login real. El dominio es parecido: rnicrosoft.com, microsoft-support.team…',
    defense: 'Chequear el dominio carácter a carácter; los anchor texts engañan: hover antes de clic.',
  },
  {
    n: 2, title: 'El proxy inverso', actor: 'atacante',
    detail: 'Evilginx/EvilProxy sirve una copia pixel-perfect del login real desde su dominio. Todo lo que la víctima ve viene del proxy, que actúa como intermediario transparente.',
    defense: 'No hay copia local que detectar: la defensa es el usuario (dominio) y el filtrado de dominios recién registrados.',
  },
  {
    n: 3, title: 'Credenciales capturadas', actor: 'atacante',
    detail: 'La víctima escribe su usuario y contraseña en el formulario. El proxy los reenvía al servicio real Y los guarda. El login en el servicio legítimo prospera.',
    defense: 'Password managers detectan el dominio incorrecto y no autocompletan: es la señal más fiable que tiene el usuario.',
  },
  {
    n: 4, title: 'El 2FA "funciona"', actor: 'servicio',
    detail: 'El servicio manda el OTP/push. La víctima lo teclea en el proxy convencida de que todo es normal — está autenticándose de verdad, solo que en una sesión del atacante.',
    defense: 'Los números coincidentes (push con número) no paran esto: el OTP capturado en caliente es válido.',
  },
  {
    n: 5, title: 'Cookie de sesión robada', actor: 'atacante',
    detail: 'El servicio emite la cookie de sesión. El proxy la copia antes de devolverla a la víctima. El atacante ya tiene una sesión válida: no necesita la contraseña nunca más.',
    defense: 'Aquí muere el 2FA clásico. Solo las passkeys (FIDO2) lo cortan: el challenge está atado al dominio real.',
  },
  {
    n: 6, title: 'Secuestro silencioso', actor: 'atacante',
    detail: 'El atacante usa la cookie en paralelo desde otra IP/dispositivo. La víctima navega "normal" sin saber que comparte la sesión.',
    defense: 'Detección: logins imposibles (geolocalización imposible), cambios de User-Agent, alertas de nueva sesión.',
  },
  {
    n: 7, title: 'Persistencia', actor: 'atacante',
    detail: 'Crea reglas de buzón, añade MFA propio o registra dispositivos. Aunque la víctima cambie la contraseña, la sesión activa puede sobrevivir.',
    defense: 'Ante sospecha: cerrar TODAS las sesiones, revisar reglas de buzón y dispositivos, y solo entonces rotar credenciales.',
  },
]

export const MTM_DEFENSES: { title: string; detail: string; level: 'básico' | 'avanzado' | 'estructural' }[] = [
  { title: 'Passkeys / FIDO2', detail: 'La ÚNICA defensa estructural: el challenge criptográfico está atado al dominio real, un proxy no puede reutilizarlo.', level: 'estructural' },
  { title: 'Password manager', detail: 'No autocompleta si el dominio no coincide exactamente: el proxy siempre tiene dominio distinto.', level: 'básico' },
  { title: 'Filtrado de dominios nuevos', detail: 'Los proxies viven en dominios recién registrados: filtrar edades < 30 días mata la mayoría de campañas.', level: 'avanzado' },
  { title: 'Conditional Access', detail: 'Entra ID con dispositivo compliance: la cookie robada no sirve desde un dispositivo no gestionado.', level: 'avanzado' },
  { title: 'Session binding', detail: 'Atar la sesión a la IP/UA del login original rompe el secuestro paralelo (paso 6).', level: 'avanzado' },
  { title: 'Formación con campañas', detail: 'El phishing MITM se detecta mirando la barra de direcciones: hay que entrenar ese gesto.', level: 'básico' },
]

export const PHISHKIT_ETHICS: string[] = [
  'Todo aquí es educativo: las plantillas sirven para campañas de awareness CON autorización escrita.',
  'Los dominios ficticios son para formación interna: nunca registrar dominios de terceros (typosquatting es delito en muchas jurisdicciones).',
  'En una campaña de awareness autorizada, el objetivo es medir y formar, no humillar: los clics se reportan agregados.',
]
