/* Guía rápida de tareas: "quiero hacer X" → herramientas y pasos.
   Los ids deben existir en el registry de tools. */

export interface TaskEntry {
  id: string
  task: string // "configurar un firewall"
  icon: string
  category: 'red' | 'linux' | 'windows' | 'auditoría' | 'contraseñas' | 'análisis' | 'creación' | 'web' | 'forense' | 'lenguajes' | 'privacidad'
  desc: string // por dónde empezar
  steps: string[]
  tools: string[] // tool ids del registry
  keywords: string[]
}

export const TASKS: TaskEntry[] = [
  {
    id: 'task-firewall-linux', task: 'configurar un firewall en Linux', icon: '🧱', category: 'red',
    desc: 'nftables es el firewall moderno del kernel: ruleset con policy drop y reglas por servicio.',
    steps: ['Define los servicios que deben estar accesibles (SSH, web…)', 'Genera el ruleset con policy drop y established/related', 'Prueba con nft -c -f antes de cargar', 'Cárgalo y verifica desde OTRA terminal que el SSH sigue vivo'],
    tools: ['nftgen', 'sshharden', 'ports'],
    keywords: ['firewall', 'nftables', 'iptables', 'puertos', 'reglas', 'nft'],
  },
  {
    id: 'task-firewall-win', task: 'configurar el firewall de Windows', icon: '🪟', category: 'windows',
    desc: 'netsh advfirewall sigue siendo la forma más fiable de scriptar reglas con mínimo privilegio.',
    steps: ['Decide dirección, proto y quién (remoteip)', 'Genera las reglas netsh con los presets', 'Restringe RDP/WinRM a la LAN/VPN', 'Aplica y verifica con Get-NetFirewallRule'],
    tools: ['winfirewall', 'winharden', 'ports'],
    keywords: ['firewall', 'windows', 'netsh', 'rdp', 'winrm', 'reglas'],
  },
  {
    id: 'task-vpn', task: 'montar mi propia VPN', icon: '🔒', category: 'red',
    desc: 'WireGuard: moderno, rápido y con claves que puedes generar tú mismo.',
    steps: ['Elige subred del túnel y puerto UDP', 'Genera servidor + peers con las claves', 'Cada peer: AllowedIPs = lo que quieres routear', 'Configura el NAT/firewall del servidor para salida a internet'],
    tools: ['wgquick', 'nftgen', 'subnetting'],
    keywords: ['vpn', 'wireguard', 'túnel', 'wg', 'privacidad'],
  },
  {
    id: 'task-ssh', task: 'endurecer el SSH de un servidor', icon: '🔑', category: 'linux',
    desc: 'solo claves, sin root, cifrados AEAD y AllowUsers: la base.',
    steps: ['Genera la config endurecida', 'sshd -t antes de reiniciar (valida sintaxis)', 'Deja una sesión abierta de emergencia', 'Reinicia sshd y prueba login en otra terminal'],
    tools: ['sshharden', 'nftgen', 'cheatsheets'],
    keywords: ['ssh', 'sshd', 'hardening', 'servidor', 'claves', 'brute force'],
  },
  {
    id: 'task-disk', task: 'montar un disco o crear volúmenes', icon: '💽', category: 'linux',
    desc: 'LVM para flexibilidad, fstab para persistencia, LUKS para cifrado.',
    steps: ['lsblk DOS veces: identifica los dispositivos', 'Elige el escenario (LVM, RAID, LUKS, simple)', 'Sigue los pasos numerados con los avisos', 'fstab con UUID y findmnt --verify antes de reboot'],
    tools: ['diskcmds', 'fstabgen', 'chmod'],
    keywords: ['disco', 'lvm', 'raid', 'luks', 'mount', 'fstab', 'volúmenes', 'particiones'],
  },
  {
    id: 'task-admin', task: 'administrar un sistema Linux', icon: '🐧', category: 'linux',
    desc: 'systemd, cron y chuletas: la tríada del sysadmin.',
    steps: ['Servicios: qué corre y con qué exposición (systemd gen)', 'Cron: revisa tareas periódicas y detecta malware', 'Logs: journalctl con -S y -p para no ahogarte', 'Disco: df -h Y df -i (los inodes engañan)'],
    tools: ['systemdgen', 'crontalk', 'cheatsheets'],
    keywords: ['admin', 'sysadmin', 'usuarios', 'servicios', 'logs', 'systemd', 'cron'],
  },
  {
    id: 'task-privesc', task: 'escalar privilegios en un lab', icon: '🧗', category: 'auditoría',
    desc: 'checklist de enumeración antes de tocar exploits: lo simple primero.',
    steps: ['SUID/GUID fuera del baseline', 'sudo -l: GTFOBins y wildcards', 'Cron jobs escribibles y capabilities', 'Credenciales en configs, history y backups'],
    tools: ['sudoersgen', 'cheatsheets', 'umaskgen'],
    keywords: ['privesc', 'privilegios', 'sudo', 'suid', 'escalada', 'ctf'],
  },
  {
    id: 'task-osint', task: 'hacer OSINT de un dominio o usuario', icon: '🕵️', category: 'auditoría',
    desc: 'pasivo primero: dorks y perfiles sin tocar el objetivo.',
    steps: ['Dorks de Google/GitHub/Shodan con el objetivo', 'Username OSINT: variantes y plataformas', 'DNS con DoH: subdominios y SPF/DMARC', 'Documenta con IOC Extractor lo que aparezca'],
    tools: ['dorkgen', 'userosint', 'dns', 'iocextract'],
    keywords: ['osint', 'recon', 'dorks', 'huella', 'reconocimiento', 'dominio'],
  },
  {
    id: 'task-phish-check', task: 'analizar un email o URL sospechosa', icon: '🎣', category: 'análisis',
    desc: 'sin hacer clic: cabeceras y URL por separado, 100% local.',
    steps: ['Cabeceras: Received chain + SPF/DKIM/DMARC', 'URL: punycode, homoglyphs y typosquatting', 'Extrae IOCs del cuerpo del mensaje', 'Defange antes de compartir con nadie'],
    tools: ['mailheader', 'urlphish', 'iocextract', 'defanger'],
    keywords: ['phishing', 'email', 'url', 'spoofing', 'fraude', 'cabeceras'],
  },
  {
    id: 'task-passwords', task: 'mejorar las contraseñas de mi organización', icon: '🔐', category: 'contraseñas',
    desc: 'NIST 800-63B: longitud > complejidad, sin rotación suicida.',
    steps: ['Define la política con el builder (Linux+Windows)', 'Audita las actuales con PassAudit (HIBP)', 'Wordlist dirigida para demostrar el problema', 'Passgen para generar candidatas fuertes'],
    tools: ['pwpolicy', 'passaudit', 'wordlistgen', 'passgen'],
    keywords: ['contraseñas', 'política', 'nist', 'contraseña', 'auditoría'],
  },
  {
    id: 'task-wordlist', task: 'crear una wordlist para una auditoría autorizada', icon: '📋', category: 'auditoría',
    desc: 'dirigida al objetivo: más efectiva que rockyou entera.',
    steps: ['Recolecta datos públicos (empresa, empleados, mascotas…)', 'Genera con mutaciones (años, leet, sufijos)', 'Descarga el .txt', 'Úsala SOLO en el alcance autorizado'],
    tools: ['wordlistgen', 'cracker', 'hashid'],
    keywords: ['wordlist', 'diccionario', 'hashcat', 'john', 'cracking'],
  },
  {
    id: 'task-report', task: 'documentar los hallazgos de una auditoría', icon: '📄', category: 'creación',
    desc: 'sin informe no hay auditoría: evidencia, impacto y remediación.',
    steps: ['Datos del encargo (cliente, alcance, fechas)', 'Hallazgos con severidad y evidencia concreta', 'Exporta Markdown', 'A PDF con pandoc si el cliente lo pide'],
    tools: ['pentestreport', 'cvss', 'cvelookup'],
    keywords: ['informe', 'report', 'hallazgos', 'evidencia', 'pentest', 'documento'],
  },
  {
    id: 'task-blue', task: 'montar visibilidad de detección en Windows', icon: '🛡️', category: 'análisis',
    desc: 'Sysmon + eventos clave + reglas concretas = SOC casero.',
    steps: ['Genera la config Sysmon (perfil esencial)', 'Despliega con sysmon64.exe -i', 'Aprende los event IDs de seguridad', 'Redirige los logs a tu SIEM/collector'],
    tools: ['sysmonbuilder', 'winlog', 'pslab', 'loganonymize'],
    keywords: ['sysmon', 'detección', 'soc', 'siem', 'eventos', 'blue team'],
  },
  {
    id: 'task-logs', task: 'compartir logs sin exponer datos', icon: '🙈', category: 'creación',
    desc: 'pseudonimización consistente: mismo valor → mismo alias.',
    steps: ['Pega el log o config', 'Elige qué anonimizar (IPs, users, dominios)', 'Revisa el mapa de pseudónimos', 'Comparte la salida + mapa si hace falta revertir'],
    tools: ['loganonymize', 'confdiff', 'defanger'],
    keywords: ['logs', 'anonimizar', 'privacidad', 'foro', 'ticket', 'pseudónimo'],
  },
  {
    id: 'task-web-test', task: 'testear una web autorizada', icon: '🌐', category: 'auditoría',
    desc: 'recon pasivo → headers → fuzzing controlado → documentar.',
    steps: ['HTTP Inspector: cabeceras y seguridad', 'Dorks: qué está indexado', 'Web Fuzzer: rutas y params', 'Payloads conocidos solo con permiso expreso'],
    tools: ['httpinspector', 'dorkgen', 'webfuzzer', 'payloads'],
    keywords: ['web', 'http', 'fuzzing', 'xss', 'sqli', 'pentest web'],
  },
  {
    id: 'task-forense', task: 'analizar una captura o fichero sospechoso', icon: '🔬', category: 'análisis',
    desc: 'todo local: pcap, binarios, imágenes, metadatos.',
    steps: ['PCAP Analyzer: protocolos y top talkers', 'File Analyzer: magic bytes y entropía', 'EXIF: GPS y software si es imagen', 'IOC Extractor sobre cualquier texto del informe'],
    tools: ['pcap', 'fileanalyzer', 'exif', 'iocextract'],
    keywords: ['forense', 'pcap', 'análisis', 'malware', 'metadatos', 'evidencia'],
  },
  {
    id: 'task-encode', task: 'descifrar o decodificar algo raro', icon: '🧩', category: 'análisis',
    desc: 'cadena de decodificadores y criptoanálisis clásico.',
    steps: ['Deobfuscator: decodifica capas automáticas', 'Hashid: identifica el formato si es un hash', 'Classics: césar/vigenère/xor con force bruta', 'HackingChef para recetas a medida'],
    tools: ['deobfuscate', 'hashid', 'classics', 'hackingchef'],
    keywords: ['decodificar', 'cifrado', 'base64', 'xor', 'hash', 'ofuscado'],
  },
  {
    id: 'task-dns-audit', task: 'auditar la seguridad DNS de un dominio', icon: '🌍', category: 'red',
    desc: 'SPF/DMARC/DKIM/CAA: qué expone el dominio y si pueden suplantar su email.',
    steps: ['Consulta TXT con la tool DNS y mira la barra de riesgo', 'Sin DMARC p=reject → suplantación trivial', 'Revisa CAA: quién puede emitir certificados', 'Enumera subdominios con dorks antes de tocar nada'],
    tools: ['dns', 'dorkgen'],
    keywords: ['dns', 'spf', 'dmarc', 'dkim', 'spoofing', 'email', 'dominio', 'caa'],
  },
  {
    id: 'task-web-xss', task: 'probar XSS en una web autorizada', icon: '💥', category: 'web',
    desc: 'contexto primero: el payload correcto depende de dónde se refleja.',
    steps: ['Localiza el punto de inyección (URL, form, header)', 'Identifica el contexto: HTML body, atributo o JS', 'Payload del XSS Generator según contexto', 'JS Playground si necesitas probar el bypass'],
    tools: ['xsgen', 'langjavascript', 'httpinspector'],
    keywords: ['xss', 'payload', 'inyección', 'reflected', 'stored', 'dom'],
  },
  {
    id: 'task-xxe', task: 'probar XXE o LFI a RCE', icon: '📁', category: 'web',
    desc: 'parsers XML y php://filter: dos clásicos que siguen vivos.',
    steps: ['Detecta XML en la app (SOAP, SAML, uploads)', 'Plantillas XXE del Arsenal (directo y OOB)', 'Si hay LFI en PHP: Filter Chain a RCE', 'TTY Upgrade cuando caiga la shell'],
    tools: ['xmlgen', 'phpfilter', 'ttyupgrade'],
    keywords: ['xxe', 'lfi', 'rfi', 'php filter chain', 'xml', 'oob'],
  },
  {
    id: 'task-pivot', task: 'pivotar a una red interna', icon: '🔀', category: 'red',
    desc: 'del foothold a la red profunda: túneles y SOCKS encadenados.',
    steps: ['Dibuja el mapa: nodos, interfaces y SO', 'Elige protocolo por tramo (ssh/chisel/ligolo)', 'Copia los comandos con su ubicación exacta', 'Valida el túnel con el comando de verificación'],
    tools: ['pivotmap', 'ttyupgrade', 'filexfer'],
    keywords: ['pivoting', 'túnel', 'socks', 'chisel', 'ligolo', 'ssh -d', 'socat'],
  },
  {
    id: 'task-bof', task: 'explotar un buffer overflow', icon: '🎯', category: 'auditoría',
    desc: 'patrón cíclico → offset → badchars → payload con NOPs.',
    steps: ['Genera el patrón cíclico y provoca el crash', 'Calcula el offset con el EIP invertido', 'Identifica badchars con la matriz', 'Payload final con NOP sled y retorno'],
    tools: ['bofcalc', 'langc', 'langpython'],
    keywords: ['bof', 'buffer overflow', 'offset', 'badchars', 'eip', 'exploit'],
  },
  {
    id: 'task-passgen-audit', task: 'generar y testear contraseñas seguras', icon: '🔑', category: 'contraseñas',
    desc: 'zxcvbn mide entropía real, no la teórica.',
    steps: ['Genera candidatas con Passgen (diceware o aleatorias)', 'Mide la resistencia real con PassAudit', 'Compara con la wordlist que usaría un atacante', 'Fija la política con el builder'],
    tools: ['passgen', 'passaudit', 'pwpolicy'],
    keywords: ['contraseña', 'entropy', 'zxcvbn', 'diceware', 'password'],
  },
  {
    id: 'task-learn-lang', task: 'aprender o repasar un lenguaje de programación', icon: '📚', category: 'lenguajes',
    desc: '16 chuletas con playground: lee, ejecuta, rompe, entiende.',
    steps: ['Elige el lenguaje (Python es la puerta de entrada)', 'Lee la chuleta: sintaxis esencial por secciones', 'Pica ▶ ejecutar en el playground y modifica el código', 'Rompe cosas a propósito y lee los errores'],
    tools: ['langpython', 'langjavascript', 'langgo', 'langrust'],
    keywords: ['lenguaje', 'python', 'javascript', 'java', 'c', 'programar', 'aprender', 'chuleta', 'playground'],
  },
  {
    id: 'task-forense-meta', task: 'analizar metadatos de un fichero o imagen', icon: '🔍', category: 'forense',
    desc: 'EXIF y file analyzer: geolocalización, software y firmas.',
    steps: ['EXIF: GPS, cámara y software de la imagen', 'File Analyzer: magic bytes y entropía', 'Extrae IOCs de lo que aparezca (dominios, hashes)', 'Documenta con Pentest Report Builder'],
    tools: ['exif', 'fileanalyzer', 'iocextract'],
    keywords: ['metadatos', 'exif', 'imagen', 'gps', 'forense', 'magic bytes'],
  },
  {
    id: 'task-anon', task: 'anonimizar datos antes de compartir', icon: '🙈', category: 'privacidad',
    desc: 'pseudonimización consistente y reversible (solo para ti).',
    steps: ['Log Anonymizer: IPs, usuarios y dominios → alias', 'Revisa el mapa de pseudónimos generado', 'Defang las IPs/URLs antes de pegar en foros', 'Si es un email: analiza cabeceras sin exponer remitentes'],
    tools: ['loganonymize', 'defanger', 'mailheader'],
    keywords: ['anonimizar', 'privacidad', 'defang', 'pseudónimo', 'logs', 'compartir'],
  },
  {
    id: 'task-crack-hash', task: 'identificar y crackear un hash', icon: '🧩', category: 'análisis',
    desc: 'primero sabe qué es, luego elige la tool.',
    steps: ['HashID: identifica el formato (¿bcrypt? ¿MD5? ¿NTLM?)', 'Si es bcrypt: fuerza bruta pura no va a llegar', 'Wordlist dirigida + reglas con hashcat/john', 'Cracker online para formatos rápidos (MD5/SHA1)'],
    tools: ['hashid', 'wordlistgen', 'cracker'],
    keywords: ['hash', 'crack', 'hashcat', 'john', 'md5', 'bcrypt', 'ntlm'],
  },
]

export const TASK_CATS: TaskEntry['category'][] = ['red', 'web', 'linux', 'windows', 'auditoría', 'contraseñas', 'análisis', 'forense', 'lenguajes', 'privacidad', 'creación']

export const TASK_CAT_LABEL: Record<TaskEntry['category'], string> = {
  red: 'Red',
  web: 'Web',
  linux: 'Linux',
  windows: 'Windows',
  auditoría: 'Auditoría',
  contraseñas: 'Contraseñas',
  análisis: 'Análisis',
  forense: 'Forense',
  lenguajes: 'Lenguajes',
  privacidad: 'Privacidad',
  creación: 'Crear/Documentar',
}

export function searchTasks(q: string): TaskEntry[] {
  const qn = q.trim().toLowerCase()
  if (!qn) return TASKS
  return TASKS.filter((t) => (t.task + t.desc + t.keywords.join(' ')).toLowerCase().includes(qn))
}
