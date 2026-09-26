/* Formador de comandos de discos, volúmenes y almacenamiento en Linux:
   LVM (físicos/lógicos), RAID mdadm, cifrado LUKS, dd, montaje y swap.
   Referencia: man lvm(8), mdadm(8), cryptsetup(8), man dd(1). */

export type DiskMode = 'lvm' | 'raid' | 'luks' | 'dd' | 'mount' | 'swap'

export interface DiskState {
  mode: DiskMode
  disks: string // ej: /dev/sdb, /dev/sdc (uno por línea o separado por comas)
  vgName: string
  lvName: string
  lvSize: string // ej: 50G, 100%FREE
  mountPoint: string
  fs: string
  raidLevel: 0 | 1 | 5 | 10
  hostnameNote: string
  ddSource: string
  ddTarget: string
  ddBlockSize: string
  ddProgress: boolean
  swapSize: string
}

export const DISK_FS = ['ext4', 'xfs', 'btrfs', 'f2fs', 'swap'] as const

export const RAID_INFO: Record<0 | 1 | 5 | 10, { desc: string; min: number; tolerance: string; use: string }> = {
  0: { desc: 'striping', min: 2, tolerance: 'ninguna: si falla un disco, se pierde TODO', use: 'scratch, render, caching (¡nunca datos únicos!)' },
  1: { desc: 'mirroring', min: 2, tolerance: 'aguanta la mitad de los discos rotos', use: 'SO, BD pequeñas, seguridad máxima con 2 discos' },
  5: { desc: 'striping + paridad', min: 3, tolerance: 'aguanta 1 disco roto', use: 'almacenamiento grande con redundancia (NAS)' },
  10: { desc: 'mirror + stripe', min: 4, tolerance: 'aguanta 1 por espejo (2 si hay suerte)', use: 'rendimiento + redundancia (VMs, BD)' },
}

/** Comandos LVM completos: PV → VG → LV → FS → mount. */
export function buildLvmCommands(s: DiskState): { cmd: string; why: string; danger?: boolean }[] {
  const disks = parseDisks(s.disks)
  const out: { cmd: string; why: string; danger?: boolean }[] = []
  out.push({ cmd: `lsblk -f`, why: 'identifica los discos reales: verifica DOS VECES que los dispositivos son correctos' })
  if (disks.length === 0) return out
  out.push({ cmd: `sudo wipefs -a ${disks.join(' ')}`, why: 'borra firmas de filesystems anteriores (sin esto pvcreate a veces se queja)', danger: true })
  out.push({ cmd: `sudo pvcreate ${disks.join(' ')}`, why: `convierte ${disks.length} disco${disks.length > 1 ? 's' : ''} en Physical Volumes (la ladrillo base de LVM)` })
  out.push({ cmd: `sudo vgcreate ${s.vgName} ${disks.join(' ')}`, why: `los agrupa en el Volume Group "${s.vgName}": un pool de espacio común` })
  const size = s.lvSize.trim() || '100%FREE'
  out.push({ cmd: `sudo lvcreate -l ${size} -n ${s.lvName} ${s.vgName}`, why: `Logical Volume "${s.lvName}" de ${size} (${size.includes('%FREE') ? 'todo el espacio libre' : 'espacio fijo'}) — puede redimensionarse EN CALIENTE después` })
  out.push({ cmd: `sudo mkfs.${s.fs} /dev/${s.vgName}/${s.lvName}`, why: `formatea el LV con ${s.fs}` })
  out.push({ cmd: `sudo mkdir -p ${s.mountPoint}`, why: 'crea el punto de montaje' })
  out.push({ cmd: `sudo mount /dev/${s.vgName}/${s.lvName} ${s.mountPoint}`, why: 'monta (temporal hasta reiniciar)' })
  out.push({ cmd: `/dev/${s.vgName}/${s.lvName}  ${s.mountPoint}  ${s.fs}  defaults,nofail  0  2`, why: `línea para /etc/fstab (con nofail: si el volumen falta, el boot sigue) — edítalo con fstab Builder` })
  out.push({ cmd: `sudo vgdisplay ${s.vgName} && lvs`, why: 'verifica: PE totales/libres y lista de LVs' })
  out.push({ cmd: `# ampliación futura en caliente:\nsudo pvcreate /dev/sdN && sudo vgextend ${s.vgName} /dev/sdN && sudo lvextend -l +100%FREE -r /dev/${s.vgName}/${s.lvName}`, why: 'añade un disco nuevo y crece el LV sin desmontar nada (-r redimensiona el FS a la vez)' })
  return out
}

/** Comandos mdadm: RAID software completo. */
export function buildRaidCommands(s: DiskState): { cmd: string; why: string; danger?: boolean }[] {
  const disks = parseDisks(s.disks)
  const out: { cmd: string; why: string; danger?: boolean }[] = []
  const info = RAID_INFO[s.raidLevel]
  out.push({ cmd: `# RAID${s.raidLevel} = ${info.desc} · mínimo ${info.min} discos · tolerancia: ${info.tolerance} · uso típico: ${info.use}`, why: 'elige el nivel ANTES de crear: cambiarlo después es rehacer todo' })
  if (disks.length === 0) return out
  if (disks.length < info.min) out.push({ cmd: `# ¡ATENCIÓN: RAID${s.raidLevel} necesita al menos ${info.min} discos y tienes ${disks.length}!`, why: 'el array fallará o se creará degradado', danger: true })
  out.push({ cmd: `lsblk -f`, why: 'verifica los dispositivos: UN ERROR AQUÍ BORRA DISCOS EQUIVOCADOS', danger: true })
  out.push({ cmd: `sudo wipefs -a ${disks.join(' ')}`, why: 'elimina firmas previas de los discos', danger: true })
  out.push({ cmd: `sudo mdadm --create /dev/md0 --level=${s.raidLevel} --raid-devices=${disks.length} ${disks.join(' ')}`, why: `crea el array RAID${s.raidLevel} en /dev/md0` })
  out.push({ cmd: `cat /proc/mdstat`, why: 'mira la sincronización inicial en vivo (resync en progreso)' })
  out.push({ cmd: `sudo mkfs.${s.fs} /dev/md0`, why: `sistema de ficheros ${s.fs} sobre el array` })
  out.push({ cmd: `sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf`, why: 'guarda la config del array: SIN ESTO no se montará al arrancar' })
  out.push({ cmd: `sudo update-initramfs -u`, why: 'regenera el initramfs con la config de mdadm (Debian/Ubuntu)' })
  out.push({ cmd: `/dev/md0  ${s.mountPoint}  ${s.fs}  defaults,nofail  0  2`, why: 'línea para fstab' })
  out.push({ cmd: `sudo mdadm --detail /dev/md0`, why: 'estado de cada disco (active/syncing/failed)' })
  out.push({ cmd: `# sustituir un disco caído:\nsudo mdadm /dev/md0 --fail /dev/sdX --remove /dev/sdX\nsudo mdadm /dev/md0 --add /dev/sdY`, why: 'procedimiento de reemplazo en caliente: marca fallido, saca, mete el nuevo y resincroniza' })
  return out
}

/** Cifrado LUKS completo: partición → abrir → formatear → montar → fstab con crypttab. */
export function buildLuksCommands(s: DiskState): { cmd: string; why: string; danger?: boolean }[] {
  const disks = parseDisks(s.disks)
  const out: { cmd: string; why: string; danger?: boolean }[] = []
  const dev = disks[0] ?? '/dev/sdX'
  out.push({ cmd: `sudo cryptsetup luksFormat --type luks2 ${dev}`, why: 'cifra la partición con LUKS2 (AES-XTS). IRREVERSIBLE: todo dato previo se pierde', danger: true })
  out.push({ cmd: `sudo cryptsetup open ${dev} ${s.lvName || 'secret'}`, why: 'abre el volumen: pide la passphrase y lo expone en /dev/mapper/' })
  const mapper = `/dev/mapper/${s.lvName || 'secret'}`
  out.push({ cmd: `sudo mkfs.${s.fs} ${mapper}`, why: `formatea dentro del contenedor cifrado (${s.fs})` })
  out.push({ cmd: `sudo mkdir -p ${s.mountPoint} && sudo mount ${mapper} ${s.mountPoint}`, why: 'monta como cualquier disco' })
  out.push({ cmd: `${dev}  ${s.lvName || 'secret'}  none  luks,discard`, why: 'línea para /etc/crypttab: pide la clave al arrancar (discard = TRIM en SSDs)' })
  out.push({ cmd: `${mapper}  ${s.mountPoint}  ${s.fs}  defaults,nofail  0  2`, why: 'línea para fstab DESPUÉS del crypttab' })
  out.push({ cmd: `sudo cryptsetup luksDump ${dev} | head -20`, why: 'verifica: versión LUKS, cipher, keyslots' })
  out.push({ cmd: `# añadir una clave de respaldo (¡hazlo YA, no cuando pierdas la principal!):\nsudo cryptsetup luksAddKey ${dev}`, why: 'hasta 8 keyslots: guarda una segunda passphrase en papel en lugar seguro' })
  out.push({ cmd: `sudo cryptsetup status ${s.lvName || 'secret'} && df -h ${s.mountPoint}`, why: 'verificación final: cifrado activo y espacio' })
  return out
}

/** dd con barras de seguridad explícitas. */
export function buildDdCommands(s: DiskState): { cmd: string; why: string; danger?: boolean }[] {
  const out: { cmd: string; why: string; danger?: boolean }[] = []
  const src = s.ddSource.trim() || '/dev/sdb'
  const dst = s.ddTarget.trim() || 'imagen.img'
  const bs = s.ddBlockSize.trim() || '4M'
  out.push({ cmd: `# dd NO pregunta ni perdona: if= origen, of= destino. Al revés = disco borrado`, why: 'regla mnemotécnica: "dd = disk destroyer" — lee DOS veces antes de enter', danger: true })
  out.push({ cmd: `lsblk -o NAME,SIZE,TYPE,MOUNTPOINT`, why: 'confirma origen y destino por TAMAÑO además de nombre (sda vs sdb es la errata clásica)' })
  if (s.ddProgress) {
    out.push({ cmd: `sudo dd if=${src} of=${dst} bs=${bs} status=progress conv=sync,noerror`, why: `copia con progreso en vivo y tolerancia a errores de lectura (bs=${bs}: más grande = más rápido, menos recuperable si muere a medias)` })
  } else {
    out.push({ cmd: `sudo dd if=${src} of=${dst} bs=${bs} conv=sync,noerror`, why: 'copia bloque a bloque; mira el progreso desde otra terminal con `sudo pkill -USR1 dd`' })
  }
  out.push({ cmd: `sync`, why: 'fuerza el vaciado del buffer: sin esto, "terminar" no significa que esté en el disco' })
  out.push({ cmd: `# clonar disco → disco (mismo tamaño o menor destino):\nsudo dd if=${src} of=${dst} bs=${bs} status=progress`, why: 'si of= es un dispositivo entero, clona TODO (particiones, boot, firmas)', danger: true })
  out.push({ cmd: `# crear un USB booteable desde una ISO:\nsudo dd if=distro.iso of=/dev/sdX bs=4M status=progress oflag=sync`, why: 'oflag=sync evita retirar el USB antes de tiempo' })
  out.push({ cmd: `# forense: imagen bit a bit con hash integrado:\nsudo dd if=${src} bs=1M conv=noerror,sync | tee >(sha256sum > ${dst}.sha256) > ${dst}`, why: 'patrón de adquisición de evidencia: imagen + hash en un solo paso' })
  return out
}

/** Montaje manual + systemd automount. */
export function buildMountCommands(s: DiskState): { cmd: string; why: string }[] {
  const dev = parseDisks(s.disks)[0] ?? '/dev/sdb1'
  return [
    { cmd: `lsblk -f && sudo blkid ${dev}`, why: 'UUID y tipo de FS: usa SIEMPRE el UUID en fstab (los nombres sdX cambian entre boots)' },
    { cmd: `sudo mkdir -p ${s.mountPoint}`, why: 'punto de montaje' },
    { cmd: `sudo mount -t ${s.fs} -o defaults,nofail ${dev} ${s.mountPoint}`, why: 'montaje manual de prueba' },
    { cmd: `sudo umount ${s.mountPoint}`, why: 'desmontar antes de tocar fstab (target is busy → cierra procesos: lsof +f -- ' + s.mountPoint + ')' },
    { cmd: `UUID=\$(sudo blkid -s UUID -o value ${dev})  ${s.mountPoint}  ${s.fs}  defaults,nofail  0  2`, why: 'línea para fstab con UUID resuelto (genérala con Fstab Builder)' },
    { cmd: `sudo findmnt --verify`, why: 'valida el fstab SIN reiniciar: tu seguro contra un boot roto' },
    { cmd: `sudo systemctl daemon-reload && sudo mount -a`, why: 'monta todo lo declarado sin reiniciar' },
    { cmd: `# automount bajo demanda (monta al primer acceso, desmonta tras inactividad):\nsudo systemd-run --unit=auto${s.mountPoint.replace(/\//g, '-')} --description="automount" mount ${dev} ${s.mountPoint}`, why: 'alternativa moderna a fstab para unidades externas' },
  ]
}

/** Swap: fichero o dispositivo. */
export function buildSwapCommands(s: DiskState): { cmd: string; why: string; danger?: boolean }[] {
  const size = s.swapSize.trim() || '4G'
  return [
    { cmd: `sudo fallocate -l ${size} /swapfile && sudo chmod 600 /swapfile`, why: `fichero de swap de ${size} con permisos de root EXCLUSIVOS (644 = aviso de seguridad en el log)` },
    { cmd: `sudo mkswap /swapfile`, why: 'formatea como área de intercambio' },
    { cmd: `sudo swapon /swapfile && free -h`, why: 'activa y verifica' },
    { cmd: `/swapfile  none  swap  sw  0  0`, why: 'línea para fstab para hacerlo permanente' },
    { cmd: `vm.swappiness=10`, why: 'en /etc/sysctl.d: usa RAM primero y swap solo cuando apriete (default 60 es agresivo para servidores)' },
    { cmd: `# hibernación: la swap debe ser ≥ RAM y apuntar resume=UUID=... en el kernel — si no, NO hiberna`, why: 'trampa clásica: swap grande para hibernar, pequeño para rendimiento' },
  ]
}

export function parseDisks(raw: string): string[] {
  return raw.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => /^\/dev\//.test(s))
}

export const DISK_NOTES: string[] = [
  'Regla de oro de discos: lsblk DOS VECES antes de cualquier comando con of=, wipefs, mkfs o dd. No hay undo.',
  'LVM ventaja madre: redimensionar en caliente. Un VG con espacio libre = crecer LVs sin desmontar.',
  'RAID ≠ backup: RAID5 aguantan 1 disco, pero un virus/borrado se replica al instante en todos.',
  'LUKS2 soporta hasta 8 keyslots: añade una segunda clave de emergencia el mismo día que cifras.',
  'dd con status=progress o muere de ansiedad: no hay barra de progreso por defecto.',
  'En SSDs modernos, alinea siempre a 1M (start 2048 sectores) — fdisk/gdisk lo hacen por defecto hoy.',
]

export const DISK_EMERGENCY: [string, string][] = [
  ['borré la tabla de particiones', 'testdisk: recupera particiones desde el disco SIN escribir (modo read-only primero)'],
  ['formateé la partición equivocada', 'deja de escribir YA: photorec/extundelete extraen por magic bytes mientras los bloques no se sobrescriban'],
  ['dd al revés (of= el disco bueno)', 'gddrescue + testdisk sobre el destino; considerar perdido lo que se haya copiado encima'],
  ['vg no se activa al arrancar', 'vgchange -ay y revisa lvm2.conf: suele ser el initramfs desactualizado'],
  ['target is busy al desmontar', 'lsof +f -- /mount → mata el proceso, o fuser -vm; lazy: umount -l (solo si entiendes el riesgo)'],
]
