/* Utilidades de análisis anti-phishing y generación de material de concienciación.
   Todo client-side: cabeceras de email (Received/SPF/DKIM/DMARC), URLs (punycode,
   homoglyphs, acortadores, lookalikes) y plantillas de entrenamiento. */

export interface ReceivedHop {
  from: string
  by: string
  with?: string
  date: string
  raw: string
}

export interface AuthRow { label: string; value: string; verdict: 'ok' | 'warn' | 'bad' | 'none' }

export interface HeaderFinding { sev: 'bad' | 'warn' | 'ok' | 'info'; text: string }

export interface MailHeaderReport {
  subject: string
  from: string
  returnPath: string
  replyTo: string
  to: string
  date: string
  messageId: string
  hops: ReceivedHop[]
  auth: AuthRow[]
  findings: HeaderFinding[]
  score: number // 0 (limpio) - 100 (casi seguro phishing)
}

/* ── parser mínimo de cabeceras RFC 822 ── */
function splitHeaders(raw: string): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  const lines = raw.split(/\r?\n/)
  let cur: { name: string; value: string } | null = null
  for (const line of lines) {
    if (/^[A-Za-z0-9-]+:/.test(line)) {
      if (cur) out.push(cur)
      const idx = line.indexOf(':')
      cur = { name: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
    } else if (cur && /^\s/.test(line)) {
      cur.value += ' ' + line.trim()
    } else if (line.trim() === '') {
      if (cur) out.push(cur)
      cur = null
      break // fin de cabeceras
    }
  }
  if (cur) out.push(cur)
  return out
}

const get = (hs: { name: string; value: string }[], name: string): string =>
  hs.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

const extractEmail = (s: string): string => {
  const m = /<([^>]+)>/.exec(s)
  return (m ? m[1] : s).trim()
}

const domainOf = (email: string): string => email.split('@')[1]?.toLowerCase().replace(/[>\s]/g, '') ?? ''

export function analyzeMailHeaders(raw: string): MailHeaderReport {
  const hs = splitHeaders(raw)
  const findings: HeaderFinding[] = []
  let score = 0

  const subject = get(hs, 'Subject')
  const from = get(hs, 'From')
  const returnPath = get(hs, 'Return-Path')
  const replyTo = get(hs, 'Reply-To')
  const to = get(hs, 'To')
  const date = get(hs, 'Date')
  const messageId = get(hs, 'Message-ID') || get(hs, 'Message-Id')

  // Received chain (de arriba a abajo = del último salto al primero)
  const hops: ReceivedHop[] = hs
    .filter((h) => h.name.toLowerCase() === 'received')
    .map((h) => {
      const fromM = /from\s+([^\s;()]+)/i.exec(h.value)
      const byM = /\bby\s+([^\s;()]+)/i.exec(h.value)
      const withM = /\bwith\s+(\S+)/i.exec(h.value)
      const dM = /;(.*)$/.exec(h.value)
      return { from: fromM?.[1] ?? '?', by: byM?.[1] ?? '?', with: withM?.[1], date: (dM?.[1] ?? '').trim(), raw: h.value.slice(0, 400) }
    })

  const fromDomain = domainOf(extractEmail(from))
  const rpDomain = domainOf(extractEmail(returnPath))
  const replyDomain = replyTo ? domainOf(extractEmail(replyTo)) : ''

  if (fromDomain && rpDomain && fromDomain !== rpDomain) {
    score += 35
    findings.push({ sev: 'bad', text: `Return-Path (${rpDomain}) ≠ From (${fromDomain}): el envelope no coincide con el remitente visible — típico de spoofing directo` })
  }
  if (replyDomain && fromDomain && replyDomain !== fromDomain) {
    score += 25
    findings.push({ sev: 'bad', text: `Reply-To apunta a otro dominio (${replyDomain}): tus respuestas irían al atacante` })
  }

  // SPF / DKIM / DMARC via Authentication-Results
  const ar = hs.filter((h) => h.name.toLowerCase() === 'authentication-results').map((h) => h.value).join(' \n')
  const spfM = /spf\s*=\s*(\w+)/i.exec(ar)
  const dkimM = /dkim\s*=\s*(\w+)/i.exec(ar)
  const dmarcM = /dmarc\s*=\s*(\w+)/i.exec(ar)
  const verdictOf = (v?: string): 'ok' | 'warn' | 'bad' | 'none' =>
    !v ? 'none' : /^(pass)$/i.test(v) ? 'ok' : /^(softfail|neutral|temperror|permerror)$/i.test(v) ? 'warn' : 'bad'
  const auth: AuthRow[] = [
    { label: 'SPF', value: spfM?.[1]?.toLowerCase() ?? 'sin cabecera', verdict: verdictOf(spfM?.[1]) },
    { label: 'DKIM', value: dkimM?.[1]?.toLowerCase() ?? 'sin cabecera', verdict: verdictOf(dkimM?.[1]) },
    { label: 'DMARC', value: dmarcM?.[1]?.toLowerCase() ?? 'sin cabecera', verdict: verdictOf(dmarcM?.[1]) },
  ]
  if (!ar) {
    score += 15
    findings.push({ sev: 'warn', text: 'Sin cabecera Authentication-Results: el correo no pasó (o se eliminó) el filtrado del gateway' })
  } else {
    if (spfM && !/^pass$/i.test(spfM[1])) { score += 20; findings.push({ sev: 'bad', text: `SPF = ${spfM[1]}: el servidor emisor no está autorizado para ${fromDomain || 'el dominio'}` }) }
    if (dkimM && !/^pass$/i.test(dkimM[1])) { score += 15; findings.push({ sev: 'bad', text: `DKIM = ${dkimM[1]}: la firma no valida (contenido o cabeceras manipulados)` }) }
    if (dmarcM && !/^pass$/i.test(dmarcM[1])) { score += 20; findings.push({ sev: 'bad', text: `DMARC = ${dmarcM[1]}: ni SPF ni DKIM alinean con el dominio From` }) }
  }

  // X-Mailer / origen sospechoso
  const mailer = get(hs, 'X-Mailer')
  if (mailer && /php|python|curl|sendmail|powershell|smtp-client|swaks/i.test(mailer)) {
    score += 20
    findings.push({ sev: 'bad', text: `X-Mailer sospechoso: "${mailer}" — enviado con script en vez de MTA legítimo` })
  }

  // hop con TLS ausente
  const noTls = hops.filter((h) => h.with && !/tls|esmtps|https/i.test(h.with))
  if (noTls.length) {
    score += 10
    findings.push({ sev: 'warn', text: `${noTls.length} salto(s) sin TLS ("${noTls[0].with}"): el contenido viajó en claro en ese tramo` })
  }

  // saltos geográficos raros / privado → público incoherente
  if (hops.length === 0) {
    score += 20
    findings.push({ sev: 'bad', text: 'Sin cabeceras Received: mail forjado a mano o recortado' })
  }

  // display name impersonation
  const dnM = /^([^<]+)</.exec(from)
  if (dnM && /ceo|director|dpto|recursos humanos|banca|soporte|seguridad|administrador|factur/i.test(dnM[1]) && !/(bank|banco)/i.test(fromDomain)) {
    score += 10
    findings.push({ sev: 'warn', text: `Nombre visible con autoridad ("${dnM[1].trim()}") — verificación recomendada por otro canal` })
  }

  findings.push({ sev: 'info', text: `Cadena Received: ${hops.length} salto(s). El primero (abajo) es el MTA originario; busca países/proveedores inesperados.` })

  return {
    subject, from, returnPath, replyTo, to, date, messageId,
    hops: hops.reverse(), // origen primero
    auth, findings,
    score: Math.min(100, score),
  }
}

/* ────────────────────────── URLs ────────────────────────── */

const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rb.gy', 'shorturl.at', 'rebrand.ly', 'tiny.cc', 's.id', 'lnkd.in']

export interface UrlFinding { sev: 'bad' | 'warn' | 'ok' | 'info'; text: string }

export interface UrlReport {
  url: string
  scheme: string
  host: string
  punycode: boolean
  unicodeHost: string
  path: string
  usesIp: boolean
  isShortener: boolean
  credentialInUrl: boolean
  longUrlTrap: boolean
  brand: string | null
  findings: UrlFinding[]
  risk: 'alta' | 'media' | 'baja'
}

export const HOMOGLYPHS: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i',
  'ԁ': 'd', 'ɡ': 'g', 'ԛ': 'q', 'ѵ': 'v', 'ј': 'j', 'ո': 'n',
  '０': '0', '１': '1', '３': '3', '５': '5', '６': '6', '８': '8',
  'ⲁ': 'a', 'ⲃ': 'b', 'ⲅ': 'g', 'ⲇ': 'd',
}

const BRANDS = ['paypal', 'google', 'microsoft', 'apple', 'amazon', 'netflix', 'facebook', 'instagram', 'whatsapp', 'bbva', 'santander', 'caixabank', 'ing', 'revolut', 'binance', 'coinbase', 'steam', 'spotify', 'dhl', 'fedex', 'correos', 'outlook', 'office365', 'login', 'secure', 'linkedin']

export function analyzeUrl(input: string): UrlReport | null {
  const raw = input.trim()
  if (!raw) return null
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`
  let u: URL
  try { u = new URL(withProto) } catch { return null }

  const host = u.hostname
  const findings: UrlFinding[] = []
  let bad = 0, warn = 0

  let punycode = false
  let unicodeHost = host
  try {
    unicodeHost = new URL(`http://${host}`).hostname // normaliza
    if (/^xn--|\.xn--/.test(host)) {
      punycode = true
      try { unicodeHost = host.replace(/xn--([a-z0-9-]+)/gi, (m) => { try { return new URL(`http://${m}`).hostname } catch { return m } }) } catch { /* noop */ }
      findings.push({ sev: 'bad', text: `Host en punycode (${host}) → unicode: "${unicodeHost}". Verifica cada carácter: puede imitar tu dominio` })
      bad++
    }
  } catch { /* noop */ }

  const nonAscii = [...host].some((c) => c.charCodeAt(0) > 127)
  if (nonAscii) {
    findings.push({ sev: 'bad', text: 'El host contiene caracteres Unicode no ASCII: homoglyph attack (cyrílico/latin se ven igual)' })
    bad++
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    findings.push({ sev: 'warn', text: 'La URL usa una IP directa en vez de dominio: típico de infraestructura desechable' })
    warn++
  }
  if (u.username || u.password) {
    findings.push({ sev: 'bad', text: `Credenciales en la URL (${u.username}@…): todo lo anterior a @ es decorado, el host real es ${host}` })
    bad++
  }
  if (SHORTENERS.includes(host.toLowerCase())) {
    findings.push({ sev: 'warn', text: 'Acortador de URLs: destino oculto, expándelo antes de confiar' })
    warn++
  }
  if (raw.length > 120 && !SHORTENERS.includes(host)) {
    findings.push({ sev: 'info', text: 'URL inusualmente larga: a veces esconde el dominio real en la parte del path/query' })
  }

  const hostNoTld = host.replace(/\.[a-z.]{2,}$/i, '')
  const brand = BRANDS.find((b) => hostNoTld.toLowerCase().includes(b))
  if (brand) {
    const tld = host.split('.').slice(-2).join('.')
    let brandOwn = false
    try { brandOwn = new RegExp(`^(?:[a-z0-9-]+\\.)*${brand}\\.(com|es|net|org|io|co|de|fr|pt|it)$`, 'i').test(tld) } catch { /* noop */ }
    if (!brandOwn) {
      findings.push({ sev: 'warn', text: `Contiene la marca "${brand}" pero el dominio base es ${host}: lookalike/typosquatting` })
      warn++
    }
  }
  if (/login|verify|secure|account|update|confirm|invoice|banca|seguridad/i.test(u.pathname + u.search)) {
    findings.push({ sev: 'warn', text: 'El path menciona login/verify/secure: presión social típica de phishing' })
    warn++
  }
  if (u.protocol === 'http:') {
    findings.push({ sev: 'warn', text: 'HTTP sin TLS: cualquiera en la red ve y modifica el contenido' })
    warn++
  }

  const risk = bad >= 2 || (bad === 1 && warn >= 1) ? 'alta' : bad === 1 || warn >= 2 ? 'media' : warn === 1 ? 'media' : 'baja'
  if (!findings.length) findings.push({ sev: 'ok', text: 'Sin indicadores automáticos: revisa igualmente el dominio carácter a carácter' })
  return {
    url: raw, scheme: u.protocol.replace(':', ''), host, punycode, unicodeHost,
    path: u.pathname + u.search, usesIp: /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':'),
    isShortener: SHORTENERS.includes(host.toLowerCase()),
    credentialInUrl: !!(u.username || u.password),
    longUrlTrap: raw.length > 120, brand: brand ?? null,
    findings, risk,
  }
}

/* plantillas de entrenamiento */
export interface PhishTemplate { id: string; name: string; subject: string; pretext: string; cta: string; technique: string }

export const PHISH_TEMPLATES: PhishTemplate[] = [
  {
    id: 'ceo', name: 'CEO fraud (BEC)', technique: 'Business Email Compromise · suplantación de autoridad',
    subject: 'Pago urgente — confidencial',
    pretext: 'Estoy en una reunión y no puedo llamar. Necesito que proceses una transferencia hoy antes de las 16:00. Te lo confirma legal en un email aparte.',
    cta: 'Responder al correo del "CEO" con la confirmación',
  },
  {
    id: 'reinicio', name: 'Credenciales Office365', technique: 'Captcha-landing doble para evadir sandboxes',
    subject: 'Su contraseña de correo expira hoy',
    pretext: 'Su buzón dejará de recibir mensajes a las 18:00. Mantenga su cuenta activa iniciando sesión con sus credenciales corporativas.',
    cta: 'Botón "Mantener contraseña" → landing falsa de login',
  },
  {
    id: 'dhl', name: 'Paquete retenido', technique: 'Ingeniería social de urgencia + entrega',
    subject: 'DHL: paquete retenido en aduana',
    pretext: 'Su envío DH882-KQ9L está retenido. Un importe de 1,45€ de gestión debe abonarse para reanudar la entrega (plazo 24h).',
    cta: 'Pago con tarjeta en página clonada del operador',
  },
  {
    id: 'qr', name: 'Quishing (QR en PDF)', technique: 'El QR evade los filtros de URLs del email',
    subject: 'Factura 2026-114 adjunta',
    pretext: 'Adjuntamos su factura con un QR para descarga del PDF firmado. El enlace directo no se incluye por seguridad.',
    cta: 'Escanear QR con el móvil (fuera de la red corporativa)',
  },
  {
    id: 'soporte', name: 'Soporte TI interno', technique: 'Pretexting con identidad de helpdesk',
    subject: '[Mesa de ayuda] Validación de sesión #77314',
    pretext: 'Detectamos un acceso anómalo en su equipo. Confirme su usuario y el código MSA recibido en el portal de validación interna.',
    cta: 'Entrega del segundo factor al atacante (MFA fatigue/relay)',
  },
]

export function buildPhishEmail(t: PhishTemplate, domain: string, trackingId: string): string {
  return `De: "Mesa de Ayuda TI" <soporte.ti@${domain}>
Para: empleado.ejemplo@empresa.com
Asunto: ${t.subject}
X-Mailer: HackNexus Phishing Simulator (formación interna)
List-Unsubscribe: <mailto:unsubscribe@${domain}>

${t.pretext}

  ▶ ${t.cta}

  [ Landing: https://${domain}/login?sid=${trackingId} ]
  [ Tracking pixel simulado: https://${domain}/px/${trackingId}.png ]
  [ Cualquier interacción con esta plantilla se registra SOLO en tu navegador ]
`
}

export function buildLandingHtml(t: PhishTemplate, brand: string, trackingId: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${brand} — Validación de sesión</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { --bg:#0b0f0d; --panel:#101815; --edge:#1d2a23; --ok:#2ee88a; --txt:#e5f2ea; --grey:#7d9488; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:ui-monospace,monospace; background:var(--bg); color:var(--txt);
         display:grid; place-items:center; min-height:100vh; }
  .card { background:var(--panel); border:1px solid var(--edge); border-radius:14px; padding:2.2rem; width:min(420px,92vw); }
  h1 { font-size:1.05rem; letter-spacing:.06em; margin:0 0 .3rem; }
  p.sub { color:var(--grey); font-size:.78rem; margin:0 0 1.4rem; }
  label { display:block; font-size:.7rem; color:var(--grey); margin:.8rem 0 .3rem; text-transform:uppercase; }
  input { width:100%; padding:.7rem .8rem; border-radius:8px; border:1px solid var(--edge);
          background:#050807; color:var(--txt); font:inherit; }
  button { margin-top:1.4rem; width:100%; padding:.8rem; border:0; border-radius:8px;
           background:var(--ok); color:#04140b; font-weight:700; cursor:pointer; }
  .banner { border:1px dashed var(--ok); border-radius:8px; padding:.7rem .9rem; margin-bottom:1.2rem;
            font-size:.72rem; color:var(--ok); }
  .foot { margin-top:1.2rem; font-size:.66rem; color:var(--grey); text-align:center; }
</style>
</head>
<body>
  <div class="card">
    <div class="banner">⚠ PÁGINA DE ENTRENAMIENTO — simulacro de phishing interno de ${brand}. No introduzcas credenciales reales.</div>
    <h1>VALIDACIÓN DE SESIÓN</h1>
    <p class="sub">Técnica simulada: ${t.technique}</p>
    <form onsubmit="event.preventDefault();this.out.value='✔ registrado en tu simulacro local (id ${trackingId})'">
      <label>usuario corporativo</label>
      <input autocomplete="off" placeholder="nombre.apellido" />
      <label>contraseña</label>
      <input type="password" autocomplete="new-password" placeholder="••••••••" />
      <button>Validar sesión</button>
      <output name="out" style="display:block;margin-top:.8rem;font-size:.72rem;color:var(--ok)"></output>
    </form>
    <p class="foot">Página generada localmente por HackNexus · id ${trackingId} · no se envía ningún dato</p>
  </div>
</body>
</html>`
}
