/* WiFi Security Auditor — puntúa la configuración de TU red WiFi y prioriza
   el hardening. Modelo local: cifra la calidad del cifrado, autenticación,
   PMF, passphrase, WPS y superficie de administración. Sin nada externo. */

export interface WifiAuditConfig {
  security: 'wep' | 'wpa1' | 'wpa2-tkip' | 'wpa2' | 'wpa2-wpa3' | 'wpa3'
  auth: 'psk' | 'enterprise' | 'sae' | 'open'
  pmf: 'off' | 'optional' | 'required'
  passphrase: string
  wps: boolean
  remoteAdmin: boolean
  firmwareUpdated: boolean
  guestNetwork: boolean
  hiddenSsid: boolean
  macFilter: boolean
}

export interface AuditCheck {
  id: string
  label: string
  status: 'good' | 'warn' | 'bad'
  points: number // contribución al score 0-100
  max: number
  detail: string
}

export interface AuditResult {
  ok: boolean
  error?: string
  score: number
  grade: string
  gradeColor: string
  checks: AuditCheck[]
  summary: string
}

/* ---------- entropía de la passphrase ---------- */

const charClasses = (pw: string): number => {
  let n = 0
  if (/[a-z]/.test(pw)) n++
  if (/[A-Z]/.test(pw)) n++
  if (/[0-9]/.test(pw)) n++
  if (/[^a-zA-Z0-9]/.test(pw)) n++
  return n
}

/* Entropía en bits: log2(pool^len). Penaliza patrones humanos típicos. */
export const passphraseEntropy = (pw: string): { bits: number; verdict: string; humanPenalty: number } => {
  if (!pw) return { bits: 0, verdict: 'vacía', humanPenalty: 0 }
  const pool = charClasses(pw)
  const poolSize = pool === 1 ? 26 : pool === 2 ? 36 : pool === 3 ? 62 : 95
  let bits = pw.length * Math.log2(poolSize)
  let humanPenalty = 0
  const lower = pw.toLowerCase()
  if (/^[a-z]+\d{0,4}[!?.]?$/i.test(pw)) { humanPenalty += 18 } // palabra+números: patrón rockyou
  if (/(.)\1{2,}/.test(pw)) { humanPenalty += 6 } // aaa, 111
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/i.test(pw)) { humanPenalty += 12 }
  if (/^(password|admin|wifi|internet|claro|movistar|vodafone|telegram|iloveyou)/i.test(lower)) { humanPenalty += 30 }
  if (pw.length >= 20 && pool >= 3) humanPenalty = 0 // larga y variada: perdona todo
  bits = Math.max(0, bits - humanPenalty)
  const verdict =
    bits < 40 ? 'crackeable en horas/días con GPU' :
    bits < 60 ? 'resistente a diccionario, no a ataque dedicado' :
    bits < 80 ? 'sólida' : 'excelente (irrealista de fuerza bruta)'
  return { bits: Math.round(bits), verdict, humanPenalty }
}

/* ---------- auditoría ---------- */

export const auditWifi = (c: WifiAuditConfig): AuditResult => {
  const checks: AuditCheck[] = []

  /* 1. Cifrado (30) */
  const secPts: Record<WifiAuditConfig['security'], number> = { wep: 0, wpa1: 4, 'wpa2-tkip': 8, wpa2: 24, 'wpa2-wpa3': 28, wpa3: 30 }
  const secLabel: Record<WifiAuditConfig['security'], string> = {
    wep: 'WEP — roto desde 2001, se crackea en minutos con el tráfico capturado',
    wpa1: 'WPA1/TKIP — deprecado, ataques de reinyección viables',
    'wpa2-tkip': 'WPA2 con TKIP — el TKIP arrastra las debilidades de WPA1',
    wpa2: 'WPA2-CCMP (AES) — estándar sólido si la passphrase es fuerte',
    'wpa2-wpa3': 'WPA2/WPA3 mixto — buena compatibilidad, los clientes capaces usan SAE',
    wpa3: 'WPA3-SAE — protección frente a ataques offline al handshake',
  }
  checks.push({ id: 'sec', label: 'Cifrado', status: secPts[c.security] >= 24 ? 'good' : secPts[c.security] >= 8 ? 'warn' : 'bad', points: secPts[c.security], max: 30, detail: secLabel[c.security] })

  /* 2. Autenticación (20) */
  const authPts: Record<WifiAuditConfig['auth'], number> = { open: 0, psk: 12, sae: 20, enterprise: 20 }
  const authLabel: Record<WifiAuditConfig['auth'], string> = {
    open: 'Red abierta: cualquiera entra y el tráfico va sin cifrar (usa WPA3-OWE si es pública)',
    psk: 'PSK compartida: una sola fuga compromete a todos; cada usuario debería tener su clave',
    sae: 'SAE (WPA3): el handshake resiste ataques offline de diccionario',
    enterprise: '802.1X/RADIUS: credenciales individuales y revocables, el nivel corporativo',
  }
  checks.push({ id: 'auth', label: 'Autenticación', status: authPts[c.auth] >= 20 ? 'good' : authPts[c.auth] >= 12 ? 'warn' : 'bad', points: authPts[c.auth], max: 20, detail: authLabel[c.auth] })

  /* 3. PMF / 802.11w (15) */
  const pmfPts = { off: 0, optional: 8, required: 15 } as const
  checks.push({
    id: 'pmf', label: 'PMF (802.11w)', status: c.pmf === 'required' ? 'good' : c.pmf === 'optional' ? 'warn' : 'bad',
    points: pmfPts[c.pmf], max: 15,
    detail: c.pmf === 'off'
      ? 'Sin PMF los frames de gestión son spoofeables: deauth/evil twin trivial'
      : c.pmf === 'optional'
        ? 'PMF opcional: protege solo a los clientes que lo negocian. Cámbialo a required (WPA3 ya lo fuerza)'
        : 'PMF required: los deauth spoofeados son ignorados por los clientes',
  })

  /* 4. Passphrase (20) */
  const ent = passphraseEntropy(c.passphrase)
  const pwPts = c.auth !== 'psk' && c.auth !== 'sae' ? 20 : ent.bits >= 80 ? 20 : ent.bits >= 60 ? 14 : ent.bits >= 40 ? 7 : 0
  checks.push({
    id: 'pw', label: 'Passphrase', status: pwPts >= 14 ? 'good' : pwPts >= 7 ? 'warn' : 'bad',
    points: pwPts, max: 20,
    detail: c.auth !== 'psk' && c.auth !== 'sae'
      ? 'Sin PSK no hay passphrase que auditar (enterprise/SAE usa credenciales propias)'
      : `~${ent.bits} bits de entropía — ${ent.verdict}${ent.humanPenalty ? ` (penalización por patrón humano: -${ent.humanPenalty})` : ''}. Objetivo: 16+ caracteres aleatorios o passphrase de 4-5 palabras sin sentido`,
  })

  /* 5. WPS (10) */
  checks.push({
    id: 'wps', label: 'WPS', status: c.wps ? 'bad' : 'good', points: c.wps ? 0 : 10, max: 10,
    detail: c.wps
      ? 'WPS con PIN: vulnerable a Pixie Dust (ataque online en minutos en muchos routers) y a fuerza bruta del PIN (reaver/bully). Desactívalo ya'
      : 'WPS desactivado: eliminado el vector Pixie Dust y el brute force del PIN',
  })

  /* 6. Administración (5) */
  const adminPts = (c.remoteAdmin ? 0 : 3) + (c.firmwareUpdated ? 2 : 0)
  checks.push({
    id: 'admin', label: 'Panel y firmware', status: adminPts >= 5 ? 'good' : adminPts >= 2 ? 'warn' : 'bad',
    points: adminPts, max: 5,
    detail: !c.remoteAdmin && c.firmwareUpdated
      ? 'Admin solo desde la LAN y firmware al día: superficie de ataque mínima'
      : `${c.remoteAdmin ? 'Admin accesible desde WAN (escaneo de puertos lo encuentra en minutos). ' : ''}${c.firmwareUpdated ? '' : 'Firmware sin actualizar: CVEs conocidas sin parchear (mirad las de routers SOHO: son de las más explotadas).'}`,
  })

  /* Señales de falsa seguridad (0 puntos, solo avisos) */
  if (c.hiddenSsid) {
    checks.push({ id: 'hidden', label: 'SSID oculto', status: 'warn', points: 0, max: 0, detail: 'Falsa seguridad: el SSID viaja en los probe requests/responses de tus propios clientes. Ocultarlo solo rompe cosas y destaca en un escaneo.' })
  }
  if (c.macFilter) {
    checks.push({ id: 'mac', label: 'Filtro MAC', status: 'warn', points: 0, max: 0, detail: 'Falsa seguridad: las MAC se ven en el aire con cualquier sniffer y se suplantan con un cambio de 5 segundos (macchanger). No aporta nada frente a un atacante real.' })
  }

  const score = Math.min(100, checks.reduce((s, c2) => s + c2.points, 0))
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const gradeColor = score >= 80 ? 'text-ok' : score >= 55 ? 'text-warn' : 'text-bad'
  const worst = checks.filter((x) => x.max > 0).sort((a, b) => a.points / a.max - b.points / b.max)[0]
  const summary = score >= 90
    ? 'Configuración ejemplar. Solo queda vigilar firmware y rotar credenciales por política.'
    : worst
      ? `Prioridad #1: ${worst.label.toLowerCase()}. ${score < 55 ? 'La red es trivialmente comprometible con herramientas públicas.' : 'Con esto cerrado, la red resiste ataques estándar.'}`
      : 'Configuración incompleta.'

  return { ok: true, score, grade, gradeColor, checks, summary }
}

/* ---------- hardening priorizado ---------- */

export interface HardeningItem {
  priority: number
  title: string
  why: string
  how: string[]
  effort: 'minutos' | 'media hora' | 'una tarde'
}

export const HARDENING: HardeningItem[] = [
  {
    priority: 1,
    title: 'WPA3 (o WPA2/WPA3 transición)',
    why: 'SAE elimina el ataque offline al 4-way handshake: capturar el handshake ya no sirve para cracar la clave desde casa.',
    how: ['Panel del router → Wireless → Seguridad → WPA3-Personal (SAE)', 'Si hay clientes legacy: WPA2/WPA3 mixto y ve migrando dispositivos', 'En routers viejos sin WPA3: WPA2-AES con passphrase de 16+ aleatorios'],
    effort: 'media hora',
  },
  {
    priority: 2,
    title: 'Passphrase aleatoria de 16+ caracteres',
    why: 'La passphrase es TODO el secreto de la red PSK: rockyou + reglas revienta las humanas. La entropía es tu único colchón.',
    how: ['Genera 4-5 palabras aleatorias sin relación (método diceware) o 16-20 caracteres al azar', 'Nada de nombres, fechas ni "NombreDeLaRed2024!"', 'Guárdala en el gestor de contraseñas, no en una pegatina del router'],
    effort: 'minutos',
  },
  {
    priority: 3,
    title: 'PMF en "required" (802.11w)',
    why: 'Sin PMF, cualquier portátil con aireplay manda deauths y monta un evil twin. Con PMF required, los frames de gestión falsificados se descartan.',
    how: ['Router → Protección de marcos de gestión → Required', 'WPA3 la activa por defecto; en WPA2 puro hay que forzarla', 'Verifica que todos tus clientes siguen conectando (hardware muy antiguo puede fallar)'],
    effort: 'minutos',
  },
  {
    priority: 4,
    title: 'Desactivar WPS',
    why: 'El PIN de WPS se ataca online (reaver/bully) y muchos chips caen a Pixie Dust en segundos, saltándose la passphrase entera.',
    how: ['Router → WPS → Disabled', 'Comprueba también que el botón físico WPS no quede "push button" activo'],
    effort: 'minutos',
  },
  {
    priority: 5,
    title: 'Segmentar: red de invitados + IoT aparte',
    why: 'La TV, las cámaras y los enchufes inteligentes son el eslabón débil: si caen, que no caiga contigo la LAN de trabajo.',
    how: ['Crea la red guest con aislamiento de clientes (client isolation ON)', 'Mueve IoT a VLAN/red aparte sin acceso a la subred principal', 'Regla de firewall: IoT → solo salida a Internet, nada hacia la LAN'],
    effort: 'una tarde',
  },
  {
    priority: 6,
    title: 'Panel de admin: solo LAN + credenciales propias',
    why: 'El admin desde WAN es lo primero que escanea un bot; y admin/admin sigue siendo la pareja ganadora en millones de routers.',
    how: ['Desactiva "remote management"/"acceso WAN" del panel', 'Cambia usuario/contraseña por defecto del router', 'Si necesitas acceso externo: VPN al router (WireGuard) en vez de exponer puertos'],
    effort: 'media hora',
  },
  {
    priority: 7,
    title: 'Firmware actualizado (y router soportado)',
    why: 'Las CVEs de routers SOHO son de lo más explotado que existe; un firmware parcheado cierra la mitad del catálogo.',
    how: ['Busca el modelo exacto → web del fabricante → firmware', 'Activa auto-update si existe; si el router murió en soporte, plantéate OpenWrt', 'Comprueba la EOL del modelo: un router sin soporte es una bomba de relojería'],
    effort: 'media hora',
  },
]

/* ---------- matriz de amenazas ---------- */

export interface ThreatRow {
  threat: string
  icon: string
  target: string
  difficulty: 'trivial' | 'baja' | 'media' | 'alta'
  signal: string
  defense: string
}

export const THREATS: ThreatRow[] = [
  {
    threat: 'Evil twin', icon: '👯', target: 'clientes engañados', difficulty: 'baja',
    signal: 'Tu red aparece con señal "muy fuerte" donde no debería; certificados o avisos SSL raros al navegar',
    defense: 'PMF required + VPN para tráfico sensible + desconfiar de redes con tu SSID cuando la señal real es débil',
  },
  {
    threat: 'Karma / rogue AP', icon: '🎣', target: 'sondeos de dispositivos', difficulty: 'trivial',
    signal: 'Dispositivos conectándose a APs que no conoces; probes con nombres de redes guardadas',
    defense: 'Borrar redes guardadas que no uses (dejan de sondear), PMF, y desactivar "conexión automática" fuera de casa',
  },
  {
    threat: 'Deauth flood', icon: '💥', target: 'disponibilidad', difficulty: 'trivial',
    signal: 'Desconexiones masivas en racha; en el log del AP, deauths con MACs que no están en la red',
    defense: 'PMF required hace que los deauth falsos se ignoren; localizar el origen escaneando el canal con un adaptador en monitor',
  },
  {
    threat: 'Crack offline del handshake', icon: '🔨', target: 'confidencialidad de la PSK', difficulty: 'media',
    signal: 'No hay señal en la red (es offline); tras el ataque, conexiones desde MACs desconocidas',
    defense: 'WPA3-SAE o passphrase 16+ aleatorios: la entropía es la única defensa real',
  },
  {
    threat: 'WPS Pixie Dust', icon: '🧚', target: 'acceso sin passphrase', difficulty: 'trivial',
    signal: 'Ataque online de minutos; no deja rastro en el tráfico, solo en el PIN',
    defense: 'Desactivar WPS por completo en el router',
  },
  {
    threat: 'KRACK', icon: '🧩', target: 'nonce del 4-way handshake', difficulty: 'alta',
    signal: 'Solo relevante en clientes sin parchear de 2017; reinyección de M3',
    defense: 'Firmware del cliente y del router al día: el parche es de 2017 y sigue habiendo IoT sin él',
  },
  {
    threat: 'Dragonblood', icon: '🐉', target: 'implantaciones WPA3 antiguas', difficulty: 'media',
    signal: 'Fuga de información por timings/cache en SAE mal implementado (firmware antiguo con WPA3)',
    defense: 'Firmware reciente (los parches de 2019-2020 lo cerraron); si el router no recibió parche, WPA2 con clave larga es mejor que WPA3 roto',
  },
]
