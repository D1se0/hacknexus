/* Hardening de Windows: auditoría + tweaks con justificación.
   Cada tweak incluye comando de verificación y cómo revertirlo.
   Referencias: baselines CIS/Microsoft Security Baselines, STIG. */

export type HGroup = 'cuentas' | 'red' | 'uac' | 'defender' | 'auditoría' | 'bitlocker' | 'office' | 'powershell'

export interface HTweak {
  id: string
  group: HGroup
  title: string
  why: string
  level: 1 | 2 // 1 = CIS nivel 1 (recomendado), 2 = estricto (puede romper cosas)
  commands: string[] // PS para aplicar
  verify: string // PS para comprobar
  revert: string // PS para revertir
  risk: string // qué puede romper
}

export const HARDENING: HTweak[] = [
  {
    id: 'admin-local-rename',
    group: 'cuentas',
    title: 'renombrar cuenta Administrator local',
    why: 'los bots atacan "Administrator" por nombre; renombrarlo elimina el 90% del ruido',
    level: 1,
    commands: ['Rename-LocalUser -Name "Administrator" -NewName "adm_local"'],
    verify: 'Get-LocalUser | Select Name,Enabled',
    revert: 'Rename-LocalUser -Name "adm_local" -NewName "Administrator"',
    risk: 'ninguno relevante; documenta el nuevo nombre',
  },
  {
    id: 'admin-local-disable',
    group: 'cuentas',
    title: 'desactivar Administrator local (si hay otra cuenta admin)',
    why: 'menos cuentas privilegiadas = menos caminos de ataque',
    level: 1,
    commands: ['Disable-LocalUser -Name "Administrator"'],
    verify: 'Get-LocalUser -Name "Administrator" | Select Enabled',
    revert: 'Enable-LocalUser -Name "Administrator"',
    risk: 'acceso con Modo Seguro puede necesitarlo (crea primero otra admin)',
  },
  {
    id: 'lockout',
    group: 'cuentas',
    title: 'bloqueo por intentos fallidos',
    why: 'frena fuerza bruta local y por RDP',
    level: 1,
    commands: ['net accounts /lockoutthreshold:5 /lockoutduration:30 /lockoutwindow:30'],
    verify: 'net accounts',
    revert: 'net accounts /lockoutthreshold:0',
    risk: 'un usuario torpe se bloquea a sí mismo; el reset es administrativo',
  },
  {
    id: 'uac-level',
    group: 'uac',
    title: 'UAC: siempre avisar (sin auto-elevar)',
    why: 'ConsentPromptBehaviorAdmin=2 fuerza clic incluso para admins; EnableLUA mantiene el modelo de integridad',
    level: 1,
    commands: [
      'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "ConsentPromptBehaviorAdmin" -Value 2',
      'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "EnableLUA" -Value 1',
    ],
    verify: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" | Select EnableLUA,ConsentPromptBehaviorAdmin',
    revert: 'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "ConsentPromptBehaviorAdmin" -Value 5',
    risk: 'más clics de UAC; ninguna rotura',
  },
  {
    id: 'uac-fileop',
    group: 'uac',
    title: 'UAC: elevar solo firmados y validar rutas',
    why: 'dificulta DLL hijacking en procesos de elevación',
    level: 2,
    commands: [
      'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "ValidateAdminCodeSignatures" -Value 1',
      'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" -Name "EnableInstallerDetection" -Value 1',
    ],
    verify: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" | Select ValidateAdminCodeSignatures',
    revert: 'Set-ItemProperty ... -Name "ValidateAdminCodeSignatures" -Value 0',
    risk: 'instaladores viejos sin firma fallarán al elevar',
  },
  {
    id: 'smb1-off',
    group: 'red',
    title: 'desactivar SMBv1',
    why: 'vector de EternalBlue/WannaCry; innecesario salvo hardware pre-2010',
    level: 1,
    commands: ['Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart', 'Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force'],
    verify: 'Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol | Select State',
    revert: 'Enable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol',
    risk: 'NAS antiguos y equipos con Windows XP dejan de compartir',
  },
  {
    id: 'llmnr-nbt',
    group: 'red',
    title: 'apagar LLMNR y NetBIOS (anti-Responder)',
    why: 'Responder/Invezz capturan hashes NTLMv2 envenenando LLMNR/NBT-NS en redes locales',
    level: 1,
    commands: [
      'New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Force | Out-Null',
      'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Name "EnableMulticast" -Value 0',
      'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters" -Name "NodeType" -Value 2',
    ],
    verify: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" | Select EnableMulticast',
    revert: 'Set-ItemProperty ... EnableMulticast -Value 1',
    risk: 'resolución por nombre en LAN pequeña sin DNS puede fallar (raro)',
  },
  {
    id: 'defender-realtime',
    group: 'defender',
    title: 'Defender: protección total + tamper',
    why: 'protección en la nube, comportamiento, red y anti-tampering al máximo',
    level: 1,
    commands: [
      'Set-MpPreference -DisableRealtimeMonitoring $false',
      'Set-MpPreference -MAPSReporting Advanced',
      'Set-MpPreference -SubmitSamplesConsent 1',
      'Set-MpPreference -EnableNetworkProtection Enabled',
      'Set-MpPreference -EnableControlledFolderAccess Enabled',
    ],
    verify: 'Get-MpComputerStatus | Select RealTimeProtectionEnabled,AntivirusSignatureLastUpdated',
    revert: 'Set-MpPreference -EnableControlledFolderAccess Disabled',
    risk: 'Controlled Folder Access bloquea herramientas legítimas que escriben en Documentos (añade excepciones)',
  },
  {
    id: 'office-macros',
    group: 'office',
    title: 'Office: bloquear macros de Internet',
    why: 'el phishing con macros sigue siendo el vector #1 de intrusiones',
    level: 1,
    commands: [
      'New-Item -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Office\\16.0\\Word\\Security" -Force | Out-Null',
      'Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Office\\16.0\\Word\\Security" -Name "blockcontentexecutionfrominternet" -Value 1',
      'New-Item -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Office\\16.0\\Excel\\Security" -Force | Out-Null',
      'Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Office\\16.0\\Excel\\Security" -Name "blockcontentexecutionfrominternet" -Value 1',
    ],
    verify: 'Get-ItemProperty "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Office\\16.0\\Word\\Security"',
    revert: 'Remove-ItemProperty ... -Name "blockcontentexecutionfrominternet"',
    risk: 'macros legítimas descargadas no ejecutan (el usuario debe copiar el fichero localmente o firmarlas)',
  },
  {
    id: 'ps-scriptblock',
    group: 'powershell',
    title: 'PowerShell: log de ScriptBlock + module',
    why: 'todo script PS queda registrado en el Event Log 4104: visibilidad total para el blue team',
    level: 1,
    commands: [
      'New-Item -Path "HKLM:\\SOFTWARE\\Wow6432Node\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Force | Out-Null',
      'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Wow6432Node\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Value 1',
    ],
    verify: 'Get-WinEvent -LogName "Microsoft-Windows-PowerShell/Operational" -MaxEvents 5',
    revert: 'Set-ItemProperty ... EnableScriptBlockLogging -Value 0',
    risk: 'los logs crecen; rota el log si el volumen es alto',
  },
  {
    id: 'ps-execpolicy',
    group: 'powershell',
    title: 'PowerShell: ExecutionPolicy AllSigned (máquina)',
    why: 'sin scripts de Internet sin firmar (mitiga dowloader básico)',
    level: 2,
    commands: ['Set-ExecutionPolicy -Scope LocalMachine -ExecutionPolicy AllSigned -Force'],
    verify: 'Get-ExecutionPolicy -List',
    revert: 'Set-ExecutionPolicy -Scope LocalMachine -ExecutionPolicy RemoteSigned -Force',
    risk: 'scripts propios sin firmar dejan de correr (fírmalos o usa RemoteSigned)',
  },
  {
    id: 'audit-adv',
    group: 'auditoría',
    title: 'auditoría avanzada: logon, proceso y registro',
    why: 'sin logs de logon ni creación de procesos no hay forense posible',
    level: 1,
    commands: [
      'auditpol /set /category:"Logon/Logoff" /success:enable /failure:enable',
      'auditpol /set /subcategory:"Process Creation" /success:enable',
      'auditpol /set /category:"Account Management" /success:enable /failure:enable',
    ],
    verify: 'auditpol /get /category:*',
    revert: 'auditpol /set /category:"Logon/Logoff" /success:disable /failure:disable',
    risk: 'Event Log más grande: ajusta retención',
  },
  {
    id: 'rdp-nla',
    group: 'red',
    title: 'RDP solo con NLA y sin sesión vacía',
    why: 'NLA exige autenticación previa: mata el bluekeep y los bot de fuerza bruta',
    level: 1,
    commands: [
      'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp" -Name "UserAuthentication" -Value 1',
      'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" -Name "fDenyTSConnections" -Value 0',
    ],
    verify: 'Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp" | Select UserAuthentication',
    revert: 'Set-ItemProperty ... UserAuthentication -Value 0',
    risk: 'clientes RDP antiguos (pre-Win7) no conectan',
  },
  {
    id: 'bitlocker-check',
    group: 'bitlocker',
    title: 'BitLocker en el disco del sistema',
    why: 'robo físico de portátil = 0 fugas si BitLocker + TPM están activos',
    level: 1,
    commands: ['Manage-bde -Status C:', 'Enable-BitLocker -MountPoint "C:" -UsedSpaceOnly -SkipHardwareTest -RecoveryPassword'],
    verify: 'Manage-bde -Status C: | Select ConversionStatus,ProtectionStatus',
    revert: 'Disable-BitLocker -MountPoint "C:"',
    risk: 'guarda la RecoveryPassword impresa o en tu cuenta MS: sin ella los datos se pierden',
  },
]

export const HARDENING_PROFILES: { id: string; label: string; desc: string; level: 1 | 2 }[] = [
  { id: 'basico', label: 'Nivel 1 — básico recomendado', desc: 'todo lo de nivel 1: seguro sin romper nada', level: 1 },
  { id: 'estricto', label: 'Nivel 2 — estricto (CIS-like)', desc: 'incluye tweaks que pueden romper instaladores o scripts propios', level: 2 },
]

/** Filtra tweaks por nivel y genera el script PS. */
export function buildHardeningScript(level: 1 | 2, ids: string[]): string {
  const chosen = HARDENING.filter((t) => ids.includes(t.id))
  const L: string[] = [
    '# Requires -RunAsAdministrator',
    '# Hardening generado por HackNexus — revisa cada bloque antes de ejecutar',
    '# Cada tweak incluye verify/revert en la interfaz. Backup previo:',
    'Checkpoint-Computer -Description "pre-hardening" -RestorePointType MODIFY_SETTINGS  # solo en cliente Windows',
    '',
  ]
  let lastGroup = ''
  for (const t of chosen) {
    if (t.group !== lastGroup) {
      L.push(`# ═══ ${t.group.toUpperCase()} ═══`)
      lastGroup = t.group
    }
    L.push(`# ${t.title} (nivel ${t.level})`)
    L.push(`# por qué: ${t.why}`)
    for (const c of t.commands) L.push(c)
    L.push('')
  }
  L.push('# fin — ejecuta el verify de cada tweak para confirmar')
  return L.join('\n') + '\n'
}

export const HARDENING_AUDIT: [string, string][] = [
  ['Get-ComputerInfo | Select OsName,OsVersion,OsArchitecture,WindowsVersion', 'versión exacta del SO'],
  ['Get-LocalUser | Where Enabled | Select Name,LastLogon', 'cuentas activas y último login'],
  ['Get-SmbServerConfiguration | Select EnableSMB1Protocol,EncryptData', 'SMB1 activo = alarma'],
  ['Get-MpComputerStatus | Select AMServiceEnabled,AntispywareEnabled,RealTimeProtectionEnabled', 'salud de Defender'],
  ['auditpol /get /category:"Logon/Logoff"', 'auditoría de logon activada'],
  ['Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\\WinStations\\RDP-Tcp" | Select UserAuthentication,PortNumber', 'NLA y puerto RDP'],
]
