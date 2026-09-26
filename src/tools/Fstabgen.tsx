import { useMemo, useState } from 'react'
import { HardDrive, Plus, Trash2 } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, Field, TextInput, Select, CopyBlock, ErrorBox, InfoBanner, useToast } from '../components/ui'
import { FS_TYPES, OPTION_INFO, FSTAB_PRESETS, fstabWarnings, buildFstabLine, FSTAB_CHEATSHEET, type FstabEntry } from '../lib/fstab'

let uid = 0
const newEntry = (): FstabEntry => ({
  id: `e${++uid}`,
  spec: 'UUID=xxxx-xxxx',
  mount: '/mnt/datos',
  fs: 'ext4',
  options: ['defaults'],
  dump: false,
  fsckPass: 2,
})

export default function Fstabgen() {
  const [entries, setEntries] = useState<FstabEntry[]>([newEntry()])
  const toast = useToast()

  const conf = useMemo(() => {
    const lines = ['# /etc/fstab — generado por HackNexus', '# validar con: findmnt --verify', '']
    return lines.concat(entries.map(buildFstabLine)).join('\n')
  }, [entries])

  const update = (id: string, patch: Partial<FstabEntry>) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const applyPreset = (id: string, idx: number) => {
    const p = FSTAB_PRESETS[idx]
    if (!p) return
    update(id, { fs: p.fs, options: [...p.options], fsckPass: p.fsckPass })
    toast(`preset "${p.label}" aplicado`)
  }

  const allWarnings = useMemo(() => entries.flatMap((e, i) => fstabWarnings(e).map((w) => ({ ...w, entry: i + 1 }))), [entries])

  return (
    <div>
      <ToolHeader icon={HardDrive} title="Fstab Builder" desc="Construye /etc/fstab sin miedo: presets seguros por escenario, avisos de privesc (suid en home), contraseñas inline y flags rotos" />

      <InfoBanner>
        <b>fstab es el mapa de montaje del sistema:</b> una línea mal escrita y el servidor no arranca. Este generador marca los errores clásicos — <span className="font-mono">password=</span> legible por todos, <span className="font-mono">/tmp</span> ejecutable, SUID en particiones de datos, mounts de red sin <span className="font-mono">nofail</span>. Valida SIEMPRE con <span className="font-mono">findmnt --verify</span> antes de reiniciar.
      </InfoBanner>

      {entries.map((e, i) => (
        <Reveal key={e.id}>
          <div className="card mb-4 p-6">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-mono text-sm text-white">entrada #{i + 1}</h3>
              <div className="ml-auto flex gap-2">
                {entries.length > 1 && (
                  <Button variant="danger" className="gap-1 px-2 py-1 text-xs" onClick={() => setEntries((es) => es.filter((x) => x.id !== e.id))}>
                    <Trash2 size={12} /> quitar
                  </Button>
                )}
                <Button variant="ghost" className="gap-1 px-2 py-1 text-xs" onClick={() => setEntries((es) => [...es, newEntry()])}>
                  <Plus size={12} /> añadir otra
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="dispositivo / spec" hint="UUID=, LABEL=, /dev/, //server/share">
                <TextInput value={e.spec} onChange={(ev) => update(e.id, { spec: ev.target.value })} placeholder="UUID=1a2b-3c4d" className="font-mono" />
              </Field>
              <Field label="punto de montaje">
                <TextInput value={e.mount} onChange={(ev) => update(e.id, { mount: ev.target.value })} placeholder="/mnt/datos" className="font-mono" />
              </Field>
              <Field label="tipo de filesystem">
                <Select value={e.fs} onChange={(ev) => update(e.id, { fs: ev.target.value })} options={FS_TYPES.map((t) => ({ value: t, label: t }))} />
              </Field>
              <Field label="preset rápido" hint="sobrescribe opciones y fsck">
                <Select value="" onChange={(ev) => applyPreset(e.id, Number(ev.target.value))} options={[{ value: '', label: '— elegir preset —' }, ...FSTAB_PRESETS.map((p, idx) => ({ value: String(idx), label: p.label }))]} />
              </Field>
              <Field label="opciones (separadas por coma)">
                <TextInput value={e.options.join(',')} onChange={(ev) => update(e.id, { options: ev.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="rw,nosuid,noexec" className="font-mono" />
              </Field>
              <Field label="fsck pass" hint="0 no chequea · 1 solo / · 2 el resto">
                <Select value={String(e.fsckPass)} onChange={(ev) => update(e.id, { fsckPass: Number(ev.target.value) })} options={[0, 1, 2].map((n) => ({ value: String(n), label: String(n) }))} />
              </Field>
            </div>

            {/* badges de las opciones activas con su significado */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {e.options.map((o) => {
                const info = OPTION_INFO[o] ?? OPTION_INFO[o.split('=')[0]]
                return (
                  <span key={o} title={info?.desc ?? 'opción personalizada'} className="cursor-help">
                    <Badge tone={info?.tone ?? 'neutral'}>{o}</Badge>
                  </span>
                )
              })}
            </div>
          </div>
        </Reveal>
      ))}

      {allWarnings.filter((w) => w.tone === 'bad' || w.tone === 'warn').length > 0 && (
        <div className="mb-4 space-y-2">
          {allWarnings.filter((w) => w.tone === 'bad' || w.tone === 'warn').map((w, i) => (
            <ErrorBox key={i}>
              <span className="font-mono text-[11px] uppercase tracking-wider text-bad">entrada #{w.entry}</span> — {w.text}
            </ErrorBox>
          ))}
        </div>
      )}

      <Reveal>
        <div className="card p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">/etc/fstab resultante</h3>
          <CopyBlock text={conf} maxH="300" />
          <p className="mt-3 font-mono text-[10px] text-grey/70">dump: {entries.filter((e) => e.dump).length} entradas · aplicar: <span className="text-info">sudo systemctl daemon-reload && sudo mount -a</span></p>
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">comandos de verificación</h3>
          <div className="space-y-2">
            {FSTAB_CHEATSHEET.map(([cmd, what]) => (
              <div key={cmd} className="flex flex-wrap items-baseline gap-2 border-b border-edge/50 pb-2 last:border-0">
                <code className="font-mono text-[12px] text-acento">{cmd}</code>
                <span className="font-mono text-[11px] text-grey">{what}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
