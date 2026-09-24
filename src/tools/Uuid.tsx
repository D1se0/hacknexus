import { useMemo, useState } from 'react'
import { Radio, Copy, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ToolHeader, Badge, Field, TextInput, Button, Reveal, ErrorBox, useToast } from '../components/ui'
import { copyText, randInt } from '../lib/util'

/* UUID v4 — RFC 4122 con crypto.getRandomValues */
function uuidV4(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/* NanoID — alfabeto URL-safe, 21 chars por defecto (139 bits de entropía) */
const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict'
function nanoid(size = 21): string {
  let out = ''
  for (let i = 0; i < size; i++) out += NANOID_ALPHABET[randInt(0, NANOID_ALPHABET.length - 1)]
  return out
}

/* ObjectId estilo MongoDB: 4B timestamp + 5B random + 3B counter */
let oidCounter = randInt(0, 0xffffff)
function objectId(): string {
  const ts = Math.floor(Date.now() / 1000)
  const rand = new Uint8Array(5)
  crypto.getRandomValues(rand)
  oidCounter = (oidCounter + 1) & 0xffffff
  const hex = (n: number, w: number) => n.toString(16).padStart(w, '0')
  return (
    hex(ts, 8) +
    Array.from(rand, (x) => hex(x, 2)).join('') +
    hex(oidCounter, 6)
  )
}

/* ULID: 48-bit timestamp Crockford base32 + 80 bits random */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
function ulid(): string {
  let time = Date.now()
  let ts = ''
  for (let i = 0; i < 10; i++) {
    ts = CROCKFORD[time % 32] + ts
    time = Math.floor(time / 32)
  }
  const rand = crypto.getRandomValues(new Uint8Array(10))
  let str = ts
  let bits = 0
  let acc = 0
  for (const b of rand) {
    acc = (acc << 8) | b
    bits += 8
    while (bits >= 5) {
      str += CROCKFORD[(acc >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) str += CROCKFORD[(acc << (5 - bits)) & 31]
  return str
}

type Kind = 'uuidv4' | 'nanoid' | 'objectid' | 'ulid'

const KIND_META: Record<Kind, { label: string; gen: () => string; entropy: string }> = {
  uuidv4: { label: 'UUID v4', gen: uuidV4, entropy: '122 bits aleatorios' },
  nanoid: { label: 'NanoID', gen: () => nanoid(), entropy: '126 bits · 21 chars URL-safe' },
  objectid: { label: 'ObjectId', gen: objectId, entropy: '32 bits tiempo + 40 random + 24 contador' },
  ulid: { label: 'ULID', gen: ulid, entropy: '48 bits tiempo + 80 random · ordenable' },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function uuidVersion(u: string): string | null {
  const m = u.trim().match(UUID_RE)
  if (!m) return null
  const v = parseInt(u.trim()[14])
  const variants: Record<number, string> = {
    1: 'v1 — basado en tiempo+MAC (¡filtra MAC!)',
    2: 'v2 — DCE security (raro)',
    3: 'v3 — MD5 de nombre (determinista)',
    4: 'v4 — aleatorio criptográfico',
    5: 'v5 — SHA-1 de nombre (determinista)',
  }
  return variants[v] ?? `v${v}`
}

export default function Uuid() {
  const [kind, setKind] = useState<Kind>('uuidv4')
  const [count, setCount] = useState(5)
  const [uppercase, setUppercase] = useState(false)
  const [noDash, setNoDash] = useState(false)
  const [ids, setIds] = useState<string[]>([])
  const [validate, setValidate] = useState('')
  const toast = useToast()

  const generate = () => {
    const gen = KIND_META[kind].gen
    let out = Array.from({ length: count }, gen)
    if (kind === 'uuidv4') {
      if (noDash) out = out.map((u) => u.replace(/-/g, ''))
      if (uppercase) out = out.map((u) => u.toUpperCase())
    }
    setIds(out)
  }

  const allText = ids.join('\n')

  const validation = useMemo(() => {
    const v = validate.trim()
    if (!v) return null
    const version = uuidVersion(v)
    if (version) {
      const tsBits = v.replace(/-/g, '').slice(0, 8)
      return { ok: true, msg: `${version} · formato RFC 4122 válido`, extra: kind === 'objectid' ? '' : undefined }
    }
    if (/^[0-9a-f]{24}$/i.test(v)) {
      const ts = parseInt(v.slice(0, 8), 16) * 1000
      const d = new Date(ts)
      return { ok: true, msg: `ObjectId válido · creado ${d.toLocaleString('es-ES')}`, extra: undefined }
    }
    if (new RegExp(`^[${CROCKFORD}]{26}$`).test(v.toUpperCase())) {
      let time = 0
      for (const ch of v.toUpperCase().slice(0, 10)) time = time * 32 + CROCKFORD.indexOf(ch)
      return { ok: true, msg: `ULID válido · timestamp ${new Date(time).toLocaleString('es-ES')}`, extra: undefined }
    }
    if (/^[A-Za-z0-9_-]{21}$/.test(v) && !UUID_RE.test(v)) {
      return { ok: true, msg: 'Parece un NanoID (21 chars del alfabeto URL-safe)', extra: undefined }
    }
    return { ok: false, msg: 'No parece ningún formato conocido (UUID/NanoID/ObjectId/ULID)', extra: undefined }
  }, [validate, kind])

  return (
    <div>
      <ToolHeader icon={Radio} title="UUID & IDs" desc="Genera UUID v4, NanoID, ObjectIds y ULIDs criptográficamente seguros con validador de formato" />

      <Reveal>
        <div className="card space-y-4 p-6">
          <div className="grid gap-2 sm:grid-cols-4">
            {(Object.keys(KIND_META) as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  kind === k ? 'border-acento/60 bg-acento/10 text-acento shadow-glow' : 'border-edge text-grey hover:text-ink'
                }`}
              >
                <div className="font-mono text-sm font-bold">{KIND_META[k].label}</div>
                <div className="mt-0.5 font-mono text-[10px] opacity-70">{KIND_META[k].entropy}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <Field label="cantidad" className="w-28">
              <TextInput type="number" min={1} max={200} value={count} onChange={(e) => setCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 5)))} />
            </Field>
            {kind === 'uuidv4' && (
              <>
                <label className="flex items-center gap-2 pb-2.5 font-mono text-xs text-grey">
                  <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="accent-[#2ee88a]" />
                  MAYÚSCULAS
                </label>
                <label className="flex items-center gap-2 pb-2.5 font-mono text-xs text-grey">
                  <input type="checkbox" checked={noDash} onChange={(e) => setNoDash(e.target.checked)} className="accent-[#2ee88a]" />
                  sin guiones
                </label>
              </>
            )}
            <Button onClick={generate} className="mb-1">▶ generar</Button>
            {ids.length > 0 && (
              <>
                <Button variant="ghost" onClick={() => { copyText(allText); toast(`${ids.length} IDs copiados`) }} className="mb-1">copiar todos</Button>
                <Button variant="ghost" onClick={() => setIds([])} className="mb-1"><Trash2 size={14} /></Button>
              </>
            )}
          </div>
        </div>
      </Reveal>

      {ids.length > 0 && (
        <Reveal>
          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-edge bg-black/30 px-4 py-2.5 font-mono text-[11px] text-grey">
              <Badge tone="accent">{KIND_META[kind].label}</Badge>
              {ids.length} generados
            </div>
            <div className="max-h-96 divide-y divide-edge/40 overflow-y-auto">
              {ids.map((id, i) => (
                <motion.button
                  key={id + i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  onClick={() => { copyText(id); toast('ID copiado') }}
                  className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-acento/5"
                >
                  <span className="w-8 font-mono text-[10px] text-grey">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 break-all font-mono text-[13px] text-ink">{id}</span>
                  <Copy size={11} className="text-grey opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">validador / decodificador</h3>
          <TextInput
            value={validate}
            onChange={(e) => setValidate(e.target.value)}
            className="font-mono"
            placeholder="pega un UUID, ObjectId, ULID o NanoID…"
          />
          {validation && (
            <div className={`mt-3 rounded-lg border px-4 py-2.5 font-mono text-xs ${validation.ok ? 'border-ok/40 bg-ok/5 text-ok' : 'border-bad/40 bg-bad/5 text-bad'}`}>
              {validation.ok ? '✓ ' : '✗ '}{validation.msg}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['550e8400-e29b-41d4-a716-446655440000', '650f1e2d3a4b5c6d7e8f9a0b', '01ARZ3NDEKTSV4RRFFQ69G5FAV'].map((p) => (
              <button key={p} onClick={() => setValidate(p)} className="rounded-md border border-edge px-2 py-1 font-mono text-[10px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                {p}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 rounded-lg border border-info/30 bg-info/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-info/90">
          💡 UUID v1 filtra la MAC del equipo y el timestamp — si un PDF lleva UUID v1 en metadatos, puedes rastrear la máquina
          que lo creó. Por eso en seguridad se prefiere v4. {ids.length > 0 && ''}Generación local: nada sale del navegador.
        </div>
      </Reveal>
    </div>
  )
}
