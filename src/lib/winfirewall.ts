/* Generador de reglas de Windows Defender Firewall vía netsh.
   Referencia: learn.microsoft.com netsh advfirewall, docs de seguridad MS. */

export type Dir = 'in' | 'out'
export type Action = 'allow' | 'block'
export type Proto = 'tcp' | 'udp' | 'any' | 'icmpv4' | 'icmpv6'

export interface FwRule {
  id: string
  name: string
  dir: Dir
  action: Action
  proto: Proto
  ports: string // '' = cualquiera, "80", "5000-5010", "80,443"
  program: string // '' = cualquier programa, si no ruta del exe
  remoteip: string // '' = cualquier, CIDR, "localsubnet", "10.0.0.0/8"
  profile: 'domain' | 'private' | 'public' | 'any'
}

export const FW_PRESETS: { label: string; desc: string; rule: Omit<FwRule, 'id'> }[] = [
  { label: 'servidor web solo en LAN', desc: 'abre 443/tcp únicamente a la subred local', rule: { name: 'Web LAN', dir: 'in', action: 'allow', proto: 'tcp', ports: '443', program: '', remoteip: 'localsubnet', profile: 'private' } },
  { label: 'bloquear salida SMB', desc: 'corta movimiento lateral por 445 (ransomware)', rule: { name: 'Block SMB out', dir: 'out', action: 'block', proto: 'tcp', ports: '445', program: '', remoteip: 'any', profile: 'any' } },
  { label: 'app solo en red privada', desc: 'permite un exe solo con perfil private/domain', rule: { name: 'MiApp LAN', dir: 'in', action: 'allow', proto: 'tcp', ports: '', program: 'C:\\Apps\\miapp.exe', remoteip: 'localsubnet', profile: 'private' } },
  { label: 'RDP restringido por IP', desc: '3389 solo desde la IP de administración', rule: { name: 'RDP admin', dir: 'in', action: 'allow', proto: 'tcp', ports: '3389', program: '', remoteip: '10.0.0.5', profile: 'any' } },
  { label: 'bloquear ping entrante (público)', desc: 'ICMPv4 solo en domain/private', rule: { name: 'Block ICMP pub', dir: 'in', action: 'block', proto: 'icmpv4', ports: '', program: '', remoteip: 'any', profile: 'public' } },
]

/** Genera el comando netsh de una regla. */
export function buildNetshRule(r: FwRule): string {
  const esc = (s: string) => s.replace(/"/g, '')
  const parts = [`netsh advfirewall firewall add rule name="${esc(r.name)}"`, `dir=${r.dir}`, `action=${r.action}`]
  if (r.proto !== 'any') parts.push(`protocol=${r.proto}`)
  if (r.ports.trim()) parts.push(`localport=${esc(r.ports.trim())}`)
  if (r.program.trim()) parts.push(`program="${esc(r.program.trim())}"`)
  if (r.remoteip.trim()) parts.push(`remoteip=${esc(r.remoteip.trim())}`)
  parts.push(`profile=${r.profile}`)
  return parts.join(' ')
}

/** Comando de borrado equivalente. */
export const removeRuleCmd = (name: string): string => `netsh advfirewall firewall delete rule name="${name.replace(/"/g, '')}"`

/** Validaciones de seguridad sobre la regla. */
export function fwWarnings(r: FwRule): { tone: 'bad' | 'warn' | 'ok'; text: string }[] {
  const w: { tone: 'bad' | 'warn' | 'ok'; text: string }[] = []
  if (r.action === 'allow' && r.dir === 'in' && r.profile === 'any' && !r.remoteip.trim()) {
    w.push({ tone: 'bad', text: 'allow entrante en todos los perfiles y desde cualquier IP: si es un puerto de servicio, restringe remoteip (localsubnet) y profile.' })
  }
  if (r.action === 'allow' && r.remoteip === 'any' && ['3389', '445', '135', '22'].some((p) => r.ports.includes(p))) {
    w.push({ tone: 'bad', text: 'puerto de administración (RDP/SMB/SSH/RPC) abierto a any: objetivo número 1 de ransomware y bots. Restringe por IP.' })
  }
  if (r.action === 'block' && r.dir === 'out' && ['445', '139', '135'].includes(r.ports.trim())) {
    w.push({ tone: 'ok', text: 'bloquear SMB/RPC saliente es un control anti-lateral excelente.' })
  }
  if (r.action === 'allow' && r.proto !== 'any' && r.ports.includes('-') && !r.program) {
    w.push({ tone: 'warn', text: 'rango amplio de puertos sin fijar programa: revisa que no sea más de lo que necesitas.' })
  }
  if (!w.length) w.push({ tone: 'ok', text: 'regla razonable: acción y alcance acordes a un mínimo privilegio.' })
  return w
}

/** Bloques de políticas generales recomendadas (set de "base"). */
export const FW_HARDENING_SNIPPETS: { title: string; cmd: string; desc: string }[] = [
  { title: 'activar por perfiles', cmd: 'netsh advfirewall set allprofiles state on', desc: 'enciende el firewall en domain/private/public' },
  { title: 'bloquear entrante por defecto', cmd: 'netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound', desc: 'deny-by-default entrante: la postura correcta' },
  { title: 'log de paquetes descartados', cmd: 'netsh advfirewall set allprofiles logging filename %systemroot%\\system32\\LogFiles\\Firewall\\pfirewall.log maxsizefile 4096 droppedconnections enable', desc: 'log local de drops (analizable con Get-WinEvent)' },
  { title: 'sin notificaciones al usuario', cmd: 'netsh advfirewall set allprofiles settings inboundusernotification disable', desc: 'evita que el usuario "permita" popups de apps desconocidas' },
  { title: 'ocultar reglas locales', cmd: 'netsh advfirewall set allprofiles settings inboundactionperprofile allow', desc: 'deja claro que GPO manda sobre reglas locales (en dominio)' },
  { title: 'exportar backup', cmd: 'netsh advfirewall export "C:\\backups\\fw-policy.wfw"', desc: 'backup de la política completa antes de tocar nada' },
]

export const FW_VERIFY = [
  ['netsh advfirewall show allprofiles', 'estado y policy de los tres perfiles'],
  ['netsh advfirewall firewall show rule name=all', 'vuelca todas las reglas'],
  ['Get-NetFirewallRule | Where DisplayName -like "*MiApp*" | Format-List', 'PowerShell: regla concreta con detalle'],
  ['Test-NetConnection host -Port 443', 'prueba si el puerto queda accesible tras aplicar'],
  ['Get-NetFirewallProfile | Select Name,Enabled,DefaultInboundAction', 'postura por perfil en PS'],
]
