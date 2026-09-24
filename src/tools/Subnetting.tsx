import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Split, Copy, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, KV, useToast } from '../components/ui'
import { subnetInfo, toBinaryIp, ipToInt, CIDR_TABLE } from '../lib/subnet'
import { copyText } from '../lib/util'

export default function Subnetting() {
  const [ip, setIp] = useState('192.168.1.10/24')
  const [history, setHistory] = useState<string[]>([])
  const toast = useToast()

  const parsed = useMemo(() => {
    try {
      const m = ip.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:[/ ](\d{1,2}))?$/)
      if (!m) throw new Error('formato')
      const cidr = m[2] !== undefined ? parseInt(m[2]) : 24
      return subnetInfo(m[1], cidr)
    } catch {
      return null
    }
  }, [ip])

  const priv = parsed?.isPrivate

  const copy = (v: string, label: string) => {
    copyText(v)
    toast(`${label} copiado`)
  }

  return (
    <div>
      <ToolHeader icon={Split} title="Subnetting Calculator" desc="IPv4/CIDR completa con binarios, clase, wildcard y tabla de referencia — portado de calculadora_subnetting" badge="ported" />

      <Reveal>
        <div className="card p-6">
          <Field label="IP / CIDR o máscara" hint="192.168.1.10/24 · 192.168.1.0 255.255.255.0">
            <div className="flex gap-2">
              <TextInput
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && parsed) {
                    setHistory((h) => [`${parsed.network}/${parsed.cidr}`, ...h.filter((x) => x !== `${parsed.network}/${parsed.cidr}`)].slice(0, 8))
                  }
                }}
                className="font-mono"
              />
              <Button
                onClick={() => {
                  if (!parsed) return
                  setHistory((h) => [`${parsed.network}/${parsed.cidr}`, ...h.filter((x) => x !== `${parsed.network}/${parsed.cidr}`)].slice(0, 8))
                  toast('Añadida al historial')
                }}
              >
                guardar
              </Button>
            </div>
          </Field>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['/8', '/16', '/24', '/25', '/26', '/27', '/28', '/29', '/30', '/31', '/32'].map((c) => (
              <button
                key={c}
                onClick={() => setIp(`${ip.split('/')[0].split(' ')[0]}${c}`)}
                className="rounded-md border border-edge px-2 py-1 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento"
              >
                {c}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button key={h} onClick={() => setIp(h)} className="group flex items-center gap-1 rounded-md border border-ok/30 bg-ok/5 px-2 py-1 font-mono text-[10px] text-ok">
                  {h}
                  <Trash2 size={9} className="opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setHistory((x) => x.filter((y) => y !== h)) }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {parsed ? (
        <>
          <Reveal>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { l: 'dirección de red', v: parsed.network },
                { l: 'broadcast', v: parsed.broadcast },
                { l: 'máscara', v: parsed.mask },
                { l: 'wildcard', v: parsed.wildcard },
                { l: 'primer host', v: parsed.firstHost },
                { l: 'último host', v: parsed.lastHost },
                { l: 'hosts usables', v: parsed.usableHosts.toLocaleString('es-ES') },
                { l: 'total direcciones', v: parsed.totalHosts.toLocaleString('es-ES') },
              ].map((r, i) => (
                <motion.button
                  key={r.l}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => copy(r.v, r.l)}
                  className="card card-hover group p-4 text-left"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-grey">{r.l}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-acento">{r.v}</span>
                    <Copy size={11} className="ml-auto text-grey opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </motion.button>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone={priv ? 'ok' : 'warn'}>{priv ? 'red privada' : 'IP pública'}</Badge>
                <Badge tone="info">clase {parsed.klass}</Badge>
                <Badge tone="accent">CIDR /{parsed.cidr}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] font-mono text-[12px]">
                  <thead>
                    <tr className="text-grey">
                      <th className="py-2 pr-4 text-left text-[10px] uppercase tracking-widest">concepto</th>
                      <th className="py-2 text-left text-[10px] uppercase tracking-widest">binario (octeto 1-4)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['IP', ip.split('/')[0]],
                      ['máscara', parsed.mask],
                      ['red', parsed.network],
                      ['broadcast', parsed.broadcast],
                    ].map(([l, v]) => (
                      <tr key={l} className="border-t border-edge/40">
                        <td className="py-2 pr-4 text-grey">{l}</td>
                        <td className="py-2 text-ink">{toBinaryIp(ipToInt(v as string))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 font-mono text-[10px] text-grey">
                  máscara en binario: <span className="text-acento">{'1'.repeat(parsed.cidr)}</span>
                  <span className="text-grey/50">{'0'.repeat(32 - parsed.cidr)}</span> (los 1s = red, los 0s = hosts)
                </p>
              </div>
            </div>
          </Reveal>
        </>
      ) : (
        <div className="card mt-6 p-6 text-center font-mono text-sm text-bad">
          ⚠ formato no válido — usa 192.168.1.10/24 o 10.0.0.0 255.0.0.0
        </div>
      )}

      <Reveal>
        <div className="card mt-6 overflow-hidden">
          <div className="border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey">tabla CIDR de referencia</div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left font-mono text-[12px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-grey">
                  <th className="px-4 py-2">CIDR</th>
                  <th className="px-4 py-2">máscara</th>
                  <th className="px-4 py-2 text-right">hosts</th>
                  <th className="px-4 py-2 text-right">usables</th>
                </tr>
              </thead>
              <tbody>
                {CIDR_TABLE.map((r) => (
                  <tr key={r.cidr} onClick={() => setIp(`${(parsed?.ip ?? '192.168.1.0').split('/')[0].split(' ')[0]}${'/' + r.cidr}`)} className="cursor-pointer border-b border-edge/40 transition-colors hover:bg-acento/5">
                    <td className="px-4 py-1.5 text-acento">/{r.cidr}</td>
                    <td className="px-4 py-1.5 text-ink">{r.mask}</td>
                    <td className="px-4 py-1.5 text-right text-grey">{r.hosts.toLocaleString('es-ES')}</td>
                    <td className="px-4 py-1.5 text-right text-grey">{r.usable.toLocaleString('es-ES')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  )
}