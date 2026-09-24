import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Binary, ArrowLeftRight } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextArea, Badge, Reveal } from '../components/ui'
import {
  b64Encode, b64Decode, base32Encode, base32Decode, base58Encode, base58Decode, base62Encode, base62Decode,
  ascii85Encode, ascii85Decode, hexEncode, hexDecode, binEncode, binDecode, octalEncode, decEncode,
  urlEncode, urlEncodeAll, urlDecode, htmlEntities, htmlUnescape, unicodeEscape, unicodeUnescape, morseEncode, morseDecode,
} from '../lib/encoders'
import { fmtNum } from '../lib/util'

interface Row {
  name: string
  encode: (s: string) => string
  decode: (s: string) => string
  note?: string
}

const ROWS: Row[] = [
  { name: 'Base64', encode: b64Encode, decode: b64Decode },
  { name: 'Base64 (URL-safe)', encode: (s) => b64Encode(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), decode: b64Decode, note: 'JWT, cookies' },
  { name: 'Base32', encode: base32Encode, decode: base32Decode, note: 'secretos 2FA' },
  { name: 'Base58', encode: base58Encode, decode: base58Decode, note: 'Bitcoin, IPs IPFS' },
  { name: 'Base62', encode: base62Encode, decode: base62Decode, note: 'shorteners' },
  { name: 'Ascii85 (Base85)', encode: ascii85Encode, decode: ascii85Decode, note: 'PDF, git patches' },
  { name: 'Hexadecimal', encode: hexEncode, decode: hexDecode },
  { name: 'Binario', encode: binEncode, decode: binDecode },
  { name: 'Octal (\\ escapes)', encode: octalEncode, decode: (s) => s.replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))), note: 'bash $\'...\' bypass' },
  { name: 'Decimal', encode: decEncode, decode: (s) => s.trim().split(/\s+/).map((n) => String.fromCharCode(parseInt(n, 10))).join('') },
  { name: 'URL encode', encode: urlEncode, decode: urlDecode },
  { name: 'URL encode total (%XX todo)', encode: urlEncodeAll, decode: urlDecode, note: 'WAF bypass' },
  { name: 'HTML entities', encode: htmlEntities, decode: htmlUnescape },
  { name: 'Unicode \\uXXXX', encode: unicodeEscape, decode: unicodeUnescape, note: 'Java/JS strings' },
  { name: 'Morse', encode: morseEncode, decode: morseDecode },
]

export default function Encoders() {
  const [text, setText] = useState('payload de prueba <script>alert(1)</script>')
  const [decoded, setDecoded] = useState<Record<string, string>>({})
  const rows = useMemo(() => ROWS.map((r) => ({ ...r, value: text ? safe(r.encode, text) : '' })), [text])

  useEffect(() => {
    const out: Record<string, string> = {}
    for (const r of ROWS) out[r.name] = safe(r.encode, text)
    setDecoded(out)
  }, [text])

  return (
    <div>
      <ToolHeader icon={Binary} title="Multi-Encoders" desc="15 codificaciones en simultáneo con decodificador integrado — pega y mira" />

      <Reveal>
        <div className="card p-6">
          <Field label="Texto de entrada" hint={`${fmtNum(text.length)} chars`}>
            <TextArea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          </Field>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-3">
        {rows.map((r, i) => (
          <motion.div key={r.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="card p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-acento">{r.name}</span>
              {r.note && <Badge tone="info">{r.note}</Badge>}
              <div className="ml-auto flex gap-1.5">
                <CopyBtn text={r.value} />
                <button
                  onClick={() => setText(safe(r.decode, r.value))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-panel px-2.5 py-1.5 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento"
                >
                  <ArrowLeftRight size={11} /> usar como entrada
                </button>
              </div>
            </div>
            <code className="block max-h-28 overflow-auto break-all rounded-lg border border-edge/60 bg-black/40 px-3 py-2 font-mono text-[12px] text-ink">
              {r.value || '—'}
            </code>
            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-grey hover:text-acento">decodificar aquí</summary>
              <div className="mt-2 flex gap-2">
                <input
                  placeholder="pega texto codificado…"
                  onChange={(e) => setDecoded((d) => ({ ...d, [r.name]: safe(r.decode, e.target.value) }))}
                  className="w-full rounded-lg border border-edge bg-black/40 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-acento/60"
                />
              </div>
              {decoded[r.name] && (
                <code className="mt-2 block break-all rounded-lg border border-ok/30 bg-ok/5 px-3 py-2 font-mono text-[12px] text-ok">
                  {decoded[r.name] || '(vacío)'}
                </code>
              )}
            </details>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function safe(fn: (s: string) => string, s: string): string {
  try {
    return fn(s)
  } catch (e) {
    return `⚠ error: ${(e as Error).message}`
  }
}