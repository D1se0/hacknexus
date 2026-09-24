import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextArea, TextInput, Badge, Reveal } from '../components/ui'
import { caesar, rot47, atbash, vigenere, xorText, xorHexToText } from '../lib/encoders'

export default function Classics() {
  const [text, setText] = useState('La cripto clásica mola')
  const [shift, setShift] = useState(3)
  const [key, setKey] = useState('SECRETO')
  const [xorKey, setXorKey] = useState('kali')

  const caesarAll = useMemo(() => Array.from({ length: 25 }, (_, i) => ({ shift: i + 1, value: caesar(text, i + 1) })), [text])

  const results = useMemo(() => {
    let xorOut = ''
    try {
      xorOut = xorText(text, xorKey)
    } catch (e) {
      xorOut = `error: ${(e as Error).message}`
    }
    return [
      { name: `César (+${shift})`, value: caesar(text, shift) },
      { name: `César (−${shift})`, value: caesar(text, -shift) },
      { name: 'ROT13', value: caesar(text, 13) },
      { name: 'ROT47', value: rot47(text) },
      { name: 'Atbash', value: atbash(text) },
      { name: `Vigenère (${key})`, value: vigenere(text, key) },
      { name: `Vigenère decode (${key})`, value: vigenere(text, key, true) },
      { name: `XOR → hex (${xorKey})`, value: xorOut },
    ]
  }, [text, shift, key, xorKey])

  const [xorHexIn, setXorHexIn] = useState('')
  const xorDecoded = useMemo(() => {
    if (!xorHexIn) return ''
    try {
      return xorHexToText(xorHexIn, xorKey)
    } catch {
      return '⚠ hex inválido'
    }
  }, [xorHexIn, xorKey])

  return (
    <div>
      <ToolHeader icon={ArrowLeftRight} title="Cifrados Clásicos" desc="César, ROT13/47, Atbash, Vigenère y XOR con criptoanálisis por fuerza bruta instantánea" />

      <Reveal>
        <div className="card p-6">
          <Field label="Texto">
            <TextArea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          </Field>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Shift César" hint={String(shift)}>
              <input type="range" min={1} max={25} value={shift} onChange={(e) => setShift(+e.target.value)} className="w-full accent-[#2ee88a]" />
            </Field>
            <Field label="Clave Vigenère">
              <TextInput value={key} onChange={(e) => setKey(e.target.value)} />
            </Field>
            <Field label="Clave XOR">
              <TextInput value={xorKey} onChange={(e) => setXorKey(e.target.value)} />
            </Field>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-3">
        {results.map((r, i) => (
          <motion.div key={r.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <span className="w-40 shrink-0 font-mono text-xs font-bold text-acento">{r.name}</span>
            <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-ink">{r.value}</code>
            <CopyBtn text={r.value} />
          </motion.div>
        ))}
      </div>

      <Reveal>
        <div className="card mt-6 p-6">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-mono text-sm font-bold text-white">Criptoanálisis César (los 25 shifts)</h3>
            <Badge tone="info">busca el legible</Badge>
          </div>
          <div className="grid max-h-96 gap-1.5 overflow-y-auto">
            {caesarAll.map((c) => (
              <div key={c.shift} className="flex items-center gap-3 rounded-lg px-3 py-1.5 font-mono text-[12px] transition-colors hover:bg-acento/5">
                <span className="w-8 shrink-0 text-right text-grey">+{c.shift}</span>
                <span className="break-all text-ink">{c.value}</span>
                <CopyBtn text={c.value} className="ml-auto shrink-0 border-0 bg-transparent px-1" />
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-sm font-bold text-white">XOR decode (hex → texto con la clave de arriba)</h3>
          <TextInput value={xorHexIn} onChange={(e) => setXorHexIn(e.target.value)} placeholder="4a5c2f…" />
          {xorDecoded && (
            <code className="mt-3 block break-all rounded-lg border border-ok/30 bg-ok/5 px-3 py-2 font-mono text-sm text-ok">{xorDecoded}</code>
          )}
        </div>
      </Reveal>
    </div>
  )
}