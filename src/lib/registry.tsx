import type { LucideIcon } from 'lucide-react'
import {
  Hash, KeyRound, ShieldCheck, Fingerprint, FileSearch, ScanSearch, Camera, Waves, TerminalSquare,
  ChefHat, Calculator, Network, Globe, Activity, Radar, Lock, Unlock, ArrowLeftRight, Binary, EyeOff,
  Smile, Radio, Server, Database, FileCode, Bug, Swords, FileKey, ScrollText, Brain, Braces, Regex,
  CalendarClock, Wifi, Split, Crown, Globe2, Timer, ShieldAlert, Ban, QrCode, TypeOutline,
  Cpu, Wand2, Fish, Link2, MailWarning, Crosshair, Scissors,
  FileLock2, UserCog, Cog, FolderLock, Search, Plug, FileWarning,
  HardDrive, Gauge, KeySquare, BrickWall, Waypoints, Clock, Shield, FileTerminal,
  UserSearch, ListPlus, ClipboardList, MonitorCog, FileCog, FileText,
  Terminal, Sparkles, FileDiff, History,
  Filter, FileCode2, Route, MonitorPlay, FileInput, Users, BookMarked,
  Languages, SquareTerminal, Cable, HeartPulse, Nfc, Keyboard,
  Hourglass, AlarmClock, LayoutGrid, Microchip, Bluetooth, BadgeCheck,
  RadioTower, Antenna, ScanLine,
  PackageOpen, FolderInput, MousePointerClick, PlugZap, Smartphone, Ghost, Variable, Boxes, Scale, Eye,
  Puzzle, TimerReset, ShieldHalf, Captions, AudioLines, KeySquare as KeySquareAlias, PhoneCall, AtSign as AtSignAlias,
} from 'lucide-react'

export type ToolCategory =
  | 'Criptografía'
  | 'Contraseñas'
  | 'Web & payloads'
  | 'Red'
  | 'Forense'
  | 'Ingeniería Inversa'
  | 'Phishing'
  | 'Linux & sistema'
  | 'Análisis'
  | 'Generadores'
  | 'Lenguajes'

export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  Criptografía: 'text-acento',
  Contraseñas: 'text-warn',
  'Web & payloads': 'text-info',
  Red: 'text-acento-bright',
  Forense: 'text-[#c084fc]',
  'Ingeniería Inversa': 'text-[#fb923c]',
  Phishing: 'text-[#38bdf8]',
  'Linux & sistema': 'text-bad',
  Análisis: 'text-ok',
  Generadores: 'text-[#f472b6]',
  Lenguajes: 'text-[#fbbf24]',
}

export interface ToolDef {
  id: string
  name: string
  short: string
  desc: string
  category: ToolCategory
  icon: LucideIcon
  ported?: boolean // portada de uno de los repos originales
  origin?: string
}

/* Subsecciones: agrupan tools dentro de una categoría en el menú lateral
   (desplegable). Las tools con subsection se muestran dentro de su grupo. */
export interface SubsectionDef {
  id: string
  category: ToolCategory
  label: string
  toolIds: string[]
}

export const SUBSECTIONS: SubsectionDef[] = [
  {
    id: 'discos-almacenamiento',
    category: 'Linux & sistema',
    label: 'Discos y almacenamiento',
    toolIds: ['diskcmds', 'fstabgen'],
  },
  {
    id: 'red-servicios-linux',
    category: 'Linux & sistema',
    label: 'Red y servicios Linux',
    toolIds: ['nftgen', 'sshharden', 'wgquick', 'sysctlgen'],
  },
  {
    id: 'permisos-privesc-linux',
    category: 'Linux & sistema',
    label: 'Permisos y privesc',
    toolIds: ['chmod', 'umaskgen', 'sudoersgen', 'systemdgen'],
  },
  {
    id: 'win-config',
    category: 'Linux & sistema',
    label: 'Configuración Windows',
    toolIds: ['winfirewall', 'schtasks', 'winharden', 'pslab', 'regtweaks', 'ntfsperm'],
  },
  {
    id: 'postex',
    category: 'Web & payloads',
    label: 'Post-explotación',
    toolIds: ['ttyupgrade', 'filexfer', 'pivotmap', 'revshells'],
  },
  {
    id: 'explotacion',
    category: 'Web & payloads',
    label: 'Explotación',
    toolIds: ['bofcalc', 'phpfilter', 'xsgen', 'xmlgen', 'payloads'],
  },
  {
    id: 'ofensiva-web',
    category: 'Web & payloads',
    label: 'Ofensiva web avanzada',
    toolIds: ['graphql', 'cmdinject', 'pathtraversal', 'nosql', 'deser', 'oauth', 'websockets', 'clickjack', 'cachepoison', 'disclosure', 'pp', 'smuggler', 'twofa', 'logic', 'jwks'],
  },
  {
    id: 'privesc-recursos',
    category: 'Análisis',
    label: 'Privesc y enumeración',
    toolIds: ['gtfobins', 'usergen', 'ports'],
  },
]

export const subsectionOf = (toolId: string): SubsectionDef | undefined =>
  SUBSECTIONS.find((s) => s.toolIds.includes(toolId))

export const TOOLS: ToolDef[] = [
  // ─── Criptografía ───────────────────────────────────────────────
  { id: 'hash', name: 'Hash Suite', short: 'Hashes', desc: 'Calcula MD5, SHA-1/256/384/512, SHA3-512, RIPEMD-160, CRC32, NTLM y HMAC con suma de archivos', category: 'Criptografía', icon: Hash },
  { id: 'cracker', name: 'Hash Cracker', short: 'Cracker', desc: 'Cracking de hashes con rockyou.txt y reglas, en un worker con estadísticas en vivo', category: 'Criptografía', icon: Unlock },
  { id: 'hashid', name: 'Identificador de Hash', short: 'HashID', desc: 'Identifica el formato de un hash y sugiere modo hashcat y formato John', category: 'Criptografía', icon: ScanSearch },
  { id: 'aes', name: 'AES & Fernet', short: 'AES', desc: 'Cifra/descifra con AES-CBC/GCM y deriva claves con PBKDF2', category: 'Criptografía', icon: Lock },
  { id: 'jwt', name: 'JWT Toolkit', short: 'JWT', desc: 'Decodifica, verifica HS*, firma tokens y muestra secrets clásicos', category: 'Criptografía', icon: FileKey },
  { id: 'totp', name: 'TOTP Generator', short: 'TOTP', desc: 'Códigos 2FA en vivo estilo Google Authenticator con QR', category: 'Criptografía', icon: Timer },
  { id: 'hackingchef', name: 'HackingChef', short: 'Chef', desc: 'Cadena codificaciones, cifrados y transformaciones en recetas con resultado en vivo', category: 'Criptografía', icon: ChefHat, ported: true, origin: 'hackingChef-page' },

  // ─── Codificación ───────────────────────────────────────────────
  { id: 'encoders', name: 'Multi-Encoders', short: 'Encoders', desc: 'Base16/32/58/62/64/85, hex, bin, octal, morse, URL, HTML, Unicode', category: 'Criptografía', icon: Binary },
  { id: 'emoji', name: 'Emoji & ZW Encoder', short: 'Emoji', desc: 'Codifica payloads en emojis y texto invisible zero-width', category: 'Criptografía', icon: Smile },
  { id: 'classics', name: 'Cifrados Clásicos', short: 'Clásicos', desc: 'César/ROT13/ROT47, Vigenère, Atbash, XOR y criptoanálisis automático', category: 'Criptografía', icon: ArrowLeftRight },

  // ─── Contraseñas ────────────────────────────────────────────────
  { id: 'passgen', name: 'Generador de Contraseñas', short: 'PassGen', desc: 'Contraseñas, frases y PINs criptográficamente seguros con análisis de fortaleza', category: 'Contraseñas', icon: KeyRound },
  { id: 'passaudit', name: 'Auditor de Contraseñas', short: 'PassAudit', desc: 'Fortaleza zxcvbn, tiempo de crackeo y filtraciones vía k-anonymity', category: 'Contraseñas', icon: ShieldCheck },
  { id: 'passforge', name: 'Passphrase Forge', short: 'PassForge', desc: 'Passphrases Diceware con WebCrypto, tiempos de crackeo por adversario y lote de candidatas listas para el gestor', category: 'Contraseñas', icon: Puzzle },
  { id: 'maskgen', name: 'Mask Gen', short: 'MaskGen', desc: 'Máscaras hashcat con keyspace exacto, muestras en vivo y avisos de patrones débiles para dirigir la fuerza bruta', category: 'Contraseñas', icon: TimerReset },
  { id: 'policyaudit', name: 'Password Policy Auditor', short: 'PolicyAudit', desc: 'Audita tu política contra NIST 800-63B con veredicto puntuado y genera pwquality.conf y la PSO de Windows coherentes', category: 'Contraseñas', icon: ShieldHalf },

  // ─── Web & payloads ─────────────────────────────────────────────
  { id: 'revshells', name: 'Reverse Shells', short: 'RevShells', desc: 'Generador de reverse shells multiplataforma con IP/puerto y listeners', category: 'Web & payloads', icon: TerminalSquare, ported: true, origin: 'revShellsGenerator-page' },
  { id: 'phpdetector', name: 'PHP Security Scanner', short: 'PHPScan', desc: 'Detecta funciones PHP peligrosas y analiza disable_functions', category: 'Web & payloads', icon: FileCode, ported: true, origin: 'PHPDetector-page' },
  { id: 'sqlgen', name: 'SQL & CSV Generator', short: 'SQLGen', desc: 'Genera CREATE/INSERT, CSV de datos fake y diagramas ER en Mermaid', category: 'Web & payloads', icon: Database, ported: true, origin: 'sql-generator' },
  { id: 'payloads', name: 'Payload Arsenal', short: 'Arsenal', desc: 'SQLi por motor, XSS evasión, SSRF, LFI y listas de fuzzing listas para copiar', category: 'Web & payloads', icon: Bug },
  { id: 'httpheader', name: 'HTTP Request Builder', short: 'ReqBuilder', desc: 'Construye peticiones HTTP crudas con auth, cookies y body, y copia el curl', category: 'Web & payloads', icon: Braces },
  { id: 'webfuzzer', name: 'Web Fuzzer', short: 'Fuzzer', desc: 'Fuzzing concurrente de rutas/parámetros con comparación de respuestas', category: 'Web & payloads', icon: Radar },

  // ─── Red ────────────────────────────────────────────────────────
  { id: 'dns', name: 'DNS Lookup (DoH)', short: 'DNS', desc: 'Registros A/AAAA/MX/NS/TXT/CAA/SOA vía DNS-over-HTTPS con análisis SPF/DKIM/DMARC', category: 'Red', icon: Globe },
  { id: 'ipinfo', name: 'IP Info & GeoIP', short: 'IP Info', desc: 'Geolocalización, ASN, ISP y tipo de red de cualquier IP o dominio', category: 'Red', icon: Globe2 },
  { id: 'httpinspector', name: 'HTTP Inspector', short: 'HTTP Info', desc: 'Auditoría de cabeceras HTTP y cabeceras de seguridad de cualquier URL', category: 'Red', icon: Activity },
  { id: 'pingtool', name: 'Ping & Traceroute web', short: 'Ping', desc: 'Mide latencia HTTP desde el navegador con estadísticas y gráfica', category: 'Red', icon: Activity },
  { id: 'subnetting', name: 'Subnetting Calculator', short: 'Subnetting', desc: 'IPv4/CIDR completa con binarios, clase y tabla de referencia', category: 'Red', icon: Split, ported: true, origin: 'calculadora_subnetting' },
  { id: 'vlsm', name: 'Calculadora VLSM', short: 'VLSM', desc: 'Segmenta una red en subredes por hosts con binarios y clase', category: 'Red', icon: Calculator, ported: true, origin: 'calculadora_vlsm' },
  { id: 'ipv4', name: 'IPv4 Generator', short: 'IPv4 Gen', desc: 'Genera direcciones IPv4 aleatorias criptográficas por tipo con análisis de subred completo', category: 'Red', icon: Network },
  { id: 'ipv6', name: 'IPv6 Toolkit', short: 'IPv6', desc: 'Expande/comprime, tipo de dirección, prefijos, EUI-64, generador de MACs y reverse DNS', category: 'Red', icon: Wifi },
  { id: 'curlbuilder', name: 'Curl Builder', short: 'Curl', desc: 'Construye comandos curl con headers, auth, body y proxy', category: 'Red', icon: Server },
  { id: 'wifimap', name: 'WiFi Map', short: 'WiFi Map', desc: 'Mapa con la base de datos real de WiGLE (más de 1.000M de redes observadas por la comunidad): BSSID, canal, cifrado y última vez vista — con tus credenciales guardadas solo en tu navegador', category: 'Red', icon: Wifi },

  // ─── Forense ────────────────────────────────────────────────────
  { id: 'pcap', name: 'PCAP Analyzer', short: 'PCAP', desc: 'Analiza capturas pcap/pcapng: protocolos, top talkers, DNS/HTTP y alertas', category: 'Forense', icon: Waves },
  { id: 'fileanalyzer', name: 'File Analyzer', short: 'File', desc: 'Magic bytes, entropía, strings y hashes de cualquier archivo', category: 'Forense', icon: FileSearch },
  { id: 'exif', name: 'EXIF & Metadatos', short: 'EXIF', desc: 'Extrae metadatos GPS, cámara y software de imágenes, HEIC, PDFs y más', category: 'Forense', icon: Camera },
  { id: 'stego', name: 'Esteganografía LSB', short: 'Stego', desc: 'Oculta y extrae mensajes en el canal LSB de imágenes PNG', category: 'Forense', icon: EyeOff },
  { id: 'logparser', name: 'Log Forensics', short: 'Logs', desc: 'Analiza auth.log/syslog y EVTX-XML: fuerza bruta, logins, sudo, eventos sospechosos y timeline', category: 'Forense', icon: ScrollText },
  { id: 'filecarver', name: 'File Carver', short: 'Carver', desc: 'Recupera imágenes, PDFs y ZIP embebidos en dumps escaneando magic bytes, con preview y SHA-256', category: 'Forense', icon: Scissors },

  // ─── Ingeniería Inversa ────────────────────────────────────────
  { id: 'bininspect', name: 'Binary Inspector', short: 'BinInspect', desc: 'Parsea PE/ELF: headers, secciones con entropía, imports/exports y detección de packers sin ejecutar nada', category: 'Ingeniería Inversa', icon: Cpu },
  { id: 'deobfuscate', name: 'Deobfuscator', short: 'Deobf', desc: 'Descodifica capas automáticamente (base64/hex/URL/escapes), crackea XOR y mide ofuscación JS', category: 'Ingeniería Inversa', icon: Wand2 },

  // ─── Phishing ───────────────────────────────────────────────────
  { id: 'mailheader', name: 'Email Header Analyzer', short: 'MailHdr', desc: 'Parsea cabeceras: cadena Received, SPF/DKIM/DMARC, Return-Path vs From y puntuación de spoofing', category: 'Phishing', icon: MailWarning },
  { id: 'urlphish', name: 'URL Phishing Inspector', short: 'URLPhish', desc: 'Desmonta URLs: punycode/homoglyphs, typosquatting, acortadores, credenciales incrustadas y risk score', category: 'Phishing', icon: Link2 },
  { id: 'phishpage', name: 'Awareness Campaign Builder', short: 'Awareness', desc: 'Plantillas de email y landings de entrenamiento anti-phishing con QR (quishing) y disclaimers éticos', category: 'Phishing', icon: Fish },
  { id: 'quishing', name: 'Quishing Lab', short: 'Quishing', desc: 'QR phishing educativo: plantillas de escenarios reales, estilos de QR legítimos y lecciones para entrenar el ojo del equipo', category: 'Phishing', icon: Captions },
  { id: 'shorteneraudit', name: 'Shortener Audit', short: 'Shorteners', desc: 'Expande acortadores en vivo y descompone URLs con detección de credenciales, punycode, typosquatting y redirects abiertos', category: 'Phishing', icon: AudioLines },
  { id: 'phishmtm', name: 'Phishing MITM Anatomy', short: 'MITMPhish', desc: 'Anatomía del phishing con proxy inverso (Evilginx-style): por qué roba sesiones con 2FA activo y qué capas lo rompen', category: 'Phishing', icon: KeySquareAlias },

  // ─── Linux & sistema ────────────────────────────────────────────
  { id: 'chmod', name: 'Calculadora CHMOD', short: 'CHMOD', desc: 'Permisos Linux en octal/simbólico con SUID, SGID y Sticky Bit', category: 'Linux & sistema', icon: Crown, ported: true, origin: 'chmod-calculator' },
  { id: 'cheatsheets', name: 'Linux/Windows Cheatsheets', short: 'Cheats', desc: 'Comandos de red, sistema y privesc con equivalencias Linux↔Windows', category: 'Linux & sistema', icon: ScrollText },
  { id: 'umaskgen', name: 'Generador Umask', short: 'Umask', desc: 'Calcula los permisos reales que produce cada umask con presets y veredicto de seguridad', category: 'Linux & sistema', icon: FileLock2 },
  { id: 'sudoersgen', name: 'Generador Sudoers', desc: 'Construye reglas de sudoers.d correctas y detecta GTFOBins, wildcards y NOPASSWD peligrosos', short: 'Sudoers', category: 'Linux & sistema', icon: UserCog },
  { id: 'systemdgen', name: 'Generador systemd', desc: 'Units de service con hardening, timer con OnCalendar y mount listos para desplegar', short: 'systemd', category: 'Linux & sistema', icon: Cog },
  { id: 'ntfsperm', name: 'Permisos NTFS (icacls)', desc: 'Generador de comandos icacls con ACEs, herencia y equivalencias chmod ↔ icacls', short: 'NTFS', category: 'Linux & sistema', icon: FolderLock },
  { id: 'fstabgen', name: 'Fstab Builder', desc: 'Construye /etc/fstab con presets por escenario y avisos de privesc (suid noexec), contraseñas inline y flags rotos', short: 'fstab', category: 'Linux & sistema', icon: HardDrive },
  { id: 'sysctlgen', name: 'Sysctl Hardening', desc: 'Catálogo explicado de claves del kernel con perfiles servidor/desktop/docker y conf listo para /etc/sysctl.d', short: 'sysctl', category: 'Linux & sistema', icon: Gauge },
  { id: 'sshharden', name: 'SSH Hardening', desc: 'sshd_config endurecido con explicación de cada directiva: solo claves, cifrados AEAD, límites y sin forwarding', short: 'SSH', category: 'Linux & sistema', icon: KeySquare },
  { id: 'nftgen', name: 'NFTables Builder', desc: 'Rulesets nft con policy drop, established/related, rate limit SSH y reglas por servicio explicadas', short: 'nft', category: 'Linux & sistema', icon: BrickWall },
  { id: 'wgquick', name: 'WireGuard Config', desc: 'Túnel completo: servidor + peers con claves, AllowedIPs explicado, MTU, NAT y firewall para salida a internet', short: 'WireGuard', category: 'Linux & sistema', icon: Waypoints },
  { id: 'winfirewall', name: 'Firewall Windows', desc: 'Reglas netsh advfirewall con mínimo privilegio, presets seguros y detección de puertos de administración abiertos', short: 'FW Win', category: 'Linux & sistema', icon: ShieldCheck },
  { id: 'schtasks', name: 'Windows Scheduled Tasks', desc: 'Crea tareas programadas con schtasks y PowerShell y aprende a detectarlas como persistencia (MITRE T1053.005)', short: 'Tasks', category: 'Linux & sistema', icon: Clock },
  { id: 'winharden', name: 'Windows Hardening', desc: 'Auditoría de endurecimiento con justificación, comando de aplicación, verificación y reversión al estilo CIS', short: 'Harden', category: 'Linux & sistema', icon: Shield },
  { id: 'pslab', name: 'PowerShell Lab', desc: 'Recetario de one-liners de administración, red, disco, registro y blue team con la trampa de cada uno explicada', short: 'PS Lab', category: 'Linux & sistema', icon: FileTerminal },
  { id: 'regtweaks', name: 'Windows Registry Tweaks', desc: 'Tweaks de telemetría, privacidad y hardening con ruta exacta, valor, reversión y export a .reg listo para fusionar', short: 'Regedit', category: 'Linux & sistema', icon: MonitorCog },
  { id: 'diskcmds', name: 'Disk & LVM Commander', desc: 'Formador de comandos de discos paso a paso: LVM (volúmenes físicos y lógicos), RAID mdadm, LUKS, dd y swap con porqués y avisos de peligro', short: 'Discos/LVM', category: 'Linux & sistema', icon: HardDrive },

  // ─── Análisis ───────────────────────────────────────────────────
  { id: 'cvelookup', name: 'CVE Lookup', short: 'CVE', desc: 'Consulta CVEs en la NVD con CVSS, descripción y referencias', category: 'Análisis', icon: ShieldAlert },
  { id: 'cvss', name: 'Calculadora CVSS 3.1', short: 'CVSS', desc: 'Puntuación base CVSS 3.1 con vector y severidad estética', category: 'Análisis', icon: Brain },
  { id: 'cronguru', name: 'Cron Guru', short: 'Cron', desc: 'Explica expresiones cron y calcula las próximas ejecuciones', category: 'Análisis', icon: CalendarClock },
  { id: 'regex', name: 'Regex Lab', short: 'Regex', desc: 'Prueba expresiones regulares con grupos, matches y flags', category: 'Análisis', icon: Regex },
  { id: 'defanger', name: 'Defanger / Refanger', short: 'Defang', desc: 'Defangea o refangea IPs, dominios y URLs para reportes', category: 'Análisis', icon: Ban },
  { id: 'uuid', name: 'UUID & IDs', short: 'UUID', desc: 'Genera UUID v4, NanoID y ObjectIds con validación', category: 'Análisis', icon: Radio },
  { id: 'mitre', name: 'MITRE ATT&CK Navigator', short: 'ATT&CK', desc: 'Matriz enterprise filtrable con cobertura de técnicas y export de capa JSON para el Navigator oficial', category: 'Análisis', icon: Crosshair },
  { id: 'winlog', name: 'Windows Event IDs', desc: 'Significado y detección de los eventos clave del log Security/System para forense y blue team', short: 'Events', category: 'Análisis', icon: FileWarning },
  { id: 'ports', name: 'Ports & Services', desc: 'Referencia de puertos con ángulo de pentest y filtro por grupo (web, AD, bases de datos…)', short: 'Ports', category: 'Análisis', icon: Plug },
  { id: 'iocextract', name: 'IOC Extractor', desc: 'Extrae IPs, dominios, hashes, CVEs, wallets y técnicas MITRE de cualquier texto con contexto y enlaces de análisis', short: 'IOCs', category: 'Análisis', icon: Crosshair },
  { id: 'loganonymize', name: 'Log Anonymizer', desc: 'Pseudonimiza IPs, usuarios y dominios de forma consistente y reversible para compartir logs sin exponer nada', short: 'AnonLogs', category: 'Análisis', icon: EyeOff },
  { id: 'userosint', name: 'Username OSINT', desc: 'Investiga un alias: plataformas donde existe, patrón que sigue, variantes y dorks listos para Google y GitHub', short: 'OSINT', category: 'Análisis', icon: UserSearch },
  { id: 'emailosint', name: 'Email OSINT', short: 'EmailOSINT', desc: 'Huellas de un email: Gravatar (perfil+avatar), filtraciones vía XposedOrNot, commits de GitHub firmados con esa dirección y dorks listos', category: 'Análisis', icon: AtSignAlias },
  { id: 'phonevalidator', name: 'Phone Validator & OSINT', short: 'Phone', desc: 'Valida números contra el plan E.164 de ~45 países: país, móvil/fijo, región, operador histórico, fakes, IMEI y verificación de actividad', category: 'Análisis', icon: PhoneCall },
  { id: 'sysmonbuilder', name: 'Sysmon Config Builder', desc: 'Configuración XML de Sysmon con perfiles y guía ofensiva/defensiva de cada evento: el punto de partida de todo SOC', short: 'Sysmon', category: 'Análisis', icon: FileCog },

  // ─── Generadores ────────────────────────────────────────────────
  { id: 'qr', name: 'QR Generator', short: 'QR', desc: 'Códigos QR con presets WiFi, vCard, email, SMS y geo; descarga PNG/SVG en local', category: 'Generadores', icon: QrCode },
  { id: 'lipsum', name: 'Lorem Ipsum Generator', short: 'Lipsum', desc: 'Texto de relleno por párrafos, frases o palabras con modo hacker y salida MD/HTML/JSON', category: 'Generadores', icon: TypeOutline },
  { id: 'dorkgen', name: 'Dork Arsenal', desc: 'Dorks de Google, Bing, GitHub, Shodan y Censys con sustitución de objetivo y enlace directo al motor', short: 'Dorks', category: 'Generadores', icon: Search },
  { id: 'wordlistgen', name: 'Wordlist Builder', desc: 'Wordlists dirigidas desde datos del objetivo con las mutaciones que la gente realmente usa: más efectiva que rockyou', short: 'Wordlists', category: 'Generadores', icon: ListPlus },
  { id: 'pwpolicy', name: 'Password Policy Builder', desc: 'Políticas coherentes Linux/Windows según NIST 800-63B: longitud sobre complejidad, sin rotación suicida, con bloqueo', short: 'Policy', category: 'Contraseñas', icon: ClipboardList },
  { id: 'pentestreport', name: 'Pentest Report Builder', desc: 'Estructura hallazgos con severidad, evidencia, impacto y remediación y exporta un informe Markdown profesional', short: 'Report', category: 'Generadores', icon: FileText },
  { id: 'cheatgen', name: 'Chuleta Generator', desc: 'Compón chuletas personalizadas de vim, tmux, find/grep, bash, red y git en TXT o Markdown listas para imprimir', short: 'Chuletas', category: 'Generadores', icon: ScrollText },
  { id: 'aliases', name: 'Shell Alias Pack', desc: 'Pack de alias y funciones de calidad de vida y seguridad para bash/zsh con la explicación de qué hábito corrige cada uno', short: 'Alias', category: 'Generadores', icon: Sparkles },
  { id: 'crontalk', name: 'Cron Translator', desc: 'Explica expresiones cron en cristiano, señala patrones sospechosos y las convierte a systemd OnCalendar', short: 'CronTalk', category: 'Generadores', icon: CalendarClock },
  { id: 'confdiff', name: 'Config Diff', desc: 'Diff semántico de ficheros de configuración: ignora comentarios y orden, resalta directivas de seguridad que cambiaron', short: 'ConfDiff', category: 'Análisis', icon: FileDiff },
  { id: 'gtfobins', name: 'GTFOBins Explorer', desc: 'Base de datos COMPLETA de GTFOBins: 458 binarios UNIX con todos sus comandos de abuso por contexto (sudo, SUID, capabilities)', short: 'GTFOBins', category: 'Análisis', icon: Swords },
  { id: 'usergen', name: 'Usuario Generator', desc: 'Variaciones de usernames y emails corporativos con 9 convenciones y service accounts para enumeración y spraying', short: 'Users', category: 'Análisis', icon: Users },
  { id: 'acronyms', name: 'Diccionario de Acrónimos', desc: '196 acrónimos de ciberseguridad con definición en español organizados por dominio: de APT a YARA', short: 'Acrónimos', category: 'Análisis', icon: BookMarked },
  { id: 'chronolog', name: 'Chronolog', desc: 'Timeline de tu engagement con fases, TTE (time-to-exploit), huecos sin documentar y export Markdown/CSV del writeup', short: 'Chronolog', category: 'Generadores', icon: History },
  // ─── Lenguajes (chuleta + playground con ejecución real) ───────────
  { id: 'langpython', name: 'CheatSheet Python 3', desc: 'Chuleta de Python con playground: ejecuta de verdad (WASM local), 6 secciones de sintaxis, data structures y seguridad', short: 'Python', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langjavascript', name: 'CheatSheet JavaScript', desc: 'Chuleta de JS con playground en tu navegador: DOM, fetch, clases, XSS conceptual y moderno ES2023+', short: 'JavaScript', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langtypescript', name: 'CheatSheet TypeScript', desc: 'Chuleta de TS con ejecución real: tipos, narrowing, genéricos y utility types compilados de verdad', short: 'TypeScript', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langjava', name: 'CheatSheet Java', desc: 'Chuleta de Java con OpenJDK real: colecciones, streams, excepciones y superficie de ataque (deserialización, JNDI)', short: 'Java', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langcsharp', name: 'CheatSheet C#', desc: 'Chuleta de C# con Mono real: LINQ, nullables y por qué el ecosistema .NET domina la post-explotación Windows', short: 'C#', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langc', name: 'CheatSheet C', desc: 'Chuleta de C con gcc real: punteros, memoria y las funciones inseguras detrás de cada buffer overflow', short: 'C', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langcpp', name: 'CheatSheet C++', desc: 'Chuleta de C++ con g++ real: RAII, smart pointers, STL y templates', short: 'C++', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langphp', name: 'CheatSheet PHP', desc: 'Chuleta de PHP 8 real: arrays, super globales, LFI/SQLi clásicos y prepared statements', short: 'PHP', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langruby', name: 'CheatSheet Ruby', desc: 'Chuleta de Ruby real: bloques, símbolos, structs y la anatomía de un módulo de Metasploit', short: 'Ruby', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langgo', name: 'CheatSheet Go', desc: 'Chuleta de Go real: structs, goroutines, channels y por qué las tools ofensivas modernas son Go', short: 'Go', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langrust', name: 'CheatSheet Rust', desc: 'Chuleta de Rust real: ownership, borrowing, match, Result y Option', short: 'Rust', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langlua', name: 'CheatSheet Lua', desc: 'Chuleta de Lua real: tables, metatables y scripting NSE de Nmap', short: 'Lua', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langbash', name: 'CheatSheet Bash', desc: 'Chuleta de Bash real: variables, pipes, conditions y one-liners de seguridad ejecutándose de verdad', short: 'Bash', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langsql', name: 'CheatSheet SQL', desc: 'Chuleta de SQL sobre SQLite real: JOINs, agregación y la inyección SQL explicada ejecutándola', short: 'SQL', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langhtml', name: 'CheatSheet HTML', desc: 'Chuleta de HTML con vista previa en vivo: formularios, semántica y anatomía del phishing', short: 'HTML', category: 'Lenguajes', icon: FileCode2 },
  { id: 'langcss', name: 'CheatSheet CSS', desc: 'Chuleta de CSS con vista previa en vivo: flexbox, grid, animaciones y CSS exfiltration', short: 'CSS', category: 'Lenguajes', icon: FileCode2 },
  { id: 'xsgen', name: 'XSS Payload Generator', desc: '26 payloads clasificados por vector y contexto (HTML, atributo, JS, URL) con encoding y guía de caza de inyecciones', short: 'XSS', category: 'Web & payloads', icon: Bug },
  { id: 'xmlgen', name: 'XML & XXE Arsenal', desc: 'Plantillas XXE directo, OOB con evil.dtd, vía error, XInclude y XSLT hasta RCE con detección de parsers', short: 'XXE', category: 'Web & payloads', icon: FileCode2 },
  { id: 'phpfilter', name: 'PHP Filter Chain', desc: 'LFI a RCE sin subir ficheros: cadenas php://filter con iconv que sintetizan tu código (algoritmo Synacktiv)', short: 'PHPFilter', category: 'Web & payloads', icon: Filter },
  { id: 'bofcalc', name: 'Buffer Overflow Calc', desc: 'Patrón cíclico estilo Metasploit, offset desde EIP, badchars y payload con NOP sled + shellcode + retorno', short: 'BOF', category: 'Web & payloads', icon: Binary },
  { id: 'pivotmap', name: 'Pivoting Map', desc: 'Mapa interactivo de pivoting: arrastra nodos, enlázalos por protocolo (ssh/chisel/ligolo/socat/plink/sshuttle), valida el grafo y genera los comandos exactos por tramo', short: 'Pivoting', category: 'Red', icon: Route },
  { id: 'netcalc', name: 'Network Admin Calc', desc: '7 calculadoras de red: TTL→SO, MTU/MSS, wildcards ACL Cisco, plan de VLANs, ToS/DSCP, transferencias y CIDR', short: 'NetCalc', category: 'Red', icon: Calculator },
  { id: 'ttyupgrade', name: 'TTY Upgrade', desc: 'De reverse shell tonta a terminal interactiva: python pty, script, socat, rlwrap con pasos y troubleshooting', short: 'TTY', category: 'Web & payloads', icon: MonitorPlay },
  { id: 'filexfer', name: 'File Transfer Arsenal', desc: '14 métodos de transferencia atacante↔víctima con comandos exactos: HTTP, nc, scp, certutil, PowerShell, SMB…', short: 'Transfer', category: 'Web & payloads', icon: FileInput },

  // ─── Traductor de lenguajes ─────────────────────────────────────
  { id: 'langtrans', name: 'Language Translator', desc: 'Traduce código entre Python, JS, TS, Java, C#, Go, Ruby y PHP con análisis del subconjunto común y % de confianza honesto', short: 'Trans', category: 'Lenguajes', icon: Languages },

  // ─── Forges de scripting ────────────────────────────────────────
  { id: 'bashforge', name: 'Bash Script Forge', desc: 'Compón scripts Bash por bloques con modo estricto, argumentos, bucles, checks de red y logging coloreado — cada pieza explicada', short: 'BashForge', category: 'Linux & sistema', icon: Terminal },
  { id: 'psforge', name: 'PowerShell Forge', desc: 'Compón scripts PowerShell por bloques: strict mode, params, try/catch, transcripción y checks de red — cada pieza explicada', short: 'PSForge', category: 'Linux & sistema', icon: SquareTerminal },

  // ─── Redes: diseño y doc técnica ───────────────────────────────
  { id: 'netsim', name: 'Network Topology Designer', desc: 'Diseña topologías arrastrando nodos, enlázalos por medio (ethernet/fibra/wifi/vpn), analiza huérfanos y BOM, y exporta PNG/JSON', short: 'NetSim', category: 'Red', icon: Network },
  { id: 'cabledocs', name: 'Cable Docs Animadas', desc: 'Pinout RJ45 T568A/B animado, categorías Cat5e–Cat8, tipos de cable con trampas, fibra y conectores LC/SC/ST/MPO explicados', short: 'Cables', category: 'Red', icon: Cable },
  { id: 'speedtest', name: 'Internet Speed Test', desc: 'Test de latencia, jitter, descarga y subida con velocímetro animado contra speed.cloudflare.com — interpretación guiada', short: 'Speed', category: 'Red', icon: Gauge },

  // ─── Salud del equipo ──────────────────────────────────────────
  { id: 'healthcheck', name: 'Team Health Check', desc: 'Escaneo real de tu equipo (CPU, RAM, batería, red, GPU) con benchmark, desgaste estimado por antigüedad y plan de mantenimiento', short: 'Health', category: 'Análisis', icon: HeartPulse },

  // ─── NFC / RFID ────────────────────────────────────────────────
  { id: 'nfclab', name: 'NFC / RFID Lab', desc: 'Laboratorio educativo de tarjetas de proximidad: familias de chips, UIDs y dumps simulados, Wiegand 26, modulaciones y ataques con su defensa', short: 'NFC', category: 'Ingeniería Inversa', icon: Nfc },

  // ─── DuckyScript ───────────────────────────────────────────────
  { id: 'duckyforge', name: 'DuckyScript Builder', desc: 'Compón payloads badUSB por bloques para Rubber Ducky y Flipper Zero con presets didácticos, compatibilidad por objetivo y avisos éticos', short: 'Ducky', category: 'Web & payloads', icon: Keyboard },

  // ─── Ronda 12: análisis avanzado e ingeniería inversa ───────────
  { id: 'redos', name: 'Regex ReDOS Analyzer', desc: 'Detecta backtracking catastrófico en regex: análisis estructural + medición real del matching en worker con entradas crecientes', short: 'ReDOS', category: 'Análisis', icon: Hourglass },
  { id: 'wifilter', name: 'Wireshark Display Filters', desc: 'Constructor visual de display filters: catálogo por protocolo, presets de caza (escaneos, exfil DNS, credenciales) y validación en vivo', short: 'WiFilter', category: 'Red', icon: Filter },
  { id: 'malwaretime', name: 'Payload Time Machine', desc: 'Museo interactivo del malware: 35 años de ataques con su impacto, técnicas MITRE que popularizó y la lección de defensa que dejó', short: 'TimeMachine', category: 'Análisis', icon: History },

  // ─── Ronda 12: cripto y PKI ────────────────────────────────────
  { id: 'hashvisual', name: 'Hash Visual Fingerprint', desc: 'Convierte cualquier hash en un identicon determinista y compara dos de un vistazo: certificados, binarios o claves sin leer hex', short: 'Identicon', category: 'Criptografía', icon: LayoutGrid },
  { id: 'x509', name: 'X.509 Decoder', desc: 'Pega un PEM y desglosa SAN, EKU, keyUsage, BasicConstraints y flags de sospecha: CA:TRUE inesperada, SHA1, wildcards y auto-firmados', short: 'X509', category: 'Criptografía', icon: BadgeCheck },

  // ─── Ronda 12: ingeniería inversa de binarios y firmware ───────
  { id: 'bytecode', name: 'Bytecode Inspector', desc: 'Descompilador didáctico: parsea .class de Java real (constant pool, fields, methods) y cabecera de .pyc, con strings sospechosos', short: 'Bytecode', category: 'Ingeniería Inversa', icon: Binary },
  { id: 'firmware', name: 'Firmware Inspector', desc: 'Parsea imágenes ESP8266/ESP32 (header, segmentos, app description) e Intel HEX de Arduino, y extrae strings sospechosos del binario', short: 'Firmware', category: 'Ingeniería Inversa', icon: Microchip },

  // ─── Ronda 12: hardware y radio ────────────────────────────────
  { id: 'blegatt', name: 'BLE GATT Explorer', desc: 'Servicios y characteristics Bluetooth Low Energy con su riesgo real, conversor UUID 16↔128 y decodificador de advertising', short: 'BLE', category: 'Red', icon: Bluetooth },
  { id: 'stegoaudio', name: 'Stego Audio', desc: 'Esteganografía LSB sobre WAV/PCM real: incrusta y extrae mensajes, con waveform y espectrograma calculados por FFT propia', short: 'StegoWAV', category: 'Forense', icon: Waves },

  // ─── Ronda 12: ofensiva con detección ─────────────────────────
  { id: 'cronapt', name: 'Cron/AT Persistence Lab', desc: 'Simulador de persistencia T1053 para tu lab: genera la tarea, su rollback y las detecciones que la cazan (Sigma, YARA, hunting)', short: 'CronAPT', category: 'Linux & sistema', icon: AlarmClock },

  // ─── Ronda 14: ofensiva web avanzada ──────────────────────────
  { id: 'graphql', name: 'GraphQL Lab', desc: 'Builder de operaciones con plantillas de ataque (introspección, IDOR, SQLi/NoSQLi, alias storm, DoS), traductor query ↔ JSON para POST y trucos de batching', short: 'GraphQL', category: 'Web & payloads', icon: Braces },
  { id: 'cmdinject', name: 'Command Injection Forge', desc: 'Payloads de inyección de comandos por SO y objetivo: ejecución visible, ciego time-based, OOB por DNS, lectura de ficheros y reverse shells de lab con su detección', short: 'CmdInj', category: 'Web & payloads', icon: Terminal },
  { id: 'pathtraversal', name: 'Path Traversal Forge', desc: 'Traversals por SO, profundidad y codificación (url, double, overlong, mixto): targets valiosos, contextos (upload, zip slip, proxy) y qué te dice cada respuesta', short: 'Traversal', category: 'Web & payloads', icon: FolderInput },
  { id: 'nosql', name: 'NoSQL Injection Forge', desc: 'Operadores Mongo ($ne, $gt, $regex, $where) y array smuggling urlencoded en JSON y URL listos para lanzar, con el criterio de confirmación de cada uno', short: 'NoSQL', category: 'Web & payloads', icon: Database },
  { id: 'deser', name: 'Deserialization Arsenal', desc: 'Deserialización insegura por lenguaje (PHP, pickle, Java, .NET ViewState, Node) con gadgets, magic bytes para detectar el formato y sondas OOB', short: 'Deser', category: 'Web & payloads', icon: PackageOpen },
  { id: 'oauth', name: 'OAuth 2.0 / OIDC Lab', desc: 'Generador de flujos con PKCE real (WebCrypto), desglose de parámetros, parser del callback con token exchange y 7 ataques: state, redirect_uri, mix-up, scopes', short: 'OAuth', category: 'Web & payloads', icon: KeyRound },
  { id: 'websockets', name: 'WebSocket Attack Lab', desc: 'Decodificador de frames RFC 6455 bit a bit con demo de máscara, generador de cliente/CSWSH y matriz de ataques: hijacking, manipulación, DoS', short: 'WS', category: 'Web & payloads', icon: PlugZap },
  { id: 'clickjack', name: 'Clickjacking Forge', desc: 'PoC de clickjacking con preview en vivo: iframe invisible alineado por offsets y opacidad, 6 variantes del ataque y cómo auditar la defensa', short: 'Clickjack', category: 'Web & payloads', icon: MousePointerClick },
  { id: 'cachepoison', name: 'Cache Poisoning & Deception', desc: 'Envenena la caché (headers sin clave, fat GET, header hiding) y engáñala para que guarde datos autenticados: técnicas con curl, rutas y metodología', short: 'Cache', category: 'Web & payloads', icon: Ghost },
  { id: 'disclosure', name: 'Information Disclosure Hunter', desc: '12 vectores de fuga (.git, .env, actuator, source maps, CORS, buckets) priorizados por impacto con script de reconocimiento automático', short: 'Disclosure', category: 'Web & payloads', icon: Eye },
  { id: 'pp', name: 'Prototype Pollution Lab', desc: 'Sondas por vector (query, JSON, constructor) y sinks que convierten la polución en XSS o RCE: NODE_OPTIONS, innerHTML, bypass de filtros', short: 'Proto', category: 'Web & payloads', icon: Variable },
  { id: 'smuggler', name: 'HTTP Request Smuggler', desc: 'Peticiones desincronizadas CL.TE/TE.CL/TE.TE byte a byte con quién interpreta qué, loop de detección y objetivos: probe, captura de cabeceras, rutas internas', short: 'Smuggler', category: 'Web & payloads', icon: Boxes },
  { id: 'twofa', name: '2FA / OTP Lab', desc: 'TOTP vivo con QR para tu laboratorio, recovery codes con entropía real, 8 debilidades del segundo factor con su prueba y brute force single-packet', short: '2FA', category: 'Web & payloads', icon: Smartphone },
  { id: 'logic', name: 'Business Logic Hunter', desc: '8 patrones de lógica de negocio con su prueba (precios negativos, races, saltos de flujo, reembolsos) y checklist de hunting por dominio', short: 'Logic', category: 'Web & payloads', icon: Scale },
  { id: 'jwks', name: 'JWK Set Inspector', desc: 'Analiza la postura de un JWKS: kty/alg/use, longitud RSA, curvas EC, claves privadas filtradas, RSA1_5 roto, rotación dormida y hunting por kid', short: 'JWKS', category: 'Web & payloads', icon: Lock },

  // ─── Ronda 13: hacking WiFi ────────────────────────────────────
  { id: 'wifilab', name: 'WiFi Attack Lab', desc: 'Los 7 pasos de una auditoría 802.11 en tu laboratorio: comandos con placeholders personalizables, qué esperar en cada salida, la trampa típica y cómo se detecta cada acción', short: 'WiFiLab', category: 'Red', icon: RadioTower },
  { id: 'wifi80211', name: 'Decodificador 802.11', desc: 'Pega un frame en hex y desglosa la cabecera MAC bit a bit: flags, direcciones según toDS/fromDS, seq/frag e Information Elements con el RSN completo (WPA2/WPA3/PMF)', short: '802.11', category: 'Red', icon: Antenna },
  { id: 'wifiplanner', name: 'WiFi Channel Planner', desc: 'Planifica canales 2.4/5/6 GHz con el solapamiento real del espectro: mapa de congestión con tus APs vecinos, mejores canales, grupos de 80 MHz con avisos DFS y PSC de 6 GHz', short: 'ChPlanner', category: 'Red', icon: Radar },
  { id: 'wifiaudit', name: 'WiFi Security Auditor', desc: 'Puntúa tu red sobre 100 (cifrado, PMF, passphrase, WPS, admin) con hardening priorizado por esfuerzo y matriz de amenazas: evil twin, karma, deauth, KRACK, Dragonblood', short: 'Auditor', category: 'Red', icon: ScanLine },
]

export const CATEGORIES: ToolCategory[] = [
  'Criptografía',
  'Contraseñas',
  'Web & payloads',
  'Red',
  'Forense',
  'Ingeniería Inversa',
  'Phishing',
  'Linux & sistema',
  'Análisis',
  'Generadores',
  'Lenguajes',
]

export const toolsByCategory = (cat: ToolCategory): ToolDef[] => TOOLS.filter((t) => t.category === cat)

export const findTool = (id: string): ToolDef | undefined => TOOLS.find((t) => t.id === id)