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
    what: 'Mapa global de redes WiFi con integración EN VIVO de la base de datos de WiGLE (Wireless Geographic Logging Engine): más de 1.000 millones de redes observadas por la comunidad war-driving global. Con unas credenciales gratuitas de wigle.net guardadas SOLO en tu navegador (localStorage), la tool consulta la API oficial v2 al mover el mapa y descarga las redes reales del viewport: BSSID, SSID, canal, banda, cifrado, nivel de señal, coordenadas exactas y última vez vista, con paginación automática y caché por sesión para no quemar el cupo diario de la API. Sin credenciales (o en modo mixto) funciona el mapa comunitario local: ~130 redes demo procedurales que se regeneran cada sesión y tus puntos propios persistentes. A zoom bajo clusters agregan por zona; al acercarse se revelan pins coloreados por autenticación (verde = abierta, azul = WPA2, morado = WPA3, rojo = WEP). Incluye geolocalización, ranking de redes cercanas por haversine, buscador, ficha enriquecida por red, export CSV de la búsqueda actual y export/import JSON del mapa local.',
    params: [
      { name: 'mapa', type: 'interactivo', required: true, desc: 'zoom/pan libre; click en cluster = acercarse; click en pin = detalle de la red' },
      { name: 'localízame', type: 'botón', desc: 'usa navigator.geolocation; calcula distancias a cada red y muestra las 6 más cercanas' },
      { name: 'credenciales WiGLE', type: 'token + user', desc: 'el token de API de wigle.net (gratuito) se guarda cifrado en localStorage y NUNCA sale hacia otro sitio; panel con probar/guardar/borrar' },
      { name: 'búsqueda WiGLE', type: 'API v2', desc: 'al terminar de arrastrar el mapa se piden las redes del viewport (bos provided, paginado, hasta 2 páginas por movimiento); resultados cacheados y mezclados con los locales' },
      { name: 'filtros', type: 'chips', desc: 'por autenticación (abierta/WEP/WPA2/WPA3) y origen (demo/tuyas/WiGLE)' },
      { name: 'buscador', type: 'string', desc: 'filtra por SSID, lugar o BSSID en tiempo real' },
      { name: 'export CSV', type: 'fichero', desc: 'descarga las redes filtradas actualmente visibles (SSID, BSSID, canal, banda, auth, señal, lat, lon, última vez vista)' },
      { name: 'compartir red', type: 'formulario', desc: 'SSID, clave, auth, banda, lugar, notas y coordenadas (botones: centro del mapa / mi ubicación)' },
      { name: 'export/import', type: 'JSON', desc: 'respalda o comparte tu mapa: la importación fusiona con tus puntos actuales (máx 2000)' },
    ],
    daily: ['Encontrar redes abiertas o compartidas en una zona antes de salir (cafeterías, bibliotecas, aeropuertos) consultando los datos reales de WiGLE', 'Reconocimiento pasivo autorizado: mapear la densidad de redes y tecnologías (WEP aún vivo, WPA3 adoptado) de una zona antes de un wardrive con permiso', 'Guardar tus propios puntos WiFi de confianza con notas ("la clave cambia los lunes") y exportarlos CSV para tus informes', 'Planear viajar: exportar tu mapa y llevarlo al portátil sin depender de datos móviles'],
    ethical: ['WiGLE es observación pasiva de señales públicas: ver una red en el mapa NO es permiso para conectarte ni atacar; sin autorización es ilícito en la mayoría de países', 'Comparte SOLO redes tuyas o con permiso expreso: publicar la clave de la red de otro es facilitar un acceso ilícito', 'Usa redes abiertas con VPN: cualquier persona en el radio puede escuchar tu tráfico sin cifrar', 'El cupo de la API es limitado y compartido: los fetch solo ocurren al soltar el mapa y quedan cacheados, no re-fetch en cada píxel de zoom', 'Los ~130 puntos demo son ficticios y se regeneran en cada carga: sirven para enseñar a leer el mapa sin exponer redes reales'],
    tips: ['Consigue el token gratis en wigle.net → account → show my token; pégalo en el panel y dale a probar: si responde OK queda guardado en tu navegador', 'El cupo gratuito se reponе a diario: la caché por sesión evita repetir fetches del mismo viewport, y puedes borrar credenciales con un click', 'A zoom bajo los clusters agregan por celdas geográficas: el número dentro es cuántas redes hay en esa celda; WiGLE se activa a partir de zoom 8 para no pedir ciudades enteras', 'El color del pin indica autenticación: rojo (WEP) = red sin seguridad real, ideal para demos de por qué hay que migrar', 'El export CSV sale ordenado por señal: útil como evidencia de wardrive autorizado con timestamp y coordenadas', 'Los tiles son Esri Dark Gray Canvas (sin API key): si algún día fallan, la tool sigue funcionando con tus puntos y el buscador'],
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

  /* ── Linux & sistema (generadores) ── */
  umaskgen: {
    what: 'Generador de umask: elige los tres dígitos (o escribe la máscara) y calcula en vivo los permisos reales que tendrán los ficheros nuevos (base 666) y los directorios (base 777), en octal y simbólico. Incluye presets habituales (022, 027, 077, 002…), tabla de qué quita cada dígito, el comando shell para aplicarla y las ubicaciones para hacerla permanente (~/.bashrc, UMask= del unit systemd, /etc/login.defs).',
    params: [
      { name: 'dígitos u/g/o', type: '0-7 ×3', required: true, desc: 'cada dígito se quita de la base; clic en los botones o entrada libre octal' },
      { name: 'presets', type: '6 valores', desc: '022 servidor clásico, 027 web apps, 077 privado total, 002/007 grupos' },
    ],
    daily: ['Decidir la umask correcta antes de desplegar un servicio que escribe ficheros', 'Entender por qué tu app crea ficheros 640 y no 600 (la umask del proceso padre)', 'Configurar homes de usuarios SFTP con 077 sin pensar dos veces'],
    ethical: ['Explicar en formación la diferencia entre chmod (concede) y umask (quita): el error clásico es "poner" umask 000 pensando en permisos', 'Demostrar el riesgo de umask 002 en servidores multiusuario: ficheros grupales escribibles por accidente', 'En hardening: la umask 027/077 es línea base CIS para servicios'],
    tips: ['Los ficheros NUNCA nacen ejecutables: la base es 666, así que x siempre lo decide el programa que crea el fichero (chmod posterior)', 'Para servicios systemd usa UMask=027 en el [Service]: la umask del usuario no aplica a demonios', 'Comprueba el efecto real con: umask 027 && touch f && mkdir d && ls -l f d'],
  },
  sudoersgen: {
    what: 'Generador de reglas sudoers (/etc/sudoers.d/) con construcción de la línea completa (usuario, host, run-as, tags, comando) y análisis automático de riesgos: detecta comandos con shell escape (GTFOBins: vim, less, awk, find, python…), wildcards peligrosos, rutas relativas que el usuario puede secuestrar por PATH, metacaracteres frágiles y la combinación NOPASSWD+ALL. Incluye presets buenos y uno deliberadamente inseguro para formación.',
    params: [
      { name: 'usuario/grupo', type: 'string', required: true, desc: 'deploy, %despliegues… el prefijo % indica grupo' },
      { name: 'host', type: 'string', desc: 'ALL en la mayoría de setups; hostname para reglas multi-máquina' },
      { name: 'run-as', type: 'string', desc: 'usuario objetivo: root, postgres, www-data o usuario:grupo' },
      { name: 'comando', type: 'string (ruta absoluta)', required: true, desc: 'se recomienda absoluta: relativa = resolución por PATH del usuario' },
      { name: 'tags', type: 'toggles', desc: 'NOPASSWD, SETENV, NOEXEC, LOG_OUTPUT — el análisis reacciona a cada uno' },
    ],
    daily: ['Dar a DevOps permiso de reiniciar exactamente un servicio sin abrir el teléfono', 'Delegar lecturas de logs con NOEXEC para bloquear el shell-out desde paginadores', 'Documentar qué puede ejecutar cada rol (la línea generada es autoexplicativa)'],
    ethical: ['El análisis enseña el catálogo GTFOBins en contexto: cada aviso cita por qué la regla es un vector', 'En auditorías: lanzar sudo -l y contrastar con los avisos de esta tool para priorizar hallazgos', 'El preset inseguro (vim * + NOPASSWD) es material de formación: muéstralo en la revisión y propón la alternativa'],
    tips: ['SIEMPRE valida con visudo -c antes de salir de la sesión root actual: un sudoers roto te deja sin root', 'NOPASSWD no es malo per se: es malo en ALL o en comandos con shell escape', 'NOEXEC dificulta (no imposibilita) el escape: es defensa en profundidad, no garantía', 'sudoers.d con chmod 440: los permisos importan tanto como el contenido'],
  },
  systemdgen: {
    what: 'Generador de units de systemd en tres pestañas: service (con bloque de hardening opcional: ProtectSystem=strict, NoNewPrivileges, MemoryDenyWriteExecute, CapabilityBoundingSet…), timer (OnCalendar con presets, Persistent y RandomizedDelaySec) y mount (What/Where/Type/Options para NFS/CIFS). Cada unit se genera con sus comandos de activación (daemon-reload, enable --now) y verificación (systemctl status, list-timers, systemd-analyze security).',
    params: [
      { name: 'nombre/desc/exec', type: 'string', required: true, desc: 'identidad del unit; ExecStart debe ser ruta absoluta' },
      { name: 'User/Group', type: 'string', desc: 'vacío o root = corre como root: el veredicto lo marca en rojo' },
      { name: 'Restart', type: 'no | on-failure | always…', desc: 'política de reinicio con RestartSec=3 fijo' },
      { name: 'hardening', type: 'toggle', desc: 'añade 12 directivas de sandbox; systemd-analyze security lo premia' },
      { name: 'OnCalendar', type: 'string', desc: 'formato calendario systemd: presets de diario/hora/15min/semanal/mensual' },
    ],
    daily: ['Convertir un script de cron legacy en un timer con Persistent=true (sobrevive apagados)', 'Empaquetar una app interna con usuario dedicado y sandbox en lugar de correr como root', 'Montar un share NFS/CIFS con unit .mount en vez de fstab (mismos datos, mejor logging)'],
    ethical: ['El veredicto de User=root + ruta escribible enseña el vector ExecStart hijacking (T1543.002) antes de que ocurra', 'En CTFs: systemctl cat de units sospechosos y contrastar con los avisos de esta tool', 'El hardening generado corresponde a recomendaciones CIS/baseline: úsalo en informes como remediación concreta'],
    tips: ['systemd-analyze security SERVICIO da una puntuación 0-10: pruébalo antes y después del hardening', 'Los timers no sustituyen cron 1:1: OnCalendar=:0/15 y hourly ya cubren el 90% de casos', 'El nombre del .mount se deriva del punto de montaje: /mnt/datos → mnt-datos.mount (escapes de systemd para \ y espacios no están soportados aquí: es una aproximación)', 'Después de editar a mano: daemon-reload SIEMPRE, o estarás probando la versión vieja'],
  },
  ntfsperm: {
    what: 'Generador de permisos NTFS: construye comandos icacls a partir de ACEs visuales (grant/deny × principal × derecho × herencia OI/CI/IO/NP), con presets de casos reales (carpeta compartida, web root IIS, drop folder, antipatrón mundo-escribible), opciones de herencia (/inheritance:r y :d) y recursividad (/t /c). Incluye análisis de riesgo (full-control a grupos amplios = privesc por reemplazo de binarios), tabla de derechos con su ≈chmod y doble tabla de equivalencias chmod↔icacls y setfacl↔icacls.',
    params: [
      { name: 'ruta', type: 'string', required: true, desc: 'C:\carpeta o fichero concreto' },
      { name: 'ACEs', type: 'lista editable', desc: 'tipo, principal (con autocompletado), derecho F/M/RX/R/W…, herencia por botones' },
      { name: '/t /c', type: 'toggle', desc: 'recursivo y continuar-ante-errores' },
      { name: '/inheritance:r | :d', type: 'toggle', desc: 'cortar herencia o convertirla a explícita' },
    ],
    daily: ['Preparar el comando exacto antes de tocar permisos de una carpeta compartida de producción', 'Documentar el modelo de permisos de un despliegue IIS (IIS_IUSRS lectura, admins control)', 'Migrar permisos entre entornos con /save y /restore en lugar de rehacer a mano'],
    ethical: ['El antipatrón Everyone:F se incluye a propósito: es EL vector de privesc por reemplazo de binario de servicios', 'En pentest Windows: icacls sobre binarios de servicios y carpetas de Program Files para encontrar escrituras', 'Las ACEs de deny se evalúan primero: úsalas para entender hallazgos confusos de accesos, no como solución por defecto'],
    tips: ['Respaldar SIEMPRE antes: icacls ruta /save acl.txt /t /c (y /restore para volver)', 'No existe SUID en NTFS: la "escalada" equivalente es un servicio/tarea con cuenta privilegiada y binario modificable', 'Get-Acl | fl AccessToString da la misma info en PowerShell: útil para scripts de auditoría', 'Las herencias (OI)(CI) son la diferencia entre tocar una carpeta y tocar sus 10.000 ficheros: piénsalo antes de /t'],
  },
  winlog: {
    what: 'Referencia accionable de Event IDs de Windows (Security/System): cada evento explica qué es, cómo lo usa un atacante (logon types, Kerberoasting en 4769, borrado de logs 1102, cambios de política 4719…) y cómo convertirlo en detección concreta. Con filtros por categoría y un bloque de queries PowerShell listas (top IPs de fuerza bruta en 4625, RDP en 4624, alerta de 1102).',
    params: [
      { name: 'búsqueda', type: 'string', desc: 'por número (4625), servicio (kerberos) o técnica (kerberoast)' },
      { name: 'categorías', type: 'chips', desc: 'logins, cuentas/grupos, privilegios, política, borrado de logs, otros' },
      { name: 'queries PS', type: 'CopyBlock', desc: 'tres consultas Get-WinEvent copiables para el SIEM o triage manual' },
    ],
    daily: ['Justificar en un informe por qué un evento concreto merece alerta (ID + criterio + query)', 'Triage de un incidente: qué IDs mirar primero y qué patrón es sospechoso', 'Configurar reglas del SIEM con criterio citable en vez de frases genéricas'],
    ethical: ['Blue team: cada tarjeta es una regla de detección en miniatura (ataque → señal → query)', 'En formación: la pareja 4625/4624 enseña fuerza bruta desde el lado de la defensa', 'Los eventos 1102 y 4719 son las dos "pestañas rojas" anti-forense: si aparecen sin cambio planificado, es incidente'],
    tips: ['El Logon Type del 4624 lo explica todo: 2=consola, 3=red, 5=servicio, 10=RDP; un 10 desde una IP de servidores es oro forense', 'Kerberoasting = muchos 4769 con etype RC4 (0x17) desde un solo usuario en minutos', 'wevtutil qe Security /c:20 /rd:true /f:text es el equivalente CLI rápido si no tienes PS', 'Los IDs cambian poco entre versiones: esta referencia sirve de Win10 a Server 2025'],
  },
  ports: {
    what: 'Tabla curada de ~65 puertos y servicios con cuatro capas por fila: qué es (descripción honesta), por qué importa en pentest (ángulo ofensivo clásico: default creds, CVE, técnica), grupo temático (web, acceso remoto, AD, bases de datos, correo, ficheros, infraestructura) y protocolo. Buscador por número/servicio/técnica y filtros por grupo. Pensada como memoria de consulta entre nmap y el informe.',
    params: [
      { name: 'búsqueda', type: 'string', desc: 'número (443), servicio (smb) o técnica (kerberoast, EternalBlue…)' },
      { name: 'grupos', type: 'chips', desc: 'web, remote, ad, db, mail, files, infra, misc' },
    ],
    daily: ['Interpretar la salida de nmap: qué significa cada puerto abierto en contexto', 'Priorizar un escaneo: qué puertos UDP valen la pena (161 SNMP, 69 TFTP, 53 DNS)', 'Explicar al cliente por qué su Redis 6379 expuesto es crítico, con el ángulo de ataque exacto'],
    ethical: ['Cada fila recuerda el ángulo de ataque pero el uso real exige autorización: la tabla es conocimiento, no permiso', 'Útil en bug bounty para mapear superficie de ataque del scope y citar puertos en los reportes', 'En defensas: contrastar esta lista con tu inventario de puertos expuestos (attack surface review)'],
    tips: ['--top-ports 1000 cubre el 95% de los casos; -p- (65535) solo en targets que lo merecen', 'UDP es lento porque no responde si no está abierto: --top-ports 50 -sU es el compromiso razonable', 'Los puertos 5985/5986 (WinRM) son la vía rápida de lateral movement en Windows con evil-winrm', '445 (SMB) cerrado a internet debería ser política: casi todo el catálogo de exploits de AD pasa por ahí'],
  },
  dorkgen: {
    what: 'Arsenal de ~35 dorks organizados por motor y objetivo: Google (exposición de ficheros, logins y tecnología), Bing (variante distinta de indexado), GitHub (secretos filtrados: .env, id_rsa, AKIA, .npmrc), Shodan (superficie expuesta por org/ASN/hostname/puerto) y Censys (inventario por DNS/certificado). Campo de objetivo que reescribe todos los dorks de golpe, buscador, y cada dork con botón de copiar y de abrir la búsqueda real en el motor.',
    params: [
      { name: 'objetivo', type: 'string', required: true, desc: 'dominio que sustituye objetivo.com en todos los dorks' },
      { name: 'motor', type: 'chips', desc: 'todos, Google, Bing, GitHub, Shodan, Censys' },
      { name: 'búsqueda', type: 'string', desc: 'filtra por texto del dork o descripción' },
    ],
    daily: ['OSINT pre-auditoría: qué dice internet de tu cliente antes de tocar nada', 'Self-assessment: correr los dorks de GitHub contra tu organización y llorar a tiempo', 'Inventario rápido de subdominios indexados y paneles expuestos'],
    ethical: ['Solo sobre activos propios o con autorización (bug bounty in-scope): el dorking es pasivo pero el uso de los hallazgos no lo es', 'La herramienta no visita el objetivo: solo construye búsquedas en motores públicos', 'Los dorks de secretos de GitHub son la demo perfecta de por qué escanear repos ANTES de push es política'],
    tips: ['En Shodan, org: mejor que hostname: un ASN entero con http.favicon.hash: para paneles concretos', 'Los operadores cambian: intext/intitle funcionan igual en Google y Bing, pero ip: solo en Bing', 'Combínalo con HTTP Inspector y URL Phishing Inspector para analizar los hallazgos sin tocarlos', 'site:*.dominio.com -www es el dork de subdominios más infravalorado'],
  },

  /* ── Ronda 6: Linux, Windows, blue team y generadores ── */
  fstabgen: {
    what: 'Construye /etc/fstab correcto y sin sustos: entradas editables, presets por escenario (raíz, /home, /tmp con noexec, swap, NFS, CIFS, tmpfs) y validador que detecta los errores clásicos — credenciales inline en NFS/CIFS, suid en montajes escribibles, opciones rotas, fsck en tmpfs.',
    params: [
      { name: 'entradas', type: 'tabla', required: true, desc: 'spec (UUID/LABEL/ruta), punto de montaje, tipo, options, dump y pass nº' },
      { name: 'presets', type: 'botones', desc: 'añaden entradas ya listas: ext4 raíz, tmpfs /tmp con noexec, NFS4, CIFS con credenciales externas' },
      { name: 'generar', type: 'texto', desc: 'fstab completo con comentario de cabecera, listo para /etc/fstab' },
    ],
    daily: ['Montar un disco externo de forma permanente sin romper el boot', 'Montar un share de la NAS (CIFS/NFS) con credenciales fuera del fstab (credentials=)', 'Migrar a SSD: cambiar UUIDs con lsblk -f y regenerar el fstab limpio'],
    ethical: ['Un fstab mal hecho es un privesc: opciones user,suid,exec en unidades montables permiten root directo', 'Auditar fstab de un cliente es tarea estándar: busca suid en montajes escribibles y credenciales inline', 'tmpfs con noexec,nosuid en /tmp, /dev/shm y /var/tmp es recomendación CIS que esta tool aplica en un click'],
    tips: ['Valida SIEMPRE con findmnt --verify antes de reboot: esta tool te lo recuerda', 'Si te equivocas y no arranca: initramfs → mount -o remount,rw / y corrige el fichero', 'Añade x-systemd.device-timeout=5s a volúmenes externos para que el boot no se cuelgue si los desconectas'],
  },
  sysctlgen: {
    what: 'Catálogo explicado de ~30 claves sysctl de hardening (anti-spoofing, ICMP, TCP, kernel, memoria) con valor recomendado, advertencia de impacto y generador de conf para /etc/sysctl.d/99-hardening.conf con perfiles servidor, desktop y host Docker.',
    params: [
      { name: 'catálogo', type: 'tabla', required: true, desc: 'cada clave con valor, explicación y tono (ok/info/warn)' },
      { name: 'perfil', type: 'select', desc: 'ajusta los valores según el rol de la máquina (servidor expuesto, desktop, host de contenedores)' },
      { name: 'generar', type: 'texto', desc: 'conf comentada lista para aplicar con sysctl --system' },
    ],
    daily: ['Endurecer el stack de red de un VPS recién estrenado', 'Preparar una máquina para certificación o auditoría CIS', 'Entender qué hace cada clave ANTES de copiarla de un blog'],
    ethical: ['rp_filter e icmp_echo_ignore_broadcasts son defensas directas contra ataques clásicos (smurf, IP spoofing)', 'Un sysctl mal entendido puede aislar la máquina: la tool advierte del impacto antes de aplicar', 'En pentests defensivos, comparar el sysctl actual contra el catálogo es un hallazgo de informe inmediato'],
    tips: ['Aplica con sysctl --system y revisa qué claves no existen en tu kernel: no todas las series están disponibles', 'kernel.unprivileged_userns_clone=0 rompe Docker sin root y algunos sandbox: lee la advertencia', 'Guarda el original: cp /etc/sysctl.conf /etc/sysctl.conf.bak y revierte con sysctl -p del backup'],
  },
  sshharden: {
    what: 'Generador de sshd_config endurecido con explicación directa de cada directiva: solo claves (sin contraseñas), sin root, cifrados AEAD actuales, límites de sesión, sin forwarding innecesario y banner legal. Grupos básico/auth/crypto/limits con toggles.',
    params: [
      { name: 'opciones', type: 'toggles', required: true, desc: 'cada directiva con valor y explicación de por qué importa' },
      { name: 'AllowUsers/Groups', type: 'lista', desc: 'restringe quién puede entrar: la medida anti-brute-force más efectiva que existe' },
      { name: 'generar', type: 'texto', desc: 'sshd_config completo + comandos de verificación' },
    ],
    daily: ['Endurecer el SSH de un VPS en 2 minutos sin romper nada', 'Aplicar la guía de cifrados de Mozilla OpenSSH o la salida de ssh-audit', 'Preparar máquinas para auditoría: banner legal, MaxAuthTries, login grace time'],
    ethical: ['PasswordAuthentication no es solo molestia: un SSH con claves elimina el 100% del brute-force de credenciales', 'PermitRootLogin no prohíbe ser root: prohíbe que los bots adivinen la contraseña de root', 'En CTFs/lab verás la diferencia: sshd endurecido resiste una clase entera de ataques'],
    tips: ['Antes de reiniciar: sshd -t valida la sintaxis, y deja una sesión abierta de emergencia', 'Cambia el puerto por ruido, no por seguridad: corta el ruido real con AllowUsers y fail2ban', 'Si usas claves ED25519 no necesitas KbdInteractive ni PasswordAuthentication para nada'],
  },
  nftgen: {
    what: 'Generador de rulesets nftables con mínimo privilegio: policy drop, established/related primero, rate limit SSH, loopback y reglas por servicio con explicación de cada acción. Presets web server, home server y workstation.',
    params: [
      { name: 'reglas', type: 'tabla', required: true, desc: 'proto, puerto, origen CIDR, acción (accept/drop/reject/log-drop/limit-drop)' },
      { name: 'presets', type: 'botones', desc: 'web server (80/443), home server (SSH + Samba), workstation (salida full)' },
      { name: 'generar', type: 'texto', desc: 'ruleset completo con flush, tabla inet y comentarios por regla' },
    ],
    daily: ['Firewall de un VPS sin instalar nada (nftables viene en el kernel)', 'Reemplazar un iptables legacy por nft limpio y legible', 'Rate-limit de SSH: bloquear brute force sin fail2ban'],
    ethical: ['La política drop por defecto es la base del mínimo privilegio: lo que no está explícito, cae', 'El rate limit de SSH ralentiza brute force sin sacrificar accesibilidad legítima', 'Un ruleset con comentarios es documentación viva: en auditorías se lee el firewall como código'],
    tips: ['Prueba con nft -c -f ruleset.nft (check) antes de cargar: si te equivocas con SSH, el lockout es real', 'nft -f ruleset.nft no es persistente: si pierdes acceso, un reboot lo revierte todo', 'La tabla inet cubre IPv4+IPv6 a la vez: un solo ruleset para ambos mundos'],
  },
  wgquick: {
    what: 'Generador de configuración WireGuard completa: servidor y N peers con claves generadas localmente (WebCrypto, nunca salen del navegador), AllowedIPs explicado (0.0.0.0/0 = túnel completo vs subredes), MTU, keepalive para NAT y bloque de firewall/NAT del servidor para salida a internet.',
    params: [
      { name: 'servidor', type: 'formulario', required: true, desc: 'endpoint, puerto UDP, subred del túnel (10.x.x.x/24 típico)' },
      { name: 'peers', type: 'tabla', desc: 'uno por cliente/dispositivo: nombre, AllowedIPs propios y claves autogeneradas' },
      { name: 'generar', type: 'texto', desc: 'wg0.conf del servidor + wg0.conf de cada peer + comandos de arranque' },
    ],
    daily: ['Tu VPN personal para salir por casa desde cualquier lugar', 'Acceder a servicios internos de tu lab (homelab) desde fuera', 'Conectar dos redes domésticas de forma segura sin hardware extra'],
    ethical: ['Un túnel propio cifrado es la respuesta correcta al WiFi abierto: tu tráfico no viaja en claro', 'Administración remota, acceso a homelab, WiFi hostil: los usos legítimos de una VPN propia sobran', 'Con 0.0.0.0/0 TODO tu tráfico pasa por tu servidor: confía en él o usa AllowedIPs de subredes'],
    tips: ['Las claves se generan en tu navegador con WebCrypto y NUNCA se envían: nada de generadores online de claves', 'MTU 1420 evita el blackhole típico en PPPoE/4G: si "conecta pero no navega", baja MTU', 'PersistentKeepalive=25 solo en peers tras NAT: mantiene el agujero abierto en el router del cliente'],
  },
  winfirewall: {
    what: 'Generador de reglas de Windows Defender Firewall con netsh advfirewall: entrada/salida, allow/block, TCP/UDP/ICMP, puertos, programa o IPs remotas, con presets (RDP restringido, WinRM, SMB, SQL, HTTP) y detección de reglas peligrosas (allow any-any, RDP abierto a Internet).',
    params: [
      { name: 'reglas', type: 'tabla', required: true, desc: 'nombre, dirección, acción, proto, puertos, programa, remoteip' },
      { name: 'presets', type: 'botones', desc: 'RDP solo de LAN, WinRM HTTP(S), SMB de subred, SQL desde app server' },
      { name: 'generar', type: 'texto', desc: 'script netsh completo en orden correcto + nota de verificación' },
    ],
    daily: ['Abrir un puerto a una app concreta sin dejar "cualquiera-any" abierto', 'Restringir RDP de tu equipo a la VPN/subred corporativa', 'Documentar el firewall como script versionable en vez de clicks en el GUI'],
    ethical: ['Las reglas allow any-any son el "chmod 777" de Windows: la tool las señala con explicación', 'RDP abierto a Internet es el vector #1 de ransomware: la tool advierte si remoteip=any en 3389', 'El script es idempotente (con delete previo): se puede versionar y reaplicar en todo el parque'],
    tips: ['netsh advfirewall sigue siendo la forma más fiable de scriptar el firewall de Windows', 'Limita remoteip a la subred o VPN: un puerto abierto a la LAN no es lo mismo que a Internet', 'Comprueba con Get-NetFirewallRule -Enabled True | measure: si tienes 400 reglas, alguien las fue acumulando'],
  },
  schtasks: {
    what: 'Creador de tareas programadas de Windows en dos dialectos (schtasks CMD y Register-ScheduledTask PowerShell) con triggers daily/weekly/onstart/onlogon/onidle, run level, y — lo especial — sección de Detección: los event IDs que delatan una tarea maliciosa y cómo se abusa de ellas (MITRE T1053.005).',
    params: [
      { name: 'tarea', type: 'formulario', required: true, desc: 'nombre, trigger (daily/weekly/onstart/onlogon/onidle), hora, días, acción y argumentos' },
      { name: 'run level', type: 'select', desc: 'limited o highest (con privilegios altos, más visible para el SOC)' },
      { name: 'detección', type: 'panel', desc: 'eventos 4698/4699/4700/4702 y 106/200/201 con los patrones a vigilar' },
    ],
    daily: ['Automatizar backups, limpieza de temp o scripts de mantenimiento', 'Ejecutar un script al arrancar sin depender de la carpeta Startup', 'Documentar tareas programadas como código (PowerShell versionable)'],
    ethical: ['Las tareas programadas son la persistencia #1 en Windows junto a Run keys: entenderlas es entender cómo te atacan', 'En red team autorizado, una tarea visible en 4698 con script en TEMP es EXACTAMENTE lo que debe detectar el SOC', 'En blue team: 4702 (tarea actualizada) es oro puro — el malware actualiza su tarea al cambiar de payload'],
    tips: ['schtasks /create /sc onlogon /ru SYSTEM requiere admin y es MUY visible: úsalo solo si lo necesitas de verdad', 'Register-ScheduledTask es más potente (triggers múltiples, condiciones) pero schtasks está incluso en Server Core', 'Para auditar tareas existentes: Get-ScheduledTask | Where State -ne Disabled — sorpresas garantizadas'],
  },
  winharden: {
    what: 'Checklist de hardening de Windows con ~25 controles (LSA protection, credenciales en memoria, LLMNR/NetBIOS, SMB signing, telemetría, RDP, UAC, PowerShell constraining, macros de Office…) cada uno con justificación, comando de aplicación, verificación y reversión.',
    params: [
      { name: 'controles', type: 'toggles', required: true, desc: 'cada uno con descripción del ataque que mitiga' },
      { name: 'generar', type: 'texto', desc: 'script .ps1 o .reg completo con comentarios y secciones' },
    ],
    daily: ['Endurecer una estación de trabajo nueva en minutos', 'Preparar una VM de análisis de malware más resistente', 'Baseline de servidores Windows sin desplegar InTune ni GPO complejas'],
    ethical: ['LSA Protection y RunAsPPL son la defensa directa contra mimikatz: sin ellas, cualquier admin lee credenciales de memoria', 'Desactivar LLMNR/NBT-NS elimina el poisoning de Responder: el ataque más fácil de toda auditoría interna', 'Cada control explica el ataque que mitiga: es hardening entendido, no copiado'],
    tips: ['Aplica por fases y verifica: un control mal aplicado (ej. RunAsPPL) puede romper flujos legítimos de servicio', 'CredentialGuard requiere Enterprise/Educación: la tool avisa si tu edición no lo soporta', 'Reversión documentada: cada control tiene su comando de undo para poder probar sin miedo'],
  },
  pslab: {
    what: 'Recetario de one-liners de PowerShell organizados por dominio (sistema, red, disco, procesos, servicios, registro, usuarios y blue team), cada uno con explicación de la trampa o detalle fino que lo diferencia del comando obvio.',
    params: [
      { name: 'buscador', type: 'string', required: true, desc: 'filtra por texto del comando o descripción' },
      { name: 'categorías', type: 'chips', desc: 'sistema, red, disco, procesos, servicios, registro, usuarios, blue team' },
    ],
    daily: ['Administrar Windows sin abrir el GUI: procesos, servicios, discos, red', 'Inventario rápido de software, usuarios locales y shares de una máquina', 'Blue team: sesiones interactivas, tareas con binaries raros, logs recientes'],
    ethical: ['Los one-liners de red (Get-NetTCPConnection, Get-SmbShare) son el reconocimiento interno más rápido', 'Los de blue team (procesos con parent raro, tareas con binarios en TEMP) son detección inmediata en un incidente', 'Get-LocalUser y net user son el primer paso tras un acceso: saber quién existe en la máquina'],
    tips: ['Si un cmdlet no existe, probablemente falte importar el módulo: Import-Module y Get-Command son tus amigos', 'En PowerShell 7 (pwsh) varios cmdlets cambian: la tool indica la variante cuando importa', 'Cuidado con Remove-Item -Force -Recurse: PowerShell no tiene papelera: verifica el path dos veces'],
  },
  regtweaks: {
    what: 'Catálogo de tweaks del registro de Windows por categoría (telemetría, privacidad, rendimiento, hardening, calidad de vida) con ruta exacta, valor, tipo, explicación de qué toca, reversión y export a .reg completo listo para fusionar.',
    params: [
      { name: 'tweaks', type: 'toggles', required: true, desc: 'cada uno con explicación y nivel de riesgo' },
      { name: 'export .reg', type: 'fichero', desc: 'fichero .reg con solo los tweaks activos, con comentario de cabecera' },
    ],
    daily: ['Desactivar telemetría y publicidad de Windows 10/11', 'Deshabilitar Cortana/Copilot, sugerencias de inicio y apps preinstaladas', 'Cambios persistentes sin GPO en máquinas sin dominio'],
    ethical: ['La telemetría de Windows es un problema real de privacidad: saber exactamente qué clave toca es defensa', 'Varias de estas claves son EXACTAMENTE las que un atacante toca para desactivar Defender: conocerlas es detectarlas', 'En auditorías, comparar claves de telemetría contra este catálogo es baseline de privacidad en minutos'],
    tips: ['Exporta el .reg y revísalo antes de fusionar: regedit no avisa de nada', 'Muchos tweaks requieren reiniciar Explorer o reboot para aplicarse: el export incluye la nota', 'Haz backup del estado actual con reg export antes de tocar nada'],
  },
  iocextract: {
    what: 'Extrae indicadores de compromiso de cualquier texto pegado: IPs (excluyendo privadas opcional), dominios y subdominios, URLs, hashes MD5/SHA1/SHA256, CVEs, emails, wallets Bitcoin/Ethereum, mutexes estilo {GUID} y técnicas MITRE Txxxx — con contexto de la línea donde apareció y enlaces de análisis a VirusTotal, AbuseIPDB y más.',
    params: [
      { name: 'texto', type: 'textarea', required: true, desc: 'informe, log, tweet, email, salida de sandbox: cualquier texto' },
      { name: 'opciones', type: 'toggles', desc: 'excluir IPs privadas, deduplicar, defang automático' },
      { name: 'export', type: 'fichero', desc: 'CSV con tipo, valor, contexto y enlaces de enriquecimiento' },
    ],
    daily: ['Procesar un informe de threat intel y quedarte con los IOCs accionables', 'Extraer todos los IOCs de un hilo de un investigador en X/Twitter', 'Homogeneizar IOCs de múltiples fuentes en un CSV para el SIEM'],
    ethical: ['El defang automático (1.2.3.4 → 1.2.3[.]4) permite compartir IOCs sin riesgo de clic accidental', 'El contexto de cada IOC ayuda a evitar falsos positivos: un hash en un changelog no es un IOC', 'Todo local: pegas informes de terceros sin enviarlos a ningún servicio online'],
    tips: ['Combínalo con Defanger para el sharing seguro y con CVE Lookup para el enriquecimiento', 'Los dominios se extraen por TLD conocido: si un TLD es raro, revisa que no sea falso positivo', 'Para IOCs dentro de un PDF: File Analyzer + este extractor y tienes el flujo completo'],
  },
  loganonymize: {
    what: 'Pseudonimiza logs y ficheros de configuración para compartirlos sin exponer datos: IPs consistentes (misma IP → mismo alias), usuarios, hostnames, dominios y emails, con mapa de pseudónimos visible para revisar, revertir o explicar, y detección de tokens/secretos para redactar.',
    params: [
      { name: 'entrada', type: 'textarea', required: true, desc: 'log, config, correo, salida de consola: cualquier texto' },
      { name: 'qué anonimizar', type: 'toggles', desc: 'IPs, usuarios, hostnames, dominios, emails, tokens' },
      { name: 'mapa', type: 'panel', desc: 'tabla original → alias para revisar o revertir' },
    ],
    daily: ['Pedir ayuda en un foro o issue de GitHub sin exponer tu infraestructura real', 'Adjuntar logs a un ticket con terceros sin filtrar IPs de clientes', 'Publicar una configuración como ejemplo en un blog o charla'],
    ethical: ['Compartir logs con IPs reales de clientes en un foro público es fuga de datos: pseudonimizar es la práctica correcta', 'La consistencia (misma IP → mismo alias) preserva el valor forense del log sin exponer nada', 'La detección de secretos (claves API, tokens) evita publicar credenciales por accidente'],
    tips: ['La pseudonimización es CONSISTENTE: la misma IP siempre obtiene el mismo alias, el log sigue siendo analizable', 'Guarda el mapa si vas a continuar la conversación: necesitarás los mismos alias la próxima vez', 'Para logs enormes, anonimiza la sección problemática y pega solo esa'],
  },
  userosint: {
    what: 'Investigación pasiva de un alias de usuario: URLs de perfil en ~20 plataformas (GitHub, X, Reddit, Instagram, Twitch, Steam, Mastodon…), análisis del patrón del alias (contiene año, separadores, leet), variantes sugeridas para buscar (sin año, con años 1980-2010, leet, guiones) y dorks listos para Google y GitHub.',
    params: [
      { name: 'alias', type: 'string', required: true, desc: 'usuario a investigar: sin @, tal como aparece' },
      { name: 'plataformas', type: 'enlaces', desc: 'cada una abre la URL de perfil directamente para verificación manual' },
      { name: 'dorks', type: 'enlaces', desc: 'búsquedas listas para Google y GitHub con el alias y sus variantes' },
    ],
    daily: ['Verificar qué expone de ti una búsqueda de tu propio alias (auto-OSINT)', 'Elegir un alias nuevo: comprobar que no colisiona con alguien existente', 'Recuperar tus propias cuentas antiguas: dónde te registraste con ese nombre'],
    ethical: ['Todo es pasivo: se generan URLs, no hay scraping ni contacto con el sujeto', 'Un alias NO es una identidad legal: no lo uses para doxxing ni acoso, jamás', 'En pentest con autorización, el OSINT de usuario es legítimo; sin ella, no lo es'],
    tips: ['La verificación de existencia es manual a propósito: el clickthrough evita baneos y falsos positivos automáticos', 'Si el alias contiene año, prueba las variantes sin año y con otros años: es la mutación más común', 'Combina con Dork Arsenal para profundizar en dominios de la organización, no solo el alias'],
  },
  sysmonbuilder: {
    what: 'Generador de configuración XML de Sysmon con perfiles esencial/completo/mínimo, toggles por evento, hashes SHA256+imphash y exclusiones de ruido. Lo especial: cada evento viene con su guía ofensiva (para qué lo usa un atacante) y defensiva (qué buscar) — conocimiento de SOC destilado en la tool.',
    params: [
      { name: 'perfil', type: 'select', required: true, desc: 'esencial (recomendado), completo (SIEM), mínimo (endpoints antiguos)' },
      { name: 'eventos', type: 'toggles', desc: 'activa/desactiva cada ID con su explicación' },
      { name: 'exclusiones', type: 'lista', desc: 'procesos de ruido conocido que no quieres loguear' },
      { name: 'generar', type: 'texto', desc: 'sysmon-config.xml listo para sysmon64.exe -i' },
    ],
    daily: ['Montar visibilidad de procesos, red y registro en endpoints de tu lab', 'Preparar una demo de detección (simulación → alerta) para formación', 'Baseline de Sysmon para un parque pequeño sin desplegar GPO'],
    ethical: ['Sysmon es telemetría defensiva: genera logs, no analiza ni bloquea nada', 'La guía ofensiva de cada evento enseña el ataque para detectarlo, no para ejecutarlo', 'En un CTF azul, la diferencia entre detectar o no un T1055 es tener el evento 8 activo'],
    tips: ['Empieza con el perfil esencial y escala con sysmon-modular cuando tu SIEM aguante el volumen', 'Event 10 contra lsass con GrantedAccess específicos es la detección de mimikatz más simple que existe', 'Redirige los logs a tu SIEM con Winlogbeat: Sysmon solo escribe localmente'],
  },
  wordlistgen: {
    what: 'Generador de wordlists dirigidas a partir de datos del objetivo (empresa, nombres, mascotas, hobbies, años, ciudad) con las mutaciones que la gente realmente usa: capitalizar, leet básico, sufijos de año y símbolos, separadores — estadísticas de contraseñas reales destiladas en reglas.',
    params: [
      { name: 'datos del objetivo', type: 'formulario', required: true, desc: 'empresa, nombres de empleados, mascotas, hobbies, ciudad, años' },
      { name: 'mutaciones', type: 'toggles', desc: 'capitalizar, leet, sufijos año, sufijos !, separadores' },
      { name: 'export', type: 'fichero', desc: 'txt con una candidata por línea lista para hashcat/john' },
    ],
    daily: ['Auditar las contraseñas de TU organización (con autorización) antes de que lo haga otro', 'Demostrar en formación por qué "Empresa2024!" no es una contraseña fuerte', 'Generar listas para tu propio lab sin descargar rockyou'],
    ethical: ['Solo en auditorías con autorización expresa y por escrito: usarla contra sistemas ajenos es delito', 'El objetivo educativo es mostrar que las contraseñas "personales" son las primeras en caer', 'En informes, la evidencia es el patrón, no la lista: reporta hallazgos, no contraseñas'],
    tips: ['Las mutaciones de sufijos de año + ! cubren un porcentaje enorme de contraseñas corporativas reales', 'Combínala con reglas de hashcat (best64.rule) para multiplicar la cobertura', 'Cuanto más específicos los datos (nombres reales de empleados), más efectiva: y más éticamente sensible'],
  },
  pwpolicy: {
    what: 'Generador de políticas de contraseñas coherentes entre Linux (pam_pwquality + login.defs) y Windows (fine-grained password policy en PowerShell) según NIST 800-63B: longitud sobre complejidad, sin rotación forzada sin evidencia, blacklist de filtraciones, bloqueo progresivo — con el por qué de cada decisión.',
    params: [
      { name: 'parámetros', type: 'formulario', required: true, desc: 'longitud mínima, clases requeridas, historial, bloqueo, edad' },
      { name: 'presets', type: 'select', desc: 'NIST moderno, corporativo clásico, alto secreto' },
      { name: 'generar', type: 'texto', desc: 'salidas Linux (pam + login.defs) y Windows (PowerShell) coherentes entre sí' },
    ],
    daily: ['Actualizar la política de contraseñas de tu organización al estándar actual', 'Dejar de forzar rotaciones de 30 días que acaban en Password1!', 'Baseline coherente en entornos mixtos Linux+Windows'],
    ethical: ['Las políticas de complejidad+rotación obligatoria empujan a patrones predecibles: NIST 800-63B lo documenta con datos', 'Una buena política es defensa masiva con coste cero: un click genera ambas configuraciones', 'Blacklist de filtraciones (HIBP k-anonymity) es la medida anti-Password1! más efectiva que existe'],
    tips: ['La longitud mínima de 12-16 gana a complejidad con 8: la entropía escala exponencialmente con la longitud', 'La rotación forzada solo tiene sentido tras evidencia de compromiso, no por calendario', 'En AD, las fine-grained policies requieren Windows Server 2008 domain functional level o superior'],
  },
  pentestreport: {
    what: 'Constructor de informes de pentest: hallazgos con severidad, evidencia, impacto, remediación y referencias, con datos del encargo (cliente, fechas, alcance, metodología) y export a Markdown completo con portada, resumen ejecutivo, tabla de hallazgos por severidad y detalle de cada uno.',
    params: [
      { name: 'datos del encargo', type: 'formulario', required: true, desc: 'cliente, fechas, alcance, metodología' },
      { name: 'hallazgos', type: 'tabla', desc: 'título, severidad, CVSS opcional, activo, evidencia, impacto, remediación' },
      { name: 'export', type: 'fichero', desc: 'Markdown completo listo para convertir a PDF con pandoc' },
    ],
    daily: ['Documentar hallazgos de una auditoría web o de red mientras los descubres', 'Generar el entregable en Markdown y convertirlo a PDF con pandoc', 'Reutilizar la estructura en múltiples encargos con consistencia'],
    ethical: ['Un informe profesional es la parte más importante de un pentest: sin documentación, no ocurrió', 'La estructura severidad→impacto→remediación es la que esperan clientes y aseguradoras', 'Los datos se quedan en tu navegador: nada del encargo sale de tu máquina'],
    tips: ['El resumen ejecutivo se redacta para quien decide, no para quien arregla: cero jerga, máximo impacto de negocio', 'Cada hallazgo con evidencia concreta (request/response) es 10 veces más defendible', 'Convierte a PDF: pandoc informe.md -o informe.pdf --pdf-engine=xelatex'],
  },

  /* ── Ronda 7: formadores de comandos, chuletas y utilidades ── */
  diskcmds: {
    what: 'Formador de comandos de almacenamiento con 6 modos: LVM completo (wipefs → pvcreate → vgcreate → lvcreate → mkfs → mount → fstab), RAID mdadm por niveles con verificación de mínimo de discos, cifrado LUKS2 con crypttab y clave de respaldo, dd con avisos de seguridad y patrón forense con hash, montaje manual con UUID y swap con swappiness. Cada paso numerado con su por qué y los peligros marcados en rojo.',
    params: [
      { name: 'modo', type: 'chips', required: true, desc: 'lvm, raid, luks, dd, mount, swap' },
      { name: 'discos', type: 'lista', desc: '/dev/... separados por coma o línea; el validador avisa si faltan discos para el RAID elegido' },
      { name: 'nombres', type: 'texto', desc: 'VG, LV, punto de montaje, sistema de ficheros y tamaño del LV' },
      { name: 'salida', type: 'script', desc: 'script completo + vista paso a paso con explicación' },
    ],
    daily: ['Añadir un disco de datos a un servidor con LVM y crecerlo sin desmontar', 'Montar la NAS por NFS/CIFS con las opciones correctas', 'Crear un USB booteable o clonar un disco con dd sin sustos'],
    ethical: ['dd con hash integrado es el patrón de adquisición forense: imagen bit a bit verificable para cadena de custodia', 'wipefs/mkfs/dd son herramientas de DESTRUCCIÓN: la tool los marca para que el peligro sea imposible de ignorar', 'LUKS bien hecho (con clave de respaldo guardada) protege datos ante robo sin dejar a nadie fuera'],
    tips: ['lsblk DOS VECES antes de cualquier comando destructivo: sda vs sdb es la errata que borra carreras', 'RAID no es backup: un rm -rf se replica al instante en todos los discos del array', 'El paso "ampliación futura" del modo LVM es el que más pagarás por conocer: vgextend + lvextend -r crece en caliente', 'En emergencias, la sección inferior tiene el procedimiento de las 5 catástrofes clásicas'],
  },
  cheatgen: {
    what: 'Generador de chuletas personalizadas: 6 temas curados (vim, tmux, find/grep/xargs, bash scripting, red en consola, git) con secciones y comandos explicados. Se eligen temas, formato (Markdown con tablas o TXT plano), cabecera, índice y alineación para imprimir; genera la hoja completa lista para descargar y pegar junto al monitor.',
    params: [
      { name: 'temas', type: 'multi', required: true, desc: 'los 6 temas con contador de comandos' },
      { name: 'formato', type: 'select', desc: 'Markdown (tablas para pandoc/VSCode) o TXT con dos columnas' },
      { name: 'opciones', type: 'toggles', desc: 'cabecera con fecha, índice de temas, alineación para impresión' },
      { name: 'descargar', type: 'fichero', desc: '.md o .txt directo' },
    ],
    daily: ['Chuleta de vim para el compañero que juró "nunca usar vim" y ahora vive en servidores', 'Hoja de git para el equipo nuevo con SOLO lo que necesitan (deshacer > ramas exóticas)', 'Imprimir en A5 y plastificar la de red: sobrevive derrames de café'],
    ethical: ['Todo el contenido es conocimiento operatorio estándar: nada de exploits ni payloads, pura eficiencia de terminal', 'Perfecto para formación: da a los alumnos una chuleta en vez de 40 pestañas de Stack Overflow'],
    tips: ['La mejor chuleta es la que TÚ compones: el proceso de elegir ya enseña', 'En formato TXT, la alineación a dos columnas usa padding: pruébala en una fuente monoespaciada', 'Combínalo con Alias Pack: primero los alias que corrigen hábitos, luego la chuleta para lo demás'],
  },
  aliases: {
    what: 'Generador de pack de alias de shell: 42 alias y funciones curadas en 6 categorías (calidad de vida, seguridad, red, git, sistema, dev) con la explicación de qué hábito corrige cada uno. Se eligen shell destino (bash/zsh) y categorías, y genera el bloque con comentarios listo para pegar en ~/.bashrc o ~/.zshrc.',
    params: [
      { name: 'shell', type: 'select', required: true, desc: 'bash o zsh (mismo formato, notas distintas)' },
      { name: 'categorías', type: 'multi', desc: '6 grupos; seguridad y calidad de vida preseleccionadas' },
      { name: 'salida', type: 'texto', desc: 'bloque con cabecera y un comentario de explicación por alias' },
    ],
    daily: ['Configurar un portátil nuevo en 2 minutos: copiar, pegar, source', 'Homogeneizar el entorno del equipo: mismos alias = mismos hábitos = menos "en mi máquina funciona"', 'Añadir rm -I y cp -i a quien SIEMPRE borra de más'],
    ethical: ['Los alias de seguridad (rm -I, chmod --preserve-root) son defensa en profundidad en la capa de hábitos', 'myip y ports son los comandos de auto-reconocimiento más honestos: saber qué expones empieza por mirarlo'],
    tips: ['En scripts los alias NO aplican: son solo para tu sesión interactiva (por eso los scripts no se rompen al cambiarte de .bashrc)', '\\grep llama al binario original si algún alias te estorba', 'El alias fast descompone la latencia en dns/conn/tls/total: el diagnóstico de "internet va lento" en 1 palabra'],
  },
  crontalk: {
    what: 'Traductor de expresiones cron al cristiano: explica cada campo en español natural ("a las 8:30, de lunes a viernes"), señala trampas reales (dom+dow interpretado como OR, cada minuto como patrón de malware, horarios de verano, PATH mínimo) y muestra el equivalente systemd OnCalendar copiable. Incluye 8 presets comentados y FAQ de debugging.',
    params: [
      { name: 'expresión', type: 'string', required: true, desc: '5 campos estándar; valida y explica cada uno' },
      { name: 'presets', type: 'chips', desc: '8 expresiones comunes con cuándo usar cada una' },
      { name: 'OnCalendar', type: 'texto', desc: 'equivalente systemd timer copiable con un click' },
    ],
    daily: ['Entender el cron heredado que nadie documenta', 'Convertir crons legacy a systemd timers (con logging en journal y RandomizedDelaySec)', 'Debug del "mi cron no corre": la FAQ tiene el orden de revisión'],
    ethical: ['Un */5 * * * * con curl a internet en tu crontab es EL patrón de criptominero: esta tool lo señala para que lo reconozcas', 'Auditar /var/spool/cron y /etc/cron.* de todos los usuarios es revisión estándar post-incidente'],
    tips: ['El % en crontab es especial (salto de línea): escápalo con \\% o tu comando muere en silencio', 'cron no repara jobs perdidos si la máquina estaba apagada: para eso existe anacron o Persistent=true en timers', 'Prueba con */2 * * * * antes del horario definitivo: verlo correr quita más dudas que cualquier explicación'],
  },
  confdiff: {
    what: 'Diff semántico de ficheros de configuración: parsea ambos lados (sshd_config, nginx, sysctl, cualquier .conf), junta líneas de continuación con \\, ignora comentarios/espacios/orden, y compara por DIRECTIVA: misma clave con otro valor = changed, clave nueva = added, clave ausente = removed. Resalta las directivas de seguridad conocidas (PermitRootLogin, server_tokens, ssl_protocols…) y cuenta todo con badges.',
    params: [
      { name: 'config A', type: 'textarea', required: true, desc: 'antes / fábrica / backup' },
      { name: 'config B', type: 'textarea', required: true, desc: 'ahora / servidor en producción' },
      { name: 'salida', type: 'tabla', desc: 'diferencias clasificadas + contador de directivas de seguridad afectadas' },
    ],
    daily: ['Revisar qué cambió un apt upgrade en tus units y configs', 'Comparar la config entre dos nodos que "deberían ser iguales"', 'Verificar que el hardening aplicado coincide con el esperado'],
    ethical: ['Auditoría post-incidente: config de fábrica vs actual = exactamente lo que un atacante pudo tocar (AuthorizedKeysFile, PasswordAuthentication…)', 'El diff semántico evita el ruido del diff de texto: solo cambios REALES aparecen'],
    tips: ['Si el resultado dice "semánticamente idénticas", el orden y los comentarios no cuentan: y eso es correcto', 'Las directivas de seguridad resaltadas salen de una lista cruzada de sshd/nginx/apache: añade las tuyas si tu servicio es otro', 'Combínalo con SSH Hardening: genera la config endurecida, aplica en una máquina, y verifica aquí qué falta'],
  },
  taskguide: {
    what: 'Selector de herramientas por tarea: "quiero configurar un firewall" o "montar una VPN" devuelve las herramientas exactas de la suite con pasos por dónde empezar. Integrado bajo la comparativa de OS, con buscador y 7 categorías (red, linux, windows, auditoría, contraseñas, análisis, crear/documentar). NOTA: no es una tool del menú, sino una sección de la página Comparativa de OS.',
    params: [
      { name: 'búsqueda', type: 'string', desc: 'por tarea o palabra clave (firewall, vpn, ssh, wordlist, informe…)' },
      { name: 'categoría', type: 'chips', desc: 'filtra el catálogo de ~18 tareas' },
      { name: 'expandir', type: 'click', desc: 'cada tarea despliega pasos + botones directos a las tools' },
    ],
    daily: ['Onboarding: el nuevo sabe QUÉ quiere hacer pero no qué herramienta usa', 'Recuperar la tool "esa que había para lo del firewall" sin recordar el nombre', 'Planificar una auditoría: la tarea "documentar hallazgos" enlaza report + CVSS + CVE'],
    ethical: ['Cada tarea enlaza solo a herramientas legítimas del suite: el flujo entero asume auditorías autorizadas', 'Los pasos son de mínimo privilegio: firewall antes que exposición, permisos antes que comodidad'],
    tips: ['Si no encuentras la tarea, busca por SINÓNIMO: "túnel" y "vpn" llegan a lo mismo', 'Los botones de tool navegan directo a la herramienta: sin menús intermedios', 'Combínalo con ⌘K: el task finder es para FLUJOS, el comando palette para herramientas concretas'],
  },

  /* ── Ronda 8: GTFOBins, explotación y calculadoras de red ── */
  gtfobins: {
    what: 'Base de datos COMPLETA de GTFOBins (458 binarios) embebida en la app con TODOS los comandos de abuso de cada binario organizados por función (shell, command, reverse-shell, file-read/write, upload/download, library-load, privilege-escalation) y CONTEXTO (sudo, SUID, capabilities, unprivileged), incluyendo los comandos alternativos por contexto (bash -p en SUID, por ejemplo). Búsqueda por nombre, filtros por función y contexto, veredicto de riesgo y estadísticas globales.',
    params: [
      { name: 'búsqueda', type: 'string', desc: 'por nombre de binario (vim, find, awk…)' },
      { name: 'función', type: 'chips', desc: 'filtra por tipo de abuso (solo los con shell: 228)' },
      { name: 'contexto', type: 'chips', desc: 'sudo, SUID o capabilities: los que necesitas según tu enumeración' },
      { name: 'ficha', type: 'expandida', desc: 'todos los comandos por función con copiar, comentarios y herencias' },
    ],
    daily: ['Privesc en CTFs/labs: sudo -l → buscar aquí → ejecutar el comando del contexto correcto', 'Blue team: auditar qué binarios de tu parque tienen funciones de shell y blindarlos', 'Formación: entender POR QUÉ un binario es peligroso (y no copiar a ciegas)'],
    ethical: ['GTFOBins documenta técnicas de escalamiento de privilegios: usarlas sin autorización es delito', 'La versión legítima: tu pentest autorizado, tu hardening, tu formación', 'El lado defensivo: quitar permisos innecesarios, auditar sudoers, montar con noexec/nosuid'],
    tips: ['El CONTEXTO lo es todo: un binario inofensivo se vuelve crítico con sudo NOPASSWD o SUID', 'Los contextos SUID a veces exigen -p (bash -p, find -exec /bin/sh -p): la data lo indica en cada comando', 'Si tu binario no está aquí, mira LOLBAS (Windows) o LOBAS de macOS', 'Combínalo con Sudoers Generator para AUDITAR tus reglas: cada línea NOPASSWD con binario de GTFOBins es hallazgo'],
  },
  usergen: {
    what: 'Generador de variaciones de usernames y emails corporativos: 9 convenciones (jsmith, j.smith, john.smith, smithj…), service accounts típicas (admin, svc-*, backup…) y listas deduplicadas listas para kerbrute, AS-REP Roasting, spraying y OWA. Descarga en TXT.',
    params: [
      { name: 'nombres', type: 'lista', required: true, desc: 'uno por línea: primero apellido (o solo nombre)' },
      { name: 'dominio', type: 'string', desc: 'para los emails: empresa.com' },
      { name: 'service accounts', type: 'toggle', desc: 'añade admin, svc_sql, backup, postgres…' },
      { name: 'descarga', type: 'fichero', desc: 'users.txt y emails.txt separados' },
    ],
    daily: ['Pentest AD: lista de LinkedIn → convención → kerbrute userenum (no bloquea) → AS-REP → spraying medido', 'Auditoría de exposición: ¿cuántos emails corporativos siguen el patrón nombre.apellido y son predecibles?', 'Preparar pruebas de MFA/spraying con autorización y ventana acordada'],
    ethical: ['La enumeración de usuarios contra sistemas sin autorización es el primer paso de un ataque real: úsala solo en tu scope', 'Spraying con 1 password × muchas cuentas a deshoras y con lockout respetado: nunca lo contrario', 'Los datos de nombres son personales: trátalos según RGPD aunque sean de tu cliente'],
    tips: ['La convención REAL se descubre en LinkedIn, firmas de email o un email filtrado en un dork: no asumas la más común', 'kerbrute userenum NO genera eventos de login fallido: es la enumeración más silenciosa que existe', 'Combinaciones raras (j_smith, john.s) a veces pertenecen a service accounts o VIPs: no las descartes'],
  },
  acronyms: {
    what: 'Diccionario de 196 acrónimos de ciberseguridad con definiciones en español, organizados en 10 dominios: ofensivo, defensivo, redes, cripto, Windows/AD, Linux, web, cloud, gobierno/marcos y forense. Búsqueda instantánea por sigla o texto de definición.',
    params: [
      { name: 'búsqueda', type: 'string', desc: 'por sigla (SOC) o por concepto dentro de la definición' },
      { name: 'categoría', type: 'chips', desc: '10 dominios filtrables' },
    ],
    daily: ['Leer un informe técnico sin googleo cada 2 líneas', 'Preparar certificaciones (Security+, OSCP, CC): dominar la jerga es la mitad del examen', 'Homogeneizar vocabulario del equipo: que todos digan IOC igual que tú'],
    ethical: ['Todo el contenido es terminología pública de la industria: sin payloads ni técnicas operativas', 'Perfecto para onboarding de juniors: el idioma primero, las manos después'],
    tips: ['Busca por CONCEPTO si no recuerdas la sigla: "monitoriza logs" te lleva a SIEM', 'Las definiciones incluyen el ángulo práctico: qué herramienta o evento está asociado', 'Los acrónimos polisémicos (PAM, ACL, IAM) están separados por dominio: elige la categoría antes de buscar'],
  },
  xsgen: {
    what: 'Generador de payloads XSS con 26 plantillas clasificadas por vector (básico, evento, etiqueta rara, evasión, sin <) y por contexto de inyección (HTML body, atributo, string JS, URL). Cada payload se adapta: texto del alert personalizado, URL-encoding, HTML entities y envoltura con comentario de prueba. Incluye guía de caza: cómo identificar DÓNDE cae tu input en el DOM y qué filtrado hay.',
    params: [
      { name: 'filtros', type: 'chips', desc: 'vector y contexto: los payloads que aplican a TU punto de inyección' },
      { name: 'texto alert', type: 'string', desc: 'personaliza la demo (XSS-HackNexus, o la cookie que demostrarías)' },
      { name: 'encoding', type: 'select', desc: 'nada, URL-encoded (parámetros) o HTML entities (doble decode)' },
    ],
    daily: ['Probar el sanitizado de TU aplicación tras cada deploy', 'Entender por qué el filtro de la empresa no basta (case, barras, entidades)', 'Formar al equipo de desarrollo con ejemplos reales de su propio código'],
    ethical: ['Solo sobre aplicaciones propias o con autorización expresa: inyectar XSS en terceros es delito', 'El alert(1) demuestra ejecución; el informe debe documentar IMPACTO real (robo de sesión, acciones en nombre del usuario)', 'La guía de caza enseña el método: identificar el contexto antes de lanzar payloads'],
    tips: ['El CONTEXTO manda: un payload de HTML no funciona dentro de un atributo — mira primero dónde cae tu input', 'Con CSP activo la mayoría no corren: mira la cabecera antes de concluir que no hay XSS', 'Los vectores sin < (autofocus, jsbreak, jstemplate) son los que sobreviven a sanitizadores básicos de etiquetas'],
  },
  xmlgen: {
    what: 'Arsenal de plantillas XML con 10 payloads: XXE directo (ficheros, wrapper PHP base64), out-of-band con evil.dtd alojado en tu servidor, exfiltración vía error message, XInclude cuando el DOCTYPE está bloqueado, XSLT (lectura con document(), RCE con extensiones PHP), SSRF por SOAP y billion laughs de detección. Todo se sustituye con tu IP, puerto y fichero.',
    params: [
      { name: 'fichero', type: 'string', desc: '/etc/passwd, c:/windows/win.ini, php://filter…' },
      { name: 'host:puerto', type: 'string', desc: 'tu servidor para los métodos OOB (o Burp Collaborator)' },
      { name: 'plantillas', type: 'chips', desc: 'por categoría: xxe, oob, xinclude, xslt, util' },
    ],
    daily: ['Probar parsers XML de TU API: SOAP legacy, SAML, configs con DOCTYPE activado', 'Verificar que el hardening del parser (disable external entities) funciona tras updates', 'Formación: demostrar en 5 minutos por qué el XXE sigue siendo grave'],
    ethical: ['El XXE expone ficheros del SERVIDOR: sin autorización es intrusión directa', 'El método OOB requiere que el servidor salga a TU servidor: montarlo en red ajena sin permiso es delito', 'Billion laughs es DoS: solo para demostrar límites del parser en tu propia infraestructura'],
    tips: ['Flujo: ¿parsea XML? → ¿DOCTYPE? → entidades directas → sin respuesta: OOB → sin salida: error message → sin DOCTYPE: XInclude', 'Java es el parser más permisivo por defecto: los endpoints SOAP legacy son el mejor coto', 'El evil.dtd es el que concatena fichero+HTTP: aloja en tu servidor con python -m http.server'],
  },
  phpfilter: {
    what: 'Generador de cadenas de filtros PHP para convertir LFI en RCE SIN subir ficheros: port 1:1 del generador oficial de Synacktiv (MIT). Introduces código PHP, la tool lo codifica en base64 y compone la cadena de filtros convert.iconv que SINTETIZA esos bytes al pasar por php://filter. Modo debug con base64 crudo y créditos a loknop/wupco.',
    params: [
      { name: 'código PHP', type: 'textarea', required: true, desc: 'lo que se ejecutará al hacer include de la cadena' },
      { name: 'modo', type: 'select', desc: 'código→cadena completa o base64 crudo (debug de Synacktiv)' },
      { name: 'salida', type: 'texto', desc: 'payload php://filter/… listo para el parámetro vulnerable' },
    ],
    daily: ['CTFs con include($_GET[\'file\']) sin validación: RCE en 30 segundos sin subir nada', 'Probar si el WAF bloquea php://filter pero no los filtros iconv concretos', 'Demostrar en formación que un LFI "inocente" es RCE con la cadena adecuada'],
    ethical: ['Convertir LFI a RCE es ejecución de código en servidor ajeno: solo con autorización escrita', 'La cadena no deja ficheros en disco (todo es en memoria): igualmente es RCE detectable por logs', 'Crédito del algoritmo: Synacktiv, loknop y wupco — usa herramientas atribuidas en tus informes'],
    tips: ['Si el include añade sufijo (.php), la cadena funciona igual: php://temp absorbe el sufijo', 'Añade espacios finales al código si el payload se corta: el padding lo arregla', 'La salida puede ser ENORME (miles de chars): si la URL se trunca, reduce el código al mínimo (<?=`$_GET[0]`;)'],
  },
  bofcalc: {
    what: 'Calculadora de Buffer Overflow clásico en 4 pasos: 1) patrón cíclico estilo Metasploit generado nativamente (Aa0Aa1…), 2) cálculo del offset aceptando el EIP crashado como texto ("Aa3A") o hex (0x41336141) con búsqueda little-endian, 3) cadena de badchars 1-255 con exclusión interactiva y método mona, 4) payload final: basura × offset + EIP en little-endian automático + NOP sled + shellcode msfvenom, con script Python de envío listo y avisos (null bytes, sin sled…).',
    params: [
      { name: 'longitud', type: 'string', desc: 'del patrón (mayor que el buffer que crashea)' },
      { name: 'EIP', type: 'string', desc: '4 chars o hex del registro tras el crash' },
      { name: 'badchars', type: 'lista', desc: 'bytes excluidos de la cadena y del shellcode' },
      { name: 'payload', type: 'formulario', desc: 'offset, JMP ESP, NOPs y shellcode hex' },
    ],
    daily: ['OSCP/HTB: el BOF clásico (vulnserver, rooms de buffer overflow) de principio a fin', 'Entender little-endian con la conversión visual del EIP', 'Fuzzing responsable: el patrón identifica el offset sin repetir crashes a ciegas'],
    ethical: ['Los BOF son exploits de memoria: sin autorización, ejecutarlos es intrusión con agravante', 'En Windows moderno (DEP/ASLR/CFG) el BOF clásico no aplica: es la base para entender ROP', 'La tool hace aritmética; la responsabilidad del exploit y su alcance es tuya'],
    tips: ['El patrón aquí es IDÉNTICO al de Metasploit: puedes usar pattern_offset.rb sobre el patrón de esta tool', 'EXITFUNC=thread en msfvenom: la shell no mata el proceso y puedes seguir el exploit', 'JMP ESP sin badchars: mona jmp -r esp -cpb "\\x00\\x0a\\x0d" y verifica el endianness aquí mismo'],
  },
  pivotmap: {
    what: 'Mapa visual e interactivo de pivoting: nodos (atacante, pivotes, objetivos) con sus interfaces de red, aristas por protocolo (ssh, chisel, socat, smb) y estado (vivo/muerto). Calcula la RUTA del atacante a cada nodo por BFS y genera los comandos EXACTOS por tramo: SSH -D con ProxyJump para saltos, chisel server/cliente con SOCKS encadenados, socat TCP-LISTEN con forward, y verificación con proxychains. Editor de nodos inline, chuleta de pivoting y notas de OPSEC.',
    params: [
      { name: 'nodos', type: 'editor', required: true, desc: 'nombre, rol e interfaces (la red que te alcanza y la que esconde)' },
      { name: 'aristas', type: 'protocolo', desc: 'ssh, chisel, socat… vivo o caído' },
      { name: 'objetivo', type: 'click', desc: 'marca el nodo final: la tool calcula ruta y comandos' },
    ],
    daily: ['Planear el pivoting de un lab multi-nivel (HTB pro labs, AD chains)', 'Documentar el acceso al informe: diagrama + comandos por tramo', 'Formar en el concepto: la diferencia entre SOCKS, forward y ProxyJump se VE en el mapa'],
    ethical: ['El pivoting es acceso a redes internas adicionales: cada salto debe estar en el scope del encargo', 'Enumera interfaces y redes del pivote solo para el alcance aprobado: "ip a" revela redes que NO tenías autorizadas', 'Todo túnel debe quedar documentado y cerrarse al terminar el encargo'],
    tips: ['Enumera SIEMPRE las interfaces del pivote (ip a): la segunda interface es la red que aún no conoces', 'ssh -J (ProxyJump) es lo primero que probamos: si hay SSH, encadena saltos sin herramientas extra', 'sshuttle -r user@pivote RED/24 es "VPN sin instalar nada": prueba el mapa primero y usa sshuttle cuando funcione', 'Con Windows pivotes: plink.exe -D 1080 (PuTTY CLI) equivale a ssh -D desde un binario portable'],
  },
  netcalc: {
    what: '7 calculadoras para administradores de redes: 1) TTL→SO con bases 255/128/64/60/50 y cálculo de saltos, 2) MTU/MSS con breakdown por IPv4/IPv6 y comandos ping de test (Linux -M do, Windows -f -l), 3) wildcards y máscaras ACL Cisco con equivalente nftables y traductor máscara→prefijo, 4) plan de VLANs con dimensionado automático por hosts, detección de VLANs reservadas, gateway calculado y config router-on-a-stick (Cisco + Linux), 5) ToS/DSCP bidireccional con clases EF/AF/CS, 6) tiempos de transferencia con overhead configurable, 7) tabla CIDR completa con uso típico.',
    params: [
      { name: 'pestaña', type: 'chips', required: true, desc: 'las 7 calculadoras' },
      { name: 'TTL', type: 'number', desc: '1-255 del ping observado' },
      { name: 'MTU', type: 'number', desc: 'o elige la situación típica (PPPoE, VPN, jumbo)' },
      { name: 'VLANs', type: 'tabla', desc: 'id, nombre y hosts: red, máscara, gateway y margen automáticos' },
    ],
    daily: ['Diagnóstico: ¿por qué no carga el sitio tras la VPN? → MTU/MSS con el test de ping listo', 'Diseño de red nueva: dimensionar VLANs por sede sin sorpresas de solapamiento', 'Auditar ACLs: wildcard correcta y equivalente nftables para entornos mixtos'],
    ethical: ['La identificación por TTL es fingerprinting pasivo de redes propias o autorizadas', 'El dimensionado correcto de VLANs (datos/voz/invitados separadas) es defensa en profundidad real', 'Cada calculadora enseña el PORQUÉ: no copias una wildcard sin entenderla'],
    tips: ['TTL 57 con 3 saltos y base 60: probable Alpine/contenedor — el ahorro de saltos delata virtualización', 'El test de MTU con ping -M do -s 1472 es EL diagnóstico del "conecta pero no carga"', 'Nunca uses la VLAN 1 para datos ni management: la tabla de reservadas te lo recuerda al planear'],
  },
  ttyupgrade: {
    what: 'Guía interactiva de 6 métodos de upgrade de reverse shell a TTY interactiva completa: python3/python pty con calibración stty (el estándar de 5 pasos), script de util-linux (sin Python), socat completo (PTY desde el inicio con binarios estáticos), rlwrap (mejora solo desde tu lado), referencia manual de stty (qué hace cada flag y el orden de siempre) y opciones Windows (conpty, C2, WinRM). Cada método con pasos numerados exactos, calidad por estrellas, cuándo usarlo y troubleshooting del día a día (Ctrl+C que mata todo, echo duplicado, sin tab-completion).',
    params: [
      { name: 'método', type: 'chips', required: true, desc: '6 métodos con calidad y requisitos' },
      { name: 'prechecks', type: 'panel', desc: '¿es TTY? ¿qué python hay? ¿tamaño de tu terminal?' },
      { name: 'copiar', type: 'botón', desc: 'solo los comandos, sin comentarios' },
    ],
    daily: ['CTF/labs: la reverse shell de nc nunca es TTY — este upgrade es EL paso 1 de post-explotación', 'Calibrar stty rows/cols para que vi/nano funcionen en la shell remota', 'Enseñar a juniors por qué su shell "no funciona": casi siempre falta stty raw -echo; fg'],
    ethical: ['Las técnicas de TTY upgrade son estándar de OSCP/HTB: material formativo y operativo en labs autorizados', 'En Windows, la solución real es un agente C2 de laboratorio, no trucos de consola', 'El troubleshooting enseña a restaurar (stty sane/reset): útil también para tu propia terminal'],
    tips: ['El orden sagrado: pty.spawn → Ctrl+Z → stty raw -echo → fg → TERM + stty rows/cols', 'Si tras fg no ves nada, escribe Enter a ciegas: es normal, no está rota', 'socat con binario estático (github.com/andrew-d/static-binaries) es la mejor experiencia: PTY completa sin pasos'],
  },
  filexfer: {
    what: 'Arsenal de 14 métodos de transferencia de ficheros atacante↔víctima con comandos generados según tu IP, puerto y fichero: HTTP (python http.server, uploadserver), netcat directo y con hash on-the-fly, scp/sftp, base64 inline por consola, /dev/tcp de bash puro (sin nc ni wget), y para Windows: certutil (LOLBIN), WebClient/PowerShell, subida con UploadFile, SMB con impacket smbserver, bitsadmin, nc.exe y FTP (pyftpdlib + script de consola). Filtros por SO y sentido (descarga/subida), notas de OPSEC por método y sección de DETEcción blue team (qué eventos y logs genera cada uno).',
    params: [
      { name: 'host/puerto/fichero', type: 'formulario', required: true, desc: 'todo se sustituye en los comandos' },
      { name: 'SO', type: 'chips', desc: 'linux, windows o ambos' },
      { name: 'sentido', type: 'chips', desc: 'descarga (víctima baja de ti) o subida (víctima te manda)' },
    ],
    daily: ['Subir linpeas/winpeas al objetivo en un pentest autorizado', 'Exfiltrar resultados o evidencias hacia tu máquina con hash verificado', 'En boxes capados: /dev/tcp de bash funciona SIN nc, wget ni curl'],
    ethical: ['Cada método deja rastros distintos (certutil cachea, SMB crea sesiones): elige conscientemente y documenta', 'La sección de detección es para el blue team: saber cómo se detecta cada método es defender mejor', 'Verifica SIEMPRE el hash en ambos extremos: un fichero truncado pierde horas de trabajo'],
    tips: ['Si la víctima no puede salir a tu IP (segmentación), invierte el sentido o monta el tunnel con Pivoting Map', 'certutil -urlcache … delete limpia la caché: OPSEC básica en Windows', 'Para carpetas enteras: tar czf - | nc (comando incluido) en vez de fichero a fichero'],
  },
  chronolog: {
    what: 'Timeline viva de tu engagement (CTF, pentest o bug bounty): cada evento con minuto, fase (recon → enum → exploit → privesc → post → pivot → loot → cleanup) y host. Calcula TTE (time-to-exploit), duración total, señala huecos mayores de 45 minutos y fases clave sin cobertura, y exporta el writeup en Markdown o CSV.',
    params: [
      { name: 'título / operador / inicio', type: 'formulario', required: true, desc: 'la hora de inicio convierte los minutos relativos a reloj real' },
      { name: 'evento', type: 'formulario', desc: 'minuto, fase (9 disponibles), título, detalle, host y severidad' },
      { name: 'export', type: 'chips', desc: 'Markdown (tabla completa) o CSV; más snapshot JSON de la timeline' },
    ],
    daily: ['Documentar el ataque EN VIVO en vez de reconstruirlo al día siguiente desde el history', 'Justificar horas en informes de pentest: el TTE y los huecos son métricas que el cliente entiende', 'En CTFs: comparar tu cronología con el writeup oficial para ver dónde perdiste tiempo'],
    ethical: ['Un timeline completo es evidencia de metodología: protege la trazabilidad de lo que hiciste y cuándo', 'En pentests reales, la fase cleanup documentada demuestra que cerraste túneles y borraste artefactos', 'No publiques timelines de clientes: anonimiza hosts y rutas antes de convertirlo en writeup público'],
    tips: ['El hueco >45m suele ser "estuve atascado": anótalo como nota, es oro para aprender', 'Usa la fase nota para deducciones ("el admin reusa contraseñas") — son las que aceleran el siguiente engagement', 'El Markdown exportado pega directo en tu GitBook o en el informe sin retoques'],
  },

  /* ── Lenguajes: chuleta + playground con ejecución real ── */
  langpython: {
    what: 'Chuleta de Python 3 en 6 secciones (sintaxis, f-strings, estructuras, excepciones, sockets, subprocess) con playground que ejecuta Python REAL en tu navegador vía Pyodide/WASM: sin servidor, tu código no sale de la máquina. Consola con stdout/stderr capturados.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'textarea con resaltado Prism; Tab = 2 espacios' },
      { name: 'ejecutar', type: 'button', desc: 'primera vez descarga ~10 MB del runtime (luego cacheado)' },
      { name: 'reset', type: 'button', desc: 'restaura el ejemplo por defecto' },
    ],
    daily: ['Probar snippets de explotación antes de llevarlos a la terminal', 'Aprender sintaxis nueva sin montar venv ni nada', 'Verificar la salida esperada de un parseo complejo'],
    ethical: ['El código que escribes no sale de tu navegador (WASM local)', 'Ideal para practicar con datos ficticios antes de tocar un objetivo', 'Pyodide no tiene sockets ni subprocess: los ejemplos ofensivos son didácticos'],
    tips: ['La primera ejecución tarda: las siguientes son instantáneas', 'Los imports puros de stdlib funcionan (hashlib, json, collections…)', 'Si importas numpy/pandas, Pyodide los baja del CDN al vuelo'],
  },
  langjavascript: {
    what: 'Chuleta de JavaScript (fundamentos, DOM/XSS, fetch, clases, depuración) con playground que ejecuta JS REAL en tu navegador: console.log/error/warn capturados, soporta async/await y muestra el valor retornado.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'con resaltado de sintaxis' },
      { name: 'consola', type: 'output', desc: 'stdout estilizado con formato de objetos y arrays' },
    ],
    daily: ['Validar comportamiento de JS antes de inyectarlo en un test', 'Aprender destructuring, spread, optional chaining', 'Repasar la diferencia innerHTML vs textContent (XSS)'],
    ethical: ['Ejecuta en tu navegador sin sandboxes externos', 'Sin fetch real: los ejemplos de red son didácticos', 'Perfecto para practicar sanitización de entrada'],
    tips: ['El valor de la última expresión async aparece como ⟵', 'console.table funciona y muestra tablas en la salida', 'Puedes usar top-level await'],
  },
  langtypescript: {
    what: 'Chuleta de TypeScript (anotaciones, utility types, unknown vs any, type guards) compilada y ejecutada con el compilador oficial tsc en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism TypeScript' },
      { name: 'compilador', type: 'engine', desc: 'typescript-5.6.2 vía Wandbox (red externa)' },
    ],
    daily: ['Verificar que un tipo genérico compila antes de copiarlo al proyecto', 'Aprender narrowing y discriminated unions', 'Probar utility types sin montar proyecto'],
    ethical: ['El código viaja a Wandbox (compilador público): no pegues secretos', 'Errores de tipo se muestran tal cual los da tsc', 'Ideal para practicar sin IDE'],
    tips: ['Los errores de compilación aparecen en la consola en rojo', 'strict mode activo por defecto en los ejemplos', 'Combina con el playground de JavaScript para comparar'],
  },
  langjava: {
    what: 'Chuleta de Java (main, tipos, colecciones, excepciones, superficie de ataque: deserialización y JNDI) ejecutada con OpenJDK 21 real en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism Java' },
      { name: 'compilador', type: 'engine', desc: 'openjdk-jdk-21 vía Wandbox' },
    ],
    daily: ['Probar streams y colecciones sin arrancar IntelliJ', 'Repasar text blocks y var', 'Entender por qué la deserialización insegura es RCE'],
    ethical: ['Código enviado a Wandbox: nada de datos sensibles', 'El editor usa class main (minúscula): requisito del runtime online', 'Java estándar sin librerías externas'],
    tips: ['Si cambias a public class Main verás el error de filename clásico: léelo, es didáctico', 'El timeout de compilación es de 60s', 'Los errores de javac llegan en compiler_error y se muestran'],
  },
  langcsharp: {
    what: 'Chuleta de C# (fundamentos, nullables, LINQ y el porqué del ecosistema .NET en post-explotación Windows) ejecutada con Mono 6.12 real en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism C#' },
      { name: 'compilador', type: 'engine', desc: 'mono-6.12 (mcs) vía Wandbox: sintaxis clásica' },
    ],
    daily: ['Probar LINQ (Where/Select/GroupBy) sin Visual Studio', 'Repasar string interpolation y Dictionary', 'Entender por qué los red teams compilan tools en C#'],
    ethical: ['Código viaja a Wandbox', 'Mono no incluye APIs modernas de .NET 8 ni interop Windows', 'Los ejemplos ofensivos son conceptuales, no ejecutables'],
    tips: ['Mono compila con mcs: evita features de C# 12', 'Console.ReadLine() no funciona en el sandbox', 'Los errores de compilación llegan completos'],
  },
  langc: {
    what: 'Chuleta de C (estructura, punteros, funciones inseguras vs seguras, format strings) compilada con gcc 13.2 real en Wandbox. La puerta de entrada a entender memory corruption.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism C' },
      { name: 'compilador', type: 'engine', desc: 'gcc-13.2.0 vía Wandbox' },
    ],
    daily: ['Probar aritmética de punteros sin montar nada', 'Ver en vivo la diferencia snprintf vs sprintf', 'Prepararse para exploitation de binarios'],
    ethical: ['Compilado en sandbox de Wandbox', 'Los overflows de los ejemplos están controlados', 'Base conceptual para pwn: práctica en tu VM para explotar'],
    tips: ['Añade printf de direcciones con %p para ver el stack', 'Los warnings de gcc aparecen aunque compile', 'Compila con -Wall mentalmente: lee los avisos'],
  },
  langcpp: {
    what: 'Chuleta de C++ (RAII, smart pointers, clases, templates, STL) compilada con g++ 13.2 real en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism C++' },
      { name: 'compilador', type: 'engine', desc: 'gcc-13.2.0 (g++) vía Wandbox, C++17 mínimo' },
    ],
    daily: ['Probar structured bindings y range-for', 'Repasar make_unique/make_shared', 'Repasar STL (vector/map/algorithm)'],
    ethical: ['Código viaja a Wandbox', 'Sin librerías externas (boost etc.)', 'Ideal para afianzar conceptos antes de auditar C++ real'],
    tips: ['Los errores de templates son ilegibles: empieza simple', 'C++20 funciona parcialmente en gcc 13', 'std::cout con \\n es más rápido que endl'],
  },
  langphp: {
    what: 'Chuleta de PHP 8.3 (arrays, super globales, LFI clásico, prepared statements) ejecutada con PHP CLI real en Wandbox. El lenguaje que alimenta el 70% de la web y sus bugs clásicos.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism PHP con <?php' },
      { name: 'compilador', type: 'engine', desc: 'php-8.3.12 CLI vía Wandbox' },
    ],
    daily: ['Probar funciones de arrays (map/filter/reduce)', 'Ver cómo un include($_GET[x]) se convierte en LFI', 'Repasar null coalescing y arrow functions'],
    ethical: ['El CLI no tiene servidor web: no hay request real', 'Los ejemplos de vulnerabilidad son para AUDITAR, no para explotar', 'Prepared statements son la única cura para SQLi'],
    tips: ['echo con comillas dobles interpola variables', 'print_r y var_dump son tus amigos', 'Los avisos de deprecación aparecen en stderr'],
  },
  langruby: {
    what: 'Chuleta de Ruby (sintaxis, símbolos/hashes, bloques y la anatomía de un módulo de Metasploit) ejecutada con Ruby 3.4 real en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism Ruby' },
      { name: 'compilador', type: 'engine', desc: 'ruby-3.4.9 vía Wandbox' },
    ],
    daily: ['Aprender bloques y procs con ejemplos reales', 'Repasar Struct y símbolos', 'Entender cómo se estructura un exploit de MSF'],
    ethical: ['Código viaja a Wandbox', 'Sin gems externas (solo stdlib)', 'El módulo MSF mostrado es estructura, no exploit funcional'],
    tips: ['puts devuelve nil: la última expresión es lo que importa', 'Todo es objeto: 3.times funciona', 'La interpolación #{x} solo en comillas dobles'],
  },
  langgo: {
    what: 'Chuleta de Go (structs, maps, goroutines, channels y el porqué de las tools ofensivas en Go) compilada y ejecutada con Go 1.23 real en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism Go' },
      { name: 'compilador', type: 'engine', desc: 'go-1.23.2 vía Wandbox' },
    ],
    daily: ['Probar patrones de concurrencia (worker pools)', 'Repasar manejo de errores if err != nil', 'Entender por qué chisel/ligolo/nuclei son Go'],
    ethical: ['Código viaja a Wandbox', 'Solo stdlib: no hay go get en el sandbox', 'El patrón de cross-compile GOOS=windows se explica para lab propio'],
    tips: ['Si lanzas goroutines, espera sus resultados con WaitGroup o channels', 'gofmt mental: las llaves van en la misma línea', 'Los nil maps panean: haz make()'],
  },
  langrust: {
    what: 'Chuleta de Rust (ownership, borrowing, match, Result/Option, structs/impl) compilada con Rust 1.82 real en Wandbox.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism Rust' },
      { name: 'compilador', type: 'engine', desc: 'rust-1.82.0 vía Wandbox (debug build)' },
    ],
    daily: ['Luchar con el borrow checker sin instalar toolchain', 'Repasar match exhaustivo y enumeraciones', 'Entender por qué Rust domina las tools nuevas de seguridad'],
    ethical: ['Código viaja a Wandbox', 'Solo std: no hay cargo add', 'El compilador de Rust explica los errores: léelos, son tutoriales'],
    tips: ['Los errores de borrow checker incluyen sugerencias de fix', 'cargo clippy mental: evita unwrap() innecesarios', 'El modo debug es más lento: los timings no son representativos'],
  },
  langlua: {
    what: 'Chuleta de Lua 5.4 (tables, patterns, metatables y scripting NSE de Nmap) ejecutada con Lua real en Wandbox. El lenguaje embebido de Nmap, Wireshark y Redis.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism Lua' },
      { name: 'compilador', type: 'engine', desc: 'lua-5.4.7 vía Wandbox' },
    ],
    daily: ['Probar patterns de Lua (no son regex)', 'Repasar metatables y herencia', 'Estructurar un script NSE antes de escribirlo'],
    ethical: ['Código viaja a Wandbox', 'Los scripts NSE mostrados son estructura didáctica', 'Lua es 1-indexed: el error clásico'],
    tips: ['#t da la longitud de arrays secuenciales', 'pairs recorre todo, ipairs solo secuencial', 'La concatenación es .. (dos puntos)'],
  },
  langbash: {
    what: 'Chuleta de Bash (variables, condiciones, pipes/redirección y one-liners de seguridad) ejecutada con Bash 5.2 REAL en sandbox Linux de Wandbox. Pipes, sort, uniq y grep funcionando de verdad.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism Bash' },
      { name: 'compilador', type: 'engine', desc: 'bash-5.2 con coreutils en Wandbox' },
    ],
    daily: ['Probar pipelines antes de lanzarlos contra producción', 'Repasar expansiones de parámetros ${var%%.*}', 'Practicar exit codes y condicionales'],
    ethical: ['Sandbox con namespace: whoami devuelve wandbox, no tocas nada real', 'Sin red: los one-liners de red son para tu Kali', 'Perfecto para probar sintaxis antes de un cron'],
    tips: ['date y uname funcionan: prueba uname -a', 'El set -e al inicio de tus scripts te salva la vida', '$(comando) es la sustitución moderna'],
  },
  langsql: {
    what: 'Chuleta de SQL sobre SQLite 3.46 real (DDL, DML, JOINs, agregación y la inyección SQL demostrada ejecutándola: el payload \' OR \'1\'\'1 devolviendo todas las filas).',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism SQL' },
      { name: 'compilador', type: 'engine', desc: 'sqlite-3.46.1 en memoria vía Wandbox' },
    ],
    daily: ['Practicar JOINs con datos visibles', 'Entender GROUP BY/HAVING con resultados reales', 'Ver por qué concatenar input = SQLi (y por qué prepared statements curan)'],
    ethical: ['Base de datos en memoria: se borra en cada ejecución', 'El payload de SQLi es sobre TU propia tabla de demo', 'La cura (prepared statements) está en la chuleta'],
    tips: ['Las sentencias van separadas por ; y se ejecutan en orden', 'El resultado de SELECT sale en formato tabla pipe', 'Comillas dobles = identificadores; simples = strings'],
  },
  langhtml: {
    what: 'Chuleta de HTML (esqueleto, formularios, anatomía de un phishing, contextos XSS) con vista previa REAL en un iframe sandbox: tu HTML se renderiza de verdad con estilos y scripts.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism markup' },
      { name: 'preview', type: 'iframe', desc: 'renderizado real con sandbox allow-scripts (sin acceso a la página)' },
    ],
    daily: ['Probar estructura y estilos inline antes de replicarlos', 'Analizar cómo se ve un formulario de phishing y por qué engaña', 'Practicar semántica HTML5'],
    ethical: ['El iframe es sandbox: no puede tocar cookies ni storage de HackNexus', 'La detección de phishing es para defenderse, no para clonar', 'Los formularios no envían nada (preventDefault)'],
    tips: ['Los scripts del preview corren dentro del iframe: console.log no se ve, usa document.write', 'Cada ejecución recarga el iframe desde cero', 'Combínalo con la chuleta de XSS para entender contextos'],
  },
  langcss: {
    what: 'Chuleta de CSS (selectores, flexbox, grid, animaciones y CSS exfiltration) con demo interactiva real: la pestaña playground renderiza una tarjeta completa que usa TODO el CSS de la chuleta.',
    params: [
      { name: 'editor', type: 'editor', required: true, desc: 'resaltado Prism CSS' },
      { name: 'preview', type: 'iframe', desc: 'demo interactiva: hover, :active y @keyframes funcionando' },
    ],
    daily: ['Probar grids y flexbox sin recargar tu web', 'Repasar variables CSS y transiciones', 'Entender el ataque de exfiltración por atributos'],
    ethical: ['El keylogger CSS mostrado es conceptual: no exfiltra nada', 'CSP es la defensa real contra CSS exfil', 'Todo corre en iframe sandbox'],
    tips: ['Pasa el ratón por la tarjeta: transform + box-shadow animados', 'El botón usa :active: pícalo', 'Cambia --verde en :root y mira la cascada'],
  },

  /* ── Traductor de lenguajes ── */
  langtrans: {
    what: 'Traductor de código entre 8 lenguajes (Python, JavaScript, TypeScript, Java, C#, Go, Ruby y PHP) con motor 100% local: analiza el código origen con un parser por lenguaje, lo normaliza a una representación intermedia (IR) de sentencias y la emite en el lenguaje destino. Muestra el % de confianza real de la traducción y qué construcciones quedaron fuera del subconjunto traducible en vez de fingir exactitud.',
    params: [
      { name: 'lenguaje origen', type: 'select', required: true, desc: 'de dónde parte el código; autodetección no: el origen lo eliges tú' },
      { name: 'lenguaje destino', type: 'select', required: true, desc: 'a qué lenguaje emitir; hay swap con un clic' },
      { name: 'código', type: 'string', required: true, desc: 'el fuente a traducir (funciones, variables, condicionales, bucles, colecciones…)' },
    ],
    daily: ['Portar una función de utilidad de un proyecto Python a un backend en Go sin reescribirla a mano', 'Aprender un lenguaje nuevo comparando el mismo código lado a lado', 'Convertir snippets de writeups (casi siempre Python) al lenguaje de tu stack'],
    ethical: ['Material formativo: entender que un traductor automático NO sustituye revisión — el % de confianza lo deja claro', 'En CTFs multi-lenguaje: adaptar exploits didácticos entre Python y tu lenguaje preferido', 'Auditar la salida como si fuera código de un junior: nunca pegar traducciones en producción sin revisar'],
    tips: ['La confianza baja cuando usas características idiomáticas (decorators, goroutines, LINQ): el IR cubre el subconjunto común a los 8 lenguajes', 'Las issues del parser te dicen qué sentencias no se tradujeron: arréglalas a mano en la salida', 'No traduce librerías: las llamadas a APIs externas pasan tal cual y hay que re-mapearlas a mano'],
  },
  bashforge: {
    what: 'Constructor de scripts Bash por bloques: compones visualmente shebang con set -Eeuo pipefail, cabecera, variables con validación, arrays, argumentos CLI, prompts de secretos, checks de comandos/ficheros, condicionales, bucles, funciones, case, logging coloreado y trap de limpieza. El script se emite en vivo y cada bloque trae su explicación didáctica del porqué bash es como es.',
    params: [
      { name: 'bloques', type: 'lista reordenable', required: true, desc: '22 tipos de bloque; reordena con flechas y configura cada uno al pulsarlo' },
      { name: 'parámetros del bloque', type: 'formulario', desc: 'nombre, valor, toggles… según el tipo de bloque' },
      { name: 'salida', type: 'CopyBlock', desc: 'script completo listo para copiar o guardar como .sh' },
    ],
    daily: ['Montar scripts de automatización sin pelearte con la sintaxis de bash a las 2 AM', 'Aprender buenas prácticas: el modo estricto y el trap de limpieza van incluidos por defecto', 'Plantillas de recon y checks de red (nc, puertos, logs) para tu flujo de pentest'],
    ethical: ['El modo estricto enseña hábitos que evitan scripts descontrolados en producción', 'Los checks de red y puertos sirven para auditar TU infraestructura, no para escanear la ajena', 'Cada bloque explica el riesgo (eval, variables sin comillas…) para que no heredes antipatrones'],
    tips: ['Los avisos del compilador detectan errores clásicos: espacios en nombres de variables, read sin -r…', 'El trap con mktemp evita ficheros temporales huérfanos: cópialo tal cual a tus scripts', 'Reordena bloques antes de configurar: el orden de shebang → variables → argumentos → lógica importa'],
  },
  psforge: {
    what: 'Constructor de scripts PowerShell por bloques, hermano del Bash Forge: Set-StrictMode, cabecera, variables y arrays, bloque param() con validación, Read-Host de secretos, Test-Path, condicionales, foreach, while, funciones, switch, checks de conectividad (ping, Test-NetConnection, servicios), transcript y try/catch. Salida en vivo con explicación de cada directiva.',
    params: [
      { name: 'bloques', type: 'lista reordenable', required: true, desc: '19 tipos de bloque con sus formularios' },
      { name: 'parámetros del bloque', type: 'formulario', desc: 'variables, claves, hosts… según el tipo' },
      { name: 'salida', type: 'CopyBlock', desc: 'script .ps1 listo para copiar' },
    ],
    daily: ['Automatizar administración Windows (servicios, red, disco) sin memorizar la sintaxis de PS', 'Preparar scripts de hardening y verificación con transcript incluido para dejar evidencia', 'Aprender PowerShell comparando cada bloque con su equivalente bash'],
    ethical: ['El transcript y el try/catch enseñan scripts que dejan rastro y fallan de forma segura', 'Los checks de servicios/puertos son para TU parque de máquinas o el del cliente con permiso', 'El strict mode evita el comportamiento silencioso que esconde errores en scripts de auditoría'],
    tips: ['El bloque param() con [Parameter(Mandatory)] es el estándar profesional: úsalo en vez de Read-Host cuando puedas', 'Test-NetConnection informa de ping Y puerto TCP: mejor que testear por separado', 'Set-StrictMode -Version Latest convierte variables sin definir en errores, como set -u en bash'],
  },
  netsim: {
    what: 'Diseñador de topologías de red interactivo: arrastra nodos (router, switch, firewall, AP, servidores, clientes, IoT, nube, VPN…) sobre un lienzo SVG, enlázalos clic a clic eligiendo el medio (ethernet, fibra, wifi, vpn) con velocidades, y obtén análisis automático de la red (huérfanos, sin firewall, IPs duplicadas), lista de materiales (BOM), export/import JSON y export PNG en alta resolución.',
    params: [
      { name: 'nodos', type: 'canvas drag', required: true, desc: '13 tipos con capa (core/distribución/acceso), color e icono propios' },
      { name: 'enlaces', type: 'clic-clic', desc: 'ethernet, fibra, wifi o vpn con velocidad y estilo visual por medio' },
      { name: 'presets', type: 'chips', desc: 'topologías de ejemplo: hogar, pyme, laboratorio y sucursal' },
      { name: 'export', type: 'PNG | JSON', desc: 'PNG 1800×1200 generado en local, o JSON para guardar/compartir el diseño' },
    ],
    daily: ['Documentar la red de un cliente antes de tocar nada: el diagrama es el primer entregable', 'Planificar una ampliación (nueva VLAN, AP extra) viendo el impacto antes de comprar hardware', 'Formar en redes: montar la topología de tu casa y entender por qué el router es single point of failure'],
    ethical: ['El análisis señala fallos de diseño (red sin firewall, nodos colgando): documentarlos es el 80% de una auditoría de red', 'La segmentación correcta (IoT fuera de la LAN de gestión) se VE al dibujar: úsalo para convencer al cliente', 'El BOM honesto evita el overselling: dimensiona por necesidad, no por margen'],
    tips: ['Empieza por un preset y modifícalo: más rápido que el lienzo vacío', 'El análisis de IPs duplicadas y huérfanos corre al vuelo: corrige y mira cómo cambia', 'El PNG export incluye fondo y leyenda: pega directo en informes y presentaciones'],
  },
  cabledocs: {
    what: 'Documentación animada de cableado de red: pinout RJ45 con T568A y T568B (con señal animada recorriendo los 8 hilos y el par cruzado explicado), tabla de categorías Cat5e a Cat8 con velocidades y distancia máxima, tipos de cable (UTP, FTP, SFTP, coaxial, DAC) con sus trampas reales, fibra óptica con animación del haz (single vs multimode y por qué dispersa), conectores (RJ45, LC, SC, ST, MPO) y herramientas del instalador.',
    params: [
      { name: 'sección', type: 'scroll', required: true, desc: 'pinout, categorías, tipos, fibra, conectores y herramientas' },
      { name: 'animaciones', type: 'auto', desc: 'la señal viaja por el cable y el haz se propaga por la fibra en vivo' },
    ],
    daily: ['Crimpear un latiguillo y dudar entre T568A y B: el pinout animado lo deja claro (elige UNO y sé consistente)', 'Comprar cable para una reforma: la tabla de categorías evita pagar Cat8 para 10 metros', 'Identificar qué conector necesita ese transceptor SFP: LC/SC/ST/MPO con fotos de uso'],
    ethical: ['Saber cablear es la mitad invisible de la seguridad: un cable cruzado donde no toca o un patch panel caótico rompe segmentaciones pensadas', 'Los enlaces de cobre emanar radio: cables apantallados bien aterrizados son hardening físico real', 'Fibra vs cobre en distancia y EM: elige bien y evitas repetidores innecesarios que son puntos de acceso'],
    tips: ['T568A vs B solo cambia los pares naranja y verde: un extremo A y otro B = cable CRUZADO (útil solo para conectar dos PCs directo)', 'Cat5e aguanta 1 GbE a 100 m y 10GbE a ~45 m: no tires Cat6 «por si acaso» sin calcular', 'En fibra multimodo la dispersión modal limita la distancia: el modo single va mucho más lejos pero los transceptores cuestan más'],
  },
  healthcheck: {
    what: 'Chequeo de salud de tu equipo desde el navegador: detecta núcleos de CPU, RAM (Device Memory), batería (Battery API con nivel y estado de carga), conexión (Network Information API: tipo efectivo, RTT, downlink), almacenamiento (Storage Estimate) y GPU (renderer WebGL). Añade un benchmark real de CPU (primo counting) y un módulo manual de desgaste por antigüedad con 12 componentes, vida útil estimada, consejos por nivel de salud y plan de mantenimiento.',
    params: [
      { name: 'escaneo', type: 'button', required: true, desc: 'lee APIs del navegador; nada se envía a ningún servidor' },
      { name: 'benchmark CPU', type: 'button', desc: 'calcula un score con cálculo de primos: compara tu equipo con otros' },
      { name: 'componentes manuales', type: 'formulario', desc: 'antigüedad de disco, batería, ventiladores… para estimar desgaste' },
    ],
    daily: ['Saber si tu portátil aguanta otra VM más antes de comprarla (núcleos, RAM, score CPU)', 'Ver el estado real de la batería sin instalar apps raras', 'Plan de mantenimiento: qué limpiar, qué sustituir y cuándo, según antigüedad'],
    ethical: ['El desgaste de disco es una causa silenciosa de pérdida de datos: prevenir es la mejor política de seguridad', 'Un equipo sano aplica parches y cifrado sin sufrir: la salud del hardware es parte del hardening', 'Todo el escaneo es local: demuestra qué puede saber un sitio web de tu hardware (y por qué fingerprinting funciona)'],
    tips: ['El renderer de WebGL revela tu GPU exacta: úsalo para verificar drivers, y piensa en la huella que dejas', 'deviceMemory redondea a potencias de 2 por privacidad: es lo que cualquier web ve de ti', 'El score CPU es relativo a TU navegador: compara equipos de tu parque entre sí, no con benchmarks de internet'],
  },
  speedtest: {
    what: 'Test de velocidad real desde el navegador contra los endpoints públicos de speed.cloudflare.com (CORS abierto): mide ping (10 muestras, mínimo y jitter), descarga escalonada (2→25 MB con reader streaming y muestras en vivo) y subida (3×2 MB), con velocímetro SVG animado, sparkline de muestras, resultados Mbps/MB transferidos y guía de interpretación de cada métrica.',
    params: [
      { name: 'iniciar test', type: 'button', required: true, desc: '3 fases: ping, descarga, subida; cancelable' },
      { name: 'muestras', type: 'sparkline', desc: 'las mediciones parciales se dibujan en vivo' },
    ],
    daily: ['Comprobar si tu conexión cumple lo que pagas (y con qué ISP estás realmente)', 'Diagnosticar «va lento»: separa latencia de ancho de banda antes de llamar al proveedor', 'Verificar si tu VPN o proxy está estrangulando el tráfico (compara con y sin túnel)'],
    ethical: ['Entender jitter y latencia explica por qué «tengo 600 Mbps» no arregla el VoIP cortado: cultura de red', 'El test genera tráfico real contra Cloudflare: hazlo con cabeza en conexiones limitadas o de clientes', 'Útil para validar que un lab remoto/VPN cumple para trabajar sin quejarse a ciegas'],
    tips: ['El ping mostrado es el MÍNIMO de 10: es el más estable; el jitter (variación) es lo que mata las videollamadas', 'La descarga escala de 2 a 25 MB para que el TCP arranque: el primer segundo no es tu velocidad real', 'La subida suele ser mucho menor (asimétrico): mira el ratio si haces streaming o backups a la nube'],
  },
  nfclab: {
    what: 'Laboratorio educativo de NFC/RFID sin hardware: 8 familias de chips (MIFARE Classic 1K/4K, Plus, DESFire, NTAG, EM4100, HID Prox, iCLASS) con frecuencia, memoria y seguridad reales; generación de UIDs con CSPRNG (formato NXP correcto: byte 04, cascada 88 en UID7); dumps simulados estructuralmente correctos (bloque 0 con BCC/SAK/ATQA, trailers con claves por defecto FFFFFFFFFFFF); codificador/decodificador Wiegand 26 (FC8+CN16 con paridades); animaciones de modulación ASK/FSK/PSK/load; y 5 escenarios de ataque con dificultad, herramienta y su defensa.',
    params: [
      { name: 'familia', type: 'selector', required: true, desc: 'elige el chip y genera UID + dump simulado' },
      { name: 'Wiegand', type: 'bidireccional', desc: 'FC/CN → 26 bits y 26 bits pegados → FC/CN con validación de paridades' },
      { name: 'escenarios', type: 'tarjetas', desc: '5 ataques reales (clonado, relay, brute force…) con defensa y aviso legal' },
    ],
    daily: ['Entender qué tecnología hay en tu badge corporativo antes de una auditoría física', 'Formar personal en por qué «pasar la tarjeta» no es autenticación segura', 'Diseñar la migración: el lab muestra por qué MIFARE Classic está roto y DESFire no'],
    ethical: ['⚖ La clonación de tarjetas de acceso AJENAS es delito aunque «solo sea para ver si funciona»: esto es simulación, sin hardware', 'Los dumps son aleatorios pero estructuralmente correctos: sirven para APRENDER el formato, no para escribir tarjetas', 'El 50% de instalaciones reales cae por claves por defecto: la defensa es cambiarlas y migrar de tecnología'],
    tips: ['El BCC del bloque 0 es XOR de los bytes del UID: verifícalo en el dump generado', 'Wiegand 26 no cifra nada: cualquier lector (-o app) puede leer FC y CN de un badge expuesto', 'La defensa real contra relay no es el cifrado sino la distancia: los sistemas UWB/número variable lo mitigan'],
  },
  duckyforge: {
    what: 'Constructor de payloads DuckyScript por bloques para USB Rubber Ducky clásico y Flipper Zero (badUSB): 12 tipos de instrucción (REM, DELAY, DEFAULTDELAY, DEFAULT_CHAR_DELAY, STRING, STRINGLN, teclas especiales, combinaciones GUI/CTRL/ALT, REPEAT, ALTSTRING, suplantación VID/PID y WAIT_FOR_BUTTON_PRESS) con selección de objetivo que avisa de incompatibilidades, 4 presets didácticos reversibles, explicación de cada bloque, salida copiable y descarga payload.txt.',
    params: [
      { name: 'objetivo', type: 'chips', required: true, desc: 'clásico (DuckyScript v1 / Twin Duck) o Flipper Zero (con extensiones)' },
      { name: 'bloques', type: 'lista reordenable', required: true, desc: 'compón, reordena y configura; cada bloque trae su explicación' },
      { name: 'presets', type: 'chips', desc: 'aviso de concienciación, badUSB Flipper armado, apagado reversible y lab TCP' },
      { name: 'salida', type: 'CopyBlock + download', desc: 'payload.txt listo para la micro-SD del Ducky o la carpeta badusb del Flipper' },
    ],
    daily: ['Preparar demos de concienciación para tu campaña de seguridad interna (USBs marcados y autorizados)', 'Automatizar tareas de instalación de laboratorio con «teclas» en vez de instalación manual', 'Aprender el protocolo HID: el Ducky no es más que un teclado que teclea muy rápido'],
    ethical: ['⚖ Conectar un badUSB a equipo ajeno sin permiso escrito es delito de acceso no autorizado: los presets aquí son reversibles y didácticos a propósito', 'En pentests físicos autorizados, documenta cada payload y deja mecanismo de reversión', 'La contramedida real es usbguard/políticas HID + formación: enseña el payload de awareness a tus usuarios'],
    tips: ['El DELAY 3000 inicial es sagrado: es lo que tarda el SO en montar el «teclado»', 'Los bloques marcados F son exclusivos de Flipper: el builder te avisa si tu objetivo es clásico', 'WAIT_FOR_BUTTON_PRESS es tu seguro: el payload no arranca hasta que TÚ lo armas desde el menú'],
  },

  /* ── Ronda 12: análisis avanzado ── */
  redos: {
    what: 'Analizador de ReDoS (Regex Denial of Service) en dos fases: análisis estático de la estructura del patrón (cuantificadores anidados, alternancias solapadas, .* cuantificado) y medición dinámica real del matching en un Web Worker aislado: corre el regex contra entradas cada vez más grandes (256 → 67M chars) y clasifica el crecimiento como lineal, polinómico o exponencial, con timeout por muestra para no colgar tu navegador.',
    params: [
      { name: 'regex', type: 'string', required: true, desc: 'patrón a analizar (sintaxis JavaScript)' },
      { name: 'flags / unit / suffix', type: 'formulario', desc: 'flags del regex, carácter que se repite y sufijo que hace fallar el match (el input crafted)' },
      { name: 'análisis estático', type: 'automático', desc: 'banderas estructurales con severidad y explicación del porqué explota' },
    ],
    daily: ['Auditar los regex de validación de TU app antes de desplegar (email, teléfonos, DNI)', 'Revisar parsers de logs o WAFs caseros: los patrones de detección son candidatos perfectos', 'Elegir entre dos regex equivalentes midiendo cuál escala mejor'],
    ethical: ['Demostrar en formación por qué un input de 50 KB puede tumbar un servidor sin ancho de banda', 'Incluir en el pentest la revisión de regex de entrada: es una vulnerabilidad CWE-1333 real', 'La medición dinámica es inofensiva: corre contra TU navegador, no contra producción'],
    tips: ['El backtracking exponencial solo explota con input crafted: (a+)+$ contra "aaaaaaaaaaaaaaaaaaaa!" — el sufijo que falla es clave', 'La cura general: eliminar la ambigüedad (un solo camino de match), acotar con {n,m} o usar motores RE2/linear-time', 'TimeOut en la app SIEMPRE: el ReDoS perfecto no existe, pero el input acotado limita el daño'],
  },
  wifilter: {
    what: 'Constructor de display filters de Wireshark con catálogo de campos por protocolo (frame, eth, ip, tcp, udp, dns, http, tls, icmp, arp) explicado uno a uno, presets de caza listos (patrones de escaneo, exfil por DNS TXT, credenciales HTTP en claro, SNI de dominios raros), composición visual con && / || y validación en vivo de la sintaxis (paréntesis, comillas, errores clásicos de confundir display filter con BPF).',
    params: [
      { name: 'protocolo + campo', type: 'selectores', required: true, desc: 'catálogo con descripción y ejemplo de cada campo' },
      { name: 'operador + valor', type: 'formulario', desc: '==, !=, contains, matches, >, < …' },
      { name: 'presets', type: 'tarjetas', desc: '8 filtros de caza con el porqué de cada uno' },
    ],
    daily: ['Recordar la sintaxis exacta del campo sin googlearla (¿tcp.stream eq o ==?)', 'Filtrar tu propia captura: separar ruido de señal durante un análisis', 'Documentar hallazgos: el filtro exacto que reproduce el hallazgo va en el informe'],
    ethical: ['El display filter es el instrumento del defensor: captura en TU red, filtra y documenta', 'Los presets de caza (SYN scan, exfil DNS) son detección blue team lista para tu SOC', 'Captura solo lo autorizado: el análisis de tráfico ajeno es ilegal aunque sea pasivo'],
    tips: ['Display filter ≠ capture filter (BPF): "tcp port 80" es BPF; "tcp.port == 80" es display — la tool te avisa si los mezclas', 'tcp.stream eq N aísla UNA conversación completa: follow-up perfecto del Flow Graph', 'Para"empieza por" usa matches con ^ o contains; ==* no existe'],
  },
  malwaretime: {
    what: 'Museo interactivo del malware: 17 piezas desde el Morris Worm (1988) hasta LockBit, organizadas en 4 eras (prehistoria, explosión, cibercrimen, estado-nación) con filtros por tipo. Cada pieza: impacto real con números, las técnicas MITRE ATT&CK que encarnó, la lección de defensa que sigue viva y un dato que sorprende — historia del ofensivo contada como catálogo de detección.',
    params: [
      { name: 'era', type: 'timeline', required: true, desc: '4 eras clicables (1988-1998, 2000-2008, 2007-2016, 2010-hoy)' },
      { name: 'tipo', type: 'chips', desc: 'gusano, ransomware, botnet, APT, stealer, wiper, troyano' },
      { name: 'ficha', type: 'expansible', desc: 'MITRE, lección y dato curioso por pieza' },
    ],
    daily: ['Formación: explicar por qué existe cada control (el parcheo nace de Code Red, el 3-2-1 de CryptoLocker)', 'Preparar el "war story" de una charla: cada técnica moderna tiene un ancestro de 20 años', 'Estudiar qué técnicas MITRE persisten desde hace décadas: las que NO mueren son las que debes detectar mejor'],
    ethical: ['Historia para defender: cada pieza enseña el control que la habría frenado, no el exploit', 'El museo no contiene payloads ni IOCs vivos: es conocimiento conceptual', 'Perfecto para justificar presupuestos: el coste de NotPetya (10B$) convence mejor que un gráfico'],
    tips: ['El patrón perpetuo: entrada no confiable + ejecución + propagación. Zero trust y mínima superficie desde 1988', 'Los gusanos mueren por parcheo, los APT por visibilidad, el ransomware por backups inmutables', 'Emotet respondía hilos de email REALES robados: la ingeniería social importa más que el exploit'],
  },

  /* ── Ronda 12: cripto y PKI ── */
  hashvisual: {
    what: 'Convierte cualquier hash en un identicon determinista: el hash alimenta un PRNG (xmur3 + mulberry32) que dibuja una retícula simétrica en espejo con color propio. Mismo hash → misma imagen siempre. Comparador de dos hashes lado a lado con % de celdas iguales, y modo texto que hashea con SHA-256 (WebCrypto) antes de dibujar.',
    params: [
      { name: 'hash A / hash B', type: 'inputs', required: true, desc: 'hex de 32-128 chars (si no parece hash, se usa el texto como semilla)' },
      { name: 'similitud', type: 'automático', desc: '% de celdas iguales + veredicto (idénticos / visualmente cercanos / distintos)' },
      { name: 'hashear texto', type: 'botón', desc: 'SHA-256 local de cualquier texto y su identicon' },
    ],
    daily: ['Verificar a golpe de vista que el SHA-256 de una ISO descargada coincide con el del fabricante', 'Comparar claves públicas SSH o certificados sin leer 64 caracteres hex', 'Detectar typos al pegar hashes a mano: el dibujo cambia drásticamente'],
    ethical: ['El efecto avalancha hecho imagen: 1 bit cambiado del input cambia ~mitad del dibujo — didáctica de cripto perfecta', 'En formación: comparar el identicon de "password1" vs "password2" muestra por qué SHA no debe usarse sin salt', 'Nunca sustituye la comparación del hex completo: es ayuda visual, no prueba'],
    tips: ['Dos hashes distintos comparten ~50% de celdas por azar: >70% de parecido visual solo indica "misma familia", no igualdad', 'La simetría en espejo es la clave: tu cerebro procesa patrones simétricos mucho mejor que hex', 'Útil para "spot the difference" en repos: hash del mismo fichero en dos ramas'],
  },
  x509: {
    what: 'Decoder X.509 completo con parser ASN.1/DER propio: desglosa version, serial, algoritmo de firma, issuer/subject (RDN con OIDs), validez (UTCTime/GeneralizedTime), clave pública (algoritmo + bits RSA), y extensiones críticas: SAN (DNS/IP/email/URI, con detección de wildcards), EKU (serverAuth, codeSigning, any), keyUsage bit a bit, BasicConstraints (CA:TRUE + pathlen) y SKI/AKI. Flags de sospecha automáticas: CA:TRUE en cert de servidor, SHA1/MD5, RSA < 2048, validez > 825 días, auto-firmados, SAN vacía, expirados.',
    params: [
      { name: 'PEM', type: 'textarea', required: true, desc: '-----BEGIN CERTIFICATE----- … o base64 DER en crudo' },
      { name: 'flags', type: 'automático', desc: 'peligro/aviso/ok con explicación de por qué importa' },
      { name: 'export', type: 'CopyBlock', desc: 'JSON completo del certificado parseado' },
    ],
    daily: ['Inspeccionar el cert de un servidor antes de confianza (openssl s_client → pegar aquí)', 'Ver para qué SIRVE una clave (EKU): ¿serverAuth? ¿codeSigning? ¿any?', 'Revisar la cadena de tu propia PKI interna: ¿algún intermedio con CA:TRUE de más?'],
    ethical: ['El ataque clásico que esto detecta: un cert "de servidor" con CA:TRUE permite emitir certs para CUALQUIER dominio — game over de la confianza', 'Wildcards: si filtran esa clave, cae todo *.dominio de golpe — riesgo que el cliente suele no entender', 'MD5/SHA1 y RSA<2048 siguen vivos en PKI interna de fábricas y SCADA: documentarlos es el primer paso'],
    tips: ['Los navegadores modernos IGNORAN el CN: sin SAN el cert no valida hostname, aunque el CN esté bien', 'Validéz > 398 días = incumple CA/Browser Forum: válido en PKI privada, sospechoso en pública', 'El PEM no es secreto: contiene solo la clave PÚBLICA. La privada (BEGIN PRIVATE KEY) jamás la pegues'],
  },

  /* ── Ronda 12: ingeniería inversa ── */
  bytecode: {
    what: 'Inspector de bytecode didáctico, 100% local y de solo lectura. Java: parsea el .class REAL — magic CAFEBABE, major/minor → versión JDK, constant pool completa con tags (Utf8, Class, Methodref, InvokeDynamic…), flags de acceso, this/super, interfaces, fields y methods con descriptores JVM y atributos. Python: cabecera del .pyc — magic → versión de CPython, flags hash-based vs timestamp, mtime/tamaño del fuente. Extracción de strings con patrones sospechosos marcados.',
    params: [
      { name: '.class / .pyc', type: 'drop', required: true, desc: 'arrastra el fichero; el magic de los primeros bytes decide el parser' },
      { name: 'constant pool', type: 'tabla', desc: 'entradas navegables con tag y valor' },
      { name: 'strings', type: 'lista', desc: 'rutas, URLs y comandos en claro dentro del binario' },
    ],
    daily: ['Ver qué declara REALMENTE un .jar de terceros antes de añadirlo a tu build (supply chain)', 'Entender los descriptores JVM: Ljava/lang/String; y ([I)V dejan de ser jeroglíficos', 'Inspeccionar __pycache__ de un módulo: qué nombres y docstrings deja expuestos'],
    ethical: ['La lección central: el bytecode es el programa — ofuscar nombres no oculta la lógica ni los strings', 'Antes de ejecutar un binario desconocido: inspección estática aquí, ejecución NUNCA en tu equipo principal', 'Para decompilar de verdad: jadx (Java) o pycdc/uncompyle6 (Python) — esto es el primer vistazo'],
    tips: ['InvokeDynamic en el constant pool = lambdas/records modernos de Java', 'Los .pyc hash-based (flags & 1) validan el fuente por hash PEP 552: mtime ya no existe', 'Strings marcadas en rojo: URLs, /etc/shadow, /dev/tcp, base64 — lo primero que busca un analista'],
  },
  firmware: {
    what: 'Inspector de imágenes de firmware, 100% local y sin ejecutar nada. ESP8266/ESP32: parsea la imagen flash real — magic 0xE9, chip (ESP32/S2/S3/C3/C6…), modo/tamaño/frecuencia de flash, entry point, segmentos con load address y preview, y la app description de ESP-IDF (nombre de proyecto, versión, fecha de compilación). Arduino AVR: parser Intel HEX completo con validación de checksums por registro, segmentos de flash y entry point. Extracción de strings con patrones sospechosos marcados.',
    params: [
      { name: '.bin ESP', type: 'drop', required: true, desc: 'imagen de flash (esptool.py image_info versión web)' },
      { name: '.hex Arduino', type: 'drop', desc: 'Intel HEX con validación de checksums' },
      { name: 'strings', type: 'lista', desc: 'URLs, credenciales WiFi, rutas /etc/, comandos embebidos' },
    ],
    daily: ['Auditar el firmware de TU router/cámara IoT antes de confiar en él (el .bin está en la web del fabricante)', 'Ver qué URLs de update/contacta un dispositivo: C2 legítimo vs sospechoso', 'Encontrar credenciales hardcodeadas en gadgets baratos: WPA key, tokens, telnet'],
    ethical: ['El análisis estático de firmware propio o documentado públicamente es investigación legítima', 'Los patrones marcados son los de un audit IoT real: /dev/tcp y wget en un firmware doméstico son banderas rojas', 'Nada se ejecuta: parse de bytes + strings. El sandbox eres tú'],
    tips: ['La app description (magic 0xABCD5432) delata proyecto, versión de ESP-IDF y fecha: fingerprinting perfecto', 'Segmentos en 0x3FF… = RAM de datos; 0x400… = código mapeado de flash', 'Un .hex con checksums inválidos = fichero corrupto O manipulado: nunca flashear sin investigar'],
  },

  /* ── Ronda 12: radio y audio ── */
  blegatt: {
    what: 'Explorer de GATT (Bluetooth Low Energy): catálogo de los servicios SIG que importan (GAP, Device Information, Battery, Heart Rate, Automation IO, Nordic DFU…) con sus characteristics, propiedades y el RIESGO REAL de cada uno — fuga de identidad, tracking pasivo, lectura de OTPs por notificaciones, control físico sin pairing, takeover via DFU sin firma. Conversor UUID 16↔128 bits y decodificador de advertising BLE (len/type/value) que revela nombre y Manufacturer Data.',
    params: [
      { name: 'búsqueda', type: 'texto', required: true, desc: 'filtra servicios, characteristics y riesgos' },
      { name: 'UUID', type: 'conversor', desc: '16-bit ↔ 128-bit (base 0000xxxx-…-00805F9B34FB)' },
      { name: 'advertising hex', type: 'decoder', desc: 'pega el payload del paquete y ve cada campo decodificado' },
    ],
    daily: ['Saber qué expone TU smartwatch/auriculares antes de conectarlos a todas partes', 'Filtrar el escaneo de nRF Connect con el catálogo: qué servicio es cada 0x18xx', 'Auditar el IoT de tu oficina: nombres de usuario en Device Names, DFU abierto, serials legibles'],
    ethical: ['El advertising es lo que TODO device BLE emite a 10 metros: decodificarlo es entender el protocolo, no atacar', 'El riesgo real es físico: candados y dispensadores GATT-write-sin-pairing se han demostrado hackeables', 'La defensa que enseña: LE Secure Connections + bonding, DFU firmado y sin PII en el Device Name'],
    tips: ['Pairing "Just Works" NO protege contra MITM: sin verificación numérica no hay autenticidad', 'El Manufacturer Data sobrevive a la MAC aleatoria: por eso el tracking BLE es tan fácil', '0xFE59 (Nordic DFU) visible en tu gadget = puerta de flasheo total si el firmware no valida firmas'],
  },
  stegoaudio: {
    what: 'Esteganografía LSB sobre WAV/PCM real, todo local: parser RIFF propio (PCM 16-bit), incrustación de mensajes en el bit menos significativo de las muestras con cabecera HXST + longitud, extracción simétrica, y capacidad calculada en bytes. Visualización del audio con waveform y espectrograma calculado por FFT radix-2 propia (ventana de Hann) dibujado en canvas — el mensaje se ve (y no se ve) en el dominio de la frecuencia.',
    params: [
      { name: '.wav PCM 16-bit', type: 'drop', required: true, desc: 'máx 16 MB; convierte con ffmpeg -acodec pcm_s16le' },
      { name: 'mensaje', type: 'texto', desc: 'se incrusta en LSBs consecutivos; capacidad ≈ nº de muestras bits' },
      { name: 'espectrograma', type: 'canvas', desc: 'FFT propia, paleta verde-terminal' },
    ],
    daily: ['Entender la esteganografía de audio con un caso real y visible (no solo teoría)', 'Verificar si un WAV tuyo lleva payload: extracción LSB en 1 clic', 'Comprobar en el espectrograma qué "textura" esconde mejor un mensaje'],
    ethical: ['Mismo marco ético que Stego LSB: ocultar datos puede ser legítimo (watermarking) o no; el análisis es la defensa', 'La detección real es estadística: chi-cuadrado y RS-analysis del LSB — este laboratorio te enseña el vector para defenderlo', 'El audio portador debe ser tuyo: distribuir mensajes ocultos a terceros tiene el mismo marco legal que cualquier contenido'],
    tips: ['El LSB cambia la amplitud 1/32768: inaudible, pero analizable estadísticamente', 'La cabecera HXST hace el ciclo completo verificable: incrusta → descarga → sube → extrae sin salir del navegador', 'El audio con ruido de fondo (música compleja) esconde mejor que el silencio o las notas puras'],
  },

  /* ── Ronda 12: ofensiva con detección ── */
  cronapt: {
    what: 'Simulador de persistencia con cron/at para laboratorio (MITRE T1053): configura mecanismo (crontab de usuario, /etc/cron.d, cron.daily, systemd timer, at one-shot), expresión, usuario y payload didáctico, y genera los artefactos completos: línea de cron, script de instalación, ROLLBACK documentado, y las detecciones que lo cazan: regla Sigma (YAML) con tags ATT&CK, regla YARA para el payload y 6 queries de hunting (crontab, list-timers, journalctl, FIM con auditd).',
    params: [
      { name: 'mecanismo', type: 'select', required: true, desc: '5 mecanismos con su porqué y su detección natural' },
      { name: 'payload', type: 'select', desc: 'marker (inofensivo, recomendado), shell o downloader de laboratorio' },
      { name: 'C2', type: 'IP:puerto', desc: 'tu listener de laboratorio, sustituido en los artefactos' },
    ],
    daily: ['Entrenar detección: genera el marker, instala en TU VM, y verifica que tu SIEM/Sigma dispara', 'Comparar 5 mecanismos de persistencia y por qué cada uno deja huella distinta', 'El rollback documentado es el entregable que falta en el 90% de los pentests con persistencia'],
    ethical: ['⚖ Persistencia SOLO en laboratorio propio: en pentest real debe estar explícitamente en el alcance y documentada con su limpieza', 'El payload marker existe a propósito: valida tu detección sin tocar nada agresivo', 'T1053.003 (cron) y T1053.006 (systemd) con subtécnica exacta en los tags de la regla Sigma'],
    tips: ['Cron ejecuta con entorno mínimo: PATH distinto, sin perfil — payload que depende del entorno falla silenciosamente', 'La detección fuerte es temporal: cambio en cron* + proceso hijo de crond + conexión saliente en la misma ventana', 'auditctl -w /etc/cron.d/ -p wa: el File Integrity Monitoring es la red cuando nadie revisa a mano'],
  },

  /* ── Ronda 13: hacking WiFi ── */
  wifilab: {
    what: 'Constructor de comandos de auditoría 802.11 para TU laboratorio, organizado en los 7 pasos reales de un pentest WiFi: modo monitor, descubrimiento pasivo, captura del 4-way handshake, deauth didáctico (1 paquete), ataque PMKID sin clientes, crack offline con hashcat/aircrack y restauración del sistema. Cada paso explica el porqué técnico, muestra los comandos exactos con tus datos sustituidos (interfaz, BSSID, canal, SSID, cliente, wordlist, máscara), qué esperar en la salida, la trampa típica que hace fallar a todo el mundo y CÓMO SE DETECTA esa acción (perspectiva blue team). Incluye tabla de hardware que sí inyecta con sus trampas por revisión.',
    params: [
      { name: 'interfaz', type: 'texto', required: true, desc: 'tu wlanX; genera los comandos con wlanXmon' },
      { name: 'BSSID / canal / SSID', type: 'texto', desc: 'datos de TU red de laboratorio, sustituidos en todos los pasos' },
      { name: 'wordlist / máscara', type: 'texto', desc: 'para el paso de crack: ruta de diccionario o máscara hashcat -a 3' },
      { name: 'lab-completo.sh', type: 'export', desc: 'los 7 pasos concatenados con comentarios, listos para revisar antes de ejecutar' },
    ],
    daily: ['Montar tu primer lab WiFi completo: router viejo + adaptador con modo monitor + esta guía paso a paso', 'Entender QUÉ hace exactamente cada herramienta (airmon-ng, airodump-ng, hcxdumptool) antes de ejecutarla a ciegas', 'Aprender la perspectiva defensiva: cada paso dice qué vería un WIPS o el log del AP'],
    ethical: ['⚖ Auditar WiFi ajeno sin permiso escrito es delito (acceso a sistemas informáticos + interferencias), aunque sea el vecino', 'El paso de deauth está limitado a 1 paquete a propósito: lo mínimo ético para entender el ataque en TU red', 'La detección es parte del aprendizaje: un pentest profesional reporta tanto el acceso como la trazabilidad'],
    tips: ['El chipset manda más que el software: AR9271 y RT3070 para empezar; ojo con las revisiones (TL-WN722N v1 ✅ v2 ❌)', 'PMKID es la vía limpia cuando hay clientes: no necesita deauth ni espera', 'hashcat -m 22000 es el formato unificado actual: el -m 2500 de los tutoriales viejos está deprecado'],
  },
  wifi80211: {
    what: 'Decodificador de frames 802.11 desde hex, 100% local: parsea el Frame Control bit a bit (versión, tipo, subtipo — beacon, probe, deauth, QoS data…), los 8 flags con su significado real (retry, protected frame, power management…), las 3 direcciones con etiquetas que cambian según toDS/fromDS (DA/SA/BSSID), duración, seq/frag, y los Information Elements de beacons y probes: SSID, rates, canal, país, HT/VHT, vendor OUIs y el RSN completo con suites de cifrado, AKM (PSK/SAE/802.1X/OWE) y estado de PMF. Incluye 4 frames de ejemplo listos para diseccionar.',
    params: [
      { name: 'frame hex', type: 'texto', required: true, desc: 'bytes del MAC header en hex, con o sin espacios/colon (acepta truncados)' },
      { name: 'flags', type: 'visual', desc: 'los 8 bits del byte 1 del FC encendidos/apagados con explicación' },
      { name: 'IEs', type: 'tabla', desc: 'cada Information Element con id, nombre, longitud y detalle decodificado' },
    ],
    daily: ['Entender qué es EXACTAMENTE ese beacon, probe o deauth que ves en Wireshark sin adivinar', 'Verificar la seguridad que anuncia una red leyendo su RSN: ¿WPA3 de verdad, PMF required o puro marketing?', 'Comparar un frame normal con uno sospechoso: retransmisiones masivas, deauths con reason codes raros'],
    ethical: ['Decodificar frames es leer el protocolo, no atacar: es la base del análisis inalámbrico defensivo', 'El frame de deauth del ejemplo es didáctico: entenderlo es lo que permite detectarlo y bloquearlo con PMF', 'Capturar el aire ajeno pasivamente no está penado en la mayoría de jurisdicciones, pero DECODIFICAR contenido de terceros sí puede serlo: quédate en metadatos'],
    tips: ['El Frame Control son solo 2 bytes y ya te dicen tipo, subtipo y si va cifrado: lo primero que mira un analista', 'En frames de gestión, addr2 = quien transmite: es el campo que delata un evil twin (misma SSID, otra MAC)', 'IE 61 (HT Operation) confirma el canal real operativo, que a veces no coincide con el IE 3 anunciado'],
  },
  wifiplanner: {
    what: 'Planificador de canales WiFi con el solapamiento real del espectro, no el de los tutoriales. 2.4 GHz: modela el ancho de 20 MHz sobre el paso de 5 MHz (canales a menos de 4 de distancia se pisan), calcula el mapa de congestión por canal a partir de TUS APs vecinos con su potencia relativa, sugiere los 3 mejores y genera plan automático 1/6/11 para tus APs propios. 5 GHz: los 25 canales con su estado DFS (radar, banda meteorológica), los 6 grupos de 80 MHz con avisos de CAC y la recomendación UNII-1/UNII-3. 6 GHz: los 15 PSC que los clientes escanean primero y por qué esa banda nace sin el juego de Tetris de 2.4.',
    params: [
      { name: 'APs vecinos', type: 'lista editable', required: true, desc: 'SSID, canal y potencia de lo que ves en airodump-ng' },
      { name: 'mapa de congestión', type: 'gráfico', desc: 'score 0-10 por canal 1-13 con co-canal y solape parcial separados' },
      { name: 'banda', type: 'select', desc: '2.4 / 5 / 6 GHz: cada una con su plan y sus trampas' },
    ],
    daily: ['Elegir el canal de tu router con datos en vez de dejarse el 6 por defecto como todo el vecindario', 'Diagnosticar por qué tu WiFi va lento a ciertas horas: mira el mapa de congestión antes de culpar al ISP', 'Planificar el despliegue de varios APs sin autocanibalizarte (y saber cuándo pasar todo a 5/6 GHz)'],
    ethical: ['Escanear y planificar tu propia red (o con autorización) es gestión de espectro legítima', 'Cambiar el canal de TU router no afecta a nadie: compartir el medio es el diseño de CSMA/CA', 'La regla de oro que enseña: canales pegados (6 y 9) son PEOR que co-canal — no hagas al vecino lo que no quieres para ti'],
    tips: ['En 2.4 GHz solo 1/6/11 no solapan: todo lo demás es compromising', 'DFS 52-144 da espectro limpio pero si el AP oye radar: salto de canal y ~60 s de CAC en silencio', 'En 6 GHz colócate SIEMPRE en un PSC: si no, tu AP es invisible para la mayoría de clientes'],
  },
  wifiaudit: {
    what: 'Auditor de seguridad para TU red WiFi que puntúa la configuración sobre 100 con nota A+ a F: calidad del cifrado (WEP→WPA3), autenticación (open/PSK/SAE/802.1X), PMF 802.11w, entropía real de la passphrase (con penalización por patrones humanos tipo rockyou), WPS, panel de administración y firmware. Desglose de cada check con su explicación, checklist de hardening priorizada por esfuerzo (de minutos a una tarde), cazadores de falsas seguridades (SSID oculto, filtro MAC) y matriz de 7 amenazas (evil twin, karma, deauth, crack offline, Pixie Dust, KRACK, Dragonblood) con cómo se detectan y su defensa.',
    params: [
      { name: 'configuración', type: 'formulario', required: true, desc: 'cifrado, auth, PMF, passphrase, WPS, admin, firmware, segmentación' },
      { name: 'score', type: 'gráfico', desc: 'anillo animado 0-100 con grade y desglose de puntos por check' },
      { name: 'hardening', type: 'checklist', desc: '7 acciones priorizadas con el porqué, los pasos y el esfuerzo' },
    ],
    daily: ['Auditar tu red de casa antes de que lo haga otro: 10 minutos que cierran el 90% del riesgo', 'Justificar cambios al que manda en el router: el score con desglose es el argumento, no la opinión', 'Entrenar el ojo de auditor: saber qué mirar y en qué orden en cualquier despliegue WiFi'],
    ethical: ['Diseñada para redes PROPIAS o con autorización escrita: es una herramienta de defensa', 'La passphrase se evalúa en local con entropía y patrones: nunca sale del navegador', 'El hardening es el objetivo: cada check fallido es exactamente lo que explota un atacante con herramientas públicas'],
    tips: ['Dos controles tapan el 90% de la matriz: PMF required y passphrase de 16+ aleatorios', 'WPS con Pixie Dust cae en minutos en muchos chips aunque la passphrase sea perfecta: desactívalo', 'SSID oculto y filtro MAC son falsa seguridad: el SSID viaja en los probes de tus clientes y una MAC se clona en 5 segundos'],
  },

  /* ── Ronda 14: ofensiva web avanzada ── */
  graphql: {
    what: 'Laboratorio GraphQL completo en 4 pestañas: (1) plantillas de ataque con riesgo — introspección completa y minificada, IDOR por id, sugerencias del error para enumerar campos, SQLi y NoSQLi vía variables, alias storm para rate-limit bypass y anidamiento profundo para DoS; (2) builder que convierte query + variables en el body JSON exacto para POST con coerción de tipos (true/42/null/objetos reales como {"$ne": null}) y su curl equivalente; (3) traductor inverso JSON→query que extrae tipo de operación, nombre, variables declaradas y árbol de campos de lo capturado en Burp; (4) sondas de inyección sobre el parser y trucos: GET con query, batching en array, endpoints gemelos y persisted queries.',
    params: [
      { name: 'plantilla', type: 'select', required: true, desc: '8 operaciones de ataque con el porqué técnico de cada una' },
      { name: 'variables', type: 'editor', desc: 'claves/valores editables; los objetos JSON llegan parseados al body, no como string' },
      { name: 'minify', type: 'toggle', desc: 'query en 1 línea sin comentarios: lo que espera el body del POST' },
      { name: 'body.json / curl', type: 'export', desc: 'listos para Repeater o para lanzar desde terminal' },
    ],
    daily: ['Auditar el /graphql interno de una app: casi siempre tiene más permisos que el público', 'Convertir una query capturada en un test de IDOR cambiando el id por el de otro usuario', 'Leer operaciones minificadas de logs o har: el traductor las vuelve legibles con árbol de campos'],
    ethical: ['Solo endpoints autorizados: el batching y los alias multiplican el impacto de cada petición', 'La introspección activa es ruidosa para un WAF: en pentests reales, pide primero el esquema o usa sugerencias', 'El DoS por profundidad NO se prueba en producción: bástale confirmar que acepta 5 niveles en staging'],
    tips: ['El error "Did you mean...?" es tu mejor amigo: enumera el esquema campo a campo aunque __schema esté bloqueado', 'Si el endpoint acepta GET con ?query=, tu test pasa por delante de WAFs que solo miran POST', 'Un 200 con errors en el body es NORMAL en GraphQL: busca los datos parciales dentro de data, no solo el código HTTP'],
  },
  cmdinject: {
    what: 'Generador de inyección de comandos por contexto (unix/windows) y objetivo: ejecución simple (id/whoami), output en la respuesta (/etc/passwd, win.ini), ciego time-based (sleep/timeout con medición 3s vs 9s), ciego OOB por DNS (whoami como subdominio), lectura de ficheros valiosos (ssh keys, environ, flags) y reverse shells de laboratorio (bash /dev/tcp, nc con FIFO, PowerShell en memoria). Cada payload se muestra como parámetro completo inyectado (valor legítimo + separador + comando), en URL-encode listo para pegar, con el porqué funciona y la señal exacta de detección.',
    params: [
      { name: 'SO', type: 'select', required: true, desc: 'unix o windows: cambia separadores, binarios y ficheros de referencia' },
      { name: 'objetivo', type: 'select', desc: '6 objetivos desde confirmación hasta reverse shell de lab' },
      { name: 'parámetro/valor', type: 'texto', desc: 'tu caso real: genera filename=report.pdf;id listo para Repeater' },
      { name: 'attacker', type: 'texto', desc: 'IP:puerto de tu listener para los payloads interactivos' },
    ],
    daily: ['Probar un parámetro que descarga ficheros (pdftotext, convert, zip) con separadores progresivos: ; | $() backticks', 'Distinguir ciego visible vs ciego real: sleep 3 y sleep 9 para descartar latencia de red', 'En Windows, certutil y powershell son los binarios nativos que casi nunca faltan'],
    ethical: ['Ejecución de comandos SOLO en laboratorio o con autorización escrita: es compromiso total del host', 'Los payloads OOB apuntan a TU servidor: nunca a dominios de terceros', 'La detección forma parte del entregable: reporta qué habría visto el EDR/WAF'],
    tips: ['La defensa real no es filtrar: es execFile(prog, [args]) sin shell — array de argumentos, sin intérprete', '$() y backticks pasan filtros que solo bloquean ; | & — son ejecución DENTRO del argumento', 'Un separador que no llega (espacio mal codificado) mata el exploit: en Burp controla los bytes en HEX'],
  },
  pathtraversal: {
    what: 'Generador de path traversal por SO (unix/windows/java), profundidad (auto 1→8) y codificación: plain con variantes ....// y ruta absoluta, URL-encode, double-encode para backends que decodifican dos veces, UTF-8 overlong (%c0%af) para Tomcat/Nginx viejos y mezclas que rompen firmas. Targets por SO con su valor real (/etc/passwd, id_rsa, environ, web.config, WEB-INF/web.xml), 5 contextos de explotación (parámetro, filename de upload, zip slip, proxy estático, cookies) y qué te dice cada respuesta (contenido leído, filtro activo, LFI ciego).',
    params: [
      { name: 'SO objetivo', type: 'select', required: true, desc: 'unix, windows o java (cambiar WEB-INF y rutas mixtas)' },
      { name: 'profundidad', type: 'select', desc: 'auto recorre 1→8 niveles: el primero que responde marca el base path' },
      { name: 'targets', type: 'multi-select', desc: 'elige los ficheros; cada uno dice qué aporta leerlo' },
      { name: 'payloads', type: 'lista', desc: 'generados por combinación, con tag de técnica y longitud' },
    ],
    daily: ['Probar ?file=, ?template=, ?lang= y cookies de tema/idioma: los selectores de fichero están en todas partes', 'En uploads, el filename del multipart va a disco: ../../../etc/cron.d/ escribe FUERA del directorio', 'Ante un filtro, cambiar de codificación es más rápido que cambiar de payload'],
    ethical: ['Leer /etc/shadow o claves privadas ajenas es compromiso: para el PoC basta /etc/passwd o win.ini', 'El LFI ciego se confirma con time-based u OOB, no con lectura masiva', 'Los datos leídos van al informe redactados, nunca los ficheros completos'],
    tips: ['Respuesta idéntica con cualquier depth = normalización: pasa a encoding o ruta absoluta', 'En Java, WEB-INF/web.xml es la joya: servlets, parámetros de contexto y a veces credenciales de datasource', 'La defensa es whitelist + canonicalize + startsWith(base): los filtros de caracteres se bypassean siempre'],
  },
  nosql: {
    what: 'Generador de NoSQL injection con 8 payloads por operador: $ne (login sin contraseña), $gt (siempre mayor), $regex (extracción carácter a carácter por prefijos), $where (JS en el servidor con sleep de confirmación), $exists (enumeración de campos), array smuggling urlencoded (password[$ne]=invalid para PHP/Express/Rack), $not (negación de patrón) y $in (múltiples candidatos por petición). Cada payload se genera en body JSON (con objetos reales, no strings) y en query string URL-encoded, con base URL y nombres de parámetros configurables y el criterio de confirmación de cada uno.',
    params: [
      { name: 'endpoint', type: 'texto', required: true, desc: 'url de login o del endpoint con filtros' },
      { name: 'param user/pass', type: 'texto', desc: 'nombres reales de los campos de tu target' },
      { name: 'payload', type: 'dual', desc: 'JSON para POST application/json y URL para GET/form-urlencoded' },
    ],
    daily: ['Probar el login con password[$ne]=invalid: 30 segundos y confirma si el driver recibe objetos', 'Si el body es JSON, buscar OTROS endpoints con filtros (search, list, export): ahí casi nunca validan tipo', 'Extraer la contraseña con $regex por prefijos: ^a, ^b... sin tocar el hash ni la base'],
    ethical: ['El éxito es diferencial: dos peticiones, dos resultados. Si no hay diferencia, no hay inyección — no insistas', '$where con sleep solo en tu lab: en target real, una sola petición de confirmación y fuera', 'La extracción por $regex es lenta y loggeada: en pruebas autorizadas, avisa del volumen'],
    tips: ['El vector estrella es urlencoded: el parser convierte password[$ne]=x en objeto ANTES de que tu código valide nada', 'typeof password === \'string\' en el backend neutraliza el JSON pero no el smuggling del form', 'Mongo 4+ deshabilita $where en algunas configs: $regex sigue siendo tu extractor universal'],
  },
  deser: {
    what: 'Arsenal de deserialización insegura por lenguaje: PHP (unserialize con POP chains y el formato de PHPGGC), Python (pickle con __reduce__ y PyYAML unsafe load), Java (magic ac ed 00 05 y el concepto de cadenas ysoserial por librería en classpath), .NET (ViewState sin machineKey) y Node (node-serialize con IIFE). Incluye tabla de magic bytes para detectar el formato en cookies/headers/bodies (O:, gASV, rO0AB, /wEP, _$$ND_FUNC$$_), payloads con servidor OOB sustituible y la señal de confirmación de cada uno.',
    params: [
      { name: 'servidor OOB', type: 'texto', required: true, desc: 'tu Collaborator/interactsh: la petición entrante ES la prueba' },
      { name: 'lenguaje', type: 'catálogo', desc: '5 stacks con gadget, porqué y detectabilidad' },
      { name: 'payload', type: 'export', desc: 'listo para cookie, header o body según el punto de entrada' },
    ],
    daily: ['Detectar el formato: cookie larga base64 que empieza por rO0AB (Java) o gASV (pickle) = deserialización nativa', 'Confirmar sin romper: un payload que hace curl a tu servidor es inofensivo y prueba ejecución', 'En Java, enumerar librerías (errores, /actuator, nombres de jars) para elegir la cadena ysoserial correcta'],
    ethical: ['La deserialización con gadgets es RCE: solo laboratorio o autorización expresa', 'El payload OOB es el mínimo ético: no toca datos, solo confirma', 'Los secrets que emerjan (claves, cookies) se reportan, no se usan'],
    tips: ['La defensa es de diseño: JSON en vez de objetos nativos, y firma HMAC de lo que viaje en cookie', 'Los filtros de clases (look-ahead Java) se bypassean con gadgets nuevos: no confíes en ellos ni como defensa', 'ViewState sin error de MAC al manipularlo = firma predecible = RCE con ysoserial.net'],
  },
  oauth: {
    what: 'Laboratorio OAuth 2.0 / OIDC: configuración de cliente (flow, client_id, redirect_uri, scope, endpoints) con generador de PKCE real por WebCrypto (verifier + challenge S256), state y nonce aleatorios por sesión. Genera la URL de autorización con desglose explicado de cada parámetro, parsea el callback (query o fragment para implicit) mostrando code/state/tokens/errores y produce el curl del token exchange según el flow. Catálogo de 7 ataques con prueba y detección: state ausente (CSRF de login), redirect_uri laxa, intercepción de code sin PKCE, implicit con token en fragment, mix-up multi-IdP, id_token sin validar y escalada de scope.',
    params: [
      { name: 'flow', type: 'select', required: true, desc: 'code+PKCE (recomendado), code confidencial o implicit legacy' },
      { name: 'cliente', type: 'formulario', desc: 'client_id, redirect_uri, scope y los dos endpoints' },
      { name: 'callback', type: 'paste', desc: 'pega la URL de vuelta: extrae code, state, tokens y parámetros extra' },
      { name: 'token exchange', type: 'export', desc: 'curl con code_verifier o client_secret según flow' },
    ],
    daily: ['Auditar tu propio cliente: quita state de la URL y completa el flujo — si acepta, CSRF de login', 'Probar redirect_uri en cascada: exacta → otro path → subdominio → sufijo .evil.com → open redirect', 'Verificar qué valida el callback: si acepta un id_token de otro client_id, no valida aud'],
    ethical: ['Las URLs se generan, no se navegan: las pruebas van contra TU cliente registrado', 'El login CSRF del PoC solo con cuentas de laboratorio propias', 'Nunca uses tokens reales de terceros en los flujos de prueba'],
    tips: ['PKCE no es opcional: intercepción de code es su razón de existir y SPAs/clients públicos lo necesitan SIEMPRE', 'El mix-up requiere 2 IdPs sobre la misma redirect_uri: si tu cliente registra varios, añade el issuer al state y valídalo', 'Un scope concedido que nadie aprobó es hallazgo crítico aunque el token solo dure 1 hora'],
  },
  websockets: {
    what: 'Laboratorio WebSocket: decodificador de frames RFC 6455 bit a bit (FIN/RSV/opcode, bit de máscara, longitudes 7/16/64 bits, demo de unmasking XOR con la key de 4 bytes) con ejemplos de cliente (enmascarado) y servidor; generador de frame enmascarado con máscara didáctica; generador de cliente HTML de laboratorio y del PoC de Cross-Site WebSocket Hijacking; y matriz de 6 ataques con prueba y detección: CSWSH, ws:// sin TLS, manipulación de mensajes sin firma, auth solo en handshake, origin spoofing desde clientes no-navegador y DoS con frames malformados.',
    params: [
      { name: 'frame hex', type: 'paste', required: true, desc: 'bytes de la pestaña Frames de DevTools o de Wireshark' },
      { name: 'url + mensaje', type: 'texto', desc: 'para generar el cliente y el PoC CSWSH' },
      { name: 'ataques', type: 'catálogo', desc: '6 vectores con dificultad, cómo probarlos y su señal' },
    ],
    daily: ['Ver QUÉ envía realmente una app: el frame decodificado delata mensajes de lógica sin validar (price, recipient)', 'Probar el handshake con curl y Origin inventado: un 101 confirma que el Origin no es barrera', 'En pentests de trading/bolsa, la manipulación de mensajes es el primer test — el cliente NO es de confianza'],
    ethical: ['El CSWSH envía el payload con la sesión de la víctima: solo con cuentas de tu laboratorio', 'Los frames malformados de DoS NO se lanzan a producción', 'Capturar WS de terceros en la red es sniffing: quédate en tu propio tráfico'],
    tips: ['WebSocket NO tiene SameSite ni CORS: el handshake es un GET con cookies y el navegador no lo bloquea', 'La máscara es ofuscación anti-cache, no seguridad: se unmaska con la key que viaja en el propio frame', 'La defensa: Origin exacto (no prefijos), re-auth por mensaje sensible y TLS siempre'],
  },
  clickjack: {
    what: 'Generador de PoCs de clickjacking con preview en vivo: iframe invisible (opacidad 0.0001) posicionado con offsets X/Y y tamaño ajustables hasta alinear el botón de la acción crítica bajo el botón del señuelo (premio, descarga, confirmar). HTML completo generado con un click. Seis variantes del ataque explicadas: 1 click, 2 clicks para confirmaciones dobles, drag & drop, cursor hijacking, pestaña invisible con window.open y text field hijacking para robar lo que el usuario escribe. Sección de defensa: CSP frame-ancestors, X-Frame-Options, re-confirmación de acciones y SameSite, con cómo auditar cada una.',
    params: [
      { name: 'target', type: 'texto', required: true, desc: 'url de la acción crítica: /settings/delete-account' },
      { name: 'iframe', type: 'sliders', desc: 'ancho, alto, offsets y opacidad — sube opacidad a 1 para desarrollar' },
      { name: 'señuelo', type: 'texto', desc: 'título, texto y botón del señuelo' },
      { name: 'poc.html', type: 'export', desc: 'HTML completo listo para servir en tu servidor de pruebas' },
    ],
    daily: ['Auditar si el target envía frame-ancestors/XFO: un curl de cabeceras decide todo', 'Alinear el botón con opacidad 1 en desarrollo, bajar a 0.0001 para el PoC final', 'Documentar el PoC con captura de la acción ejecutada: es lo que convierte el hallazgo en válido'],
    ethical: ['Solo contra target propio o con bounty explícito: el clickjacking suele estar EXCLUIDO de programas', 'El PoC nunca se despliega contra usuarios reales: sirve en localhost con TU sesión', 'El impacto se demuestra con la acción (borrar cuenta de lab), no con phishing a terceros'],
    tips: ['X-Frame-Options: SAMEORIGIN no protege nested frames del mismo origen — CSP frame-ancestors es la defensa moderna', 'La acción crítica con re-confirmación (escribe BORRAR) mata el clickjacking de facto', 'El cursor hijacking (cursor:none + cursor falso) funciona incluso con feedback visual — pruébalo en tu lab'],
  },
  cachepoison: {
    what: 'Dos caras del abuse de caché en una herramienta: POISONING con 5 técnicas (headers sin clave reflejados como X-Forwarded-Host, fat GET, header hiding por normalización distinta, abuso de Vary y poisoning→XSS DOM) con curl de PoC en 3 pasos (reflejo, envenenar, verificar desde otro cliente); y DECEPTION con 5 rutas que engañan a la caché (extensión falsa .css, ; path params de Tomcat, %0a, fragments) y el test A/B con y sin cookies que confirma si la caché sirve datos autenticados. Metodología de 4 pasos: identificar caché, encontrar reflejos sin clave, verificar cache hit y escalar impacto.',
    params: [
      { name: 'target', type: 'texto', required: true, desc: 'url que se cachea para todos los usuarios' },
      { name: 'attacker', type: 'texto', desc: 'tu servidor donde caerá el JS o la exfiltración' },
      { name: 'técnica', type: 'catálogo', desc: '5 de poisoning con prueba y detección + 5 rutas de deception' },
      { name: 'poc.sh', type: 'export', desc: 'curl en 3 pasos para poisoning y A/B para deception' },
    ],
    daily: ['Buscar reflejos: mete un canary en cada header (Param Miner automatiza) y mira cuál vuelve en la respuesta', 'Probar la deception en TU cuenta: /account/nonexistent.css y abrir la misma URL en incógnito', 'Escalar el reflejo tonto: header reflejado en un import de JS = XSS persistente en la caché'],
    ethical: ['Envenenar la caché afecta a OTROS usuarios: solo en lab o con autorización expresa y ventana controlada', 'La deception con datos reales de terceros es exposición de datos: demuéstralo con TU cuenta', 'Avisa al cliente del TTL: la caché envenenada persiste hasta expirar'],
    tips: ['El cache key es la URL; todo lo que el backend REFLEJE sin estar en la clave es tu vector', 'Age, X-Cache y CDN-Cache delatan la caché y su comportamiento', 'Un reflejo sin sink es informativo; con sink (script src, config JSON), es crítico — la escalada lo es todo'],
  },
  disclosure: {
    what: 'Catálogo de 12 vectores de information disclosure priorizados por impacto: .git expuesto (git-dumper para código completo), .env/config con secretos, backups y editor files, páginas de debug (actuator/env, heapdump), documentación de API (openapi.json), errores verbosos con stack traces, fingerprints de cabeceras, comentarios HTML, source maps con código fuente, CORS que refleja Origin con credenciales, buckets S3 públicos y robots/sitemap. Cada vector con dónde, sonda exacta, qué se fuga y severidad. Script de reconocimiento automático que recorre los paths clásicos y marca los códigos != 404.',
    params: [
      { name: 'búsqueda', type: 'filtro', desc: 'localiza el vector por nombre, ubicación o fuga' },
      { name: 'vector', type: 'ficha', required: true, desc: 'dónde, sonda curl, qué se fuga y severidad' },
      { name: 'scan.sh', type: 'export', desc: 'recorre 11 paths clásicos + cabeceras + CORS en un bucle' },
    ],
    daily: ['Primer día en un target: lanza el scan de disclosure antes que nada — es el hallazgo más rápido del pentest', 'app.js.map descargable = código fuente completo con comentarios y secretos', 'CORS con Origin reflejado y Access-Control-Allow-Credentials: true es robo de datos cross-origin'],
    ethical: ['Un .env con secretos se REPORTA, no se usa: el alcance del hallazgo es demostrar la fuga', 'El listing de buckets se verifica sin descargar contenido de terceros', 'Sé honesto con la severidad: un 404-listing vacío es informativo y tu credibilidad vale más'],
    tips: ['Los códigos 403 también delatan existencia: el fichero está, solo falta permiso — nota el path y vuelve con otra vía', 'grep de sourceMappingURL en los .js es el test de 5 segundos para source maps', 'Los secretos filtrados deben rotarse: el reporte incluye la recomendación aunque el fix sea de proceso'],
  },
  pp: {
    what: 'Laboratorio de prototype pollution: 5 sondas por vector (sintaxis bracket de qs, dot notation, bypass con constructor.prototype, body JSON directo y JSON anidado) y 5 sinks que convierten la polución en impacto real: XSS via innerHTML cuando la config contamina html, RCE server-side en Express con NODE_OPTIONS y shell en child_process.spawn, bypass de filtros con constructor, pollution de respuestas HTTP (status/body) y qs con allowPrototypes. Verificación en consola del navegador con ({}).polluted y defensas que funcionan (Object.freeze, Maps, parsers seguros, hasOwnProperty en el merge).',
    params: [
      { name: 'sonda', type: 'catálogo', required: true, desc: '5 formatos de inyección según cómo parsea el target' },
      { name: 'sink', type: 'ficha', desc: 'gadget, payload y por qué ese sink convierte polución en exploit' },
      { name: 'verificación', type: 'guía', desc: '({}).polluted en consola = Object.prototype contaminado' },
    ],
    daily: ['Probar ?__proto__[x]=y y ?constructor[prototype][x]=y en cualquier parámetro de app Node', 'En cliente, buscar dónde la app copia config de un objeto base: ese merge es el punto de inyección', 'Ante un filtro, constructor.prototype suele pasar donde __proto__ está bloqueado'],
    ethical: ['La pollution server-side con RCE solo en laboratorio', 'En cliente, el XSS resultante se demuestra con alert en TU sesión, no en usuarios reales', 'Un __proto__ aceptado sin sink es una curiosidad: sé honesto, el impacto manda'],
    tips: ['Object.freeze(Object.prototype) al inicio de la app mata toda la clase de bugs en una línea', 'La pollution NO es el impacto: sin sink es una nota; con NODE_OPTIONS, es RCE', 'qs moderno y secure-json-parse rechazan __proto__ por diseño: actualiza dependencias antes de inventar filtros'],
  },
  smuggler: {
    what: 'Generador de HTTP request smuggling por técnica: CL.TE (front usa Content-Length, back usa chunked), TE.CL (inverso), TE.TE (ofuscación de la cabecera para que solo una capa la vea: espacios, sufijos, duplicados) y CL.CL duplicado. Cada petición se genera byte a byte con CRLF explícitos según el objetivo: detección (petición probe mínima), captura de cabeceras del siguiente usuario hacia tu servidor y acceso a rutas internas con X-Forwarded-For forjado. Desglose de quién interpreta QUÉ en cada capa, loop de detección con netcat y 4 defensas reales.',
    params: [
      { name: 'técnica', type: 'select', required: true, desc: 'CL.TE, TE.CL, TE.TE o CL.CL según el stack objetivo' },
      { name: 'objetivo', type: 'select', desc: 'detección, captura de cabeceras o ruta interna' },
      { name: 'host/ruta', type: 'texto', desc: 'tu servidor OOB y la ruta interna a alcanzar' },
      { name: 'raw request', type: 'export', desc: 'petición con CRLF literales para Repeater-HEX o netcat' },
    ],
    daily: ['Detectar con el probe: si la petición normal siguiente responde 400/500 o timeout, hay desincronización', 'En Burp, Inspector → cambiar body a HEX para controlar los CRLF exactos: un espacio mal puesto mata el exploit', 'Mapear el stack: la ofuscación TE.TE descubre qué parser gana en cada capa'],
    ethical: ['El smuggling envenena la cola del backend: el siguiente usuario come tu petición — solo con autorización expresa', 'Nunca contra producción sin ventana acordada: el impacto afecta a usuarios reales', 'La captura de cabeceras se demuestra con TU sesión, no con la de un tercero'],
    tips: ['La raíz es siempre el acuerdo roto: dos parsers con reglas distintas para CL/TE', 'HTTP/2 end-to-end mata la clase entera de bugs: rechaza CL/TE del cliente y desaparece el smuggling clásico', 'El timing importa: tras el smuggle, la petición víctima debe llegar ANTES de que expire el timeout de conexión'],
  },
  twofa: {
    what: 'Laboratorio de segundo factor con su propio TOTP vivo (secret generado, QR para authenticator, cuenta atrás visual), generador de 10 recovery codes con ~50 bits de entropía (alfabeto de 32 sin ambigüedades), 8 debilidades típicas del 2FA con su prueba exacta: brute force sin rate limit, resultado filtrado en la respuesta, saltarse el estado del flujo (dashboard directo con sesión intermedia), recovery sin factor real, ventana de validación enorme, reuso de códigos (sin anti-replay), preguntas de seguridad como factor y recovery codes predecibles. Script de brute force didáctico para Turbo Intruder y checklist de 3 peticiones para testear cualquier 2FA.',
    params: [
      { name: 'TOTP lab', type: 'live', desc: 'código vivo + QR + secreto: tu 2FA de práctica' },
      { name: 'endpoint', type: 'texto', required: true, desc: 'tu /2fa/verify para el script de brute force' },
      { name: 'sesión', type: 'texto', desc: 'cookie intermedia para probar el salto de flujo' },
      { name: 'debilidades', type: 'catálogo', desc: '8 patrones con severidad y prueba' },
    ],
    daily: ['Test de 30 segundos en cualquier 2FA: ¿cuántos intentos acepta? ¿el endpoint final valida el estado? ¿reusa códigos?', 'Comparar la entropía de los recovery codes del target con los de aquí: 4 dígitos = llave maestra débil', 'El salto de estado (login OK → dashboard antes del OTP) es el hallazgo más común de todos'],
    ethical: ['El brute force SOLO contra tu laboratorio: en target real, 3 intentos y observa el bloqueo', 'El TOTP del lab es tuyo: practica el phishing en tiempo real con tu propio código', 'Los hallazgos de 2FA se reportan con el impacto (bypass completo), no con el dump de códigos'],
    tips: ['1.000.000 combinaciones sin rate limit = factor decorativo: el single-packet de HTTP/2 lo agota en minutos', 'Un código de 6 dígitos con ventana ±10 multiplica x20 el material del atacante', 'El 2FA no salva si el recovery es por datos públicos: la puerta lateral siempre es más fácil que la puerta'],
  },
  logic: {
    what: 'Catálogo de 8 patrones de business logic vulnerabilities con escenario, ataque, prueba y severidad: cantidades y precios negativos, race conditions en códigos de un solo uso (HTTP/2 single-packet), redondeo y monedas sin decimales, saltar pasos del flujo (checkout sin pagar), IDs de negocio secuenciales (IDOR de negocio), reembolsos parciales repetidos, límites solo en el cliente y lógica de registro/invitación con campos manipulables. Checklists de hunting por dominio: e-commerce (carrito, cupones, envío), flujos con estado (saltos, repetición, back del navegador) y usuarios/permisos (campos extra en registro, invitaciones, límites de plan).',
    params: [
      { name: 'patrón', type: 'ficha', required: true, desc: 'escenario real, el ataque y la prueba exacta' },
      { name: 'checklists', type: 'por dominio', desc: 'e-commerce, flujos con estado, usuarios y permisos' },
      { name: 'criterio', type: 'guía', desc: 'cómo reportar: impacto en dinero/datos, no payload' },
    ],
    daily: ['En cualquier checkout: cambia quantity=-1 y el precio en el body — si el server lo acepta, es hallazgo crítico', 'Cupón de un solo uso: 20 peticiones paralelas con Turbo Intruder, alguna pasa', 'Salta al paso 3 del flujo con el state del paso 1: si compra sin pagar, el estado no se valida server-side'],
    ethical: ['Las pruebas de race/precio solo en staging: en producción una petición repetida es fraude real', 'El reembolso se demuestra con el patrón, no acumulando saldo en cuentas reales', 'El reporte centrado en impacto (€, datos) es lo que la empresa puede actuar: sé su traductor'],
    tips: ['La pregunta mágica: ¿qué pasaría si el servidor confiara en MÍ para este valor? — y prueba ese valor', 'Ningún scanner encuentra lógicas: tu ventaja es leer el flujo como usuario malintencionado', 'El back del navegador tras pagar reabre flujos: la validación de estado es la más olvidada'],
  },
  jwks: {
    what: 'Inspector de JWK Sets (JWKS): pega el JSON o cárgalo por URL (con fallback manual si no hay CORS) y desglosa cada clave: kty con su significado criptográfico, algoritmo explicado (RS256 vs PS256, RSA1_5 roto por Bleichenbacher, ES256/EdDSA modernos), uso sig/enc, longitud del módulo RSA calculada desde el base64url, curva EC y riesgos por diseño: módulos <2048, claves privadas filtradas (d/p/q en el JWKS = crítico), claves simétricas publicadas, kid ausente (rotación rota), alg ausente (alg confusion) y use mezclado. Hunting extra: kids con fecha vs eternos, x5c para verificar cadenas y el nexo con el JWT Toolkit.',
    params: [
      { name: 'url del jwks', type: 'texto', desc: 'https://issuer/.well-known/jwks.json — si CORS bloquea, pega el JSON' },
      { name: 'jwks json', type: 'paste', required: true, desc: 'el array keys completo' },
      { name: 'ficha por clave', type: 'análisis', desc: 'tipo, algoritmo, uso, módulo/curva y riesgos concretos' },
    ],
    daily: ['Sacar el iss del JWT y bajar su openid-configuration: el jwks_uri es la fuente de verdad de las claves', 'Comparar kids con fechas (2024-main) vs eternos (key1): la rotación real vs teórica', 'Un alg ausente en la clave delata validación laxa: prueba alg confusion en el JWT Toolkit'],
    ethical: ['El JWKS es público por diseño: analizarlo es reconocimiento legítimo', 'Las claves privadas filtradas en un JWKS son hallazgo crítico: reporta, no explotes', 'La postura de claves alimenta el informe de diseño, no el exploit'],
    tips: ['d, p o q en el JSON = clave privada PUBLICADA: rotación de emergencia y hallazgo crítico', 'kid es un input del servidor: SQLi y path traversal en kid son vectores reales si no se valida', 'RSA1_5 en keys use:enc es Bleichenbacher waiting to happen — OAEP es el fix'],
  },

  /* ── Ronda 15: theming ── */
  personalization: {
    what: 'Panel de personalización de toda la aplicación: 10 colores editables con selector nativo y entrada hex, 8 temas predefinidos (Terminal Verde, Cyber Blue, Blood Moon, Purple Haze, Amber CRT, Glacier Ice, Synthwave, Matrix), generador de paletas armónicas aleatorias, redondeo global, tipografía de interfaz y tres interruptores de efectos (glow, rejilla, scanline). Aplica en TIEMPO REAL mediante CSS variables sobre :root, persiste en localStorage y permite exportar/importar el tema como JSON. Incluye análisis de accesibilidad que avisa de contrastes pobres.',
    params: [
      { name: 'colores', type: '10 pickers', required: true, desc: 'fondo, paneles, bordes, texto, secundario, acento, info, warn, bad y ok — aplican al instante' },
      { name: 'presets', type: 'select', desc: '8 temas completos; solo cambian colores, no tu radio/fuente/efectos' },
      { name: 'diseño', type: 'formulario', desc: 'redondeo 0-26px, tipografía Inter/Mono/System y efectos on/off' },
      { name: 'export/import', type: 'json', desc: 'copia tu tema o pega el de otro para aplicarlo' },
    ],
    daily: ['Ajustar el acento al color corporativo de tu cliente para demos', 'Apagar glow y rejilla para sesiones largas o equipos modestos (menos GPU)', 'Exportar tu tema para tenerlo en todos tus equipos'],
    ethical: ['La configuración se guarda solo en tu navegador: nada de telemetría ni perfiles', 'El análisis de contraste usa luminancia WCAG: te avisa si dejas la UI ilegible'],
    tips: ['Alt/Option + T abre la personalización desde cualquier página', 'Los modificadores de opacidad de Tailwind (/80, /50…) siguen funcionando: la paleta se aplica con tripletas rgb(var(--x-rgb) / alpha)', 'Si el resultado queda raro, "Restaurar todo" vuelve a la paleta original exacta'],
  },

  /* ── Ronda 15: contraseñas ── */
  passforge: {
    what: 'Generador de passphrases estilo Diceware con WebCrypto: wordlist integrada de ~1.000 palabras cortas, 3-12 palabras, separadores configurables, capitalización (+1 bit/palabra), dos dígitos finales (+6,6 bits) y opción estética leet. Calcula la entropía real y la traduce a tiempo de crackeo ante cuatro adversarios (online con rate limit, GPU modesta, GPU alta y granja estatal), con lote de hasta 20 candidatas clasificadas por fuerza.',
    params: [
      { name: 'palabras', type: 'slider 3-12', required: true, desc: 'cada palabra aporta log2(1000) ≈ 10 bits' },
      { name: 'separador', type: 'select', desc: 'espacio, guion, punto, guion bajo, coma o nada' },
      { name: 'toggles', type: 'opciones', desc: 'capitalizar, dígitos finales, leet (decorativo)' },
      { name: 'lote', type: '1-20', desc: 'genera varias y compara entropías' },
    ],
    daily: ['Crear la passphrase maestra de tu gestor de contraseñas', 'Contraseñas que SÍ tendrás que teclear a mano: LUKS, BIOS, llaves del gestor', 'Demostrar en formación que "Cobre-Lobo-Menta-42" es más fuerte que "P@ssw0rd!"'],
    ethical: ['La generación usa crypto.getRandomValues con rejection sampling: sesgo cero', 'La entropía mostrada asume que el atacante conoce la wordlist: estimación honesta, no inflada'],
    tips: ['4 palabras (~46 bits) resisten años a un rig de GPU; 5+ para cuentas críticas', 'La entropía está en las palabras, no en el leet: las sustituciones son cosméticas', 'Combínala con Auditor de Contraseñas para comprobar que tu passphrase no está filtrada'],
  },
  maskgen: {
    what: 'Diseñador de máscaras hashcat: parsea patrones ?u ?l ?d ?s ?h ?H ?a y ?b mezclados con literales, calcula el keyspace exacto, genera candidatos de ejemplo con WebCrypto y detecta patrones débiles (PINs cortos, sufijos de año, estructuras tipo "Password"). Muestra el comando hashcat -a 3 equivalente y un desglose átomo a átomo.',
    params: [
      { name: 'máscara', type: 'string', required: true, desc: 'p. ej. ?u?l?l?l?l?l?d?d?d?d — 24 átomos máximo' },
      { name: 'presets', type: 'botones', desc: 'patrones reales: capital+año, PIN de 6/8, hex, palabra+símbolo' },
      { name: 'keyspace', type: 'número', desc: 'nº total de candidatos y su orden de magnitud' },
      { name: 'muestras', type: 'candidatas', desc: '12 generadas al azar que cumplen la máscara' },
    ],
    daily: ['Estimar cuánto tardaría tu política de contraseñas en caer bajo un ataque de máscara', 'Preparar el ataque dirigido de una auditoría autorizada: keyspace antes que reglas', 'Enseñar por qué "una mayúscula y un año al final" no añade apenas entropía'],
    ethical: ['Las máscaras se diseñan aquí, se lanzan SOLO en auditorías autorizadas', 'El keyspace es tu presupuesto de tiempo: úsalo para justificar políticas, no para acosar'],
    tips: ['?a son 94 caracteres: una máscara larga con ?a explota exponencialmente — empieza dirigido', 'El aviso "termina en 4 dígitos" es la regla best64 más rentable del mundo real', '--increment en el hint hashcat: arranca con la máscara corta y crece'],
  },
  policyaudit: {
    what: 'Auditor de políticas de contraseñas contra NIST 800-63B: pega los parámetros reales de tu organización (longitud, clases exigidas, rotación, historial, bloqueo, blacklist de filtraciones, MFA) y recibe un veredicto puntuado 0-100 con nota, hallazgos priorizados (crítico/aviso/info/ok) con el por qué y el arreglo de cada uno, y las configuraciones coherentes: pwquality.conf para Linux y una Fine-Grained Password Policy en PowerShell para Windows. Tres presets: corporativo clásico 2003, NIST moderno y alto secreto.',
    params: [
      { name: 'parámetros', type: 'formulario', required: true, desc: 'minlen, maxlength, minclass, caducidad, historial, lockout, blacklist, MFA' },
      { name: 'veredicto', type: 'score + nota', desc: 'la nota que pondría un auditor NIST, con desglose' },
      { name: 'hallazgos', type: 'lista', desc: 'cada uno con severidad, detalle y fix concreto' },
      { name: 'configs', type: 'texto', desc: 'pwquality.conf y New-ADFineGrainedPasswordPolicy listos' },
    ],
    daily: ['Justificar en el comité de seguridad por qué eliminar la rotación de 30 días', 'Baseline coherente Linux+Windows en un cambio de política', 'Auditar el proveedor de tu cliente: pega su política y enséñale la nota'],
    ethical: ['Las políticas se auditan con autorización: las contraseñas de la gente son datos personales', 'Política dura + usable = cumplimiento real: el objetivo es subir la nota sin torturar al usuario'],
    tips: ['Los 3 críticos típicos: minlen < 8, sin bloqueo y sin blacklist — arreglarlos sube 60 puntos', 'La complejidad obligatoria en 4 clases resta puntos: NIST la desaconseja con datos', 'Genera ambas configs del mismo veredicto: la coherencia entre SO es lo que suele romperse'],
  },

  /* ── Ronda 15: phishing ── */
  quishing: {
    what: 'Laboratorio de QR phishing (quishing) para campañas de concientización autorizadas: 4 plantillas de escenario (parking falso, QR de sesión MFA, WiFi cautivo, wallet de cripto), 3 estilos de QR calibrados con campañas reales (corporativo limpio, con logo, etiqueta urbana) y preview en vivo del QR renderizado con la librería qrcode. Cada plantilla incluye su lección de defensa, y la tool cierra con guía de verificación para entrenar al equipo.',
    params: [
      { name: 'plantilla', type: 'select', required: true, desc: 'escenario del ataque con su lección' },
      { name: 'dominio/ruta', type: 'string', desc: 'dominio ficticio del atacante (usa .example)' },
      { name: 'estilo', type: 'select', desc: 'apariencia del QR: el estilo legítimo es el que más engaña' },
      { name: 'payload', type: 'texto', desc: 'lo que codifica el QR, copiable para tu material de formación' },
    ],
    daily: ['Generar el material de una campaña de awareness interna sobre quishing', 'Demostrar en formación que un QR no se puede leer de vista: por eso engañan', 'Preparar una tabla de ejercicios: ¿cuál de estos 5 QR es el legítimo?'],
    ethical: ['Los dominios de ejemplo no existen: la tool es para enseñar, no para desplegar', 'Las campañas con QR reales requieren autorización escrita y reporte agregado, nunca humillación', 'Registrar dominios typosquat de terceros es delito en muchas jurisdicciones'],
    tips: ['El QR blanco y plano con margen genera más confianza que el sucio: así operan los atacantes', 'El logo pegado SOBRE el QR explota la confianza visual: enséñales a mirar qué hay encima', 'El quishing por email salta los filtros de URL: los sandbox no analizan imágenes'],
  },
  shorteneraudit: {
    what: 'Auditor de URLs y acortadores: análisis estático con 7 flags (credenciales en la URL, host IP, punycode xn--, subdominios profundos, typosquatting de marcas conocidas, TLD desechables y redirects abiertos), risk score agregado, expansión de acortadores en vivo siguiendo la cadena de redirecciones con fetch, enlaces de expansión manual sin CORS y catálogo de 8 shorteners con su método de previsualización.',
    params: [
      { name: 'url', type: 'string', required: true, desc: 'acortada (bit.ly/...) o completa' },
      { name: 'análisis estático', type: 'flags', desc: '7 heurísticas con nota y explicación de cada señal' },
      { name: 'cadena', type: 'redirects', desc: 'hasta 6 saltos con status y Location de cada uno' },
      { name: 'expansión manual', type: 'enlaces', desc: 'checkshorturl, urlex, unshorten.dev, getlinkinfo' },
    ],
    daily: ['Comprobar un enlace acortado recibido por email o SMS antes de abrirlo', 'Analizar URLs de campañas de awareness reales que han pillado a compañeros', 'Verificar enlances de una newsletter sospechosa sin hacer clic'],
    ethical: ['La expansión hace fetch desde TU navegador: el acortador ve tu IP y tu User-Agent', 'Para URLs muy sensibles, expande desde una VM o usa los servicios de expansión manual', 'El risk score es heurístico: una URL limpia no es una URL segura, solo no tiene señales automáticas'],
    tips: ['La expansión en vivo depende de CORS: si el acortador lo bloquea, usa los expanders manuales', 'tinyurl nunca expira los enlaces: los dumps antiguos siguen activos', 'El patrón "paypal.com.login.tk" es el clásico: 4+ niveles de subdominio delatan'],
  },
  phishmtm: {
    what: 'Anatomía educativa del phishing con proxy inverso (Evilginx-style): los 7 pasos del ataque (cebo, proxy, credenciales, 2FA capturado, cookie robada, secuestro paralelo, persistencia) con el actor de cada paso, qué pasa exactamente y cómo se rompe. Incluye las 6 capas de defensa que funcionan (passkeys, password manager, filtrado de dominios nuevos, Conditional Access, session binding, formación) clasificadas por nivel, y la lección central: el 2FA OTP NO para esta técnica, solo las passkeys la cortan de raíz.',
    params: [
      { name: 'pasos', type: 'timeline', required: false, desc: '7 fases con actor (víctima/atacante/servicio) y defensa por paso' },
      { name: 'defensas', type: 'catálogo', desc: '6 mitigaciones con nivel: básico, avanzado, estructural' },
      { name: 'lección', type: 'resumen', desc: 'por qué "no compartas tu código" no basta aquí' },
    ],
    daily: ['Explicarle a dirección por qué el MFA por OTP no es suficiente', 'Justificar la migración a passkeys con un argumento visual', 'Formar al equipo: la señal que salva es el password manager que no autocompleta'],
    ethical: ['Es anatomía, no manual: ningún paso genera código ni configura un proxy', 'El objetivo es defender: entender el mecanismo es lo que permite detectar la campaña', 'Demonstrar el ataque en tu propio lab con tus propias cuentas, nunca con terceros'],
    tips: ['El paso 5 es el núcleo: la cookie se emite en la sesión del atacante y se copia a la de la víctima', 'Ante sospecha: cerrar TODAS las sesiones y revisar reglas de buzón ANTES de rotar la contraseña', 'Los proxies viven en dominios recién registrados: filtrar edades < 30 días mata la mayoría'],
  },

  /* ── Ronda 15: análisis ── */
  emailosint: {
    what: 'OSINT pasivo por dirección de email (complemento del Username OSINT): perfil Gravatar por hash MD5 (nombre, usuario, ubicación, bio y servicios vinculados), avatar con sonda 404, filtraciones conocidas vía XposedOrNot (CORS abierto, ~200 bases), commits públicos de GitHub firmados con ese email (author-email search), análisis local (proveedor, +tag, punto-gmail, cuentas de rol, dominios descartables, email canónico), 5 dorks listos para Google/Bing/GitHub/DuckDuckGo y 6 verificaciones manuales (HIBP, Intelligence X, DeHashed, holehe…).',
    params: [
      { name: 'email', type: 'string', required: true, desc: 'la dirección a investigar; se normaliza antes de hashear' },
      { name: 'gravatar', type: 'API', desc: 'perfil JSON + avatar con d=404: registro confirmado' },
      { name: 'filtraciones', type: 'API', desc: 'XposedOrNot check-email: lista de bases donde aparece' },
      { name: 'github', type: 'API', desc: 'search/commits con author-email: hasta 5 ejemplos con repo y fecha' },
    ],
    daily: ['Auditar tu propia huella: ¿qué dice internet de tu email?', 'Comprobar si tu email aparece en filtraciones antes de que te lo cuente la prensa', 'Recuperar cuentas antiguas: el Gravatar apunta a perfiles que olvidaste'],
    ethical: ['Todo es pasivo: APIs públicas con CORS abierto; el dueño del email no recibe notificación', 'Las filtraciones se consultan para proteger TU email o en incidentes autorizados, nunca para acceder a cuentas', 'El email es dato personal (RGPD): investigar sin base legítima puede ser acoso'],
    tips: ['El +tag y el punto de Gmail no engañan al OSINT: la tool calcula el email canónico', 'GitHub limita la búsqueda a 10 req/min sin token: si falla, reintenta en un minuto', 'Cruza con Username OSINT: el preferredUsername del Gravatar suele ser su alias en otros sitios'],
  },
  phonevalidator: {
    what: 'Validador telefónico con parser E.164 propio (sin dependencias) y metadatos de 55 países: país por coincidencia de prefijo más larga, tipo (móvil/fijo/especial/rol), geografía aproximada por prefijo de área, operador histórico (con aviso de portabilidad), flags de falsedad (dígitos repetidos, secuencias, rangos ficticios de cine de EE. UU./UK/Australia), formatos E.164/internacional/nacional, URIs tel:, wa.me y RFC 3966, IMEI con Luhn y TAC, modo lista con resumen estadístico y export CSV, más los enlaces honestos para comprobar actividad (Truecaller, Sync.me, NumLookup).',
    params: [
      { name: 'número', type: 'string', required: true, desc: 'con +, o sin + con selector de país por defecto' },
      { name: 'identificación', type: 'ficha', desc: 'país, tipo, región, operador histórico y longitud del plan' },
      { name: 'flags', type: 'avisos', desc: 'ficticio, relleno, secuencia, longitud fuera de plan' },
      { name: 'lista', type: 'bulk', desc: 'valida un listado con resumen y CSV exportable' },
    ],
    daily: ['Limpiar una base de contactos antes de un simulacro de smishing autorizado', 'Verificar que los números de tu propia empresa están bien formateados en E.164', 'Clasificar móviles vs fijos en un listado de incidente'],
    ethical: ['Validar formato es neutral; rastrear a una persona por su teléfono puede ser acoso (delito)', 'La tool no localiza, no llama y no escribe a nadie: los enlaces externos los abres tú y bajo tu responsabilidad', 'El teléfono es dato personal: en auditorías limita el alcance a lo autorizado'],
    tips: ['"Existe de verdad" se responde con la verificación en vivo por HLR: pega tu clave gratuita de Veriphone o numverify y la tool consulta al operador', 'El operador por prefijo es histórico: el HLR en vivo te da el operador ACTUAL (la portabilidad lo cambia)', 'Los 555-01XX de EE. UU. y 07700 900xxx de UK son rangos de cine: si aparecen en tu base, son datos de prueba'],
  },
  phonehunter: {
    what: 'Dossier de identidad OSINT detrás de un número de teléfono: sintetiza lo que el número revela por sí mismo (país, tipo, región, operador histórico, huella técnica), un plan de investigación profesional en 10 pasos con orden, tiempos y qué esperar de cada uno, un catálogo de 20+ fuentes de identidad clasificadas por categoría y fuerza (caller ID crowdsourced, mensajería, agregadores de datos, filtraciones, marketplace, registros, archivo web), el contexto del país para la investigación (capitals, husos, idiomas, emergencias), el marco legal aplicable y un generador de solicitudes de derechos ARCO/RGPD con el plazo legal de tu jurisdicción. Exporta el dossier completo en Markdown.',
    params: [
      { name: 'número', type: 'string', required: true, desc: 'el teléfono a investigar, con + o selector de país' },
      { name: 'dossier', type: 'secciones', desc: 'identificación, contexto país, huella técnica, superficie OSINT y marco legal' },
      { name: 'plan', type: '10 pasos', desc: 'metodología con enlace directo a cada fuente y qué esperar de cada una' },
      { name: 'solicitud', type: 'plantilla', desc: 'carta de ejercicio de derechos con plazo legal (30 días RGPD, 20 MX, 15 BR…)' },
    ],
    daily: ['Identificar quién te llama desde un número desconocido antes de devolver la llamada', 'Documentar una campaña de smishing o vishing para reportarla al banco o a la autoridad', 'Investigar fraude con autorización: el dossier ordena la evidencia con fuente y fecha'],
    ethical: ['Identificar un número es legítimo para proteger tu propio número, fraude autorizado, periodismo y CTFs: para otra cosa, consulta a un abogado', 'Tres fuentes independientes = identidad; una sola = candidato. La prisa convierte hipótesis en falsas acusaciones', 'Truecaller y Sync.me exponen TU número y tu agenda al usarlos: número secundario y sin sincronizar contactos', 'La solicitud ARCO/RGPD es la vía legalmente incontestable: más lenta que el OSINT pero obliga por ley'],
    tips: ['El paso 2 (wa.me en incógnito, sin enviar nada) resuelve el 60% de los casos en 30 segundos', 'Los últimos 8 dígitos entre comillas en Google es el dork que más rinde', 'Un número sin huella alguna suele ser prepago nuevo, número desechado o spoofing: no es que "no existe", es que es reciente o falsificado', 'Combínalo con Phone Validator para la verificación HLR en vivo antes de gastar tiempo en el plan'],
  },
  anonymity: {
    what: 'Laboratorio de anonimato con la verdad por delante: un navegador no cambia tu IP ni tu MAC, así que hace lo que sí es posible 100% client-side. (1) Escáner de exposición en vivo: tu IP pública con geo/ISP/ASN vía ipwho.is, test de fuga WebRTC real (RTCPeerConnection + parseo de candidates ICE: muestra qué IPs filtra tu navegador aunque uses proxy), huella del navegador con estimación de entropía en bits, zona horaria e idiomas, y catálogo de 8 superficies de fuga con su defensa. (2) Coherencia de identidad: comparación de tu hora/idioma con lo que exigiría el país de salida (12 perfiles) — el antifraude más básico es la incoherencia, no la IP. (3) Generador de recetas exactas por plataforma (Linux/Windows/macOS/Android/iOS): macchanger aleatorio y por OUI, MAC aleatoria nativa de Windows/Android/iOS, spoof por registro en Windows, Tor con ControlPort + proxychains + NEWNYM al vuelo, WireGuard con AllowedIPs 0.0.0.0/0 + DNS + kill switch con ufw, renovación DHCP con explicación honesta de por qué casi nunca cambia la IP pública, más recetas de verificación (ipleak, dnsleaktest, wg show, getmac) y de restauración. (4) Protocolo de identidad nueva: checklist de 16 puntos en 4 grupos con bloqueadores, y export del protocolo completo en Markdown.',
    params: [
      { name: 'escáner', type: 'botones', desc: 'consulta IP pública (ipwho.is) y test WebRTC interactivo con veredicto' },
      { name: 'plataforma', type: 'select', desc: 'Linux, Windows, macOS, Android o iOS + interfaz (wlan0, Wi-Fi, en0)' },
      { name: 'recetas', type: '4 familias', desc: 'MAC, IP (Tor/VPN/DHCP), verificación y restauración — cada paso copiable con su nota' },
      { name: 'protocolo', type: 'checklist+export', desc: '16 puntos con bloqueadores y export Markdown del plan completo' },
    ],
    daily: ['Comprobar si tu VPN filtra por WebRTC o DNS antes de una investigación autorizada', 'Preparar un entorno coherente (IP, hora, idioma, huella) para pruebas antifraude de tu propia plataforma', 'Rotar la MAC de tu portátil en una red pública para dejar de ser el dispositivo de siempre'],
    ethical: ['Cambiar MAC/IP en tu equipo y tu red es privacidad legítima; en redes ajenas pueden aplicar sus normas', 'Usar otra identidad para eludir vetos rompe los Términos de Servicio; con fraude o suplantación, es delito', 'Casos de uso legítimos: privacidad personal, auditorías autorizadas, CTFs, periodismo de fuentes, testing antifraude propio'],
    tips: ['La fuga WebRTC clásica: proxy de navegador + RTCPeerConnection = tu IP real en los candidates ICE; Tor Browser la trae cortada', 'AllowedIPs = 0.0.0.0/0, ::/0 y DNS dentro del [Interface]: sin eso tienes un túnel con fugas, no anonimato', 'NEWNYM cambia el circuito Tor, no garantiza salida distinta: los guardas duran semanas', 'Un solo login con tu cuenta real en el perfil nuevo vincula ambas identidades para siempre'],
  },

  /* ── Ronda 17 ── */
  homoglyph: {
    what: 'Detecta dominios y textos que se ven igual pero NO lo son: punycode decodificado (xn--), confusables cirílicos/griegos/latinos con el alfabeto de origen, caracteres invisibles (zero-width, BOM) y bidi (spoof de extensión), tags Unicode del canal de emoji, guiones mezclados, esqueleto canónico para comparar dominios visualmente idénticos, formas limpias reconstruidas y puntuación de riesgo con motivo. Incluye generador de evil twins (cirílico, griego, acentos, zero-width, bidi override, rn→m) para testear que tus filtros y CI las cazan.',
    params: [
      { name: 'texto', type: 'string', required: true, desc: 'dominio, email, username o fragmento con sospecha de homoglifos' },
      { name: 'informe', type: 'análisis', desc: 'riesgo con motivo, hallazgos por carácter, punycode, esqueleto y formas limpias' },
      { name: 'evil twins', type: 'generador', desc: 'variantes homoglifo de un dominio legítimo para testear detectores' },
    ],
    daily: ['Auditar un dominio recibido en un email antes de hacer clic', 'Revisar nombres de usuario y committers en PRs de supply chain', 'Comprobar si tu filtro antiphishing caza las variantes IDN generadas'],
    ethical: ['Detección pasiva 100% local: no consultas ningún registro ni notificas a nadie', 'Generar evil twins es para TESTEAR tus defensas, no para registrar dominios que suplanten', 'Suplantar una marca o persona con estos dominios es fraude y delito'],
    tips: ['Firefox: about:config → idn_show_punycode=true para ver SIEMPRE el punycode crudo', 'El esqueleto colapsa dominios visualmente idénticos a la misma cadena: compáralo en CI', 'Un español con acentos dispara riesgo medium legítimamente: lee el motivo, no solo el semáforo', 'Bidi en nombres de fichero = spoof de extensión: GitHub y los IDEs modernos lo bloquean por eso'],
  },
  zerowidth: {
    what: 'Esteganografía en texto plano con caracteres de ancho cero: modo binario clásico (ZWNJ/ZWJ, 1 bit/marca), denso base-4 (4 caracteres, 2 bits/marca) y marcas por palabra (aguanta recortes de plataformas). Extracción con detección automática de modo, métricas de ratio tinta/texto y sanitizer forense que elimina invisibles, bidi, soft hyphen y tags Unicode de entrada no confiable.',
    params: [
      { name: 'portador', type: 'texto', required: true, desc: 'el texto visible que todo el mundo puede leer' },
      { name: 'mensaje', type: 'texto', required: true, desc: 'lo que viaja invisible: 8 bits por carácter' },
      { name: 'modo', type: 'select', desc: 'binario, denso (el doble de eficiente) o por palabra' },
      { name: 'sanitizer', type: 'pestaña', desc: 'limpia texto no confiable con métricas de qué se eliminó' },
    ],
    daily: ['Marcar un documento confidencial con un ID invisible por destinatario (watermarking)', 'Verificar si tu contenido reaparece copiado en otra web con las marcas intactas', 'Limpiar texto pegado de fuentes no confiables antes de procesarlo'],
    ethical: ['Watermarking, verificación de copias y forense son legítimos; ocultar actividad maliciosa no lo es', 'La esteganografía no es criptografía: quien sabe buscar la detecta; cifra antes si el contenido es sensible', 'Usar tinta para desanonimizar a otros sin base legal es una violación de privacidad'],
    tips: ['Copia SIEMPRE con el botón del bloque: seleccionar a mano pierde marcas y trunca el mensaje', 'Twitter/X y Slack recortan parte de los zero-width: prueba el ciclo completo antes de confiar en el canal', 'El modo denso necesita la mitad de marcas para el mismo mensaje', 'El modo por palabra sobrevive a recortes de plataforma pero necesita 8 palabras por carácter'],
  },
  classcipher: {
    what: 'Criptoanálisis ejecutándose, no un catálogo: diagnóstico automático por índice de coincidencia (¿sustitución simple, polialfabético o aleatorio?), Caesar resuelto con chi-cuadrado sobre los 26 turnos, Vigenère con deducción de longitud por Kasiski (distancias de trigramas) y promedio de IC por columnas, resolución de cada columna como un Caesar independiente, sustitución monoalfabética por hill-climbing con cuadrigramas de alta frecuencia ES/EN y confianza honesta, Atbash, ROT47, afín con verificación de invertibilidad y XOR de un byte por fuerza bruta con puntuación de imprimibilidad.',
    params: [
      { name: 'ciphertext', type: 'string', required: true, desc: 'texto cifrado; el diagnóstico guía hacia la pestaña correcta' },
      { name: 'idioma', type: 'select', desc: 'español o inglés (cambia frecuencias y cuadrigramas)' },
      { name: 'vigenère', type: '2 pasos', desc: 'longitud de clave (IC/Kasiski) y resolución por columnas' },
      { name: 'sustitución', type: 'hill-climbing', desc: 'mapeo completo cifra→plano con confianza' },
    ],
    daily: ['Resolver challenges de CTF de cripto clásica en segundos', 'Entender con datos POR QUÉ Vigenère dejó de ser «indescifrable» en 1863', 'Analizar cifrados simples en malware viejo o configs ofuscadas'],
    ethical: ['Romper cifrados clásicos de retos propios o CTFs es formación legítima', 'La estadística no distingue autorización: úsalo solo en material que te pertenece o te han autorizado', 'Nada de esto amenaza criptografía moderna: la lección es lo contrario'],
    tips: ['IC ≈ 0.066 = sustitución simple; ≈ 0.038 = polialfabético o aleatorio: es tu primer filtro', 'Caesar cae con ~20 letras; la sustitución general necesita ~100+ para confianza alta', 'Si el IC da «natural» pero Caesar no cuadra: prueba Atbash (k=25) o afín', 'El XOR del ejemplo (1b3737…) es el reto clásico de cryptopals: clave X (0x58)'],
  },
  pubkeylab: {
    what: 'La matemática de clave pública ejecutándose con BigInt nativo: Diffie-Hellman completo con presets (incluido el trampa de subgrupo pequeño), orden de g, avisos de MITM y primo seguro; RSA textbook con keygen desde dos primos (validación Miller-Rabin), tabla bloque a bloque m→c→m\', ataque de factorización REAL por división de prueba sobre n (hasta 20M iteraciones) para demostrar la escalada exponencial, y modpow binario paso a paso mostrando el square-and-multiply bit a bit.',
    params: [
      { name: 'DH', type: 'p, g, a, b', required: true, desc: 'con presets didácticos y warnings de subgrupo/Miller-Rabin' },
      { name: 'RSA', type: 'p, q, e, mensaje', desc: 'keygen con validación, bloques por carácter y ataque de factorización' },
      { name: 'modpow', type: 'base, exp, mod', desc: 'visualización bit a bit del square-and-multiply' },
    ],
    daily: ['Entender por fin qué pasa dentro de un handshake TLS', 'Demostrar en clase por qué 32 bits de módulo es un chiste y 2048 no lo es', 'Depurar implementaciones cripto con números que sí puedes leer'],
    ethical: ['Es un laboratorio didáctico: los números son pequeños a propósito y las claves generadas NO son para producción', 'Ataques de factorización contra claves ajenas reales serían delito; aquí factorizas TU n de 12 bits', 'La criptografía real requiere primos de 2048+ bits generados con RNG evaluado'],
    tips: ['El preset p=23,g=2 muestra el subgrupo pequeño: pocas claves posibles aunque todo «funcione»', 'Con p=61,q=53 (n=3233) la factorización vuela; con primos de 8 dígitos ya tarda: esa es la lección', 'La «h» cifra siempre igual en RSA textbook: el padding OAEP real existe por eso', 'e=65537 es 2¹⁶+1: solo 2 bits a 1 → modpow en 17 pasos'],
  },
  bip39: {
    what: 'Laboratorio de seeds BIP39 con la wordlist oficial de 2048 palabras embebida: generación de 12/15/18/21/24 palabras con crypto.getRandomValues, construcción entropía→checksum SHA-256→palabras interoperables con wallets reales, validación completa (wordlist, longitud, checksum, hex de entropía recuperada), anatomía bit a bit (11 bits por palabra, checksum en la última), reparación por fuerza bruta de UNA palabra corrupta contra el checksum (2048 candidatas), derivación de la seed real PBKDF2-HMAC-SHA512 2048 iteraciones con passphrase 25ª palabra, y lecciones duras de seguridad.',
    params: [
      { name: 'longitud', type: '12-24', desc: '128 a 256 bits de entropía' },
      { name: 'mnemonic', type: 'string', desc: 'a validar: checksum, wordlist y entropía reconstruida' },
      { name: 'posición', type: 'int', desc: 'palabra sospechosa para la reparación por fuerza bruta' },
      { name: 'passphrase', type: 'string', desc: '25ª palabra opcional que cambia la seed por completo' },
    ],
    daily: ['Entender qué guarda realmente tu papel de recuperación (y por qué el checksum no protege)', 'Recuperar un mnemonic propio con una palabra mal anotada', 'Formación: mostrar en vivo por qué una seed vista es una seed perdida'],
    ethical: ['Nunca pegues una seed real de wallet: esta tool corre en tu navegador, pero la regla es no digitalizarla nunca', 'La reparación por fuerza bruta es para TUS mnemonics: con los de otros sería robo', 'El lab es educativo: gestiona fondos con software de wallet auditado'],
    tips: ['El vector «legal winner thank year…» de la doc BIP39 valida a la primera: úsalo para comprobar la tool', 'La corruptora cambia year→gear: la reparación lo encuentra entre 2048 candidatas', 'El checksum filtra 15 de cada 16 palabras aleatorias: puede haber varios candidatos válidos', 'La passphrase 25ª palabra es la única defensa si alguien VE tu papel: las palabras solas no bastan'],
  },

  /* ── Ronda 18 ── */
  maldoc: {
    what: 'Autopsia estática de documentos maliciosos sin ejecutar JAMÁS nada: PDF con catálogo de gatillos (/OpenAction, /AA, /Launch, /JS, /EmbeddedFile, /RichMedia, URI/UNC, /Encrypt) con contexto de cada aparición, veredicto por severidad y cadena de ejecución reconstruida; OOXML con inventario textual (vbaProject.bin, TargetMode=External, ActiveX, macroEnabled, updateFields); .eml con From vs Return-Path, SPF/DKIM/DMARC, ruta Received (se lee de abajo arriba), adjuntos peligrosos y dobles extensiones; y generador de muestras inertes de laboratorio (PDF con cadena completa, DOCX macro con relación externa) para entrenar la vista y calibrar sandboxes.',
    params: [
      { name: 'pdf', type: 'texto crudo', required: true, desc: 'contenido del PDF (strings, hex-dump decodificado o muestra del generador)' },
      { name: 'ooxml', type: 'inventario', desc: 'nombres de fichero + XML del docx/xlsx (unzip -l + cat de .rels)' },
      { name: 'eml', type: 'código fuente', desc: 'el .eml completo con cabeceras; incluye ejemplo de phishing cargable' },
      { name: 'muestras', type: 'generador', desc: 'suspicious.pdf y poliza_2026_macro.docm inertes para descargar' },
    ],
    daily: ['Analizar el adjunto sospechoso de un email ANTES de abrirlo (y de pasárselo al sandbox de pago)', 'Entrenar al equipo con muestras inertes: qué verá el analista en un PDF de campaña real', 'Auditar cabeceras .eml de phishing recibido: sobre SMTP vs From visible'],
    ethical: ['El análisis es estático: nada se ejecuta, ni el PDF lanza comandos ni la macro corre', 'Las muestras generadas son inertes y para laboratorio propio, no para enviar a nadie', 'Analizar documentos de campañas reales sin tratar puede ser ilegal según jurisdicción: usa muestras de repos públicos de investigación'],
    tips: ['Un PDF legítimo rara vez necesita /OpenAction + /JS + /Launch juntos: la co-ocurrencia ES el veredicto', 'En Office, vbaProject.bin es el indicador rey; TargetMode="External" con UNC apunta a robo de hash NTLM', 'En .eml, la identidad real está en Return-Path y la Received más antigua (abajo del todo)', 'Los lectores modernos bloquean /Launch a cmd.exe: el ataque real usa JS + EmbeddedFile o explota el lector'],
  },
  zipbomb: {
    what: 'La matemática de las zip bombs sin armas reales: constructor de bombs anidadas CAPADAS (runs de ceros de 1 KB a 10 MB, hasta 8 niveles × 16 ficheros, total expandido siempre acotado) usando deflate-raw nativo del navegador, ensamblador ZIP estándar propio (CRC32, headers STORE), árbol de amplificación con BigInt estilo 42.zip (16 niveles × 16 ficheros = 16¹⁶ copias), analizador de ZIPs sospechosos SIN descomprimir (central directory, ratios por entrada, anidación, veredicto por patrón) y catálogo de las bombs que hicieron historia (42.zip, layered, quine de Russ Cox, ZBLG/ZBSM de Fifield, PGS).',
    params: [
      { name: 'ceros hoja', type: '1 KB–10 MB', required: true, desc: 'tamaño del fichero hoja (capa de seguridad integrada)' },
      { name: 'ficheros × niveles', type: 'sliders', desc: 'estructura de anidación de la bomba capada' },
      { name: 'analizador', type: 'file input', desc: 'audita cualquier .zip: ratio máximo, anidación, veredicto' },
      { name: 'calculadora', type: 'BigInt', desc: 'árbol de amplificación estilo 42.zip sin límites' },
    ],
    daily: ['Probar si tu extractor (unzip, 7z, libarchive) aplica límites de descompresión reales', 'Auditar adjuntos .zip recibidos: ratio 1000:1 + anidación = patrón de bomba', 'Enseñar por qué «capacidad de disco» sin cuotas es una vulnerabilidad'],
    ethical: ['Las bombs generadas están CAPADAS: máximo ~10 GB expandibles, imposibles de causar daño', 'Fabricar o distribuir bombs reales para DoS es delito en la mayoría de jurisdicciones', 'El catálogo histórico es documentación pública con fines didácticos'],
    tips: ['DEFLATE codifica runs con (distancia, longitud): 1 GB de ceros cuesta ~28 KB — el resto es aritmética', 'La defensa es acotar: bytes máximos, ficheros por archivo y profundidad de anidación ANTES de extraer', 'Un ratio > 1000:1 en producción es anómalo: los datos reales comprimen 2-10x', 'La quine de Russ Cox (un ZIP que se contiene a sí mismo) es el límite teórico de la elegancia'],
  },
  steganalysis: {
    what: 'Estegoanálisis LSB sobre imágenes con dos ataques: visor de los 8 planos de bits por canal RGB (canvas, densidad de unos y flip-rate entre vecinos — los planos LSB con estego muestran estructura artificial donde debería haber ruido suave) y ataque chi-cuadrado de Westfeld-Pfitzmann sobre pares de valores (2v, 2v+1) con P-values REALES vía gamma incompleta regularizada (Numerical Recipes), curva P por bloques de la imagen para estimar dónde empieza/termina el payload, más estadística global: densidad LSB por canal y correlación de Pearson entre LSBs vecinos (natural 0.3-0.7, estego < 0.1).',
    params: [
      { name: 'imagen', type: 'file input', required: true, desc: 'PNG/BMP/JPG procesada 100% local en canvas (max 1200px)' },
      { name: 'canal + plano', type: 'select+slider', desc: 'R/G/B × plano 0-7 con render en vivo' },
      { name: 'chi²', type: '32 bloques', desc: 'P-value acumulado por fracción de imagen con gráfica' },
      { name: 'stats', type: 'métricas', desc: 'densidad, flip-rate y correlación de vecinos por canal' },
    ],
    daily: ['Comprobar si la imagen que te pasó «anon» lleva tinta LSB antes de confiar en su origen', 'Auditar imágenes de tu web: ¿alguien subió estego por el formulario de contacto?', 'Formación: ver en vivo cómo el plano 0 delata el texto incrustado'],
    ethical: ['Todo el análisis es local: la imagen nunca sale del navegador', 'Detectar estego ajeno sin autorización puede violar privacidad; en tus canales, es DLP legítimo', 'La herramienta es de detección básica: no sustituye un análisis forense certificado'],
    tips: ['El flip-rate ≈50% en el LSB es la firma del ruido puro: una foto natural queda <30%', 'Si la curva chi² cae de P≈1 a P≈0 a mitad de imagen, el embed empezó arriba: mide el punto para estimar el payload', 'La recompresión (cualquier reescalado) destruye LSB: es la defensa gratuita contra este canal', 'Prueba con una imagen SIN estego y una CON estego (cualquier herramienta LSB): compara los números'],
  },
  wayback: {
    what: 'Máquina del tiempo OSINT para dominios vía CDX API de archive.org (CORS abierto, solo se consulta lo que el usuario escribe): timeline con capturas por año, desglose de códigos HTTP y mimetypes, primeros/últimos snapshots con enlace directo; subdominios históricos con matchType=domain (cuándo aparecieron, cuándo murieron, volumen — candidatos a subdomain takeover); y rutas interesantes indexadas (admin, backup, .env, api, swagger…) con estado HTTP de cada snapshot: el diccionario que otros pagan por descubrir.',
    params: [
      { name: 'dominio', type: 'string', required: true, desc: 'se normaliza (sin protocolo, www ni rutas) antes de consultar' },
      { name: 'modo', type: '3 pestañas', desc: 'timeline (host), subdominios (domain) o rutas interesantes' },
      { name: 'timeline', type: 'gráfica', desc: 'capturas por año + HTTP/mime breakdown + últimos 40' },
      { name: 'subs', type: 'tabla', desc: 'subdominio, rango de años activo, capturas y último snapshot' },
    ],
    daily: ['Recon pasiva de un target autorizado: surface histórica sin UNA petición al target', 'Buscar endpoints borrados de tu propia web que siguen vivos en el servidor', 'Documentar la evolución tecnológica de un dominio (CMS, migraciones, hosting)'],
    ethical: ['Solo se consulta archive.org: el target no recibe tráfico y todo es público e indexado', 'El índice que ves es el que ve un atacante: audita TU dominio y limpia la deuda pública', 'Usar rutas históricas contra sistemas sin autorización sigue siendo delito aunque sean «viejas»'],
    tips: ['Los subdominios con firstY≠lastY y rango antiguo son los mejores candidatos a takeover: cruza con DNS', 'matchType=domain trae hasta 20k registros y es lento: host para el host exacto', 'Received de los .eml y snapshots de la CDX comparten lema: lo antiguo es lo que nadie protege', 'archive.org aplica rate limit: si sale 429, espera unos segundos en vez de machacar'],
  },
  audiomodem: {
    what: 'Módem acústico FSK completo con la Web Audio API: emisor que modula bits en dos tonos audibles (perfiles 50/100/200 baud) con fase continua, trama con preámbulo 0101… ×8 + SOH + longitud + payload Hamming(8,4) + checksum XOR, receptor Goertzel en vivo sobre el micrófono con búsqueda de preámbulo tolerante a 2 bits, y loopback interno PCM→demodulador con ruido blanco para ver la cadena completa sin hardware.',
    params: [
      { name: 'mensaje', type: 'texto', required: true, desc: 'máx 255 bytes por trama; se transmite ×3 para sincronizar' },
      { name: 'perfil', type: 'select', desc: '50/100/200 baud con frecuencias 1.8-2.4 kHz audibles' },
      { name: 'transmitir', type: 'altavoz', desc: 'reproduce el PCM por la salida de audio real' },
      { name: 'recibir', type: 'micrófono', desc: 'Goertzel en vivo con indicador de energía y checksum' },
      { name: 'loopback', type: 'local', desc: 'modula + añade ruido + demodula sin tocar el hardware' },
    ],
    daily: ['Entender de primera mano cómo cruza datos un air-gap (Stuxnet, aIR-Jumper) y por qué se tapean altavoces y micrófonos en entornos críticos', 'Laboratorio de DSP: ver Goertzel, FSK y códigos correctores funcionando sin SDK ni hardware', 'Enviar un mensaje entre dos móviles de la sala sin red ninguna — solo aire'],
    ethical: ['El canal acústico es de difusión: cualquiera con micrófono en la sala recibe lo mismo — no es confidencial', 'Usarlo para exfiltrar datos de sistemas ajenos es delito; sirve para demostrar por qué se prohíben altavoces en entornos seguros', 'Todo se genera y demodula en local: ninguna señal sale de tu navegador más allá del altavoz'],
    tips: ['El preámbulo 0101… permite alinear el reloj de símbolo: sin él, cada ventana empezaría a mitad de símbolo y el canal sería ruido', 'Goertzel cuesta O(N) por tono: para 2 frecuencias concretas gana a la FFT, por eso lo usan los DTMF desde hace 40 años', 'Hamming(8,4) corrige 1 bit por nibble pero duplica el payload: compromiso didáctico, no estándar', 'Con auriculares evitas el eco: el micrófono del mismo dispositivo capta el altavoz y duplica las tramas'],
  },
  biometrics: {
    what: 'Biometría conductual del teclado 100% local: captura de keydown/keyup con performance.now(), cálculo de dwell (duración de la pulsación) y flight (vuelo entre teclas), perfil estadístico por tecla y por digrafo (media, desviación, WPM, coeficiente de variación), detector de bots por ritmo (CV < 6% o flight < 30 ms = metrónomo imposible para dedos humanos) con puntuación 0-100, y demo humano simulado vs bot simulado para ver saltar el detector.',
    params: [
      { name: 'captura', type: 'textarea', required: true, desc: 'keydown/keyup en vivo; nada sale del navegador' },
      { name: 'perfil', type: 'análisis', desc: 'dwell/flight por tecla y digrafo, WPM, CV y ritmo' },
      { name: 'veredicto', type: 'bot/humano', desc: 'puntuación 0-100 con umbral sospechoso/bot' },
      { name: 'demo', type: 'simulada', desc: 'sesión humana (variabilidad natural) vs bot (constante)' },
    ],
    daily: ['Entender cómo los bancos detectan que «te robaron la sesión» a los 30 segundos aunque el atacante tenga tu contraseña', 'Probar tu propio patrón: escribe una frase y compara tu CV con el de un bot', 'Educación en privacidad: estos datos son biometría (GDPR art. 9) y no deberían salir de tu dispositivo'],
    ethical: ['Todo el análisis ocurre en tu navegador: los keystroke dynamics nunca se transmiten ni se guardan', 'No escribas contraseñas reales en la captura: la demo es para observar métricas, no secretos', 'Implementar esto contra usuarios sin consentimiento explícito viola el GDPR (dato biométrico de categoría especial)'],
    tips: ['El coeficiente de variación del flight-time es el detector de bots más barato que existe: humano 30-60%, script < 5%', 'El ritmo depende del PAR de teclas, no solo de la persona: los sistemas serios normalizan por digrafo (free-text vs fixed-text)', 'Una sesión corta (< 10 pares) no permite veredicto: la biometría conductual necesita datos', 'Como toda biometría, el patrón puede grabarse y replicarse: el «qué escribes» sigue importando más que el «cómo»'],
  },
  passkeys: {
    what: 'Laboratorio de anatomía WebAuthn: decodificador CBOR (RFC 8949) que diseciona el attestationObject byte a byte — fmt, attStmt, authData con rpIdHash, flags (UP/UV/BE/BS/AT/ED), signCount, AAGUID, credentialId y clave pública COSE (kty/alg/curva/x-y) —, parser de clientDataJSON con challenge y origin, generador de attestation sintética tipo «none» con la misma estructura exacta que emite tu navegador, y ceremonia real navigator.credentials.create() si el entorno la soporta.',
    params: [
      { name: 'pegar', type: 'b64url', desc: 'attestationObject y clientDataJSON de un registro real' },
      { name: 'demo', type: 'generador', desc: 'attestation sintética reproducible (seed determinista)' },
      { name: 'ceremonia', type: 'WebAuthn', desc: 'crea una passkey real en este navegador (HTTPS)' },
      { name: 'flags', type: 'byte', desc: 'cada bit explicado: UP, UV, BE, BS, AT, ED' },
    ],
    daily: ['Entender por qué el phishing no roba passkeys: origin y rpIdHash van firmados dentro de la respuesta', 'Auditar qué te dice el flag BS sobre una credencial sincronizada (¿está en la nube de Google/Apple?)', 'Depurar integraciones WebAuthn propias: mira exactamente qué emite el navegador antes de enviarlo al RP'],
    ethical: ['Las claves generadas son sintéticas y no son curvas válidas: solo anatomía, no autenticación', 'La ceremonia real crea la credencial SOLO en tu dispositivo: nada viaja a ningún servidor', 'El decodificador es local: pega respuestas de test, no de producción ajena'],
    tips: ['Un signCount ≤ al anterior delata credencial clonada… salvo en passkeys sincronizadas, donde queda congelado a 0 a propósito', 'CBOR es el JSON de lo binario: mapas con claves enteras negativas (alg=-7) y bytes crudos sin base64', 'UP sin UV = solo tocó; UV = verificó biometría/PIN: tu servidor debe exigir el mínimo que tu política promete', 'El phishing de bancoGLOBAL.com nunca obtiene firma válida para bancoGLOBAL.com: eso es ser phishing-resistant por diseño'],
  },
  flipperterm: {
    what: 'Terminal de laboratorio para el ecosistema Flipper Zero vía Web Serial API (Chrome/Edge) con simulador educativo completo cuando no hay hardware: intérprete de comandos subghz/ir/nrf/rfid/nfc/gpio con salidas realistas, referencia de los comandos del CLI con sus riesgos legales, parser de la salida de subghz rx que extrae frecuencia, modulación, protocolo y claves capturadas (fixed-code Princeton/CAME), y lecciones de radio insegura: rolljam, MouseJack, MIFARE roto.',
    params: [
      { name: 'terminal', type: 'CLI', desc: 'simulada sin hardware; real con Web Serial a 230400 baud' },
      { name: 'comandos', type: 'quick chips', desc: 'help, device_info, subghz rx, rfid read…' },
      { name: 'parser', type: 'subghz rx', desc: 'extrae freq, protocolo, key y bit-length de capturas' },
      { name: 'referencia', type: 'docs', desc: 'cada comando con su aviso legal si lo lleva' },
    ],
    daily: ['Aprender el CLI del Flipper antes de comprarlo (o antes de enchufarlo)', 'Analizar capturas subghz propias: ¿tu mando de garaje es fixed-code de 24 bits?', 'Formación en pentesting físico: por qué la radio 433 MHz es el eslabón débil de millones de puertas'],
    ethical: ['El simulador NO transmite nada: sin hardware todo es teatro educativo', 'Con hardware real, tú eres el responsable legal de lo que emitas (replay de señales ajenas = delito en la mayoría de jurisdicciones)', 'Las capturas del parser son de ejemplo: las frecuencias legales (bandas ISM) varían por país'],
    tips: ['Fixed-code (Princeton, 8-24 bits) = grabar y reenviar basta; rolling code (KeeLoq) evita el replay pero no el rolljam con jammer', '2^24 = 16.7M combinaciones: un código fijo se fuerza en minutos con SDR — no hay cifrado que romper', 'MouseJack: los dongles 2.4 GHz de teclados sin emparejar aceptan inyección de pulsaciones desde 2016', 'MIFARE Classic (Crypto1) está roto desde 2008: si tu oficina lo usa, el UID es un nombre público'],
  },
  cardforge: {
    what: 'Generador didáctico de tarjetas de crédito FICTICIAS con la aritmética REAL de pago: checksum de Luhn (ISO/IEC 7812-1, patentado en 1954 contra errores de tecleo), prefijos IIN/BIN públicos de 7 redes (Visa, Mastercard, Amex, Discover, JCB, Diners, UnionPay) con sus longitudes y CVC reales, datos de titular y banco sintéticos, lote hasta 20, y analizador que desglosa cualquier número pegado: red detectada, Luhn, MII (primer dígito = industria), BIN y veredicto honesto.',
    params: [
      { name: 'red', type: 'select', required: true, desc: '7 redes con prefijos, longitudes y CVC reales' },
      { name: 'BIN', type: 'opcional', desc: 'fija los primeros 6-8 dígitos del plástico' },
      { name: 'preview', type: 'tarjeta 3D', desc: 'plástico con gradiente por red, chip, flip al dorso con CVC' },
      { name: 'analizador', type: 'pegado', desc: 'red + Luhn + MII + BIN de cualquier número' },
    ],
    daily: ['Probar la validación de tu propio formulario de checkout: ¿comprueba Luhn antes de llamar al gateway?', 'Entrenar al equipo en PCI DSS: por qué el CVV jamás se almacena y el PAN va tokenizado/iframe', 'Demostrar que «Luhn OK» no significa nada: la autorización real la decide el emisor online'],
    ethical: ['Los números generados NO existen en ningún emisor: no tienen cuenta, fondos ni superan una autorización real', 'Usar números plausibles de tarjeta ajena en formularios reales es fraude (art. 248 CP y equivalentes)', 'Es un laboratorio de formato para desarrolladores y formadores: nada se envía a ninguna API'],
    tips: ['Luhn NO es criptografía: es un chequeo de calidad de datos como el ISBN o el IBAN — detecta 1 dígito mal o 2 transpuestos', 'El primer dígito (MII) ya dice la industria: 4/5 banca, 3 viajes (Amex/JCB/Diners), 7 petróleo, 9 asignación nacional', 'Mastercard moderna empieza por 2221-2720 (rango 2): por eso el MII 2 también es «banca» desde 2017', 'Amex: 15 dígitos y CVC de 4 en el FRENTE; el resto de redes: CVC de 3 al dorso'],
  },
  dnigen: {
    what: 'Generador de DNI/NIE españoles FICTICIOS con el algoritmo oficial REAL: letra módulo 23 sobre el número con la tabla TRWAGMYFPDXBNJZSQVHLCKE, NIE (Orden INT/1097/2005) sumando el valor de la inicial (X=0, Y=10M, Z=20M) antes del módulo, MRZ TD1 de ICAO 9303 (las 3 líneas OCR-B del reverso del DNI 3.0) con checksums 7-3-1 reales, lote hasta 25 y validador que explica el cálculo paso a paso con la letra esperada.',
    params: [
      { name: 'tipo', type: 'select', required: true, desc: 'DNI (8+letra) o NIE (X/Y/Z + 7 + letra)' },
      { name: 'preview', type: 'carné', desc: 'estilo DNI 3.0: foto sintética, MRZ real con checks' },
      { name: 'lote', type: '1-25', desc: 'tabla con número, letra y módulo de cada uno' },
      { name: 'validador', type: 'pegado', desc: 'explica el mod 23 y la letra esperada' },
    ],
    daily: ['Validar el campo DNI de tu formulario antes de enviarlo al backend (la letra es computable, gratis y local)', 'Detectar datos falsos con letra inconsistente en registros de prueba o importaciones', 'Formación en KYC: entender qué comprueba un escáner MRZ y por qué la letra es solo la primera valla'],
    ethical: ['Los documentos generados son FICTICIOS: la aritmética cuadra pero la existencia la acredita solo el Registro Civil', 'Usar DNI ajenos o inventados plausibles para registrarse, contratar o suplantar es delito (suplantación y fraude documental)', 'No se consulta ninguna base de datos: todo el cálculo es local y no sale ningún byte'],
    tips: ['El NIE es un DNI disfrazado: X-1234567 tiene la MISMA letra que el DNI 01234567 porque X=0 millones', 'La MRZ del reverso usa pesos 7-3-1 sobre dígitos, letras (A=10…Z=35) y «<» (filler): el mismo estándar de pasaportes de todo el mundo', '12345678 → mod 23 = 14 → letra Z: comprueba el algoritmo a mano la primera vez y nunca más lo dudes', 'Válido ≠ real: igual que Luhn no consulta al emisor, el mod 23 no consulta el padrón — la verificación real es documental'],
  },
}
