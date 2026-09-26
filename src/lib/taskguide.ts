/* Guía rápida de tareas: "quiero hacer X" → herramientas y pasos.
   Los ids deben existir en el registry de tools. */

export interface TaskEntry {
  id: string
  task: string // "configurar un firewall"
  icon: string
  category: 'red' | 'linux' | 'windows' | 'auditoría' | 'contraseñas' | 'análisis' | 'creación'
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
    desc: '56 comandos por dominio con las trampas que rompen sistemas.',
    steps: ['Usuarios: quién existe y con qué permisos', 'Servicios: qué corre y con qué exposición', 'Logs: journalctl con -S y -p para no ahogarte', 'Disco: df -h Y df -i (los inodes engañan)'],
    tools: ['admincmds', 'systemdgen', 'crontalk'],
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
]

export const TASK_CATS: TaskEntry['category'][] = ['red', 'linux', 'windows', 'auditoría', 'contraseñas', 'análisis', 'creación']

export const TASK_CAT_LABEL: Record<TaskEntry['category'], string> = {
  red: 'Red',
  linux: 'Linux',
  windows: 'Windows',
  auditoría: 'Auditoría',
  contraseñas: 'Contraseñas',
  análisis: 'Análisis',
  creación: 'Crear/Documentar',
}

export function searchTasks(q: string): TaskEntry[] {
  const qn = q.trim().toLowerCase()
  if (!qn) return TASKS
  return TASKS.filter((t) => (t.task + t.desc + t.keywords.join(' ')).toLowerCase().includes(qn))
}
