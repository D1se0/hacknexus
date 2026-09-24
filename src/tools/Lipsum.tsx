import { useMemo, useState } from 'react'
import { TypeOutline, Download, Dices } from 'lucide-react'
import { ToolHeader, Field, TextInput, Button, Reveal, CopyBlock, Badge, useToast } from '../components/ui'
import { download } from '../lib/util'

/* Palabras en latín clásico (lorem ipsum estándar) */
const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum sed perspiciatis unde omnis iste natus error voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi architecto beatae vitae dicta explicabo nemo ipsam quia voluptas aspernatur aut odit fugit consequuntur magni dolores eos ratione sequi nesciunt neque porro quisquam dolorem adipisci numquam eius modi tempora incidunt magnam quaerat etiam processus dynamicus consuetudium lectorum mirum est notare quam littera gothica sequitur mutationem consuetudium lectorum mirror decima etractus').split(' ')

const HACK_WORDS = ('root sudo exploit payload shellcode bypass enum pivot CVE RCE LFI XSS SSRF privesc hashcat nmap burp metasploit reverse bind staged LOLBas kerberos ACL ACL SYSVOL bloodhound impacket responder relay NTLM samrain hashdump token impersonate escalate persistence sandbox evasion obfuscate AMSI ETW syscall hooking proxy tunnel DNS exfil loot flag CTF').split(' ')

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randSentence(hacker: boolean): string {
  const pool = hacker ? [...WORDS, ...HACK_WORDS, ...HACK_WORDS] : WORDS
  const n = 6 + Math.floor(Math.random() * 12)
  const words = Array.from({ length: n }, () => pick(pool))
  return cap(words.join(' ')) + '.'
}

function randParagraph(hacker: boolean): string {
  const n = 3 + Math.floor(Math.random() * 4)
  return Array.from({ length: n }, () => randSentence(hacker)).join(' ')
}

type Unit = 'párrafos' | 'frases' | 'palabras'
type Fmt = 'plano' | 'markdown' | 'html' | 'json'

export default function Lipsum() {
  const [unit, setUnit] = useState<Unit>('párrafos')
  const [count, setCount] = useState(3)
  const [hacker, setHacker] = useState(false)
  const [fmt, setFmt] = useState<Fmt>('plano')
  const [seed, setSeed] = useState(0) // regenerar
  const toast = useToast()

  const text = useMemo(() => {
    void seed
    if (unit === 'palabras') {
      const pool = hacker ? [...WORDS, ...HACK_WORDS] : WORDS
      return Array.from({ length: count }, () => pick(pool)).join(' ')
    }
    if (unit === 'frases') {
      return Array.from({ length: count }, () => randSentence(hacker)).join(' ')
    }
    return Array.from({ length: count }, () => randParagraph(hacker)).join('\n\n')
  }, [unit, count, hacker, seed])

  const formatted = useMemo(() => {
    if (fmt === 'markdown') {
      return unit === 'párrafos' ? text.split('\n\n').map((p, i) => `## ${i + 1}. ${p}`).join('\n\n') : `> ${text}`
    }
    if (fmt === 'html') {
      return unit === 'párrafos' ? text.split('\n\n').map((p) => `<p>${p}</p>`).join('\n') : `<p>${text}</p>`
    }
    if (fmt === 'json') {
      return JSON.stringify(unit === 'párrafos' ? { paragraphs: text.split('\n\n') } : { text }, null, 2)
    }
    return text
  }, [text, fmt, unit])

  const words = text.trim().split(/\s+/).length

  return (
    <div className="min-w-0">
      <ToolHeader icon={TypeOutline} title="Lorem Ipsum Generator" desc="Texto de relleno en latín (o modo hacker) por párrafos, frases o palabras, con salida plano, Markdown, HTML o JSON" />

      <Reveal>
        <div className="card flex flex-wrap items-end gap-4 p-6">
          <div>
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">unidad</span>
            <div className="flex gap-1.5">
              {(['párrafos', 'frases', 'palabras'] as Unit[]).map((u) => (
                <button key={u} onClick={() => setUnit(u)} className={`rounded-lg border px-3 py-2 font-mono text-xs transition-all ${unit === u ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <Field label="cantidad" className="w-24">
            <TextInput type="number" min={1} max={500} value={count} onChange={(e) => setCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))} />
          </Field>
          <div>
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-grey">formato</span>
            <div className="flex gap-1.5">
              {(['plano', 'markdown', 'html', 'json'] as Fmt[]).map((f) => (
                <button key={f} onClick={() => setFmt(f)} className={`rounded-lg border px-3 py-2 font-mono text-xs transition-all ${fmt === f ? 'border-info/60 bg-info/10 text-info' : 'border-edge text-grey hover:text-ink'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => setSeed((s) => s + 1)}><Dices size={14} /> regenerar</Button>
            <Button variant="ghost" onClick={() => { setHacker(!hacker); setSeed((s) => s + 1) }}>
              {hacker ? '🧨 modo hacker ON' : '🧨 modo hacker'}
            </Button>
            <Button variant="ghost" onClick={() => { download(`lorem-${unit}.txt`, formatted, 'text/plain'); toast('descargado') }}>
              <Download size={14} />
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{words.toLocaleString('es-ES')} palabras</Badge>
            <Badge tone="neutral">{text.length.toLocaleString('es-ES')} caracteres</Badge>
            {hacker && <Badge tone="warn">modo hacker activo</Badge>}
          </div>
          <CopyBlock text={formatted} label={`lorem ipsum · ${fmt}`} maxH="max-h-[520px]" />
        </div>
      </Reveal>

      <Reveal>
        <p className="mt-4 font-mono text-[11px] text-grey">
          💡 Útil para poblar mockups, probar truncate/wrap de UIs, generar fixtures de bases de datos y payloads de relleno en fuzzing. El modo hacker mezcla vocabulario de seguridad para demos temáticas.
        </p>
      </Reveal>
    </div>
  )
}
