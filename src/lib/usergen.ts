/* Generador de usuarios: variaciones de nombres/emails corporativos
   para enumeración (AS-REP, spraying, OWA, SMB) en auditorías autorizadas. */

export interface NamePair { first: string; last: string }

export const EMAIL_CONVENTIONS: { id: string; label: string; example: string }[] = [
  { id: 'flast', label: 'nombre.apellido', example: 'john.smith' },
  { id: 'flast', label: 'inicial+apellido', example: 'jsmith' },
  { id: 'first', label: 'solo nombre', example: 'john' },
  { id: 'lastf', label: 'apellido.inicial', example: 'smith.j' },
  { id: 'last', label: 'solo apellido', example: 'smith' },
  { id: 'firstlast', label: 'nombreapellido', example: 'johnsmith' },
  { id: 'f_last', label: 'inicial_apellido', example: 'j_smith' },
  { id: 'first.l', label: 'nombre.inicial_ape', example: 'john.s' },
  { id: 'fl', label: 'dos iniciales', example: 'js' },
]

/** Genera el combo username + email según cada convención. */
export function userVariants(names: NamePair[], domain: string, opts?: { stripAccents?: boolean }): { user: string; email: string; convention: string }[] {
  const out: { user: string; email: string; convention: string }[] = []
  const seen = new Set<string>()
  const clean = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  for (const { first, last } of names) {
    const f = clean(first), l = clean(last)
    if (!f || !l) continue
    const cands: [string, string][] = [
      [`${f}.${l}`, 'nombre.apellido'],
      [`${f[0]}${l}`, 'inicial+apellido'],
      [`${f}`, 'solo nombre'],
      [`${l}.${f[0]}`, 'apellido.inicial'],
      [`${l}`, 'solo apellido'],
      [`${f}${l}`, 'nombreapellido'],
      [`${f[0]}_${l}`, 'inicial_apellido'],
      [`${f}.${l[0]}`, 'nombre.inicial_ape'],
      [`${f[0]}${l[0]}`, 'dos iniciales'],
      [`${f[0]}${l}`, 'inicial+apellido (dup)'],
    ]
    for (const [user, conv] of cands) {
      if (seen.has(user)) continue
      seen.add(user)
      out.push({ user, email: `${user}@${domain || 'empresa.com'}`, convention: conv })
    }
  }
  return out
}

/** Genera cuentas de servicio comunes para añadir a la lista. */
export const SERVICE_ACCOUNTS = [
  'admin', 'administrator', 'svc-backup', 'svc_sql', 'sa', 'webadmin',
  'it-support', 'helpdesk', 'rrhh', 'auditoria', 'backup', 'test',
  'guest', 'ftpuser', 'postgres', 'mysql', 'apache', 'nginx',
]

/** Lista final mezclando convenciones + cuentas de servicio, deduplicada. */
export function buildUserList(names: NamePair[], domain: string, includeServices: boolean, extraDomains: string[]): { users: string[]; emails: string[] } {
  const v = userVariants(names, domain)
  const users = v.map((x) => x.user)
  if (includeServices) users.push(...SERVICE_ACCOUNTS)
  for (const d of extraDomains) {
    users.push(...userVariants(names, d).map((x) => x.user.split('@')[0]))
  }
  const emails = v.map((x) => x.email)
  return { users: [...new Set(users)].filter(Boolean), emails: [...new Set(emails)] }
}

export const USERGEN_USE: [string, string][] = [
  ['enumeración SMB sin creds', 'nmap -p445 --script smb-enum-users TARGET (si anonymous está abierto) · crackmapexec smb TARGET -u users.txt -p "" --users'],
  ['kerbrute (sin bloqueos)', 'kerbrute userenum --dc DC.empresa.com -d empresa.com users.txt — NO bloquea cuentas a diferencia de spraying'],
  ['AS-REP Roasting', 'GetNPUsers.py empresa.com/ -usersfile users.txt -no-pass — usuarios sin preauth saltan'],
  ['password spraying con cuidado', 'spray.sh -u users.txt -p Empresa2024! --attempt 1 --lockout 5 (1 intento por cuenta, respeta el lockout)'],
  ['OWA / Microsoft 365', 'MailSniper.ps1 Get-MailboxPermissions / owa-spray con los emails generados'],
  ['valida emails sin tocar AD', 'linkedin2username para contrastar con org real · theHarvester -d empresa.com -b all'],
]

export const USERGEN_NOTES: string[] = [
  'La convención real se descubre: LinkedIn, firmas de email, o un email filtrado en un dork (site:empresa.com intext:@).',
  'Password spraying necesita nombres, NO emails, en AD; OWA/M365 necesita emails completos. Esta tool genera ambos.',
  'Spraying = 1 password contra MUCHAS cuentas a deshoras: NUNCA muchas passwords contra una cuenta (lockout + ruido).',
  'Los service accounts incluidos son los que SIEMPRE existen y a veces tienen contraseñas de proyecto (svc_*, backup…).',
  'Solo sobre empresas con autorización escrita: la enumeración de usuarios es el primer paso de un pentest, no un juego.',
]
