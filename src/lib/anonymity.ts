/* ── Anonymity Lab · Ronda 16 ─────────────────────────────────────────────
   La verdad incómoda: un navegador NO puede cambiar la IP pública ni la MAC
   del dispositivo (requiere privilegios del sistema operativo). Lo que SÍ
   puede hacer esta herramienta:
   ① Diagnóstico en vivo de tu exposición (IP, WebRTC, DNS, hora, idioma, huella)
   ② Coherencia de identidad: tu navegador no debe delatar el país de salida
   ③ Recetas EXACTAS y copiables para hacer el cambio real en tu sistema
   ④ Protocolo de «identidad nueva»: checklist de todo lo que te delata
   Todo lo que se ejecuta aquí es lectura del propio navegador; los comandos
   son para que TÚ los ejecutes donde tienes privilegios. Sin magia falsa. */

export type Platform = 'linux' | 'windows' | 'macos' | 'android' | 'ios'
export type LeakLevel = 'critical' | 'high' | 'medium' | 'low'

export const PLATFORM_LABEL: Record<Platform, string> = {
  linux: 'Linux',
  windows: 'Windows',
  macos: 'macOS',
  android: 'Android',
  ios: 'iOS',
}

/* ---------- 1. Superficies de fuga: qué te delata aunque cambies de IP ---------- */

export interface LeakSurface {
  id: string
  name: string
  level: LeakLevel
  reveals: string
  howItWorks: string
  defense: string
}

export const LEAK_SURFACES: LeakSurface[] = [
  {
    id: 'ip',
    name: 'IP pública',
    level: 'critical',
    reveals: 'Ciudad/aprox., ISP; cruzada con logs y sesiones, tu identidad',
    howItWorks:
      'Cada conexión TCP lleva tu IP pública como origen. Sin túnel es la dirección de tu router, asignada por el ISP con tu nombre.',
    defense:
      'Levanta VPN o Tor ANTES de abrir la web. Un proxy del navegador solo cubre HTTP del navegador: no cubre DNS, ni otras apps, ni WebRTC.',
  },
  {
    id: 'webrtc',
    name: 'WebRTC / ICE',
    level: 'critical',
    reveals: 'Tu IP real (y las de tus interfaces) incluso con proxy activo',
    howItWorks:
      'RTCPeerConnection negocia ICE y emite candidates SDP con las IPs de tus interfaces para lograr P2P: se salta el proxy del navegador por diseño.',
    defense:
      'Firefox: media.peerconnection.enabled=false. Tor Browser ya lo trae cortado. Chrome/Edge necesitan extensión o desactivarlo por política.',
  },
  {
    id: 'dns',
    name: 'Resolución DNS',
    level: 'high',
    reveals: 'Todos los dominios que visitas, a tu ISP, aunque el tráfico vaya cifrado',
    howItWorks:
      'Salvo DoH/DoT, el SO pregunta al DNS del ISP en claro (UDP 53). Con VPN mal configurada el DNS sigue yendo al ISP: fuga clásica.',
    defense:
      'DoH activo en el navegador, o DNS dentro del túnel (AllowedIPs 0.0.0.0/0 + DNS del proveedor). Verifícalo con dnsleaktest.',
  },
  {
    id: 'tz',
    name: 'Zona horaria',
    level: 'medium',
    reveals: 'Región aproximada por el desfase exacto en minutos',
    howItWorks:
      'Intl expone tu zona (Europe/Madrid) y el offset de tu reloj. Una IP alemana con hora española delata que la IP no es tu entorno real.',
    defense:
      'Usa un navegador/perfil dedicado con la hora del país de salida. Tor Browser ya normaliza esto; con VPN, cierra el hueco tú.',
  },
  {
    id: 'lang',
    name: 'Idiomas del navegador',
    level: 'medium',
    reveals: 'Tu país de origen por navigator.language y Accept-Language',
    howItWorks:
      'IP de Países Bajos con navigator.language es-ES y Accept-Language es-ES,es;q=0.9 grita «es un puente»: red flag en antifraude.',
    defense:
      'Perfil dedicado con idiomas del país de salida. Tor Browser fuerza en-US por defecto: otro motivo para usarlo.',
  },
  {
    id: 'fingerprint',
    name: 'Huella del navegador',
    level: 'high',
    reveals: 'Un identificador estable sin cookies: canvas, WebGL, fuentes, UA, pantalla',
    howItWorks:
      'La combinación de decenas de rasgos es casi única. Cambias de IP, la huella no, y te siguen entre «identidades».',
    defense:
      'Tor Browser o Firefox con privacy.resistFingerprinting, bloqueo de canvas, perfil nuevo SIN extensiones personales.',
  },
  {
    id: 'storage',
    name: 'Cookies y almacenamiento',
    level: 'high',
    reveals: 'Sesiones previas que anulan la IP nueva: un solo login te vincula',
    howItWorks:
      'Cookies, localStorage e IndexedDB persisten en el perfil. Si inicias sesión en una cuenta real, todas tus «identidades» pasan a ser tuyas.',
    defense:
      'Un contenedor/perfil independiente por identidad, borrado entre sesiones, y jamás cruzar logins entre identidades.',
  },
  {
    id: 'ua',
    name: 'User-Agent / client hints',
    level: 'low',
    reveals: 'SO, navegador y build exactos; rareza = identificable',
    howItWorks:
      'navigator.userAgent y sec-ch-ua describen tu versión. Un UA exótico por «disfrazarlo» te hace MÁS único, no menos.',
    defense:
      'Navegador estándar actualizado y sin trucos de UA. Tor Browser lo unifica para todo el mundo: esa es la solución real.',
  },
]

export function leakTone(level: LeakLevel): 'bad' | 'warn' | 'info' | 'ok' {
  if (level === 'critical') return 'bad'
  if (level === 'high') return 'warn'
  if (level === 'medium') return 'info'
  return 'ok'
}

/* ---------- 2. WebRTC: diagnóstico real con RTCPeerConnection ---------- */

export interface WebrtcResult {
  local: string[]
  public: string[]
  mdns: string[]
  raw: string[]
}

/** IPs privadas / de enlace local (mismo criterio aproximado que RFC 1918/3927 y link-local v6). */
export function isPrivateIp(ip: string): boolean {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim())
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT RFC 6598
    return false
  }
  const low = ip.trim().toLowerCase()
  if (low === '::1' || low === '::') return true
  if (/^f[cd][0-9a-f]{2}:/.test(low)) return true // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(low)) return true // fe80::/10 link local
  return false
}

/**
 * Parsea los candidates ICE de un SDP y clasifica las IPs descubiertas.
 * Funciona con la salida real de RTCPeerConnection.createOffer().
 */
export function parseSdpCandidates(sdp: string): WebrtcResult {
  const res: WebrtcResult = { local: [], public: [], mdns: [], raw: [] }
  for (const line of sdp.split(/\r?\n/)) {
    if (!/^a=candidate:/i.test(line)) continue
    res.raw.push(line.replace(/^a=candidate:/i, 'candidate:').trim())
    const parts = line.trim().split(/\s+/)
    if (parts.length < 8) continue
    const host = parts[4]
    const raddrIdx = parts.indexOf('raddr')
    const hosts = [host]
    if (raddrIdx > 0 && parts[raddrIdx + 1] && parts[raddrIdx + 1] !== '0.0.0.0') hosts.push(parts[raddrIdx + 1])
    for (const ip of hosts) {
      if (ip.endsWith('.local')) {
        if (!res.mdns.includes(ip)) res.mdns.push(ip)
      } else if (isPrivateIp(ip)) {
        if (!res.local.includes(ip)) res.local.push(ip)
      } else if (/^[\d.]+$/.test(ip) || ip.includes(':')) {
        if (!res.public.includes(ip)) res.public.push(ip)
      }
    }
  }
  return res
}

export interface WebrtcVerdict {
  verdict: string
  level: LeakLevel
  detail: string
}

export function webrtcVerdict(res: WebrtcResult, hasTunnelIp: boolean): WebrtcVerdict {
  if (res.public.length > 0) {
    return {
      verdict: 'IP pública real expuesta',
      level: 'critical',
      detail: `WebRTC descubrió ${res.public.join(', ')}. Si no coincide con tu IP de túnel, estás filtrando fuera de él.`,
    }
  }
  if (res.local.length > 0) {
    return {
      verdict: 'IPs de tus interfaces visibles',
      level: 'high',
      detail: `Filtró ${res.local.join(', ')}. No revela tu IP pública, pero sí tu red interna (192.168.x.x, CGNAT 100.64/10…) y afina tu huella.`,
    }
  }
  if (res.mdns.length > 0) {
    return {
      verdict: hasTunnelIp ? 'Sin fuga: solo mDNS' : 'Sin fuga IP: solo mDNS',
      level: 'low',
      detail:
        'Los candidates usan nombres .local (obfuscación mDNS de Chrome). Bien: esta superficie no te está delatando aquí.',
    }
  }
  return {
    verdict: 'Sin candidates: WebRTC bloqueado o sin candidatos',
    level: 'low',
    detail: 'Nada recolectado. Puede que WebRTC esté desactivado o el navegador lo limite: es el estado deseable.',
  }
}

/* ---------- 3. Huella: cuánta entropía exponen tus señales ---------- */

export interface FingerprintInput {
  userAgent: string
  languages: string
  timezone: string
  screen: string
  hardwareConcurrency?: number
  deviceMemory?: number
  webglRenderer?: string
}

export interface FingerprintScore {
  bits: number
  breakdown: { k: string; bits: number }[]
  population: string
  verdict: string
  level: LeakLevel
}

const TOR_UA = /rv:[0-9.]+\) Gecko\/20100101 Firefox\// // Tor Browser recorta el UA a lo mínimo común

/** Estimación honesta de entropía (bits) por rasgos clásicos del fingerprinting. */
export function fingerprintScore(inp: FingerprintInput): FingerprintScore {
  const breakdown: { k: string; bits: number }[] = []
  const uaBits = TOR_UA.test(inp.userAgent) ? 0.5 : 10
  breakdown.push({ k: 'User-Agent', bits: uaBits })
  breakdown.push({ k: 'Idiomas', bits: inp.languages ? 4 : 0 })
  breakdown.push({ k: 'Zona horaria', bits: inp.timezone ? 12 : 0 })
  breakdown.push({ k: 'Pantalla', bits: inp.screen ? 4 : 0 })
  if (typeof inp.hardwareConcurrency === 'number' && inp.hardwareConcurrency > 0)
    breakdown.push({ k: 'Núcleos', bits: 2 })
  if (typeof inp.deviceMemory === 'number' && inp.deviceMemory > 0) breakdown.push({ k: 'RAM (deviceMemory)', bits: 2 })
  if (inp.webglRenderer) breakdown.push({ k: 'GPU / WebGL', bits: 8 })

  const bits = Math.round(breakdown.reduce((s, b) => s + b.bits, 0) * 10) / 10
  const population =
    bits >= 33 ? 'decenas de millones de equipos' : `≈1 de cada ${Math.pow(10, Math.min(bits, 30) / Math.log2(10) | 0).toLocaleString('es-ES')} equipos`
  const level: LeakLevel = bits >= 25 ? 'critical' : bits >= 18 ? 'high' : bits >= 10 ? 'medium' : 'low'
  const verdict =
    bits >= 25
      ? 'Huella casi única: cambiar de IP no te anonimiza frente a fingerprinting'
      : bits >= 18
        ? 'Huella alta: úsala con VPN/Tor y un perfil dedicado, o te seguirán'
        : bits >= 10
          ? 'Huella media: protections de navegador la reducen bastante'
          : 'Huella baja: navegador con buena uniformización (perfil resistFingerprinting o Tor)'
  return { bits, breakdown, population, verdict, level }
}

/* ---------- 4. Coherencia de identidad por país de salida ---------- */

export interface CoherenceProfile {
  timezone: string
  langs: string
  note: string
}

export const EXIT_COUNTRY_PROFILES: Record<string, CoherenceProfile> = {
  DE: { timezone: 'Europe/Berlin', langs: 'de-DE,de;q=0.9,en-US;q=0.8', note: 'Salida muy habitual en VPN/Tor: los antifraude la esperan' },
  NL: { timezone: 'Europe/Amsterdam', langs: 'nl-NL,nl;q=0.9,en-US;q=0.8', note: 'Mucha infraestructura de hosting: a veces puntúa bajo en «residential»' },
  US: { timezone: 'America/New_York', langs: 'en-US,en;q=0.9', note: 'Ajusta la costa: New_York, Chicago (America/Chicago), Los_Angeles (America/Los_Angeles)' },
  FR: { timezone: 'Europe/Paris', langs: 'fr-FR,fr;q=0.9,en-US;q=0.8', note: 'Perfiles francófonos coherentes evitan el flag de idioma' },
  ES: { timezone: 'Europe/Madrid', langs: 'es-ES,es;q=0.9', note: 'Tu entorno real: útil para comparar el diagnóstico con y sin túnel' },
  GB: { timezone: 'Europe/London', langs: 'en-GB,en;q=0.9', note: 'Cuidado con hora de verano: Europe/London ≠ GMT/UTC todo el año' },
  CH: { timezone: 'Europe/Zurich', langs: 'de-CH,de;q=0.9,en-US;q=0.8', note: 'Salida común de VPN de pago: coherencia alemana/italiana según región' },
  SE: { timezone: 'Europe/Stockholm', langs: 'sv-SE,sv;q=0.9,en-US;q=0.8', note: 'Privacidad fuerte como país, salidas frecuentes en proveedores suecos' },
  CA: { timezone: 'America/Toronto', langs: 'en-CA,en;q=0.9,fr-CA;q=0.8', note: 'Ojo con fr-CA: si tu perfil es en-CA puro, no mezcles francés' },
  JP: { timezone: 'Asia/Tokyo', langs: 'ja-JP,ja;q=0.9,en-US;q=0.8', note: 'Sin idioma japonés tu «identidad» es visiblemente un puente' },
  SG: { timezone: 'Asia/Singapore', langs: 'en-SG,en;q=0.9,zh-SG;q=0.8', note: 'Hub de salida clásico en Asia; inglés coherente' },
  MX: { timezone: 'America/Mexico_City', langs: 'es-MX,es;q=0.9', note: 'Diferencia clave: es-MX, no es-ES, si sales por México' },
}

export interface CoherenceCheck {
  ok: boolean
  mismatches: string[]
  target: CoherenceProfile
}

/** Compara tu entorno actual (hora/idioma) con lo que debería ser si fueras ese país. */
export function checkCoherence(country: string, currentTimezone: string, currentLanguages: string): CoherenceCheck {
  const target = EXIT_COUNTRY_PROFILES[country]
  if (!target) return { ok: false, mismatches: [`País sin perfil de coherencia: ${country}`], target: { timezone: '', langs: '', note: '' } }
  const mismatches: string[] = []
  const tzCurrent = (currentTimezone || '').trim()
  if (tzCurrent && tzCurrent !== target.timezone) mismatches.push(`Zona horaria: tu navegador dice ${tzCurrent}, la identidad ${country} exigiría ${target.timezone}`)
  const langFirst = (currentLanguages || '').split(',')[0]?.trim().toLowerCase() || ''
  const targetFirst = target.langs.split(',')[0]?.trim().toLowerCase() || ''
  if (langFirst && langFirst !== targetFirst) mismatches.push(`Idioma principal: ${langFirst} frente al esperado ${targetFirst}`)
  return { ok: mismatches.length === 0, mismatches, target }
}

/* ---------- 5. Recetas de cambio REAL por plataforma ---------- */

export interface RecipeStep {
  cmd: string
  note: string
}

export interface Recipe {
  id: string
  platform: Platform
  kind: 'mac' | 'tor' | 'vpn' | 'dhcp' | 'verify' | 'restore'
  title: string
  desc: string
  requires?: string
  steps: RecipeStep[]
  risks: string[]
}

/* --- MAC --- */

export function macRecipes(platform: Platform, iface: string): Recipe[] {
  if (platform === 'linux') {
    return [
      {
        id: 'linux-mac-random',
        platform,
        kind: 'mac',
        title: 'MAC aleatoria completa (macchanger -r)',
        desc: 'Genera una MAC aleatoria de fabricante conocido. Hazlo con la interfaz APAGADA para que la red nunca vea la original.',
        requires: 'macchanger (apt install macchanger / pacman -S macchanger) y sudo',
        steps: [
          { cmd: `sudo ip link set ${iface} down`, note: 'Baja la interfaz: si cambias la MAC en caliente, la red ya registró la original' },
          { cmd: `sudo macchanger -r ${iface}`, note: 'MAC aleatoria conservando el prefijo del fabricante (OUI real)' },
          { cmd: `sudo ip link set ${iface} up`, note: 'Sube la interfaz con la nueva identidad de hardware' },
          { cmd: `sudo systemctl restart NetworkManager`, note: 'Fuerza re-asociación y DHCP con la MAC nueva (IP de lease nueva si el router lo permite)' },
        ],
        risks: [
          'Muchas redes corporativas y algunos portales cautivos bloquean MACs aleatorias: si no conectas, restaura con macchanger -p',
          'Al reiniciar vuelve la MAC original: la receta es temporal por diseño',
          'Cambia la MAC ANTES de asociarte al WiFi: asociado ya, no renegocia',
        ],
      },
      {
        id: 'linux-mac-same-vendor',
        platform,
        kind: 'mac',
        title: 'MAC variando solo el final (macchanger -A / -e)',
        desc: 'Mantiene el OUI (fabricante) o lo vuelve «desconocido»: menos llamativo frente a un IDS que filtra por OUI.',
        requires: 'macchanger y sudo',
        steps: [
          { cmd: `sudo ip link set ${iface} down`, note: 'Interfaz abajo primero' },
          { cmd: `sudo macchanger -A ${iface}`, note: 'Mismo fabricante, otro dispositivo: el punto dulce para no destacar' },
          { cmd: `sudo ip link set ${iface} up`, note: 'Interfaz arriba' },
          { cmd: `macchanger -s ${iface}`, note: 'Verifica: Current MAC debe ser la nueva' },
        ],
        risks: ['Si el DHCP del router amarra IP↔MAC recibirás otra IP (eso suele ser justo lo que buscas)', 'En redes con NAC (802.1X) la MAC no basta: hay autenticación real'],
      },
    ]
  }
  if (platform === 'windows') {
    return [
      {
        id: 'win-mac-random-setting',
        platform,
        kind: 'mac',
        title: 'MAC aleatorizada nativa de Windows (por red WiFi)',
        desc: 'Windows 10/11 incorpora MAC aleatoria por red: la forma soportada y sin tocar drivers.',
        requires: 'Windows 10 (1703+) o Windows 11',
        steps: [
          { cmd: `Inicio → Configuración → Red e Internet → Wi-Fi → (propiedades de la red)`, note: 'Por red concreta, no global' },
          { cmd: `Configuración de dirección MAC aleatoria → «Sí» o «Usar aleatoria por red»`, note: '«Sí»: una MAC aleatoria por red; «por red» rota cada día/ sesión' },
          { cmd: `Desconecta y reconecta la red WiFi`, note: 'La nueva MAC se aplica al asociarte de nuevo' },
          { cmd: `getmac /v`, note: 'Verifica la MAC «física» efectiva del adaptador WiFi' },
        ],
        risks: ['Solo para WiFi (no Ethernet)', 'Algunos drivers antiguos la ignoran; verifica con getmac /v tras reconectar'],
      },
      {
        id: 'win-mac-registry',
        platform,
        kind: 'mac',
        title: 'MAC manual por PowerShell (NetworkAddress del adaptador)',
        desc: 'Fuerza una MAC concreta en el adaptador vía la propiedad avanzada del driver. Vale para Ethernet y muchos WiFi.',
        requires: 'PowerShell como Administrador',
        steps: [
          { cmd: `Get-NetAdapter | Format-Table Name, InterfaceDescription, MacAddress`, note: 'Identifica el nombre exacto del adaptador (ej. Wi-Fi)' },
          { cmd: `$mac = "02" + -join ((1..5) | ForEach-Object { "{0:X2}" -f (Get-Random -Max 256) })`, note: 'Genera una MAC localmente administrada (el 02 inicial la marca como no asignada por el IEEE)' },
          { cmd: `Set-NetAdapterAdvancedProperty -Name "Wi-Fi" -DisplayName "MAC Address" -Value $mac`, note: 'En Intel puede llamarse «Locally Administered Address»; en Realtek, «Network Address»' },
          { cmd: `Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false; Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false`, note: 'Reinicia el adaptador para aplicar (se corta la red un momento)' },
          { cmd: `Get-NetAdapter -Name "Wi-Fi" | Select-Object MacAddress`, note: 'Verifica que la MAC efectiva cambió' },
        ],
        risks: [
          'El nombre de la propiedad varía por fabricante del driver: si falla, búscala en Administrador de dispositivos → adaptador → Propiedades → Opciones avanzadas',
          'El cambio persiste en el driver hasta que lo deshagas (borra el valor para volver a la MAC original)',
          'En portales cautivos corporativos, una MAC «02-xx» puede disparar alertas de seguridad',
        ],
      },
    ]
  }
  if (platform === 'macos') {
    return [
      {
        id: 'macos-mac-spoof',
        platform,
        kind: 'mac',
        title: 'MAC aleatoria temporal (ifconfig)',
        desc: 'Cambia la MAC hasta el siguiente reinicio. Requiere el Wi-Fi APAGADO en el momento del cambio.',
        requires: 'sudo; en Apple Silicon funciona igual con lladdr si ether no aplica',
        steps: [
          { cmd: `networksetup -setairportpower en0 off`, note: 'Apaga el Wi-Fi (en Macs recientes el servicio puede ser en0 igualmente; compruébalo con networksetup -listallhardwareports)' },
          { cmd: `MAC="02:$(openssl rand -hex 5 | sed 's/\\(..\\)/\\1:/g')"; echo $MAC`, note: 'MAC localmente administrada aleatoria (prefijo 02)' },
          { cmd: `sudo ifconfig en0 ether $MAC`, note: 'Aplica la MAC nueva (si da error, prueba lladdr en Apple Silicon)' },
          { cmd: `networksetup -setairportpower en0 on`, note: 'Enciende el Wi-Fi y conéctate: la red verá la MAC nueva' },
          { cmd: `ifconfig en0 | grep ether`, note: 'Verifica la MAC en uso' },
        ],
        risks: ['La MAC original vuelve tras reiniciar (temporal por diseño)', 'En redes con control por MAC del router, registra qué MAC tenías para restaurarla'],
      },
    ]
  }
  if (platform === 'android') {
    return [
      {
        id: 'android-mac-random',
        platform,
        kind: 'mac',
        title: 'MAC aleatorizada nativa (no persistente)',
        desc: 'Android 10+ aleatoriza por red por defecto; puedes forzar que NO sea persistente para cada sesión.',
        requires: 'Android 10 o superior',
        steps: [
          { cmd: `Ajustes → Redes e Internet → Internet → (engranaje de la red WiFi)`, note: 'Configuración de ESA red' },
          { cmd: `Privacidad → Dirección MAC → «Usar aleatorizada (no persistente)»`, note: 'No persistente = MAC nueva cada vez que te asocias' },
          { cmd: `Desactiva y activa el WiFi`, note: 'Al reconectar entra con otra MAC' },
          { cmd: `Ajustes → Acerca del teléfono → Estado → Dirección MAC WiFi`, note: 'O Ajustes WiFi avanzado según fabricante: verifica' },
        ],
        risks: ['En Android 9 o anterior no existe la opción nativa: requeriría root (no recomendado aquí)', 'Los portales cautivos con «remember por MAC» te pedirán login otra vez (esperado)'],
      },
    ]
  }
  return [
    {
      id: 'ios-mac-private',
      platform,
      kind: 'mac',
      title: 'Dirección Wi-Fi privada (rotativa)',
      desc: 'iOS usa una MAC privada por red; desde iOS 15/18 puedes elegir «rotativa» o «no persistente».',
      requires: 'iOS 14+ (rotativa en 18+)',
      steps: [
        { cmd: `Ajustes → Wi-Fi → (i) junto a la red`, note: 'Detalle de la red' },
        { cmd: `Dirección Wi-Fi privada → «Rotativa» (o desactívala si buscas la MAC real para diagnosticar)`, note: 'Rotativa cambia periódicamente; fija por red es la opción por defecto' },
        { cmd: `Desactiva y activa Wi-Fi`, note: 'Renegocia con la nueva MAC' },
      ],
      risks: ['Con MAC privada desactivada expones la MAC real del dispositivo: no lo hagas en redes ajenas', 'Algunos hoteles/campus con autorización por MAC te tratarán como dispositivo nuevo'],
    },
  ]
}

/* --- IP: Tor / VPN / DHCP --- */

export function torrcSnippet(): string {
  return `# /etc/tor/torrc — panel de control para cambiar circuito (NEWNYM)
ControlPort 9051
CookieAuthentication 1
# (el SOCKS 9050 ya viene activo por defecto)`
}

export function proxychainsConf(): string {
  return `# /etc/proxychains4.conf — enruta cualquier binario por el SOCKS de Tor
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5  127.0.0.1  9050`
}

export function newnymCommand(): string {
  return `printf 'AUTHENTICATE ""\\r\\nSIGNAL NEWNYM\\r\\nQUIT\\r\\n' | nc 127.0.0.1 9051`
}

export function networkRecipes(platform: Platform, iface: string, target: 'tor' | 'vpn' | 'dhcp'): Recipe[] {
  if (target === 'tor') {
    if (platform === 'linux' || platform === 'macos' || platform === 'windows') {
      const pkgs = platform === 'linux' ? 'sudo apt install tor proxychains4 -y' : platform === 'macos' ? 'brew install tor proxychains-ng' : 'Instala Tor Expert Bundle + Proxifier/Proxchains port para Windows'
      const steps: RecipeStep[] = [
        { cmd: pkgs, note: 'Tor daemon + wrapper para forzar cualquier binario por el circuito' },
        { cmd: torrcSnippet(), note: 'Añade estas dos líneas a /etc/tor/torrc (Linux/macOS: /usr/local/etc/tor/torrc en macOS)' },
        { cmd: `sudo systemctl restart tor   # (o: tor & en macOS/Windows)`, note: 'Arranca el daemon con el ControlPort' },
        { cmd: `curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip`, note: 'Prueba de fuego: debe devolver la IP de un nodo de salida de Tor' },
        { cmd: proxychainsConf(), note: 'Config de proxychains: DNS también por Tor (proxy_dns) para no filtrar consultas' },
        { cmd: `proxychains4 firefox https://check.torproject.org`, note: 'Cualquier app bajo el circuito; para navegar, mejor el Tor Browser completo' },
        { cmd: newnymCommand(), note: 'NUEVA SALIDA al vuelo: señal NEWNYM al ControlPort y reconecta en ~10 s' },
      ]
      return [
        {
          id: `${platform}-tor`,
          platform,
          kind: 'tor',
          title: 'Tor: salida nueva bajo demanda (SOCKS 9050 + NEWNYM)',
          desc: 'La vía más directa para «otra IP ya»: circuito Tor con cambio de salida al vuelo. Cada conexión de un mismo circuito comparte salida; NEWNYM rota el circuito.',
          requires: platform === 'windows' ? 'Tor Expert Bundle y un wrapper SOCKS' : 'paquetes tor + proxychains4 y sudo',
          steps,
          risks: [
            'NEWNYM cambia el circuito, no garantiza una IP de salida DISTINTA: los guardas/middle dura semanas',
            'No inicies sesión en cuentas reales dentro de Tor: el anonimato de la ruta no borra lo que TÚ digas de ti',
            'Muchos sitios bloquean nodos de salida (CAPTCHAs, 403): es el coste del circuito compartido',
            'El DNS va por Tor SOLO si usas --socks5-hostname / proxy_dns: si no, tu ISP ve cada dominio',
          ],
        },
      ]
    }
    return [
      {
        id: `${platform}-tor-mobile`,
        platform,
        kind: 'tor',
        title: 'Tor en móvil: Orbot (Android) / VPN Tor (iOS)',
        desc: 'En móvil no hay proxychains: Orbot enruta el tráfico de las apps que elijas por Tor.',
        requires: 'Orbot (Android, F-Droid/Play) o apps VPN de Tor en iOS',
        steps: [
          { cmd: `Instala Orbot y activa «Modo VPN»`, note: 'Todo el dispositivo por Tor, o elige apps concretas (lista por app)' },
          { cmd: `Pulsa el botón de cebolla para conectar`, note: 'Orbot construye el circuito; el icono VPN aparece en la barra' },
          { cmd: `En Orbot: menú → «Nueva identidad»`, note: 'Equivalente de NEWNYM en móvil: nuevo circuito' },
          { cmd: `Verifica abriendo https://check.torproject.org en el navegador`, note: 'Debe decir «Felicidades, estás usando Tor»' },
        ],
        risks: ['Las apps con WebRTC propio pueden filtrar fuera del túnel: prueba cada app crítica', 'El modo VPN de Orbot no cifra contra un ISP hostil más que Tor mismo: es anonimato de ruta, no magia'],
      },
    ]
  }
  if (target === 'vpn') {
    const isDesk = platform === 'linux' || platform === 'macos' || platform === 'windows'
    const steps: RecipeStep[] = isDesk
      ? [
          { cmd: `# 1) Descarga el .conf de tu proveedor (o genera el tuyo con la tool WireGuard Config de esta suite)`, note: 'El conf define pares de claves y endpoint: la herramienta wgquick lo construye completo' },
          { cmd: `# 2) AllowedIPs = 0.0.0.0/0, ::/0`, note: 'CRÍTICO: 0.0.0.0/0 enruta TODO por el túnel. Con solo 0.0.0.0/1+128.0.0.0/1 igual, pero con /0 aseguras cobertura' },
          { cmd: `# 3) DNS = <dns_del_proveedor> dentro del [Interface]`, note: 'Sin esto tu DNS sigue yendo al ISP: fuga de dominios aunque el tráfico vaya cifrado' },
          { cmd: `sudo wg-quick up wg0`, note: 'Levanta el túnel (Linux); en macOS/Windows la app oficial hace lo mismo' },
          { cmd: `curl https://ifconfig.me && echo && curl -6 https://ifconfig.co 2>/dev/null || true`, note: 'Verifica IPv4 pública nueva Y que IPv6 no filtre' },
          { cmd: `sudo ufw default deny outgoing; sudo ufw allow out on wg0; sudo ufw allow out to <IP_SERVIDOR_VPN> port 51820 proto udp; sudo ufw enable`, note: 'Kill switch: sin túnel, no hay internet. Nadie ve tu IP real aunque el túnel caiga' },
        ]
      : [
          { cmd: `Instala la app oficial del proveedor y activa «Kill switch» / «Bloquear sin VPN»`, note: 'En móvil el kill switch evita fugas al cambiar de red' },
          { cmd: `Conecta y elige servidor del país de tu «identidad»`, note: 'La coherencia horaria/idioma se configura aparte: mira la sección ② de esta tool' },
          { cmd: `Verifica en ipleak.net: IP, DNS y WebRTC`, note: 'Las tres casillas deben mostrar el país del túnel' },
        ]
    return [
      {
        id: `${platform}-vpn`,
        platform,
        kind: 'vpn',
        title: 'VPN WireGuard con kill switch',
        desc: 'La vía estándar para otra IP estable. Con DNS forzado al túnel y kill switch, la única IP que sale es la del servidor.',
        requires: isDesk ? 'wireguard-tools y sudo; conf del proveedor o propio' : 'app del proveedor con kill switch',
        steps,
        risks: [
          'Un proxy de navegador NO es una VPN: solo cubre HTTP del navegador (DNS y WebRTC siguen tuyos)',
          'Si la VPN no reparte IPv6 y tu red la tiene, las webs que prefieren v6 verán tu IP real: bloquéala o usa kill switch v6',
          'El proveedor de la VPN ve quién eres: elige uno con política no-logs auditable, la confianza no se declara, se audita',
        ],
      },
    ]
  }
  // dhcp
  const dhcpSteps: Record<Platform, RecipeStep[]> = {
    linux: [
      { cmd: `sudo dhclient -r ${iface} && sudo dhclient ${iface}`, note: 'Suelta el lease y pide otro (DORA completo)' },
      { cmd: `# alternativamente con NetworkManager: nmcli con down id <RED> && nmcli con up id <RED>`, note: 'En redes modernas NetworkManager manda: abajo+arriba renegocia' },
    ],
    windows: [
      { cmd: `ipconfig /release`, note: 'Libera el lease DHCP actual' },
      { cmd: `ipconfig /renew`, note: 'Solicita lease nuevo: puede caer la conexión unos segundos' },
    ],
    macos: [
      { cmd: `sudo ipconfig set en0 BOOTP && sudo ipconfig set en0 DHCP`, note: 'Fuerza re-negociación DHCP en la interfaz' },
    ],
    android: [
      { cmd: `Desconecta la red WiFi y reconecta`, note: 'En móvil el re-lease va con la reconexión' },
    ],
    ios: [
      { cmd: `Ajustes → Wi-Fi → (i) → «Renovar concesión»`, note: 'Botón específico de iOS para re-lease' },
    ],
  }
  return [
    {
      id: `${platform}-dhcp`,
      platform,
      kind: 'dhcp',
      title: 'Renovar IP local / lease DHCP (y por qué casi nunca cambia la pública)',
      desc: 'Útil para redes donde TÚ controlas el router. En tu casa, el ISP te dará LA MISMA IP pública: el lease del router con el ISP no cambia porque tu PC renueve el suyo.',
      requires: 'Acceso a la red; en el router hace falta reiniciar el CGPON/módem y aún así el ISP suele amarrar la IP a la MAC del router',
      steps: [
        ...dhcpSteps[platform],
        { cmd: `# Para opciones reales de IP pública distinta: MAC nueva en el router + reinicio del módem, VPN o Tor`, note: 'El combo clásico: macchanger al router (si es tuyo) + 30 min apagado puede soltar otra IP del pool; garantía cero, es decisión del ISP' },
      ],
      risks: [
        'No esperes IP pública nueva solo con renovar DHCP: eso es folklore de foros con CGNAT por medio',
        'En redes ajenas (trabajo, hotel) renovar lease no cambia qué loguea el gateway de ti',
      ],
    },
  ]
}

/* --- Verificación y restauración --- */

export function verifyRecipes(platform: Platform, iface: string): Recipe[] {
  const common: RecipeStep[] = [
    { cmd: `# Abre https://ipleak.net en el navegador de la identidad`, note: 'IP, DNS y WebRTC en un panel: si algo muestra tu país real, hay fuga' },
    { cmd: `# Abre https://dnsleaktest.com y lanza el test extendido`, note: 'Los servidores DNS que aparezcan NO deben ser los de tu ISP' },
    { cmd: `# Abre https://amiunique.org / browserleaks.com`, note: 'Compara tu huella con y sin el perfil de identidad' },
  ]
  const byPlatform: Record<Platform, RecipeStep[]> = {
    linux: [
      { cmd: `ip -brief link show ${iface}`, note: 'Estado y MAC actual de la interfaz' },
      { cmd: `macchanger -s ${iface}`, note: 'MAC permanente vs actual: si difieren, el spoof está activo' },
      { cmd: `curl https://ifconfig.me && echo && curl --socks5-hostname 127.0.0.1:9050 https://ifconfig.me && echo`, note: 'IP directa vs IP por Tor: deben diferir si el circuito está bien' },
      { cmd: `sudo wg show`, note: 'Si usas VPN: handshake reciente y endpoint del túnel' },
    ],
    windows: [
      { cmd: `getmac /v`, note: 'MAC efectiva por adaptador' },
      { cmd: `ipconfig /all | findstr /i "dirección dhcp dns"`, note: 'Lease, DNS en uso: deben ser del túnel/red esperada' },
      { cmd: `curl.exe https://ifconfig.me`, note: 'IP pública desde consola: sin navegador de por medio' },
    ],
    macos: [
      { cmd: `ifconfig en0 | grep ether`, note: 'MAC en uso' },
      { cmd: `scutil --dns | head -20`, note: 'DNS del sistema: si ves el del ISP con VPN activa, hay fuga' },
      { cmd: `curl https://ifconfig.me && echo`, note: 'IP pública' },
    ],
    android: [
      { cmd: `Ajustes → Acerca del teléfono → Estado`, note: 'MACs actuales (WiFi/Bluetooth)' },
      { cmd: `Navegador → ipleak.net`, note: 'Verificación completa desde el móvil' },
    ],
    ios: [
      { cmd: `Ajustes → Wi-Fi → (i) → lee «Dirección Wi-Fi privada»`, note: 'La MAC que estás usando con ESA red' },
      { cmd: `Safari → ipleak.net`, note: 'IP, DNS y WebRTC en vivo' },
    ],
  }
  return [
    {
      id: `${platform}-verify`,
      platform,
      kind: 'verify',
      title: 'Verificar el cambio: qué mirar y con qué',
      desc: 'Un cambio no verificado es un cambio imaginado. Estas comprobaciones cierran el ciclo.',
      steps: [...byPlatform[platform], ...common],
      risks: ['Los sitios de verificación ven la IP que les muestras: úsalo con la identidad ya puesta, es su función'],
    },
  ]
}

export function restoreRecipes(platform: Platform, iface: string): Recipe[] {
  const byPlatform: Record<Platform, Recipe[]> = {
    linux: [
      {
        id: `${platform}-restore`,
        platform,
        kind: 'restore',
        title: 'Restaurar MAC original y red',
        desc: 'Deshace el spoof de macchanger devolviendo la MAC permanente de la tarjeta.',
        steps: [
          { cmd: `sudo ip link set ${iface} down`, note: 'Interfaz abajo' },
          { cmd: `sudo macchanger -p ${iface}`, note: 'Devuelve la MAC permanente (permanent) de la tarjeta' },
          { cmd: `sudo ip link set ${iface} up && sudo systemctl restart NetworkManager`, note: 'Red como estaba' },
        ],
        risks: [],
      },
    ],
    windows: [
      {
        id: `${platform}-restore`,
        platform,
        kind: 'restore',
        title: 'Restaurar MAC y aleatorización',
        desc: 'Borra la MAC forzada en el driver y devuelve la aleatorización nativa a su estado por defecto.',
        steps: [
          { cmd: `Set-NetAdapterAdvancedProperty -Name "Wi-Fi" -DisplayName "MAC Address" -Value ""`, note: 'Valor vacío: el driver vuelve a su MAC grabada (o borra la propiedad en el Administrador de dispositivos)' },
          { cmd: `Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false; Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false`, note: 'Reinicia el adaptador para aplicar' },
          { cmd: `# Configuración → Wi-Fi → MAC aleatoria → «Usar aleatoria de fábrica» si quieres la original`, note: 'Deshace la aleatorización nativa por red' },
        ],
        risks: [],
      },
    ],
    macos: [
      {
        id: `${platform}-restore`,
        platform,
        kind: 'restore',
        title: 'Restaurar MAC original',
        desc: 'En macOS el spoof no persiste: reiniciar basta, o restauración manual sin reiniciar.',
        steps: [
          { cmd: `# La MAC original se restaurará sola al REINICIAR`, note: 'El spoof de ifconfig no persiste en macOS' },
          { cmd: `sudo ifconfig en0 ether <MAC_ORIGINAL>`, note: 'Si necesitas restaurarla sin reiniciar (la tienes en networksetup -listallhardwareports / en tu nota previa)' },
        ],
        risks: [],
      },
    ],
    android: [
      {
        id: `${platform}-restore`,
        platform,
        kind: 'restore',
        title: 'Volver a MAC aleatorizada persistente',
        desc: 'Vuelve al comportamiento por defecto de Android 10+: MAC aleatoria estable por red.',
        steps: [
          { cmd: `Ajustes → (red WiFi) → Privacidad → «Usar aleatorizada (persistente)»`, note: 'Vuelve al comportamiento por defecto de Android 10+' },
        ],
        risks: [],
      },
    ],
    ios: [
      {
        id: `${platform}-restore`,
        platform,
        kind: 'restore',
        title: 'Volver a Wi-Fi privada fija por red',
        desc: 'Restaura la opción por defecto de iOS: una MAC privada estable por red.',
        steps: [
          { cmd: `Ajustes → Wi-Fi → (i) → Dirección Wi-Fi privada → «Fija»`, note: 'Opción por defecto de iOS: una MAC privada estable por red' },
        ],
        risks: [],
      },
    ],
  }
  return byPlatform[platform]
}

/* ---------- 6. Protocolo de identidad nueva: checklist ---------- */

export interface ChecklistItem {
  id: string
  group: 'Ruta de red' | 'Huella del navegador' | 'Comportamiento' | 'Cierre y verificación'
  item: string
  why: string
  blocker?: boolean
}

export const IDENTITY_CHECKLIST: ChecklistItem[] = [
  { id: 'route-up', group: 'Ruta de red', item: 'Túnel activo (VPN/Tor) y verificado con ifconfig.me', why: 'Nada de lo demás importa si la IP real sigue saliendo', blocker: true },
  { id: 'webrtc-clean', group: 'Ruta de red', item: 'Test WebRTC limpio en esta misma tool (sin IP pública ni interfaces)', why: 'La fuga WebRTC revienta cualquier VPN de navegador', blocker: true },
  { id: 'dns-clean', group: 'Ruta de red', item: 'dnsleaktest sin servidores de tu ISP', why: 'El DNS delata todos los dominios que visitas', blocker: true },
  { id: 'ipv6-covered', group: 'Ruta de red', item: 'IPv6 cubierta o bloqueada (el túnel debe incluir ::/0 o sin v6 en el host)', why: 'Muchas VPN solo tapan IPv4: las webs dual-stack verán tu v6 real' },
  { id: 'killswitch', group: 'Ruta de red', item: 'Kill switch activo (ufw por interfaz wg0, o opción del proveedor)', why: 'Si el túnel cae a mitad de sesión, tu IP real saldría sin avisar' },
  { id: 'mac-rotated', group: 'Ruta de red', item: 'MAC rotada ANTES de asociarte a la red (si el caso lo requiere)', why: 'La MAC amarra tu dispositivo a la red aunque rotes IP' },
  { id: 'fresh-profile', group: 'Huella del navegador', item: 'Perfil/contenedor NUEVO y dedicado, sin extensiones personales', why: 'Una extensión única te identifica mejor que mil cookies' },
  { id: 'no-accounts', group: 'Huella del navegador', item: 'Cero logins de tus cuentas reales en este perfil (Google, mail, redes)', why: 'Un solo login vincula la identidad nueva con la real para siempre', blocker: true },
  { id: 'storage-cleared', group: 'Huella del navegador', item: 'Cookies/LocalStorage borradas entre sesiones de identidad', why: 'El almacenamiento persistente sobrevive a los cambios de IP' },
  { id: 'tz-lang', group: 'Huella del navegador', item: 'Hora e idioma coherentes con el país de salida (sección ② de esta tool)', why: 'IP de Berlín con hora de Madrid es el flag antifraude más básico' },
  { id: 'fingerprint-low', group: 'Huella del navegador', item: 'resistFingerprinting o Tor Browser: huella por debajo de ~10 bits', why: 'La huella sobrevive a IP, cookies y hasta a la MAC' },
  { id: 'no-crosslinks', group: 'Comportamiento', item: 'No reutilizar usernames, fotos, estilos de escritura ni enlaces previos', why: 'Stylometry y usernames cruzados hacen el trabajo sucio del OSINT' },
  { id: 'no-realdata', group: 'Comportamiento', item: 'No mezclar datos reales (teléfono, tarjeta, dirección) con la identidad', why: 'Un SMS de verificación a tu número real = identidad real', blocker: true },
  { id: 'pacing', group: 'Comportamiento', item: 'Sin ráfagas: una cuenta nueva que publica 20 cosas en 5 min grita bot', why: 'El comportamiento es huella conductual: los antifraude lo modelan' },
  { id: 'verify-final', group: 'Cierre y verificación', item: 'Repetir el escaneo de esta tool CON la identidad activa: todo verde', why: 'Verificación final con el entorno ya cambiado, no antes', blocker: true },
  { id: 'cleanup', group: 'Cierre y verificación', item: 'Plan de retirada: cómo restaurar MAC, cerrar perfil y borrar restos', why: 'La identidad temporal debe poder desaparecer limpia' },
]

export interface ChecklistProgress {
  total: number
  done: number
  pct: number
  blockersLeft: string[]
  ready: boolean
}

export function checklistProgress(done: Record<string, boolean>): ChecklistProgress {
  const total = IDENTITY_CHECKLIST.length
  let doneCount = 0
  const blockersLeft: string[] = []
  for (const it of IDENTITY_CHECKLIST) {
    if (done[it.id]) doneCount++
    else if (it.blocker) blockersLeft.push(it.item)
  }
  const pct = Math.round((doneCount / total) * 100)
  return { total, done: doneCount, pct, blockersLeft, ready: blockersLeft.length === 0 }
}

/* ---------- 7. Límites honestos y marco legal ---------- */

export const TOOL_LIMITS: string[] = [
  'Un navegador no puede cambiar la IP pública ni la MAC: requiere privilegios del SO. Esta tool diagnostica y te da los comandos EXACTOS para hacerlo tú.',
  'El test WebRTC solo ve lo que tu propio navegador filtra en candidates ICE: es un espejo, no un escáner remoto.',
  'La puntuación de huella es una estimación por rasgos clásicos (no sustituye a AmIUnique/panopticlick para un informe serio).',
  'ipwho.is ve tu IP cuando pulsas «escanear»: es lo mismo que hace cualquier web que visitas, pero debes saberlo.',
]

export const LEGAL_NOTES: string[] = [
  'Cambiar MAC/IP en TU equipo y con TU red es legítimo (privacidad). En redes ajenas puede violar sus normas de uso o políticas corporativas.',
  'Eludir prohibiciones o vetos usando otra identidad puede romper los Términos de Servicio de la plataforma (bajable de cuenta a demanda civil) y, con fraude o suplantación, ser delito.',
  'Suplantarte en otra persona real, eludir medidas de seguridad de sistemas ajenos o crear cuentas para fraude/acoso son delitos: nada de esto cubre esa vía.',
  'Casos de uso legítimos: privacidad personal, investigaciones de seguridad autorizadas, CTFs, periodismo de fuentes, pruebas antifraude de tu propia plataforma.',
]

/* ---------- 8. Export del protocolo ---------- */

export interface ProtocolExportInput {
  platform: Platform
  iface: string
  exitCountry: string
  done: Record<string, boolean>
  webrtcSummary?: string
  ipSummary?: string
}

export function exportProtocol(inp: ProtocolExportInput): string {
  const prog = checklistProgress(inp.done)
  const { target, mismatches } = checkCoherence(inp.exitCountry, '', '')
  const lines: string[] = []
  lines.push(`# Anonymity Lab — Protocolo de identidad (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`)
  lines.push('')
  lines.push(`- Plataforma objetivo: ${PLATFORM_LABEL[inp.platform]} (interfaz \`${inp.iface}\`)`)
  lines.push(`- País de salida previsto: ${inp.exitCountry} → ${target.timezone} / \`${target.langs.split(',')[0]}\``)
  if (inp.ipSummary) lines.push(`- Exposición detectada: ${inp.ipSummary}`)
  if (inp.webrtcSummary) lines.push(`- WebRTC: ${inp.webrtcSummary}`)
  lines.push(`- Checklist: ${prog.done}/${prog.total} (${prog.pct}%) — ${prog.ready ? 'LISTO' : `faltan bloqueadores: ${prog.blockersLeft.join(' · ')}`}`)
  if (mismatches.length) lines.push(`- Coherencia a corregir: ${mismatches.length} (rellena tz/idioma al ejecutar)`)
  lines.push('')
  lines.push('## Recetas por ejecutar')
  for (const r of [...macRecipes(inp.platform, inp.iface), ...networkRecipes(inp.platform, inp.iface, 'tor'), ...networkRecipes(inp.platform, inp.iface, 'vpn'), ...networkRecipes(inp.platform, inp.iface, 'dhcp'), ...verifyRecipes(inp.platform, inp.iface), ...restoreRecipes(inp.platform, inp.iface)]) {
    lines.push('')
    lines.push(`### ${r.title}`)
    if (r.requires) lines.push(`> Requiere: ${r.requires}`)
    for (const s of r.steps) lines.push(`\`\`\`bash\n${s.cmd}\n\`\`\`\n- ${s.note}`)
    for (const rk of r.risks) lines.push(`- ⚠ ${rk}`)
  }
  lines.push('')
  lines.push('## Checklist de identidad')
  for (const it of IDENTITY_CHECKLIST) lines.push(`- [${inp.done[it.id] ? 'x' : ' '}] [${it.group}] ${it.item}`)
  lines.push('')
  lines.push('## Límites y aviso legal')
  for (const l of TOOL_LIMITS) lines.push(`- ${l}`)
  for (const l of LEGAL_NOTES) lines.push(`- ${l}`)
  return lines.join('\n')
}
