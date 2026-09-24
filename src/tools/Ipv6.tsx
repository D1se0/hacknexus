import { useMemo, useState } from 'react'
import { Wifi, Dices } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, KV, CopyBtn, useToast } from '../components/ui'
import { ipv6Expand, ipv6Compress, ipv6Type, ipv6PrefixInfo, eui64, ipv6ReverseDns, subnetInfo, toBinaryIp } from '../lib/subnet'
import { copyText } from '../lib/util'

/* ───────────── Generador de IPv4 ───────────── */

type Ip4Kind = 'privada' | 'pública' | 'multicast' | 'loopback' | 'link-local' | 'documentación' | 'cualquiera'
const IP4_KINDS: Ip4Kind[] = ['privada', 'pública', 'multicast', 'loopback', 'link-local', 'documentación', 'cualquiera']
const rndByte = (): number => crypto.getRandomValues(new Uint8Array(1))[0]

function randIp4(kind: Ip4Kind): string {
  const last = () => 1 + (rndByte() % 254)
  switch (kind) {
    case 'privada': {
      const pool = rndByte() % 3
      if (pool === 0) return `10.${rndByte()}.${rndByte()}.${last()}`
      if (pool === 1) return `172.${16 + (rndByte() % 16)}.${rndByte()}.${last()}`
      return `192.168.${rndByte()}.${last()}`
    }
    case 'pública': {
      for (let tries = 0; tries < 20; tries++) {
        const a = 1 + (rndByte() % 223)
        if (a === 10 || a === 127 || a === 0 || a === 172 || a === 192 || a === 169) continue
        return `${a}.${rndByte()}.${rndByte()}.${last()}`
      }
      return `9.9.9.${last()}`
    }
    case 'multicast': return `${224 + (rndByte() % 16)}.${rndByte()}.${rndByte()}.${last()}`
    case 'loopback': return `127.${rndByte()}.${rndByte()}.${last()}`
    case 'link-local': return `169.254.${rndByte()}.${last()}`
    case 'documentación': {
      const p = ['192.0.2', '198.51.100', '203.0.113'][rndByte() % 3]
      return `${p}.${last()}`
    }
    default: return `${1 + (rndByte() % 254)}.${rndByte()}.${rndByte()}.${last()}`
  }
}

const MAC_VENDORS: { name: string; ouis: string[] }[] = [
  { name: 'aleatoria local', ouis: ['02', '06', '0a', '0e'] },
  { name: 'Apple', ouis: ['f0:18:98', 'a4:83:e7', 'dc:2b:61'] },
  { name: 'Dell', ouis: ['f8:db:88', '18:03:73', 'b8:ca:3a'] },
  { name: 'HP', ouis: ['3c:d9:2b', 'e4:11:5b', '00:1f:29'] },
  { name: 'Cisco', ouis: ['00:1b:0d', 'f8:66:f2', '70:6d:15'] },
  { name: 'Raspberry Pi', ouis: ['b8:27:eb', 'dc:a6:32', 'e4:5f:01'] },
  { name: 'Samsung', ouis: ['00:16:32', '8c:77:12', 'fc:f1:36'] },
  { name: 'Intel', ouis: ['00:1b:21', 'a0:36:9f', '3c:97:0e'] },
]

const ip4KindOf = (ip: string): string => {
  const a = parseInt(ip.split('.')[0])
  const b = parseInt(ip.split('.')[1])
  if (a === 127) return 'loopback'
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'privada (RFC1918)'
  if (a === 169 && b === 254) return 'link-local (APIPA)'
  if (a >= 224 && a <= 239) return 'multicast'
  if (a >= 240) return 'reservada (Clase E)'
  if ((a === 192 && b === 0 && ip.startsWith('192.0.2')) || ip.startsWith('198.51.100') || ip.startsWith('203.0.113')) return 'documentación'
  return 'pública'
}

export default function Ipv6() {
  const [addr, setAddr] = useState('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
  const [prefix, setPrefix] = useState(64)
  const [mac, setMac] = useState('00:1A:2B:3C:4D:5E')
  const [eui, setEui] = useState<string | null>(null)
  const toast = useToast()

  // generador IPv4
  const [v4kind, setV4kind] = useState<Ip4Kind>('privada')
  const [v4count, setV4count] = useState(5)
  const [v4list, setV4list] = useState<string[]>([])
  const [v4sel, setV4sel] = useState<string | null>(null)
  const [v4cidr, setV4cidr] = useState(24)

  // generador MAC
  const [macVendor, setMacVendor] = useState('aleatoria local')
  const [macCount, setMacCount] = useState(5)
  const [macList, setMacList] = useState<{ mac: string; vendor: string }[]>([])

  const genV4 = () => {
    const list = Array.from({ length: v4count }, () => randIp4(v4kind))
    setV4list(list)
    setV4sel(list[0] ?? null)
  }

  const v4info = useMemo(() => {
    if (!v4sel) return null
    try {
      return subnetInfo(v4sel, v4cidr)
    } catch {
      return null
    }
  }, [v4sel, v4cidr])

  const genMacs = () => {
    const vendor = MAC_VENDORS.find((v) => v.name === macVendor) ?? MAC_VENDORS[0]
    const list = Array.from({ length: macCount }, () => {
      const oui = vendor.ouis[Math.floor(Math.random() * vendor.ouis.length)]
      const nic = Array.from({ length: 3 }, () => rndByte().toString(16).padStart(2, '0'))
      return { mac: `${oui}:${nic.join(':')}`, vendor: vendor.name }
    })
    setMacList(list)
  }

  const info = useMemo(() => {
    try {
      const full = ipv6Expand(addr)
      return {
        full,
        compressed: ipv6Compress(addr),
        type: ipv6Type(addr),
        net64: ipv6PrefixInfo(addr, 64).network,
        prefixInfo: ipv6PrefixInfo(addr, prefix),
        reverse: ipv6ReverseDns(addr),
      }
    } catch {
      return null
    }
  }, [addr, prefix])

  const macToEui = () => {
    try {
      const r = eui64(mac)
      setEui(r)
      copyText(r)
      toast('EUI-64 copiado')
    } catch (e) {
      setEui(`⚠ ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <ToolHeader icon={Wifi} title="IPv6 Toolkit + Generador IPv4" desc="Expande/comprime, clasifica el tipo, calcula prefijos, EUI-64 desde MAC, reverse DNS ip6.arpa — y un generador de direcciones IPv4 con análisis de subred" />

      <Reveal>
        <div className="card p-6">
          <Field label="Dirección IPv6" hint="acepta forma comprimida ::">
            <TextInput value={addr} onChange={(e) => setAddr(e.target.value)} className="font-mono" />
          </Field>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['2001:db8::1', 'fe80::1', '::1', 'fd00::dead:beef', 'ff02::1', '2002:c0a8:0101::'].map((p) => (
              <button key={p} onClick={() => setAddr(p)} className="rounded-md border border-edge px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                {p}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {info ? (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone="accent">{info.type}</Badge>
              </div>
              <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                <KV k="forma expandida" v={info.full} copyable />
                <KV k="forma comprimida" v={info.compressed} copyable />
                <KV k="tipo" v={info.type} />
                <KV k="red /64" v={info.net64} copyable />
                <KV k="reverse DNS" v={info.reverse} copyable />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-grey">prefijo</span>
                <input type="range" min={0} max={128} value={prefix} onChange={(e) => setPrefix(parseInt(e.target.value))} className="w-64 accent-[#2ee88a]" />
                <span className="font-mono text-sm font-bold text-acento">/{prefix}</span>
              </div>
              <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                <KV k="red del prefijo" v={info.prefixInfo.network} copyable />
                <KV k="direcciones totales" v={`${info.prefixInfo.total} (2^${128 - prefix})`} />
              </div>
              <p className="mt-2 font-mono text-[10px] text-grey">
                binario de red: <span className="text-acento">{'1'.repeat(prefix)}</span>
                <span className="text-grey/50">{'0'.repeat(128 - prefix)}</span>
              </p>
            </div>
          </Reveal>
        </>
      ) : (
        <div className="card mt-6 p-6 text-center font-mono text-sm text-bad">⚠ IPv6 no válida — prueba 2001:db8::1</div>
      )}

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">EUI-64 (link-local desde MAC)</h3>
          <div className="flex gap-2">
            <TextInput value={mac} onChange={(e) => setMac(e.target.value)} className="max-w-xs font-mono" placeholder="00:1A:2B:3C:4D:5E" />
            <Button onClick={macToEui}>generar</Button>
          </div>
          {eui && (
            <div className="mt-3">
              <CopyBlock text={eui} label="eui-64" maxH="max-h-24" />
            </div>
          )}
          <p className="mt-2 font-mono text-[10px] text-grey/70">
            invierte el bit U/L (byte 0 XOR 02) e inserta FF:FE en el centro → fe80::/10
          </p>
        </div>
      </Reveal>

      {/* ───────────── Generador de MAC ───────────── */}
      <Reveal>
        <div className="card mt-6 min-w-0 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">generador de MAC — OUIs reales y aleatorias locales</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={macVendor}
              onChange={(e) => setMacVendor(e.target.value)}
              className="cursor-pointer appearance-none rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-acento/60"
            >
              {MAC_VENDORS.map((v) => <option key={v.name} value={v.name} className="bg-panel">{v.name}</option>)}
            </select>
            {[1, 5, 10].map((n) => (
              <button key={n} onClick={() => setMacCount(n)} className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all ${macCount === n ? 'border-info/60 bg-info/15 text-info' : 'border-edge text-grey hover:text-ink'}`}>×{n}</button>
            ))}
            <Button onClick={genMacs} className="ml-1"><Dices size={14} /> generar</Button>
          </div>
          {macList.length > 0 && (
            <div className="mt-3 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {macList.map((m, i) => (
                  <button key={`${i}-${m.mac}`} onClick={() => { setMac(m.mac); toast('MAC cargada en EUI-64') }} title="clic: usar en EUI-64" className="rounded-md border border-edge px-2 py-1 font-mono text-[12px] text-ink transition-all hover:border-acento/50 hover:text-acento">
                    {m.mac}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-grey">clic en una MAC para usarla en el EUI-64 ↑ · {macList[0].vendor}</span>
                <CopyBtn text={macList.map((m) => m.mac).join('\n')} label={`copiar las ${macList.length}`} />
              </div>
            </div>
          )}
          <p className="mt-3 font-mono text-[10px] text-grey/70">
            las «aleatoria local» activan el bit U/L (segundo dígito par → 2/6/A/E) para no chocar con fabricantes reales — útil para lab, spoofing educativo y fixtures
          </p>
        </div>
      </Reveal>

      {/* ───────────── Generador IPv4 ───────────── */}
      <Reveal>
        <div className="card mt-6 min-w-0 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">generador de IPv4 — aleatorio criptográfico, con análisis de subred</h3>
          <div className="flex flex-wrap gap-1.5">
            {IP4_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setV4kind(k)}
                className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all ${v4kind === k ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:text-ink'}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {[1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => setV4count(n)}
                className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all ${v4count === n ? 'border-info/60 bg-info/15 text-info' : 'border-edge text-grey hover:text-ink'}`}
              >
                ×{n}
              </button>
            ))}
            <Button onClick={genV4} className="ml-1"><Dices size={14} /> generar</Button>
          </div>

          {v4list.length > 0 && (
            <div className="mt-4 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {v4list.map((ip, i) => (
                  <button
                    key={`${i}-${ip}`}
                    onClick={() => setV4sel(ip)}
                    className={`rounded-md border px-2 py-1 font-mono text-[12px] transition-all ${v4sel === ip ? 'border-warn/60 bg-warn/10 text-warn' : 'border-edge text-ink hover:border-acento/50 hover:text-acento'}`}
                  >
                    {ip}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-grey">clic en una IP para analizarla ↓</span>
                <CopyBtn text={v4list.join('\n')} label={`copiar las ${v4list.length}`} />
              </div>
            </div>
          )}

          {v4sel && (
            <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-edge">
              <KV k="dirección" v={v4sel} copyable />
              <KV k="tipo" v={ip4KindOf(v4sel)} />
              <KV k="clase" v={v4info?.klass ?? '—'} />
              {v4info && <KV k="decimal · hex" v={`${v4info.networkInt} · 0x${v4info.networkInt.toString(16).padStart(8, '0')}`} />}
              {v4info && <KV k="binario" v={toBinaryIp(v4info.networkInt)} />}
              <KV k="reverse DNS" v={`${v4sel.split('.').reverse().join('.')}.in-addr.arpa`} copyable />
            </div>
          )}

          {v4info && v4sel && (
            <div className="mt-5 min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-grey">subred /CIDR</span>
                <input type="range" min={8} max={32} value={v4cidr} onChange={(e) => setV4cidr(parseInt(e.target.value))} className="w-64 accent-[#2ee88a]" />
                <span className="font-mono text-sm font-bold text-acento">/{v4cidr}</span>
                <Badge tone="accent">{v4sel}/{v4cidr}</Badge>
              </div>
              <div className="min-w-0 overflow-hidden rounded-xl border border-edge">
                <KV k="red" v={v4info.network} copyable />
                <KV k="broadcast" v={v4info.broadcast} copyable />
                <KV k="máscara" v={`${v4info.mask} (wildcard ${v4info.wildcard})`} />
                <KV k="rango útil" v={`${v4info.firstHost} – ${v4info.lastHost}`} />
                <KV k="capacidad" v={`${v4info.usableHosts.toLocaleString('es-ES')} útiles de ${v4info.totalHosts.toLocaleString('es-ES')} totales`} />
              </div>
              <p className="mt-2 break-all font-mono text-[10px] text-grey">
                red: <span className="text-bad">{toBinaryIp(v4info.networkInt).slice(0, Math.min(35, v4cidr + Math.ceil(v4cidr / 8) - 1))}</span>
                <span className="text-grey/40">{toBinaryIp(v4info.networkInt).slice(Math.min(35, v4cidr + Math.ceil(v4cidr / 8) - 1))}</span>
                {'  ·  '}{v4cidr} bits de red, {32 - v4cidr} de host
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] text-grey/70">
            usa crypto.getRandomValues (CSPRNG del navegador) · las IPs «públicas» salen de rangos no reservados, útiles para ejemplos, fixtures y laboratorios
          </p>
        </div>
      </Reveal>
    </div>
  )
}
