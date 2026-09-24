import { useMemo, useState } from 'react'
import { Network, Dices } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, KV, CopyBtn, useToast } from '../components/ui'
import { subnetInfo, toBinaryIp } from '../lib/subnet'

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

export default function Ipv4() {
  const [v4kind, setV4kind] = useState<Ip4Kind>('privada')
  const [v4count, setV4count] = useState(5)
  const [v4list, setV4list] = useState<string[]>([])
  const [v4sel, setV4sel] = useState<string | null>(null)
  const [v4cidr, setV4cidr] = useState(24)
  const toast = useToast()

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

  return (
    <div className="min-w-0">
      <ToolHeader icon={Network} title="IPv4 Generator" desc="Genera direcciones IPv4 aleatorias criptográficas por tipo — privada, pública, multicast, loopback… — con análisis de subred completo por dirección" />

      <Reveal>
        <div className="card min-w-0 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">generador — aleatorio criptográfico (CSPRNG)</h3>
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
