import { useMemo, useState } from 'react'
import { Regex as RegexIcon } from 'lucide-react'
import { ToolHeader, Badge, Field, TextInput, TextArea, Button, Reveal, Toggle } from '../components/ui'

const PATTERNS: { label: string; re: string; desc: string }[] = [
  { label: 'IPv4', re: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', desc: 'direcciones IPv4' },
  { label: 'Email', re: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', desc: 'correos' },
  { label: 'URL', re: 'https?://[^\\s"\'<>]+', desc: 'enlaces http/https' },
  { label: 'Hash MD5/SHA', re: '\\b[0-9a-f]{32}\\b|\\b[0-9a-f]{40}\\b|\\b[0-9a-f]{64}\\b', desc: 'hashes hex' },
  { label: 'IP:puerto', re: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}:\\d{1,5}\\b', desc: 'host:puerto' },
  { label: 'Tarjeta crédito', re: '\\b(?:\\d[ -]?){13,16}\\b', desc: 'POSIBLE PCI' },
  { label: 'JWT', re: 'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]*', desc: 'tokens JWT' },
  { label: 'Clave AWS', re: 'AKIA[0-9A-Z]{16}', desc: 'access keys AWS' },
  { label: 'Clave privada', re: '-----BEGIN [A-Z ]+PRIVATE KEY-----', desc: 'PEM keys' },
  { label: 'SQLi inline', re: "(?i)(union\\s+select|'\\s*or\\s*'?1'?=)", desc: 'patrones de inyección' },
]

const CHEATS: [string, string][] = [
  ['\\d \\w \\s', 'dígito, palabra, espacio'],
  ['[^abc]', 'negación: lo que NO es a/b/c'],
  ['a+ a* a?', '1+, 0+, opcional'],
  ['a{2,4}', 'entre 2 y 4 repeticiones'],
  ['^ $ \\b', 'inicio, fin, borde de palabra'],
  ['(…)', 'grupo captura'],
  ['(?:…)', 'grupo sin captura'],
  ['(?<nombre>…)', 'grupo nombrado'],
  ['(?=…) (?!…)', 'lookahead positivo/negativo'],
  ['(?<=…) (?<!…)', 'lookbehind positivo/negativo'],
  ['(?i)patrón', 'case-insensitive inline'],
  ['[[:alpha:]]', '⚠ NO en JS: usar [a-zA-Z]'],
]

export default function Regex() {
  const [pattern, setPattern] = useState('\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b')
  const [text, setText] = useState(`El servidor 192.168.1.50 abrió ssh en 10.0.0.7:22 y la web corre en 172.16.0.1:8080.\nLogs: admin@example.com intentó login con hash 5d41402abc4b2a76b9719d911017c592.\nVer también https://objetivo.com/admin y 8.8.8.8:53.`)
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false, u: false })
  const [highlight, setHighlight] = useState(true)

  const flagStr = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join('')

  const result = useMemo(() => {
    try {
      const re = new RegExp(pattern, flagStr)
      const matches: { text: string; index: number; groups: (string | undefined)[]; named: Record<string, string | undefined> }[] = []
      if (pattern) {
        const reAll = new RegExp(pattern, flagStr.includes('g') ? flagStr : flagStr + 'g')
        let m: RegExpExecArray | null
        let guard = 0
        while ((m = reAll.exec(text)) !== null && guard++ < 1000) {
          matches.push({ text: m[0], index: m.index, groups: m.slice(1), named: { ...m.groups } })
          if (m[0] === '') reAll.lastIndex++
        }
      }
      re.test('')
      return { re, matches, error: null as string | null, ok: true }
    } catch (e) {
      return { re: null, matches: [], error: (e as Error).message, ok: false }
    }
  }, [pattern, text, flagStr])

  const highlighted = useMemo(() => {
    if (!highlight || !result.ok || !pattern) return null
    try {
      const re = new RegExp(pattern, (flagStr.includes('g') ? flagStr : flagStr + 'g'))
      const parts: { text: string; hit: boolean }[] = []
      let last = 0
      let m: RegExpExecArray | null
      let guard = 0
      while ((m = re.exec(text)) !== null && guard++ < 2000) {
        if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false })
        parts.push({ text: m[0], hit: true })
        last = m.index + m[0].length
        if (m[0] === '') re.lastIndex++
      }
      if (last < text.length) parts.push({ text: text.slice(last), hit: false })
      return parts
    } catch {
      return null
    }
  }, [pattern, text, flagStr, highlight, result.ok])

  return (
    <div>
      <ToolHeader icon={RegexIcon} title="Regex Lab" desc="Prueba expresiones regulares en vivo con resaltado, grupos de captura y cheat sheet de sintaxis" />

      <Reveal>
        <div className="card space-y-4 p-6">
          <Field label="patrón" hint={result.ok ? `${result.matches.length} matches` : 'patrón inválido'}>
            <TextInput value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono text-base" placeholder="(?:\\d{1,3}\\.){3}\\d{1,3}" />
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-grey">flags</span>
            {([
              ['g', 'global'],
              ['i', 'ignorar mayús'],
              ['m', 'multilínea'],
              ['s', 'dotall'],
              ['u', 'unicode'],
            ] as [keyof typeof flags, string][]).map(([f, label]) => (
              <Toggle key={f} checked={flags[f]} onChange={(v) => setFlags((fl) => ({ ...fl, [f]: v }))} label={`${f} — ${label}`} />
            ))}
          </div>
          <Field label="texto de prueba">
            <TextArea value={text} onChange={(e) => setText(e.target.value)} className="min-h-32 font-mono" />
          </Field>
        </div>
      </Reveal>

      {result.error && (
        <div className="card mt-6 border-bad/40 p-4 font-mono text-xs text-bad">⚠ {result.error}</div>
      )}

      {highlighted && (
        <Reveal>
          <div className="card mt-6 p-6">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">texto resaltado</h3>
              <Badge tone="accent">{result.matches.length} coincidencias</Badge>
            </div>
            <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-all rounded-xl border border-edge bg-black/60 p-4 font-mono text-[13px] leading-relaxed">
              {highlighted.map((p, i) =>
                p.hit ? (
                  <mark key={i} className="rounded bg-acento/25 px-0.5 text-acento ring-1 ring-acento/40">{p.text}</mark>
                ) : (
                  <span key={i} className="text-grey">{p.text}</span>
                ),
              )}
            </div>
          </div>
        </Reveal>
      )}

      {result.matches.length > 0 && (
        <Reveal>
          <div className="card mt-6 overflow-hidden">
            <div className="border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-grey">
              matches ({result.matches.length})
            </div>
            <div className="max-h-80 divide-y divide-edge/50 overflow-y-auto">
              {result.matches.map((m, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-x-4">
                    <span className="font-mono text-[10px] text-grey">@{m.index}</span>
                    <span className="break-all font-mono text-[13px] font-bold text-acento">{m.text}</span>
                  </div>
                  {m.groups.some((g) => g !== undefined) && (
                    <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px]">
                      {m.groups.map((g, gi) => (
                        <span key={gi} className="rounded border border-info/30 bg-info/5 px-1.5 py-0.5 text-info">
                          ${gi + 1} = {g ?? '—'}
                        </span>
                      ))}
                    </div>
                  )}
                  {Object.keys(m.named).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11px]">
                      {Object.entries(m.named).map(([k, v]) => (
                        <span key={k} className="rounded border border-warn/30 bg-warn/5 px-1.5 py-0.5 text-warn">
                          {k} = {v ?? '—'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">patrones OSINT/forense listos para usar</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {PATTERNS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPattern(p.re)}
                className="rounded-lg border border-edge p-2.5 text-left transition-all hover:border-acento/50 hover:bg-acento/5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-acento">{p.label}</span>
                  <span className="font-mono text-[10px] text-grey">{p.desc}</span>
                </div>
                <code className="mt-1 block truncate font-mono text-[10px] text-grey/70">{p.re}</code>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">cheat sheet JS</h3>
          <div className="grid gap-x-6 gap-y-1.5 font-mono text-[11.5px] sm:grid-cols-2">
            {CHEATS.map(([syn, desc]) => (
              <div key={syn} className="flex gap-3 border-b border-edge/40 py-1">
                <code className="w-36 shrink-0 text-acento">{syn}</code>
                <span className="text-grey">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
