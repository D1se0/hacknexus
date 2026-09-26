/* /etc/fstab: validador y generador. Referencia: man fstab(5), systemd.mount(5). */

export interface FstabEntry {
  id: string
  spec: string // dispositivo (UUID=, /dev/, LABEL=, URL nfs/cifs)
  mount: string // punto de montaje
  fs: string // tipo (ext4, btrfs, xfs, nfs4, cifs, vfat, ntfs3, swap, tmpfs…)
  options: string[] // opciones separadas por coma
  dump: boolean // respalda dump(8)
  fsckPass: number // 0 = no chequear, 1 = primero, 2+ = en paralelo después
}

export const FS_TYPES = ['ext4', 'btrfs', 'xfs', 'f2fs', 'vfat', 'exfat', 'ntfs3', 'swap', 'tmpfs', 'nfs4', 'cifs', 'sshfs', 'bind', 'auto'] as const

/** Opciones comunes y qué significan (con matiz de seguridad). */
export const OPTION_INFO: Record<string, { desc: string; tone: 'ok' | 'info' | 'warn' | 'bad' }> = {
  defaults: { desc: 'rw, suid, dev, exec, auto, nouser, async — cómodo pero amplio', tone: 'warn' },
  noexec: { desc: 'prohibe ejecutar binarios montados: clave en /tmp, /home y shares', tone: 'ok' },
  nosuid: { desc: 'ignora bits SUID/SGID: evita privesc vía binarios del mount', tone: 'ok' },
  nodev: { desc: 'sin dispositivos de bloques: evita /dev maliciosos en shares', tone: 'ok' },
  ro: { desc: 'solo lectura: inmune a troyanización', tone: 'ok' },
  rw: { desc: 'lectura-escritura (por defecto)', tone: 'info' },
  user: { desc: 'cualquier usuario puede montar (implícita noexec,nosuid,nodev)', tone: 'info' },
  users: { desc: 'como user pero cualquiera puede desmontar', tone: 'info' },
  noauto: { desc: 'no se monta al arrancar (montaje bajo demanda)', tone: 'info' },
  auto: { desc: 'se monta al arrancar', tone: 'info' },
  nofail: { desc: 'no bloquea el boot si el dispositivo falta (imprescindible en remotos)', tone: 'ok' },
  'x-systemd.device-timeout': { desc: 'tiempo máximo esperando al dispositivo antes de rendirse', tone: 'info' },
  umask: { desc: 'máscara de permisos en FAT/exFAT/NTFS (ej. umask=077 = solo dueño)', tone: 'info' },
  uid: { desc: 'dueño de los ficheros en filesystems sin permisos (vfat, ntfs3)', tone: 'info' },
  gid: { desc: 'grupo de los ficheros en filesystems sin permisos', tone: 'info' },
  _netdev: { desc: 'el mount depende de la red: se monta al activarse network-online', tone: 'info' },
  credentials: { desc: 'fichero 600 con user/password/dominio para CIFS — NUNCA inline', tone: 'info' },
  'sec=krb5i': { desc: 'CIFS con Kerberos + integridad: alternativa sin contraseñas', tone: 'ok' },
  'vers=3.1.1': { desc: 'negocia SMB3.1.1 (evita SMB1 inseguro)', tone: 'ok' },
  'vers=1.0': { desc: 'SMB1: protocolo legacy inseguro (EternalBlue y compañía)', tone: 'bad' },
  hard: { desc: 'NFS: el cliente se queda colgado si el server no responde', tone: 'warn' },
  soft: { desc: 'NFS: falla la operación si el server no responde (riesgo de datos)', tone: 'warn' },
  noatime: { desc: 'no actualizar el acceso: menos escrituras en SSDs y USB', tone: 'info' },
  'compress=zstd': { desc: 'compresión transparente en btrfs', tone: 'info' },
  ssd: { desc: 'optimización btrfs para SSDs', tone: 'info' },
  subvol: { desc: 'subvolumen btrfs concreto a montar', tone: 'info' },
  'x-gvfs-show': { desc: 'mostrar en el navegador de ficheros del escritorio', tone: 'info' },
}

/** Presets por caso de uso (campos spec/mount se completan en la UI). */
export const FSTAB_PRESETS: { label: string; desc: string; fs: string; options: string[]; fsckPass: number }[] = [
  { label: '/tmp volátil y blindado', desc: 'tmpfs en RAM, noexec+nosuid+nodev: nada persiste ni se ejecuta', fs: 'tmpfs', options: ['rw', 'nosuid', 'noexec', 'nodev', 'mode=1777'], fsckPass: 0 },
  { label: 'share SMB corporativo', desc: 'CIFS seguro: credenciales en fichero 600, SMB3, sin suid/exec', fs: 'cifs', options: ['credentials=/etc/samba/creds', 'vers=3.1.1', 'sec=ntlmssp', 'nosuid', 'noexec', '_netdev', 'nofail', 'uid=1000'], fsckPass: 0 },
  { label: 'NFS de red', desc: 'nfs4 con hard y nofail: cuelga mejor que fallar silencioso', fs: 'nfs4', options: ['rw', 'hard', 'nofail', '_netdev', 'noatime'], fsckPass: 0 },
  { label: 'USB extraíble', desc: 'vfat con umask 077: solo tu usuario lee/escribe', fs: 'vfat', options: ['rw', 'umask=077', 'uid=1000', 'noexec', 'nofail'], fsckPass: 0 },
  { label: 'partición Windows (ntfs3)', desc: 'driver kernel ntfs3 con permisos mínimos', fs: 'ntfs3', options: ['rw', 'uid=1000', 'gid=1000', 'umask=022', 'nofail'], fsckPass: 0 },
  { label: 'home reforzada', desc: 'ext4 sin suid ni devices: anti-privesc doméstico', fs: 'ext4', options: ['rw', 'nosuid', 'nodev'], fsckPass: 2 },
  { label: 'swap cifrado (aleatorio)', desc: 'swap sobre /dev/random: imposible reconstruir sesiones', fs: 'swap', options: ['sw', 'x-systemd.device-timeout=5s'], fsckPass: 0 },
]

/** Avisos sobre el conjunto de opciones elegidas. */
export function fstabWarnings(e: FstabEntry): { tone: 'bad' | 'warn' | 'ok' | 'info'; text: string }[] {
  const w: { tone: 'bad' | 'warn' | 'ok' | 'info'; text: string }[] = []
  const o = e.options
  const has = (s: string) => o.some((x) => x === s || x.startsWith(s + '=') || x.startsWith(s))
  const remote = ['cifs', 'nfs4', 'nfs', 'sshfs'].includes(e.fs)

  if (e.fs === 'cifs' && o.some((x) => /password=/.test(x))) w.push({ tone: 'bad', text: 'password= en fstab es world-readable (fstab es 644). Usa credentials=/ruta/fichero con permisos 600.' })
  if (e.fs === 'cifs' && !o.some((x) => x.startsWith('vers='))) w.push({ tone: 'warn', text: 'sin vers=: el kernel puede negociar SMB1. Fija vers=3.1.1.' })
  if (remote && !has('_netdev')) w.push({ tone: 'warn', text: 'mount remoto sin _netdev: intentará montarse antes de la red y ralentizará el boot.' })
  if (remote && !has('nofail')) w.push({ tone: 'warn', text: 'sin nofail: si el server cae, el boot se queda esperando (90s+).' })
  if (e.mount === '/tmp' && !has('noexec')) w.push({ tone: 'bad', text: '/tmp sin noexec: lugar clásico para soltar y ejecutar payloads. Añade noexec,nosuid,nodev.' })
  if (!has('nosuid') && e.mount !== '/' && e.mount !== '/boot') w.push({ tone: 'warn', text: 'sin nosuid fuera de /: un binario SUID plantado aquí escala privilegios.' })
  if (has('noexec') && e.mount === '/') w.push({ tone: 'bad', text: 'noexec en / rompe el sistema: no puedes ejecutar nada del propio SO.' })
  if (e.fsckPass === 1 && e.mount !== '/') w.push({ tone: 'warn', text: 'solo / debería llevar pass=1; el resto 2 o 0.' })
  if (e.fsckPass === 2 && ['tmpfs', 'swap', 'cifs', 'nfs4', 'sshfs', 'vfat'].includes(e.fs)) w.push({ tone: 'info', text: 'fsck pass 2 en filesystem no-nativo: usa 0 (no chequea).' })
  if (!w.length) w.push({ tone: 'ok', text: 'combinación razonable: sin contraseñas inline, flags de contención y pass de fsck correctos.' })
  return w
}

/** Serializa una entrada a la línea fstab final. */
export function buildFstabLine(e: FstabEntry): string {
  const opts = e.options.length ? e.options.join(',') : 'defaults'
  return `${e.spec.trim() || 'UUID=xxxx'}\t${e.mount.trim() || '/mnt/ruta'}\t${e.fs}\t${opts}\t${e.dump ? 1 : 0}\t${e.fsckPass}`
}

/** Verificación de UUIDs desde la terminal: comandos útiles. */
export const FSTAB_CHEATSHEET = [
  ['blkid', 'lista UUID/TYPE de todas las particiones'],
  ['lsblk -f', 'árbol de dispositivos con filesystem y UUID'],
  ['findmnt --verify', 'valida fstab actual (monta en seco) — oro puro'],
  ['systemctl daemon-reload', 'recarga units tras tocar fstab (systemd-fstab-generator)'],
  ['mount -a --verbose', 'monta todo lo pendiente mostrando qué hace'],
  ['findmnt -n -o SOURCE,TARGET,OPTIONS /ruta', 'opciones efectivas de un mount vivo'],
]
