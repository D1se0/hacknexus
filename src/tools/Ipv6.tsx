import { useMemo, useState } from 'react'
import { Wifi } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, KV, useToast } from '../components/ui'
import { ipv6Expand, ipv6Compress, ipv6Type, ipv6PrefixInfo, eui64, ipv6ReverseDns } from '../lib/subnet'
import { copyText } from '../lib/util'

export default function Ipv6() {
  const [addr, setAddr] = useState('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
  const [prefix, setPrefix] = useState(64)
  const [mac, setMac] = useState('00:1A:2B:3C:4D:5E')
  const [eui, setEui] = useState<string | null>(null)
  const toast = useToast()

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
      <ToolHeader icon={Wifi} title="IPv6 Toolkit" desc="Expande/comprime, clasifica el tipo, calcula prefijos, EUI-64 desde MAC y reverse DNS ip6.arpa" />

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
    </div>
  )
}
