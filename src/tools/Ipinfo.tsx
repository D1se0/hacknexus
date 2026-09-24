import { useState } from 'react'
import { Globe2, Loader2, MapPin } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, KV, ErrorBox, InfoBanner } from '../components/ui'
import { ipInfo, myIp, type IpInfo } from '../lib/netapi'

export default function Ipinfo() {
  const [input, setInput] = useState('')
  const [info, setInfo] = useState<IpInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const lookup = async (target?: string) => {
    setLoading(true)
    setErr(null)
    try {
      const r = target !== undefined ? await ipInfo(target) : await myIp()
      setInfo(r)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const osmLink = info?.latitude !== undefined && info?.longitude !== undefined
    ? `https://www.openstreetmap.org/?mlat=${info.latitude}&mlon=${info.longitude}#map=11/${info.latitude}/${info.longitude}`
    : null

  return (
    <div>
      <ToolHeader icon={Globe2} title="IP Info & GeoIP" desc="Geolocalización, ASN, ISP y tipo de red de cualquier IP o dominio vía ipwho.is" />

      <InfoBanner>
        Consulta la API pública <span className="font-mono">ipwho.is</span>. Si dejas el campo vacío y pulsas «mi IP», la petición revela tu IP pública al servicio.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <Field label="IP o dominio" hint="vacío = tu IP pública">
            <div className="flex gap-2">
              <TextInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookup(input.trim() || undefined)}
                className="font-mono"
                placeholder="8.8.8.8 · github.com"
              />
              <Button onClick={() => lookup(input.trim() || undefined)} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : 'consultar'}
              </Button>
              <Button variant="ghost" onClick={() => { setInput(''); lookup(undefined) }} disabled={loading}>
                mi IP
              </Button>
            </div>
          </Field>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['8.8.8.8', '1.1.1.1', '9.9.9.9', 'github.com'].map((p) => (
              <button key={p} onClick={() => { setInput(p); lookup(p) }} className="rounded-md border border-edge px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                {p}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {err && <div className="mt-6"><ErrorBox>{err}</ErrorBox></div>}

      {info && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone="accent">{info.ip}</Badge>
                {info.isDatacenter && <Badge tone="warn">hosting / datacenter</Badge>}
                {info.countryCode && <Badge tone="info">{info.countryCode}</Badge>}
              </div>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="IP" v={info.ip} copyable />
                  <KV k="país" v={info.country ? `${info.country}${info.countryCode ? ` (${info.countryCode})` : ''}` : '—'} />
                  <KV k="región" v={info.region ?? '—'} />
                  <KV k="ciudad" v={info.city ?? '—'} />
                  <KV k="código postal" v={info.postal ?? '—'} />
                </div>
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="ASN" v={info.asn ?? '—'} copyable={!!info.asn} />
                  <KV k="ISP" v={info.isp ?? '—'} />
                  <KV k="organización" v={info.org ?? '—'} />
                  <KV k="timezone" v={info.timezone ?? '—'} />
                  <KV
                    k="coordenadas"
                    v={info.latitude !== undefined ? <>{info.latitude.toFixed(4)}, {info.longitude?.toFixed(4)}</> : '—'}
                    copyable={info.latitude !== undefined}
                  />
                </div>
              </div>
              {osmLink && (
                <a
                  href={osmLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-acento/40 bg-acento/5 px-4 py-2 font-mono text-xs text-acento transition-all hover:bg-acento/10"
                >
                  <MapPin size={13} /> ver en OpenStreetMap
                </a>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
              💡 La geoIP es aproximada (nivel ciudad/region). Para un pentest real: whois AS, shodan/censys para puertos,
              y reverse DNS via la tool DNS (tipo PTR).
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
