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
  { id: 'sysmonbuilder', name: 'Sysmon Config Builder', desc: 'Configuración XML de Sysmon con perfiles y guía ofensiva/defensiva de cada evento: el punto de partida de todo SOC', short: 'Sysmon', category: 'Análisis', icon: FileCog },

  // ─── Generadores ────────────────────────────────────────────────
  { id: 'qr', name: 'QR Generator', short: 'QR', desc: 'Códigos QR con presets WiFi, vCard, email, SMS y geo; descarga PNG/SVG en local', category: 'Generadores', icon: QrCode },
  { id: 'lipsum', name: 'Lorem Ipsum Generator', short: 'Lipsum', desc: 'Texto de relleno por párrafos, frases o palabras con modo hacker y salida MD/HTML/JSON', category: 'Generadores', icon: TypeOutline },
  { id: 'dorkgen', name: 'Dork Arsenal', desc: 'Dorks de Google, Bing, GitHub, Shodan y Censys con sustitución de objetivo y enlace directo al motor', short: 'Dorks', category: 'Generadores', icon: Search },
  { id: 'wordlistgen', name: 'Wordlist Builder', desc: 'Wordlists dirigidas desde datos del objetivo con las mutaciones que la gente realmente usa: más efectiva que rockyou', short: 'Wordlists', category: 'Generadores', icon: ListPlus },
  { id: 'pwpolicy', name: 'Password Policy Builder', desc: 'Políticas coherentes Linux/Windows según NIST 800-63B: longitud sobre complejidad, sin rotación suicida, con bloqueo', short: 'Policy', category: 'Contraseñas', icon: ClipboardList },
  { id: 'pentestreport', name: 'Pentest Report Builder', desc: 'Estructura hallazgos con severidad, evidencia, impacto y remediación y exporta un informe Markdown profesional', short: 'Report', category: 'Generadores', icon: FileText },
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
]

export const toolsByCategory = (cat: ToolCategory): ToolDef[] => TOOLS.filter((t) => t.category === cat)

export const findTool = (id: string): ToolDef | undefined => TOOLS.find((t) => t.id === id)