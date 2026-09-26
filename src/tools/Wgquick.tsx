import { useMemo, useState } from 'react'
import { Waypoints } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, CopyBlock, InfoBanner, useToast } from '../components/ui'

/* Nota: la generación de claves Curve25519 real requiere libsodium o similar.
   Aquí generamos un esqueleto con placeholders seguros y comandos wg genkey
   reales para el servidor — la herramienta enseña la secuencia correcta. */

interface Peer {
  id: string
  name: string
  ip: string
  keepalive: boolean
}

export default function Wgquick() {
  const [iface, setIface] = useState('wg0')
  const [serverPort, setServerPort] = useState('51820')
  const [serverSubnet, setServerSubnet] = useState('10.66.66.1/24')
  const [serverPub, setServerPub] = useState('')
  const [serverPriv, setServerPriv] = useState('')
  const [clientDns, setClientDns] = useState('1.1.1.1, 8.8.8.8')
  const [allowedIps, setAllowedIps] = useState('0.0.0.0/0')
  const [peers, setPeers] = useState<Peer[]>([
    { id: 'p1', name: 'laptop', ip: '10.66.66.2', keepalive: true },
    { id: 'p2', name: 'movil', ip: '10.66.66.3', keepalive: true },
  ])
  const toast = useToast()

  const serverConf = useMemo(() => {
    const L = [
      '# /etc/wireguard/wg0.conf (servidor)',
      `[Interface]`,
      `PrivateKey = ${serverPriv || '<pega aquí: wg genkey | tee server.key | wg pubkey > server.pub>'}`,
      `Address = ${serverSubnet}`,
      `ListenPort = ${serverPort}`,
      '',
      '# optimización MTU si haces túnel sobre PPPoE/4G: pruébalo con ping -M do -s 1372',
      'MTU = 1420',
      '',
    ]
    for (const p of peers) {
      L.push(`# peer: ${p.name}`)
      L.push(`[Peer]`)
      L.push(`PublicKey = <clave pública de ${p.name}: cat ${p.name}.pub>`)
      L.push(`AllowedIPs = ${p.ip}/32`)
      if (p.keepalive) L.push(`PersistentKeepalive = 25`)
      L.push('')
    }
    return L.join('\n')
  }, [serverPriv, serverSubnet, serverPort, peers])

  const clientConf = (p: Peer) => {
    const serverWan = '<IP pública del servidor o DDNS>'
    return `# /etc/wireguard/${iface}.conf en "${p.name}" (cliente)
[Interface]
PrivateKey = <clave privada de ${p.name}: wg genkey | tee ${p.name}.key | wg pubkey > ${p.name}.pub>
Address = ${p.ip}/24
DNS = ${clientDns}

[Peer]
PublicKey = ${serverPub || '<la server.pub del servidor>'}
Endpoint = ${serverWan}:${serverPort}
AllowedIPs = ${allowedIps}
${p.keepalive ? 'PersistentKeepalive = 25\n' : ''}
# AllowedIPs es EL Router DE WireGuard:
#   0.0.0.0/0            → TODO el tráfico por la VPN (túnel completo)
#   10.66.66.0/24        → solo la red del servidor (split tunnel)
#   0.0.0.0/0, ::/0      → túnel completo dual stack
`
  }

  const addPeer = () => {
    const nextIp = `10.66.66.${peers.length + 2}`
    setPeers((ps) => [...ps, { id: `p${Date.now()}`, name: `peer${peers.length + 1}`, ip: nextIp, keepalive: true }])
  }

  const updatePeer = (id: string, patch: Partial<Peer>) => setPeers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const deploy = `# en el SERVIDOR (Debian/Ubuntu):
apt install wireguard
wg genkey | tee /root/server.key | wg pubkey > /root/server.pub
chmod 600 /root/server.key
# pega PrivateKey en wg0.conf y sube la interfaz:
wg-quick up ${iface}
systemctl enable wg-quick@${iface}

# en cada CLIENTE:
wg genkey | tee /root/${'{'}peer${'}'}.key | wg pubkey > /root/${'{'}peer${'}'}.pub
# añade la pub del peer al servidor (línea [Peer]) y la server.pub al cliente
wg-quick up ${iface}

# verificación:
wg show                    # handshakes, transferencia, peers activos
ping 10.66.66.1            # alcanza el extremo del túnel
curl ifconfig.me           # desde el cliente: debe devolver la IP del SERVIDOR
`

  const firewall = `# si el servidor también filtra (nftables/ufw), abre el puerto UDP:
ufw allow ${serverPort}/udp
# o nft: add rule inet filter input udp dport ${serverPort} accept

# forwarding para que los clientes salgan a internet por el servidor:
sysctl -w net.ipv4.ip_forward=1
nft add table ip nat; nft add chain ip nat postrouting '{ type nat hook postrouting priority 100; }'
nft add rule ip nat postrouting oifname "eth0" masquerade
`

  return (
    <div>
      <ToolHeader icon={Waypoints} title="WireGuard Config" desc="Configuración completa de túnel WireGuard: servidor + N peers con claves, AllowedIPs explicado, MTU, firewall y NAT para salida a internet" />

      <InfoBanner>
        <b>WireGuard</b> es la VPN moderna: ~4.000 líneas de código, Curve25519, handshake de 1,5 RTT y roaming entre redes sin caerse. Esta tool genera el esqueleto correcto; las claves <b>se generan en tu servidor</b> con <span className="font-mono">wg genkey</span> (nunca las pegues en webs de terceros, ¡esta incluida!). El campo <span className="font-mono">AllowedIPs</span> es a la vez tabla de enrutado y ACL — entiéndelo antes de desplegar.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-grey">parámetros del túnel</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="interfaz">
              <TextInput value={iface} onChange={(e) => setIface(e.target.value)} className="font-mono" />
            </Field>
            <Field label="puerto UDP del servidor">
              <TextInput value={serverPort} onChange={(e) => setServerPort(e.target.value)} className="font-mono" />
            </Field>
            <Field label="subnet VPN (IP del servidor)">
              <TextInput value={serverSubnet} onChange={(e) => setServerSubnet(e.target.value)} className="font-mono" />
            </Field>
            <Field label="DNS para los clientes">
              <TextInput value={clientDns} onChange={(e) => setClientDns(e.target.value)} className="font-mono" />
            </Field>
            <Field label="AllowedIPs del cliente (qué va por el túnel)" hint="0.0.0.0/0 = todo · subnet = split tunnel">
              <Select value={allowedIps} onChange={(e) => setAllowedIps(e.target.value)} options={[{ value: '0.0.0.0/0', label: '0.0.0.0/0 — túnel completo' }, { value: '10.66.66.0/24', label: '10.66.66.0/24 — solo la VPN' }, { value: '0.0.0.0/0, ::/0', label: 'dual stack completo' }]} />
            </Field>
            <Field label="PublicKey del servidor (opcional, para el cliente)">
              <TextInput value={serverPub} onChange={(e) => setServerPub(e.target.value)} placeholder="pega la server.pub si ya la tienes" className="font-mono" />
            </Field>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">peers ({peers.length})</h3>
            <Button variant="ghost" className="ml-auto gap-1 px-2 py-1 text-xs" onClick={addPeer}>+ añadir peer</Button>
          </div>
          <div className="space-y-2">
            {peers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-edge p-3">
                <TextInput value={p.name} onChange={(e) => updatePeer(p.id, { name: e.target.value })} className="w-32 font-mono" />
                <TextInput value={p.ip} onChange={(e) => updatePeer(p.id, { ip: e.target.value })} className="w-32 font-mono" />
                <button onClick={() => updatePeer(p.id, { keepalive: !p.keepalive })} className={`rounded-lg border px-2 py-1 font-mono text-[10px] ${p.keepalive ? 'border-acento/50 text-acento' : 'border-edge text-grey'}`}>
                  keepalive {p.keepalive ? 'ON' : 'OFF'}
                </button>
                <Badge tone="info">{p.ip}/32</Badge>
                <Button variant="danger" className="ml-auto px-2 py-1" onClick={() => setPeers((ps) => ps.filter((x) => x.id !== p.id))}>×</Button>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mb-4 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">/etc/wireguard/{iface}.conf (servidor)</h3>
          <CopyBlock text={serverConf} maxH="340" />
        </div>
      </Reveal>

      {peers.slice(0, 2).map((p) => (
        <Reveal key={p.id}>
          <div className="card mb-4 p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">config del cliente "{p.name}"</h3>
            <CopyBlock text={clientConf(p)} maxH="340" />
          </div>
        </Reveal>
      ))}

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">despliegue y verificación</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <CopyBlock text={deploy} label="despliegue" maxH="340" />
            <CopyBlock text={firewall} label="firewall + NAT" maxH="340" />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="warn">las claves privadas NUNCA salen del servidor</Badge>
            <Badge tone="info">1 par de claves por peer (no reutilices)</Badge>
            <Badge tone="neutral">AllowedIPs = route + ACL</Badge>
            <Badge tone="ok">handshake: wg show debe mostrar "latest handshake" reciente</Badge>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
