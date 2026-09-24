import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Plus, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, CopyBlock, useToast } from '../components/ui'
import { subnetInfo, vlsm, type VlsmBlock } from '../lib/subnet'

const PRESETS = [
  { name: 'RRHH', hosts: 50 },
  { name: 'IT', hosts: 120 },
  { name: 'Servidores', hosts: 20 },
  { name: 'WiFi invitados', hosts: 250 },
]

export default function Vlsm() {
  const [base, setBase] = useState('192.168.1.0/24')
  const [reqs, setReqs] = useState([{ name: 'RRHH', hosts: 50 }, { name: 'IT', hosts: 120 }, { name: 'Servidores', hosts: 20 }])
  const toast = useToast()

  const baseParsed = useMemo(() => {
    try {
      const m = base.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/)
      if (!m) throw new Error('formato')
      return subnetInfo(m[1], m[2] !== undefined ? parseInt(m[2]) : 24)
    } catch {
      return null
    }
  }, [base])

  const result = useMemo(() => {
    if (!baseParsed) return null
    const clean = reqs.map((r) => ({ name: r.name.trim() || `subred-${r.hosts}`, hosts: parseInt(String(r.hosts)) || 0 })).filter((r) => r.hosts > 0)
    if (!clean.length) return null
    try {
      return { base: baseParsed, ...vlsm(baseParsed.ip, baseParsed.cidr, clean) }
    } catch {
      return null
    }
  }, [baseParsed, reqs])

  const asText = (blocks: VlsmBlock[]): string => {
    const rows = blocks.map((b) => `${b.name.padEnd(16)} ${b.network}/${b.cidr}\t${b.mask}\t${b.firstHost} - ${b.lastHost}\tusable: ${b.usable} (pide ${b.hosts})`)
    return `# VLSM de ${base}\n` + rows.join('\n')
  }

  return (
    <div>
      <ToolHeader icon={Calculator} title="Calculadora VLSM" desc="Segmenta una red base en subredes según hosts necesarios (mayor a menor) — portado de calculadora_vlsm" badge="ported" />

      <Reveal>
        <div className="card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Red base" hint="192.168.1.0/24">
              <TextInput value={base} onChange={(e) => setBase(e.target.value)} className="font-mono" />
            </Field>
            <div className="flex items-end gap-2">
              <Button variant="ghost" onClick={() => { setReqs(PRESETS.map((p) => ({ ...p }))); toast('Preset cargado') }}>preset demo</Button>
              <Button variant="ghost" onClick={() => setReqs([])}>limpiar</Button>
            </div>
          </div>

          <div className="mt-5">
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-grey">subredes solicitadas</span>
            <div className="space-y-2">
              {reqs.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                  <TextInput
                    value={r.name}
                    placeholder="nombre"
                    onChange={(e) => setReqs((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    className="w-44"
                  />
                  <TextInput
                    value={String(r.hosts)}
                    placeholder="hosts"
                    type="number"
                    min={1}
                    onChange={(e) => setReqs((rs) => rs.map((x, j) => (j === i ? { ...x, hosts: parseInt(e.target.value) || 0 } : x)))}
                    className="w-32"
                  />
                  <button
                    onClick={() => setReqs((rs) => rs.filter((_, j) => j !== i))}
                    className="rounded-lg border border-edge px-3 text-grey transition-colors hover:border-bad/50 hover:text-bad"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
            <Button className="mt-3" variant="ghost" onClick={() => setReqs((rs) => [...rs, { name: `subred-${rs.length + 1}`, hosts: 30 }])}>
              <Plus size={14} /> añadir subred
            </Button>
          </div>
        </div>
      </Reveal>

      {result && (
        <Reveal>
          <div className="card mt-6 p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="accent">base: {result.base.network}/{result.base.cidr}</Badge>
              <Badge tone="info">{result.base.usableHosts.toLocaleString('es-ES')} hosts usables en la base</Badge>
              <Badge tone={result.error ? 'bad' : 'ok'}>{result.error ? 'con avisos' : 'sin solapamientos'}</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] font-mono text-[12px]">
                <thead>
                  <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-grey">
                    <th className="py-2 pr-3">nombre</th>
                    <th className="py-2 pr-3">hosts pedidos</th>
                    <th className="py-2 pr-3">red / CIDR</th>
                    <th className="py-2 pr-3">máscara</th>
                    <th className="py-2 pr-3">rango útil</th>
                    <th className="py-2 pr-3">broadcast</th>
                    <th className="py-2 pr-3 text-right">usables</th>
                    <th className="py-2 text-right">libres</th>
                  </tr>
                </thead>
                <tbody>
                  {result.blocks.map((b, i) => (
                    <motion.tr
                      key={b.name + i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-edge/40 transition-colors hover:bg-acento/5"
                    >
                      <td className="py-2 pr-3 font-bold text-white">{b.name}</td>
                      <td className="py-2 pr-3 text-grey">{b.hosts}</td>
                      <td className={`py-2 pr-3 ${b.ok ? 'text-acento' : 'text-bad'}`}>{b.network}/{b.cidr}</td>
                      <td className="py-2 pr-3 text-ink">{b.mask}</td>
                      <td className="py-2 pr-3 text-ink">{b.firstHost} – {b.lastHost}</td>
                      <td className="py-2 pr-3 text-ink">{b.broadcast}</td>
                      <td className="py-2 pr-3 text-right text-ink">{b.usable}</td>
                      <td className={`py-2 text-right ${b.leftover < 0 ? 'text-bad' : 'text-ok'}`}>{b.leftover}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.error && <p className="mt-3 font-mono text-xs text-warn">⚠ {result.error}</p>}

            <div className="mt-5">
              <CopyBlock text={asText(result.blocks)} label="resumen vlsm" />
            </div>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 VLSM asigna primero la subred más grande: para {250} hosts hace falta /24 (254 útiles), para 60 → /26, para 2 → /30.
          Los bloques se alinean a su tamaño (una /26 siempre empieza en múltiplos de 64).
        </div>
      </Reveal>
    </div>
  )
}
