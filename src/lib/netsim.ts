/* Diseñador de topologías de red — modelo y lógica (el canvas es SVG en la UI).
   Nodos: router, firewall, switch, switch-core, servidor, pc, laptop, ap, nube, movil, impresora, iot.
   Enlaces: ethernet, fibra, wifi, vpn — con velocidad y tipo. 100% local, export PNG. */

export type NodeKind =
  | 'internet' | 'router' | 'firewall' | 'switch-core' | 'switch' | 'server'
  | 'pc' | 'laptop' | 'ap' | 'mobile' | 'printer' | 'iot' | 'camera'

export type LinkKind = 'ethernet' | 'fibra' | 'wifi' | 'vpn'

export interface SimNode {
  id: string
  kind: NodeKind
  x: number
  y: number
  label: string
  ip?: string
  vlan?: string
}

export interface SimLink {
  id: string
  from: string
  to: string
  kind: LinkKind
  speed: string
  trunk?: boolean
}

export interface Topology {
  name: string
  nodes: SimNode[]
  links: SimLink[]
}

export const NODE_META: Record<NodeKind, { label: string; icon: string; color: string; layer: number; size: number }> = {
  internet: { label: 'Internet', icon: '☁️', color: '#64748b', layer: 0, size: 34 },
  router: { label: 'Router', icon: '🌐', color: '#2ee88a', layer: 1, size: 28 },
  firewall: { label: 'Firewall', icon: '🛡️', color: '#f43f5e', layer: 1, size: 28 },
  'switch-core': { label: 'Switch Core', icon: '⚡', color: '#f59e0b', layer: 2, size: 26 },
  switch: { label: 'Switch', icon: '🔀', color: '#eab308', layer: 3, size: 24 },
  server: { label: 'Servidor', icon: '🖥️', color: '#38bdf8', layer: 4, size: 24 },
  pc: { label: 'PC', icon: '💻', color: '#22d3ee', layer: 4, size: 20 },
  laptop: { label: 'Laptop', icon: '💼', color: '#22d3ee', layer: 4, size: 20 },
  ap: { label: 'Access Point', icon: '📶', color: '#a78bfa', layer: 3, size: 22 },
  mobile: { label: 'Móvil', icon: '📱', color: '#94a3b8', layer: 5, size: 18 },
  printer: { label: 'Impresora', icon: '🖨️', color: '#94a3b8', layer: 5, size: 18 },
  iot: { label: 'IoT', icon: '📡', color: '#94a3b8', layer: 5, size: 18 },
  camera: { label: 'Cámara IP', icon: '📷', color: '#94a3b8', layer: 5, size: 18 },
}

export const LINK_META: Record<LinkKind, { label: string; color: string; dash?: string; speed: string[] }> = {
  ethernet: { label: 'Ethernet (UTP)', color: '#2ee88a', speed: ['100 Mbps', '1 Gbps', '2.5 Gbps', '10 Gbps'] },
  fibra: { label: 'Fibra óptica', color: '#f59e0b', dash: '6 3', speed: ['1 Gbps', '10 Gbps', '40 Gbps'] },
  wifi: { label: 'WiFi', color: '#a78bfa', dash: '2 4', speed: ['WiFi 4', 'WiFi 5', 'WiFi 6', 'WiFi 6E', 'WiFi 7'] },
  vpn: { label: 'VPN / túnel', color: '#38bdf8', dash: '8 4 2 4', speed: ['WireGuard', 'IPsec', 'OpenVPN', 'SSL/TLS'] },
}

/* ───────── presets ───────── */

export const PRESETS: Record<string, { name: string; desc: string; nodes: [NodeKind, string, string?][]; links: [string, string, LinkKind, string][] }> = {
  hogar: {
    name: 'Red doméstica típica',
    desc: 'Router ISP + WiFi + dispositivos de casa. El punto de partida de todo.',
    nodes: [
      ['internet', 'Internet'],
      ['router', 'Router ISP', '192.168.1.1'],
      ['ap', 'AP WiFi', '192.168.1.2'],
      ['laptop', 'Laptop trabajo', '192.168.1.50'],
      ['mobile', 'Móvil', '192.168.1.51'],
      ['iot', 'TV/IoT', '192.168.1.60'],
      ['printer', 'Impresora', '192.168.1.61'],
    ],
    links: [
      ['n1', 'n2', 'ethernet', '1 Gbps'],
      ['n2', 'n3', 'wifi', 'WiFi 6'],
      ['n2', 'n4', 'wifi', 'WiFi 5'],
      ['n2', 'n5', 'wifi', 'WiFi 6'],
      ['n2', 'n6', 'wifi', 'WiFi 4'],
      ['n2', 'n7', 'ethernet', '100 Mbps'],
    ],
  },
  pyme: {
    name: 'Pyme con VLANs',
    desc: 'Firewall + switch core + switches de acceso con separación admin/usuarios/invitados.',
    nodes: [
      ['internet', 'Internet'],
      ['firewall', 'Firewall', '10.0.0.1'],
      ['switch-core', 'Core SW', '10.0.0.2'],
      ['switch', 'SW Oficina', '10.0.10.2'],
      ['switch', 'SW Invitados', '10.0.20.2'],
      ['server', 'Servidor ficheros', '10.0.30.10'],
      ['pc', 'PC admin', '10.0.10.100'],
      ['pc', 'PC contable', '10.0.10.101'],
      ['ap', 'AP invitados', '10.0.20.3'],
      ['mobile', 'Móvil invitado', '10.0.20.50'],
    ],
    links: [
      ['n1', 'n2', 'fibra', '1 Gbps'],
      ['n2', 'n3', 'fibra', '10 Gbps'],
      ['n3', 'n4', 'fibra', '1 Gbps'],
      ['n3', 'n5', 'fibra', '1 Gbps'],
      ['n3', 'n6', 'ethernet', '1 Gbps'],
      ['n4', 'n7', 'ethernet', '1 Gbps'],
      ['n4', 'n8', 'ethernet', '1 Gbps'],
      ['n5', 'n9', 'ethernet', '1 Gbps'],
      ['n9', 'n10', 'wifi', 'WiFi 6'],
    ],
  },
  laboratorio: {
    name: 'Laboratorio de pentesting',
    desc: 'Red aislada con atacante, objetivo vulnerable y VPN de laboratorio.',
    nodes: [
      ['internet', 'Internet (solo updates)', '192.168.100.1'],
      ['firewall', 'FW lab (aislado)', '192.168.100.1'],
      ['switch', 'SW lab', '192.168.100.2'],
      ['laptop', 'Kali atacante', '192.168.100.66'],
      ['server', 'Metasploitable', '192.168.100.99'],
      ['pc', 'Windows target', '192.168.100.120'],
    ],
    links: [
      ['n1', 'n2', 'ethernet', '1 Gbps'],
      ['n2', 'n3', 'ethernet', '1 Gbps'],
      ['n3', 'n4', 'ethernet', '1 Gbps'],
      ['n3', 'n5', 'ethernet', '1 Gbps'],
      ['n3', 'n6', 'ethernet', '1 Gbps'],
    ],
  },
  sucursal: {
    name: 'Sucursal con VPN site-to-site',
    desc: 'Dos sedes unidas por túnel WireGuard/IPsec.',
    nodes: [
      ['internet', 'Internet'],
      ['router', 'Router HQ', '10.1.0.1'],
      ['router', 'Router Sucursal', '10.2.0.1'],
      ['switch', 'SW HQ', '10.1.0.2'],
      ['switch', 'SW Sucursal', '10.2.0.2'],
      ['server', 'Server central', '10.1.0.10'],
      ['pc', 'PC sucursal', '10.2.0.50'],
    ],
    links: [
      ['n1', 'n2', 'fibra', '1 Gbps'],
      ['n1', 'n3', 'fibra', '1 Gbps'],
      ['n2', 'n3', 'vpn', 'WireGuard'],
      ['n2', 'n4', 'ethernet', '1 Gbps'],
      ['n3', 'n5', 'ethernet', '1 Gbps'],
      ['n4', 'n6', 'ethernet', '1 Gbps'],
      ['n5', 'n7', 'ethernet', '1 Gbps'],
    ],
  },
}

/* posiciones por defecto en capas (para que el preset se vea organizado al cargar) */
export function presetToTopology(presetId: string): Topology {
  const p = PRESETS[presetId]
  const layers = new Map<number, SimNode[]>()
  const nodes: SimNode[] = p.nodes.map(([kind, label, ip], i) => {
    const meta = NODE_META[kind]
    const n: SimNode = { id: `n${i + 1}`, kind, label, ip, x: 0, y: 0 }
    const arr = layers.get(meta.layer) ?? []
    arr.push(n)
    layers.set(meta.layer, arr)
    return n
  })
  // distribuir por capas: y = capa*90+60, x centrado
  const W = 900
  for (const arr of layers.values()) {
    arr.forEach((n, i) => {
      n.x = W / 2 + (i - (arr.length - 1) / 2) * 130
      n.y = 60 + NODE_META[n.kind].layer * 92
    })
  }
  const links: SimLink[] = p.links.map(([from, to, kind, speed], i) => ({
    id: `l${i + 1}`, from, to, kind, speed,
  }))
  return { name: p.name, nodes, links }
}

/* ───────── validación y análisis ───────── */

export interface TopoIssue {
  tone: 'bad' | 'warn' | 'info' | 'ok'
  text: string
}

export function analyzeTopology(t: Topology): TopoIssue[] {
  const issues: TopoIssue[] = []
  const byKind = (k: NodeKind) => t.nodes.filter((n) => n.kind === k)
  const linked = new Set(t.links.flatMap((l) => [l.from, l.to]))
  const degree = (id: string) => t.links.filter((l) => l.from === id || l.to === id).length

  const internet = byKind('internet')
  const routers = byKind('router')
  const fws = byKind('firewall')
  const switches = t.nodes.filter((n) => n.kind === 'switch' || n.kind === 'switch-core')
  const aps = byKind('ap')
  const servers = byKind('server')

  if (t.nodes.length === 0) issues.push({ tone: 'info', text: 'Topología vacía: añade nodos o carga un preset.' })

  // nodos sueltos
  const orphans = t.nodes.filter((n) => !linked.has(n.id) && t.nodes.length > 1)
  for (const o of orphans) issues.push({ tone: 'warn', text: `"${o.label}" no está conectado a nada` })

  // cadena internet
  if (internet.length === 0 && t.nodes.length > 2) issues.push({ tone: 'info', text: 'No hay nodo de Internet: la red parece aislada (puede ser intencional en labs).' })
  if (internet.length > 1) issues.push({ tone: 'warn', text: 'Hay más de un nodo de Internet: salidas múltiples (multi-WAN) o error de diseño.' })
  if (internet.length === 1 && routers.length + fws.length === 0) issues.push({ tone: 'bad', text: 'Dispositivos conectados a Internet SIN router ni firewall: riesgo crítico.' })
  if (routers.length + fws.length > 0 && fws.length === 0) issues.push({ tone: 'warn', text: 'No hay firewall entre la red interna e Internet: mínimo un ACL en el router.' })
  if (fws.length >= 1 && routers.length === 0) issues.push({ tone: 'info', text: 'Firewall sin router: el firewall hará de gateway (válido en SOHO).' })

  // switches
  for (const s of switches) {
    if (degree(s.id) < 2 && switches.length > 1) issues.push({ tone: 'warn', text: `Switch "${s.label}" colgado con una sola conexión: escala o elimínalo` })
  }
  // APs sin switch/router
  for (const ap of aps) {
    const parents = t.links.filter((l) => l.from === ap.id || l.to === ap.id).map((l) => (l.from === ap.id ? l.to : l.from))
    if (parents.every((p) => byKind('pc').concat(byKind('laptop'), byKind('mobile'), byKind('iot')).some((c) => c.id === p)))
      issues.push({ tone: 'info', text: `AP "${ap.label}" solo conecta a clientes: deberían ver el AP desde el router por cable` })
  }
  // duplicidad IP
  const ips = new Map<string, string[]>()
  for (const n of t.nodes) {
    if (!n.ip) continue
    ips.set(n.ip, [...(ips.get(n.ip) ?? []), n.label])
  }
  for (const [ip, who] of ips) if (who.length > 1) issues.push({ tone: 'bad', text: `IP duplicada ${ip}: ${who.join(', ')}` })

  // servo sin protección
  if (servers.length > 0 && fws.length === 0) issues.push({ tone: 'warn', text: 'Servidores en red sin firewall: al menos segmenta con VLANs' })

  if (issues.length === 0) issues.push({ tone: 'ok', text: 'Topología coherente: sin avisos de diseño detectados.' })
  return issues
}

/* ───────── materiales (BOM) ───────── */

export interface BomRow {
  item: string
  qty: number
  note: string
}

export function topologyBom(t: Topology): BomRow[] {
  const rows: BomRow[] = []
  const count = (k: NodeKind) => t.nodes.filter((n) => n.kind === k).length
  const linkMeters = t.links.length * 8 // estimación media 8m por enlace

  if (count('switch') + count('switch-core') > 0) rows.push({ item: 'Switches', qty: count('switch') + count('switch-core'), note: 'con PoE si alimentas APs/cámaras' })
  if (count('router')) rows.push({ item: 'Routers', qty: count('router'), note: 'gateway + NAT' })
  if (count('firewall')) rows.push({ item: 'Firewalls', qty: count('firewall'), note: 'reglas de salida y segmentación' })
  if (count('ap')) rows.push({ item: 'Access Points', qty: count('ap'), note: 'PoE y mismo SSID con canales no solapados' })
  if (count('server')) rows.push({ item: 'Servidores', qty: count('server'), note: 'RAID y backups 3-2-1' })
  if (count('pc') + count('laptop')) rows.push({ item: 'Puestos de trabajo', qty: count('pc') + count('laptop'), note: 'con agente EDR' })
  if (count('iot') + count('camera') + count('printer')) rows.push({ item: 'Dispositivos IoT/printers/cámaras', qty: count('iot') + count('camera') + count('printer'), note: 'VLAN aislada obligatoria' })
  if (t.links.some((l) => l.kind === 'ethernet')) rows.push({ item: 'Cable UTP Cat6', qty: linkMeters, note: `~${linkMeters} m estimados (8 m/enlace)` })
  if (t.links.some((l) => l.kind === 'fibra')) rows.push({ item: 'Latiguillos fibra LC-LC OM4', qty: t.links.filter((l) => l.kind === 'fibra').length, note: 'más transceptores SFP compatibles' })
  if (t.links.some((l) => l.kind === 'wifi')) rows.push({ item: 'Canales WiFi planificados', qty: t.links.filter((l) => l.kind === 'wifi').length, note: '1/6/11 en 2.4 GHz, DFS en 5 GHz' })
  if (t.links.some((l) => l.kind === 'vpn')) rows.push({ item: 'Túneles VPN', qty: t.links.filter((l) => l.kind === 'vpn').length, note: 'claves rotadas y peer↔peer documentados' })
  return rows
}

/* ───────── serialización ───────── */

export const topologyToJson = (t: Topology): string => JSON.stringify(t, null, 2)

export const jsonToTopology = (json: string): Topology | null => {
  try {
    const t = JSON.parse(json) as Topology
    if (!Array.isArray(t.nodes) || !Array.isArray(t.links)) return null
    return t
  } catch {
    return null
  }
}

export const uid = (prefix: string): string => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
