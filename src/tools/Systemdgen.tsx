import { useMemo, useState } from 'react'
import { Cog } from 'lucide-react'
import { ToolHeader, Badge, Reveal, Field, TextInput, Toggle, CopyBlock, InfoBanner } from '../components/ui'
import { buildServiceUnit, buildTimerUnit, buildMountUnit, RESTART_OPTIONS, TIMER_PRESETS, serviceVerdict, type SvcOpts, type TimerOpts } from '../lib/systemd'

type Tab = 'service' | 'timer' | 'mount'

export default function Systemdgen() {
  const [tab, setTab] = useState<Tab>('service')

  const [svc, setSvc] = useState<SvcOpts>({
    name: 'miapp',
    desc: 'Mi aplicación de ejemplo',
    exec: '/opt/miapp/bin/server --port 8080',
    user: 'miapp',
    group: 'miapp',
    workingDir: '/opt/miapp',
    after: 'network-online.target',
    restart: 'on-failure',
    wantedBy: 'multi-user.target',
    harden: true,
  })
  const [timer, setTimer] = useState<TimerOpts>({ name: 'miapp-backup', onCalendar: '*-*-* 03:00:00', persistent: true, randomizedDelay: 15 })
  const [mount, setMount] = useState({ what: '//nas.local/documentos', where: '/mnt/documentos', type: 'cifs', options: 'credentials=/etc/cifs.cred,uid=1000,gid=1000,vers=3.0' })

  const svcUnit = useMemo(() => buildServiceUnit(svc), [svc])
  const timerUnit = useMemo(() => buildTimerUnit(timer), [timer])
  const mountUnit = useMemo(() => buildMountUnit(mount), [mount])
  const verdicts = useMemo(() => serviceVerdict(svc), [svc])

  const activation = tab === 'service'
    ? `sudo cp miapp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now miapp.service
systemctl status miapp.service
systemd-analyze security miapp.service   # puntuación de hardening`
    : tab === 'timer'
      ? `sudo cp ${timer.name}.timer ${timer.name}.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ${timer.name}.timer
systemctl list-timers ${timer.name}.timer`
      : `sudo cp ${mount.where.replace(/^\//, '').replace(/\//g, '-')}.mount /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start ${mount.where.replace(/^\//, '').replace(/\//g, '-')}.mount`

  return (
    <div>
      <ToolHeader icon={Cog} title="Generador systemd" desc="Units de service (con hardening), timer y mount listos para copiar, con veredictos de seguridad" />

      <InfoBanner>
        El modo <b>hardening</b> añade sandboxing (ProtectSystem=strict, NoNewPrivileges, etc.): <span className="font-mono">systemd-analyze security</span> lo puntúa. Si tu app necesita algo que el sandbox corta, desactívalo conscientemente, no por defecto.
      </InfoBanner>

      <div className="mb-4 flex gap-2">
        {(['service', 'timer', 'mount'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg border px-4 py-2 font-mono text-xs transition-all ${tab === t ? 'border-acento/60 bg-acento/10 text-acento' : 'border-edge text-grey hover:text-ink'}`}>
            {t}.unit
          </button>
        ))}
      </div>

      {tab === 'service' && (
        <>
          <Reveal key="svc-form">
            <div className="card grid gap-4 p-6 md:grid-cols-2">
              <Field label="nombre del unit"><TextInput value={svc.name} onChange={(e) => setSvc((s) => ({ ...s, name: e.target.value }))} className="font-mono" /></Field>
              <Field label="descripción"><TextInput value={svc.desc} onChange={(e) => setSvc((s) => ({ ...s, desc: e.target.value }))} /></Field>
              <Field label="ExecStart" hint="ruta absoluta"><TextInput value={svc.exec} onChange={(e) => setSvc((s) => ({ ...s, exec: e.target.value }))} className="font-mono" /></Field>
              <Field label="After=" hint="dependencia"><TextInput value={svc.after} onChange={(e) => setSvc((s) => ({ ...s, after: e.target.value }))} className="font-mono" /></Field>
              <Field label="User="><TextInput value={svc.user} onChange={(e) => setSvc((s) => ({ ...s, user: e.target.value }))} className="font-mono" /></Field>
              <Field label="Group="><TextInput value={svc.group} onChange={(e) => setSvc((s) => ({ ...s, group: e.target.value }))} className="font-mono" /></Field>
              <Field label="WorkingDirectory="><TextInput value={svc.workingDir} onChange={(e) => setSvc((s) => ({ ...s, workingDir: e.target.value }))} className="font-mono" /></Field>
              <Field label="Restart=">
                <select value={svc.restart} onChange={(e) => setSvc((s) => ({ ...s, restart: e.target.value as SvcOpts['restart'] }))} className="w-full rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-sm text-ink outline-none focus:border-acento/60">
                  {RESTART_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <div className="flex flex-wrap gap-5 md:col-span-2">
                <Toggle checked={svc.harden} onChange={(v) => setSvc((s) => ({ ...s, harden: v }))} label="hardening (sandbox systemd)" />
              </div>
            </div>
          </Reveal>
          <Reveal key="svc-verdict">
            <div className="card mt-6 space-y-2 p-6">
              <h3 className="mb-1 font-mono text-[11px] uppercase tracking-widest text-grey">veredicto del servicio</h3>
              {verdicts.map((v, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 font-mono text-xs ${v.tone === 'bad' ? 'border-bad/40 bg-bad/10 text-bad' : v.tone === 'warn' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-ok/40 bg-ok/10 text-ok'}`}>
                  <span className="shrink-0">{v.tone === 'bad' ? '✗' : v.tone === 'warn' ? '⚠' : '✓'}</span>
                  <span className="break-words">{v.text}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </>
      )}

      {tab === 'timer' && (
        <Reveal key="timer-form">
          <div className="card grid gap-4 p-6 md:grid-cols-2">
            <Field label="nombre del timer"><TextInput value={timer.name} onChange={(e) => setTimer((t) => ({ ...t, name: e.target.value }))} className="font-mono" /></Field>
            <Field label="OnCalendar"><TextInput value={timer.onCalendar} onChange={(e) => setTimer((t) => ({ ...t, onCalendar: e.target.value }))} className="font-mono" /></Field>
            <Field label="RandomizedDelaySec (minutos)" hint="evita thundering herd">
              <TextInput value={String(timer.randomizedDelay)} onChange={(e) => setTimer((t) => ({ ...t, randomizedDelay: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))} className="font-mono" />
            </Field>
            <div className="flex items-end gap-5">
              <Toggle checked={timer.persistent} onChange={(v) => setTimer((t) => ({ ...t, persistent: v }))} label="Persistent (recupera si la máquina estaba apagada)" />
            </div>
            <div className="md:col-span-2">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-grey">presets de calendario</span>
              <div className="flex flex-wrap gap-2">
                {TIMER_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => setTimer((t) => ({ ...t, onCalendar: p.calendar }))} title={p.desc} className="rounded-md border border-edge px-3 py-1.5 font-mono text-[11px] text-grey transition-all hover:border-acento/50 hover:text-acento">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {tab === 'mount' && (
        <Reveal key="mount-form">
          <div className="card grid gap-4 p-6 md:grid-cols-2">
            <Field label="What=" hint="recurso (//servidor/share, UUID, /dev/…)">
              <TextInput value={mount.what} onChange={(e) => setMount((m) => ({ ...m, what: e.target.value }))} className="font-mono" />
            </Field>
            <Field label="Where=" hint="punto de montaje">
              <TextInput value={mount.where} onChange={(e) => setMount((m) => ({ ...m, where: e.target.value }))} className="font-mono" />
            </Field>
            <Field label="Type=" hint="cifs, nfs4, ext4…">
              <TextInput value={mount.type} onChange={(e) => setMount((m) => ({ ...m, type: e.target.value }))} className="font-mono" />
            </Field>
            <Field label="Options=" hint="credentials, uid/gid, vers…">
              <TextInput value={mount.options} onChange={(e) => setMount((m) => ({ ...m, options: e.target.value }))} className="font-mono" />
            </Field>
          </div>
        </Reveal>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Reveal key="unit-out">
          <CopyBlock text={tab === 'service' ? svcUnit : tab === 'timer' ? timerUnit : mountUnit} label={`${tab}.unit generado`} maxH="max-h-120" />
        </Reveal>
        <Reveal key="act-out">
          <CopyBlock text={activation} label="activación y verificación" maxH="max-h-120" />
        </Reveal>
      </div>

      <Reveal>
        <div className="card mt-6 p-6">
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-grey">notas de auditoría</h3>
          <ul className="space-y-1.5 font-mono text-[12px] text-ink/85">
            <li>• <span className="text-info">systemd-analyze security</span> puntúa cada servicio: {svc.harden ? <Badge tone="ok">con hardening sueles pasar de 5-6 a 8-9</Badge> : <Badge tone="warn">sin hardening la nota suele ser 4-6</Badge>}</li>
            <li>• Un ExecStart apuntando a una ruta <span className="text-warn">escribible por usuarios no root</span> es privesc directo (el servicio arranca como User=).</li>
            <li>• Los <span className="text-info">timers</span> sustituyen a cron con ventaja: Persistent=true compensa apagados, RandomizedDelaySec evita picos.</li>
            <li>• En CTF/pentest: un unit con <span className="text-warn">ExecStart modificable</span> o <span className="text-warn">User=root</span> es una vía clásica de escalada (systemctl cat para verlo).</li>
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
