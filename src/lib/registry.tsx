import type { LucideIcon } from 'lucide-react'
import {
  Hash, KeyRound, ShieldCheck, Fingerprint, FileSearch, ScanSearch, Camera, Waves, TerminalSquare,
  ChefHat, Calculator, Network, Globe, Activity, Radar, Lock, Unlock, ArrowLeftRight, Binary, EyeOff,
  Smile, Radio, Server, Database, FileCode, Bug, Swords, FileKey, ScrollText, Brain, Braces, Regex,
  CalendarClock, Wifi, Split, Crown, Globe2, Timer, ShieldAlert, Ban, QrCode, TypeOutline,
} from 'lucide-react'

export type ToolCategory =
  | 'Criptografía'
  | 'Contraseñas'
  | 'Web & payloads'
  | 'Red'
  | 'Forense'
  | 'Linux & sistema'
  | 'Análisis'
  | 'Generadores'

export const CATEGORY_COLORS: Record<ToolCategory, string> = {
  Criptografía: 'text-acento',
  Contraseñas: 'text-warn',
  'Web & payloads': 'text-info',
  Red: 'text-acento-bright',
  Forense: 'text-[#c084fc]',
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

  // ─── Forense ────────────────────────────────────────────────────
  { id: 'pcap', name: 'PCAP Analyzer', short: 'PCAP', desc: 'Analiza capturas pcap/pcapng: protocolos, top talkers, DNS/HTTP y alertas', category: 'Forense', icon: Waves },
  { id: 'fileanalyzer', name: 'File Analyzer', short: 'File', desc: 'Magic bytes, entropía, strings y hashes de cualquier archivo', category: 'Forense', icon: FileSearch },
  { id: 'exif', name: 'EXIF & Metadatos', short: 'EXIF', desc: 'Extrae metadatos GPS, cámara y software de imágenes, HEIC, PDFs y más', category: 'Forense', icon: Camera },
  { id: 'stego', name: 'Esteganografía LSB', short: 'Stego', desc: 'Oculta y extrae mensajes en el canal LSB de imágenes PNG', category: 'Forense', icon: EyeOff },

  // ─── Linux & sistema ────────────────────────────────────────────
  { id: 'chmod', name: 'Calculadora CHMOD', short: 'CHMOD', desc: 'Permisos Linux en octal/simbólico con SUID, SGID y Sticky Bit', category: 'Linux & sistema', icon: Crown, ported: true, origin: 'chmod-calculator' },
  { id: 'cheatsheets', name: 'Linux/Windows Cheatsheets', short: 'Cheats', desc: 'Comandos de red, sistema y privesc con equivalencias Linux↔Windows', category: 'Linux & sistema', icon: ScrollText },

  // ─── Análisis ───────────────────────────────────────────────────
  { id: 'cvelookup', name: 'CVE Lookup', short: 'CVE', desc: 'Consulta CVEs en la NVD con CVSS, descripción y referencias', category: 'Análisis', icon: ShieldAlert },
  { id: 'cvss', name: 'Calculadora CVSS 3.1', short: 'CVSS', desc: 'Puntuación base CVSS 3.1 con vector y severidad estética', category: 'Análisis', icon: Brain },
  { id: 'cronguru', name: 'Cron Guru', short: 'Cron', desc: 'Explica expresiones cron y calcula las próximas ejecuciones', category: 'Análisis', icon: CalendarClock },
  { id: 'regex', name: 'Regex Lab', short: 'Regex', desc: 'Prueba expresiones regulares con grupos, matches y flags', category: 'Análisis', icon: Regex },
  { id: 'defanger', name: 'Defanger / Refanger', short: 'Defang', desc: 'Defangea o refangea IPs, dominios y URLs para reportes', category: 'Análisis', icon: Ban },
  { id: 'uuid', name: 'UUID & IDs', short: 'UUID', desc: 'Genera UUID v4, NanoID y ObjectIds con validación', category: 'Análisis', icon: Radio },

  // ─── Generadores ────────────────────────────────────────────────
  { id: 'qr', name: 'QR Generator', short: 'QR', desc: 'Códigos QR con presets WiFi, vCard, email, SMS y geo; descarga PNG/SVG en local', category: 'Generadores', icon: QrCode },
  { id: 'lipsum', name: 'Lorem Ipsum Generator', short: 'Lipsum', desc: 'Texto de relleno por párrafos, frases o palabras con modo hacker y salida MD/HTML/JSON', category: 'Generadores', icon: TypeOutline },
]

export const CATEGORIES: ToolCategory[] = [
  'Criptografía',
  'Contraseñas',
  'Web & payloads',
  'Red',
  'Forense',
  'Linux & sistema',
  'Análisis',
  'Generadores',
]

export const toolsByCategory = (cat: ToolCategory): ToolDef[] => TOOLS.filter((t) => t.category === cat)

export const findTool = (id: string): ToolDef | undefined => TOOLS.find((t) => t.id === id)