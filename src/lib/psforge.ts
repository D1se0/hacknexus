/* Generador de scripts PowerShell por bloques — 100% local.
   Equivalente a bashforge.ts pero para PowerShell 5.1/7+: se emite con
   Set-StrictMode, manejo de errores con try/catch y Write-Host coloreado.
   La filosofía es la misma: bloques declarativos + explicación para aprender. */

export interface PSBlock {
  id: string
  kind: PSBlockKind
  params: Record<string, string | number | boolean>
}

export type PSBlockKind =
  | 'header' | 'strict' | 'var' | 'array' | 'param' | 'readhost' | 'testpath'
  | 'ifcond' | 'foreach' | 'while' | 'func' | 'switch' | 'command'
  | 'pinghost' | 'portscan' | 'servcheck' | 'transcript' | 'trycatch' | 'colors'

export interface PSForgeResult {
  script: string
  lines: number
  warnings: string[]
}

const q = (s: string): string => `'${s.replace(/'/g, "''")}'`

interface BlockDef {
  label: string
  icon: string
  desc: string
  fields: { key: string; label: string; ph?: string; area?: boolean; type?: 'text' | 'number' | 'toggle' | 'select'; options?: string[]; def?: string | number | boolean }[]
  defaults: Record<string, string | number | boolean>
  emit: (p: Record<string, string | number | boolean>) => string
  learn: string
  warn?: (p: Record<string, string | number | boolean>) => string | null
}

export const PS_BLOCK_DEFS: Record<PSBlockKind, BlockDef> = {
  header: {
    label: 'Cabecera', icon: '📋',
    desc: 'Comentario de cabecera con nombre, autor y propósito.',
    fields: [
      { key: 'name', label: 'nombre del script', def: 'recon.ps1' },
      { key: 'author', label: 'autor', def: 'D1se0' },
      { key: 'purpose', label: 'propósito', area: true, def: 'Recon básico de un host Windows' },
    ],
    defaults: { name: 'recon.ps1', author: 'D1se0', purpose: 'Recon básico de un host Windows' },
    emit: (p) => `<#\n.SYNOPSIS\n    ${p.purpose}\n.AUTHOR\n    ${p.author}\n.NOTES\n    generado con HackNexus PowerShell Forge\n#>`,
    learn: 'El comment-based help de PowerShell (<# .SYNOPSIS #>) no es decorativo: Get-Help .\\script.ps1 lo muestra formateado. Documentar así es el estándar profesional en PS.',
  },
  strict: {
    label: 'Modo estricto', icon: '🛡️',
    desc: 'Set-StrictMode + $ErrorActionPreference: el script falla en lugar de seguir como si nada.',
    fields: [
      { key: 'version', label: 'Set-StrictMode', type: 'select', options: ['-Version Latest', '-Version 3.0', 'desactivado'], def: '-Version Latest' },
      { key: 'eap', label: 'ErrorActionPreference', type: 'select', options: ['Stop', 'Continue'], def: 'Stop' },
    ],
    defaults: { version: '-Version Latest', eap: 'Stop' },
    emit: (p) => {
      const lines: string[] = []
      if (String(p.version) !== 'desactivado') lines.push(`Set-StrictMode ${p.version}`)
      lines.push(`$ErrorActionPreference = '${p.eap}'`)
      return lines.join('\n')
    },
    learn: 'StrictMode convierte en ERRORES cosas que PS silencia (usar una variable inexistente, llamar una propiedad que no existe). $ErrorActionPreference=Stop hace que los cmdlets paren en el primer error en vez de seguir con rojo en pantalla.',
  },
  var: {
    label: 'Variable', icon: '📦',
    desc: 'Asignación con tipado opcional.',
    fields: [
      { key: 'name', label: 'nombre', def: 'Target' },
      { key: 'type', label: 'tipo', type: 'select', options: ['[string]', '[int]', '[bool]', '[double]', '[DateTime]', 'sin tipo'], def: '[string]' },
      { key: 'value', label: 'valor', def: 'DC01.corp.local' },
    ],
    defaults: { name: 'Target', type: '[string]', value: 'DC01.corp.local' },
    emit: (p) => `${p.type === 'sin tipo' ? '' : p.type}$${p.name} = ${q(String(p.value))}`,
    learn: 'Las variables PS llevan $ delante pero el tipo va ENTRE la asignación y el nombre... bueno, delante: [int]$x = 5. El tipado valida conversiones: [int]$x = "hola" explota en tu cara (bien).',
    warn: (p) => (/\s/.test(String(p.name)) ? 'el nombre de variable contiene espacios' : null),
  },
  array: {
    label: 'Array / lista', icon: '🗂️',
    desc: 'Array con @() y bucle foreach de ejemplo.',
    fields: [
      { key: 'name', label: 'nombre', def: 'Hosts' },
      { key: 'values', label: 'elementos (uno por línea)', area: true, def: 'DC01\nFILE01\nCLIENTE05' },
    ],
    defaults: { name: 'Hosts', values: 'DC01\nFILE01\nCLIENTE05' },
    emit: (p) => {
      const items = String(p.values).split('\n').map((v) => v.trim()).filter(Boolean).map((v) => `    ${q(v)}`)
      return `$${p.name} = @(\n${items.join(',\n')}\n)\n\nforeach ($h in $${p.name}) {\n    Write-Host "[*] procesando $h"\n}`
    },
    learn: '@() garantiza array aunque haya un solo elemento (evita el bug clásico de .Count en un string). PS también tiene ArrayList y pipelines, pero para listas simples @() es lo idiomático.',
  },
  param: {
    label: 'Bloque param()', icon: '⌨️',
    desc: 'Parámetros del script con validación tipo cmdlet.',
    fields: [
      { key: 'name', label: 'parámetro', def: 'ComputerName' },
      { key: 'mandatory', label: 'obligatorio [Parameter(Mandatory)]', type: 'toggle', def: true },
      { key: 'type', label: 'tipo', type: 'select', options: ['[string]', '[int]', '[string[]]'], def: '[string]' },
      { key: 'help', label: 'mensaje de ayuda', def: 'Equipo objetivo' },
    ],
    defaults: { name: 'ComputerName', mandatory: true, type: '[string]', help: 'Equipo objetivo' },
    emit: (p) => {
      const head = p.mandatory ? '[Parameter(Mandatory)]\n    ' : ''
      const def = p.mandatory ? '' : ` = ${q('valor')}`
      return `param(\n    ${head}${p.type}$${p.name}${def}\n)`
    },
    learn: 'param() debe ser la PRIMERA sentencia ejecutable del script. Con [Parameter(Mandatory)] PowerShell pide el valor interactivamente si no llega por CLI. Get-Help muestra el .help del comentario.',
    warn: () => 'recuerda: param() debe ir justo después de los comentarios de ayuda y antes de cualquier código',
  },
  readhost: {
    label: 'Pedir dato', icon: '❓',
    desc: 'Read-Host con prompt y opción de secreto (AsSecureString).',
    fields: [
      { key: 'var', label: 'variable', def: 'User' },
      { key: 'msg', label: 'pregunta', def: 'Usuario a auditar' },
      { key: 'secure', label: 'modo secreto (AsSecureString)', type: 'toggle', def: false },
    ],
    defaults: { var: 'User', msg: 'Usuario a auditar', secure: false },
    emit: (p) => p.secure
      ? `$${p.var} = Read-Host '${p.msg}' -AsSecureString`
      : `$${p.var} = Read-Host '${p.msg}'`,
    learn: 'AsSecureString devuelve un objeto encriptado en memoria (DPAPI): nunca queda el secreto en texto plano en la consola ni en el historial. Se usa con ConvertFrom-SecureString -AsPlainText en PS7 o Marshal en PS5.',
  },
  testpath: {
    label: 'Test-Path', icon: '📄',
    desc: 'Comprueba la existencia de fichero, carpeta, clave de registro o PSDrive.',
    fields: [
      { key: 'path', label: 'ruta', def: 'C:\\Windows\\System32' },
      { key: 'type', label: 'tipo', type: 'select', options: ['-PathType Leaf (fichero)', '-PathType Container (carpeta)', 'cualquiera'], def: 'cualquiera' },
    ],
    defaults: { path: 'C:\\Windows\\System32', type: 'cualquiera' },
    emit: (p) => {
      const t = String(p.type).startsWith('-PathType Leaf') ? " -PathType Leaf" : String(p.type).startsWith('-PathType Container') ? " -PathType Container" : ''
      return `if (Test-Path ${q(String(p.path))}${t}) {\n    Write-Host "[✓] ${p.path} existe"\n} else {\n    Write-Warning "${p.path} no existe"\n}`
    },
    learn: 'Test-Path funciona con el proveedor que sea: FileSystem, Registry (HKLM:\\...), Certificate, ActiveDirectory... PS unifica todo bajo PSDrives.',
  },
  ifcond: {
    label: 'If / elseif / else', icon: '🔀',
    desc: 'Condicional con operadores -gt, -eq, -like, -match.',
    fields: [
      { key: 'left', label: 'izquierda', def: '$Count' },
      { key: 'op', label: 'operador', type: 'select', options: ['-gt (mayor)', '-lt (menor)', '-ge (mayor o igual)', '-le (menor o igual)', '-eq (igual)', '-ne (distinto)', '-like (glob *)', '-match (regex)'], def: '-gt (mayor)' },
      { key: 'right', label: 'derecha', def: '10' },
      { key: 'then', label: 'entonces', area: true, def: 'Write-Host "se cumple"' },
      { key: 'els', label: 'si no (opcional)', area: true, def: '' },
    ],
    defaults: { left: '$Count', op: '-gt (mayor)', right: '10', then: 'Write-Host "se cumple"', els: '' },
    emit: (p) => {
      const op = String(p.op).split(' ')[0]
      const cond = `${p.left} ${op} ${q(String(p.right))}`
      const els = p.els ? String(p.els).split('\n').map((l) => `    ${l}`).join('\n') : ''
      return `if (${cond}) {\n${String(p.then).split('\n').map((l) => `    ${l}`).join('\n')}${els ? `\n} else {\n${els}` : ''}\n}`
    },
    learn: 'En PS, -eq es IGUALDAD (== es sintaxis C que en PS ¡es un parámetro de split!). -like usa globs (admin*), -match usa regex y rellena $Matches. Para and/or: -and / -or.',
  },
  foreach: {
    label: 'Foreach', icon: '🔁',
    desc: 'Bucle foreach clásico sobre colección.',
    fields: [
      { key: 'var', label: 'variable', def: '$item' },
      { key: 'coll', label: 'colección', def: '$Hosts' },
      { key: 'body', label: 'cuerpo', area: true, def: 'Write-Host "procesando $item"' },
    ],
    defaults: { var: 'item', coll: '$Hosts', body: 'Write-Host "procesando $item"' },
    emit: (p) => {
      const v = String(p.var).replace(/^\$/, '')
      const body = String(p.body).replace(/\$item/g, `$${v}`).split('\n').map((l) => `    ${l}`).join('\n')
      return `foreach ($${v} in ${p.coll}) {\n${body}\n}`
    },
    learn: 'foreach statement vs ForEach-Object: el statement es MÁS RÁPIDO (no abre pipeline) y permite break/continue limpios. ForEach-Object brilla dentro de un pipeline con $_.',
  },
  while: {
    label: 'While / Do-While', icon: '🌊',
    desc: 'Bucle while con condición y opción do-while.',
    fields: [
      { key: 'kind', label: 'variante', type: 'select', options: ['while', 'do-while', 'do-until'], def: 'while' },
      { key: 'cond', label: 'condición', def: '$i -lt 5' },
      { key: 'body', label: 'cuerpo', area: true, def: '$i++\nWrite-Host "vuelta $i"' },
      { key: 'init', label: 'inicialización previa', def: '$i = 0' },
    ],
    defaults: { kind: 'while', cond: '$i -lt 5', body: '$i++\nWrite-Host "vuelta $i"', init: '$i = 0' },
    emit: (p) => {
      const body = String(p.body).split('\n').map((l) => `    ${l}`).join('\n')
      if (p.kind === 'do-while') return `${p.init}\ndo {\n${body}\n} while (${p.cond})`
      if (p.kind === 'do-until') return `${p.init}\ndo {\n${body}\n} until (${p.cond})`
      return `${p.init}\nwhile (${p.cond}) {\n${body}\n}`
    },
    learn: 'do-while ejecuta el cuerpo AL MENOS UNA VEZ antes de evaluar; do-until lo repite HASTA que la condición sea true (lógica invertida). En PS no existe break-after: se usa break.',
  },
  func: {
    label: 'Función', icon: '🧩',
    desc: 'Función con bloque param, Verb-Noun y valor de retorno.',
    fields: [
      { key: 'name', label: 'nombre (Verb-Noun)', def: 'Get-HostInfo' },
      { key: 'params', label: 'parámetros', def: 'ComputerName' },
      { key: 'body', label: 'cuerpo', area: true, def: 'Write-Host "consultando $ComputerName"' },
    ],
    defaults: { name: 'Get-HostInfo', params: 'ComputerName', body: 'Write-Host "consultando $ComputerName"' },
    emit: (p) => {
      const ps = String(p.params).split(',').map((s) => s.trim()).filter(Boolean).map((s) => `        [string]$${s}`).join(',\n')
      return `function ${p.name} {\n    param(\n${ps || '        [string]$Name'}\n    )\n${String(p.body).split('\n').map((l) => `    ${l}`).join('\n')}\n}`
    },
    learn: 'PS exige (por convención aprobada) Verb-Noun: usa Get-Verb para ver los aprobados. Las funciones PS devuelven TODO lo que "emiten" (no hay return único: todo stdout de la función es output).',
    warn: (p) => (/\s/.test(String(p.name)) ? 'el nombre de función contiene espacios' : null),
  },
  switch: {
    label: 'Switch', icon: '🎛️',
    desc: 'Switch de PS: más potente que el case de bash (soporta regex y wildcards).',
    fields: [
      { key: 'var', label: 'variable', def: '$SO' },
      { key: 'cases', label: 'casos (patrón=código)', area: true, def: 'server=Write-Host "es server"\n*desktop*=Write-Host "es desktop"' },
      { key: 'def', label: 'caso por defecto', def: 'Write-Host "desconocido"' },
      { key: 'wildcard', label: 'activar -Wildcard', type: 'toggle', def: true },
    ],
    defaults: { var: '$SO', cases: 'server=Write-Host "es server"\n*desktop*=Write-Host "es desktop"', def: 'Write-Host "desconocido"', wildcard: true },
    emit: (p) => {
      const cases = String(p.cases).split('\n').map((l) => l.trim()).filter(Boolean)
        .map((l) => { const i = l.indexOf('='); return `    ${q(l.slice(0, i))} {\n${l.slice(i + 1).split(';').map((c) => `        ${c.trim()}`).filter(Boolean).join('\n')}\n    }` })
        .join('\n')
      return `switch ${p.wildcard ? '-Wildcard' : ''} (${p.var}) {\n${cases}\n    default {\n        ${p.def}\n    }\n}`
    },
    learn: 'switch en PS ejecuta TODAS las ramas que cumplan (no corta como C) salvo que pongas break. -Wildcard activa globs, -Regex regex, -CaseSensitive respeta mayúsculas (PS es case-insensitive por defecto).',
  },
  command: {
    label: 'Comando libre', icon: '⚡',
    desc: 'Cualquier cmdlet o pipeline crudo.',
    fields: [{ key: 'cmd', label: 'cmdlet / pipeline', area: true, def: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5' }],
    defaults: { cmd: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5' },
    emit: (p) => String(p.cmd).split('\n').map((l) => l.trim()).filter(Boolean).join('\n'),
    learn: 'El pipeline de PS pasa OBJETOS completos, no texto: Get-Process | Where CPU -gt 100 filtra por propiedad sin parsear strings. Es la diferencia clave con bash.',
  },
  pinghost: {
    label: 'Test-Connection (ping)', icon: '📡',
    desc: 'Ping con contador y manejo de fallos.',
    fields: [
      { key: 'host', label: 'host', def: '$Target' },
      { key: 'count', label: 'nº de pings', def: '2' },
      { key: 'quiet', label: 'modo -Quiet (true/false)', type: 'toggle', def: true },
    ],
    defaults: { host: '$Target', count: '2', quiet: true },
    emit: (p) => p.quiet
      ? `if (Test-Connection -ComputerName ${p.host} -Count ${p.count} -Quiet) {\n    Write-Host "[✓] ${p.host} responde"\n} else {\n    Write-Warning "${p.host} NO responde"\n}`
      : `Test-Connection -ComputerName ${p.host} -Count ${p.count} | Format-Table -AutoSize`,
    learn: 'Test-Connection -Quiet devuelve $true/$false: perfecto para ifs. Sin -Quiet devuelve objetos ICMP con latencia, TTL y buffer. En PS7 es Test-Connection con parámetros ligeramente distintos (usa -TargetName).',
  },
  portscan: {
    label: 'Test-NetConnection (puertos)', icon: '🔌',
    desc: 'Comprueba conectividad TCP a un puerto concreto con detalle.',
    fields: [
      { key: 'host', label: 'host', def: '$Target' },
      { key: 'port', label: 'puerto', def: '445' },
      { key: 'detail', label: 'mostrar detalle completo', type: 'toggle', def: false },
    ],
    defaults: { host: '$Target', port: '445', detail: false },
    emit: (p) => p.detail
      ? `Test-NetConnection -ComputerName ${p.host} -Port ${p.port} -InformationLevel Detailed`
      : `if (Test-NetConnection -ComputerName ${p.host} -Port ${p.port} -InformationLevel Quiet) {\n    Write-Host "[✓] ${p.host}:${p.port} abierto"\n} else {\n    Write-Warning "${p.host}:${p.port} cerrado/filtrado"\n}`,
    learn: 'Test-NetConnection es el nc de Windows: prueba puertos TCP, ping, traceroute (-TraceRoute) y DNS. -InformationLevel Quiet devuelve bool. Es LENTO (~1s/puerto): para escaneos grandes usa .NET TcpClient.',
  },
  servcheck: {
    label: 'Get-Service (servicios)', icon: '⚙️',
    desc: 'Consulta de servicios con filtro y estado.',
    fields: [
      { key: 'name', label: 'filtro de nombre (wildcard)', def: '*' },
      { key: 'state', label: 'estado', type: 'select', options: ['todos', 'Running', 'Stopped'], def: 'Running' },
    ],
    defaults: { name: '*', state: 'Running' },
    emit: (p) => {
      const where = p.state === 'todos' ? '' : ` | Where-Object Status -eq '${p.state}'`
      return `Get-Service${p.name !== '*' ? ` -Name "${p.name}"` : ''}${where} | Format-Table Name, Status, DisplayName -AutoSize`
    },
    learn: 'Get-Service devuelve objetos ServiceController: Status, DisplayName, ServiceType... Set-Service, Restart-Service y Stop-Process son la parte ofensiva/administrativa natural de este cmdlet.',
  },
  transcript: {
    label: 'Transcript (log de sesión)', icon: '🧾',
    desc: 'Graba TODO lo que ocurre en la consola a un fichero con timestamp.',
    fields: [
      { key: 'dir', label: 'directorio de logs', def: 'C:\\Temp\\Logs' },
      { key: 'stamp', label: 'timestamp en el nombre', type: 'toggle', def: true },
    ],
    defaults: { dir: 'C:\\Temp\\Logs', stamp: true },
    emit: (p) => {
      const name = p.stamp ? `$env:COMPUTERNAME-$(Get-Date -Format yyyyMMdd-HHmmss).log` : 'session.log'
      return `if (-not (Test-Path '${p.dir}')) { New-Item -ItemType Directory -Path '${p.dir}' | Out-Null }\nStart-Transcript -Path (Join-Path '${p.dir}' '${name}') -Append`
    },
    learn: 'Start-Transcript captura consola + objetos formateados: es el estándar de evidencia en administración y en blue team. Stop-Transcript al final (o se cierra solo al terminar el proceso).',
  },
  trycatch: {
    label: 'Try / Catch / Finally', icon: '🪤',
    desc: 'Manejo de errores real con finally para limpieza.',
    fields: [
      { key: 'try', label: 'código protegido', area: true, def: 'Write-Host "operación crítica"' },
      { key: 'catch', label: 'catch', area: true, def: 'Write-Warning "falló: $_"' },
      { key: 'finally', label: 'finally (limpieza, opcional)', area: true, def: '' },
    ],
    defaults: { try: 'Write-Host "operación crítica"', catch: 'Write-Warning "falló: $_"', finally: '' },
    emit: (p) => {
      const fin = p.finally ? `\nfinally {\n${String(p.finally).split('\n').map((l) => `    ${l}`).join('\n')}\n}` : ''
      return `try {\n${String(p.try).split('\n').map((l) => `    ${l}`).join('\n')}\n}\ncatch {\n${String(p.catch).split('\n').map((l) => `    ${l}`).join('\n')}\n}${fin}`
    },
    learn: 'try/catch SOLO captura con $ErrorActionPreference=Stop o -ErrorAction Stop en el cmdlet: si no, los errores son "non-terminating" y ni te enteras. $_ dentro de catch es el Exception.',
  },
  colors: {
    label: 'Funciones de log coloreado', icon: '🎨',
    desc: 'Write-Log con niveles Info/Ok/Warn/Err y timestamp.',
    fields: [{ key: 'withtime', label: 'timestamp', type: 'toggle', def: true }],
    defaults: { withtime: true },
    emit: (p) => {
      const ts = p.withtime ? '"[$(Get-Date -Format HH:mm:ss)] " + ' : ''
      return `function Write-Log {\n    param([string]$Message, [ValidateSet('Info','Ok','Warn','Err')][string]$Level = 'Info')\n    $color = @{ Info = 'Cyan'; Ok = 'Green'; Warn = 'Yellow'; Err = 'Red' }[$Level]\n    ${ts}Write-Host "[$Level] $Message" -ForegroundColor $color\n}`
    },
    learn: 'Hashtables como @{ Info = "Cyan" } son diccionarios: el index [$Level] elige color sin un switch gigante. ValidateSet en param() autodocumenta y valida los niveles permitidos.',
  },
}

export const PS_KIND_ORDER: PSBlockKind[] = [
  'header', 'strict', 'colors', 'param', 'var', 'array', 'readhost', 'testpath',
  'ifcond', 'foreach', 'while', 'func', 'switch', 'command', 'pinghost', 'portscan',
  'servcheck', 'transcript', 'trycatch',
]

export const PS_DEFAULT_SCRIPT: PSBlockKind[] = ['header', 'strict', 'param', 'colors', 'testpath', 'transcript']

export function buildPsScript(blocks: PSBlock[]): PSForgeResult {
  const warnings: string[] = []
  const parts: string[] = []
  for (const b of blocks) {
    const def = PS_BLOCK_DEFS[b.kind]
    if (!def) continue
    const w = def.warn?.(b.params)
    if (w) warnings.push(`${def.label}: ${w}`)
    parts.push(def.emit(b.params).trimEnd())
  }
  const script = parts.join('\n\n') + '\n'
  return { script, lines: script.split('\n').length, warnings }
}

export const newPsBlock = (kind: PSBlockKind, i: number): PSBlock => ({
  id: `${kind}-${Date.now()}-${i}`,
  kind,
  params: { ...PS_BLOCK_DEFS[kind].defaults },
})
