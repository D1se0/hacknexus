/* Generador de tareas programadas de Windows: schtasks (CMD) y
   Register-ScheduledTask (PowerShell). Referencia: learn.microsoft.com.
   Nota: las tareas son un mecanismo clásico de persistencia (T1053.005),
   así que la tool incluye detección de patrones sospechosos. */

export type TriggerKind = 'daily' | 'weekly' | 'onstart' | 'onidle' | 'onlogon'
export type RunLevel = 'limited' | 'highest'

export interface TaskDef {
  name: string
  trigger: TriggerKind
  time: string // HH:MM para daily/weekly
  days: string[] // para weekly: MON, TUE, WED, THU, FRI, SAT, SUN
  action: string // programa o comando
  args: string
  runLevel: RunLevel
  hidden: boolean
  user: string // '' = usuario actual, SYSTEM, o "DOM\usuario"
}

export const DAY_LABELS: { value: string; label: string }[] = [
  { value: 'MON', label: 'lunes' }, { value: 'TUE', label: 'martes' }, { value: 'WED', label: 'miércoles' },
  { value: 'THU', label: 'jueves' }, { value: 'FRI', label: 'viernes' }, { value: 'SAT', label: 'sábado' },
  { value: 'SUN', label: 'domingo' },
]

export const TASK_PRESETS: { label: string; desc: string; def: Partial<TaskDef> }[] = [
  { label: 'backup diario', desc: 'robocopy a las 03:00 de lunes a viernes', def: { trigger: 'daily', time: '03:00', action: 'robocopy', args: 'C:\\Datos D:\\Backup\\Datos /MIR /R:2 /W:5' } },
  { label: 'parcheo semanal', desc: 'Windows Update forzado el domingo', def: { trigger: 'weekly', days: ['SUN'], time: '04:00', action: 'UsoClient', args: 'StartInteractiveScan' } },
  { label: 'limpieza al arrancar', desc: 'borra temporales en cada inicio', def: { trigger: 'onstart', action: 'cmd.exe', args: '/c del /q /f %TEMP%\\*.*' } },
  { label: 'script cada hora', desc: 'schtasks estilo cron (daily con repetición simple)', def: { trigger: 'daily', time: '00:00', action: 'powershell.exe', args: '-NoProfile -ExecutionPolicy Bypass -File C:\\scripts\\tarea.ps1' } },
]

/** Comando schtasks /create equivalente. */
export function buildSchtasks(t: TaskDef): string {
  const esc = (s: string) => s.replace(/"/g, '')
  const parts = ['schtasks /Create /F', `/TN "${esc(t.name)}"`]
  switch (t.trigger) {
    case 'daily': parts.push('/SC DAILY /ST ' + (t.time || '03:00')); break
    case 'weekly':
      parts.push('/SC WEEKLY /ST ' + (t.time || '03:00'))
      if (t.days.length) parts.push('/D ' + t.days.join(','))
      break
    case 'onstart': parts.push('/SC ONSTART'); break
    case 'onidle': parts.push('/SC ONIDLE /I 15'); break
    case 'onlogon': parts.push('/SC ONLOGON'); break
  }
  if (t.user === 'SYSTEM') parts.push('/RU SYSTEM')
  else if (t.user.trim()) parts.push(`/RU "${esc(t.user.trim())}" /RP`)
  else parts.push('/RU "%USERNAME%"')
  parts.push(`/TR "${esc(t.action.trim() + (t.args ? ' ' + t.args : ''))}"`)
  if (t.runLevel === 'highest') parts.push('/RL HIGHEST')
  return parts.join(' ')
}

/** Equivalente PowerShell (más potente y legible). */
export function buildPsTask(t: TaskDef): string {
  const esc = (s: string) => s.replace(/'/g, "''")
  const triggerLines: string[] = []
  switch (t.trigger) {
    case 'daily': triggerLines.push(`$trigger = New-ScheduledTaskTrigger -Daily -At '${t.time || '03:00'}'`); break
    case 'weekly': triggerLines.push(`$trigger = New-ScheduledTaskTrigger -Weekly -At '${t.time || '03:00'}' -DaysOfWeek ${t.days.length ? t.days.join(',') : 'Sunday'}`); break
    case 'onstart': triggerLines.push(`$trigger = New-ScheduledTaskTrigger -AtStartup`); break
    case 'onidle': triggerLines.push(`$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)`); break
    case 'onlogon': triggerLines.push(`$trigger = New-ScheduledTaskTrigger -AtLogOn`); break
  }
  const principal = t.user === 'SYSTEM'
    ? `$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel ${t.runLevel === 'highest' ? 'Highest' : 'Limited'}`
    : `$principal = New-ScheduledTaskPrincipal -UserId '$env:USERDOMAIN\\$env:USERNAME' -LogonType Interactive -RunLevel ${t.runLevel === 'highest' ? 'Highest' : 'Limited'}`
  return [
    '$action = New-ScheduledTaskAction -Execute \'' + esc(t.action) + '\'' + (t.args ? ` -Argument '${esc(t.args)}'` : ''),
    ...triggerLines,
    principal,
    `$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable${t.hidden ? ' -Hidden' : ''} -ExecutionTimeLimit (New-TimeSpan -Hours 2)`,
    'Register-ScheduledTask -TaskName \'' + esc(t.name) + '\' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force',
  ].join('\n')
}

/** Detección de patrones de persistencia maliciosa (educativo, MITRE T1053.005). */
export function taskWarnings(t: TaskDef): { tone: 'bad' | 'warn' | 'info' | 'ok'; text: string }[] {
  const w: { tone: 'bad' | 'warn' | 'info' | 'ok'; text: string }[] = []
  const blob = `${t.action} ${t.args}`.toLowerCase()
  if (t.hidden) w.push({ tone: 'warn', text: 'tarea oculta: legítima para ruido de sistema, pero también la firma típica de persistencia (T1053.005).' })
  if (t.runLevel === 'highest' && t.user === 'SYSTEM') w.push({ tone: 'warn', text: 'SYSTEM + highest: la combinación de persistencia más potente. Asegura que el binario es de confianza y su carpeta NO es escribible.' })
  if (/powershell.*-(enc|e |encodedcommand|w hidden|windowstyle hidden)/.test(blob)) w.push({ tone: 'bad', text: 'PowerShell con comando codificado u oculto: patrón de malware clásico. Un defensor lo buscará con Get-ScheduledTask | … -Hidden.' })
  if (/\\temp\\|\\public\\|\\appdata\\|\\users\\.*\\downloads/.test(blob)) w.push({ tone: 'bad', text: 'ejecutable desde carpeta escribible por el usuario: cualquiera que escriba ahí ejecutará como la tarea (escalada a SYSTEM).' })
  if (/(http|ftp):\/\//.test(blob)) w.push({ tone: 'warn', text: 'descarga por HTTP/FTP en la tarea: el binario puede ser sustituido en tránsito o por DNS spoofing.' })
  if (/\/mir\b/.test(blob) && !/\/r:|\/w:/.test(blob)) w.push({ tone: 'info', text: 'robocopy /MIR sin /R ni /W: reintentará infinito y bloqueará la tarea.' })
  if (!w.length) w.push({ tone: 'ok', text: 'tarea sin patrones sospechosos: binario de sistema, permisos normales y sin ocultación.' })
  return w
}

/** Comandos de auditoría de persistencia (blue team). */
export const TASK_AUDIT: [string, string][] = [
  ['Get-ScheduledTask | Where State -ne Disabled | Measure', 'cuántas tareas activas hay'],
  ['Get-ScheduledTask | ? {$_.Principal.UserId -eq "SYSTEM"} | Select TaskName,TaskPath', 'tareas como SYSTEM (las sensibles)'],
  ['schtasks /query /fo LIST /v > tareas.txt', 'dump completo con acciones (para grepear)\\r'],
  ['Get-ScheduledTaskInfo -TaskName "MiTarea"', 'última y próxima ejecución'],
  ['Get-ScheduledTask | ? {$_.Settings.Hidden -eq $true}', 'tareas ocultas: siempre revisar'],
  ['wmic process where "name=\'svchost.exe\'" get ExecutablePath', 'verificar procesos: los svchost legítimos viven en System32'],
]
