/* Sysmon: generador de configuración XML orientada a detección.
   Referencia: docs de Sysinternals, SwiftOnSecurity sysmon-config,
   Olaf Hartong sysmon-modular. Cada evento explica por qué importa. */

export interface SysmonEvent {
  id: number
  name: string
  what: string
  offensive: string // para qué lo usa el atacante
  defensive: string // qué buscar en el log
  essential: boolean
}

export const SYSMON_EVENTS: SysmonEvent[] = [
  { id: 1, name: 'Process Creation', what: 'cada proceso que arranca con línea de comando completa y hash del binario', offensive: 'los atacantes viven aquí: powershell -enc, certutil -urlcache, whoami', defensive: 'alerta en -enc, -w hidden, binarios con hash conocido-malo ejecutándose desde %TEMP%', essential: true },
  { id: 2, name: 'File Creation Time Change (timestomping)', what: 'cuando alguien cambia la fecha de creación de un fichero', offensive: 'técnica anti-forense clásica para ocultar droppers', defensive: 'casi siempre es malo: cualquier hit merece revisión', essential: true },
  { id: 3, name: 'Network Connection', what: 'conexiones salientes por proceso (sin payload)', offensive: 'beaconing de C2, exfiltración por DNS/HTTPS', defensive: 'procesos que no deberían salir a internet (excel.exe → IP rusa) saltan a la vista', essential: true },
  { id: 7, name: 'Image Load (DLLs)', what: 'cada DLL que carga un proceso', offensive: 'DLL sideloading y hijacking de binarios legítimos', defensive: 'una DLL de sistema cargada desde carpeta rara = alerta', essential: true },
  { id: 8, name: 'CreateRemoteThread', what: 'un proceso crea un hilo en OTRO proceso', offensive: 'inyección de código clásica (Process Injection T1055)', defensive: 'si no eres un AV o debugger, esto es siempre sospechoso', essential: true },
  { id: 9, name: 'RawAccessRead', what: 'lectura de disco con \\\\.\\C: (sin filesystem)', offensive: 'copia de disco entero sin permisos del SO', defensive: 'mimikatz-like tools y ransomware de exfiltración lo usan', essential: false },
  { id: 10, name: 'ProcessAccess', what: 'un proceso abre otro con permisos raros (lectura de memoria)', offensive: 'mimikatz leyendo LSASS.exe vive aquí', defensive: 'todo acceso a lsass.exe con GrantedAccess 0x1010+ merece alerta', essential: true },
  { id: 11, name: 'FileCreate', what: 'creación de ficheros', offensive: 'droppers, webshells, staging de ransomware', defensive: 'ficheros .exe/.ps1/.dll en carpetas escribibles por usuarios', essential: true },
  { id: 12, name: 'RegistryEvent (Object create/delete)', what: 'claves de registro creadas o borradas', offensive: 'persistencia en Run keys, desactivación de defensas', defensive: 'Run/RunOnce, servicios, desactivación de UAC/Defender', essential: true },
  { id: 13, name: 'RegistryEvent (Value Set)', what: 'valores de registro modificados', offensive: 'el atacante escribe su payload en Run, o cambia la config de DEFENDER', defensive: 'igual que 12 pero para escrituras: monitoriza Set-MpPreference (DisableRealtimeMonitoring)', essential: true },
  { id: 14, name: 'RegistryEvent (Rename)', what: 'claves renombradas', offensive: 'táctica rara pero usada para evadir detección', defensive: 'cualquier rename en Run/Services es raro', essential: false },
  { id: 15, name: 'FileCreateStreamHash', what: 'creación de Alternate Data Streams (Zone.Identifier)', offensive: 'identifica ficheros descargados de internet (Mark of the Web)', defensive: 'los ejecutables con MotW recién creados son phishing casi seguro', essential: true },
  { id: 16, name: 'Sysmon Config Change', what: 'alguien tocó la config de Sysmon', offensive: 'el atacante intenta apagar/reducir el logging', defensive: 'alerta inmediata: nadie toca Sysmon en producción', essential: true },
  { id: 17, name: 'Pipe Created', what: 'named pipes creadas', offensive: 'comunicación entre implants (Cobalt Strike usa pipes)', defensive: 'pipes con nombres aleatorios o de procesos que no deberían crearlas', essential: false },
  { id: 18, name: 'Pipe Connected', what: 'conexión a named pipe', offensive: 'movimiento lateral con SMB/pipe (psexec style)', defensive: 'conexiones a ADMIN$ y pipes de servicio', essential: false },
  { id: 22, name: 'DNS Query', what: 'cada consulta DNS con el proceso que la hace', offensive: 'exfiltración por DNS, resolución de C2, DGA domains', defensive: 'procesos raros haciendo DNS (powershell pidiendo evil.com), dominios DGA', essential: true },
  { id: 23, name: 'FileDelete + Archive', what: 'borrado de ficheros (con archivado opcional)', offensive: 'el ransomware borra volumen de sombra, los atacantes limpian rastros', defensive: 'vssadmin delete shadows aparece aquí; borrado masivo de logs', essential: true },
  { id: 25, name: 'ProcessTampering', what: 'cambio de imagen de un proceso en ejecución (hollowing)', offensive: 'process hollowing: el proceso legitimo ejecuta código del atacante', defensive: 'cualquier hit: es técnica de evasión pura', essential: true },
  { id: 27, name: 'FileBlockExecutable', what: 'bloquea la creación de ejecutables (modo preventivo)', offensive: 'impide que el dropper suelte su payload', defensive: 'útil en carpetas de staging, no en todo el disco', essential: false },
  { id: 28, name: 'FileDeleteDetected', what: 'borrado de ficheros detectado (sin archivar)', offensive: 'limpieza post-explotación', defensive: 'borrado de .ps1/.exe en TEMP tras ejecución = patrón de malware', essential: false },
]

/* nombres de etiqueta reales del schema de Sysmon por id de evento */
const TAG_BY_ID: Record<number, string> = {
  2: 'FileCreateTime',
  7: 'ImageLoad',
  8: 'CreateRemoteThread',
  9: 'RawAccessRead',
  11: 'FileCreate',
  12: 'RegistryEvent',
  13: 'RegistryEvent',
  14: 'RegistryEvent',
  15: 'FileCreateStreamHash',
  16: 'SysmonConfigChange',
  17: 'PipeEvent',
  18: 'PipeEvent',
  23: 'FileDelete',
  25: 'ProcessTampering',
  27: 'FileBlockExecutable',
  28: 'FileDeleteDetected',
}

export interface SysmonOptions {
  includeNetwork: boolean // Event 3 con TOOD detalle
  dnsLogging: boolean // Event 22
  hashAlgos: 'sha256' | 'sha256,imphash' | 'md5,sha256,imphash'
  checkRevocation: boolean
  eventIds: number[]
  excludePaths: string[] // ruidos conocidos
  onmatch: 'include' | 'exclude'
}

export const SYSMON_PROFILES: { id: string; label: string; desc: string; ids: number[]; opts: Partial<SysmonOptions> }[] = [
  { id: 'esencial', label: 'esencial (recomendado)', desc: 'los eventos con mayor ROI de detección, ruido bajo', ids: [1, 2, 3, 7, 8, 10, 11, 12, 13, 16, 22, 25], opts: { hashAlgos: 'sha256,imphash' } },
  { id: 'completo', label: 'completo (SOAR/SIEM)', desc: 'todos los eventos — necesita SIEM y buen volume', ids: SYSMON_EVENTS.map((e) => e.id), opts: { hashAlgos: 'md5,sha256,imphash' } },
  { id: 'minimo', label: 'mínimo (endpoints antiguos)', desc: 'solo lo básico para máquinas de poca potencia', ids: [1, 3, 10, 11, 13, 22], opts: { hashAlgos: 'sha256' } },
]

export function buildSysmonConfig(o: SysmonOptions): string {
  const L: string[] = []
  L.push('<Sysmon schemaversion="4.90">')
  L.push('  <HashAlgorithms>' + o.hashAlgos + '</HashAlgorithms>')
  L.push('  <CheckRevocation>' + (o.checkRevocation ? 'true' : 'false') + '</CheckRevocation>')
  L.push('  <EventFiltering>')
  L.push('    <!-- ═══ eventos activados: ' + o.eventIds.join(', ') + ' ═══ -->')

  for (const ev of SYSMON_EVENTS.filter((e) => o.eventIds.includes(e.id))) {
    const on = ev.essential || o.eventIds.includes(ev.id)
    if (!on) continue
    L.push(`    <!-- ${ev.id}: ${ev.name} -->`)
    switch (ev.id) {
      case 1:
        L.push('    <ProcessCreate onmatch="exclude">')
        L.push('      <!-- ruido benigno conocidísimo: afina según tu parque -->')
        for (const p of o.excludePaths) L.push(`      <Image condition="begin with">${p}</Image>`)
        L.push('    </ProcessCreate>')
        break
      case 3:
        L.push('    <NetworkConnect onmatch="exclude">')
        L.push('      <Image condition="is">C:\\Windows\\System32\\svchost.exe</Image>')
        L.push('    </NetworkConnect>')
        break
      case 22:
        L.push('    <DnsQuery onmatch="exclude">')
        L.push('      <!-- excluye el ruido de fondo de Windows Update/telemetría -->')
        L.push('      <Image condition="begin with">C:\\Windows\\System32\\svchost.exe</Image>')
        L.push('    </DnsQuery>')
        break
      case 10:
        L.push('    <ProcessAccess onmatch="include">')
        L.push('      <TargetImage condition="is">C:\\Windows\\system32\\lsass.exe</TargetImage>')
        L.push('      <GrantedAccess condition="is">0x1010</GrantedAccess>')
        L.push('      <GrantedAccess condition="is">0x1410</GrantedAccess>')
        L.push('    </ProcessAccess>')
        break
      default:
        L.push(`    <${TAG_BY_ID[ev.id] ?? 'FileCreate'} onmatch="exclude"><!-- captura todo -->`)
        L.push(`    </${TAG_BY_ID[ev.id] ?? 'FileCreate'}>`)
    }
    L.push('')
  }

  L.push('    <!-- TODO lo no cubierto arriba: usa sysmon-modular de Olaf Hartong')
  L.push('         o sysmon-config de SwiftOnSecurity para reglas por familia -->')
  L.push('  </EventFiltering>')
  L.push('</Sysmon>')
  return L.join('\n')
}

export const SYSMON_DEPLOY: [string, string][] = [
  ['sysmon64.exe -accepteula -i sysmon-config.xml', 'instala con la config (necesita admin)'],
  ['sysmon64.exe -c sysmon-config.xml', 'actualiza la config en caliente'],
  ['sysmon64.exe -c', 'muestra la config activa'],
  ['Get-WinEvent -LogName "Microsoft-Windows-Sysmon/Operational" -MaxEvents 10', 'lee eventos en PowerShell'],
  ['wevtutil qe "Microsoft-Windows-Sysmon/Operational" /c:5 /f:text', 'idem con wevtutil'],
  ['Get-WinEvent -FilterHashtable @{LogName="Microsoft-Windows-Sysmon/Operational"; Id=1} | Where Message -match "-enc"', 'cazar PowerShell codificado'],
]

export const SYSMON_NOTES: string[] = [
  'Sysmon NO analiza nada: solo genera logs. El análisis llega con tu SIEM (Wazuh, Elastic, Splunk).',
  'Event 1 sin hashes imphash pierde la mitad del valor: el imphash detecta packers.',
  'La config de SwiftOnSecurity (github.com/SwiftOnSecurity/sysmon-config) es el estándar de facto para empezar.',
  'sysmon-modular (Olaf Hartong) mapea cada regla a MITRE ATT&CK: úsalo para cubrir técnicas concretas.',
  'Los logs van a "Microsoft-Windows-Sysmon/Operational" — redirígelos a tu SIEM con Winlogbeat o NXLog.',
  'Sysmon consume CPU mínima pero genera MUCHOS eventos: en endpoints antiguos usa el perfil mínimo.',
]
