/* sysctl: generador de /etc/sysctl.d/*.conf con foco en hardening de red.
   Referencia: kernel.org doc admin-guide/sysctl, man sysctl.d(5). */

export interface SysctlItem {
  key: string
  value: string
  desc: string
  tone: 'ok' | 'info' | 'warn' | 'bad'
}

export const SYSCTL_CATALOG: SysctlItem[] = [
  // anti-spoofing y protección IP
  { key: 'net.ipv4.ip_forward', value: '0', desc: 'no reenviar paquetes entre interfaces (router). En Docker/hypervisors será 1.', tone: 'info' },
  { key: 'net.ipv4.conf.all.rp_filter', value: '1', desc: 'valida ruta de retorno del paquete (anti-spoofing estricto)', tone: 'ok' },
  { key: 'net.ipv4.conf.default.rp_filter', value: '1', desc: 'igual para interfaces nuevas', tone: 'ok' },
  { key: 'net.ipv4.icmp_echo_ignore_broadcasts', value: '1', desc: 'ignora pings a broadcast (anti-smurf)', tone: 'ok' },
  { key: 'net.ipv4.icmp_ignore_bogus_error_responses', value: '1', desc: 'descarta ICMP error inválidos', tone: 'ok' },
  { key: 'net.ipv4.conf.all.accept_source_route', value: '0', desc: 'rechaza paquetes con ruta marcada (source routing)', tone: 'ok' },
  { key: 'net.ipv4.conf.all.accept_redirects', value: '0', desc: 'no aceptar ICMP redirects: evita secuestro de rutas', tone: 'ok' },
  { key: 'net.ipv4.conf.all.send_redirects', value: '0', desc: 'no enviar redirects (no somos router)', tone: 'ok' },
  { key: 'net.ipv6.conf.all.accept_redirects', value: '0', desc: 'ídem en IPv6', tone: 'ok' },
  { key: 'net.ipv4.conf.all.secure_redirects', value: '0', desc: 'no aceptar redirects ni a gateways "de confianza"', tone: 'ok' },
  { key: 'net.ipv4.conf.all.log_martians', value: '1', desc: 'loguea paquetes con IPs imposibles (forense)', tone: 'info' },
  { key: 'net.ipv4.tcp_syncookies', value: '1', desc: 'cookie SYN contra SYN flood', tone: 'ok' },
  { key: 'net.ipv4.tcp_rfc1337', value: '1', desc: 'mitiga TIME-WAIT assassination (RFC 1337)', tone: 'info' },
  { key: 'net.ipv4.conf.all.arp_ignore', value: '1', desc: 'responde ARP solo si la IP objetivo es de esa interfaz (anti-ARP spoof)', tone: 'ok' },
  { key: 'net.ipv4.conf.all.arp_announce', value: '2', desc: 'anuncia solo IPs de la interfaz de salida', tone: 'ok' },
  // kernel
  { key: 'kernel.kptr_restrict', value: '2', desc: 'oculta punteros del kernel incluso a root (0 libre, 1 admin, 2 siempre)', tone: 'ok' },
  { key: 'kernel.dmesg_restrict', value: '1', desc: 'dmesg solo para root: evita fugas de info del kernel', tone: 'ok' },
  { key: 'kernel.unprivileged_bpf_disabled', value: '1', desc: 'BPF solo para root: corta una familia entera de exploits', tone: 'ok' },
  { key: 'kernel.yama.ptrace_scope', value: '2', desc: 'solo root puede ptrace (0 = cualquiera, 1 = solo padre)', tone: 'ok' },
  { key: 'kernel.randomize_va_space', value: '2', desc: 'ASLR completo (stack, libs, heap)', tone: 'ok' },
  { key: 'kernel.kexec_load_disabled', value: '1', desc: 'desactiva cargar kernels en caliente', tone: 'info' },
  { key: 'kernel.unprivileged_userns_clone', value: '0', desc: 'sin user namespaces sin privilegios: corta sandboxes de exploits (rompe algún flatpak/chrome sandbox)', tone: 'warn' },
  { key: 'fs.protected_symlinks', value: '1', desc: 'ignora symlinks en /tmp de otros usuarios', tone: 'ok' },
  { key: 'fs.protected_hardlinks', value: '1', desc: 'no enlazar ficheros que no te pertenecen', tone: 'ok' },
  { key: 'fs.protected_fifos', value: '1', desc: 'mitiga FIFO squatting en dirs compartidos', tone: 'info' },
  { key: 'fs.suid_dumpable', value: '0', desc: 'no dumpear memoria de procesos SUID', tone: 'ok' },
  // VM / límites
  { key: 'vm.mmap_min_addr', value: '65536', desc: 'prohibe mmap en página 0: clásico de null-deref exploits', tone: 'ok' },
  { key: 'vm.overcommit_memory', value: '0', desc: 'no prometer memoria infinita (heurística)', tone: 'info' },
  { key: 'vm.swappiness', value: '10', desc: 'usa poca swap (servers con RAM de sobra)', tone: 'info' },
]

/** Perfiles listos: cada perfil activa un subconjunto del catálogo. */
export const SYSCTL_PROFILES: { id: string; label: string; desc: string; keys: string[] }[] = [
  {
    id: 'web',
    label: 'server web expuesto',
    desc: 'anti-spoofing, SYN cookies, dmesg/BPF cerrados',
    keys: ['net.ipv4.ip_forward', 'net.ipv4.conf.all.rp_filter', 'net.ipv4.tcp_syncookies', 'kernel.dmesg_restrict', 'kernel.kptr_restrict', 'kernel.unprivileged_bpf_disabled', 'fs.protected_symlinks', 'fs.protected_hardlinks', 'vm.mmap_min_addr'],
  },
  {
    id: 'laptop',
    label: 'laptop personal',
    desc: 'hardening moderado sin romper apps de escritorio',
    keys: ['net.ipv4.conf.all.rp_filter', 'net.ipv4.conf.all.accept_redirects', 'net.ipv4.tcp_syncookies', 'kernel.dmesg_restrict', 'kernel.yama.ptrace_scope', 'fs.protected_symlinks', 'fs.protected_hardlinks', 'vm.mmap_min_addr', 'vm.swappiness'],
  },
  {
    id: 'paranoico',
    label: 'máximo endurecimiento',
    desc: 'todo el catálogo — puede romper flatpaks, sandboxes y algún contenedor',
    keys: SYSCTL_CATALOG.map((i) => i.key),
  },
  {
    id: 'contenedor',
    label: 'host de contenedores',
    desc: 'ip_forward=1 necesario, resto de hardening intacto',
    keys: ['net.ipv4.ip_forward', 'net.ipv4.conf.all.rp_filter', 'net.ipv4.icmp_echo_ignore_broadcasts', 'kernel.dmesg_restrict', 'kernel.unprivileged_bpf_disabled', 'kernel.yama.ptrace_scope', 'fs.protected_symlinks', 'fs.protected_hardlinks', 'vm.mmap_min_addr'],
  },
]

/** Devuelve las líneas del conf activo. */
export function buildSysctlConf(activeKeys: string[], extra: { key: string; value: string }[]): string {
  const lines = ['# /etc/sysctl.d/99-hacknexus.conf', '# aplicable con: sudo sysctl --system', '']
  const chosen = SYSCTL_CATALOG.filter((i) => activeKeys.includes(i.key))
  for (const i of chosen) lines.push(`${i.key} = ${i.value}`)
  const seen = new Set(chosen.map((i) => i.key))
  for (const e of extra) {
    if (e.key.trim() && e.value.trim() && !seen.has(e.key.trim())) lines.push(`${e.key.trim()} = ${e.value.trim()}`)
  }
  return lines.join('\n') + '\n'
}

/** Cheatsheet de verificación tras aplicar. */
export const SYSCTL_VERIFY = [
  ['sudo sysctl --system', 'aplica todos los confs de /etc/sysctl.d/'],
  ['sysctl net.ipv4.tcp_syncookies', 'consulta una clave concreta'],
  ['sysctl -a | grep accept_redirects', 'verifica el estado efectivo'],
  ['sysctl -w kernel.kptr_restrict=2', 'aplica en vivo sin reiniciar (temporal)'],
  ['procps -V', 'paquete que trae sysctl en Debian/Ubuntu'],
]
