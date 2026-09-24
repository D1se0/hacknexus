import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ScanSearch } from 'lucide-react'
import { ToolHeader, Badge, Field, TextArea, Reveal } from '../components/ui'
import { identifyHash } from '../lib/hashid'

export default function Hashid() {
  const [input, setInput] = useState('5d41402abc4b2a76b9719d911017c592')
  const results = useMemo(
    () =>
      input
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((line) => ({ line, types: identifyHash(line) })),
    [input],
  )

  return (
    <div>
      <ToolHeader icon={ScanSearch} title="Identificador de Hash" desc="Reconoce el formato por patrón y longitud, y sugiere modo hashcat y formato de John the Ripper" />

      <Reveal>
        <div className="card p-6">
          <Field label="Hashes (uno por línea, hasta 20)">
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
          </Field>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-4">
        {results.map(({ line, types }, i) => (
          <motion.div key={line + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card overflow-hidden">
            <div className="border-b border-edge bg-black/30 px-4 py-2 font-mono text-[11px] text-grey">
              <span className="text-acento">hash:</span> <span className="break-all text-ink">{line.slice(0, 80)}{line.length > 80 ? '…' : ''}</span>
            </div>
            {types.length === 0 ? (
              <div className="px-4 py-3 text-xs text-grey">No se reconoce ningún formato estándar (¿base64, cifrado, o texto?)</div>
            ) : (
              <div className="divide-y divide-edge/50">
                {types.slice(0, 4).map((t) => (
                  <div key={t.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-[12px]">
                    <span className="font-mono font-bold text-white">{t.name}</span>
                    <Badge tone={t.confidence === 'alta' ? 'ok' : t.confidence === 'media' ? 'warn' : 'info'}>confianza {t.confidence}</Badge>
                    {t.hashcat > 0 && <span className="font-mono text-grey">hashcat -m <span className="text-acento">{t.hashcat}</span></span>}
                    <span className="font-mono text-grey">john: <span className="text-acento">{t.john}</span></span>
                    <span className="w-full text-[11px] text-grey/70">{t.crackedBy}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 Los hashes de 32/40/64 hex son ambiguos (MD5≈NTLM≈MD4, SHA-1≈RIPEMD-160, SHA-256≈SHA3-256).
          El modo correcto lo confirma el sistema de origen: /etc/shadow → $…, NTDS.dit → NTLM, MySQL → *…, etc.
        </div>
      </Reveal>
    </div>
  )
}