import { useMemo, useState } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { UserCog } from 'lucide-react'
import { ToolHeader, Badge, Reveal, Field, TextInput, Toggle, Button, CopyBlock, InfoBanner } from '../components/ui'
import { buildSudoersLine, sudoersWarnings, SUDOERS_PRESETS, type SudoersOpts } from '../lib/sudoers'

export default function Sudoersgen() {
  const [o, setO] = useState<SudoersOpts>({
    user: 'deploy',
    host: 'ALL',
    runas: 'root',
    command: '/usr/bin/systemctl restart miapp.service',
    nopasswd: true,
    setenv: false,
    noexec: false,
    logOutput: false,
  })

  const set = (p: Partial<SudoersOpts>) => setO((s) => ({ ...s, ...p }))
  const { line, tag } = useMemo(() => buildSudoersLine(o), [o])
  const warnings = useMemo(() => sudoersWarnings(o), [o])

  const installCmd = `# como root, validar y cargar:
echo '${line}' > /etc/sudoers.d/${(o.user || 'custom').replace(/[^a-z0-9_-]/gi, '')}
chmod 440 /etc/sudoers.d/${(o.user || 'custom').replace(/[^a-z0-9_-]/gi, '')}
visudo -c   # SIEMPRE validar antes de cerrar la sesión actual

# probar sin tocar sudoers aún:
sudo -u ${o.runas.replace(/[()]/g, '').split(':')[0] || 'root'} -l | tail`

  return (
    <div>
      <ToolHeader icon={UserCog} title="Generador Sudoers" desc="Construye reglas de /etc/sudoers.d correctas y avisa de los clásicos vector GTFOBins, wildcards y NOPASSWD peligrosos" />
      <SnapshotButtons
        toolId="sudoersgen"
        label="regla sudoers"
        getData={() => ({ o })}
        onLoad={(d) => d.o && setO(d.o)}
      />

      <InfoBanner>
        Reglas mínimas: <b>rutas absolutas</b>, <b>sin wildcards</b> que puedas controlar y nunca <b>NOPASSWD: ALL</b>. Un sudo que ejecuta un editor o un intérprete equivale a dar root. Todo se construye aquí en tu navegador y se copia listo para <span className="font-mono">visudo</span>.
      </InfoBanner>

      <Reveal>
        <div className="card grid gap-4 p-6 md:grid-cols-2">
          <Field label="usuario / grupo" hint="%grupo para grupos">
            <TextInput value={o.user} onChange={(e) => set({ user: e.target.value })} placeholder="deploy" className="font-mono" />
          </Field>
          <Field label="host" hint="ALL o hostname">
            <TextInput value={o.host} onChange={(e) => set({ host: e.target.value })} placeholder="ALL" className="font-mono" />
          </Field>
          <Field label="run as" hint="usuario o usuario:grupo">
            <TextInput value={o.runas} onChange={(e) => set({ runas: e.target.value })} placeholder="root" className="font-mono" />
          </Field>
          <Field label="comando (ruta absoluta)">
            <TextInput value={o.command} onChange={(e) => set({ command: e.target.value })} placeholder="/usr/bin/systemctl restart app" className="font-mono" />
          </Field>
          <div className="flex flex-wrap gap-5 md:col-span-2">
            <Toggle checked={o.nopasswd} onChange={(v) => set({ nopasswd: v })} label="NOPASSWD (sin contraseña)" />
            <Toggle checked={o.setenv} onChange={(v) => set({ setenv: v })} label="SETENV" />
            <Toggle checked={o.noexec} onChange={(v) => set({ noexec: v })} label="NOEXEC (bloquea shell-out)" />
            <Toggle checked={o.logOutput} onChange={(v) => set({ logOutput: v })} label="LOG_OUTPUT (audit)" />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CopyBlock text={line} label="regla sudoers" maxH="max-h-24" />
          <CopyBlock text={installCmd} label="instalación y prueba" maxH="max-h-52" />
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey">análisis de la regla {tag && <Badge tone="accent">{tag.trim()}</Badge>}</h3>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-xs ${w.tone === 'bad' ? 'border-bad/40 bg-bad/10 text-bad' : w.tone === 'warn' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-ok/40 bg-ok/10 text-ok'}`}>
                <span className="shrink-0">{w.tone === 'bad' ? '✗' : w.tone === 'warn' ? '⚠' : '✓'}</span>
                <span className="break-words">{w.text}</span>
              </div>
            ))}
          </div>
          {o.noexec && <p className="mt-3 font-mono text-[11px] text-grey/70">💡 NOEXEC impide fork()/exec() desde el comando: vim o less no podrán abrir un shell (no es infalible: hay bypasses documentados, pero sube el coste).</p>}
        </div>
      </Reveal>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">presets (aplican y recalculan avisos)</h3>
          <div className="flex flex-wrap gap-2">
            {SUDOERS_PRESETS.map((p) => (
              <Button key={p.label} variant="ghost" onClick={() => set(p.opts)} className="gap-2 px-3 py-1.5 text-xs">
                {p.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-grey/60">Aplica un preset y mira cómo cambia el análisis: los inseguros se marcan en rojo. El preset ⚠ es para usarlo en formación y demostrar por qué se rechaza en revisión.</p>
        </div>
      </Reveal>
    </div>
  )
}
