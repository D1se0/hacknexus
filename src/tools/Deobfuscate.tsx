import { useMemo, useState } from 'react'
import { Wand2, ArrowDown, Braces, Layers } from 'lucide-react'
import { ToolHeader, Badge, Reveal, CopyBlock, KV, InfoBanner, Field } from '../components/ui'
import { b64Decode, hexDecode, caesar, urlDecode, htmlUnescape, unicodeUnescape } from '../lib/encoders'

/* ── detección de codificación ── */
type Layer = { kind: string; out: string }

const isProbablyBase64 = (s: string): boolean =>
  /^[A-Za-z0-9+/]+={0,2}$/.test(s.trim()) && s.trim().length >= 8 && s.trim().length % 4 === 0

const isProbablyHex = (s: string): boolean =>
  /^(?:[0-9a-fA-F]{2})+$/.test(s.replace(/[\s:]/g, '')) && s.replace(/[\s:]/g, '').length >= 8

const isProbablyBinary = (s: string): boolean => s.trim().length >= 8 && /^[01\s]+$/.test(s.trim())

const isProbablyDecimal = (s: string): boolean => {
  const t = s.trim()
  return /^\d{2,3}(\s+\d{2,3})+$/.test(t) && t.split(/\s+/).every((n) => Number(n) < 128)
}

const printableScore = (s: string): number => {
  if (!s) return 0
  const chars = [...s]
  let ok = 0
  for (const c of chars) {
    const code = c.codePointAt(0) ?? 0
    if ((code >= 32 && code < 127) || code === 9 || code === 10 || code === 13 || code > 0xa0) ok++
  }
  return ok / chars.length
}

function detectLayers(input: string, maxLayers = 10): Layer[] {
  const layers: Layer[] = []
  let cur = input
  for (let i = 0; i < maxLayers; i++) {
    const t = cur.trim()
    let next: string | null = null
    let kind = ''

    if (isProbablyHex(t)) {
      try {
        const dec = hexDecode(t.replace(/[\s:]/g, ''))
        if (dec && printableScore(dec) > 0.85 && dec !== cur) { next = dec; kind = 'hex' }
      } catch { /* noop */ }
    }
    if (!next && isProbablyBase64(t)) {
      try {
        const dec = b64Decode(t)
        if (dec && printableScore(dec) > 0.75 && dec !== cur) { next = dec; kind = 'base64' }
      } catch { /* noop */ }
    }
    if (!next && isProbablyBinary(t)) {
      const dec = t.trim().split(/\s+/).map((b) => String.fromCharCode(parseInt(b, 2))).join('')
      if (printableScore(dec) > 0.9 && dec !== cur) { next = dec; kind = 'binario' }
    }
    if (!next && isProbablyDecimal(t)) {
      const dec = t.split(/\s+/).map((n) => String.fromCharCode(Number(n))).join('')
      if (printableScore(dec) > 0.9 && dec !== cur) { next = dec; kind = 'decimal' }
    }
    if (!next && /\\x[0-9a-fA-F]{2}/.test(t)) {
      const dec = t.replace(/\\x([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
      if (dec !== cur) { next = dec; kind = '\\x escapes' }
    }
    if (!next && /\\u[0-9a-fA-F]{4}/.test(t)) {
      try {
        const dec = unicodeUnescape(t)
        if (dec !== cur) { next = dec; kind = '\\u escapes' }
      } catch { /* noop */ }
    }
    if (!next && /&(#x?[0-9a-fA-F]+|#\d+|[a-z]+);/i.test(t)) {
      const dec = htmlUnescape(t)
      if (dec !== t) { next = dec; kind = 'HTML entities' }
    }
    if (!next && /%[0-9a-fA-F]{2}/.test(t)) {
      try {
        const dec = urlDecode(t)
        if (dec !== t) { next = dec; kind = 'URL-encode' }
      } catch { /* noop */ }
    }
    if (!next && /^0x[0-9a-fA-F]{2}(?:,0x[0-9a-fA-F]{2})+$/.test(t.replace(/\s/g, ''))) {
      const dec = (t.replace(/[\s]/g, '').match(/0x../g) ?? []).map((h) => String.fromCharCode(parseInt(h.slice(2), 16))).join('')
      if (dec !== cur) { next = dec; kind = 'array 0x' }
    }

    if (!next || next === cur) break
    layers.push({ kind, out: next })
    cur = next
  }
  return layers
}

/* ── análisis de single-byte XOR ── */
const FREQ_ES = 'eaosrnidlctumpbgvyqhfzjñxkw'

function xorCrack(input: string): { key: number; text: string; score: number } | null {
  const bytes = [...input].map((c) => c.charCodeAt(0) & 0xff)
  if (bytes.length < 8) return null
  let best: { key: number; text: string; score: number } | null = null
  for (let k = 1; k < 256; k++) {
    const text = bytes.map((b) => String.fromCharCode(b ^ k)).join('')
    let score = 0
    for (const c of text.toLowerCase()) {
      const idx = FREQ_ES.indexOf(c)
      if (idx >= 0) score += 26 - idx
      else if (c === ' ') score += 12
      else if (c >= 'a' && c <= 'z') score += 8
      else if (c >= '0' && c <= '9') score += 2
      else if (c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126) score -= 30
    }
    score /= text.length
    if (!best || score > best.score) best = { key: k, text, score }
  }
  return best
}

const xorWithKey = (input: string, key: string): string => {
  if (!key) return input
  return [...input].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('')
}

/* ── métricas de ofuscación JS ── */
function jsObfuscationFacts(code: string): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = []
  const count = (re: RegExp) => String((code.match(re) ?? []).length)
  facts.push({ label: 'eval() / setTimeout(str)', value: count(/\beval\s*\(/g) + '+' + count(/\bsetTimeout\s*\(\s*['"]/g) })
  facts.push({ label: 'Function constructor', value: count(/\bnew\s+Function\s*\(/g) })
  facts.push({ label: 'atob / btoa', value: `${count(/\batob\s*\(/g)} / ${count(/\bbtoa\s*\(/g)}` })
  facts.push({ label: 'document.write', value: count(/document\.write/g) })
  const hexEsc = code.match(/\\x[0-9a-fA-F]{2}/g)?.length ?? 0
  const uniEsc = code.match(/\\u[0-9a-fA-F]{4}/g)?.length ?? 0
  facts.push({ label: 'escapes \\x / \\u', value: `${hexEsc} / ${uniEsc}` })
  facts.push({ label: 'identificadores 0x… (packer JS)', value: String(new Set(code.match(/_?0x[0-9a-f]{4,}/gi) ?? []).size) })
  const longest = code.split(/[\s;]+/).reduce((a, b) => (b.length > a.length ? b : a), '')
  facts.push({ label: 'token más largo', value: longest.length > 60 ? `${longest.slice(0, 57)}… (${longest.length})` : `${longest.length} chars` })
  return facts
}

export default function Deobfuscate() {
  const [input, setInput] = useState('')
  const [xorKey, setXorKey] = useState('')
  const [rotShift, setRotShift] = useState(13)

  const layers = useMemo(() => (input.trim() ? detectLayers(input) : []), [input])
  const finalOut = layers.length ? layers[layers.length - 1].out : input
  const xorBest = useMemo(() => xorCrack(finalOut || input), [finalOut, input])

  return (
    <div>
      <ToolHeader icon={Wand2} title="Deobfuscator" desc="Descodificador multi-capa con detección automática (hex→base64→URL→escapes…), crackeo XOR de un byte y métricas de código JS ofuscado" />

      <InfoBanner>
        Pega cualquier cadena ofuscada (payload de CTF, parámetro de URL raro, config "cifrada" con XOR). Detecta y aplica capas automáticamente mostrando cada paso. Para JS ofuscado: analiza las métricas, pero <b>nunca lo ejecutes</b> fuera de un sandbox aislado.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-grey">entrada ofuscada</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                placeholder={'SGVsbG8gV29ybGQh\n48 65 6c 6c 6f\n%48%65%6c%6c%6f\n\\x48\\x65\\x6c\\x6c\\x6f'}
                className="min-h-44 w-full resize-y rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-acento/60"
              />
            </div>
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-grey">resultado final</p>
              <CopyBlock text={finalOut || '—'} label={`${layers.length} capa(s) decodificadas`} maxH="max-h-44" />
              {layers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {layers.map((l, i) => (
                    <Badge key={i} tone="accent">{i + 1}· {l.kind}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {layers.length > 1 && (
        <Reveal>
          <div className="card mt-6 p-6">
            <h3 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Layers size={13} /> cadena de capas</h3>
            <div className="space-y-3">
              {layers.map((l, i) => (
                <div key={i} className="rounded-lg border border-edge bg-black/30 p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-acento/15 font-mono text-[10px] text-acento">{i + 1}</span>
                    <Badge tone="accent">{l.kind}</Badge>
                    <ArrowDown size={11} className="text-grey/50" />
                    <span className="font-mono text-[10px] text-grey">{l.out.length} chars</span>
                  </div>
                  <p className="max-h-20 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-ink/85">{l.out.slice(0, 400)}{l.out.length > 400 ? '…' : ''}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] text-grey">Cada capa se detecta por estructura (charset, longitud par, ratio de imprimabilidad); se corta cuando una capa no produce texto legible.</p>
          </div>
        </Reveal>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* XOR */}
        <Reveal>
          <div className="card h-full p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">XOR</h3>
            <p className="mb-3 font-mono text-[11px] text-grey">Prueba las 255 claves de un byte y puntúa por frecuencia del español:</p>
            {xorBest ? (
              <>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <KV k="mejor clave" v={<span className="text-acento">0x{xorBest.key.toString(16).padStart(2, '0')} &quot;{String.fromCharCode(xorBest.key)}&quot;</span>} />
                  <KV k="puntuación" v={xorBest.score.toFixed(2)} />
                </div>
                <div className="mt-3">
                  <CopyBlock text={xorBest.text.slice(0, 600)} label="texto descifrado (auto)" maxH="max-h-40" />
                </div>
              </>
            ) : (
              <p className="font-mono text-xs text-grey">Introduce al menos 8 caracteres para el análisis.</p>
            )}
            <Field label="descifrado con clave manual (multi-byte)" className="mt-4">
              <input
                value={xorKey}
                onChange={(e) => setXorKey(e.target.value)}
                placeholder="clave (string)"
                className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60"
              />
            </Field>
            {xorKey && (
              <div className="mt-3">
                <CopyBlock text={xorWithKey(finalOut || input, xorKey).slice(0, 600)} label={`XOR "${xorKey}"`} maxH="max-h-36" />
              </div>
            )}
          </div>
        </Reveal>

        {/* ROT + JS */}
        <Reveal delay={0.05}>
          <div className="card h-full p-6">
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">ROT-N</h3>
            <Field label={`shift: ${rotShift}`} className="mb-3">
              <input type="range" min={1} max={25} value={rotShift} onChange={(e) => setRotShift(parseInt(e.target.value))} className="w-full accent-[#2ee88a]" />
            </Field>
            <CopyBlock text={caesar(finalOut || input, rotShift).slice(0, 600)} label={`caesar ${rotShift}`} maxH="max-h-32" />

            <h4 className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-widest text-grey"><Braces size={12} className="mr-1 inline" /> métricas de ofuscación JS</h4>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {jsObfuscationFacts(finalOut || input).map((f) => (
                <KV key={f.label} k={f.label} v={f.value} />
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] text-grey">eval/atob alto + identificadores 0x… = salida típica de javascript-obfuscator. Analiza en sandbox (p. ej. VM + dump), nunca en tu equipo.</p>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
