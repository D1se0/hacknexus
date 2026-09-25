/* Referencia de Event IDs de Windows Security log: qué significan y cómo
   usarlos para detectar ataques (o justificar alertas en un informe). */

export interface WinEvent {
  id: number
  log: string
  name: string
  attack: string
  detect: string
  category: 'logon' | 'account' | 'priv' | 'policy' | 'audit-clear' | 'other'
}

export const WIN_EVENTS: WinEvent[] = [
  { id: 4624, log: 'Security', name: 'Inicio de sesión correcto', attack: 'El atacante genera miles al moverse lateralmente; el Logon Type revela cómo (2=consola, 3=red, 10=RDP)', detect: 'Baseline por usuario/hora: logins fuera de horario o de IPs nuevas', category: 'logon' },
  { id: 4625, log: 'Security', name: 'Inicio de sesión FALLIDO', attack: 'Fuerza bruta: cientos en minutos desde una IP', detect: '>5 fallos/min por usuario o IP → alerta de spraying', category: 'logon' },
  { id: 4634, log: 'Security', name: 'Cierre de sesión', attack: 'Poca utilidad ofensiva; sirve para correlacionar duración', detect: 'Sesiones muy cortas masivas = scanning con credenciales', category: 'logon' },
  { id: 4648, log: 'Security', name: 'Logon con credenciales explícitas', attack: 'runas /net use / scheduled tasks con usuario concreto: lateral movement', detect: 'Revisar procesos origen: malware usa runas para escalar', category: 'logon' },
  { id: 4672, log: 'Security', name: 'Privilegios especiales asignados', attack: 'Cada login de admin (SeDebug, SeImpersonate…): dump de LSASS lo precede', detect: 'Correlacionar 4672 + 4688 de procesos raros (procdump, rundll32)', category: 'priv' },
  { id: 4688, log: 'Security', name: 'Proceso creado', attack: 'Cada ejecución deja rastro: whoami, net user, certutil…', detect: 'Cazadores: powershell -enc, certutil -urlcache, reg add …Run', category: 'other' },
  { id: 4697, log: 'Security', name: 'Servicio instalado', attack: 'Persistencia clásica: PsExec crea "PSEXESVC", otros crean servicios custom', detect: 'Servicios nuevos fuera de ventanas de deploy', category: 'other' },
  { id: 4698, log: 'Security', name: 'Tarea programada creada', attack: 'Persistencia por schtasks (Mitre T1053)', detect: 'Tareas que ejecutan de %TEMP%, AppData o rutas sin firmar', category: 'other' },
  { id: 4702, log: 'Security', name: 'Tarea programada ACTUALIZADA', attack: 'Táctica sigilosa: modificar una tarea legítima en vez de crear una', detect: 'Diff de actions de tareas conocidas', category: 'other' },
  { id: 4720, log: 'Security', name: 'Cuenta de usuario creada', attack: 'Persistencia de acceso: usuario nuevo (a veces oculto con $)', detect: 'Nombres que terminan en $ o creados a deshoras', category: 'account' },
  { id: 4722, log: 'Security', name: 'Cuenta habilitada', attack: 'Reactivar cuentas dormidas para pasar desapercibido', detect: 'Cuentas que llevaban años deshabilitadas', category: 'account' },
  { id: 4724, log: 'Security', name: 'Restablecimiento de contraseña', attack: 'Secuestro de cuentas (helpdesk abusado, DCSync aftermath)', detect: 'Resets de cuentas privilegiadas fuera de proceso formal', category: 'account' },
  { id: 4726, log: 'Security', name: 'Cuenta eliminada', attack: 'Anti-forense: borrar rastros de cuenta temporal', detect: 'Cualquier borrado en dominios es raro → alertar', category: 'account' },
  { id: 4728, log: 'Security', name: 'Miembro añadido a grupo de SEGURIDAD global', attack: 'Añadirse a "Domain Admins" tras DCSync o abuso de delegación', detect: 'Cambios en grupos de admin → alerta crítica inmediata', category: 'account' },
  { id: 4732, log: 'Security', name: 'Miembro añadido a grupo LOCAL', attack: 'Persistencia en el equipo: añadirse a Administradores local', detect: 'Monitorear grupos Administradores/Remote Desktop Users', category: 'account' },
  { id: 4740, log: 'Security', name: 'Cuenta BLOQUEADA', attack: 'Efecto de un brute force agresivo (o DoS de cuentas)', detect: 'Lockouts en cascada = spraying en curso', category: 'logon' },
  { id: 4768, log: 'Security', name: 'TGT solicitado (Kerberos)', attack: 'Pre-auth desactivada → AS-REP Roasting pide TGT sin cifrar', detect: 'RC4 (0x17) en etype de tickets = sospechoso', category: 'other' },
  { id: 4769, log: 'Security', name: 'TGS solicitado (Kerberos)', attack: 'Kerberoasting: pide TGS de TODAS las SPNs para crackear offline', detect: 'Muchos 4769 de un solo usuario con RC4 en minutos', category: 'other' },
  { id: 4776, log: 'Security', name: 'Validación de credenciales (NTLM)', attack: 'Pass-the-Hash usa NTLM; relay hacia SMB/LDAP', detect: 'NTLM en redes que deberían ser solo Kerberos', category: 'logon' },
  { id: 5140, log: 'Security', name: 'Acceso a objeto de red (share)', attack: 'Lateral movement: acceso a ADMIN$ y C$ para PsExec', detect: 'Conexiones a ADMIN$ de estaciones de trabajo', category: 'other' },
  { id: 5145, log: 'Security', name: 'Comprobación de acceso a share', attack: 'Recon SMB: enumerar shares sin abrirlos (crackmapexec --shares)', detect: 'Muchos 5145 con fallo de un host a muchos shares', category: 'other' },
  { id: 1102, log: 'Security', name: 'Registro de auditoría BORRADO', attack: 'Anti-forense clásico: wevtutil cl Security o GUI', detect: 'ALERTA MÁXIMA: nadie limpia el log legítimamente en producción', category: 'audit-clear' },
  { id: 4719, log: 'Security', name: 'Política de auditoría del sistema CAMBIADA', attack: 'Apagar la auditoría antes de actuar (cambia auditpol)', detect: 'Cambios que reducen categorías auditadas', category: 'policy' },
  { id: 4738, log: 'Security', name: 'Cuenta de usuario modificada', attack: 'Set SPN en cuenta = Kerberoastable; desactivar pre-auth = AS-REP', detect: 'Diff de atributos userAccountControl', category: 'account' },
  { id: 5136, log: 'Security', name: 'Objeto de directorio MODIFICADO', attack: 'AdminSDHolder, delegación maliciosa (msDS-AllowedToActOnBehalfOfOtherIdentity)', detect: 'Cambios en OU de usuarios privilegiados o GPO de delegación', category: 'other' },
  { id: 5141, log: 'Security', name: 'Objeto de directorio BORRADO', attack: 'Borrar máquinas/cuentas para romper trazabilidad', detect: 'Borrados en OU sensibles', category: 'other' },
  { id: 7045, log: 'System', name: 'Nuevo servicio instalado en el sistema', attack: 'Persistencia y lateral movement (PsExec crea servicios)', detect: 'Servicios con ImagePath en %TEMP%, rutas sin firmar o nombres aleatorios', category: 'other' },
  { id: 1105, log: 'Application', name: 'Registro de eventos borrado (App)', attack: 'Anti-forense menor', detect: 'Eventos de "log cleared" en cualquier log', category: 'audit-clear' },
]

export const EVENT_CATEGORIES: { key: WinEvent['category'] | 'all'; label: string }[] = [
  { key: 'all', label: 'todos' },
  { key: 'logon', label: 'logins' },
  { key: 'account', label: 'cuentas y grupos' },
  { key: 'priv', label: 'privilegios' },
  { key: 'policy', label: 'política' },
  { key: 'audit-clear', label: 'borrado de logs' },
  { key: 'other', label: 'otros' },
]

export function searchEvents(q: string): WinEvent[] {
  const s = q.trim().toLowerCase()
  if (!s) return WIN_EVENTS
  const n = Number(s)
  return WIN_EVENTS.filter((e) =>
    (Number.isFinite(n) && e.id === n) ||
    e.name.toLowerCase().includes(s) ||
    e.attack.toLowerCase().includes(s) ||
    e.detect.toLowerCase().includes(s),
  )
}
