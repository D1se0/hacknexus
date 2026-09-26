/* Config Diff: compara ficheros de configuración (sshd_config, nginx,
   sysctl, .conf en general) ignorando ruido: comentarios, espacios y
   orden de directivas. Diff semántico, no de texto. */

export interface ConfLine {
  key: string
  value: string
  raw: string
  line: number
}

export interface ConfDiffEntry {
  key: string
  oldValue?: string
  newValue?: string
  kind: 'changed' | 'added' | 'removed'
  oldLine?: number
  newLine?: number
}

export interface DiffStats {
  added: number
  removed: number
  changed: number
  same: number
}

const NOISE = new Set(['', 'include', 'includedir'])

export function parseConf(text: string): ConfLine[] {
  const out: ConfLine[] = []
  let pendingKey: string | null = null
  let pendingRaw = ''
  let pendingLine = 0

  const flushPending = (lineNo: number) => {
    if (pendingKey) {
      out.push({ key: pendingKey, value: '(continuación)', raw: pendingRaw, line: pendingLine })
      pendingKey = null
    }
  }

  text.split('\n').forEach((rawLine, i) => {
    const lineNo = i + 1
    const line = rawLine.replace(/\s+$/, '')
    if (line.endsWith('\\')) {
      // línea de continuación: acumula
      const content = line.slice(0, -1).trim()
      if (!pendingKey) {
        const m = content.match(/^#?\s*([A-Za-z_][\w.-]*)\s*(.*)$/)
        if (m) { pendingKey = m[1]; pendingRaw = rawLine; pendingLine = lineNo }
      } else {
        pendingRaw += '\n' + rawLine
      }
      return
    }
    const content = (pendingKey ? pendingRaw.replace(/\\\n/g, ' ') + ' ' : '') + line
    pendingKey = null

    const trimmed = content.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    // formatos: key value | key=value | key = value
    const m = trimmed.match(/^#?\s*([A-Za-z_][\w.-]*)\s*[=\s]\s*(.*)$/)
    if (!m) return
    const key = m[1]
    const value = m[2].replace(/^["']|["']$/g, '').trim()
    if (NOISE.has(key.toLowerCase())) return
    out.push({ key, value, raw: trimmed, line: lineNo })
  })
  flushPending(0)
  return out
}

/** Diff semántico por directiva: misma clave con valor distinto = changed. */
export function diffConfigs(aText: string, bText: string): { entries: ConfDiffEntry[]; stats: DiffStats } {
  const a = parseConf(aText)
  const b = parseConf(bText)
  const aMap = new Map(a.map((l) => [l.key, l]))
  const bMap = new Map(b.map((l) => [l.key, l]))
  const entries: ConfDiffEntry[] = []
  let added = 0, removed = 0, changed = 0

  for (const [key, lineB] of bMap) {
    const lineA = aMap.get(key)
    if (!lineA) { entries.push({ key, newValue: lineB.value, kind: 'added', newLine: lineB.line }); added++ }
    else if (lineA.value !== lineB.value) { entries.push({ key, oldValue: lineA.value, newValue: lineB.value, kind: 'changed', oldLine: lineA.line, newLine: lineB.line }); changed++ }
  }
  for (const [key, lineA] of aMap) {
    if (!bMap.has(key)) { entries.push({ key, oldValue: lineA.value, kind: 'removed', oldLine: lineA.line }); removed++ }
  }
  const same = a.length + b.length - added - removed - 2 * changed >= 0 ? a.length + b.length - added - removed - changed - Math.min(added, removed) : 0
  // recuento simple: claves presentes en ambos con mismo valor
  const sameCount = [...aMap.keys()].filter((k) => bMap.has(k) && aMap.get(k)!.value === bMap.get(k)!.value).length
  return { entries, stats: { added, removed, changed, same: sameCount } }
}

/** Extrae claves de seguridad relevantes si el fichero lo es (sshd, nginx…). */
export const SECURITY_KEYS: Record<string, string[]> = {
  sshd: ['PasswordAuthentication', 'PermitRootLogin', 'PubkeyAuthentication', 'X11Forwarding', 'AllowTcpForwarding', 'MaxAuthTries', 'ClientAliveInterval', 'PermitEmptyPasswords'],
  nginx: ['server_tokens', 'ssl_protocols', 'ssl_ciphers', 'add_header'],
  apache: ['ServerTokens', 'ServerSignature', 'TraceEnable'],
}

export function securityHits(entries: ConfDiffEntry[]): ConfDiffEntry[] {
  const interesting = new Set(Object.values(SECURITY_KEYS).flat())
  return entries.filter((e) => interesting.has(e.key))
}

export const CONFDIFF_NOTES: string[] = [
  'El diff es SEMÁNTICO: reordenar directivas no aparece como cambio (en un .conf el orden casi nunca importa).',
  'Las líneas de continuación con \\ se juntan: la directiva completa se compara como una sola.',
  'Comentarios y espacios se ignoran: si cambió el comentario pero no el valor, no es un cambio.',
  'Úsalo para auditar: config de fábrica vs config actual = exactamente lo que un atacante pudo tocar.',
]

export const CONFDIFF_USECASES: [string, string][] = [
  ['Auditoría post-incidente', 'compara sshd_config actual contra el backup de fábrica: backdoors en AuthorizedKeysFile saltan a la vista'],
  ['Revisar el update', 'antes/después de apt upgrade: qué cambió en tus units y configs de nginx'],
  ['Baseline de hardening', 'genera la config con SSH Hardening y verifica qué aplicar manualmente en otra máquina'],
  ['Debug "yo no toqué nada"', 'diff entre lo que juras que hay y lo que hay de verdad'],
]
