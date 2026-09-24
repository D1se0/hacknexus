/* Cheatsheets: Linux, Windows, red y escalada de privilegios */

export interface CheatCategory {
  name: string
  items: { cmd: string; desc: string }[]
}

export const LINUX_CHEATS: CheatCategory[] = [
  {
    name: 'Sistema y red',
    items: [
      { cmd: 'ip -c a && ip -c r', desc: 'IPs y tabla de rutas con color' },
      { cmd: 'ss -tulpn', desc: 'Puertos en escucha y proceso asociado' },
      { cmd: 'ip neigh', desc: 'Tabla ARP/vecinos (equivale a arp -a)' },
      { cmd: 'sudo lsof -i :443', desc: 'Quién usa el puerto 443' },
      { cmd: 'cat /etc/resolv.conf', desc: 'DNS configurados' },
      { cmd: 'resolvectl status', desc: 'Estado del resolvedor DNS (systemd)' },
      { cmd: 'nmcli dev wifi list', desc: 'Redes WiFi visibles' },
      { cmd: 'ip route get 8.8.8.8', desc: 'Por qué interfaz/ruta sale un destino' },
      { cmd: 'cat /proc/net/dev', desc: 'Estadísticas por interfaz' },
      { cmd: 'ethtool eth0', desc: 'Estado del enlace, velocidad, duplex' },
    ],
  },
  {
    name: 'Ficheros y permisos',
    items: [
      { cmd: 'find / -perm -4000 -type f 2>/dev/null', desc: 'SUID: candidatos a escalada' },
      { cmd: 'find / -writable -type d 2>/dev/null | grep -v proc', desc: 'Directorios escribibles' },
      { cmd: 'ls -la /etc/cron*', desc: 'Cron jobs (posible privesc)' },
      { cmd: 'stat fichero', desc: 'Metadatos completos de un fichero' },
      { cmd: 'getfacl fichero', desc: 'ACLs extendidas' },
      { cmd: 'tar czf backup.tgz dir/ --checkpoint=100', desc: 'Comprimir con progreso' },
      { cmd: 'rsync -avzP dir/ destino/', desc: 'Copiar con progreso y reanudar' },
      { cmd: 'sha256sum fichero', desc: 'Integridad SHA-256' },
    ],
  },
  {
    name: 'Procesos y hardening',
    items: [
      { cmd: 'ps aux --sort=-%mem | head', desc: 'Top consumo de memoria' },
      { cmd: 'systemctl list-timers --all', desc: 'Timers de systemd (como cron)' },
      { cmd: 'journalctl -u ssh -f', desc: 'Logs SSH en vivo' },
      { cmd: 'last -a | head && lastb | head', desc: 'Logins correctos y fallidos' },
      { cmd: 'auditctl -w /etc/passwd -p wa -k identity', desc: 'Auditar cambios en /etc/passwd' },
      { cmd: 'ufw status verbose', desc: 'Firewall UFW' },
      { cmd: 'sysctl kernel.randomize_va_space', desc: 'ASLR activado (2)' },
    ],
  },
]

export const WINDOWS_CHEATS: CheatCategory[] = [
  {
    name: 'Sistema y red',
    items: [
      { cmd: 'ipconfig /all && route print', desc: 'IPs y tabla de rutas' },
      { cmd: 'netstat -abno | findstr LISTEN', desc: 'Puertos en escucha y PID' },
      { cmd: 'arp -a', desc: 'Tabla ARP' },
      { cmd: 'Get-NetIPAddress | ft', desc: 'IPs (PowerShell moderno)' },
      { cmd: 'Get-DnsClientServerAddress', desc: 'DNS por interfaz' },
      { cmd: 'nslookup -type=SRV _ldap._tcp.dc._msdcs.dominio.com', desc: 'Descubrir DCs del dominio' },
      { cmd: 'whoami /priv && whoami /groups', desc: 'Privilegios y grupos del usuario' },
      { cmd: 'systeminfo | findstr /B /C:"OS"', desc: 'Versión de Windows' },
    ],
  },
  {
    name: 'Defensa / artefactos',
    items: [
      { cmd: 'Get-Process | Sort-Object CPU -Desc | Select -First 10', desc: 'Top procesos por CPU' },
      { cmd: 'Get-ScheduledTask | ? State -eq "Ready"', desc: 'Tareas programadas' },
      { cmd: 'wevtutil qe Security /c:10 /rd:true /f:text', desc: 'Últimos eventos de seguridad' },
      { cmd: 'Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run', desc: 'Persistencia por registro (Run keys)' },
      { cmd: 'Get-MpComputerStatus', desc: 'Estado de Defender' },
      { cmd: 'Get-NetFirewallProfile | ft Name,Enabled', desc: 'Perfiles del firewall' },
      { cmd: 'reg save HKLM\\SAM sam.hiv && reg save HKLM\\SYSTEM sys.hiv', desc: 'Exportar colmenas (análisis con secretsdump)' },
    ],
  },
]

export const PRIVESC_HINTS: { platform: 'linux' | 'windows'; text: string }[] = [
  { platform: 'linux', text: 'sudo -l: buscar binarios en GTFOBins (https://gtfobins.github.io)' },
  { platform: 'linux', text: 'SUID/SGID raros → gtfobins;.CapEff en getcap -r / 2>/dev/null → capabilities (cap_setuid+ep)' },
  { platform: 'linux', text: 'Cron writable o scripts relativos sin path → secuestro por PATH' },
  { platform: 'linux', text: 'systemd timers/servicios con ExecStart modificable → systemd unit hijacking' },
  { platform: 'linux', text: 'NFS no_root_squash en /etc/exports → montar y ejecutar SUID root' },
  { platform: 'linux', text: 'Docker group → montar / en contenedor privilegiado y escapar' },
  { platform: 'windows', text: 'whoami /priv: SeImpersonate → JuicyPotato/Potato family' },
  { platform: 'windows', text: 'Servicios con binPath no entrecomicado → Unquoted Service Path' },
  { platform: 'windows', text: 'AlwaysInstallElevated=1 → MSI malicioso como SYSTEM' },
  { platform: 'windows', text: 'Autologon y credenciales en registro/ archivos de configuración' },
  { platform: 'windows', text: 'winPEAS/PowerUp.ps1 automatizan casi todo lo anterior' },
]

export const EQUIV_CMD: { linux: string; win: string; desc: string }[] = [
  { linux: 'ip a', win: 'ipconfig /all', desc: 'Ver interfaces de red' },
  { linux: 'ss -tulpn', win: 'netstat -abno', desc: 'Puertos abiertos' },
  { linux: 'ip neigh', win: 'arp -a', desc: 'Tabla ARP' },
  { linux: 'dig dominio.com', win: 'nslookup dominio.com', desc: 'Resolver DNS' },
  { linux: 'ping -c 4 host', win: 'ping -n 4 host', desc: 'Probar conectividad' },
  { linux: 'traceroute host', win: 'tracert host', desc: 'Ruta hasta un host' },
  { linux: 'curl -I https://host', win: 'Invoke-WebRequest -Method Head https://host', desc: 'Cabeceras HTTP' },
  { linux: 'cat /etc/passwd', win: 'Get-LocalUser', desc: 'Usuarios del sistema' },
  { linux: 'ps aux', win: 'Get-Process', desc: 'Procesos' },
  { linux: 'systemctl status ssh', win: 'Get-Service sshd', desc: 'Estado de un servicio' },
  { linux: 'tar czf out.tgz dir/', win: 'Compress-Archive -Path dir -Dest out.zip', desc: 'Comprimir' },
  { linux: 'stat fichero', win: 'Get-ItemProperty fichero | fl *', desc: 'Metadatos de fichero' },
  { linux: 'df -h', win: 'Get-PSDrive -PSProvider FileSystem', desc: 'Espacio en disco' },
  { linux: 'free -h', win: 'Get-CimInstance Win32_OperatingSystem | Select TotalVisibleMemorySize,FreePhysicalMemory', desc: 'Memoria' },
  { linux: 'lsof fichero', win: 'openfiles /query', desc: 'Ficheros abiertos' },
  { linux: 'sha256sum fichero', win: 'Get-FileHash fichero -Algorithm SHA256', desc: 'Hash de integridad' },
]