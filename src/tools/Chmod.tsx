import { useState } from 'react'
import { Crown } from 'lucide-react'
import { ToolHeader, Badge, Reveal, CopyBlock, Toggle } from '../components/ui'

interface PermBit {
  label: string
  who: 'owner' | 'group' | 'other'
  bit: 'r' | 'w' | 'x'
}

const PERMS: PermBit[] = [
  { label: 'read', who: 'owner', bit: 'r' },
  { label: 'write', who: 'owner', bit: 'w' },
  { label: 'exec', who: 'owner', bit: 'x' },
  { label: 'read', who: 'group', bit: 'r' },
  { label: 'write', who: 'group', bit: 'w' },
  { label: 'exec', who: 'group', bit: 'x' },
  { label: 'read', who: 'other', bit: 'r' },
  { label: 'write', who: 'other', bit: 'w' },
  { label: 'exec', who: 'other', bit: 'x' },
]

const WHO_LABEL: Record<string, string> = { owner: 'propietario (u)', group: 'grupo (g)', other: 'otros (o)' }

export default function Chmod() {
  const [on, setOn] = useState<Set<string>>(new Set(['owner-r', 'owner-w', 'owner-x', 'group-r', 'group-x', 'other-r', 'other-x']))
  const [suid, setSuid] = useState(false)
  const [sgid, setSgid] = useState(false)
  const [sticky, setSticky] = useState(false)
  const [recursive, setRecursive] = useState(false)
  const [isDir, setIsDir] = useState(false)

  const toggle = (key: string) => {
    setOn((s) => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }

  const octalFor = (who: string) => {
    let v = 0
    if (on.has(`${who}-r`)) v += 4
    if (on.has(`${who}-w`)) v += 2
    if (on.has(`${who}-x`)) v += 1
    return v
  }

  const special = (suid ? 4 : 0) + (sgid ? 2 : 0) + (sticky ? 1 : 0)
  const octal = `${special === 0 ? '' : special}${octalFor('owner')}${octalFor('group')}${octalFor('other')}`
  const octalFull = `${special}${octalFor('owner')}${octalFor('group')}${octalFor('other')}`

  const sym = () => {
    const bitStr = (who: string) => {
      const r = on.has(`${who}-r`) ? 'r' : '-'
      const w = on.has(`${who}-w`) ? 'w' : '-'
      let x = on.has(`${who}-x`) ? 'x' : '-'
      if (who === 'owner' && suid) x = x === 'x' ? 's' : 'S'
      if (who === 'group' && sgid) x = x === 'x' ? 's' : 'S'
      if (who === 'other' && sticky) x = x === 'x' ? 't' : 'T'
      return `${r}${w}${x}`
    }
    return bitStr('owner') + bitStr('group') + bitStr('other')
  }

  const cmd = `chmod${recursive ? ' -R' : ''} ${octalFull} ${isDir ? 'directorio/' : 'fichero'}`
  const symCmd = `chmod${recursive ? ' -R' : ''} ${sym().replace(/-/g, '') ? '' : ''}${octalFull.startsWith('0') ? '' : ''}`

  const presets: { label: string; bits: string[]; desc: string; suidFlag?: boolean }[] = [
    { label: '755', bits: ['owner-r', 'owner-w', 'owner-x', 'group-r', 'group-x', 'other-r', 'other-x'], desc: 'scripts, directorios web' },
    { label: '600', bits: ['owner-r', 'owner-w'], desc: 'claves privadas, .env' },
    { label: '644', bits: ['owner-r', 'owner-w', 'group-r', 'other-r'], desc: 'config pública' },
    { label: '700', bits: ['owner-r', 'owner-w', 'owner-x'], desc: 'solo el dueño' },
    { label: '777', bits: ['owner-r', 'owner-w', 'owner-x', 'group-r', 'group-w', 'group-x', 'other-r', 'other-w', 'other-x'], desc: '⚠ mundo escribible' },
    { label: '4755', bits: ['owner-r', 'owner-w', 'owner-x', 'group-r', 'group-x', 'other-r', 'other-x'], desc: 'SUID (binarios root)', suidFlag: true },
  ]

  const applyPreset = (bits: string[], suidFlag?: boolean) => {
    setOn(new Set(bits))
    setSuid(!!suidFlag)
  }

  return (
    <div>
      <ToolHeader icon={Crown} title="Calculadora CHMOD" desc="Permisos Linux en octal y simbólico con SUID, SGID y Sticky Bit — portado de chmod-calculator" badge="ported" />

      <Reveal>
        <div className="card p-6">
          <div className="grid gap-6 md:grid-cols-3">
            {(['owner', 'group', 'other'] as const).map((who) => (
              <div key={who}>
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-acento">{WHO_LABEL[who]}</h3>
                <div className="space-y-2">
                  {(['r', 'w', 'x'] as const).map((bit) => {
                    const key = `${who}-${bit}`
                    const active = on.has(key)
                    const label = bit === 'r' ? 'leer (4)' : bit === 'w' ? 'escribir (2)' : 'ejecutar (1)'
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(key)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 font-mono text-xs transition-all ${
                          active ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`flex h-4 w-4 items-center justify-center rounded border ${active ? 'border-acento bg-acento/30' : 'border-edge'}`}>
                          {active && <span className="text-[9px] font-bold text-base">✓</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 text-center font-mono text-2xl font-bold text-white">{octalFor(who)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-5 border-t border-edge/60 pt-4">
            <Toggle checked={suid} onChange={setSuid} label="SUID (4000) — ejecuta como dueño" />
            <Toggle checked={sgid} onChange={setSgid} label="SGID (2000) — hereda grupo" />
            <Toggle checked={sticky} onChange={setSticky} label="Sticky (1000) — /tmp style" />
            <Toggle checked={recursive} onChange={setRecursive} label="recursivo (-R)" />
            <Toggle checked={isDir} onChange={setIsDir} label="es directorio" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="card p-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-grey">octal</div>
            <div className="mt-1 font-mono text-3xl font-bold text-acento">{octalFull}</div>
            <div className="font-mono text-[10px] text-grey">chmod {octalFull}</div>
          </div>
          <div className="card p-5 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-grey">simbólico</div>
            <div className="mt-1 font-mono text-2xl font-bold text-white tracking-widest">{sym()}</div>
            <div className="font-mono text-[10px] text-grey">ls -la</div>
          </div>
          <div className="card p-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-grey">comando</div>
            <CopyBlock text={cmd} label="chmod" maxH="max-h-20" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">presets frecuentes</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p.bits, p.suidFlag)} className="rounded-lg border border-edge p-3 text-left transition-all hover:border-acento/50 hover:bg-acento/5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-acento">{p.label}</span>
                  <span className="font-mono text-[10px] text-grey">{p.desc}</span>
                </div>
              </button>
            ))}
          </div>
          {special > 0 && (
            <p className="mt-3 font-mono text-[11px] text-warn">
              ⚠ bits especiales activos: find / -perm -{special * 0o1000} -type f 2&gt;/dev/null los lista en un sistema (vector clásico de privesc si son SUID root).
            </p>
          )}
          <span className="hidden">{symCmd}</span>
        </div>
      </Reveal>
    </div>
  )
}
