/* Generador sshd_config endurecido. Referencia: man sshd_config(5),
   guías Mozilla OpenSSH, ssh-audit. */

export type SshGroup = 'basics' | 'auth' | 'crypto' | 'limits' | 'misc'

export interface SshOption {
  key: string
  value: string
  desc: string
  tone: 'ok' | 'info' | 'warn'
  groups: SshGroup[]
}

export const SSH_OPTIONS: SshOption[] = [
  // basics
  { key: 'Port', value: '22', desc: 'puerto de escucha. Cambiarlo NO añade seguridad real, solo reduce ruido de scanners.', tone: 'info', groups: ['basics'] },
  { key: 'AddressFamily', value: 'inet', desc: 'solo IPv4 (o "any" si usas IPv6).', tone: 'info', groups: ['basics'] },
  { key: 'ListenAddress', value: '', desc: 'IP concreta si tienes varias interfaces. Vacío = todas.', tone: 'info', groups: ['basics'] },
  { key: 'Protocol', value: '2', desc: 'SSH-2 únicamente (SSH-1 es historia).', tone: 'ok', groups: ['basics'] },
  // auth
  { key: 'PermitRootLogin', value: 'no', desc: 'root no entra por SSH: fuerza cuenta normal + su/sudo (auditable).', tone: 'ok', groups: ['auth'] },
  { key: 'PasswordAuthentication', value: 'no', desc: 'solo claves: mata fuerza bruta de raíz. Activa tras verificar TU clave.', tone: 'ok', groups: ['auth'] },
  { key: 'KbdInteractiveAuthentication', value: 'no', desc: 'sin PAM interactivo (desactiva 2FA por PAM si lo usabas).', tone: 'warn', groups: ['auth'] },
  { key: 'ChallengeResponseAuthentication', value: 'no', desc: 'alias legacy de la anterior (versiones viejas).', tone: 'info', groups: ['auth'] },
  { key: 'PubkeyAuthentication', value: 'yes', desc: 'login por clave pública.', tone: 'ok', groups: ['auth'] },
  { key: 'AuthenticationMethods', value: 'publickey', desc: 'fija el método exacto; "publickey,keyboard-interactive" haría 2FA.', tone: 'info', groups: ['auth'] },
  { key: 'PermitEmptyPasswords', value: 'no', desc: 'obvio pero se audita.', tone: 'ok', groups: ['auth'] },
  { key: 'MaxAuthTries', value: '3', desc: '3 intentos y corta conexión.', tone: 'ok', groups: ['auth'] },
  { key: 'MaxSessions', value: '5', desc: 'sesiones por conexión.', tone: 'info', groups: ['auth'] },
  { key: 'AllowUsers', value: '', desc: 'lista blanca de usuarios (ej. "deploy admin"). Vacío = todos.', tone: 'ok', groups: ['auth'] },
  { key: 'AllowGroups', value: 'ssh-users', desc: 'alternativa por grupo: crea el grupo y añade quién entra.', tone: 'ok', groups: ['auth'] },
  { key: 'LoginGraceTime', value: '30', desc: 'segundos para completar login.', tone: 'ok', groups: ['auth'] },
  { key: 'UsePAM', value: 'yes', desc: 'PAM para/account (necesario en Ubuntu; con "no" ciertas opciones se ignoran).', tone: 'info', groups: ['auth'] },
  // crypto
  { key: 'HostKeyAlgorithms', value: 'ssh-ed25519,ssh-ed25519-cert-v01@openssh.com,rsa-sha2-512,rsa-sha2-256', desc: 'ed25519 primero; RSA solo con SHA-2.', tone: 'ok', groups: ['crypto'] },
  { key: 'KexAlgorithms', value: 'sntrup761x25519-sha512@openssh.com,curve25519-sha256,curve25519-sha256@libssh.org', desc: 'key exchange moderno (sntrup = post-cuántico híbrido).', tone: 'ok', groups: ['crypto'] },
  { key: 'Ciphers', value: 'chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com', desc: 'AEAD only: nada de CBC ni 3DES.', tone: 'ok', groups: ['crypto'] },
  { key: 'MACs', value: 'hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com', desc: 'HMAC etm (encrypt-then-mac) de 256+ bits.', tone: 'ok', groups: ['crypto'] },
  { key: 'HostKey', value: '/etc/ssh/ssh_host_ed25519_key', desc: 'solo la clave de host ed25519 (borra las RSA viejas del server).', tone: 'info', groups: ['crypto'] },
  // limits
  { key: 'ClientAliveInterval', value: '300', desc: 'keepalive cada 5 min para no cortar sesiones por NAT.', tone: 'info', groups: ['limits'] },
  { key: 'ClientAliveCountMax', value: '2', desc: '2 fallos y cierra la sesión muerta.', tone: 'info', groups: ['limits'] },
  { key: 'MaxStartups', value: '10:30:60', desc: 'limita handshakes concurrentes (anti DoS de conexión).', tone: 'ok', groups: ['limits'] },
  { key: 'TCPKeepAlive', value: 'no', desc: 'usa los keepalives cifrados de SSH, no los TCP (spoofables).', tone: 'ok', groups: ['limits'] },
  // misc
  { key: 'X11Forwarding', value: 'no', desc: 'sin X remoto: superficie y riesgos de menos.', tone: 'ok', groups: ['misc'] },
  { key: 'AllowAgentForwarding', value: 'no', desc: 'sin forwarding del ssh-agent (robo de claves vía socket).', tone: 'ok', groups: ['misc'] },
  { key: 'AllowTcpForwarding', value: 'no', desc: 'sin túneles TCP: si el usuario no los necesita, ciérralo.', tone: 'warn', groups: ['misc'] },
  { key: 'PermitTunnel', value: 'no', desc: 'sin interfaces tun.', tone: 'info', groups: ['misc'] },
  { key: 'Banner', value: '/etc/issue.net', desc: 'banner legal "acceso solo autorizado" (útil judicialmente).', tone: 'info', groups: ['misc'] },
  { key: 'LogLevel', value: 'VERBOSE', desc: 'loguea la huella de la clave usada: oro para forense.', tone: 'ok', groups: ['misc'] },
  { key: 'Subsystem', value: 'sftp internal-sftp', desc: 'SFTP interno (no requiere binario externo).', tone: 'info', groups: ['misc'] },
  { key: 'ForceCommand', value: '', desc: 'fija el único comando posible (para cuentas de backup: "internal-sftp").', tone: 'info', groups: ['misc'] },
  { key: 'ChrootDirectory', value: '', desc: 'jaula chroot para usuarios cautivos (ej. /srv/sftp/%u).', tone: 'info', groups: ['misc'] },
]

export const SSH_PROFILES: { id: string; label: string; desc: string; values: Record<string, string> }[] = [
  {
    id: 'paranoico',
    label: 'paranoico (solo claves)',
    desc: 'máximo endurecimiento para servidores expuestos',
    values: { Port: '22', PermitRootLogin: 'no', PasswordAuthentication: 'no', PubkeyAuthentication: 'yes', MaxAuthTries: '2', AllowGroups: 'ssh-users', X11Forwarding: 'no', AllowAgentForwarding: 'no', AllowTcpForwarding: 'no', LogLevel: 'VERBOSE' },
  },
  {
    id: 'server',
    label: 'servidor equilibrado',
    desc: 'claves + root no, pero túneles y agente permitidos para operar',
    values: { Port: '22', PermitRootLogin: 'no', PasswordAuthentication: 'no', PubkeyAuthentication: 'yes', MaxAuthTries: '4', AllowTcpForwarding: 'yes', AllowAgentForwarding: 'yes', X11Forwarding: 'no', LogLevel: 'VERBOSE' },
  },
  {
    id: 'desarrollo',
    label: 'VM de desarrollo',
    desc: 'cómodo: claves o contraseña, forwarding abierto, red local',
    values: { Port: '22', PermitRootLogin: 'no', PasswordAuthentication: 'yes', PubkeyAuthentication: 'yes', AllowTcpForwarding: 'yes', AllowAgentForwarding: 'yes', X11Forwarding: 'yes', LogLevel: 'INFO' },
  },
  {
    id: 'sftp-cautivo',
    label: 'SFTP cautivo',
    desc: 'usuario enjaulado que solo puede subir ficheros',
    values: { PermitRootLogin: 'no', PasswordAuthentication: 'no', ForceCommand: 'internal-sftp', ChrootDirectory: '/srv/sftp/%u', AllowTcpForwarding: 'no', X11Forwarding: 'no', AllowAgentForwarding: 'no' },
  },
]

/** Construye el sshd_config final a partir de {key: value} activos. */
export function buildSshdConfig(active: Record<string, string>): string {
  const lines = [
    '# /etc/ssh/sshd_config.d/99-hacknexus.conf (o sustituye sshd_config)',
    '# probar antes: sshd -t   ·   recargar: systemctl reload sshd',
    '',
  ]
  for (const opt of SSH_OPTIONS) {
    const v = active[opt.key]
    if (v === undefined || v === '') continue
    lines.push(`${opt.key} ${v}`)
  }
  lines.push('', '# verificar desde OTRA terminal antes de cerrar la sesión actual')
  return lines.join('\n') + '\n'
}

export const SSH_VERIFY = [
  ['sshd -t', 'valida la sintaxis del config (como nginx -t)'],
  ['sshd -T | grep -i passwordauth', 'config efectiva tras includes (sshd -T vuelca todo)'],
  ['systemctl reload sshd', 'recarga sin cortar sesiones activas'],
  ['ssh-audit localhost', 'auditoría externa de cifrados/kex (paquete o pip)'],
  ['nmap --script ssh2-enum-algos -p22 host', 'algoritmos que ofrece el server desde fuera'],
  ['ssh -Q cipher', 'cifrados que soporta TU cliente'],
]
