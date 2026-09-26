import { useMemo, useState } from 'react'
import { FileTerminal, Search } from 'lucide-react'
import { ToolHeader, Badge, TextInput, Reveal, CopyBtn, InfoBanner } from '../components/ui'

interface PsSnippet {
  cat: string
  task: string
  cmd: string
  note?: string
  tone?: 'ok' | 'info' | 'warn' | 'bad'
}

const SNIPPETS: PsSnippet[] = [
  // sistema
  { cat: 'sistema', task: 'información completa del equipo', cmd: 'Get-ComputerInfo | Select OsName,OsVersion,OsArchitecture,CsProcessors,BiosSMBIOSBIOSVersion' },
  { cat: 'sistema', task: 'uptime desde el último arranque', cmd: '(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime' },
  { cat: 'sistema', task: 'variables de entorno (sistema y usuario)', cmd: 'Get-ChildItem Env: | Sort-Object Name | Format-Table -AutoSize' },
  { cat: 'sistema', task: 'licencia y activación de Windows', cmd: 'Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" | Select Name,Description,LicenseStatus' },
  { cat: 'sistema', task: 'desinstalar programa por nombre', cmd: 'Get-Package -Name "*vim*" | Uninstall-Package', note: 'funciona con proveedores MSI/programs; para MSI directo: msiexec /x {GUID}' },
  { cat: 'sistema', task: 'punto de restauración', cmd: 'Checkpoint-Computer -Description "antes-de-cambios" -RestorePointType MODIFY_SETTINGS', note: 'solo Windows client, máx 1 cada 24h por defecto', tone: 'warn' },
  // procesos y servicios
  { cat: 'procesos', task: 'top procesos por RAM', cmd: 'Get-Process | Sort-Object WS -Descending | Select -First 15 Name,Id,@{n="RAM(MB)";e={[math]::Round($_.WS/1MB)}}' },
  { cat: 'procesos', task: 'procesos con línea de comandos completa', cmd: 'Get-CimInstance Win32_Process | Select ProcessId,Name,CommandLine | Where CommandLine -ne $null' },
  { cat: 'procesos', task: 'procesos sin firma digital (sospechosos)', cmd: 'Get-Process | Where {$_.Path} | ForEach { $sig = Get-AuthenticodeSignature $_.Path; if ($sig.Status -ne "Valid") { [PSCustomObject]@{Name=$_.Name; Path=$_.Path; Status=$sig.Status} } }', tone: 'ok', note: 'caza binarios de malware en memoria' },
  { cat: 'procesos', task: 'servicios corriendo con cuentas de terceros', cmd: 'Get-CimInstance Win32_Service | Where {$_.StartName -notin @("LocalSystem","NT AUTHORITY\\LocalService","NT AUTHORITY\\NetworkService") -and $_.State -eq "Running"} | Select Name,StartName,PathName', tone: 'ok' },
  { cat: 'procesos', task: 'servicios con binario en carpeta escribible', cmd: 'Get-CimInstance Win32_Service | Where {$_.PathName -match "\\\\Users\\\\|\\\\Temp\\\\|\\\\ProgramData\\\\"} | Select Name,PathName,StartMode', tone: 'bad', note: 'patrón clásico de privesc: servicio SYSTEM con exe reemplazable' },
  { cat: 'procesos', task: 'reiniciar un servicio y sus dependientes', cmd: 'Restart-Service -Name "wuauserv" -Force' },
  // red
  { cat: 'red', task: 'configuración IP completa', cmd: 'Get-NetIPConfiguration | Format-List InterfaceAlias,IPv4Address,IPv4DefaultGateway,DNSServer' },
  { cat: 'red', task: 'puertos en escucha con proceso dueño', cmd: 'Get-NetTCPConnection -State Listen | Select LocalAddress,LocalPort,OwningProcess,@{n="Proc";e={(Get-Process -Id $_.OwningProcess).Name}} | Sort LocalPort' },
  { cat: 'red', task: 'conexiones establecidas con geolocalización ASN', cmd: 'Get-NetTCPConnection -State Established | Select RemoteAddress,RemotePort,OwningProcess -Unique | Sort RemoteAddress' , note: 'cruza las IPs remitas con AbuseIPDB/Shodan' },
  { cat: 'red', task: 'flush DNS + ver cache', cmd: 'Clear-DnsClientCache; Get-DnsClientCache | Select Entry,Data -First 20' },
  { cat: 'red', task: 'test de puerto rápido (TCP)', cmd: 'Test-NetConnection objetivo.com -Port 443 -InformationLevel Detailed' },
  { cat: 'red', task: 'traceroute', cmd: 'Test-NetConnection objetivo.com -TraceRoute' },
  { cat: 'red', task: 'reglas firewall por puerto', cmd: 'Get-NetFirewallRule -Enabled True -Direction Inbound | Get-NetFirewallPortFilter | Where LocalPort -eq 3389' },
  // disco
  { cat: 'disco', task: 'espacio libre por unidad', cmd: 'Get-PSDrive -PSProvider FileSystem | Select Name,@{n="Usado(GB)";e={[math]::Round($_.Used/1GB,1)}},@{n="Libre(GB)";e={[math]::Round($_.Free/1GB,1)}}' },
  { cat: 'disco', task: 'los 20 ficheros más grandes de una ruta', cmd: 'Get-ChildItem C:\\ -Recurse -File -ErrorAction SilentlyContinue | Sort Length -Descending | Select -First 20 FullName,@{n="MB";e={[math]::Round($_.Length/1MB)}}' },
  { cat: 'disco', task: 'BitLocker status', cmd: 'Get-BitLockerVolume | Select MountPoint,VolumeStatus,ProtectionStatus,EncryptionPercentage' },
  { cat: 'disco', task: 'hash SHA-256 de un fichero', cmd: 'Get-FileHash C:\\ruta\\fichero.exe -Algorithm SHA256 | Format-List' },
  // registro y usuarios
  { cat: 'registro', task: 'programas de autoarranque (Run keys)', cmd: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run","HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" | Format-List', tone: 'ok', note: 'persistencia clásica: revisa rutas raras' },
  { cat: 'registro', task: 'backup de una clave del registro', cmd: 'reg export "HKLM\\SOFTWARE\\MiApp" C:\\backup-miapp.reg' },
  { cat: 'registro', task: 'buscar valor en el registro (lento pero efectivo)', cmd: 'Get-ChildItem -Path HKLM:\\SOFTWARE -Recurse -ErrorAction SilentlyContinue | Where {$_.Name -like "*MiApp*"} | Select Name' },
  { cat: 'usuarios', task: 'usuarios locales y último login', cmd: 'Get-LocalUser | Select Name,Enabled,LastLogon,PasswordLastSet | Sort LastLogon -Descending' },
  { cat: 'usuarios', task: 'miembros del grupo Administradores', cmd: 'Get-LocalGroupMember -Group "Administradores" | Select Name,PrincipalSource' },
  { cat: 'usuarios', task: 'intentos de login fallidos (evento 4625)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4625} -MaxEvents 20 | Select TimeCreated,@{n="User";e={$_.Properties[5].Value}},@{n="IP";e={$_.Properties[19].Value}}' },
  // blue team
  { cat: 'blue team', task: 'eventos de creación de proceso (4688) hoy', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4688; StartTime=(Get-Date).Date} | Select TimeCreated,@{n="Cmd";e={$_.Properties[5].Value}} -First 50' },
  { cat: 'blue team', task: 'tareas programadas como SYSTEM', cmd: 'Get-ScheduledTask | Where {$_.Principal.UserId -eq "SYSTEM" -and $_.State -ne "Disabled"} | Select TaskName,TaskPath,State' },
  { cat: 'blue team', task: 'powershell con comandos codificados recientes', cmd: 'Get-WinEvent -LogName "Microsoft-Windows-PowerShell/Operational" -MaxEvents 200 | Where {$_.Message -match "-enc|-EncodedCommand|FromBase64"} | Select TimeCreated,Message -First 10', tone: 'bad' },
  { cat: 'blue team', task: 'conexiones RDP entrantes (4624 logon type 10)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4624; LogonType=10} -MaxEvents 20 | Select TimeCreated,@{n="User";e={$_.Properties[5].Value}},@{n="SourceIP";e={$_.Properties[18].Value}}' },
  { cat: 'blue team', task: 'enumerarshares administrativas activas', cmd: 'Get-SmbShare | Select Name,Path,Description' },
  { cat: 'blue team', task: 'defender: amenazas detectadas', cmd: 'Get-MpThreatDetection | Sort InitialDetectionTime -Descending | Select ThreatID,Resources,InitialDetectionTime -First 10' },
]

const CATS = [...new Set(SNIPPETS.map((s) => s.cat))]

export default function Pslab() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('todas')

  const filtered = useMemo(() => {
    let out = SNIPPETS
    if (cat !== 'todas') out = out.filter((s) => s.cat === cat)
    if (q.trim()) {
      const needle = q.toLowerCase()
      out = out.filter((s) => s.task.toLowerCase().includes(needle) || s.cmd.toLowerCase().includes(needle))
    }
    return out
  }, [q, cat])

  return (
    <div>
      <ToolHeader icon={FileTerminal} title="PowerShell Lab" desc="Recetario de one-liners de administración, red, disco, registro y blue team — los comandos que de verdad usas a diario, con la trampa de cada uno explicada" />

      <InfoBanner>
        <b>PowerShell es el cuchillo suizo de Windows:</b> casi todo lo que hacías con GUI es más rápido aquí, y el blue team vive de estos comandos (los logs de PowerShell/Operational y los eventos 4688/4625 son oro). Ejecuta los de auditoría en tu máquina: si algo sale en las secciones marcadas como sospechosas, investiga.
      </InfoBanner>

      <Reveal>
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar por tarea o comando…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCat('todas')} className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${cat === 'todas' ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>todas</button>
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11px] ${cat === c ? 'border-acento/50 bg-acento/10 text-acento' : 'border-edge text-grey'}`}>{c}</button>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="space-y-2">
        {filtered.map((s, i) => (
          <Reveal key={i}>
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{s.cat}</Badge>
                <span className="font-mono text-[12px] text-ink">{s.task}</span>
                {s.tone && <Badge tone={s.tone}>{s.tone === 'bad' ? '⚠ patrón de ataque' : s.tone === 'warn' ? '⚠ cuidado' : '✓ defensivo'}</Badge>}
                <CopyBtn text={s.cmd} className="ml-auto" />
              </div>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-edge bg-black/40 p-3 font-mono text-[11.5px] leading-relaxed text-acento">{s.cmd}</pre>
              {s.note && <p className="mt-1.5 font-mono text-[10px] text-grey">ℹ {s.note}</p>}
            </div>
          </Reveal>
        ))}
        {filtered.length === 0 && <div className="card p-6 text-center font-mono text-xs text-grey">nada encontrado con esos filtros</div>}
      </div>
    </div>
  )
}
