import { useMemo, useState } from 'react'
import { Smile, Ghost } from 'lucide-react'
import { ToolHeader, CopyBtn, Field, TextArea, Reveal } from '../components/ui'
import { emojiEncode, emojiDecode, zeroWidthEncode, zeroWidthDecode, zeroWidthStrip } from '../lib/emoji'

export default function Emoji() {
  const [text, setText] = useState('payload secreto')
  const [emojiIn, setEmojiIn] = useState('')

  const encoded = useMemo(() => (text ? emojiEncode(text) : ''), [text])
  const zw = useMemo(() => (text ? zeroWidthEncode(text) : ''), [text])
  const decoded = useMemo(() => (emojiIn ? safe(emojiDecode, emojiIn) : ''), [emojiIn])

  return (
    <div>
      <ToolHeader icon={Smile} title="Emoji & Zero-Width Encoder" desc="Codifica cualquier texto en emojis decodificables o en caracteres invisibles — genial para OCULTAR payloads o firmar mensajes" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <Field label="Texto a codificar">
              <TextArea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            </Field>
          </div>
        </Reveal>

        <Reveal>
          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Smile size={15} className="text-acento" />
              <h3 className="font-mono text-sm font-bold text-white">Emoji encoding</h3>
              <span className="font-mono text-[10px] text-grey">1 byte → 2 emojis (alfabeto de 16)</span>
              <CopyBtn text={encoded} className="ml-auto" />
            </div>
            <code className="block max-h-36 overflow-auto break-all rounded-lg border border-edge/60 bg-black/40 px-3 py-2 font-mono text-lg leading-relaxed">
              {encoded || '—'}
            </code>
            <details className="mt-3">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-grey hover:text-acento">pegar emojis para decodificar</summary>
              <div className="mt-2 space-y-2">
                <TextArea value={emojiIn} onChange={(e) => setEmojiIn(e.target.value)} placeholder="🔐😀🎃…" className="min-h-16" />
                {decoded && (
                  <code className="block break-all rounded-lg border border-ok/30 bg-ok/5 px-3 py-2 font-mono text-sm text-ok">{decoded}</code>
                )}
              </div>
            </details>
          </div>
        </Reveal>

        <Reveal>
          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <Ghost size={15} className="text-info" />
              <h3 className="font-mono text-sm font-bold text-white">Zero-width (invisible)</h3>
              <span className="font-mono text-[10px] text-grey">U+200B/C/D y U+2060 — invisible en la mayoría de editores</span>
              <CopyBtn text={zw} className="ml-auto" />
            </div>
            <div className="rounded-lg border border-edge/60 bg-black/40 px-3 py-3">
              <p className="break-all font-mono text-sm text-ink">
                {text ? `Texto visible${zw ? ' ' : ''}` : '—'}
                <span className="select-all" title={`${zw.length} caracteres invisibles`}>{zw}</span>
                {zw && <span className="ml-2 font-mono text-[10px] text-grey">← hay {zw.length} chars invisibles tras “Texto visible”</span>}
              </p>
            </div>
            {zw && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setText(safe(zeroWidthDecode, zw))}
                  className="rounded-md border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey hover:border-acento/50 hover:text-acento"
                >
                  probar decodificado local
                </button>
                <button
                  onClick={() => setText(zeroWidthStrip(text))}
                  className="rounded-md border border-edge px-2.5 py-1.5 font-mono text-[11px] text-grey hover:border-bad/50 hover:text-bad"
                >
                  limpiar entrada de ZW chars
                </button>
              </div>
            )}
          </div>
        </Reveal>

        <Reveal>
          <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
            💡 En SSO/emails/foros los chars zero-width sobreviven a copy-paste: útil para detectar filtraciones de texto,
            marcar documentos (watermarking) o colar “payloads” visualmente idénticos. El modo emoji usa UTF-8 real:
            cuidado con sistemas que hagan NFKC normalization.
          </div>
        </Reveal>
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