/* Referencia de puertos y protocolos: bien conocidos, de pentest y de AD.
   Datos curados a mano (IANA + experiencia de laboratorio). */

export interface PortEntry {
  port: number
  proto: 'tcp' | 'udp' | 'tcp/udp'
  service: string
  desc: string
  hack: string
  group: 'web' | 'remote' | 'ad' | 'db' | 'mail' | 'files' | 'infra' | 'misc'
}

export const PORTS: PortEntry[] = [
  { port: 21, proto: 'tcp', service: 'FTP', desc: 'Transferencia de ficheros en claro', hack: 'anonymous login (ftp objective), brute con hydra, Bounce attack', group: 'files' },
  { port: 22, proto: 'tcp', service: 'SSH/SFTP', desc: 'Shell remota cifrada', hack: 'brute (hydra -P rockyou), user enumeration CVE-2018-15473, claves débiles', group: 'remote' },
  { port: 23, proto: 'tcp', service: 'Telnet', desc: 'Shell remota EN CLARO', hack: 'credenciales por defecto, sniffing directo', group: 'remote' },
  { port: 25, proto: 'tcp', service: 'SMTP', desc: 'Correo saliente', hack: 'user enumeration (VRFY/EXPN), relay abierto, phishing directo', group: 'mail' },
  { port: 53, proto: 'tcp/udp', service: 'DNS', desc: 'Resolución de nombres', hack: 'AXFR (transferencia de zona), cache poisoning, recon de subdominios', group: 'infra' },
  { port: 67, proto: 'udp', service: 'DHCP server', desc: 'Asignación de IPs', hack: 'rogue DHCP (MITM), exhaustion de pool', group: 'infra' },
  { port: 69, proto: 'udp', service: 'TFTP', desc: 'Trivial FTP (sin auth)', hack: 'descargar configs de routers (tftp -g -r config)', group: 'files' },
  { port: 79, proto: 'tcp', service: 'Finger', desc: 'Info de usuarios (legacy)', hack: 'user enumeration en sistemas viejos', group: 'misc' },
  { port: 80, proto: 'tcp', service: 'HTTP', desc: 'Web en claro', hack: 'todo el arsenal web: fuzzing, SQLi, XSS, CMS exploits', group: 'web' },
  { port: 88, proto: 'tcp', service: 'Kerberos', desc: 'Autenticación de AD', hack: 'Kerberoasting, AS-REP roast, UserEnum con GetNPUsers', group: 'ad' },
  { port: 110, proto: 'tcp', service: 'POP3', desc: 'Correo entrante (legacy)', hack: 'brute, cleartext si no hay STARTTLS', group: 'mail' },
  { port: 111, proto: 'tcp/udp', service: 'RPCBind', desc: 'Mapeador RPC (NFS va detrás)', hack: 'enum de servicios RPC, NFS exports sin root_squash', group: 'files' },
  { port: 123, proto: 'udp', service: 'NTP', desc: 'Sincronización de tiempo', hack: 'amplification DDoS, info de hosts internos (monlist)', group: 'infra' },
  { port: 135, proto: 'tcp', service: 'MSRPC', desc: 'RPC de Windows', hack: 'enum con rpcdump, puerta a DCOM/WMI', group: 'ad' },
  { port: 137, proto: 'udp', service: 'NetBIOS Name', desc: 'Nombres NetBIOS', hack: 'enum de hosts/compartidos (nbtstat -A)', group: 'ad' },
  { port: 139, proto: 'tcp', service: 'NetBIOS Session', desc: 'SMB viejo sobre NetBIOS', hack: 'enum4linux, null sessions en sistemas viejos', group: 'files' },
  { port: 143, proto: 'tcp', service: 'IMAP', desc: 'Correo entrante moderno', hack: 'brute, STARTTLS downgrade', group: 'mail' },
  { port: 161, proto: 'udp', service: 'SNMP', desc: 'Gestión de red', hack: 'community "public"/"private": volcar interfaces, usuarios, procesos', group: 'infra' },
  { port: 389, proto: 'tcp', service: 'LDAP', desc: 'Directorio (AD)', hack: 'anonymous bind, enum de usuarios/grupos (ldapsearch)', group: 'ad' },
  { port: 443, proto: 'tcp', service: 'HTTPS', desc: 'Web cifrada', hack: 'TLS misconfig, vhost enum, apps expuestas (igual que 80 pero cifrado)', group: 'web' },
  { port: 445, proto: 'tcp', service: 'SMB', desc: 'Compartición de ficheros Windows', hack: 'EternalBlue (MS17-010), null sessions, crackmapexec/smbclient', group: 'files' },
  { port: 464, proto: 'tcp', service: 'Kerberos set/change pwd', desc: 'Cambio de contraseña Kerberos', hack: 'kpasswd brute (as-rep related)', group: 'ad' },
  { port: 465, proto: 'tcp', service: 'SMTPS', desc: 'SMTP sobre TLS', hack: 'brute con credenciales filtradas', group: 'mail' },
  { port: 500, proto: 'udp', service: 'ISAKMP/IKE', desc: 'Negociación VPN IPsec', hack: 'ike-scan para fingerprint de gateways VPN', group: 'infra' },
  { port: 514, proto: 'udp', service: 'Syslog', desc: 'Logs de red', hack: 'spoofing de logs hacia el SIEM, recep abierta = log poisoning', group: 'infra' },
  { port: 587, proto: 'tcp', service: 'SMTP submission', desc: 'Envío autenticado', hack: 'brute de cuentas de correo, relay con auth débil', group: 'mail' },
  { port: 623, proto: 'udp', service: 'IPMI', desc: 'Gestión de hardware (BMC)', hack: 'credenciales por defecto, cipher 0 attack, hash dumping RAKP', group: 'infra' },
  { port: 636, proto: 'tcp', service: 'LDAPS', desc: 'LDAP sobre TLS', hack: 'igual que 389, pero cifrado (enum con credenciales)', group: 'ad' },
  { port: 993, proto: 'tcp', service: 'IMAPS', desc: 'IMAP cifrado', hack: 'phishing de credenciales, brute', group: 'mail' },
  { port: 995, proto: 'tcp', service: 'POP3S', desc: 'POP3 cifrado', hack: 'brute', group: 'mail' },
  { port: 1080, proto: 'tcp', service: 'SOCKS', desc: 'Proxy SOCKS', hack: 'open proxy abuse, pivoting', group: 'misc' },
  { port: 1099, proto: 'tcp', service: 'Java RMI', desc: 'RMI registry de Java', hack: 'deserialización RMI (ysoserial)', group: 'misc' },
  { port: 1194, proto: 'udp', service: 'OpenVPN', desc: 'VPN OpenVPN', hack: 'creds filtradas .ovpn, brute', group: 'infra' },
  { port: 1433, proto: 'tcp', service: 'MSSQL', desc: 'SQL Server', hack: 'xp_cmdshell (RCE), brute sa, UNC path steal hashes', group: 'db' },
  { port: 1521, proto: 'tcp', service: 'Oracle DB', desc: 'Base de datos Oracle', hack: 'SID enum (sidguess), TNS poisoning, default users', group: 'db' },
  { port: 1723, proto: 'tcp', service: 'PPTP', desc: 'VPN legacy', hack: 'MS-CHAPv2 crackeable, brute', group: 'infra' },
  { port: 2049, proto: 'tcp', service: 'NFS', desc: 'Sistema de ficheros de red', hack: 'showmount -e: exports sin restricción, no_root_squash = privesc', group: 'files' },
  { port: 2121, proto: 'tcp', service: 'FTP proxy', desc: 'FTP proxy (poco común)', hack: 'bounce attack hacia hosts internos', group: 'files' },
  { port: 3000, proto: 'tcp', service: 'Node/Grafana/Dev', desc: 'Apps de desarrollo', hack: 'Grafana SSRF/path traversal, APIs sin auth en dev', group: 'web' },
  { port: 3268, proto: 'tcp', service: 'Global Catalog', desc: 'LDAP de catálogo global AD', hack: 'enum de TODO el bosque (forest-wide)', group: 'ad' },
  { port: 3306, proto: 'tcp', service: 'MySQL/MariaDB', desc: 'Base de datos MySQL', hack: 'root sin pass, INTO OUTFILE webshell, UDF RCE', group: 'db' },
  { port: 3389, proto: 'tcp', service: 'RDP', desc: 'Escritorio remoto Windows', hack: 'brute (crowbar/hydra), BlueKeep CVE-2019-0708, NTLM relay', group: 'remote' },
  { port: 4444, proto: 'tcp', service: 'Metasploit default', desc: 'Listener habitual de msf', hack: 'si lo ves abierto: handler de alguien (o tuyo)', group: 'misc' },
  { port: 5060, proto: 'tcp', service: 'SIP', desc: 'VoIP', hack: 'extension enum (svwar), creds de VoIP', group: 'misc' },
  { port: 5432, proto: 'tcp', service: 'PostgreSQL', desc: 'Base de datos PostgreSQL', hack: 'trust auth en pg_hba.conf, COPY TO PROGRAM (RCE)', group: 'db' },
  { port: 5555, proto: 'tcp', service: 'ADB', desc: 'Android Debug Bridge', hack: 'shell directa si tcpip mode activo', group: 'misc' },
  { port: 5900, proto: 'tcp', service: 'VNC', desc: 'Remote desktop VNC', hack: 'auth débil de 8 chars, brute con vncpwd', group: 'remote' },
  { port: 5984, proto: 'tcp', service: 'CouchDB', desc: 'Base de datos NoSQL', hack: 'CouchDB admin party (sin auth), CVE-2017-12635 RCE', group: 'db' },
  { port: 5985, proto: 'tcp', service: 'WinRM HTTP', desc: 'Remoting PowerShell', hack: 'evil-winrm con creds, no requiere HTTPS', group: 'remote' },
  { port: 5986, proto: 'tcp', service: 'WinRM HTTPS', desc: 'Remoting PowerShell TLS', hack: 'igual que 5985 con cert self-signed aceptado', group: 'remote' },
  { port: 6379, proto: 'tcp', service: 'Redis', desc: 'Cache/cola en memoria', hack: 'sin auth = CONFIG SET dir webshell, SSH key write, RCE por módulos', group: 'db' },
  { port: 6667, proto: 'tcp', service: 'IRC', desc: 'Chat IRC', hack: 'canales internos, bots C2 legacy', group: 'misc' },
  { port: 8000, proto: 'tcp', service: 'HTTP alt', desc: 'Web apps Django, dev servers', hack: 'DJANGO_SECRET_KEY, debug pages', group: 'web' },
  { port: 8080, proto: 'tcp', service: 'HTTP proxy/alt', desc: 'Tomcat, proxies, admin web', hack: 'Tomcat manager creds default, deploy WAR', group: 'web' },
  { port: 8443, proto: 'tcp', service: 'HTTPS alt', desc: 'Paneles admin TLS', hack: 'paneles de VPN/VM (Pulse, VMware) con CVEs', group: 'web' },
  { port: 8834, proto: 'tcp', service: 'Nessus', desc: 'Web UI de Nessus', hack: 'creds default, reportes internos', group: 'misc' },
  { port: 9001, proto: 'tcp', service: 'HSQLDB/alt', desc: 'DB embebida/alt ports', hack: 'consolas de administración', group: 'db' },
  { port: 9200, proto: 'tcp', service: 'Elasticsearch', desc: 'Buscador NoSQL', hack: 'API REST sin auth: _cat/indices, RCE por scripts (CVE-2014-3120)', group: 'db' },
  { port: 11211, proto: 'tcp/udp', service: 'Memcached', desc: 'Cache distribuida', hack: 'sin auth: dump de sesiones, amplification UDP', group: 'db' },
  { port: 27017, proto: 'tcp', service: 'MongoDB', desc: 'NoSQL documental', hack: 'sin auth por defecto en setups malos, BSON injection', group: 'db' },
  { port: 31337, proto: 'tcp', service: 'Elite/BackOrifice', desc: 'Puerto clásico de CTF/troyanos', hack: 'en CTFs: flag services', group: 'misc' },
  { port: 49152, proto: 'tcp', service: 'RDP/efímeros', desc: 'Rango dinámico RPC', hack: 'enum de endpoints RPC de Windows', group: 'ad' },
]

export const PORT_GROUPS: { key: PortEntry['group'] | 'all'; label: string }[] = [
  { key: 'all', label: 'todos' },
  { key: 'web', label: 'web' },
  { key: 'remote', label: 'acceso remoto' },
  { key: 'ad', label: 'active directory' },
  { key: 'db', label: 'bases de datos' },
  { key: 'mail', label: 'correo' },
  { key: 'files', label: 'ficheros/compartidos' },
  { key: 'infra', label: 'infraestructura' },
  { key: 'misc', label: 'miscelánea' },
]

export function searchPorts(q: string): PortEntry[] {
  const s = q.trim().toLowerCase()
  if (!s) return PORTS
  const n = Number(s)
  return PORTS.filter((p) =>
    (Number.isFinite(n) && p.port === n) ||
    p.service.toLowerCase().includes(s) ||
    p.desc.toLowerCase().includes(s) ||
    p.hack.toLowerCase().includes(s),
  )
}
