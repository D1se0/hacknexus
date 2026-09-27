import { useMemo, useState } from 'react'
import { Radio, Wifi, ShieldCheck } from 'lucide-react'
import { ToolHeader, Badge, Reveal, InfoBanner, TextArea, KV } from '../components/ui'
import { decodeWifiFrame, WIFI_FRAME_EXAMPLES, type WifiFrameInfo } from '../lib/wifi80211'

const FLAG_LABELS: [keyof WifiFrameInfo['flags'], string][] = [
  ['toDS', 'to DS: va hacia el AP (tráfico de subida)'],
  ['fromDS', 'from DS: viene del AP (descarga)'],
  ['moreFrag', 'more fragments: el frame se parte en más'],
  ['retry', 'retry: retransmisión (el receptor no confirmó)'],
  ['powerMgmt', 'power management: el emisor va a dormir'],
  ['moreData', 'more data: el AP tiene más datos para el cliente en ahorro'],
  ['protectedFrame', 'protected frame: cuerpo cifrado (WEP/WPA)'],
  ['order', 'order: entrega estrictamente ordenada (PCF)'],
]

export default function Wifi80211() {
  const [hex, setHex] = useState('')

  const info = useMemo<WifiFrameInfo | null>(() => {
    if (!hex.trim()) return null
    try {
      return decodeWifiFrame(hex)
    } catch {
      return null // el parser ya tolera truncados; por si acaso, nunca tumbar la página
    }
  }, [hex])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Radio}
        title="Decodificador 802.11"
        desc="Pega los bytes hex de un frame capturado (airodump, tcpdump -e -x, tshark) y desglosa su cabecera MAC bit a bit: flags, direcciones, y Information Elements con el RSN completo"
        badge="wifi"
      />

      <InfoBanner>
        Copia el frame desde <code>tcpdump -e -x -i wlan0mon</code> o exporta un .cap con <code>tshark -r captura.cap -x | head</code>. Todo se decodifica en tu navegador: ideal para entender QUÉ es exactamente ese beacon, ese deauth o ese handshake que ves en Wireshark sin que nada salga de tu máquina.
      </InfoBanner>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[420px_1fr]">
        <Reveal>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white">
              <Wifi size={15} className="text-acento" /> frame en hexadecimal
            </h3>
            <TextArea
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              placeholder="80 00 00 00 ff:ff:ff:ff:ff:ff 00:11:22:33:44:55 … (acepta hex con o sin espacios/colon)"
              className="min-h-[150px]"
            />
            <p className="mt-2 font-mono text-[10.5px] text-grey">bytes detectados: {Math.floor(hex.replace(/[^0-9a-fA-F]/g, '').length / 2)}</p>
            <div className="mt-3">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-grey">ejemplos listos:</p>
              <div className="flex flex-wrap gap-1.5">
                {WIFI_FRAME_EXAMPLES.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => setHex(ex.hex)}
                    className="rounded-lg border border-edge px-2.5 py-1.5 text-left text-[11px] text-grey transition-all hover:border-acento/50 hover:text-ink"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-4">
          {!info && (
            <Reveal>
              <div className="card p-8 text-center">
                <Radio size={28} className="mx-auto text-acento" />
                <p className="mt-3 font-mono text-sm text-ink">pega un frame 802.11 a la izquierda</p>
                <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-grey">
                  El Frame Control de solo 2 bytes dice TODO: quién habla, a quién, si va cifrado, si es una retransmisión o si alguien está suplantando al AP. Aprender a leerlo a mano es la base del análisis inalámbrico.
                </p>
              </div>
            </Reveal>
          )}

          {info?.ok && (
            <>
              <Reveal>
                <div className="card p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-sm font-bold text-white">cabecera MAC</h3>
                    <Badge tone="accent">{info.type} · {info.subtype}</Badge>
                    <Badge tone="neutral">802.11 v{info.version}</Badge>
                    <Badge tone="neutral">{info.size} bytes</Badge>
                    {info.flags.protectedFrame && <Badge tone="info">cuerpo cifrado</Badge>}
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    <KV k={`addr1 · ${info.addrLabels[0]}`} v={info.addr1} copyable />
                    <KV k={`addr2 · ${info.addrLabels[1]}`} v={info.addr2 || '—'} copyable />
                    <KV k={`addr3 · ${info.addrLabels[2]}`} v={info.addr3 || '—'} copyable />
                    <KV k="duration/ID" v={`${info.duration} µs`} />
                    <KV k="seq/frag" v={`seq ${info.seq} · frag ${info.frag}`} />
                    <KV k="ssid" v={info.ssid ?? '—'} />
                    {info.channel !== null && <KV k="canal" v={info.channel} />}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.04}>
                <div className="card p-5">
                  <h3 className="mb-3 font-mono text-sm font-bold text-white">flags del Frame Control (byte 1, bit a bit)</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FLAG_LABELS.map(([key, label]) => (
                      <div
                        key={key}
                        className={`rounded-lg border px-3 py-2 text-[11.5px] leading-snug ${
                          info.flags[key] ? 'border-acento/40 bg-acento/5 text-ink' : 'border-edge bg-black/20 text-grey/70'
                        }`}
                      >
                        <span className={`mr-1.5 font-mono font-bold ${info.flags[key] ? 'text-acento' : 'text-grey/40'}`}>{info.flags[key] ? '1' : '0'}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {info.rsnInfo && (
                <Reveal delay={0.06}>
                  <div className="card p-5">
                    <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white">
                      <ShieldCheck size={15} className="text-ok" /> RSN — seguridad anunciada
                    </h3>
                    <p className="text-[12px] leading-relaxed text-ink/90">{info.rsnInfo}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {info.security.map((s) => (
                        <Badge key={s} tone={s.includes('roto') || s.includes('WEP') || s.includes('TKIP') ? 'bad' : 'ok'}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}

              {info.ies.length > 0 && (
                <Reveal delay={0.08}>
                  <div className="card p-5">
                    <h3 className="mb-3 font-mono text-sm font-bold text-white">information elements ({info.ies.length})</h3>
                    <div className="space-y-1.5">
                      {info.ies.map((ie, i) => (
                        <div
                          key={i}
                          className={`rounded-lg border px-3.5 py-2 ${ie.notable ? 'border-acento/40 bg-acento/5' : 'border-edge bg-black/20'}`}
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="rounded border border-edge px-1.5 font-mono text-[9.5px] text-grey/70">id {ie.id}</span>
                            <span className={`font-mono text-[12px] font-bold ${ie.notable ? 'text-acento' : 'text-ink'}`}>{ie.name}</span>
                            <span className="font-mono text-[10px] text-grey/60">{ie.len} bytes</span>
                          </div>
                          <p className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-grey">{ie.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}
            </>
          )}

          {info && !info.ok && (
            <Reveal>
              <p className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 font-mono text-xs leading-relaxed text-warn">
                ⚠ {info.error}
              </p>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  )
}
