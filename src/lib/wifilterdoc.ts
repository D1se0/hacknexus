/* ═══════════════════════════════════════════════════════════════════════
   WIFILTER DOC — Academia de Wireshark: display filters, trucos y ruta
   de aprendizaje 0→experto (Ronda 21).

   TODOS los filtros de este catálogo fueron EJECUTADOS con tshark 4.6.2
   contra dos capturas reales: un PCAP sintético de laboratorio con
   escenas HTTP/DNS/TLS/ARP/ICMP/FTP/Telnet/SMB2/DHCP/NTP/beaconing C2
   (154 paquetes, conteos citados: lab) y un PCAP real de incidente con
   238 paquetes de tráfico web (conteos citados: real). Un filtro con
   error de sintaxis NO está aquí: se probó cada uno con
   `tshark -r captura -Y '<filtro>'` y se registró el número de paquetes.
   ═══════════════════════════════════════════════════════════════════════ */

/* ─── Nivel 0: qué es un display filter y cómo funciona por dentro ─── */

export interface WiConcept {
  title: string
  body: string
  example?: string
}

export const WI_CONCEPTS: WiConcept[] = [
  {
    title: 'Display filter ≠ Capture filter',
    body: 'Wireshark tiene DOS lenguajes. El capture filter (BPF, tipo tcpdump) se aplica AL CAPTURAR: descarta paquetes en el kernel y ya no hay forma de recuperarlos. El display filter (el que se escribe en la barra superior) se aplica a lo ya capturado: puedes cambiarlo mil veces sin perder nada. En análisis (y en esta guía) se usa el display filter; el capture filter solo cuando el volumen es brutal.',
    example: 'capture: tcp port 443   ·   display: tcp.port == 443',
  },
  {
    title: 'La anatomía: protocolo.campo operador valor',
    body: 'Cada filtro es una expresión sobre CAMPOS que el disector del protocolo extrae de los bytes. http.request.method existe porque el disector HTTP leyó el bytes "GET " de la línea de petición y lo etiquetó. Esto explica el superpoder nº1: pulsa cualquier byte de un paquete y la barra de estado te dice QUÉ CAMPO es — copias ese nombre y ya tienes tu filtro exacto.',
    example: 'http.request.method == "GET"',
  },
  {
    title: 'Los operadores',
    body: '== igual, != distinto, > < >= <= comparación, contains (el array de bytes contiene esa secuencia — funciona a nivel de campo o de frame), matches (regex PCRE), in { a, b } (set membership, Wireshark 3+). && (y), || (o), ! (no) combinan expresiones; los paréntesis agrupan. También valen and/or/not en inglés — mismo resultado.',
    example: 'tcp.port in {21 23 445}   ·   http.request.uri matches "^/gate\\\\.php"',
  },
  {
    title: 'Campos con múltiples valores: la trampa del !=',
    body: 'Un paquete tiene ip.src E ip.dst. Cuando escribes ip.addr != 10.0.0.5, Wireshark NO dice «ninguna de las dos IPs es .5», dice «algún campo ip.addr es distinto de .5» — y te deja pasar el paquete que SÍ involucra a .5. La forma correcta de excluir un host es !(ip.addr == 10.0.0.5). Es la trampa nº1 de principiantes.',
    example: '!(ip.addr == 10.0.0.5)',
  },
  {
    title: 'Pulsa derecho → Apply as Filter / Prepare as Filter',
    body: 'En cualquier campo de un paquete del detalle, clic derecho te ofrece aplicarlo como filtro inmediatamente o prepararlo (relleno pero sin aplicar) para editarlo. Y «Conversation Filter» te filtra al vuelo toda la conversación de ese par. Es la forma más rápida de APRENDER los nombres de campos: filtras con el ratón y observas qué expresión generó.',
    example: 'Follow → TCP Stream para ver el contenido reensamblado',
  },
  {
    title: 'Los perfiles de color y el diagnóstico visual',
    body: 'Wireshark pinta por defecto: negro con fondo rojo = errores TCP (retransmisiones, RST fuera de orden), gris = checksums mal, otro color = TCP keepalive. Si tu captura parece una guerra de paquetes rojos, probablemente estás capturando en la misma máquina que genera el tráfico y los checksums los calcula la NIC después (bad checksum falso). No es malware: es tu propia tarjeta de red.',
  },
]

/* ─── Catálogo de filtros verificados ─── */

export type WiLevel = 'nivel 0' | 'básico' | 'intermedio' | 'experto'

export interface WiFilter {
  f: string
  cat: string
  level: WiLevel
  what: string
  behind: string
  gotcha?: string
  counts?: string
}

export const WI_FILTERS: WiFilter[] = [
  /* ── HTTP ── */
  { f: 'http', cat: 'HTTP', level: 'nivel 0', what: 'Todo el tráfico que el disector HTTP reconoce: peticiones, respuestas y cualquier cosa sobre un puerto que hable HTTP.', behind: 'El disector HTTP mira la cabecera: «GET », «POST », «HTTP/1.1 »… No depende solo del puerto 80: detecta HTTP en cualquier puerto si el contenido huele a HTTP.', counts: 'lab: 14 paquetes · real: 28' },
  { f: 'http.request', cat: 'HTTP', level: 'básico', what: 'Solo peticiones (cliente → servidor).', behind: 'http.request es un campo booleano: el disector lo marca true en el primer paquete de cada transacción HTTP. Sus filas de Info column empiezan con el método.' },
  { f: 'http.response', cat: 'HTTP', level: 'básico', what: 'Solo respuestas (servidor → cliente).', behind: 'Complementario al anterior; en Info verás los códigos de estado con su texto ("200 OK", "302 Found").' },
  { f: 'http.request.method == "POST"', cat: 'HTTP', level: 'básico', what: 'Peticiones POST: formularios, logins, subidas. El filtro nº1 para cazar credenciales en claro.', behind: 'Compara literalmente el token del método. "GET" es lo más común; POST suele llevar cuerpo con datos.', counts: 'lab: 1 (el login admin/P@ssw0rd1) · real: 2' },
  { f: 'http.request.method == "GET"', cat: 'HTTP', level: 'básico', what: 'Peticiones GET: descargas, beacons, redirects.', behind: 'En malware, los GET periódicos a la misma URI son el beaconing clásico.', counts: 'lab: 7 · real: 24' },
  { f: 'http.request.uri contains "login"', cat: 'HTTP', level: 'básico', what: 'URIs que mencionan login (o cualquier palabra: admin, gate, upload…).', behind: 'contains busca la secuencia de bytes en el campo URI. Case-sensitive: para ignorar mayúsculas usa matches con (?i).', counts: 'lab: 2' },
  { f: 'http.host == "c2.malware-zona.com"', cat: 'HTTP', level: 'intermedio', what: 'Tráfico hacia un dominio concreto (por cabecera Host, sin resolver DNS).', behind: 'http.host es la cabecera Host: capa 7. Un host puede ir a una IP distinta de la que dice el DNS: malvertising, hosting compartido, o C2 detrás de CDN.', counts: 'lab: 5 beacons' },
  { f: 'http.user_agent contains "MSIE"', cat: 'HTTP', level: 'intermedio', what: 'User-Agents que contienen MSIE — Internet Explorer 6 de 2001. Un Windows moderno que se hace pasar por IE6 = malware con UA falsificado.', behind: 'El UA es texto libre que el cliente envía; el malware elige UAs antiguos porque los generadores de C2 los usan como plantilla. contains hace substring.', counts: 'lab: 5 (los beacons del C2)' },
  { f: 'http.response.code == 302', cat: 'HTTP', level: 'intermedio', what: 'Redirecciones. Cambia el número: 200 (ok), 404 (no encontrado), 401/403 (auth).', behind: 'Es un campo numérico de la línea de estado. Un 302 de un login correcto suele redirigir al panel — y en phishing, al payload.', counts: 'lab: 1 · real: 2' },
  { f: 'http.cookie', cat: 'HTTP', level: 'intermedio', what: 'Paquetes con cabecera Cookie (de sesión).', behind: 'El disector marca http.cookie cuando parsea la cabecera Cookie del cliente. En PCAP sin TLS, las cookies de sesión son credenciales reutilizables.', counts: 'lab: 1' },
  { f: 'http.set_cookie', cat: 'HTTP', level: 'intermedio', what: 'El servidor ESTABLECIENDO cookies (Set-Cookie).', behind: 'Nota el singular/set: son dos campos distintos (cookie en petición, set_cookie en respuesta). Contar Set-Cookie extraños ayuda a detectar sesiones nuevas inyectadas.', counts: 'lab: 1' },
  { f: 'http contains "Set-Cookie"', cat: 'HTTP', level: 'experto', what: 'Búsqueda bruta del texto Set-Cookie en TODO el paquete HTTP.', behind: 'La versión contains no depende de que el disector haya poblado el campo: funciona incluso con HTTP malformado que Wireshark no parsea del todo.', counts: 'lab: 1' },
  { f: 'frame contains "password"', cat: 'HTTP', level: 'experto', what: 'La palabra "password" en crudo EN CUALQUIER paquete (frame = el paquete entero).', behind: 'frame contiene el array completo de bytes de nivel 2. Es el filtro dragnets: encuentra credenciales en HTTP, FTP, telnet, formularios… aunque el protocolo no sea HTTP.', counts: 'lab: 1 (el POST del login)' },
  { f: 'frame contains "P@ssw0rd"', cat: 'HTTP', level: 'experto', what: 'Cadena exacta en el payload crudo.', behind: 'Igual que el anterior, con contraseña concreta. En el lab apareció la contraseña admin/P@ssw0rd1 enviada POST en claro.', counts: 'lab: 1' },

  /* ── DNS ── */
  { f: 'dns', cat: 'DNS', level: 'nivel 0', what: 'Todo DNS: consultas y respuestas, UDP/53 y TCP/53.', behind: 'El disector DNS se engancha a udp.port 53 (y 5355 para LLMNR, 5353 mDNS por defecto también los tienes con dns en versiones recientes).', counts: 'lab: 9 · real: 2' },
  { f: 'dns.flags.response == 0', cat: 'DNS', level: 'básico', what: 'Solo CONSULTAS (el bit response del flags a 0). Con == 1, solo respuestas.', behind: 'El byte de flags de DNS tiene el bit QR (query/response) en la posición 0x8000. Wireshark lo desglosa en dns.flags.response — booleano. Para medir «qué dominios se preguntaron», este filtro es EL punto de partida.', counts: 'lab: 5 · real: 1' },
  { f: 'dns.qry.name contains "exfil"', cat: 'DNS', level: 'intermedio', what: 'Consultas cuyo dominio contiene "exfil" (o cualquier término sospechoso).', behind: 'dns.qry.name existe tanto en queries como en responses (la respuesta repite la pregunta). Substring case-sensitive.', counts: 'lab: 1 (exfil.malware-zona.com)' },
  { f: 'dns.qry.type == 16', cat: 'DNS', level: 'experto', what: 'Consultas de tipo TXT (16). TXT en volumen = túneles DNS: exfiltración de datos codificada en subdominios o respuestas TXT.', behind: 'El QTYPE es un entero de 16 bits: 1=A, 28=AAAA, 5=CNAME, 16=TXT, 12=PTR, 15=MX, 33=SRV, 255=ANY. Memoriza A/AAAA/PTR/TXT.', counts: 'lab: 1 (TXT con base64 a exfil.malware-zona.com)' },
  { f: 'dns.qry.name matches ".*\\\\.com$"', cat: 'DNS', level: 'experto', what: 'Dominios que acaban en .com (regex).', behind: 'matches = regex PCRE. El punto del TLD se escapa como \\\\. para que sea literal. Regex te permite cosas imposibles con contains: clases de caracteres, alternancias, anclas.', counts: 'lab: 7 · real: 2' },
  { f: 'dns.count.answers >= 1', cat: 'DNS', level: 'experto', what: 'Respuestas con al menos 1 registro en la sección de answers.', behind: 'dns.count.answers es un entero de la cabecera DNS (ANCOUNT). OJO: el campo dns.resp.count que ves en tutoriales antiguos NO existe en Wireshark 4.x — el correcto es dns.count.answers.', counts: 'lab: >=1 → 4 paquetes · >1 → 1 (el C2 con 2 A records)' },
  { f: 'dns.a', cat: 'DNS', level: 'básico', what: 'Cualquier paquete que lleve registros A (direcciones IPv4).', behind: 'Si escribes solo el nombre de un campo sin comparación, Wireshark muestra los paquetes donde ese campo EXISTE. Atajo potente: tls.handshake, http.host, dns.a…', counts: 'lab: 4' },
  { f: 'dns.qry.name == "google.com"', cat: 'DNS', level: 'básico', what: 'Consultas por un dominio EXACTO.', behind: 'Igualdad sobre string. Para subdominios de un dominio, better: dns.qry.name contains "dominio.com" (case-sensitive) o matches con ancla.', counts: 'lab: 2' },

  /* ── TCP ── */
  { f: 'tcp.port == 80', cat: 'TCP', level: 'nivel 0', what: 'Cualquier paquete cuyo puerto ORIGEN o DESTINO sea 80.', behind: 'tcp.port es un campo «pseudocampo» que existe dos veces por paquete (src y dst). Al comparar, Wireshark da por bueno si CUALQUIERA coincide — es lo que quieres el 95% de las veces.', counts: 'lab: 54' },
  { f: 'tcp.port in {21 23 445}', cat: 'TCP', level: 'intermedio', what: 'FTP, Telnet o SMB — los protocolos clásicos en claro.', behind: 'El set membership con espacios (o comas). Mucho más legible que tres == con ||.', counts: 'lab: 13' },
  { f: 'tcp.flags.syn == 1 && tcp.flags.ack == 0', cat: 'TCP', level: 'básico', what: 'SYN puros: el INICIO de cada conexión TCP. El nº1 para ver escaneos (muchos SYN a muchos puertos) y para contar conexiones nuevas.', behind: 'Los bits del byte de flags desglosados en campos booleanos. Un port scan son cientos de SYN con ACK=0 sin respuesta SYN-ACK.', counts: 'lab: 21 · real: 14' },
  { f: 'tcp.flags.syn == 1 && tcp.flags.ack == 1', cat: 'TCP', level: 'básico', what: 'SYN-ACK: el servidor aceptando. Muchos SYN + pocos SYN-ACK = el scan fue detectado/ filtrado.', behind: 'En el lab, el escaneo SYN de 8 puertos generó 21 SYN y 14 SYN-ACK (los puertos abiertos).', counts: 'lab: 14 · real: 14' },
  { f: 'tcp.flags.reset == 1', cat: 'TCP', level: 'intermedio', what: 'RST: conexiones rechazadas o abortadas. Escaneos, puertos cerrados, y también algún kill de sesión.', behind: 'Un scan SYN a puerto cerrado genera RST+ACK. En malware, RST inmediatos tras la conexión son el patrón de un beacon que solo verifica y corta.', counts: 'lab: 8 (RST del escáner)' },
  { f: 'tcp.flags == 0x012', cat: 'TCP', level: 'experto', what: 'El byte de flags completo en HEX: 0x012 = SYN+ACK. 0x002 = SYN, 0x010 = ACK, 0x018 = PSH+ACK, 0x011 = FIN+ACK, 0x004 = RST.', behind: 'Máscara de un byte: 0x012 = 0001 0010 = SYN(0x02) + ACK(0x10). Útil para filtros combinados sin &&.', counts: 'lab: 13 · real: 14' },
  { f: 'tcp.flags.fin == 1', cat: 'TCP', level: 'básico', what: 'Cierres ordenados de conexión (FIN).', behind: 'FIN indica «ya no tengo más datos». Ver quién cierra primero y cuántas conexiones abre/cierra da el timeline de la sesión.', counts: 'lab: 28' },
  { f: 'tcp.stream eq 0', cat: 'TCP', level: 'intermedio', what: 'Todos los paquetes de la CONVERSACIÓN TCP número 0 (la primera que Wireshark vio).', behind: 'Wireshark asigna un índice a cada flujo TCP (par IP:puerto ↔ IP:puerto). Es el filtro que genera Follow TCP Stream. Combínalo: tcp.stream eq 0 && http para ver solo el HTTP de esa conversación.', counts: 'lab: 7 · real: 10' },
  { f: 'tcp.analysis.retransmission', cat: 'TCP', level: 'experto', what: 'Retransmisiones: el emisor reenvió un segmento que no fue ACKed a tiempo.', behind: 'tcp.analysis es la familia de expertos del disector TCP: compara seq/ack y cronometra. Retransmisiones masivas = pérdida de paquetes, enlace saturado… o un atacante inyectando.', counts: 'lab: 1 (retransmisión real simulada)' },
  { f: 'tcp.analysis.flags', cat: 'TCP', level: 'experto', what: 'TODOS los avisos de análisis TCP: retransmissions, dup acks, out-of-order, zero window, lost segment…', behind: 'Es un campo-grupo: verdadero si CUALQUIER subflag del experto TCP está activo. Es tu primer filtro al diagnosticar «la red va lenta».', counts: 'lab: 2' },
  { f: 'tcp.window_size < 1000', cat: 'TCP', level: 'experto', what: 'Ventana TCP diminuta: el receptor va ahogado. Zero window = parada total.', behind: 'La ventana (rwnd) es control de flujo. Valores bajos sostenidos indican que la app del receptor no drena — o que un atacante está negociando ventanas pequeñas para saturar.', counts: 'lab: 3' },
  { f: 'tcp.len > 0', cat: 'TCP', level: 'intermedio', what: 'Segmentos con DATOS (no puros ACK de mantenimiento).', behind: 'Filtra el ruido: en una captura típica el 60-80% son ACK vacíos. Con datos, solo el contenido.', counts: 'lab: 40' },
  { f: 'tcp.payload', cat: 'TCP', level: 'experto', what: 'Igual que tcp.len>0 pero a nivel de campo-bytes: cualquier paquete TCP con payload.', behind: 'Existir = no vacío. Se puede encadenar con contains: tcp.payload contains "USER" para credenciales FTP.', counts: 'lab: 40' },
  { f: 'tcp contains "USER"', cat: 'TCP', level: 'experto', what: 'Busca "USER" en el payload TCP crudo — cómo cazar credenciales FTP sin depender del disector.', behind: 'Ver la trampa del FTP: el disector puede confundir la dirección cuando el banner llega sin conexión previa. contains sobre el payload es inmune a eso.', counts: 'lab: 1' },

  /* ── IP / Ethernet / frame ── */
  { f: 'ip.addr == 10.0.0.50', cat: 'IP', level: 'básico', what: 'Paquetes que INVOLUCRAN a esa IP (origen o destino).', behind: 'ip.addr es un pseudocampo doble. Para excluir, usa !(ip.addr == X), nunca ip.addr != X — ver conceptos.' },
  { f: 'ip.src == 10.0.0.50', cat: 'IP', level: 'básico', what: 'Solo paquetes ENVIADOS por esa IP.', behind: 'ip.src e ip.dst son campos únicos por paquete: la comparación es directa, sin la ambigüedad del !=.' },
  { f: 'ip.dst == 10.0.0.50', cat: 'IP', level: 'básico', what: 'Solo paquetes RECIBIDOS por esa IP.', behind: 'Combinar ip.src de la víctima con ip.dst de la víctima te da todo su tráfico bidireccional sin ambigüedades.' },
  { f: 'ip.addr in {10.0.0.0/24}', cat: 'IP', level: 'intermedio', what: 'Cualquier host de la subred /24 (como origen o destino).', behind: 'in con notación CIDR acepta rangos. Es la forma moderna y limpia de subnet filters.', counts: 'lab: 129' },
  { f: 'eth.src == de:ad:be:ef:00:01', cat: 'L2', level: 'intermedio', what: 'Tráfico con esa MAC origen.', behind: 'Los campos eth.src/eth.dst son nivel 2. Útil cuando el atacante spoofea IPs pero no cambia su MAC — la MAC NO miente en ARP spoofing.', counts: 'lab: 2 (el spoofer)' },
  { f: 'ip.proto == 17', cat: 'IP', level: 'intermedio', what: 'Solo UDP (protocolo IP 17). == 6 sería TCP. == 1 ICMP.', behind: 'El campo Protocol de la cabecera IPv4. UDP en capturas raras (C2 por DNS/ NTP) se encuentra así cuando el disector no está claro.', counts: 'lab: 12' },
  { f: 'ip.ttl < 64', cat: 'IP', level: 'experto', what: 'Paquetes con TTL bajo. Un TTL de 128 (Windows) o 64 (Linux) es normal en LAN; TTL < 64 en tráfico interno = el host original usaba TTL 64 y pasó por routers… o TTL inicial menor.', behind: 'El TTL decrementa en cada salto. Cambios bruscos de TTL en la misma conversación = routing asimétrico o spoofing.', counts: 'lab: 1 (paquete ICMP con TTL=1 forzado)' },
  { f: 'ip.flags.mf == 1', cat: 'IP', level: 'experto', what: 'Paquetes FRAGMENTADOS (More Fragments = 1): IP fragmentó el datagrama.', behind: 'El bit MF de la cabecera IP. Fragmentación inesperada es un indicador de evasión de IDS o de ataques clásicos de fragment overlap. Compara con ip.flags.df (Don\'t Fragment).', counts: 'lab: 1' },
  { f: 'frame.number == 1', cat: 'frame', level: 'básico', what: 'El paquete número 1 (o el que digas).', behind: 'frame.number es el índice secuencial de la captura. Cámbialo por el paquete que estés viendo. Combínalo: frame.number in {1..10} para rangos.', counts: 'lab: 1' },
  { f: 'frame.time >= "2025-01-01"', cat: 'frame', level: 'intermedio', what: 'Paquetes desde una fecha/hora (o hasta, con <=).', behind: 'frame.time es el timestamp de captura en formato string parseable. Muy útil en capturas largas: acota por ventana temporal.' },
  { f: 'frame.len > 1500', cat: 'frame', level: 'experto', what: 'Paquetes grandes (jumbos, o fragmentos IP que suman más que el MTU).', behind: 'frame.len es el tamaño total nivel 2. Tamaños raros (paquetes de 60 bytes síncronos y repetidos) delatan escáneres y beacons.' },
  { f: 'frame contains "admin"', cat: 'frame', level: 'experto', what: 'Texto en crudo en CUALQUIER paquete.', behind: 'El dragnet definitivo: no depende de disectores ni puertos. Case-sensitive; usa matches "admin" (en PCRE el [Aa] sí se puede) para mayúsculas/minúsculas.' },

  /* ── TLS ── */
  { f: 'tls', cat: 'TLS', level: 'básico', what: 'Todo tráfico TLS (handshakes, app data, alerts).', behind: 'El disector TLS reconoce record layer: content types 20-23 (CCS, alert, handshake, app data).', counts: 'lab: 6 · real: 0' },
  { f: 'tls.handshake.type == 1', cat: 'TLS', level: 'intermedio', what: 'ClientHello: el INICIO de cada sesión TLS.', behind: 'Los tipos de handshake: 1=ClientHello, 2=ServerHello, 11=Certificate, 12=ServerKeyExchange, 14=ServerHelloDone, 16=ClientKeyExchange. Con 1 ves quién INICIÓ cifrado y con quién (SNI).', counts: 'lab: 3' },
  { f: 'tls.handshake.extensions_server_name', cat: 'TLS', level: 'experto', what: 'EL SNI: el dominio que el cliente pide DENTRO del cifrado (va en claro en el ClientHello).', behind: 'La extensión server_name del ClientHello. Es el campo más valioso del TLS cifrado: aunque no veas el contenido, SÍ ves a qué dominio iba. Detecta C2 que usan dominios legitimos para blanquear tráfico.', counts: 'lab: 3 SNI distintos (www.ejemplo-pirata.com, c2.malware-zona.com, google.com)' },
  { f: 'tls.record.content_type == 22', cat: 'TLS', level: 'experto', what: 'Records de tipo Handshake (22). 23 = Application Data (el cifrado real). 21 = Alert.', behind: 'El primer byte de cada TLS record. Filtrar por 23 te da el grueso cifrado; por 22 los handshakes; por 21 los alerts (errores TLS, conexiones abortadas).', counts: 'lab: 6' },

  /* ── ARP / ICMP ── */
  { f: 'arp', cat: 'ARP/ICMP', level: 'básico', what: 'Todo ARP (requests, replies, gratuitous).', behind: 'ARP no tiene puertos: es nivel 2 puro. El disector lo marca directamente.', counts: 'lab: 3 · real: 2' },
  { f: 'arp.isgratuitous', cat: 'ARP/ICMP', level: 'intermedio', what: 'ARP gratuitous: anuncios sin request (cambio de IP, failover, o el inicio de un MITM).', behind: 'El disector lo deduce: opcode 2 (reply) sin request previo asociado. Un ARP gratuitous anunciando la IP del ROUTER = ARP spoofing al canto.', counts: 'lab: 1' },
  { f: 'arp.duplicate-address-detected', cat: 'ARP/ICMP', level: 'experto', what: 'Wireshark DETECTA que una IP aparece con DOS MACs distintas: MITM/spoofing automático.', behind: 'El experto ARP cruza cada reply con su history. Si disparó, alguien está suplantando — en el lab, el atacante de:ad:be:ef:00:01 suplantando al gateway 10.0.0.1.', counts: 'lab: 2' },
  { f: 'arp.opcode == 1', cat: 'ARP/ICMP', level: 'básico', what: 'ARP requests (1). Replies son opcode 2.', behind: 'El campo h/w opcode del frame ARP. Requests son broadcast (ff:ff:ff:ff:ff:ff); replies unicast.' },
  { f: 'icmp', cat: 'ARP/ICMP', level: 'nivel 0', what: 'Todo ICMP (ping, unreachable, TTL exceeded…).', behind: 'C2 por ICMP (data escondida en payload de echo) existe: revisa payloads raros en pings que no son de diagnóstico.', counts: 'lab: 6' },
  { f: 'icmp.type == 8', cat: 'ARP/ICMP', level: 'básico', what: 'Echo Request (ping). 0 = Echo Reply. 3 = Destination Unreachable. 11 = TTL Exceeded.', behind: 'El primer byte del mensaje ICMP. Un flood de type 8 = ping flood; un mixto 8/0 normal es salud de red.', counts: 'lab: 2' },
  { f: 'icmp.type == 3', cat: 'ARP/ICMP', level: 'intermedio', what: 'Destination Unreachable: algo NO está accesible.', behind: 'Con code: 0=network, 1=host, 3=port, 4=frag needed, 13=admin (firewall). Un 3/13 significa «bloqueado por firewall» — pista de contención.', counts: 'lab: 1' },

  /* ── Otros protocolos ── */
  { f: 'ftp', cat: 'otros', level: 'básico', what: 'Todo FTP (credenciales y transferencias en CLARO).', behind: 'El disector FTP mira los comandos (USER, PASS, RETR…) en el canal de control 21. VER LA TRAMPA del ftp.request.command más abajo.', counts: 'lab: 6' },
  { f: 'ftp contains "PASS"', cat: 'otros', level: 'intermedio', what: 'El comando PASS de FTP en el payload crudo — la forma fiable de cazar credenciales FTP.', behind: 'VERIFICADO: ftp.request.command == "PASS" dio 0 resultados en el lab porque el disector FTP clasificó todo como Response (el banner llegó sin conexión previa y confundió la dirección). contains NO depende del disector. Ambos se documentan; el contains es el que salva.', counts: 'lab: 2' },
  { f: 'telnet', cat: 'otros', level: 'básico', what: 'Todo Telnet: una terminal en claro con usuario y contraseña visibles.', behind: 'El disector Telnet marca los streams. Con Follow TCP Stream ves literalmente admin/Secret123 tecleado — es el ejemplo perfecto de por qué telnet no existe ya.', counts: 'lab: 5' },
  { f: 'data.data', cat: 'otros', level: 'intermedio', what: 'Paquetes cuyo payload Wireshark NO supo disseccionar (protocolo desconocido o cifrado sin handshake visible).', behind: 'data es el disector de último recurso. Payload desconocido + puerto raro + timing regular = C2 custom. Es donde empieza el análisis manual (strings, exportar, reversing).', counts: 'lab: 7' },
  { f: 'dhcp', cat: 'otros', level: 'básico', what: 'Tráfico DHCP: discovers, offers, requests, acks.', behind: 'DHCP (UDP 67/68) en versiones modernas de Wireshark se llama dhcp (antes bootp). El hostname que el cliente envía en el discover es un artefacto de identificación.', counts: 'lab: 2' },
  { f: 'ntp', cat: 'otros', level: 'básico', what: 'NTP: sincronización horaria.', behind: 'Poca gente lo mira, pero el C2 a veces usa NTP para beat (frecuencia baja, pasa desapercibido) y la hora del servidor NTP contextualiza TODA la captura.', counts: 'lab: 1' },
  { f: '_ws.col.info contains "beacon"', cat: 'experto', level: 'experto', what: 'Busca texto en la COLUMNA Info de la interfaz — útil para lo que el disector resumió pero no etiquetó como campo.', behind: '_ws.col.info (antes _ws.col.Info) es el campo de la columna Info. En tshark también se puede extraer: -e _ws.col.info. La coincidencia exacta de mayúsculas depende de la versión: en 4.x el campo canónico es _ws.col.info.', },
  { f: 'not (arp or dns)', cat: 'experto', level: 'intermedio', what: 'Todo MENOS el ruido de fondo: ARP chatty y DNS constante. El «limpiador» para ver el tráfico importante.', behind: 'La negación con paréntesis agrupa. Combínalo con otros: not (arp or dns or ntp or dhcp) para quedarte con lo conversacional.', counts: 'lab: 140' },
  { f: 'udp.port == 53', cat: 'otros', level: 'básico', what: 'DNS por puerto (equivalente a dns en la mayoría de casos).', behind: 'Útil cuando el DNS va por TCP/53 (transferencias de zona, respuestas grandes) o cuando quieres el puerto sin el disector.', counts: 'lab: 9' },
]

/* ─── Trucos de experto (CLI y GUI) ─── */

export interface WiTrick {
  title: string
  body: string
  cmds: string[]
  expect?: string
}

export const WI_TRICKS: WiTrick[] = [
  {
    title: 'tshark: Wireshark sin GUI (el 90% del trabajo real)',
    body: 'tshark es la CLI de Wireshark: mismos disectores, mismos filtros, pero scriptable. La forma -T fields -e campo1 -e campo2 convierte la captura en CSV al instante.',
    cmds: [
      'tshark -r captura.pcap -Y "http.request" -T fields -e frame.number -e http.request.method -e http.host -e http.request.uri',
      '# -Y = display filter · -T fields = salida tabular · -e = campos a extraer',
      'tshark -r captura.pcap -Y "http" --export-objects http,/tmp/objs',
      '# descarga TODOS los ficheros servidos por HTTP a /tmp/objs (verificado: gate.php x4)',
    ],
    expect: 'La primera imprime una fila por petición HTTP con nº de paquete, método, host y URI. La segunda crea /tmp/objs con los ficheros reconstruidos del cuerpo de las respuestas — en el lab, gate.php apareció 4 veces.',
  },
  {
    title: 'Follow TCP Stream (ver la CONVERSACIÓN, no los paquetes)',
    body: 'El TCP reensambla: Follow TCP Stream (GUI) o -z follow (CLI) une ambos sentidos en texto plano. Es donde las credenciales y las conversaciones de C2 saltan a la vista.',
    cmds: [
      'tshark -r captura.pcap -q -z follow,tcp,ascii,0',
      '# stream 0 en ascii. Cambia 0 por el índice del stream que quieras.',
      'tshark -r captura.pcap -q -z follow,tcp,raw,0 | xxd | head',
      '# modo raw = bytes exactos, para binarios o para grepear en hex',
    ],
    expect: 'Salida con los dos sentidos marcados (por defecto, indentación distinta). En el lab, el stream del login mostraba el POST completo con username=admin&password=P@ssw0rd1.',
  },
  {
    title: 'Estadísticas: el mapa antes de entrar al detalle',
    body: 'Nunca empieces paquete a paquete. Las estadísticas te dicen QUÉ protocolos hay, QUIÉN habla con QUIÉN y CUÁNTO — en segundos.',
    cmds: [
      'tshark -r captura.pcap -q -z io,phs            # jerarquía de protocolos (protocol hierarchy statistics)',
      'tshark -r captura.pcap -q -z conv,tcp           # conversaciones TCP (pares IP:puerto + bytes)',
      'tshark -r captura.pcap -q -z endpoints,ip       # endpoints IP únicos',
      'tshark -r captura.pcap -q -z expert             # avisos del experto (checksums, retransmisiones, duplicados...)',
      'tshark -r captura.pcap -Y "http" -q -z io,phs   # la misma estadística PERO solo de lo que pasa el filtro',
    ],
    expect: 'io,phs imprime el árbol % de cada protocolo (en el lab: TCP 100%, HTTP 9%, DNS 6%, TLS 4%…). expert lista warns tipo «Duplicate IP address detected» (¡el ARP spoof!) y «Connection reset».',
  },
  {
    title: 'capinfos, editcap y mergecap: la logística de capturas',
    body: 'capinfos da metadatos del archivo (nº de paquetes, duración, tipo). editcap corta/ filtra en tiempo (split, -A/-B por rango temporal). mergecap junta capturas de varias sondas — imprescindible en incidentes multi-sensor.',
    cmds: [
      'capinfos captura.pcap',
      'editcap -A "2024-01-24 10:00:00" -B "2024-01-24 10:05:00" grande.pcap ventana.pcap',
      'editcap -c 5000 grande.pcap trozos.pcap        # trocea en ficheros de 5000 paquetes',
      'mergecap -w unida.pcap sonda1.pcap sonda2.pcap',
    ],
    expect: 'capinfos imprime Number of packets, File type, Capture duration… El resto no modifica el original: escriben ficheros nuevos (¡editcap sin -w te lo recuerda!).',
  },
  {
    title: 'GeoIP y endpoints: quiénes son los extremos',
    body: 'Wireshark puede enriquecer IPs con geo/localización si le cargas las bases MaxMind. En CLI, -z endpoints,ip ya te da el listado; cruza con whois/ los TIPOS de ASN para clasificar rápido.',
    cmds: [
      'tshark -r captura.pcap -q -z endpoints,ip',
      'whois 212.230.153.91 | grep -iE "netname|country|org"',
    ],
    expect: 'En el volcado de RAM del caso ksdb.raw, netscan mostró una conexión ESTABLISHED a 212.230.153.91:80 — el siguiente paso natural es whois para saber de quién es esa IP.',
  },
  {
    title: 'De RAM a red y de red a disco: la triada',
    body: 'El análisis serio cruza las tres fuentes: netscan de Volatility (conexiones en el instante del dump), PCAP (qué se envió) y disco (qué fichero lo hizo). Un dominio C2 hallado en el PCAP se busca luego en strings de la RAM y en EVTX/historiales del disco.',
    cmds: [
      'vol -f dump.raw windows.netscan | grep ESTABLISHED   # quién estaba conectado',
      'tshark -r captura.pcap -Y "dns.qry.name contains \\"malware-zona\\""',
      'strings dump.raw | grep "malware-zona"               # ¿la RAM lo recuerda también?',
    ],
    expect: 'Si las tres fuentes mencionan el mismo dominio/IP, tienes un IOC sólido con triple fuente. Es el estándar del reporting forense.',
  },
]

/* ─── Ruta de aprendizaje ─── */

export const WI_PATH = [
  { level: 'Nivel 0 — nunca has abierto Wireshark', goals: ['Instala Wireshark/tshark (en Kali ya vienen).', 'Captura 30s de tu propio tráfico (o abre un .pcap de muestra) y OBSERVA la estructura: frame → eth → ip → tcp/udp → http.', 'Aprende el truco de clicar un byte y ver qué campo es en la barra inferior.', 'Usa Apply as Filter con el botón derecho sobre cualquier campo: es como APRENDER el lenguaje sin memorizarlo.'], filters: ['http', 'dns', 'tcp.port == 80', 'icmp'] },
  { level: 'Nivel 1 — básico operativo', goals: ['Entiende display vs capture filter.', 'Distingue SYN / SYN-ACK / FIN / RST: el ciclo de vida TCP.', 'Sigue un TCP Stream y entiende por qué el reensamblado revela lo que los paquetes sueltos no muestran.', 'Saca estadísticas (io,phs, conv,tcp) SIEMPRE antes de filtrar.'], filters: ['tcp.flags.syn == 1 && tcp.flags.ack == 0', 'tcp.stream eq 0', 'http.request.method == "POST"', 'dns.flags.response == 0'] },
  { level: 'Nivel 2 — intermedio / día a día', goals: ['Caza credenciales en claro (POST, FTP, telnet) con filtros y con contains.', 'Detecta beaconing: mismo host + mismo dominio + intervalos regulares (http.host, io,stat).', 'Detecta MITM por ARP (duplicate-address-detected, isgratuitous).', 'Domina tshark -T fields para exportar a CSV y automatizar.'], filters: ['http.user_agent contains "MSIE"', 'arp.duplicate-address-detected', 'tcp.analysis.flags', 'ip.addr in {10.0.0.0/24}'] },
  { level: 'Nivel 3 — experto / DFIR', goals: ['Extrae objetos (export-objects) y ficheros maliciosos desde el PCAP.', 'Analiza TLS cifrado vía SNI (extensions_server_name) y detección de C2 por dominio.', 'Cruza fuentes: PCAP + Volatility netscan + logs del disco.', 'Escribe tus propios perfiles de color y columnas (header: _ws.col.info) para acelerar tu flujo.'], filters: ['tls.handshake.extensions_server_name', 'tcp.window_size < 1000', 'ip.flags.mf == 1', 'dns.qry.type == 16'] },
]

export const WI_NOTE =
  'Cada filtro de este catálogo fue EJECUTADO con tshark 4.6.2 (Kali Linux) contra dos capturas: un laboratorio sintético de 154 paquetes con escenas de ataque (beaconing C2, login en claro, ARP spoofing, escaneo SYN, FTP/Telnet con credenciales, exfiltración DNS por TXT) y un PCAP real de análisis de incidente (238 paquetes). El número entre paréntesis es cuántos paquetes coincidieron en cada una — para que sepas qué esperar cuando TÚ lo ejecutes.'
