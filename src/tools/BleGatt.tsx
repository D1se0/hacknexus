import { useMemo, useState } from 'react'
import { Bluetooth, Search, ArrowLeftRight, Radio } from 'lucide-react'
import { ToolHeader, Field, TextInput, Badge, Reveal, CopyBlock } from '../components/ui'
import { BLE_SERVICES, uuid16to128, uuid128to16, decodeAdvertising, BLE_RISK_SUMMARY } from '../lib/blegatt'

const RISK_TONE = { bajo: 'ok', medio: 'warn', alto: 'bad' } as const

export default function BleGatt() {
  const [q, setQ] = useState('')
  const [uuidIn, setUuidIn] = useState('0x180F')

  const qn = q.trim().toLowerCase()
  const services = useMemo(() => {
    if (!qn) return BLE_SERVICES
    return BLE_SERVICES.filter((s) =>
      (s.name + s.desc + s.risk + s.uuid + s.chars.map((c) => c.uuid + c.name).join(' ')).toLowerCase().includes(qn),
    )
  }, [qn])

  const conv = useMemo(() => {
    const input = uuidIn.trim()
    if (/^0x[0-9a-f]{4}$/i.test(input)) return { direction: '→128' as const, out: uuid16to128(input) }
    const u16 = uuid128to16(input)
    return u16 ? { direction: '→16' as const, out: u16 } : { direction: 'none' as const, out: 'no es UUID estándar SIG (128-bit base no coincide): probablemente vendor-specific' }
  }, [uuidIn])

  const ads = useMemo(() => decodeAdvertising(uuidIn.startsWith('02') || uuidIn.startsWith('01') ? '' : ''), []) // placeholder: se usa el otro input
  void ads

  const [adHex, setAdHex] = useState('0201060A094861636B4E65787573')
  const adDecoded = useMemo(() => decodeAdvertising(adHex), [adHex])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={Bluetooth}
        title="BLE GATT Explorer"
        desc="Catálogo de servicios y characteristics Bluetooth Low Energy con su riesgo real, conversor UUID 16↔128 y decodificador de advertising — la capa invisible de tu smartwatch"
        badge="ble"
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Reveal>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-grey" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="buscar servicio, characteristic o riesgo… (battery, DFU, health, tracking)"
                className="w-full rounded-lg border border-edge bg-black/40 py-2.5 pl-10 pr-4 font-mono text-sm text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60"
              />
            </div>
          </Reveal>

          {services.map((s, i) => (
            <Reveal key={s.uuid} delay={Math.min(i * 0.03, 0.2)}>
              <div className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-acento">{s.uuid}</span>
                  <h3 className="text-sm font-bold text-white">{s.name}</h3>
                  <Badge tone={RISK_TONE[s.riskLevel]} className="ml-auto">riesgo {s.riskLevel}</Badge>
                </div>
                <p className="mt-1.5 text-[12.5px] text-grey">{s.desc}</p>
                <p className="mt-2 rounded-lg border border-warn/25 bg-warn/5 px-3 py-2 text-[11.5px] leading-snug text-warn/90">⚠ {s.risk}</p>
                <div className="mt-3 space-y-1">
                  {s.chars.map((c) => (
                    <div key={c.uuid} className="flex flex-wrap items-baseline gap-2 rounded border border-edge bg-black/20 px-2.5 py-1.5">
                      <code className="font-mono text-[10.5px] text-acento">{c.uuid}</code>
                      <span className="font-mono text-[11.5px] text-ink">{c.name}</span>
                      <span className="font-mono text-[9.5px] text-grey">{c.props}</span>
                      {c.risk && <span className="w-full text-[10.5px] leading-snug text-warn/80">⚠ {c.risk}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
          {!services.length && <p className="py-8 text-center font-mono text-sm text-grey">nada coincide con “{q}”</p>}

          <Reveal delay={0.1}>
            <div className="card p-5">
              <h3 className="mb-2 font-mono text-sm font-bold text-white">los 4 fallos que vemos en audits BLE</h3>
              <ul className="space-y-1.5 text-[12px] leading-relaxed text-grey">
                {BLE_RISK_SUMMARY.map((r) => <li key={r}>▸ {r}</li>)}
              </ul>
            </div>
          </Reveal>
        </div>

        <div className="min-w-0 space-y-4">
          <Reveal delay={0.04}>
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><ArrowLeftRight size={14} className="text-acento" /> conversor UUID</h3>
              <Field label="UUID 16-bit o 128-bit">
                <TextInput value={uuidIn} onChange={(e) => setUuidIn(e.target.value)} className="py-2 font-mono text-xs" spellCheck={false} />
              </Field>
              <div className="mt-3 rounded-lg border border-edge bg-black/30 px-3 py-2.5">
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{conv.direction === '→128' ? 'forma completa 128-bit' : conv.direction === '→16' ? 'forma corta SIG' : 'resultado'}</p>
                <p className="mt-0.5 break-all font-mono text-[11.5px] text-acento">{conv.out}</p>
              </div>
              <p className="mt-2 font-mono text-[10px] leading-snug text-grey/60">todo UUID SIG de 16 bits vive en la base 0000xxxx-0000-1000-8000-00805F9B34FB. UUIDs fuera de esa base = vendor-specific: sin spec pública.</p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold text-white"><Radio size={14} className="text-acento" /> decoder de advertising</h3>
              <p className="mb-2 text-[11.5px] leading-snug text-grey">Pega el payload de advertising (la parte de datos del paquete que grita todo device BLE sin conectar):</p>
              <Field label="payload hex">
                <TextInput value={adHex} onChange={(e) => setAdHex(e.target.value)} className="py-2 font-mono text-xs" spellCheck={false} />
              </Field>
              <div className="mt-3 space-y-1.5">
                {adDecoded?.map((a, i) => (
                  <div key={i} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-white">{a.type}</span>
                      <span className="font-mono text-[9px] text-grey">{a.raw}</span>
                    </div>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-acento">{a.decoded}</p>
                  </div>
                ))}
                {!adDecoded && <p className="font-mono text-[11px] text-grey">hex inválido o vacío — cada registro es: len (1B) + type (1B) + datos</p>}
              </div>
              <p className="mt-3 font-mono text-[10px] leading-snug text-grey/60">
                El Complete Local Name y el Manufacturer Data son los dos campos que hacen tracking: sobreviven al random MAC del firmware.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <CopyBlock
              text={`# Escanear con tu adaptador (lab propio):\n#   sudo btmgmt find on\n#   nmap --script bluetooth-info -p \n# o conblejo: bleah -b AA:BB:CC:DD:EE:FF\n#\n# GATT connect + enumerate:\n#   gatttool -b AA:BB:CC:DD:EE:FF -t random --primary\n#   gatttool -b ... --characteristics`}
              label="chuleta de tools BLE"
            />
          </Reveal>
        </div>
      </div>
    </div>
  )
}
