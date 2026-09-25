/* Análisis forense de logs: auth.log/syslog estilo Unix y EVTX-XML de Windows.
   Detecta fuerza bruta, logins aceptados, sudo, cuenta creada y eventos sospechosos. 100% local. */

export interface IpActivity { ip: string; count: number; failed: number; isPrivate: boolean }
export interface UserActivity { name: string; failed: number; accepted: number }
export interface HourBin { label: string; count: number; failed: number }
export interface SuspiciousHit { line: number; ts: string; text: string; reason: string; sev: 'bad' | 'warn' }

export interface LogStats {
  format: 'syslog' | 'evtx'
  total: number
  failed: number
  accepted: number
  sudo: number
  users: UserActivity[]
  ips: IpActivity[]
  hours: HourBin[]
  programs: Record<string, number>
  suspicious: SuspiciousHit[]
}

const SYSLOG_RE = /^([A-Z][a-z]{2}\s+\d{1,2}\s\d{2}:\d{2}:\d{2})\s(\S+)\s([\w\-.\/]+)(?:\[(\d+)\])?:\s?(.*)$/
const ipRe = /(?:\d{1,3}\.){3}\d{1,3}/

export function isPrivateIpStr(ip: string): boolean {
  const m = ip.split('.').map(Number)
  if (m.length !== 4 || m.some((n) => Number.isNaN(n) || n > 255)) return false
  const [a, b] = m
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a >= 224
  )
}

const FAIL_PATTERNS: { re: RegExp; user?: number; ip?: number; reason: string }[] = [
  { re: /Failed (?:password|publickey|keyboard-interactive\S*) for (?:invalid user )?(\S+) from (\S+)/, user: 1, ip: 2, reason: 'fallo de autenticación SSH' },
  { re: /Invalid user (\S+) from ([\d.]+)/, user: 1, ip: 2, reason: 'usuario inexistente (spray/enumeración)' },
  { re: /authentication failure.*rhost=([\d.]+)?/, reason: 'fallo PAM de autenticación' },
  { re: /(?:FAILED|error).*password/i, reason: 'fallo de contraseña' },
]

const WARN_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /POSSIBLE BREAK-IN ATTEMPT/, reason: 'posible break-in: reverse mapping fallido' },
  { re: /reverse mapping checking/, reason: 'reverse DNS del cliente no resuelve (posible bot)' },
  { re: /Did not receive identification string/, reason: 'escáner/probe sin banner SSH' },
  { re: /refused connect from/, reason: 'conexión rechazada por tcpwrappers' },
  { re: /Connection closed by authenticating user/, reason: 'conexión cerrada tras autenticar (posible spraying)' },
  { re: /incorrect password attempt/, reason: 'sudo con contraseña incorrecta' },
]

interface Acc {
  format: 'syslog' | 'evtx'
  total: number
  failed: number
  accepted: number
  sudo: number
  users: Map<string, UserActivity>
  ips: Map<string, IpActivity>
  hours: Map<string, HourBin>
  programs: Record<string, number>
  suspicious: SuspiciousHit[]
}

function addIp(acc: Acc, ip: string, failed: boolean) {
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) return
  const cur = acc.ips.get(ip) ?? { ip, count: 0, failed: 0, isPrivate: isPrivateIpStr(ip) }
  cur.count++
  if (failed) cur.failed++
  acc.ips.set(ip, cur)
}

function addUser(acc: Acc, user: string, failed: boolean) {
  if (!user || user === '-') return
  const cur = acc.users.get(user) ?? { name: user, failed: 0, accepted: 0 }
  if (failed) cur.failed++
  else cur.accepted++
  acc.users.set(user, cur)
}

function addHour(acc: Acc, label: string, failed: boolean) {
  const cur = acc.hours.get(label) ?? { label, count: 0, failed: 0 }
  cur.count++
  if (failed) cur.failed++
  acc.hours.set(label, cur)
}

function addSusp(acc: Acc, line: number, ts: string, text: string, reason: string, sev: 'bad' | 'warn') {
  if (acc.suspicious.length < 500) acc.suspicious.push({ line, ts, text: text.slice(0, 300), reason, sev })
}

function emptyAcc(format: 'syslog' | 'evtx'): Acc {
  return {
    format, total: 0, failed: 0, accepted: 0, sudo: 0,
    users: new Map(), ips: new Map(), hours: new Map(), programs: {}, suspicious: [],
  }
}

function finish(acc: Acc): LogStats {
  return {
    format: acc.format,
    total: acc.total,
    failed: acc.failed,
    accepted: acc.accepted,
    sudo: acc.sudo,
    users: [...acc.users.values()].sort((a, b) => b.failed + b.accepted - (a.failed + a.accepted)).slice(0, 50),
    ips: [...acc.ips.values()].sort((a, b) => b.failed - a.failed || b.count - a.count).slice(0, 50),
    hours: [...acc.hours.values()].sort((a, b) => a.label.localeCompare(b.label)),
    programs: acc.programs,
    suspicious: acc.suspicious,
  }
}

/* ── syslog / auth.log ── */
export function parseSyslog(text: string): LogStats {
  const acc = emptyAcc('syslog')
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue
    acc.total++
    const m = SYSLOG_RE.exec(raw)
    const ts = m ? m[1] : ''
    const program = m ? m[3].toLowerCase() : 'otros'
    const msg = m ? m[5] : raw
    acc.programs[program] = (acc.programs[program] ?? 0) + 1

    // hora del día como bucket (HH)
    const hm = /(\d{2}):\d{2}:\d{2}/.exec(ts)
    if (hm) addHour(acc, hm[1] + ':00', false)

    let isFail = false
    let isOk = false

    const fail = FAIL_PATTERNS.find((p) => p.re.test(msg))
    if (fail) {
      isFail = true
      acc.failed++
      const um = fail.re.exec(msg)
      if (um && fail.user != null) addUser(acc, um[fail.user], true)
      if (um && fail.ip != null) addIp(acc, um[fail.ip], true)
      else {
        const anyIp = ipRe.exec(msg)
        if (anyIp) addIp(acc, anyIp[0], true)
      }
      addSusp(acc, i + 1, ts, raw, fail.reason, 'bad')
    }

    if (!isFail) {
      const acc2 = /Accepted (?:password|publickey|keyboard-interactive\S*) for (\S+) from (\S+)/.exec(msg)
      if (acc2) {
        isOk = true
        acc.accepted++
        addUser(acc, acc2[1], false)
        addIp(acc, acc2[2], false)
      } else if (/session opened for user (\S+)/.exec(msg) && program === 'su') {
        const u = /session opened for user (\S+)/.exec(msg)!
        isOk = true
        acc.accepted++
        addUser(acc, u[1], false)
      }
    }

    if (program === 'sudo') {
      acc.sudo++
      if (/COMMAND=/.test(msg)) {
        const user = /^(\S+)\s*:/.exec(msg)?.[1] ?? '?'
        if (/\b(?:rm -rf|mkfs|dd if=|chmod 777|useradd|passwd|visudo|iptables -F|shutdown|reboot)\b/.test(msg)) {
          addSusp(acc, i + 1, ts, raw, `sudo peligroso ejecutado por ${user}`, 'warn')
        }
      }
    }

    const warn = WARN_PATTERNS.find((p) => p.re.test(msg))
    if (warn) addSusp(acc, i + 1, ts, raw, warn.reason, 'warn')

    if (hm) {
      const bin = acc.hours.get(hm[1] + ':00')
      if (bin && isFail) bin.failed++
    }
    void isOk
  }
  return finish(acc)
}

/* ── EVTX-XML (File → Export → XML, o evtx_export) ── */
const LOGON_TYPES: Record<string, string> = {
  '2': 'interactivo', '3': 'red', '4': 'batch', '5': 'servicio',
  '7': 'desbloqueo', '8': 'red en claro', '9': 'credenciales explícitas',
  '10': 'RDP', '11': 'caché interactiva',
}

export function parseEvtxXml(text: string): LogStats {
  const acc = emptyAcc('evtx')
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) return finish(acc)
  const events = [...doc.getElementsByTagName('Event')]
  for (let i = 0; i < events.length; i++) {
    const ev = events[i]
    acc.total++
    const tag = (name: string): Element | null =>
      [...ev.getElementsByTagName('*')].find((e) => e.localName === name) ?? null
    const eventId = tag('EventID')?.textContent?.trim() ?? ''
    const time = tag('TimeCreated')?.getAttribute('SystemTime') ?? ''
    const computer = tag('Computer')?.textContent ?? ''
    const dataMap: Record<string, string> = {}
    const evData = [...ev.getElementsByTagName('*')].filter((e) => e.localName === 'Data')
    for (const d of evData) {
      const k = d.getAttribute('Name')
      if (k) dataMap[k] = d.textContent ?? ''
    }
    const hour = time ? new Date(time).getHours().toString().padStart(2, '0') + ':00' : ''
    if (hour !== ':00') addHour(acc, hour, false)
    const user = dataMap['TargetUserName'] || dataMap['SubjectUserName'] || ''
    const ip = (dataMap['IpAddress'] || '').replace(/^::ffff:/, '')

    let isFail = false
    if (eventId === '4625') {
      isFail = true
      acc.failed++
      addUser(acc, user, true)
      addIp(acc, ip, true)
      addSusp(acc, i + 1, time, `4625 login fallido · usuario=${user} · ip=${ip} · tipo=${LOGON_TYPES[dataMap['LogonType']] ?? dataMap['LogonType'] ?? '?'} · ${computer}`, 'fallo de autenticación Windows', 'bad')
    } else if (eventId === '4624') {
      acc.accepted++
      addUser(acc, user, false)
      addIp(acc, ip, false)
      if (dataMap['LogonType'] === '10') addSusp(acc, i + 1, time, `4624 RDP · usuario=${user} · ip=${ip}`, 'login RDP (revisar si es esperado)', 'warn')
    } else if (eventId === '4672') {
      acc.sudo++ // equivalente: privilegios especiales
    } else if (eventId === '4720') {
      addSusp(acc, i + 1, time, `4720 cuenta creada: ${dataMap['TargetUserName']} en ${computer}`, 'creación de cuenta local', 'bad')
    } else if (eventId === '4728' || eventId === '4732') {
      addSusp(acc, i + 1, time, `${eventId} ${dataMap['TargetUserName'] || 'usuario'} añadido a grupo ${dataMap['TargetGroupName'] ?? ''}`, 'miembro añadido a grupo privilegiado', 'bad')
    } else if (eventId === '1102') {
      addSusp(acc, i + 1, time, `1102 registro de auditoría borrado en ${computer}`, 'el log de seguridad fue limpiado', 'bad')
    } else if (eventId === '4719') {
      addSusp(acc, i + 1, time, `4719 política de auditoría modificada en ${computer}`, 'cambio de política de auditoría', 'warn')
    } else if (eventId === '4688') {
      const cmd = dataMap['CommandLine'] || dataMap['NewProcessName'] || ''
      acc.programs['proceso'] = (acc.programs['proceso'] ?? 0) + 1
      if (/\b(powershell|whoami|mimikatz|psexec|wmic|net user|net group|vssadmin|bcdedit|cipher \/w|wevtutil cl)\b/i.test(cmd)) {
        addSusp(acc, i + 1, time, `4688 proceso: ${cmd.slice(0, 200)}`, 'proceso de interés ofensivo/defensivo', 'warn')
      }
    }
    if (hour && isFail) {
      const bin = acc.hours.get(hour)
      if (bin) bin.failed++
    }
  }
  return finish(acc)
}

export const detectLogFormat = (text: string): 'syslog' | 'evtx' =>
  /<Event\b|xmlns="http:\/\/schemas\.microsoft\.com/.test(text.slice(0, 2000)) ? 'evtx' : 'syslog'

export function parseLog(text: string): LogStats {
  return detectLogFormat(text) === 'evtx' ? parseEvtxXml(text) : parseSyslog(text)
}

/* Muestra de ejemplo para demos/formación */
export const SAMPLE_SYSLOG = `Mar 14 02:11:03 srv01 sshd[1023]: Accepted password for admin from 10.0.0.5 port 51234 ssh2
Mar 14 02:14:19 srv01 sshd[2210]: Failed password for root from 185.220.101.34 port 40212 ssh2
Mar 14 02:14:22 srv01 sshd[2211]: Failed password for invalid user oracle from 185.220.101.34 port 40258 ssh2
Mar 14 02:14:26 srv01 sshd[2212]: Failed password for invalid user oracle from 185.220.101.34 port 40290 ssh2
Mar 14 02:14:31 srv01 sshd[2213]: Failed password for root from 185.220.101.34 port 40322 ssh2
Mar 14 02:14:35 srv01 sshd[2214]: Invalid user test from 45.155.204.10 port 51022
Mar 14 02:15:02 srv01 sshd[2215]: Failed password for admin from 45.155.204.10 port 51060 ssh2
Mar 14 02:15:06 srv01 CRON[2300]: pam_unix(cron:session): session opened for user www-data
Mar 14 02:15:40 srv01 sudo:   admin : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/passwd oracle
Mar 14 02:16:02 srv01 sshd[2310]: Failed password for root from 185.220.101.34 port 40410 ssh2
Mar 14 02:17:11 srv01 sshd[2315]: reverse mapping checking getaddrinfo for host-34.tor-exit.org failed - POSSIBLE BREAK-IN ATTEMPT!
Mar 14 02:18:44 srv01 sshd[2390]: Accepted publickey for deploy from 10.0.0.9 port 55112 ssh2
Mar 14 02:21:07 srv01 sshd[2412]: Did not receive identification string from 45.155.204.10
Mar 14 03:02:15 srv01 sudo:   admin : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/bin/rm -rf /var/log/old
Mar 14 03:05:33 srv01 su[2500]: + pts/1 deploy:root
Mar 14 04:12:02 srv01 sshd[2601]: Failed password for admin from 91.240.118.222 port 44210 ssh2
Mar 14 05:44:51 srv01 sshd[2702]: Failed password for postgres from 91.240.118.222 port 44280 ssh2
Mar 14 06:30:12 srv01 sshd[2810]: Accepted password for admin from 10.0.0.5 port 51300 ssh2`
