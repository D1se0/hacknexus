/* Generador de units de systemd: service, timer y mount básicos. */

export interface SvcOpts {
  name: string
  desc: string
  exec: string
  user: string
  group: string
  workingDir: string
  after: string
  restart: 'no' | 'on-failure' | 'always' | 'on-success' | 'on-abnormal'
  wantedBy: string
  harden: boolean
}

export interface TimerOpts {
  name: string
  onCalendar: string
  persistent: boolean
  randomizedDelay: number // minutos
}

export const RESTART_OPTIONS: SvcOpts['restart'][] = ['no', 'on-failure', 'always', 'on-success', 'on-abnormal']

export function buildServiceUnit(o: SvcOpts): string {
  const name = (o.name.trim() || 'miapp').replace(/\.service$/, '')
  const harden = o.harden
  return `# /etc/systemd/system/${name}.service
[Unit]
Description=${o.desc.trim() || name}
${o.after.trim() ? `After=${o.after.trim()}\n` : ''}Documentation=man:systemd.unit(5)

[Service]
Type=simple
ExecStart=${o.exec.trim() || '/usr/bin/miprograma'}
${o.user.trim() ? `User=${o.user.trim()}\n` : ''}${o.group.trim() ? `Group=${o.group.trim()}\n` : ''}${o.workingDir.trim() ? `WorkingDirectory=${o.workingDir.trim()}\n` : ''}Restart=${o.restart}
RestartSec=3
${harden ? `# hardening básico (systemd-analyze security lo puntuará mejor)\nNoNewPrivileges=yes\nProtectSystem=strict\nProtectHome=yes\nPrivateTmp=yes\nPrivateDevices=yes\nProtectKernelTunables=yes\nProtectKernelModules=yes\nProtectControlGroups=yes\nRestrictSUIDSGID=yes\nLockPersonality=yes\nMemoryDenyWriteExecute=yes\nRestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX\nSystemCallArchitectures=native\nCapabilityBoundingSet=\nAmbientCapabilities=\n` : `# sin hardening: el servicio corre con privilegios amplios\n`}# journalctl -u ${name}.service -f

[Install]
WantedBy=${o.wantedBy.trim() || 'multi-user.target'}
`
}

export function buildTimerUnit(o: TimerOpts): string {
  const name = (o.name.trim() || 'mitarea').replace(/\.service$|\.timer$/, '')
  const delay = Math.max(0, Math.min(1440, Math.floor(o.randomizedDelay || 0)))
  return `# /etc/systemd/system/${name}.timer
[Unit]
Description=Timer de ${name}

[Timer]
OnCalendar=${o.onCalendar.trim() || '*-*-* 03:00:00'}
${o.persistent ? 'Persistent=true\n' : ''}${delay > 0 ? `RandomizedDelaySec=${delay * 60}\n` : ''}Unit=${name}.service

[Install]
WantedBy=timers.target

# activation:
#   systemctl daemon-reload && systemctl enable --now ${name}.timer
# verify:
#   systemctl list-timers ${name}.timer
`
}

export function buildMountUnit(opts: { what: string; where: string; type: string; options: string }): string {
  const where = opts.where.trim() || '/mnt/datos'
  const name = where.replace(/^\//, '').replace(/\//g, '-') // systemd escapes with - (simplificado)
  return `# /etc/systemd/system/${name}.mount
[Unit]
Description=Montaje de ${opts.what.trim() || 'recurso'}

[Mount]
What=${opts.what.trim() || '//servidor/recurso'}
Where=${where}
Type=${opts.type.trim() || 'cifs'}
Options=${opts.options.trim() || 'credentials=/etc/cred,uid=1000,gid=1000'}

[Install]
WantedBy=multi-user.target
`
}

export const TIMER_PRESETS: { label: string; calendar: string; desc: string }[] = [
  { label: 'diario 03:00', calendar: '*-*-* 03:00:00', desc: 'backup nocturno clásico' },
  { label: 'cada hora', calendar: 'hourly', desc: 'sincronizaciones frecuentes' },
  { label: 'cada 15 min', calendar: '*:0/15', desc: 'polling de colas' },
  { label: 'lunes 08:30', calendar: 'Mon *-*-* 08:30:00', desc: 'informe semanal' },
  { label: 'primer día de mes', calendar: '*-*-01 00:00:00', desc: 'rotaciones mensuales' },
  { label: 'al arrancar +5 min', calendar: '', desc: 'usar OnBootSec=5min en vez de OnCalendar' },
]

export function serviceVerdict(o: SvcOpts): { tone: 'ok' | 'warn' | 'bad'; text: string }[] {
  const v: { tone: 'ok' | 'warn' | 'bad'; text: string }[] = []
  if (!o.user.trim()) v.push({ tone: 'bad', text: 'Sin User=: el servicio corre como root. Casi siempre hay alternativa con usuario dedicado.' })
  else if (o.user.trim() === 'root') v.push({ tone: 'bad', text: 'User=root: si el binario o un fichero que lee es modificable, es privesc directo.' })
  else v.push({ tone: 'ok', text: `Corre como ${o.user.trim()}: bien. Revisa que su home y ficheros de config no sean escribibles por otros.` })
  if (!o.harden) v.push({ tone: 'warn', text: 'Sin hardening: systemd-analyze security puntuará bajo. Actívalo salvo incompatibilidades.' })
  if (o.restart === 'no') v.push({ tone: 'warn', text: 'Restart=no: si el proceso muere, se queda muerto (¿querías eso?).' })
  if (!o.exec.trim().startsWith('/')) v.push({ tone: 'warn', text: 'ExecStart relativo: systemd no usa PATH del shell; usa ruta absoluta.' })
  return v
}
