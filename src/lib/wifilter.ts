/* Constructor de display filters de Wireshark — 100% local.
   Catálogo de campos por protocolo con explicación, presets de caza,
   composición visual y validación ligera de la sintaxis resultante. */

export interface WiField {
  field: string
  name: string
  desc: string
  example: string
}

export interface WiProtocol {
  id: string
  label: string
  icon: string
  fields: WiField[]
}

export const WI_PROTOCOLS: WiProtocol[] = [
  {
    id: 'frame', label: 'Frame', icon: '🧱',
    fields: [
      { field: 'frame.number', name: 'nº de frame', desc: 'posición en la captura', example: 'frame.number == 42' },
      { field: 'frame.len', name: 'tamaño', desc: 'longitud total en bytes; corto = control, largo = datos', example: 'frame.len > 1200' },
      { field: 'frame.time_relative', name: 'tiempo relativo', desc: 'segundos desde el inicio de la captura', example: 'frame.time_relative >= 10' },
      { field: 'frame.protocols', name: 'pila de protocolos', desc: 'cadena con toda la pila del frame', example: 'frame.protocols contains "tls"' },
    ],
  },
  {
    id: 'eth', label: 'Ethernet', icon: '🔌',
    fields: [
      { field: 'eth.src', name: 'MAC origen', desc: 'dirección física del emisor', example: 'eth.src == 00:11:22:33:44:55' },
      { field: 'eth.dst', name: 'MAC destino', desc: 'ff:ff:ff:ff:ff:ff = broadcast', example: 'eth.dst == ff:ff:ff:ff:ff:ff' },
      { field: 'eth.type', name: 'EtherType', desc: '0x0800 IPv4, 0x86dd IPv6, 0x0806 ARP', example: 'eth.type == 0x0806' },
    ],
  },
  {
    id: 'ip', label: 'IP', icon: '🌐',
    fields: [
      { field: 'ip.addr', name: 'IP (origen o destino)', desc: 'casa con cualquiera de las dos direcciones', example: 'ip.addr == 10.0.0.5' },
      { field: 'ip.src', name: 'IP origen', desc: 'solo emisor', example: 'ip.src == 192.168.1.10' },
      { field: 'ip.ttl', name: 'TTL', desc: 'delata SO y nº de saltos', example: 'ip.ttl < 10' },
      { field: 'ip.flags.mf', name: 'more fragments', desc: 'fragmentación: técnica de evasión clásica', example: 'ip.flags.mf == 1' },
    ],
  },
  {
    id: 'tcp', label: 'TCP', icon: '🔗',
    fields: [
      { field: 'tcp.port', name: 'puerto (src o dst)', desc: 'el filtro de puertos más usado', example: 'tcp.port == 4444' },
      { field: 'tcp.flags.syn == 1 && tcp.flags.ack == 0', name: 'SYN puro', desc: 'inicio de conexión: escaneos y handshakes', example: 'tcp.flags.syn == 1 && tcp.flags.ack == 0' },
      { field: 'tcp.flags.reset == 1', name: 'RST', desc: 'conexión rechazada/tumbada: ruido de escaneo o kill', example: 'tcp.flags.reset == 1' },
      { field: 'tcp.analysis.retransmission', name: 'retransmisiones', desc: 'pérdida de paquetes o evasión deliberada', example: 'tcp.analysis.retransmission' },
      { field: 'tcp.stream eq 0', name: 'stream N', desc: 'aisla UNA conversación completa (follow TCP stream)', example: 'tcp.stream eq 3' },
      { field: 'tcp.len > 0', name: 'con payload', desc: 'excluye ACKs vacíos: solo datos', example: 'tcp.len > 0' },
    ],
  },
  {
    id: 'udp', label: 'UDP', icon: '📦',
    fields: [
      { field: 'udp.port', name: 'puerto', desc: 'DNS(53), DHCP(67/68), SNMP(161), QUIC(443)…', example: 'udp.port == 5353' },
      { field: 'udp.length > 512', name: 'paquetes grandes', desc: 'DNS con payload grande = posible túnel/exfil', example: 'udp.length > 512 && udp.port == 53' },
    ],
  },
  {
    id: 'dns', label: 'DNS', icon: '🧭',
    fields: [
      { field: 'dns.qry.name', name: 'dominio consultado', desc: 'contains / matches para subdominios raros', example: 'dns.qry.name contains "onion"' },
      { field: 'dns.flags.response == 0', name: 'solo consultas', desc: 'sin respuestas: solo lo que PREGUNTA el host', example: 'dns.flags.response == 0' },
      { field: 'dns.qry.type', name: 'tipo de registro', desc: 'TXT=16 (exfil típico), NULL=10, MX=15', example: 'dns.qry.type == 16' },
    ],
  },
  {
    id: 'http', label: 'HTTP', icon: '🌍',
    fields: [
      { field: 'http.request.method', name: 'método', desc: 'POST con datos = exfil, PUT = defacement', example: 'http.request.method == "POST"' },
      { field: 'http.request.uri', name: 'ruta', desc: 'contains para paths de admin/backups', example: 'http.request.uri contains "admin"' },
      { field: 'http.user_agent', name: 'User-Agent', desc: 'curl/python/nmap se delatan solos', example: 'http.user_agent contains "python"' },
      { field: 'http.response.code', name: 'código de respuesta', desc: '401/403: algo existe aunque lo escondan', example: 'http.response.code == 403' },
    ],
  },
  {
    id: 'tls', label: 'TLS', icon: '🔒',
    fields: [
      { field: 'tls.handshake.type == 1', name: 'ClientHello', desc: 'inicio de TLS: SNI y JA3 viven aquí', example: 'tls.handshake.type == 1' },
      { field: 'tls.handshake.extensions_server_name', name: 'SNI', desc: 'el dominio REAL al que va la conexión cifrada', example: 'tls.handshake.extensions_server_name contains "pastebin"' },
      { field: 'tls.alert_message.desc', name: 'alertas TLS', desc: 'handshake failures: MITM o pins rotos', example: 'tls.alert_message.desc' },
    ],
  },
  {
    id: 'icmp', label: 'ICMP', icon: '📡',
    fields: [
      { field: 'icmp.type', name: 'tipo', desc: '8=echo request, 0=reply, 3=unreachable', example: 'icmp.type == 8' },
      { field: 'data.data', name: 'payload ICMP', desc: 'ICMP con datos = túnel clásico (icmpsh)', example: 'icmp.type == 8 && data.data' },
    ],
  },
  {
    id: 'arp', label: 'ARP', icon: '🔄',
    fields: [
      { field: 'arp.opcode == 2', name: 'respuestas ARP', desc: 'montaña de replies sin request = ARP spoofing', example: 'arp.opcode == 2' },
      { field: 'arp.duplicate-address-detected', name: 'IP duplicada', desc: 'Wireshark ya lo avisa: MITM en la LAN', example: 'arp.duplicate-address-detected' },
    ],
  },
]

export interface Preset {
  name: string
  filter: string
  why: string
}

export const WI_PRESETS: Preset[] = [
  { name: 'Handshake TCP completo', filter: 'tcp.flags.syn == 1 && tcp.flags.ack == 1 && tcp.flags.ack == 1', why: 'No: usa este para ver el 3-way: SYN, SYN/ACK, ACK' },
  { name: 'Solo handshakes TCP', filter: '(tcp.flags.syn == 1 && tcp.flags.ack == 0) || (tcp.flags.syn == 1 && tcp.flags.ack == 1)', why: 'inicios de conexión: quién habla con quién' },
  { name: 'Escaneo de puertos (SYN flood)', filter: 'tcp.flags.syn == 1 && tcp.flags.ack == 0 && tcp.flags.reset == 1', why: 'SYN seguido de RST = patrón de nmap -sS' },
  { name: 'Exfil por DNS TXT', filter: 'dns.qry.type == 16 && dns.flags.response == 0', why: 'consultas TXT: el túnel DNS más común' },
  { name: 'Credenciales HTTP en claro', filter: 'http.request.method == "POST" && !http.host contains "tls"', why: 'POSTs sin TLS = usuario/contraseña visibles' },
  { name: 'SNI de dominios raros', filter: 'tls.handshake.type == 1 && (tls.handshake.extensions_server_name contains ".tk" || tls.handshake.extensions_server_name contains ".onion")', why: 'TLDs de baja reputación en conexiones cifradas' },
  { name: 'ICMP con payload', filter: 'icmp.type == 8 && frame.len > 84', why: 'pings gordos = túnel ICMP o exfil' },
  { name: 'Broadcast storms', filter: 'eth.dst == ff:ff:ff:ff:ff:ff', why: 'tormenta de broadcast: loop L2 o spoofing' },
]

export interface FilterPart {
  expr: string
}

export const combineParts = (parts: FilterPart[], joiner: '&&' | '||'): string =>
  parts.map((p) => p.expr.trim()).filter(Boolean).map((e) => (e.includes(' ') && !/^\(.*\)$/.test(e) ? `(${e})` : e)).join(` ${joiner} `)

export interface ValidationResult {
  ok: boolean
  warnings: string[]
}

/* validación ligera (la verdad solo la dice tshark, pero esto pilla lo típico) */
export const validateFilter = (f: string): ValidationResult => {
  const warnings: string[] = []
  let ok = true
  const parens = (f.match(/\(/g) ?? []).length - (f.match(/\)/g) ?? []).length
  if (parens !== 0) {
    ok = false
    warnings.push(parens > 0 ? `falta${parens === 1 ? '' : 'n'} ${parens} paréntesis de cierre` : `sobran ${Math.abs(parens)} paréntesis de cierre`)
  }
  const quotes = (f.match(/"/g) ?? []).length
  if (quotes % 2 !== 0) {
    ok = false
    warnings.push('comillas dobles sin cerrar')
  }
  if (/\band\b|\bor\b/i.test(f) && !/\&\&|\|\|/.test(f)) warnings.push('display filters usan && y || — "and"/"or" en minúscula también valen, pero mezcla estilos con cuidado')
  if (/==\s*"[^"]*\s$/.test(f)) warnings.push('posible comilla de cierre mal colocada')
  if (f.includes('==*')) { ok = false; warnings.push('==* no existe: para "empieza por" usa matches con ^ o contains') }
  if (/\bset\b|\bselect\b/i.test(f)) { ok = false; warnings.push('esto parece otro lenguaje: los display filters no son SQL ni pcap-filter (BPF)') }
  return { ok, warnings }
}
