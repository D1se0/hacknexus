/* Formador de comandos de administración de sistemas Linux: usuarios,
   paquetes, servicios, logs, red, cron, procesos, kernel — con el
   "por qué" de cada comando y las trampas clásicas. */

export type AdminGroup = 'usuarios' | 'paquetes' | 'servicios' | 'logs' | 'red' | 'cron' | 'procesos' | 'kernel'

export interface AdminCmd {
  cmd: string
  why: string
  trap?: string
  danger?: boolean
}

export const ADMIN_GROUPS: { id: AdminGroup; label: string; icon: string }[] = [
  { id: 'usuarios', label: 'Usuarios y permisos', icon: '👥' },
  { id: 'paquetes', label: 'Paquetes', icon: '📦' },
  { id: 'servicios', label: 'Servicios', icon: '⚙️' },
  { id: 'logs', label: 'Logs y diagnóstico', icon: '📋' },
  { id: 'red', label: 'Red', icon: '🌐' },
  { id: 'cron', label: 'Cron y temporizadores', icon: '⏰' },
  { id: 'procesos', label: 'Procesos', icon: '🔬' },
  { id: 'kernel', label: 'Kernel y módulos', icon: '🧠' },
]

export const ADMIN_CMDS: Record<AdminGroup, AdminCmd[]> = {
  usuarios: [
    { cmd: 'sudo adduser --disabled-password --gecos "" svc-backup', why: 'crea usuario de servicio SIN contraseña (solo claves): el patrón correcto para cuentas técnicas' },
    { cmd: 'sudo usermod -aG docker,sudo alice', why: 'añade a grupos SIN salir del grupo actual (-a es crítico: sin él, REPLACES todos los grupos)', trap: 'usermod -G sin -a deja al usuario solo en los grupos nuevos: pierde acceso a todo lo demás' },
    { cmd: 'sudo passwd -l usuario && sudo usermod -s /usr/sbin/nologin usuario', why: 'bloquea contraseña y shell de una cuenta sospechosa sin borrarla (conserva datos y auditoría)' },
    { cmd: 'getent passwd | awk -F: \'$3 >= 1000 && $3 < 65534 {print $1, $7}\'', why: 'lista usuarios humanos con su shell: revisa nologin inesperados tras un incidente' },
    { cmd: 'find / -perm -4000 -type f 2>/dev/null', why: 'inventario de binarios SUID: cada línea es un potencial privesc si no está en tu baseline', trap: 'compara contra tu lista limpia: un SUID nuevo en /tmp es game over' },
    { cmd: 'sudo chmod 750 /home/alice', why: 'otros usuarios del sistema no pueden leer la home (en Debian la home es 755 por defecto: filtración de privacidad)' },
    { cmd: 'sudo chage -M 90 -W 7 alice', why: 'fuerza rotación de contraseña cada 90 días con aviso a 7 — solo en entornos que lo exijan (NIST ya no lo recomienda por defecto)' },
    { cmd: 'ls -la /etc/sudoers.d/ && sudo visudo -c', why: 'audita fragmentos de sudoers: ficheros colados aquí son persistencia clásica', danger: true },
  ],
  paquetes: [
    { cmd: 'sudo apt update && apt list --upgradable', why: 've qué hay pendiente SIN instalar: nunca upgrade a ciegas en producción' },
    { cmd: 'sudo apt upgrade -y --no-install-recommends', why: 'actualiza sin paquetes recomendados (contenedores/servers más limpios)' },
    { cmd: 'apt-cache policy nginx', why: 'qué versión está instalada, cuál disponible y de qué repo: imprescindible antes de fijar versiones' },
    { cmd: 'sudo apt-mark hold kubelet kubeadm && sudo apt-mark showhold', why: 'congela paquetes críticos para que un upgrade automático no los toque' },
    { cmd: 'dpkg -l | grep -E "linux-image|linux-headers" | sort', why: 'inventario de kernels instalados: más de 3 = limpiar con apt autoremove' },
    { cmd: 'sudo dnf history && sudo dnf history undo 12', why: 'RHEL/Fedora: revertir una transacción entera de paquetes (no existe en apt)' },
    { cmd: 'sudo pacman -Qet', why: 'Arch: paquetes instalados EXPLÍCITAMENTE que ya no dependen de nadie (candidatos a limpieza)' },
    { cmd: 'sudo pacman -Qtdq | sudo pacman -Rns -', why: 'Arch: borra huérfanos en una línea (lee la lista ANTES de confirmar)', danger: true },
    { cmd: 'flatpak list --runtime | wc -l', why: 'los runtimes de flatpak pesan gigas: verifica qué estás acumulando' },
  ],
  servicios: [
    { cmd: 'systemctl list-units --type=service --state=running', why: 'qué corre AHORA: cada servicio es superficie de ataque y consumo' },
    { cmd: 'systemctl list-timers --all', why: 'temporizadores activos (los crons de systemd): revisa los que no reconozcas' },
    { cmd: 'systemd-analyze blame | head -10', why: 'qué servicio ralentiza el boot: los 5 primeros suelen ser red/wait-online y discard' },
    { cmd: 'systemd-analyze security nginx.service', why: 'puntuación de exposición del servicio 0-10 con directivas de hardening que le faltan' },
    { cmd: 'sudo systemctl edit nginx', why: 'override sin tocar el unit original (drop-in): sobrevive actualizaciones del paquete' },
    { cmd: 'journalctl -u ssh -S -1h -p warning --no-pager', why: 'errores/warnings del SSH en la última hora: diagnóstico rápido sin abrir el log entero' },
    { cmd: 'sudo systemctl mask NombreServicio', why: 'bloquea que el servicio arranque NI manual NI por dependencia (más fuerte que disable)', trap: 'mask sobre sshd o systemd-journald puede dejar la máquina inaccesible: piénsalo dos veces' },
  ],
  logs: [
    { cmd: 'journalctl --disk-usage && sudo journalctl --vacuum-size=500M', why: 'los logs de journal pueden comerse el disco: limita y libera' },
    { cmd: 'journalctl -f | grep -iE "fail|error|denied"', why: 'tail inteligente: solo lo relevante en vivo' },
    { cmd: 'lastb | head -20 && last -20', why: 'logins fallidos y exitosos recientes: el primer diagnóstico de brute force' },
    { cmd: 'sudo ausearch -m avc -ts today', why: 'denegaciones SELinux de hoy: la causa oculta del "no funciona y no sé por qué"' },
    { cmd: 'sudo dmesg -T | grep -iE "usb|error|i/o" | tail', why: 'kernel con timestamps humanos: discos que se desconectan, I/O errors' },
    { cmd: 'df -h && df -i', why: 'espacio EN DISCO y EN INODES: un filesystem "lleno" sin espacio es casi siempre inodes agotados (miles de ficheros pequeños)', trap: 'df -h dice 40% libre pero el FS no escribe → mira df -i' },
    { cmd: 'sudo lsof +L1', why: 'ficheros borrados aún abiertos: el clásico "el disco está lleno pero no encuentro qué" (reinicia el servicio que lo tiene)' },
  ],
  red: [
    { cmd: 'ip -br a && ip -br r', why: 'IPs y rutas en formato compacto: el nuevo ifconfig/route (sobrevive en cualquier distro moderna)' },
    { cmd: 'ss -tulpn', why: 'puertos escuchando y su proceso: EL comando de reconocimiento en tu propia máquina', trap: 'sin sudo no ves los procesos de otros usuarios: la mitad del mapa' },
    { cmd: 'sudo tcpdump -i any -nn port 53 -c 20', why: '20 consultas DNS en vivo: detecta exfiltración o beacons sin capturar todo' },
    { cmd: 'nmcli device wifi list', why: 'escaneo WiFi desde CLI sin NetworkManager GUI' },
    { cmd: 'sudo ip link set eth0 mtu 9000', why: 'jumbo frames para iSCSI/NAS en red dedicada (toda la ruta debe soportarlo o fragmenta)' },
    { cmd: 'curl -o /dev/null -s -w "dns:%{time_namelookup} conn:%{time_connect} tls:%{time_appconnect} total:%{time_total}\\n" https://ejemplo.com', why: 'descompone la latencia de una URL: si dns es alto, es el resolver; si tls alto, es el handshake' },
    { cmd: 'resolvectl status | grep -A2 "DNS Server"', why: 'qué DNS usa REALMENTE el sistema (no el /etc/resolv.conf que systemd-resolved gestiona)' },
  ],
  cron: [
    { cmd: 'for u in $(cut -d: -f1 /etc/passwd); do crontab -l -u $u 2>/dev/null | grep -v "^#" && echo "↑ $u"; done', why: 'audita TODOS los crontabs de usuarios de golpe: persistencia clásica escondida aquí' },
    { cmd: 'ls -la /etc/cron.*/', why: 'crons de sistema: ficheros sueltos colocados por un atacante no destacan si no comparas' },
    { cmd: 'SYSTEMD_EDITOR=visudo systemctl edit --full cronie.timer 2>/dev/null || crontab -e', why: 'editar con validación de sintaxis: un cron roto no avisa, simplemente no corre' },
    { cmd: 'systemd-run --on-calendar="*-*-* 03:00:00" --unit=backup-diario /usr/local/bin/backup.sh', why: 'one-shot transitorio sin fichero de unit: ideal para tareas ad-hoc' },
    { cmd: 'grep -r "curl\\|wget" /var/spool/cron/ /etc/cron* 2>/dev/null', why: 'crons que descargan algo de internet: patrón de crypto-miner y de persistencia por segundo', danger: true },
  ],
  procesos: [
    { cmd: 'ps auxf --sort=-%cpu | head -15', why: 'top procesos por CPU con árbol de parentesco (f): un minero siempre delata su parent' },
    { cmd: 'ps aux --sort=-rss | head -10', why: 'devoradores de RAM real (RSS): los leaks se ven aquí antes que en top' },
    { cmd: 'sudo lsof -p $(pgrep -f nginx | head -1) | grep -E "TCP|REG.*deleted"', why: 'sockets y ficheros borrados en uso de un proceso: forense rápido' },
    { cmd: 'pgrep -af "python|perl|bash -c"', why: 'interpretes corriendo con su línea completa: shells raras = revisión inmediata', danger: true },
    { cmd: 'kill -STOP <pid> && kill -CONT <pid>', why: 'pausa/reanuda sin matar: congela un proceso sospechoso para analizarlo sin que se apague (anti-forense del atacante)' },
    { cmd: 'strace -f -e trace=network -p <pid>', why: 'qué conexiones intenta hacer un proceso AHORA (siempre con autorización y ley en la mano)' },
    { cmd: 'systemd-cgtop', why: 'consumo por cgroup (contenedores/servicios) en vez de por PID: la vista que entiende Docker' },
  ],
  kernel: [
    { cmd: 'uname -r && lsmod | wc -l', why: 'kernel activo y número de módulos cargados: contexto de cualquier diagnóstico' },
    { cmd: 'sudo modprobe -r usb_storage && sudo ls /lib/modules/$(uname -r)/ | head', why: 'descarga el módulo de USB storage: bloqueo físico de pendrives sin tocar udev' },
    { cmd: 'sysctl kernel.dmesg_restrict=1', why: 'solo root lee dmesg: los mensajes del kernel revelan información útil para un atacante local' },
    { cmd: 'sudo sysctl -w kernel.unprivileged_bpf_disabled=1', why: 'sin root no se puede cargar BPF: corta un vector entero de privesc/OCULTACIÓN (eBPF rootkits)' },
    { cmd: 'sudo kexec -l /boot/vmlinuz-$(uname -r) --initrd=/boot/initrd.img-$(uname -r) && sudo kexec -e', why: 'reboot sin BIOS/POST: reinicio de 2-3 segundos en servidores con POST lento', trap: 'requiere habilitarlo en kernel.kexec_load_disabled=0 y es para valientes' },
    { cmd: 'grep -E "CONFIG_" /boot/config-$(uname -r) | grep -E "BPF|KEXEC|USER_NS" ', why: 'qué capacidades sensibles trae compilado tu kernel: base del hardening' },
  ],
}

export const ADMIN_NOTES: string[] = [
  'La diferencia entre admin y usuario avanzado no es saber más comandos: es saber QUÉ rompe cada comando.',
  'Casi todo en Linux se puede deshacer… menos dd, mkfs, wipefs y rm -rf de datos: esos piden confirmación mental, no del sistema.',
  'systemctl edit (drop-in) > editar units directamente: sobrevive a los updates del paquete.',
  'journalctl con -S (since) y -p (prioridad) convierte el diagnóstico de 20 minutos en uno de 2.',
  'Los comandos con danger están marcados porque en contexto de incidente son exactamente lo que hay que mirar primero.',
]

export const ADMIN_TIPS_LAB: [string, string][] = [
  ['Monta un lab en 10 min', 'multipass launch --name lab -m 2G (Ubuntu) o virt-install para KVM: todo lo de aquí se practica sin miedo'],
  ['Snapshot antes de romper', 'en VM: snapshot → experimenta → revierte. Es la forma más rápida de aprender sysadmin'],
  ['Lee los errores enteros', 'el 90% de los "no funciona" se resuelven leyendo el mensaje completo en vez de copiarlo a Google'],
]
