/* Generador de permisos NTFS (icacls): build de comandos, traducción simple
   Linux↔Windows y tarjetas de ACE. Referencia: icacls /?, learn.microsoft.com */

export type AclRight = 'F' | 'M' | 'RX' | 'R' | 'W' | 'D' | 'WDAC' | 'WO' | 'X' | 'DE'
export type AclInherit = 'OI' | 'CI' | 'IO' | 'NP'
export type AclType = 'grant' | 'deny'

export interface Ace {
  type: AclType
  principal: string
  right: AclRight
  inherit: AclInherit[]
}

export interface IcaclsOpts {
  path: string
  recursive: boolean
  resetInheritance: boolean // /inheritance:r
  disableInheritanceKeep: boolean // /inheritance:d
  aces: Ace[]
}

export const RIGHT_INFO: Record<AclRight, { label: string; desc: string; octalLike: string }> = {
  F: { label: 'Full control', desc: 'control total: todo + cambiar permisos y dueño', octalLike: 'rwx + permisos' },
  M: { label: 'Modify', desc: 'leer, escribir, borrar (no cambia permisos)', octalLike: '~770' },
  RX: { label: 'Read & execute', desc: 'leer y ejecutar, sin escribir', octalLike: '~550' },
  R: { label: 'Read-only', desc: 'solo lectura de datos', octalLike: '~440' },
  W: { label: 'Write-only', desc: 'escribir sin leer (raro, útil en drop folders)', octalLike: '~220' },
  D: { label: 'Delete', desc: 'permiso de borrado específico', octalLike: '-' },
  WDAC: { label: 'Write DAC', desc: 'cambiar permisos (equivale a ser dueño casi)', octalLike: '-' },
  WO: { label: 'Write owner', desc: 'tomar propiedad', octalLike: '-' },
  X: { label: 'Traverse/execute', desc: 'atravesar carpetas / ejecutar', octalLike: '~110' },
  DE: { label: 'Delete child', desc: 'borrar contenidos de carpeta', octalLike: '-' },
}

export const INHERIT_INFO: Record<AclInherit, string> = {
  OI: 'Object inherit — lo heredan ficheros',
  CI: 'Container inherit — lo heredan carpetas',
  IO: 'Inherit only — la ACE no aplica a esta carpeta, solo a hijos',
  NP: 'No propagate — hereda 1 nivel, no más profundo',
}

export const PRINCIPALS = [
  'Administradores', 'SYSTEM', 'Usuarios', 'Usuarios autenticados', 'Invitados', 'Everyone',
  'DOM\\Grupo-IT', 'DOM\\jefe.del.mundo', 'IIS_IUSRS', 'NETWORK SERVICE',
]

export const ACE_PRESETS: { label: string; desc: string; aces: Ace[]; path: string }[] = [
  {
    label: 'carpeta compartida de equipo',
    desc: 'usuarios autenticados modifican, invitados nada',
    path: 'C:\\Compartido\\Equipo',
    aces: [
      { type: 'grant', principal: 'Usuarios autenticados', right: 'M', inherit: ['OI', 'CI'] },
      { type: 'grant', principal: 'SYSTEM', right: 'F', inherit: ['OI', 'CI'] },
      { type: 'grant', principal: 'Administradores', right: 'F', inherit: ['OI', 'CI'] },
    ],
  },
  {
    label: 'web root estilo IIS',
    desc: 'IIS_IUSRS lee y ejecuta, sin escribir',
    path: 'C:\\inetpub\\miweb',
    aces: [
      { type: 'grant', principal: 'IIS_IUSRS', right: 'RX', inherit: ['OI', 'CI'] },
      { type: 'grant', principal: 'Administradores', right: 'F', inherit: ['OI', 'CI'] },
    ],
  },
  {
    label: 'drop folder (solo escribir)',
    desc: 'dejar ficheros sin leer los de otros (SFTP-like)',
    path: 'C:\\Drop',
    aces: [
      { type: 'grant', principal: 'Usuarios', right: 'W', inherit: ['OI', 'CI'] },
      { type: 'grant', principal: 'Administradores', right: 'F', inherit: ['OI', 'CI'] },
    ],
  },
  {
    label: '⚠ mundo escribible (antipatrón)',
    desc: 'para demostrar por qué es peligroso',
    path: 'C:\\Publico',
    aces: [
      { type: 'grant', principal: 'Everyone', right: 'F', inherit: ['OI', 'CI'] },
    ],
  },
]

export function buildIcaclsCommands(o: IcaclsOpts): string[] {
  const p = o.path.trim() || 'C:\\ruta'
  const cmds: string[] = []
  if (o.resetInheritance) cmds.push(`icacls "${p}" /inheritance:r`)
  if (o.disableInheritanceKeep) cmds.push(`icacls "${p}" /inheritance:d`)
  for (const a of o.aces) {
    const inh = a.inherit.length ? `(${a.inherit.join('')})` : ''
    const scope = o.recursive ? ' /t' : ''
    const kind = a.type === 'grant' ? 'grant' : 'deny'
    if (a.type === 'grant' && (a.right === 'F' || a.right === 'M') && a.inherit.includes('OI') && a.inherit.includes('CI') && o.recursive) {
      cmds.push(`icacls "${p}" /${kind}:r "${a.principal}:${inh}${a.right === 'F' ? 'F' : 'M'}" /t /c`)
    } else {
      cmds.push(`icacls "${p}" /${kind} "${a.principal}:${inh}${a.right}"${scope} /c`)
    }
  }
  if (!cmds.length) cmds.push(`icacls "${p}"  # solo ver ACL actual`)
  return cmds
}

export function aclSummary(o: IcaclsOpts): { tone: 'ok' | 'warn' | 'bad'; text: string }[] {
  const out: { tone: 'ok' | 'warn' | 'bad'; text: string }[] = []
  const weak = o.aces.filter((a) => a.type === 'grant' && (a.right === 'F' || a.right === 'WDAC') && /everyone|invitados|usuarios$/i.test(a.principal))
  if (weak.length) out.push({ tone: 'bad', text: `Control total para grupos amplios (${weak.map((w) => w.principal).join(', ')}): cualquier usuario o proceso puede reemplazar binarios → privesc local.` })
  const writeW = o.aces.filter((a) => a.type === 'grant' && (a.right === 'W' || a.right === 'M' || a.right === 'F') && /everyone|invitados/i.test(a.principal))
  if (writeW.length && !weak.length) out.push({ tone: 'warn', text: 'Escritura para Everyone/Invitados: planta de ficheros y troyanización de carpetas compartidas.' })
  if (o.disableInheritanceKeep) out.push({ tone: 'warn', text: 'Herencia deshabilitada: la carpeta queda aislada del padre; documenta por qué o el hardening se degrada.' })
  if (o.aces.some((a) => a.type === 'deny')) out.push({ tone: 'warn', text: 'ACEs de denegación: se evalúan antes que las de concesión; úsalas con moderación (rompen herencias de forma confusa).' })
  if (!out.length) out.push({ tone: 'ok', text: 'Combinación razonable: sin full-control para grupos amplios y herencia controlada.' })
  return out
}

/* ── traducción Linux ↔ Windows ── */
export interface EquivRow { octal: string; linux: string; icacls: string; note: string }
export const EQUIV_PERMS: EquivRow[] = [
  { octal: '700', linux: 'chmod 700 privado', icacls: 'icacls "C:\\privado" /inheritance:r /grant:r "%USERNAME%:F"', note: 'solo el dueño' },
  { octal: '755', linux: 'chmod 755 script.sh', icacls: 'icacls "C:\\app" /grant:r "Usuarios:(RX)" /grant:r "%USERNAME%:F"', note: 'dueño escribe, resto lee' },
  { octal: '644', linux: 'chmod 644 config.conf', icacls: 'icacls config.conf /grant:r "Usuarios:R" /grant:r "%USERNAME%:F"', note: 'fichero de config típico' },
  { octal: '770', linux: 'chmod 770 compartido', icacls: 'icacls "C:\\comp" /inheritance:r /grant:r "DOM\\equipo:(OI)(CI)M" /grant:r "SYSTEM:(OI)(CI)F"', note: 'grupo escribe, otros nada' },
  { octal: '777', linux: 'chmod 777 (¡nunca!)', icacls: 'icacls "C:\\pub" /grant Everyone:F', note: 'mundo escribible en ambos' },
  { octal: '4755', linux: 'chmod 4755 bin (SUID)', icacls: 'no existe SUID: usa servicios o Scheduled Tasks con cuenta de servicio', note: 'escalada en Linux; en Windows el equivalente es un servicio corriendo como SYSTEM/usuario' },
  { octal: '1777', linux: 'chmod 1777 /tmp (sticky)', icacls: 'carpeta con "Delete child" quitado + Write para Usuarios', note: 'todos escriben, solo el dueño borra' },
]

/* chown equivalences */
export const CHOWN_EQUIV: { linux: string; win: string; desc: string }[] = [
  { linux: 'chown user fichero', win: 'icacls fichero /setowner user', desc: 'Cambiar propietario' },
  { linux: 'chgrp grupo fichero', win: 'no hay concepto idéntico: ACLs por grupo', desc: 'Cambiar grupo' },
  { linux: 'getfacl fichero', win: 'icacls fichero  ·  Get-Acl fichero | fl', desc: 'Ver ACL' },
  { linux: 'setfacl -m u:dev:rx f', win: 'icacls f /grant dev:(RX)', desc: 'Añadir ACE' },
  { linux: 'setfacl -x u:dev f', win: 'icacls f /remove dev', desc: 'Quitar ACE' },
  { linux: 'setfacl -b f', win: 'icacls f /reset', desc: 'Reset a herencia' },
  { linux: 'umask (proceso)', win: 'no existe: heredan del padre o ACL del share', desc: 'Permisos por defecto' },
  { linux: 'ls -la', win: 'icacls . · Get-ChildItem | Get-Acl', desc: 'Listar permisos' },
]
