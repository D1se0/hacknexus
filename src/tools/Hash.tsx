import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileUp, Hash as HashIcon } from 'lucide-react'
import { ToolHeader, CopyBtn, Badge, Field, TextInput, Button, useToast, Reveal } from '../components/ui'
import { syncHash, digestHex, hmacHex, type SyncHashName } from '../lib/hash'
import { fmtBytes, fmtNum } from '../lib/util'
import bcrypt from 'bcryptjs'

const SYNC_ORDER: SyncHashName[] = ['MD5', 'SHA1', 'SHA256', 'SHA512', 'SHA3-512', 'RIPEMD160', 'CRC32', 'NTLM']

const NOTES: Partial<Record<SyncHashName, string>> = {
  MD5: 'roto: solo checksums',
  SHA1: 'colisiones prácticas',
  CRC32: 'integridad, no seguridad',
  NTLM: 'Windows',
}

const SYNC_WEB: Record<SyncHashName, string> = {
  MD5: 'MD5',
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
  'SHA3-512': 'SHA-512',
  RIPEMD160: 'SHA-1',
  CRC32: 'CRC32',
  NTLM: 'MD5',
}

export default function Hash() {
  const [text, setText] = useState('hacknexus')
  const [results, setResults] = useState<Record<string, string>>({})
  const [hmacKey, setHmacKey] = useState('clave-secreta')
  const [hmacOut, setHmacOut] = useState<Record<string, string>>({})
  const [upper, setUpper] = useState(false)
  const [bcryptHash, setBcryptHash] = useState('')
  const [bcryptCost, setBcryptCost] = useState(10)
  const [bcrypting, setBcrypting] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; md5: string; sha1: string; sha256: string } | null>(null)
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sync: Record<string, string> = {}
    for (const name of SYNC_ORDER) sync[name] = syncHash(name, text)
    setResults(sync)
    Promise.all([hmacHex('SHA-256', hmacKey, text), hmacHex('SHA-512', hmacKey, text), hmacHex('SHA-1', hmacKey, text)]).then(
      ([s256, s512, s1]) => setHmacOut({ 'HMAC-SHA256': s256, 'HMAC-SHA512': s512, 'HMAC-SHA1': s1 }),
    )
  }, [text, hmacKey])

  const doBcrypt = async () => {
    setBcrypting(true)
    try {
      const h = await bcrypt.hash(text, bcryptCost)
      const ok = await bcrypt.compare(text, h)
      setBcryptHash(h + (ok ? '' : ' [FALLO DE VERIFICACIÓN]'))
      toast('Bcrypt generado y verificado')
    } finally {
      setBcrypting(false)
    }
  }

  const onFile = async (f: File) => {
    const buf = new Uint8Array(await f.arrayBuffer())
    setFileInfo({
      name: f.name,
      size: f.size,
      md5: syncHash('MD5', buf),
      sha1: await digestHex('SHA-1', buf),
      sha256: await digestHex('SHA-256', buf),
    })
    toast(`Hash de ${f.name} calculado`)
  }

  const rows = useMemo(() => SYNC_ORDER.map((n) => ({ name: n, note: NOTES[n], value: results[n] ?? '' })), [results])

  return (
    <div>
      <ToolHeader icon={HashIcon} title="Hash Suite" desc="MD5, SHA-1/256/512, SHA3-512, RIPEMD-160, CRC32, NTLM, HMAC y bcrypt — de texto o archivo, todo local" />

      <div className="grid gap-6">
        <Reveal>
          <div className="card p-6">
            <Field label="Entrada" hint={`${fmtNum(text.length)} chars`}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                className="min-h-24 w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60 focus:shadow-glow"
              />
            </Field>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Button variant="ghost" onClick={() => fileRef.current?.click()} className="gap-2">
                <FileUp size={14} /> Hashear archivo
              </Button>
              <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-grey">
                <input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className="accent-[#2ee88a]" />
                MAYÚSCULAS
              </label>
            </div>
          </div>
        </Reveal>

        {fileInfo && (
          <Reveal>
            <div className="card p-6">
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="accent">{fileInfo.name}</Badge>
                <span className="font-mono text-xs text-grey">{fmtBytes(fileInfo.size)}</span>
              </div>
              {([['MD5', fileInfo.md5], ['SHA-1', fileInfo.sha1], ['SHA-256', fileInfo.sha256]] as const).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-edge/50 py-2 last:border-0">
                  <span className="shrink-0 font-mono text-[11px] text-grey">{k}</span>
                  <code className="min-w-0 flex-1 break-all text-right font-mono text-[12px] text-ink">{upper ? v.toUpperCase() : v}</code>
                  <CopyBtn text={upper ? v.toUpperCase() : v} />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <div className="grid gap-3">
          {rows.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex w-32 shrink-0 items-center gap-2">
                <span className="font-mono text-xs font-bold text-acento">{r.name}</span>
                {r.note && <span className="hidden font-mono text-[9px] text-grey/60 xl:block">{r.note}</span>}
              </div>
              <code className={upper ? 'min-w-0 flex-1 break-all font-mono text-[12px] text-white' : 'min-w-0 flex-1 break-all font-mono text-[12px] text-ink'}>
                {upper ? r.value.toUpperCase() : r.value}
              </code>
              <CopyBtn text={upper ? r.value.toUpperCase() : r.value} />
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="card p-6">
              <h3 className="mb-4 font-mono text-sm font-bold text-white">HMAC <span className="font-normal text-grey">— firma con clave</span></h3>
              <Field label="Clave secreta">
                <TextInput value={hmacKey} onChange={(e) => setHmacKey(e.target.value)} />
              </Field>
              <div className="mt-3 space-y-2">
                {Object.entries(hmacOut).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 border-b border-edge/50 pb-2 last:border-0">
                    <span className="w-28 shrink-0 font-mono text-[10px] text-grey">{k}</span>
                    <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-ink">{v}</code>
                    <CopyBtn text={v} />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card p-6">
              <h3 className="mb-4 font-mono text-sm font-bold text-white">bcrypt <span className="font-normal text-grey">— para guardar contraseñas</span></h3>
              <Field label="Coste (2^n)" hint={`rounds=${bcryptCost}`}>
                <input type="range" min={4} max={14} value={bcryptCost} onChange={(e) => setBcryptCost(+e.target.value)} className="w-full accent-[#2ee88a]" />
              </Field>
              <Button onClick={doBcrypt} disabled={bcrypting} className="mt-3">
                {bcrypting ? 'haseando…' : 'generar bcrypt'}
              </Button>
              {bcryptHash && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-edge bg-black/50 p-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-acento">{bcryptHash}</code>
                  <CopyBtn text={bcryptHash} />
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}