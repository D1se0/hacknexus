import { useMemo, useState } from 'react'
import { HardDrive } from 'lucide-react'
import { ToolHeader, Badge, CopyBlock, Field, TextInput, Select, Toggle, Reveal, InfoBanner } from '../components/ui'
import { buildLvmCommands, buildRaidCommands, buildLuksCommands, buildDdCommands, buildMountCommands, buildSwapCommands, RAID_INFO, DISK_NOTES, DISK_EMERGENCY, type DiskMode, type DiskState } from '../lib/diskcmds'

const MODES: { id: DiskMode; label: string }[] = [
  { id: 'lvm', label: 'LVM (físicos → lógicos)' },
  { id: 'raid', label: 'RAID software (mdadm)' },
  { id: 'luks', label: 'Cifrado LUKS' },
  { id: 'dd', label: 'dd / clonado / forense' },
  { id: 'mount', label: 'Montaje manual' },
  { id: 'swap', label: 'Swap' },
]

const INITIAL: DiskState = {
  mode: 'lvm',
  disks: '/dev/sdb',
  vgName: 'vgdatos',
  lvName: 'lvapp',
  lvSize: '100%FREE',
  mountPoint: '/mnt/datos',
  fs: 'ext4',
  raidLevel: 5,
  hostnameNote: '',
  ddSource: '/dev/sdb',
  ddTarget: 'imagen.img',
  ddBlockSize: '4M',
  ddProgress: true,
  swapSize: '4G',
}

export default function Diskcmds() {
  const [s, setS] = useState<DiskState>(INITIAL)
  const patch = (p: Partial<DiskState>) => setS((x) => ({ ...x, ...p }))

  const steps = useMemo<{ cmd: string; why: string; danger?: boolean }[]>(() => {
    switch (s.mode) {
      case 'lvm': return buildLvmCommands(s)
      case 'raid': return buildRaidCommands(s)
      case 'luks': return buildLuksCommands(s)
      case 'dd': return buildDdCommands(s)
      case 'mount': return buildMountCommands(s).map((c) => ({ ...c, danger: undefined }))
      case 'swap': return buildSwapCommands(s).map((c) => ({ ...c, danger: undefined }))
    }
  }, [s])

  const script = steps.map((c) => `# ${c.why}\n${c.cmd}`).join('\n\n')

  return (
    <>
      <ToolHeader icon={HardDrive} title="Disk & LVM Commander" desc="Formador de comandos de discos paso a paso: LVM (volúmenes físicos y lógicos), RAID mdadm, cifrado LUKS, dd, montaje y swap — cada comando con su por qué y los avisos de peligro donde tocan" />

      <InfoBanner>
        <b>Los comandos de discos no tienen undo:</b> esta tool te da la secuencia COMPLETA con el orden correcto y explica qué hace cada paso, pero <span className="font-mono">lsblk</span> dos veces antes de cualquier <span className="font-mono">mkfs</span>/<span className="font-mono">dd</span>/<span className="font-mono">wipefs</span> es tu responsabilidad.
      </InfoBanner>

      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => patch({ mode: m.id })}
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${s.mode === m.id ? 'border-acento/60 bg-acento/15 text-acento' : 'border-edge text-grey hover:border-acento/40 hover:text-ink'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Field label="Discos (/dev/... separados por coma o línea)" hint="¡verifica con lsblk!">
            <textarea
              value={s.disks}
              onChange={(e) => patch({ disks: e.target.value })}
              rows={3}
              className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs"
            />
          </Field>

          {(s.mode === 'lvm' || s.mode === 'raid' || s.mode === 'luks') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Nombre VG / mapper">
                  <TextInput value={s.vgName} onChange={(e) => patch({ vgName: e.target.value })} />
                </Field>
                <Field label="Nombre LV / mount tag">
                  <TextInput value={s.lvName} onChange={(e) => patch({ lvName: e.target.value })} />
                </Field>
              </div>
              {s.mode === 'lvm' && (
                <Field label="Tamaño del LV" hint="ej: 50G, 100%FREE">
                  <TextInput value={s.lvSize} onChange={(e) => patch({ lvSize: e.target.value })} />
                </Field>
              )}
            </>
          )}

          {s.mode === 'raid' && (
            <Field label="Nivel de RAID">
              <Select
                value={String(s.raidLevel)}
                onChange={(e) => patch({ raidLevel: Number(e.target.value) as 0 | 1 | 5 | 10 })}
                options={(Object.keys(RAID_INFO) as unknown as string[]).map((k) => ({ value: k, label: `RAID${k} — ${RAID_INFO[Number(k) as 0 | 1 | 5 | 10].desc}` }))}
              />
              <p className="mt-1 text-[11px] text-grey/70">{RAID_INFO[s.raidLevel].desc} · mín {RAID_INFO[s.raidLevel].min} discos · tolerancia: {RAID_INFO[s.raidLevel].tolerance}</p>
            </Field>
          )}

          {(s.mode !== 'dd' && s.mode !== 'swap') && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Punto de montaje">
                <TextInput value={s.mountPoint} onChange={(e) => patch({ mountPoint: e.target.value })} />
              </Field>
              <Field label="Sistema de ficheros">
                <Select value={s.fs} onChange={(e) => patch({ fs: e.target.value })} options={['ext4', 'xfs', 'btrfs', 'f2fs'].map((f) => ({ value: f, label: f }))} />
              </Field>
            </div>
          )}

          {s.mode === 'dd' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Origen (if=)">
                  <TextInput value={s.ddSource} onChange={(e) => patch({ ddSource: e.target.value })} />
                </Field>
                <Field label="Destino (of=)">
                  <TextInput value={s.ddTarget} onChange={(e) => patch({ ddTarget: e.target.value })} />
                </Field>
              </div>
              <Field label="Block size">
                <TextInput value={s.ddBlockSize} onChange={(e) => patch({ ddBlockSize: e.target.value })} />
              </Field>
              <Toggle checked={s.ddProgress} onChange={(v) => patch({ ddProgress: v })} label="status=progress (barra en vivo)" />
            </>
          )}

          {s.mode === 'swap' && (
            <Field label="Tamaño del swap" hint="ej: 4G">
              <TextInput value={s.swapSize} onChange={(e) => patch({ swapSize: e.target.value })} />
            </Field>
          )}
        </div>

        <div>
          <CopyBlock text={script} label={`script ${s.mode} (${steps.length} pasos)`} maxH="32rem" />
        </div>
      </div>

      <h3 className="mb-3 mt-6 text-sm font-semibold">Paso a paso explicado</h3>
      <div className="space-y-2">
        {steps.map((c, i) => (
          <Reveal key={i} delay={i * 0.02}>
            <div className={`rounded-lg border px-4 py-3 ${c.danger ? 'border-bad/40 bg-bad/5' : 'border-edge'}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${c.danger ? 'bg-bad/20 text-bad' : 'bg-acento/15 text-acento'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <code className={`block break-all font-mono text-[12.5px] ${c.danger ? 'text-bad' : 'text-ink'}`}>{c.cmd}</code>
                  <p className="mt-1 text-xs text-grey">{c.why}</p>
                </div>
                {c.danger && <Badge tone="bad">¡peligro!</Badge>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-edge bg-black/30 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Notas de campo</h4>
          <ul className="space-y-1.5 text-xs text-grey">
            {DISK_NOTES.map((n) => <li key={n}>• {n}</li>)}
          </ul>
        </div>
        <div className="rounded border border-bad/30 bg-bad/[0.03] p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bad">Emergencias clásicas</h4>
          <ul className="space-y-1.5 text-xs text-grey">
            {DISK_EMERGENCY.map(([q, a]) => (
              <li key={q}><span className="font-mono text-bad/90">"{q}"</span> → {a}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
