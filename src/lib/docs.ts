/* Documentación detallada de cada herramienta de HackNexus.
   Cada entrada documenta: qué hace, parámetros/entradas, usos del día a día,
   usos en hacking ético y tips/avisos. 100% offline, sin dependencias. */

export interface DocParam {
  name: string
  type: string
  required?: boolean
  desc: string
}

export interface ToolDoc {
  what: string
  params: DocParam[]
  daily: string[]
  ethical: string[]
  tips: string[]
}

export const DOCS: Record<string, ToolDoc> = {
  /* ── Criptografía ── */
  hash: {
    what: 'Calcula hashes simultáneamente en 9+ algoritmos (MD5, SHA-1, SHA-256/384/512, SHA3-512, RIPEMD-160, CRC32, NTLM y HMAC con clave). Acepta texto pegado o ficheros locales mediante arrastre, y todo se calcula con WebCrypto en tu navegador.',
    params: [
      { name: 'texto / fichero', type: 'string | File', required: true, desc: 'entrada a hashear; los ficheros se leen con FileReader y nunca se suben' },
      { name: 'clave HMAC', type: 'string', desc: 'si la rellenas, se calcula HMAC-SHA256 además de los hashes simples' },
    ],
    daily: ['Verificar la integridad de una ISO descargada comparando el SHA-256 del fabricante', 'Detectar duplicados en un repositorio comparando CRC32/MD5 en lote', 'Generar checksums para publicar junto a tus releases en GitHub'],
    ethical: ['Confirmar que el binario de un payload (impacket, chisel…) no fue manipulado en tránsito comparando el hash con el original', 'En forense: hashes MD5/SHA-256 de la evidencia para preservar la cadena de custodia', 'NTLM te permite comparar hashes extraídos de SAM/NTDS con los de contraseñas candidatas'],
    tips: ['MD5 y SHA-1 NO sirven para seguridad moderna: úsalos solo por compatibilidad o integridad no adversarial', 'Para comparar ficheros grandes, el hash se calcula por trozos: no bloquea el navegador', 'HMAC ≠ hash: con clave, demuestra autenticidad además de integridad'],
  },
  cracker: {
    what: 'Cracking de hashes en un Web Worker con estadísticas en vivo (h/s, progreso, ETA). Descarga y parsea rockyou.txt (14M+ contraseñas) en tu navegador, aplica reglas básicas y soporta MD5, SHA-1, SHA-256, SHA-512 y NTLM.',
    params: [
      { name: 'hash(es)', type: 'string[]', required: true, desc: 'uno por línea; se detecta el formato por longitud y caracteres' },
      { name: 'algoritmo', type: 'md5 | sha1 | sha256 | sha512 | ntlm', desc: 'fuerza el algoritmo; por defecto se autodetecta' },
      { name: 'wordlist', type: 'rockyou | personalizada', desc: 'rockyou integrada (cacheada tras la primera descarga) o sube la tuya' },
      { name: 'reglas', type: 'toggle', desc: 'mutaciones típicas: capitalizar, añadir dígitos, sufijos de año' },
    ],
    daily: ['Recuperar la contraseña de un fichero propio cuyo hash aún tienes', 'Auditar qué contraseñas de un dump de TEST (propio) aparecen en rockyou'],
    ethical: ['Demostrar en formación por qué "password123" cae en milisegundos y cómo una passphrase larga resiste', 'En auditorías autorizadas: crackers de hashes NTLM obtenidos de un servidor comprometido (con permiso escrito)', 'Comparar tasas de crackeo para justificar políticas de contraseñas y MFA en tu informe'],
    tips: ['El worker mantiene la UI fluida: puedes seguir usando otras tools mientras crackea', 'Con GPU real (hashcat) serías 100-1000× más rápido: esto es la referencia "navegador sin GPU"', 'La primera carga de rockyou tarda unos segundos; después queda cacheada', 'Úsalo SOLO con hashes propios o de entornos donde tengas autorización expresa'],
  },
  hashid: {
    what: 'Identifica el formato probable de un hash desconocido a partir de su longitud, charset y estructura, y sugiere el modo de hashcat (-m) y el formato de John (--format) para atacarlo con la herramienta adecuada.',
    params: [
      { name: 'hash', type: 'string', required: true, desc: 'el hash desconocido; acepta formatos con prefijo ($2y$, $6$, $NT$, ldap://{SHA}…)' },
    ],
    daily: ['Reconocer qué algoritmo usa una base de datos heredada antes de migrar usuarios', 'Distinguir entre MD5 crudo y MD5 de WordPress/phpBB (con salt)'],
    ethical: ['Paso previo obligatorio al cracking: elegir el modo hashcat correcto evita horas perdidas', 'Identificar bcrypt/argon2 en un target y decidir que NO es viable crackers por fuerza bruta (buena noticia para el cliente)'],
    tips: ['Un mismo hash puede tener varias candidatas: la longitud 32 puede ser MD5, NTLM, MD4 o half-SHA… el contexto manda', 'Si tiene "$" y estructura $algo$salt$hash es formato Unix modular (shadow)', 'Los hashes de 60 chars que empiezan por $2 son bcrypt: 12 rondas por defecto = muy lento de crackear'],
  },
  aes: {
    what: 'Cifra y descifra con AES-CBC y AES-GCM (256 bits) usando WebCrypto nativo, con derivación de clave PBKDF2 (100k iteraciones, SHA-256) desde una contraseña. GCM incluye autenticación (detecta manipulación), CBC genera IV aleatorio por mensaje.',
    params: [
      { name: 'texto', type: 'string', required: true, desc: 'mensaje en claro (al cifrar) o ciphertext en base64 (al descifrar)' },
      { name: 'contraseña', type: 'string', required: true, desc: 'se deriva a clave AES-256 con PBKDF2 + salt aleatorio' },
      { name: 'modo', type: 'GCM | CBC', desc: 'GCM recomendado (AEAD); CBC solo por compatibilidad con sistemas antiguos' },
      { name: 'sal / iv', type: 'string (base64)', desc: 'generados automáticamente al cifrar; necesarios para descifrar' },
      { name: 'iteraciones PBKDF2', type: 'number', desc: 'por defecto 100000; más iteraciones = más lento pero más resistencia a brute force' },
    ],
    daily: ['Intercambiar notas sensibles por chat: cifra, envía el bloque base64 y comparte la contraseña por otro canal', 'Guardar secrets en ficheros de repos (con contraseña fuerte y fuera del repo la contraseña)'],
    ethical: ['Ejercicios de criptografía: demostrar por qué CBC sin MAC es vulnerable a bit-flipping y GCM no', 'En CTFs: descifrar blobs AES cuando se filtran salt/iv y la contraseña es débil', 'Probar la entropía del output: un ciphertext AES correcto es indistinguible de aleatorio'],
    tips: ['Nunca reutilices un IV/nonce con la misma clave en GCM: rompe la seguridad completamente', 'El descifrado falla con error si la contraseña es incorrecta (GCM verifica el tag de autenticación)', 'Los resultados incluyen salt+iv en el output: guárdalos juntos o no podrás descifrar después'],
  },
  jwt: {
    what: 'JWT Toolkit completo: decodifica header/payload/firma, verifica firmas HS256/384/512 con comparación en tiempo constante, detecta secrets débiles integrados, genera tokens sin firma (alg=none) para demostrar la vulnerabilidad clásica, crackea el secret de tokens HS* con diccionarios subidos por el usuario (SHA-2 nativo, millones de intentos/minuto) y firma tokens propios.',
    params: [
      { name: 'token', type: 'string (JWT)', required: true, desc: 'header.payload.signature; acepta tokens sin firma también' },
      { name: 'secret', type: 'string', desc: 'clave HMAC para verificar o firmar; se usa también como campo del editor' },
      { name: 'header/payload JSON', type: 'string', desc: 'para firmar tokens propios; incluye chips de exp+1h, expirado y role=admin' },
      { name: 'algoritmo', type: 'HS256 | HS384 | HS512 | none', desc: 'none genera token sin firma (ataque de libración de algoritmo)' },
      { name: 'diccionario', type: 'File (.txt)', desc: 'para el cracker: una candidata de secret por línea (rockyou, listas de secrets…)' },
    ],
    daily: ['Depurar por qué tu API rechaza un token: mira exp, iat, nbf en formato humano y el algoritmo real del header', 'Verificar localmente que el cambio de payload de un token rompe la firma (integridad funciona)', 'Generar tokens de prueba con exp cortos para tests de refresco de sesión'],
    ethical: ['Prueba alg=none: si el servidor acepta un token sin firma, tienes suplantación total de usuario (cambia role a admin)', 'Crackeo del secret HS con diccionario: si el secret es "secret" o "password", cualquiera firma tokens válidos', 'Confusión de algoritmo: firmar con HS256 cuando el backend espera RS256 usando la clave pública como secret (demo conceptual)', 'En informes: evidencia el impacto mostrando un token forjado válido contra un endpoint de test'],
    tips: ['El cracker usa SHA-2 implementado en JS puro: HS256 rinde más de 1M secretos/s en un portátil moderno', 'El cracker compara firma calculada vs esperada en tiempo constante y para al encontrar el secret', 'Si la firma tiene longitud distinta (RS256 vs HS256) la verificación HMAC la rechaza antes de calcular', 'Token HS512 con secret débil es igual de rompible que HS256: el algoritmo no salva un secret flojo'],
  },
  totp: {
    what: 'Generador de códigos TOTP (RFC 6238) en vivo, igual que Google Authenticator: introduce el secret base32 y muestra el código de 6 dígitos con countdown animado del periodo de 30s. Calcula también el otpauth:// URI y su QR para registrar la cuenta en tu móvil.',
    params: [
      { name: 'secret base32', type: 'string', required: true, desc: 'la clave que te da el servicio al activar 2FA (A-Z2-7, sin espacios)' },
      { name: 'digits', type: '6 | 8', desc: 'longitud del código; 6 es el estándar' },
      { name: 'period', type: '30 | 60 s', desc: 'ventana de validez; 30s por defecto' },
      { name: 'algoritmo', type: 'SHA1 | SHA256 | SHA512', desc: 'SHA1 es el que usan casi todos los servicios reales' },
      { name: 'account/issuer', type: 'string', desc: 'etiquetas para el otpauth:// URI y el QR' },
    ],
    daily: ['Tener tus códigos 2FA sin depender del móvil: pega el secret y genera el código al instante', 'Verificar que el secret que configuraste en tu servidor produce los mismos códigos que tu app'],
    ethical: ['En pentesting autorizado: validar que el 2FA de un entorno de test funciona como se espera tras un reset de secret', 'Demostrar en formación por qué el secret base32 filtrado = 2FA comprometido (el código se genera sin el dispositivo)', 'Documentar en un informe la ausencia de 2FA comparando flujos con y sin TOTP'],
    tips: ['El código se calcula 100% local con WebCrypto HMAC: nada sale de tu navegador', 'Si el código falla, revisa reloj: una desviación >30s produce códigos de la ventana anterior', 'El QR del otpauth:// se genera en local con la librería qrcode: perfecto para escanear con tu authenticator'],
  },
  hackingchef: {
    what: 'Port de CyberChef orientado a hacking: encadena operaciones (codificaciones, cifrados, hashes, transformaciones) en recetas donde la salida de cada paso alimenta al siguiente, con resultado en vivo mientras escribes.',
    params: [
      { name: 'entrada', type: 'string', required: true, desc: 'texto, base64, hex… lo que quieras transformar' },
      { name: 'receta', type: 'operación[]', required: true, desc: 'lista ordenada de operaciones (From Base64, ROT13, XOR, URL Decode…)' },
      { name: 'argumentos por operación', type: 'varios', desc: 'cada op tiene sus parámetros: clave XOR, charset, delimitador…' },
    ],
    daily: ['Decodificar esa cadena rara de un log: base64 → gzip → JSON en tres clicks', 'Preparar payloads con capas: URL-encode + base64 para inyecciones anidadas'],
    ethical: ['Resolver retos de CTF de cripto/forense encadenando decodificaciones', 'Analizar obfuscación de malware: base64 + XOR + gzip es el patrón clásico de loaders', 'Generar el payload exacto para probar un WAF con capas de encoding'],
    tips: ['El orden importa: From Base64 antes de Gunzip, no al revés', 'Si el output parece basura, prueba añadir "Remove whitespace" o cambiar el delimitador', 'La receta se ve como pipeline: puedes desactivar un paso sin borrarlo para comparar'],
  },

  /* ── Codificación ── */
  encoders: {
    what: 'Codifica y decodifica simultáneamente en más de 15 formatos: Base16/32/58/62/64/85, hex, binario, octal, morse, URL, HTML entities, Unicode escapes y más. La tabla se actualiza en vivo con cada pulsación.',
    params: [
      { name: 'entrada', type: 'string', required: true, desc: 'texto a codificar, o código en cualquier formato para decodificar' },
      { name: 'formato', type: 'base64 | hex | url | …', desc: 'clic en cualquier fila para copiar ese encoding' },
    ],
    daily: ['Codificar credenciales para Basic Auth (base64 user:pass) sin instalar nada', 'Convertir a URL-safe un parámetro que contiene espacios y símbolos'],
    ethical: ['Decodificar payloads de ataques reales en logs: los WAF registran URL-encoded o base64', 'Ofuscación de payloads para probar filtros: codificar "union select" de 3 formas distintas', 'Analizar exfiltración DNS: datos en base32 dentro de subdominios'],
    tips: ['Base64 estándar vs URL-safe: difieren en +/ vs -_ — elige según dónde vaya incrustado', 'El doble encoding (base64 de base64) es común en exploits: pasa el output otra vez por la tool', 'Morse y binary son útiles en CTFs clásicos, no en sistemas reales'],
  },
  emoji: {
    what: 'Codifica mensajes dentro de emojis (1 emoji = varios bits) o texto invisible con caracteres zero-width (ZWSP, ZWNJ, ZWJ). El resultado parece texto normal o una fila de emojis, pero contiene datos binarios.',
    params: [
      { name: 'mensaje', type: 'string', required: true, desc: 'el texto secreto a ocultar' },
      { name: 'portador', type: 'string', desc: 'texto "cover" donde incrustar los zero-width (opcional)' },
      { name: 'modo', type: 'emoji | zero-width', desc: 'emoji = visible pero inocente; zero-width = totalmente invisible' },
    ],
    daily: ['Firmar mensajes: incrusta tu identificador invisible en documentos que compartes (watermarking)', 'Traspasar datos por canales donde solo se permite texto "normal"'],
    ethical: ['Demostrar en formación la exfiltración por canales encubiertos en texto plano (prevención: scrub de zero-width en gateways)', 'CTFs de esteganografía textual: extraer payloads zero-width de "strings" sospechosos', 'Watermarking de documentos para rastrear filtraciones (cada copia lleva un ID invisible)'],
    tips: ['Los zero-width sobreviven a copiar/pegar pero NO a some normalizaciones Unicode o a reescritura del texto', 'Detecta mensajes con zero-width pegándolos aquí: si decodifica algo, había datos ocultos', 'El modo emoji es más robusto (sobrevive a más transformaciones) pero visible'],
  },
  classics: {
    what: 'Cifrados clásicos con criptoanálisis automático: César/ROT13/ROT47 con vista de todas las rotaciones a la vez, Vigenère con análisis de clave por frecuencia, Atbash y XOR con clave repetida. Incluye análisis de frecuencias del texto y detección de idioma.',
    params: [
      { name: 'texto', type: 'string', required: true, desc: 'ciphertext a analizar o plaintext a cifrar' },
      { name: 'clave', type: 'string | número', desc: 'desplazamiento (César) o palabra clave (Vigenère/XOR)' },
      { name: 'cifrado', type: 'césar | vigenère | atbash | xor | rot47', desc: 'el algoritmo a aplicar' },
    ],
    daily: ['Decodificar ROT13 en foros/changelogs (spoilers, spoilers de puzzle)', 'Resolver puzzles de periódicos y juegos de mesa con César/Atbash'],
    ethical: ['CTFs: el 80% de los retos "crypto fáciles" son César, Vigenère o XOR', 'Demostrar en formación por qué la seguridad por oscuridad falla: rompe Vigenère por frecuencia en segundos', 'Análisis forense de malware antiguo que usa XOR con clave repetida (xor con keylen detectable por índice de coincidencia)'],
    tips: ['En Vigenère, la longitud de clave se estima por el índice de coincidencia: pruébalo antes de fuerza bruta', 'XOR con clave corta repetida: busca repeticiones en el ciphertext para estimar la clave', 'ROT47 rota también símbolos y dígitos (ASCII 33-126), no solo letras'],
  },

  /* ── Contraseñas ── */
  passgen: {
    what: 'Generador de contraseñas criptográficamente seguras con crypto.getRandomValues: longitud configurable, inclusiones por tipo de carácter, exclusión de ambiguos (0/O, 1/l/I), frases de paso con listas de palabras, PINs numéricos y análisis de fortaleza en vivo (entropía y tiempo de crackeo estimado).',
    params: [
      { name: 'longitud', type: 'number', desc: '8-128 caracteres; 16+ recomendado para contraseñas, 20+ para secrets' },
      { name: 'conjuntos', type: 'toggles', desc: 'mayúsculas, minúsculas, dígitos, símbolos, y exclusiones de ambiguos' },
      { name: 'modo', type: 'password | passphrase | pin', desc: 'passphrase: 3-8 palabras aleatorias estilo diceware; pin: 4-12 dígitos' },
      { name: 'cantidad', type: 'number', desc: 'genera varias de golpe (para provisionar usuarios en lote)' },
    ],
    daily: ['Crear contraseñas para nuevos servicios y cuentas de administrador', 'Generar secrets de API y tokens de provisionamiento con longitud criptográfica', 'Frases de paso memorables para el gestor de contraseñas maestro'],
    ethical: ['Generar contraseñas de lab/entornos de test que no sean adivinables por rockyou', 'Provisionar usuarios en ejercicios de formación con credenciales únicas por alumno', 'Demostrar cómo la longitud importa más que la complejidad: comparar entropía de "P@ssw0rd!" vs una passphrase de 5 palabras'],
    tips: ['Cada carácter extra de entropía aleatoria multiplica el espacio de búsqueda: 16 chars aleatorios > 8 chars "complejos"', 'La entropía mostrada es matemática (log2 del espacio): el crackeo real depende del algoritmo de hashing del objetivo', 'Genera en lote y usa la exportación para provisionar cuentas de un tirón'],
  },
  passaudit: {
    what: 'Auditor de fortaleza con zxcvbn (el estimador de Dropbox que modela patrones humanos): puntuación 0-4, tiempo estimado de crackeo por escenario (online throttled, offline slow hash, offline fast), y comprobación de filtraciones vía k-anonymity contra la API de HaveIBeenPwned (solo se envían 5 caracteres del SHA-1, nunca la contraseña).',
    params: [
      { name: 'contraseña', type: 'string', required: true, desc: 'la candidata a evaluar; se procesa localmente' },
      { name: 'comprobar filtración', type: 'toggle', desc: 'consulta HIBP con k-anonymity (prefijo de 5 hex del SHA-1)' },
    ],
    daily: ['Auditar tus propias contraseñas antes de confiar en ellas', 'Validar la política de contraseñas corporativa con ejemplos reales'],
    ethical: ['En informes: evidenciar que "Compaños2024!" cae en 3 días offline aunque cumpla la política de complejidad', 'Formación: mostrar cómo zxcvbn penaliza patrones de teclado, fechas y palabras de diccionario', 'Auditar un dump propio (con autorización) cruzando con HIBP para cuantificar exposición'],
    tips: ['zxcvbn entiende leetspeak y sustituciones: "P@ssw0rd" es tan débil como "password" para él', 'El k-anonymity de HIBP es privacidad por diseño: el servidor nunca ve tu contraseña completa', 'El tiempo de crackeo offline (fast hash, GPU) es el escenario pesimista: es el que debes mirar'],
  },

  /* ── Web & payloads ── */
  revshells: {
    what: 'Generador de reverse shells multiplataforma: elige lenguaje (bash, python, php, perl, powershell, nc, ruby, java…), introduce tu IP y puerto, y obtén el one-liner listo para pegar, junto con el listener recomendado y varios métodos de upgrade a TTY completo.',
    params: [
      { name: 'LHOST', type: 'IP', required: true, desc: 'tu IP atacante (la que recibirá la conexión)' },
      { name: 'LPORT', type: 'puerto', required: true, desc: 'puerto de escucha (4444, 9001…)' },
      { name: 'shell', type: 'bash | python | php | …', desc: 'el binario/interpreter disponible en el objetivo' },
      { name: 'encoding', type: 'none | base64 | url', desc: 'para evadir filtros básicos o incrustar en URLs' },
    ],
    daily: ['No aplica mucho al día a día: es una tool de ofensiva/CTF'],
    ethical: ['CTFs y labs (HackTheBox, TryHackMe): obtener shell interactiva tras explotar un servicio autorizado', 'Red teams con permiso: demostrar el impacto de un RCE con acceso interactivo', 'Formación: comparar qué shells funcionan según el objetivo (busybox nc sin -e, python disponible, etc.)'],
    tips: ['Siempre prueba el upgrade a TTY: python pty.spawn + stty raw -echo cambia una shell ciega por una cómoda', 'PowerShell encoded command evita problemas de comillas en Windows', 'El listener está en la sección inferior: rlwrap nc -lvnp PORT te da historial y autocompletado'],
  },
  phpdetector: {
    what: 'Escáner estático de código PHP: detecta funciones peligrosas (exec, system, eval, shell_exec, passthru, proc_open, unserialize, include con input…), analiza la directiva disable_functions del php.ini objetivo y marca por severidad qué vectores de ejecución están disponibles.',
    params: [
      { name: 'código PHP', type: 'string (paste o fichero)', required: true, desc: 'el fuente a analizar' },
      { name: 'disable_functions', type: 'string (valor de php.ini)', desc: 'para contrastar qué funciones peligrosas siguen activas en el target' },
    ],
    daily: ['Auditar tu propio código antes de desplegar: ¿hay algún exec con input de usuario?', 'Revisar plugins/temas de WordPress de terceros antes de instalarlos'],
    ethical: ['En auditorías con acceso al código: priorizar funciones de ejecución alcanzables desde input HTTP', 'Combinar con disable_functions del target: si system está deshabilitado pero proc_open no, tienes vector', 'Informes: listar hallazgos por severidad con la línea exacta del código'],
    tips: ['La presencia de una función peligrosa no es vulnerabilidad: mira si hay input de usuario llegando hasta ella', 'unserialize + input de usuario = busca POP chains (phpggc)', 'Los includes con paths variables (include $_GET[page]) son LFI/RFI directos'],
  },
  sqlgen: {
    what: 'Generador de SQL y datos fake: crea sentencias CREATE TABLE/INSERT desde una definición visual, exporta CSV de datos ficticios realistas (nombres, emails, IPs…) y produce diagramas entidad-relación en Mermaid para documentar el modelo.',
    params: [
      { name: 'tabla / campos', type: 'definición visual', required: true, desc: 'nombre de tabla, columnas, tipos y constraints' },
      { name: 'nº de filas fake', type: 'number', desc: 'cuántos INSERT/CSV generar' },
      { name: 'motor', type: 'mysql | postgres | sqlite', desc: 'afecta al dialecto del SQL generado' },
    ],
    daily: ['Poblar bases de datos de desarrollo/staging con datos creíbles (no "test test test")', 'Documentar esquemas existentes generando el diagrama Mermaid desde las tablas'],
    ethical: ['Generar datasets realistas para entornos de formación de SQLi sin usar datos reales de clientes', 'En labs: crear la base de datos vulnerable con estructura idéntica a la del cliente (sin sus datos)', 'Probar explotación de SQLi en local antes de hacerlo en el target autorizado'],
    tips: ['El CSV generado también sirve para probar cargas masivas y validar constraints', 'Mermaid se pega directo en GitHub READMEs y wikis: documentación gratis', 'Los datos fake respetan tipos y formatos (emails válidos, DNI consistente…)'],
  },
  payloads: {
    what: 'Arsenal de payloads copiables organizado por vector: SQLi por motor (MySQL, PostgreSQL, MSSQL, Oracle, SQLite), XSS con técnicas de evasión de WAF, SSRF con esquemas alternativos (gopher, dict, file), LFI con wrappers de PHP y listas de fuzzing (directories, parameters, headers).',
    params: [
      { name: 'vector', type: 'sqli | xss | ssrf | lfi | fuzzing', required: true, desc: 'la categoría de payloads' },
      { name: 'motor/contexto', type: 'sub-selección', desc: 'p.ej. motor de BD para SQLi, o contexto HTML/atributo/JS para XSS' },
      { name: 'copia rápida', type: 'click', desc: 'cada payload se copia con un clic al portapapeles' },
    ],
    daily: ['Referencia rápida cuando escribes tests de seguridad o unit tests con casos maliciosos'],
    ethical: ['CTFs y auditorías autorizadas: tener a mano los payloads clásicos sin buscar en internet', 'Probar el WAF de tu propia app: ¿bloquea la evasión clásica de XSS con mayúsculas alternadas y comentarios?', 'Formación: explicar cada payload con el ejemplo visible en pantalla'],
    tips: ['En SQLi, primero detecta el motor con payloads específicos (version(), @@version, banner)', 'SSRF con gopher:// permite HTTP/SMTP crudo: es la evasión más potente cuando está disponible', 'Para LFI con PHP: data:// y php://filter/convert.base64-encode extraen código fuente'],
  },
  httpheader: {
    what: 'Constructor de peticiones HTTP crudas: método, URL, headers (con presets de auth, cookies, content-type), body y parámetros de query. Muestra la petición exacta que se enviaría y genera el comando curl equivalente listo para copiar.',
    params: [
      { name: 'método', type: 'GET | POST | PUT | PATCH | DELETE | …', required: true, desc: 'verbo HTTP' },
      { name: 'URL', type: 'string', required: true, desc: 'con esquema; los query params se editan en tabla' },
      { name: 'headers', type: 'pares clave-valor', desc: 'con presets: Bearer token, Basic auth, cookies, User-Agent custom' },
      { name: 'body', type: 'string', desc: 'con selectores de content-type (json, form, multipart, xml)' },
    ],
    daily: ['Preparar la petición exacta para replicar en Postman/curl desde la documentación', 'Depurar APIs: ver exactamente qué headers envía tu frontend'],
    ethical: ['Repetir peticiones de un Burp interceptado modificando cookies/tokens para probar el control de acceso', 'Forjar peticiones con headers X-Forwarded-For o Host inesperados para probar lógica de trust', 'Probar IDOR: cambiar el ID del path/body manteniendo el resto idéntico'],
    tips: ['El curl generado usa -i para ver headers de respuesta y --data con el body correcto', 'Cuidado con Content-Length si editas el body a mano: el curl lo recalcula por ti', 'Los presets de auth evitan errores tipográficos en Bearer/Basic'],
  },
  webfuzzer: {
    what: 'Fuzzer de rutas y parámetros web con concurrencia configurable: lanza peticiones desde tu navegador contra un objetivo, marca códigos de estado, longitud de respuesta y tiempo, y permite filtrar/comparar respuestas para encontrar contenido oculto (directorios, backups, parámetros ocultos).',
    params: [
      { name: 'URL base', type: 'string', required: true, desc: 'usa FUZZ como marcador de posición donde sustituir cada candidata' },
      { name: 'wordlist', type: 'string[] (paste o fichero)', required: true, desc: 'una candidata por línea (dirb, seclists…)' },
      { name: 'concurrencia', type: 'number', desc: 'peticiones simultáneas (5-50); más = más rápido pero más ruido' },
      { name: 'filtros', type: 'status | length | regex', desc: 'oculta respuestas que no te interesan (404s, tamaño estándar…)' },
    ],
    daily: ['Verificar que los entornos de staging no exponen rutas de admin/debug'],
    ethical: ['En auditorías autorizadas: descubrir rutas ocultas (/backup.zip, /admin, /.git/)', 'Fuzzear parámetros: encontrar ?debug=1 o ?admin=true que revelan info', 'SIEMPRE con autorización explícita: el fuzzing genera mucho ruido en logs y puede ser DOS si subes la concurrencia'],
    tips: ['Filtra por longitud de respuesta: los 404 custom tienen tamaño constante, el contenido real destaca', 'Empieza con concurrencia baja: muchos servidores te banean por rate', 'El navegador aplica CORS: los endpoints que no respondan a OPTIONS no podrán fuzearse (limitación client-side honesta)'],
  },

  /* ── Red ── */
  dns: {
    what: 'Consulta DNS real vía DNS-over-HTTPS (Google/Cloudflare): registros A, AAAA, MX, NS, TXT, CAA, SOA y más, con análisis automático de seguridad de correo: parseo de SPF (incluye lookups y mecanismos), presencia y selector de DKIM, y política DMARC con su severidad.',
    params: [
      { name: 'dominio', type: 'string', required: true, desc: 'ejemplo.com (sin http://)' },
      { name: 'tipo', type: 'A | AAAA | MX | TXT | NS | CAA | SOA | ALL', desc: 'por defecto consulta los principales de golpe' },
      { name: 'resolver DoH', type: 'google | cloudflare', desc: 'el proveedor de DNS-over-HTTPS' },
    ],
    daily: ['Comprobar que los registros que acabas de crear se propagaron', 'Diagnosticar por qué no llegan emails: revisar SPF/DKIM/DMARC del dominio', 'Ver dónde apunta el MX antes de una migración'],
    ethical: ['Recon autorizada: subdominios vía registros NS, infraestructura de correo, servicios cloud (verificación deOwnership en TXT)', 'Auditar la seguridad de correo del cliente: SPF sin -all, DMARC p=none = spoofing posible', 'Enumerar proveedores (TXT de verificación de Google, Microsoft, AWS) para mapear superficie'],
    tips: ['DoH significa que las consultas van cifradas a Google/Cloudflare (no a tu ISP), pero ES una petición externa', 'SPF con más de 10 lookups devuelve permerror: la tool lo calcula por ti', 'DMARC p=none con rua= es monitorización; p=reject es la única protección real'],
  },
  ipinfo: {
    what: 'Geolocalización y enriquecimiento de IPs: ASN, ISP/organización, país/ciudad (aproximada), tipo de red (residencial, datacenter, móvil, hosting/VPN conocido) y reverse DNS. Acepta IP directa o dominio (resuelve primero).',
    params: [
      { name: 'IP o dominio', type: 'string', required: true, desc: '1.2.3.4 o ejemplo.com' },
      { name: 'mi IP', type: 'botón', desc: 'detecta y analiza tu IP pública de salida' },
    ],
    daily: ['Comprobar la IP de salida de tu VPN: ¿dónde estoy "conectado" y quién es el ISP?', 'Verificar que un dominio apunta al servidor esperado antes de un cambio de DNS'],
    ethical: ['Triage de alertas: ¿esa IP es un datacenter conocido (posible C2/scan) o residencial (posible usuario)?', 'Recon autorizada: mapear hosting del target, rangos de la organización por ASN', 'En informes de phishing: documentar el hosting del dominio malicioso'],
    tips: ['La geolocalización IP es aproximada a nivel ciudad: nunca uses el dato a nivel calle', 'Los tipos "hosting/proxy" ayudan a filtrar tráfico automatizado en análisis de logs', 'La consulta va a una API pública (ipwho.is): la IP analizada viaja a ese servicio'],
  },
  httpinspector: {
    what: 'Auditor de cabeceras HTTP y de seguridad: hace una petición a la URL objetivo y evalúa las cabeceras de seguridad (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP), cookies con flags (Secure, HttpOnly, SameSite) y información del servidor.',
    params: [
      { name: 'URL', type: 'string', required: true, desc: 'https://objetivo.com' },
      { name: 'método', type: 'GET | HEAD', desc: 'HEAD si solo quieres cabeceras sin body' },
    ],
    daily: ['Verificar tras un despliegue que las cabeceras de seguridad siguen presentes', 'Comprobar flags de cookies nuevas antes de pasar a producción'],
    ethical: ['Auditoría rápida de hardening: la ausencia de CSP/HSTS es hallazgo directo para el informe', 'Identificar stack del servidor (Server, X-Powered-By) para recortar el alcance de fuzzing de CVEs', 'Analizar cookies de sesión: sin HttpOnly, XSS roba la sesión; sin SameSite, CSRF'],
    tips: ['La petición sale desde tu navegador: aplica CORS, y algunos servers no devuelven cabeceras a navegadores que a curl', 'CSP inexistente o con unsafe-inline es el hallazgo más común y el más fácil de explotar con XSS', 'HSTS sin preload protege solo si el usuario ya visitó: recomienda preload en el informe'],
  },
  pingtool: {
    what: 'Mide latencia HTTP real desde tu navegador: envía peticiones periódicas al objetivo, registra RTT por muestra, calcula min/avg/max/jitter y pérdida estimada, y dibuja la gráfica en vivo. Es el equivalente HTTP del ping ICMP (que los navegadores no permiten).',
    params: [
      { name: 'URL', type: 'string', required: true, desc: 'cualquier endpoint que responda (HEAD preferible)' },
      { name: 'nº de muestras', type: 'number', desc: 'por defecto 20; más muestras = estadística más estable' },
      { name: 'intervalo', type: 'ms', desc: 'pausa entre peticiones' },
    ],
    daily: ['Comparar latencia a tu API antes/después de moverla de región', 'Monitorizar un servicio durante una ventana de mantenimiento'],
    ethical: ['Detectar bloqueos geo/CDN: latencias anómalas desde tu ubicación revelan routing raro', 'Medir el impacto real de WAFs y CDNs en el RTT del cliente', 'Nunca lo uses para DOS: el intervalo por defecto es respetuoso y debes respetar robots/rate limits'],
    tips: ['El primer RTT suele ser alto (handshake TLS): descártalo o mira la mediana', 'CORS puede impedir leer el body, pero el timing de la respuesta llega igual (mode no-cors)', 'Jitter alto = red inestable o saturación: útil para diferenciar problema de app vs de red'],
  },
  subnetting: {
    what: 'Calculadora de subnetting IPv4 completa: a partir de IP/CIDR calcula red, broadcast, máscara y wildcard, rango de hosts, capacidad total/usable, clase, privacidad (RFC1918), binarios con la parte de red resaltada y una tabla de referencia de todos los CIDRs /0-/32.',
    params: [
      { name: 'IP/CIDR', type: 'string', required: true, desc: '192.168.1.130/26 (la IP puede ser de host, no solo de red)' },
      { name: 'nuevo CIDR', type: 'number', desc: 'para dividir la red en N subredes y verlas listadas' },
    ],
    daily: ['Planificar VLANs: ¿qué /26 me sobra para 60 hosts?', 'Verificar configuraciones: ¿esta IP pertenece a esta red? ¿cuál es el gateway correcto?'],
    ethical: ['Pentesting: calcular los rangos exactos a escanear a partir de la info de alcance del cliente', 'Entender segmentación: si el servidor está en otra subred, el pivot cambia', 'Formación de redes: los binarios resaltados enseñan por qué /26 = múltiplos de 64'],
    tips: ['La IP no tiene que ser la de red: la tool normaliza al network address automáticamente', 'El modo "dividir" lista todas las subredes hijas con su rango: perfecto para documentar', 'La tabla de referencia CIDR es la chuleta definitiva para exámenes y certificaciones'],
  },
  vlsm: {
    what: 'Calculadora VLSM (Variable Length Subnet Mask): dado un bloque base y una lista de subredes con hosts requeridos, asigna subredes optimizadas de mayor a menor, con mapa visual proporcional de la red base, binarios por subred (red/broadcast/máscara con porción de red coloreada), estadísticas de eficiencia, huecos libres, detalle expandible por subred y export CSV.',
    params: [
      { name: 'red base', type: 'IP/CIDR', required: true, desc: '192.168.1.0/24 o 10.0.0.0/16' },
      { name: 'subredes', type: '{nombre, hosts}[]', required: true, desc: 'lista de subredes con su requisito de hosts; se reordenan de mayor a menor automáticamente' },
      { name: 'presets', type: 'demo | empresa | CTF', desc: 'escenarios de ejemplo cargables con un clic' },
      { name: 'export', type: 'CSV', desc: 'descarga la tabla completa con todas las columnas' },
    ],
    daily: ['Diseñar el direccionamiento de una oficina nueva: RRHH 50, IT 120, servidores 20, WiFi 250', 'Documentar la red existente: el CSV exportado va directo al inventario', 'Verificar que el plan actual no desperdicia: la eficiencia te dice cuánto espacio quema cada subred'],
    ethical: ['Pentesting: planear el addressing del lab para replicar la red del cliente con fidelidad', 'Formación de redes para seguridad: entender por qué una /26 no puede empezar en .33 (alineación a bloques)', 'Auditoría de segmentación: verificar que DMZ e internal están en bloques separados con espacio de crecimiento'],
    tips: ['Haz clic en una fila de la tabla: expande los binarios y el detalle de desperdicio de esa subred', 'El mapa visual muestra los HUECOS libres en gris: si quedan huecos grandes, reordena las subredes', 'El orden de asignación es mayor→menor: si pides /30 primero, desperdicias alineación', 'La eficiencia (útiles/total) baja de 100% por los -2 de red/broadcast y por hosts no pedidos: es normal'],
  },
  ipv4: {
    what: 'Generador de direcciones IPv4 aleatorias con CSPRNG del navegador (crypto.getRandomValues): elige el tipo (privada RFC1918, pública no reservada, multicast, loopback, link-local APIPA, documentación RFC5737 o cualquiera) y la cantidad, y obtén la lista lista para copiar. Al hacer clic en una IP se analiza al completo: tipo, clase, decimal/hex, binario, reverse DNS y subred con CIDR ajustable por slider.',
    params: [
      { name: 'tipo', type: 'privada | pública | multicast | loopback | link-local | documentación | cualquiera', desc: 'el rango del que salen las direcciones generadas' },
      { name: 'cantidad', type: '1 | 5 | 10 | 25 | 50', desc: 'número de IPs por tirada' },
      { name: 'IP seleccionada', type: 'click', desc: 'clic en cualquier IP generada para analizarla abajo' },
      { name: 'CIDR', type: 'slider 8-32', desc: 'prefijo de la subred para el análisis (red, broadcast, máscara, rango útil, capacidad)' },
    ],
    daily: ['Generar IPs de ejemplo para documentación, mocks y fixtures sin repetir rangos reales de clientes', 'Poblar archivos de hosts, configs de lab o datasets de prueba con direcciones coherentes por tipo', 'Crear ejercicios de subnetting: genera una IP, calcula su red y comprueba con la tool Subnetting'],
    ethical: ['Labs de CTF: generar objetivos ficticios por tipo (una DMZ "privada", un objetivo "público") sin usar rangos de terceros', 'Formación: enseñar qué rangos son RFC1918 vs públicos generando ejemplos visuales de cada clase', 'Fuzzing interno (autorizado): listas de IPs candidatas para probar tooling contra tu propio rango de test'],
    tips: ['Las «públicas» evitan los rangos reservados (10/8, 127/8, 172.16/12, 192.168/16, 169.254/16…) pero siguen siendo ficticias: no las escanees', 'El rango de documentación (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) es el correcto para manuales y posts de blog', 'El análisis de subred usa el mismo motor que Subnetting/VLSM: resultados consistentes entre tools'],
  },
  ipv6: {
    what: 'IPv6 Toolkit: expande/comprime direcciones, clasifica el tipo (global, ULA, link-local, multicast, 6to4, documentación…), calcula la red de cualquier prefijo con slider 0-128, reverse DNS ip6.arpa, EUI-64 desde MAC y generador de MACs por fabricante (OUIs reales y locales aleatorias).',
    params: [
      { name: 'dirección IPv6', type: 'string', required: true, desc: 'acepta forma comprimida :: y fully expanded' },
      { name: 'prefijo', type: 'slider 0-128', desc: 'para calcular la red del prefijo y el nº de direcciones' },
      { name: 'MAC', type: 'string', desc: 'para el generador EUI-64 (fe80::/10 con bit U/L invertido); también puedes pulsar una MAC generada para cargarla' },
      { name: 'generador MAC', type: 'fabricante + cantidad', desc: 'Apple, Dell, Cisco, Raspberry Pi… o «aleatoria local» con bit U/L activado' },
    ],
    daily: ['Comprobar la forma canónica de una dirección antes de meterla en config', 'Generar direcciones de ejemplo para documentación (rango 2001:db8::/32 de documentación)', 'EUI-64: predecir la link-local de un equipo desde su MAC (útil para acceder sin DHCP)', 'Generar MACs de test para laboratorios de virtualización sin chocar con tu hardware real'],
    ethical: ['Recon IPv6: entender el rango /64 de un target a partir de una dirección conocida', 'Privacidad: detectar si una dirección usa EUI-64 (MAC embebida) vs privacy extensions (aleatoria)', 'En labs: generar pools de direcciones y MACs coherentes para montar topologías reproducibles'],
    tips: ['Las link-local fe80:: empiezan con fe8/fe9/fea/feb: la tool las clasifica solas', 'El reverse DNS invierte nibbles: es lo que hay que meter en la zona ip6.arpa', 'Las MAC «aleatoria local» activan el bit U/L (2º dígito 2/6/A/E): así no colisionan con fabricantes reales'],
  },
  curlbuilder: {
    what: 'Constructor visual de comandos curl: método, URL, headers, auth (Bearer, Basic, digest), cookies, body con content-type correcto, proxy, follow redirects, insecure TLS, timeouts y verbose. Genera el comando exacto multiplataforma (con y sin comillas problemáticas en Windows).',
    params: [
      { name: 'método + URL', type: 'string', required: true, desc: 'base de la petición' },
      { name: 'headers', type: 'pares clave-valor', desc: 'tabla editable con presets comunes' },
      { name: 'auth', type: 'bearer | basic | digest | ntlm', desc: 'genera las flags -H o -u correctas' },
      { name: 'body', type: 'string + tipo', desc: 'json, form-urlencoded, multipart con @fichero' },
      { name: 'opciones', type: 'toggles', desc: '-k (insecure), -L (follow), --proxy, --max-time, -v (verbose)' },
    ],
    daily: ['Construir la petición de prueba de una API antes de automatizarla', 'Replicar una petición del navegador (copiada de DevTools) con el formato correcto'],
    ethical: ['Reproducir peticiones de un proxy interceptado con modificaciones controladas (cookies, roles)', 'Probar endpoints con -k contra entornos con certificados auto-firmados (labs)', 'Añadir X-Forwarded-For o Host custom para probar lógica de confianza del servidor'],
    tips: ['El flag --data-binary evita que curl reescriba tu JSON', 'En Windows CMD las comillas dobles escapadas \" dan guerra: usa la variante generada para CMD', '--max-time evita colgar scripts de automatización'],
  },

  /* ── Forense ── */
  pcap: {
    what: 'Analizador de capturas pcap/pcapng 100% en el navegador: parsea el formato, lista protocolos con conteos, conversaciones por pares IP/puerto, top talkers, peticiones DNS/HTTP extraídas, y genera alertas automáticas (tráfico a puertos sospechosos, DNS a dominios raros, HTTP en claro con credenciales…).',
    params: [
      { name: 'fichero pcap', type: 'File (.pcap, .pcapng)', required: true, desc: 'la captura a analizar; se procesa localmente con FileReader' },
      { name: 'filtros', type: 'protocolo | IP | puerto', desc: 'para navegar el listado de paquetes/conversaciones' },
    ],
    daily: ['Revisar una captura de troubleshooting antes de compartirla (quitar credenciales?)', 'Entender qué habla un dispositivo IoT en tu red'],
    ethical: ['Análisis forense: identificar C2 (beacons periódicos a la misma IP), exfiltración (uploads grandes), lateral movement', 'CTFs: extraer credenciales HTTP/FTP en claro, flags en DNS o payloads en streams', 'Validar ataques en lab: verificar que tu MITM capturó lo esperado'],
    tips: ['El parsing es client-side: capturas de 100MB+ pueden tardar, pero nada sale de tu máquina', 'Las alertas automáticas son heurísticas: revísalas con las conversaciones reales al lado', 'Exporta el resumen para el informe: protocolos, top talkers y hallazgos en texto'],
  },
  fileanalyzer: {
    what: 'Análisis forense de ficheros: identifica el tipo REAL por magic bytes (no por extensión), calcula entropía por bloques (detecta cifrado/compresión), extrae strings imprimibles con longitud mínima configurable, calcula todos los hashes, y muestra hex dump del inicio.',
    params: [
      { name: 'fichero', type: 'File', required: true, desc: 'cualquier fichero; se lee localmente' },
      { name: 'min longitud strings', type: 'number', desc: 'por defecto 6; baja para binarios pequeños' },
      { name: 'bloques de entropía', type: 'number', desc: 'granularidad del análisis de entropía' },
    ],
    daily: ['Verificar qué es realmente ese fichero con extensión rara antes de abrirlo', 'Confirmar si un "PDF que no abre" está cifrado (entropía alta uniforme)'],
    ethical: ['Triage de malware (con precauciones): magic bytes falsificados, entropía alta = packed/encrypted', 'Forense: strings con URLs, IPs, emails y comandos incrustados', 'Verificar disclaimers de "es un jpg": si el magic no es JPEG, es otra cosa'],
    tips: ['Entropía > 7.5 bits/byte en todo el fichero = cifrado o comprimido (o malware packed)', 'Los strings de un ejecutable legítimo revelan libs, rutas y URLs: úsalo para clasificar sin ejecutarlo', 'El hex dump inicial con magic bytes reconocidos es la evidencia del tipo real'],
  },
  exif: {
    what: 'Extractor de metadatos con exifr: EXIF completo de imágenes (cámara, lente, exposición, GPS con link a mapa, fechas), metadatos de HEIC, PDFs (autor, software, historial), documentos Office y más. Detecta también si el fichero fue "limpiado" (sin metadatos = sospechoso de haber pasado por stripped).',
    params: [
      { name: 'imagen/fichero', type: 'File', required: true, desc: 'jpg, png, heic, pdf, docx…' },
      { name: 'ver GPS', type: 'auto', desc: 'si hay coordenadas, muestra lat/lon y link a OpenStreetMap' },
    ],
    daily: ['Revisar qué metadatos publicas antes de subir fotos a la web (¡GPS!)', 'Ver qué software usó alguien para editar una imagen (certificación de originalidad)'],
    ethical: ['OSINT autorizado: localizar dónde se tomó una foto de perfil, qué cámara, cuándo', 'Forense de imágenes: detectar re-edición (software de edición en metadatos de una "original")', 'En informes de concientización: mostrar la ubicación GPS de una foto que un empleado publicó'],
    tips: ['La ausencia total de EXIF también es dato: la imagen fue procesada/stripped (o generada por IA)', 'El GPS puede venir en racional GPS lat/lon: la tool lo convierte a decimal', 'PDFs: los metadatos de Producer/Creator revelan la herramienta que lo generó (¿Word? ¿escáner? ¿fusión?)'],
  },
  stego: {
    what: 'Esteganografía LSB en imágenes PNG: oculta un mensaje secreto (opcionalmente cifrado con contraseña) en el bit menos significativo de los píxeles, y extrae mensajes ocultos con la misma técnica. Incluye análisis de imagen para detectar LSB-stego (entropía del plano LSB).',
    params: [
      { name: 'imagen PNG', type: 'File', required: true, desc: 'portadora; se re-descarga la imagen con el mensaje incrustado' },
      { name: 'mensaje', type: 'string', required: true, desc: 'lo que ocultas (modo ocultar)' },
      { name: 'contraseña', type: 'string', desc: 'si la pones, el mensaje va cifrado además de oculto' },
      { name: 'modo', type: 'ocultar | extraer | analizar', desc: 'extraer para recuperar; analizar para detectar sospechas' },
    ],
    daily: ['Watermarking: incrusta tu firma en imágenes que compartes para rastrear filtraciones'],
    ethical: ['CTFs: el 90% del stego de retos es LSB en PNG (el resto: metadata, paletas, DCT en JPG)', 'Formación: demostrar que "ver" una imagen no significa que no tenga contenido extra', 'Analizar imágenes sospechosas: el plano LSB con entropía uniforme alta sugiere mensaje oculto'],
    tips: ['La técnica LSB sobrevive a copias exactas pero NO a re-compresión, resize o captura de pantalla', 'PNG sin pérdida es imprescindible: en JPG la compresión destruye los bits LSB', 'Con contraseña, sin ella no hay mensaje legible: doble protección'],
  },

  /* ── Linux & sistema ── */
  chmod: {
    what: 'Calculadora de permisos Linux en octal y simbólico con casos especiales: SUID (4000), SGID (2000) y Sticky Bit (1000). Muestra la representación rwxr-xr-x, el número octal y explica qué significa cada bit para ficheros vs directorios.',
    params: [
      { name: 'permisos', type: 'checkboxes rwx por rol', required: true, desc: 'owner, group, others' },
      { name: 'especiales', type: 'suid | sgid | sticky', desc: 'bits especiales con su explicación contextual' },
      { name: 'dirección', type: 'octal → simbólico | inverso', desc: 'convierte en ambas direcciones' },
    ],
    daily: ['Configurar permisos de scripts de despliegue (750 para ejecutables de grupo)', 'Entender el 1777 de /tmp (sticky bit: cada uno solo borra lo suyo)'],
    ethical: ['Privesc: reconocer que un binario con SUID (4755) ejecuta como propietario (¿root?)', 'Auditar: permisos 666/777 en ficheros de config = hallazgo de hardening', 'SGID en directorios compartidos: los ficheros heredan el grupo (útil y a veces peligroso)'],
    tips: ['SUID en un editor (vim, nano) = privesc instantáneo vía shell escape: gtfobins', 'En directorios el x significa "atravesar": sin x, ni ls funciona aunque haya r', 'El octal siempre son 3-4 dígitos: 4755 no es "4755 permisos", es SUID + 755'],
  },
  cheatsheets: {
    what: 'Colección masiva de cheatsheets copiables: ~150 comandos Linux (red, ficheros, procesos, usuarios, cron, hardening, text-fu, transferencias, SSH, WiFi, Docker, bash, pentest tools), ~100 Windows (sistema, AD, PowerShell, LOLBAS, privesc, ofensiva, EDR, red), macOS, redes puras, checklist de privesc por plataforma, 50+ equivalencias Linux↔Windows y one-liners de reverse shells.',
    params: [
      { name: 'tab', type: 'linux | windows | mac | red | privesc | equiv | revshells', desc: 'la sección a consultar' },
      { name: 'buscador', type: 'string', desc: 'filtra comandos en vivo en la sección activa' },
      { name: 'copiar', type: 'hover → click', desc: 'cada comando se copia al pasar el ratón' },
    ],
    daily: ['Chuleta cuando no recuerdas el flag exacto (¿ip neigh o arp?)', 'En Windows: el equivalente PowerShell del comando Linux que ya dominas'],
    ethical: ['Enum de privesc sistemática: la checklist recorre SUID, capabilities, cron, writable paths, kernels…', 'AD attacks: referencias directas a GetNPUsers, Kerberoast, DCSync con la sintaxis exacta', 'En el campo: los one-liners de transferencia y revshells listos para pegar'],
    tips: ['El buscador filtra en la descripción también: busca "escuchar" o "download" para encontrar lo que no sabías buscar', 'Las equivalencias son bidireccionales en práctica: si sabes Linux, la columna Windows te hace bilingüe', 'Todo es copy-paste ready: revisa SIEMPRE IPs/hosts antes de ejecutar'],
  },

  /* ── Análisis ── */
  cvelookup: {
    what: 'Consulta CVEs en la NVD (National Vulnerability Database) por ID o palabra clave: CVSS base y severidad, descripción, rango de versiones afectadas (CPE) y referencias. Con búsqueda en vivo y detalles expandibles.',
    params: [
      { name: 'CVE ID o keyword', type: 'string', required: true, desc: 'CVE-2021-44228 o "apache struts"' },
      { name: 'año/severidad', type: 'filtro', desc: 'afina resultados por año o severidad mínima' },
    ],
    daily: ['Verificar si la vulnerabilidad que salió en las noticias te afecta (¿tu versión está en el rango?)', 'Preparar parcheado: priorizar por CVSS y expabilidad conocida'],
    ethical: ['Recon de auditoría: versión de servicio detectada → buscar CVEs aplicables con CPE exacto', 'Informes: citar CVSS oficial, descripción y referencias de cada hallazgo', 'Priorizar remediación: CVSS 9.8 con exploit público (referencias) = parche ya'],
    tips: ['La consulta va a la API pública de NVD: requiere internet y tiene rate limit', 'CVSS base no incluye contexto: un 9.8 en servicio interno sin exposición es menos urgente que un 7.5 en el edge', 'Las referencias suelen incluir el exploit público (Exploit-DB, GitHub): revisa antes de asumir que no hay PoC'],
  },
  cvss: {
    what: 'Calculadora de CVSS 3.1 base score: selecciona las 8 métricas (AV, AC, PR, UI, S, C, I, A) y obtén la puntuación 0-10, la severidad cualitativa (None/Low/Medium/High/Critical) y el vector completo (ej. CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) con explicación de cada métrica.',
    params: [
      { name: 'métricas', type: 'selección por grupo', required: true, desc: 'Attack Vector, Attack Complexity, Privileges Required, User Interaction, Scope, Confidentiality, Integrity, Availability' },
      { name: 'vector', type: 'string', desc: 'también puedes pegar un vector CVSS existente y editarlo' },
    ],
    daily: ['Puntuar riesgos internos de forma estándar para el comité de seguridad'],
    ethical: ['En informes de pentesting: cada hallazgo lleva su CVSS — esta tool lo calcula y justifica', 'Discutir con el cliente: demostrar por qué el RCE sin auth es Critical y el info disclosure es Low', 'Comprobar vectores propuestos por otros (¿realmente es PR:N? ¿hay MFA?)'],
    tips: ['Scope Changed (S:C) dispara la puntuación: un SSRF que toca metadatos cloud suele ser S:C', 'PR baja cuando hay auth: un hallazgo tras login nunca es 10.0', 'El vector es lo importante: la puntuación sin el vector no es reproducible'],
  },
  cronguru: {
    what: 'Explicador y calculador de expresiones cron: traduce la expresión a lenguaje natural, muestra las próximas N ejecuciones con fecha/hora exacta, valida la sintaxis (5 o 6 campos, con segundos opcional) y detecta errores comunes (día de mes + día de semana, rangos inválidos).',
    params: [
      { name: 'expresión cron', type: 'string', required: true, desc: '*/5 * * * * o 0 9 * * 1-5' },
      { name: 'nº de próximas', type: 'number', desc: 'cuántas ejecuciones futuras calcular' },
      { name: 'zona horaria', type: 'del navegador', desc: 'las fechas se muestran en tu zona local' },
    ],
    daily: ['Entender el cron del devops anterior antes de tocarlo', 'Programar tareas de mantenimiento sin sorpresas (¿sabías que 0 9 * * 1-5 son días laborales?)'],
    ethical: ['Análisis forense en Linux: calcular cuándo se ejecutó el cron malicioso y cuándo volverá a hacerlo', 'Auditoría de cron jobs: detectar expresiones que no hacen lo que el admin cree (ej. * en day-of-month Y day-of-week hace OR, no AND)', 'En red team (autorizado): predecir cuándo disparará el cron que secuestraste para tu payload'],
    tips: ['Si specifies day-of-month Y day-of-week, cron ejecuta si CUALQUIERA coincide (OR): clásico que rompe schedules', '*/n significa "cada n desde el inicio del rango": */10 en minutos = 0,10,20…', 'Los 6 campos (con segundos) son de Quartz/systemd timers, no de cron clásico'],
  },
  regex: {
    what: 'Laboratorio de expresiones regulares con resaltado en vivo: muestra matches con spans, grupos de captura numerados, flags configurables (g, i, m, s, u) y panel de reemplazo con preview. Incluye referencias rápidas de sintaxis y patrones comunes (email, IP, URL, hashes).',
    params: [
      { name: 'patrón', type: 'regex', required: true, desc: 'la expresión regular a probar' },
      { name: 'texto', type: 'string', required: true, desc: 'donde buscar' },
      { name: 'flags', type: 'gimsu', desc: 'global, case-insensitive, multiline, dotAll, unicode' },
      { name: 'reemplazo', type: 'string', desc: 'con $1, $2… para grupos de captura' },
    ],
    daily: ['Construir el grep/sed que necesitas probándolo antes en texto real', 'Validar formatos de input (emails, teléfonos, códigos) antes de meterlos en código'],
    ethical: ['Escribir detectores de IOC en logs: IPs, dominios sospechosos, hashes, user agents raros', 'En SIEM: construir las regex de detección con datos reales pegados aquí', 'Parsear salida de herramientas (nmap, dig) para automatizar pipelines'],
    tips: ['Sin flag g solo ves el primer match: actívala para findall', 'El lookbehind (?<=) y lookahead (?=) capturan contexto sin consumirlo: clave para extracciones limpias', 'Regex catastrophic backtracking: cuidado con (.*)* anidados — prueba con textos largos aquí antes de producción'],
  },
  defanger: {
    what: 'Defangea (neutraliza) o refangea (restaura) indicadores para compartirlos con seguridad: IPs (1.2.3[.]4), dominios (ejemplo[.]com), URLs (hxxps://), emails y hasta ASN. Configurable por tipo de indicador y con detección automática.',
    params: [
      { name: 'texto', type: 'string', required: true, desc: 'un IOC o una lista completa (una por línea); detecta el tipo automáticamente' },
      { name: 'dirección', type: 'defang | refang', desc: 'defang para publicar/compartir; refang para usar en herramientas' },
      { name: 'estilo', type: '[.] | . | dot | …', desc: 'el formato de neutralización' },
    ],
    daily: ['Publicar IOCs en informes, Slack o Twitter sin riesgo de que alguien haga click accidental', 'Pegar un IOC defanged de un feed externo y refangarlo para usarlo en tu herramienta'],
    ethical: ['Estándar en threat intelligence: compartir indicadores sin crear accidentalmente hyperlinks clicables', 'En informes de pentesting: defangear todos los hosts/clientes antes de entregar', 'Forense: los IOCs extraídos van defanged al informe para evitar "helpful" auto-clicks'],
    tips: ['Refang es lo primero que haces al importar un feed de terceros (MISP, papers, tweets)', 'Defangea también los "mailto:" y los esquemas: un hxxps evita clics accidentales', 'Pega listas enteras: procesa línea a línea manteniendo el orden'],
  },
  uuid: {
    what: 'Generador y validador de identificadores: UUID v4 (aleatorio criptográfico) en lote, NanoID (más corto, URL-safe, misma entropía ajustada) y ObjectIds estilo MongoDB (timestamp + máquina + contador). Incluye validador: pega cualquier ID y te dice su versión/formato y si es válido.',
    params: [
      { name: 'tipo', type: 'uuid v4 | nanoid | objectid', required: true, desc: 'el formato a generar' },
      { name: 'cantidad', type: 'number', desc: 'lote de IDs de una vez' },
      { name: 'validador', type: 'string', desc: 'pega un ID para analizar su versión y validez' },
    ],
    daily: ['Generar IDs de test para bases de datos y fixtures', 'NanoID para tokens de URL (share links) donde el UUID es demasiado largo'],
    ethical: ['Comprobar aleatoriedad: ObjectIds filtran timestamp de creación (info leak en APIs)', 'Validar UUIDs en pentesting de APIs: ¿acepta el backend cualquier formato? (injection)', 'En forense: el timestamp de un ObjectId data el registro exactamente'],
    tips: ['UUID v4 usa crypto.getRandomValues: 122 bits de aleatoriedad real', 'ObjectIds NO son secretos: empiezan por timestamp en hex (4 bytes)', 'NanoID con alfabeto de 64 chars: 21 chars ≈ 126 bits, y cabe en URLs sin encoding'],
  },

  /* ── Generadores ── */
  qr: {
    what: 'Generador de códigos QR con presets inteligentes: texto libre, URL, WiFi (SSID+password+auth → escanear para conectar), vCard (contacto completo), email, SMS, teléfono y geo-localización. Control de corrección de error (L/M/Q/H), colores, tamaño y margen, con descarga PNG y SVG 100% local.',
    params: [
      { name: 'modo', type: 'texto | url | wifi | vcard | email | sms | tel | geo', required: true, desc: 'el preset que define el formato del payload' },
      { name: 'campos del modo', type: 'varios', desc: 'SSID/password para WiFi; nombre/tel/email para vCard; etc.' },
      { name: 'corrección de error', type: 'L | M | Q | H', desc: 'H aguanta ~30% de daño (útil para poner logos encima); L es más compacto' },
      { name: 'colores', type: 'hex × 2', desc: 'oscuro y claro; contraste suficiente = escaneable' },
      { name: 'tamaño/margen', type: 'px / módulos', desc: 'resolución de salida y margen de silencio' },
    ],
    daily: ['QR de WiFi para invitados: escanear y conectado sin decir contraseñas en voz alta', 'vCard en tarjetas digitales y presentaciones: escanear = contacto guardado', 'Enlaces con UTM sin tener que teclearlos en el móvil'],
    ethical: ['Formación de phishing (autorizada): demostrar cómo un QR oculta la URL real y por qué no se debe escanear a ciegas', 'Tests de concienciación: QR que lleva a la página de formación de seguridad de la empresa', 'En CTFs: QRs con payloads de 200+ caracteres (vCard con campos inyectados)'],
    tips: ['El payload real se muestra debajo del formulario: revísalo antes de imprimir', 'El QR de WiFi contiene la contraseña en claro (cualquier lector la extrae): solo para invitados temporales', 'Contraste insuficiente (gris sobre blanco) = no escanea: mantén oscuro sobre claro', 'Los datos viven solo en el estado de la pestaña: al recargar se pierde (privacidad por diseño)'],
  },
  lipsum: {
    what: 'Generador de texto de relleno (lorem ipsum clásico en latín) por párrafos, frases o palabras, con formato de salida plano, Markdown, HTML o JSON. Incluye modo "hacker" que mezcla vocabulario de seguridad (privesc, pivoting, exfil) para demos temáticas.',
    params: [
      { name: 'unidad', type: 'párrafos | frases | palabras', desc: 'qué unidades generar' },
      { name: 'cantidad', type: 'number', desc: '1-500 unidades' },
      { name: 'formato', type: 'plano | markdown | html | json', desc: 'markdown con headers, HTML con <p>, JSON estructurado' },
      { name: 'modo hacker', type: 'toggle', desc: 'mezcla vocabulario ofensivo en el texto' },
    ],
    daily: ['Poblar mockups y wireframes con texto creíble mientras esperas el copy real', 'Probar cómo maneja tu UI textos largos (truncate, wrap, scroll)', 'Generar fixtures de pruebas para CMS y bases de datos'],
    ethical: ['Probar el sanitizador de HTML de tu app: pega el HTML generado y verifica el escape', 'Payloads de relleno en fuzzing: bodies grandes para probar límites (413, truncados)', 'En formaciones: textos de ejemplo que suenan a informe real sin incluir datos de clientes'],
    tips: ['El JSON estructurado es perfecto para mockear respuestas de API', 'El modo hacker no cambia la estructura, solo el vocabulario: sigue siendo texto plausible', '500 palabras caben en un CopyBlock: para más, descarga el fichero'],
  },

  /* ── Forense (nuevas) ── */
  logparser: {
    what: 'Análisis forense de logs en dos formatos autodetectados: syslog estilo Unix (auth.log, secure, messages — sshd, sudo, su, CRON, PAM) y EVTX-XML de Windows (eventos 4624/4625/4672/4688/4720/4728/4732/4719/1102). Calcula resumen de eventos, top de IPs atacantes, actividad por usuario, histograma horario con fallos marcados en rojo, y una lista de eventos sospechosos clasificados por severidad (fuerza bruta, creación de cuentas, log limpiado, sudo peligroso, RDP inesperado…). Exporta el informe completo en JSON.',
    params: [
      { name: 'log', type: 'string | File', required: true, desc: 'pega el log o carga auth.log/secure/messages/.xml; máx 20 MB' },
      { name: 'formato', type: 'autodetectado', desc: 'syslog si son líneas de texto; EVTX-XML si contiene <Event> o el namespace de Microsoft' },
      { name: 'ejemplo', type: 'botón', desc: 'carga un auth.log de muestra con fuerza bruta SSH, sudo peligroso y reverse mapping fallido' },
    ],
    daily: ['Triaje rápido tras una alerta: ¿hubo fuerza bruta y desde qué IPs antes del acceso aceptado?', 'Revisar qué cuentas tienen fallos de autenticación recurrentes (spraying de contraseñas)', 'Auditar comandos sudo peligrosos (rm -rf, useradd, iptables -F) ejecutados en servidores'],
    ethical: ['Reconstruir la línea temporal de un incidente autorizado: fallo→fallo→fallo→aceptado→sudo→cuenta nueva es el patrón clásico de compromiso', 'En Windows: detectar 4625 en ráfaga (brute force), 4624 tipo 10 (RDP inesperado) y 1102 (log borrado = anti-forense)', 'Formación: mostrar por qué fallar 100 veces y acertar 1 vez es visible y alarmable'],
    tips: ['La IP del salto fallido precede al Accepted exitoso: correlaciona ambas tablas para la narrativa del atacante', 'Un pico de eventos entre las 02:00-05:00 fuera de horario merece revisión aunque sean logins OK', 'En EVTX: exporta desde el Visor de eventos con "Guardar eventos seleccionados como…" formato XML, o usa evtx_export.exe del proyecto evtx para convertir .evtx completo', 'El histograma marca en rojo las horas con fallos: es el primer sitio donde mirar'],
  },
  filecarver: {
    what: 'File carving forense: escanea cualquier fichero o dump byte a byte buscando magic bytes de PNG, JPEG, GIF, PDF, ZIP/OOXML/JAR, RAR, 7z y GZIP. Reconstruye los ficheros encontrados delimitando inicio/fin por firma, calcula su SHA-256, previsualiza imágenes recuperadas con object URLs y permite descargarlas individualmente. Incluye búsqueda de cadenas ASCII y UTF-16LE con offsets hexadecimales (base para escribir reglas YARA propias).',
    params: [
      { name: 'fichero', type: 'File', required: true, desc: 'dump de memoria, disco, binario, imagen contenedora… máx 30 MB, todo local' },
      { name: 'firmas', type: 'chips', desc: 'elige qué tipos de fichero buscar (PNG/JPG/PDF/ZIP activados por defecto)' },
      { name: 'tamaño mínimo', type: 'number', desc: 'filtra falsos positivos de firmas triviales (por defecto 512 bytes)' },
      { name: 'cadena', type: 'string', desc: 'búsqueda de offsets ASCII + UTF-16LE para IOC hunting manual' },
    ],
    daily: ['Recuperar las fotos de una tarjeta SD formateada parcialmente (los JPEG siguen allí)', 'Extraer el ZIP embebido en un binario (instaladores self-extracting, malware con payload adjuntado)', 'Verificar qué ficheros contiene un dump antes de montar herramientas más pesadas'],
    ethical: ['En respuesta a incidentes: extraer imágenes/PDFs del dump de memoria sin instalar nada en la evidencia', 'Detectar exfiltración: un PNG de 4 MB dentro de un .docx es sospechoso de esteganografía o tunneling', 'CTFs de forense: el clásico "encuentra la bandera escondida tras el EOF del JPEG" se resuelve aquí'],
    tips: ['El carving por firma no ve fragmentación: si el fichero está partido en clusters no contiguos, necesitarás Scalpel/PhotoRec sobre imagen completa', 'Un JPEG "cortado" (sin FFD9) suele significar que el contenedor lo trunca: bájale el filtro de tamaño mínimo', 'El SHA-256 de cada pieza te permite deduplicar y buscar las piezas en VirusTotal sin subirlas', 'UTF-16LE aparece en dumps de memoria de Windows: busca ahí nombres de usuario, rutas y comandos'],
  },

  /* ── Ingeniería Inversa ── */
  bininspect: {
    what: 'Análisis estático de ejecutables PE (Windows .exe/.dll/.sys) y ELF (Linux .so/binarios) escrito en JS puro: parsea cabeceras DOS/COFF/Optional (arquitectura, bits, entry point, image base, timestamp de compilación), tabla de secciones con entropía de Shannon por sección y flags (RX/W+X), tabla de imports por DLL con hasta 800 símbolos, exports, y heurísticas: detección de packers (UPX/aspack por nombre y entropía > 7.2), binarios Go/Rust/.NET, capacidad de red (winsock/wininet), criptografía, imports anti-debug y firma Authenticode presente.',
    params: [
      { name: 'binario', type: 'File', required: true, desc: 'arrastra el .exe/.dll/.so; máx 60 MB; NUNCA se ejecuta, solo se lee' },
      { name: 'formato', type: 'autodetectado', desc: 'MZ → PE; 0x7F ELF → ELF; otro formato te redirige a File Analyzer' },
    ],
    daily: ['Triage de un binario desconocido antes de abrirlo en VM: qué es, a qué APIs enlaza, si viene empaquetado', 'Saber si un ejecutable es x86 o x64, GUI o consola, y cuándo se compiló (el timestamp se puede forjar, pero orienta)', 'Revisar dependencias de software interno heredado: qué DLLs del sistema toca'],
    ethical: ['Primera fase de reversing autorizado: imports de WS2_32/VirtualAlloc/IsDebuggerPresent dibujan el comportamiento antes de desensamblar', 'Detectar packer → decidir estrategia (upx -d, dumping en VM, o laisser-faire) sin gastar horas en Ghidra a ciegas', 'En respuesta a incidentes: documentar arquitectura, entry point y hashes para el IOC report'],
    tips: ['El análisis es 100% pasivo: se leen bytes con DataView, no hay ejecución, ni macros, ni scripts', 'Sección con entropía ~7.9 y nombre tipo UPX0: empaquetado; con imports raros (VirtualAlloc + entropía alta sin UPX): packer custom o crypter', 'Los binarios Go muestran cientos de símbolos runtime.*: es normal, no es ofuscación', 'Si el timestamp de compilación es 0 (1970) el build era reproducible/ofuscado: no lo uses como IOC', 'Después de aquí: strings (File Analyzer), Ghidra/radare2 en VM, y comportamiento en sandbox'],
  },
  deobfuscate: {
    what: 'Descodificador multi-capa con detección automática: aplica recursivamente la capa que reconoce (hex, base64, binario, decimal, escapes \\x y \\u, HTML entities, URL-encode, arrays 0x) hasta 10 niveles, mostrando la cadena completa de transformaciones con su salida intermedia. Incluye crackeo de XOR single-byte (255 claves puntuadas por frecuencia del español), descifrado XOR multi-byte manual, ROT-N con slider 1-25 y métricas de ofuscación JavaScript (eval/atob/Function, escapes, identificadores 0x…, token más largo) para reconocer la salida de javascript-obfuscator.',
    params: [
      { name: 'entrada', type: 'string', required: true, desc: 'cualquier cadena ofuscada: parámetro de URL, payload de CTF, config "cifrada"' },
      { name: 'capas', type: 'auto', desc: 'detección por estructura: charset, longitud par, ratio de imprimabilidad > 0.75-0.9' },
      { name: 'clave XOR', type: 'string', desc: 'descifrado manual multi-byte sobre el resultado de las capas' },
      { name: 'shift ROT', type: '1-25', desc: 'cifrado César ajustable sobre el resultado' },
    ],
    daily: ['Descifrar un parámetro de aplicación que resulta ser base64(base64(JSON))', 'Entender payloads de CTF encadenados: hex → base64 → URL → texto', 'Recuperar cadenas de configs ofuscadas (XOR con clave encontrada en el binario)'],
    ethical: ['Analizar el stage-1 de un documento malicioso (macros con \\x escapes + base64) sin ejecutar nada', 'Mapear qué capa usa una familia de phishing para esconder la URL: punycode → base64 → redirect', 'En formación: demostrar que ofuscar no es cifrar — la capa XOR de un byte cae en milisegundos'],
    tips: ['La detección se corta cuando la siguiente capa no produce texto legible: si se detiene pronto, prueba decodificar manualmente cada tipo', 'XOR auto solo sirve para claves de 1 byte: para claves largas usa el campo manual (repite la clave sobre el texto)', 'Las métricas JS no ejecutan el código: cuentan patrones. eval alto + nombres _0x… = javascript-obfuscator seguro', 'Nunca pegues código JS ofuscado en la consola de tu navegador para "ver qué hace": desensamblalo o usa una VM desechable'],
  },

  /* ── Phishing ── */
  mailheader: {
    what: 'Analizador forense de cabeceras de email: parsea el bloque RFC 822 y extrae la cadena Received completa (de origen a destino, con from/by/with/fecha), el veredicto SPF/DKIM/DMARC de Authentication-Results, y compara identidades críticas: From vs Return-Path (envelope) vs Reply-To. Detecta spoofing directo, Reply-To desviado (BEC), X-Mailer de scripts (PHPMailer/swaks/python), saltos sin TLS, display names con autoridad y mails sin Received. Genera una puntuación de riesgo 0-100 con hallazgos explicados y un checklist manual de verificación.',
    params: [
      { name: 'cabeceras', type: 'string', required: true, desc: 'pega el original completo (Gmail: Mostrar original; Outlook: Encabezados de internet)' },
      { name: 'ejemplo', type: 'botón', desc: 'carga un caso de spoofing bancario con SPF softfail, DKIM none y DMARC fail' },
    ],
    daily: ['Verificar si ese correo "del banco/director" es legítimo antes de clicar o responder', 'Reportar a tu equipo de seguridad con evidencia: score, hallazgos y ruta de servidores', 'Aprender a leer cabeceras: ver qué MTA tocó el correo y en qué orden'],
    ethical: ['Triage del buzón de abuso/SoC: clasificar en segundos entre spam, spoofing y BEC real', 'Formación: enseñar que el nombre visible se forja en 1 línea y que quien manda de verdad es el Return-Path', 'Auditar tu propio dominio: si los correos de prueba no pasan DMARC, tu política p=none te está exponiendo'],
    tips: ['El orden de Received va de abajo (origen) a arriba (tu servidor): el primer salto dice quién envió de verdad', 'SPF pasa pero DMARC falla = el servidor estaba autorizado para OTRO dominio: spoofing con dominio propio del atacante', 'Reply-To distinto de From es la señal #1 de BEC: la respuesta se va al atacante aunque el From parezca interno', 'Esta tool es heurística y local: no valida firma criptográfica real (eso lo hace tu gateway); úsala para triage y formación', 'Cruza la IP del salto 1 con la tool IP Info: país/ASN inesperado = bandera roja'],
  },
  urlphish: {
    what: 'Inspector estructural de URLs anti-phishing: descompone la URL y la analiza sin visitarla. Detecta punycode (xn--) y lo traduce a unicode para ver los homoglyphs carácter a carácter (cada carácter no-ASCII se marca en rojo), credenciales incrustadas (usuario@…), IPs directas, acortadores conocidos, URLs kilométricas que esconden el dominio real, marcas objetivo (PayPal, Microsoft, banca ES) fuera de su dominio legítimo (typosquatting/lookalike), keywords de presión social en el path (login/verify/secure) y HTTP sin TLS. Clasifica el riesgo en alta/media/baja con hallazgos explicados.',
    params: [
      { name: 'url', type: 'string', required: true, desc: 'la URL del mensaje sospechoso; también dominio suelto' },
      { name: 'ejemplos', type: 'chips', desc: '5 casos precargados: punycode, IP con path de marca, subdominio engañoso, acortador y URL legítima' },
    ],
    daily: ['Verificar el enlace de ese SMS/correo antes de reenviarlo al departamento de IT', 'Comparar el dominio real de una URL acortada sin expandirla con servicios de terceros', 'Enseñar en formación a leer URLs: qué parte es decoración y cuál es el dominio que manda'],
    ethical: ['Diferenciar con evidencia un lookalike (paypaI.com con L mayúscula, xn--paypa…) del dominio legítimo', 'Triage de campañas: clasificar URLs de un dump de phishing por riesgo sin visitar ninguna', 'En tu organización: detectar registros de dominios con tu marca en el nombre (marca + tld barato)'],
    tips: ['La tool NO visita la URL: análisis 100% estructural, cero riesgo de drive-by', 'Regla de oro que enseña la tool: el dominio real es lo que queda justo antes del primer / — en paypal.com.evil.top el dueño es evil.top', 'Punycode no siempre es malo (dominios legítimos con ñ/acentos lo usan): mira el unicode resultante y compara carácter a carácter', 'Para expandir acortadores: curl -sI <url> | grep -i location — la cabecera Location es el destino real'],
  },
  phishpage: {
    what: 'Generador de material de concienciación anti-phishing para formación interna: 5 plantillas de ataque simulado (CEO fraud/BEC, credenciales Office365 con doble captcha, paquete retenido, quishing con QR en PDF, pretexting de soporte TI), cada una con técnica, asunto, pretexto y CTA. Genera el email de entrenamiento (con cabeceras éticas X-Mailer y List-Unsubscribe) y una landing HTML de login falsa con banner de aviso visible, formulario dummy que no envía nada y tracking simulado local. Incluye generador de QR (quishing) para la campaña y checklist de reglas de oro del simulacro ético.',
    params: [
      { name: 'plantilla', type: '5 técnicas', required: true, desc: 'BEC, Office365, DHL, quishing, soporte TI — cada una explica su técnica' },
      { name: 'dominio', type: 'string', desc: 'dominio del simulacro: usa un subdominio interno de lab, nunca el corporativo real' },
      { name: 'marca', type: 'string', desc: 'nombre de tu organización para la landing' },
      { name: 'tracking id', type: 'auto', desc: 'ID aleatorio por sesión que aparece en plantilla/landing/QR para correlacionar el material' },
    ],
    daily: ['Preparar el material de la sesión de formación de seguridad del trimestre', 'Generar landings de práctica para el CTF interno o el onboarding de nuevos empleados', 'Crear ejemplos realistas para documentar el protocolo de reporte de phishing'],
    ethical: ['TODO el material lleva disclaimers: banner en la landing, X-Mailer de simulacro, formulario que no captura nada', 'Las campañas reales de phishing interno requieren autorización escrita, scope definido y herramientas corporativas (GoPhish en tu infraestructura) — esta tool genera el material formativo, no la campaña', 'El debrief post-simulacro es formativo, nunca punitivo: quien cayó recibe micro-formación, no sanción', 'Nunca uses dominios ajenos ni marcas reales de terceros en los simulacros: tu organización y plantillas genéricas'],
    tips: ['El ID de tracking aparece en la URL de la landing y en el QR: así sabes qué material generó cada interacción en tu aula', 'La landing se previsualiza con pop-up o se descarga como HTML autónomo: funciona offline en cualquier aula', 'El QR de quishing ilustra por qué los filtros no lo ven: escanéalo delante del alumnado y muestra el banner de aviso', 'Combínalo con Email Header Analyzer: primero muestran el ataque, luego enseñan a detectarlo con las cabeceras'],
  },

  /* ── Red (extra) ── */
  wifimap: {
    what: 'Mapa global comunitario de redes WiFi compartidas, inspirado en el WiFi Map de DorkSearch: un mapa interactivo oscuro (Leaflet + tiles CARTO/OSM) donde cada punto es una red con SSID, clave, lugar, tipo de autenticación, banda y notas de la comunidad. A zoom bajo muestra clusters con el número de redes por zona; al acercarse (zoom 7+) se revelan los puntos individuales coloreados por autenticación (verde = abierta, azul = WPA2, morado = WPA3, rojo = WEP). Incluye geolocalización ("localízame"), ranking de redes más cercanas con distancia haversine, buscador por SSID/lugar, formulario para compartir redes propias, eliminación de tus aportes y export/import JSON del mapa completo.',
    params: [
      { name: 'mapa', type: 'interactivo', required: true, desc: 'zoom/pan libre; click en cluster = acercarse; click en pin = detalle de la red' },
      { name: 'localízame', type: 'botón', desc: 'usa navigator.geolocation; calcula distancias a cada red y muestra las 6 más cercanas' },
      { name: 'buscador', type: 'string', desc: 'filtra por SSID o lugar en tiempo real' },
      { name: 'compartir red', type: 'formulario', desc: 'SSID, clave, auth, banda, lugar, notas y coordenadas (botones: centro del mapa / mi ubicación)' },
      { name: 'export/import', type: 'JSON', desc: 'respalda o comparte tu mapa: la importación fusiona con tus puntos actuales (máx 2000)' },
    ],
    daily: ['Encontrar redes abiertas o compartidas en una zona antes de salir (cafeterías, bibliotecas, aeropuertos)', 'Guardar tus propios puntos WiFi de confianza con notas ("la clave cambia los lunes")', 'Planear viajar: exportar tu mapa y llevarlo al portátil sin depender de datos móviles'],
    ethical: ['Comparte SOLO redes tuyas o con permiso expreso: publicar la clave de la red de otro es facilitar un acceso ilícito', 'Las claves que ves aquí son para conectarte legítimamente, no para atacar la red: WEP en 2026 no es una invitación', 'Usa redes abiertas con VPN: cualquier persona en el radio puede escuchar tu tráfico sin cifrar', 'Los 20 puntos demo son ficticios y formativos: sirven para enseñar a leer el mapa sin exponer redes reales'],
    tips: ['La app funciona offline salvo los tiles del mapa (CARTO) y la búsqueda por geolocalización: tus datos nunca salen del navegador', 'A zoom bajo los clusters agregan por celdas geográficas: el número dentro es cuántas redes hay en esa celda', 'El color del pin indica autenticación: rojo (WEP) = red sin seguridad real, ideal para demos de por qué hay que migrar', 'Al compartir, usa "centro del mapa" para arrastrar el pin al sitio exacto sin escribir coordenadas a mano', 'El export JSON es compatible entre navegadores: puedes importarlo en otro equipo y seguir con tu mapa'],
  },

  /* ── Análisis (extra) ── */
  mitre: {
    what: 'Navegador compacto de la matriz MITRE ATT&CK Enterprise: 14 tácticas (Reconnaissance → Impact) con las técnicas más relevantes de cada una. Busca por ID o nombre, marca la cobertura de tu ejercicio/defensa clicando técnicas, y exporta una capa JSON oficial (versions layer 4.5, domain enterprise-attack, con gradiente y leyenda) lista para importar en el ATT&CK Navigator oficial y verla coloreada sobre la matriz completa.',
    params: [
      { name: 'búsqueda', type: 'string', desc: 'filtra por ID (T1003) o nombre (dumping, phishing)' },
      { name: 'cobertura', type: 'click en técnicas', desc: 'marca/desmarca técnicas cubiertas; contador en vivo' },
      { name: 'export', type: 'botón', desc: 'descarga hacknexus-attack-layer.json compatible con navigator.attack.mitre.org' },
    ],
    daily: ['Estructurar el informe de un pentest por tácticas en vez de por hallazgos sueltos', 'Planear un ejercicio red team cubriendo tácticas que normalmente se olvidan (Persistence, Collection)', 'Comunicar cobertura de detección al equipo blue con el vocabulario estándar de la industria'],
    ethical: ['El mapa mental de ATT&CK ayuda a DEFENDER: cada técnica marcada como cubierta debe tener su detección asociada', 'En threat hunting: elegir una técnica (T1003 dumping) y buscar sus indicadores en los logs (con Log Forensics)', 'Formación: recorrer la matriz explicando 1 técnica real por táctica en 30 minutos'],
    tips: ['La capa exportada se abre en el Navigator oficial (Open Existing Layer → upload) y allí puedes añadir scores/colores propios', 'La matriz aquí es compacta: si falta una técnica, búscala por ID en el Navigator oficial (attack.mitre.org)', 'Combínalo con CVE Lookup: vulnerabilidad explotada → técnica ATT&CK → detección → informe', 'Los IDs son estables: úsalos en los informes en vez de descripciones libres, y cualquiera podrá buscarlos'],
  },
}
