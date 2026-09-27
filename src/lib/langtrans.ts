/* Traductor estructural entre lenguajes de programación — 100% local, nada sale de tu navegador.
   Enfoque honesto: NO es un compilador. Parsea el subconjunto común de construcciones
   (variables, operadores, strings/interpolación, listas, condicionales, bucles, funciones,
   print, conversiones) → IR intermedio → emisor por lenguaje. Lo que no entiende lo deja
   marcado como "no traducido" con la línea original, y da un % de confianza real.
   Origen y destino: Python, JavaScript, TypeScript, Java, C#, Go, Ruby y PHP. */

export type TransLang = 'python' | 'javascript' | 'typescript' | 'java' | 'csharp' | 'go' | 'ruby' | 'php'

export const TRANS_LANGS: { id: TransLang; label: string; ext: string }[] = [
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'ruby', label: 'Ruby', ext: 'rb' },
  { id: 'php', label: 'PHP', ext: 'php' },
]

export const langMeta = (id: TransLang): { label: string; ext: string } =>
  TRANS_LANGS.find((l) => l.id === id) ?? { label: id, ext: 'txt' }

/* ─────────────────────────── IR ─────────────────────────── */

export type IrNode =
  | { k: 'assign'; name: string; expr: string; decl: boolean }
  | { k: 'print'; args: string }
  | { k: 'if'; cond: string; then: IrNode[]; elifs: { cond: string; body: IrNode[] }[]; els: IrNode[] }
  | { k: 'while'; cond: string; body: IrNode[] }
  | { k: 'forr'; v: string; start: string; end: string; body: IrNode[] }
  | { k: 'foreach'; v: string; iv?: string; iter: string; body: IrNode[] }
  | { k: 'func'; name: string; params: string[]; body: IrNode[] }
  | { k: 'return'; expr?: string }
  | { k: 'break' }
  | { k: 'continue' }
  | { k: 'comment'; text: string }
  | { k: 'expr'; expr: string }
  | { k: 'raw'; text: string; line: number }

export interface TranslateIssue {
  line?: number
  text: string
}

export interface TranslateResult {
  code: string
  stats: { statements: number; translated: number; raw: number; funcs: number; lines: number }
  confidence: number // 0-100
  issues: TranslateIssue[]
  notes: string[]
}

/* ─────────────────────────── utilidades ─────────────────────────── */

const stripComments = (line: string, lang: TransLang): string => {
  const marker = lang === 'python' || lang === 'ruby' ? '#' : '//'
  let inS = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' || c === "'") inS = !inS
    if (!inS && line.startsWith(marker, i)) return line.slice(0, i).trim()
  }
  return line.trim()
}

const splitTop = (s: string, sep: string): string[] => {
  const out: string[] = []
  let depth = 0
  let inS = false
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'") inS = !inS
    if (!inS) {
      if (c === '(' || c === '[') depth++
      if (c === ')' || c === ']') depth--
      if (depth === 0 && s.startsWith(sep, i)) {
        out.push(cur.trim())
        cur = ''
        i += sep.length - 1
        continue
      }
    }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/* Normaliza una expresión al "neutro" del IR */
const canonBuiltins = (e: string): string => {
  let x = e ?? ''
  const map: [RegExp, string][] = [
    [/\blen\(/g, 'LEN('], [/\bstrlen\(/g, 'LEN('],
    [/\bstr\(/g, 'STR('], [/\bString\(/g, 'STR('], [/\.toString\(\)/g, ''], [/\bto_s\b/g, ''],
    [/\bint\(/g, 'INT('], [/\bparseInt\(/g, 'INT('], [/Integer\.parseInt\(/g, 'INT('], [/int\.Parse\(/g, 'INT('],
    [/\bfloat\(/g, 'FLOAT('], [/\bparseFloat\(/g, 'FLOAT('], [/Float\.parseFloat\(/g, 'FLOAT('],
    [/Math\.floor\(/g, 'FLOOR('], [/math\.floor\(/g, 'FLOOR('], [/Math\.Floor\(/g, 'FLOOR('],
    [/\.toUpperCase\(\)/g, ''], [/\bupcase\b/g, ''], [/strtoupper\(/g, 'UP('], [/\.ToUpper\(\)/g, ''],
    [/\.toLowerCase\(\)/g, ''], [/\bdowncase\b/g, ''], [/strtolower\(/g, 'LOW('], [/\.ToLower\(\)/g, ''],
    [/Math\.abs\(/g, 'ABS('], [/Math\.Abs\(/g, 'ABS('],
    [/\binput\(/g, 'INPUT('], [/\bgets\.chomp\b/g, 'INPUT()'],
    [/\bNone\b|\bnull\b|\bnil\b/g, 'NULL'],
    [/\bTrue\b/g, 'true'], [/\bFalse\b/g, 'false'],
    [/===/g, '=='], [/!==/g, '!='],
    [/\band\b/g, '&&'], [/\bor\b/g, '||'], [/\bnot\s+/g, '!'],
  ]
  for (const [re, rep] of map) x = x.replace(re, rep)
  return x.trim()
}

/* f-strings python / interpolación ruby y php → canónico ${expr} */
const canonArg = (e: string): string => {
  if (!e) return ''
  let x = canonBuiltins(e)
  // f"..." python
  x = x.replace(/\bf(["'])((?:[^\\]|\\.)*?)\1/g, (_m, _q, content: string) =>
    JSON.stringify(content.replace(/\{([^{}]+)\}/g, '${$1}')),
  )
  // "#{...}" ruby y "{$var}" php → ${...}
  x = x.replace(/#\{([^{}]+)\}/g, '${$1}')
  x = x.replace(/\{\$(\w+)\}/g, '${$1}')
  return x.trim()
}

/* ─────────────────────────── contadores ─────────────────────────── */

const walk = (nodes: IrNode[], fn: (n: IrNode) => void): void => {
  for (const n of nodes) {
    fn(n)
    if (n.k === 'if') { walk(n.then, fn); walk(n.els, fn); n.elifs.forEach((e) => walk(e.body, fn)) }
    else if (n.k === 'while' || n.k === 'forr' || n.k === 'foreach' || n.k === 'func') walk(n.body, fn)
  }
}

const countRaw = (nodes: IrNode[]): number => {
  let n = 0
  walk(nodes, (x) => { if (x.k === 'raw') n++ })
  return n
}
const countAll = (nodes: IrNode[]): number => {
  let n = 0
  walk(nodes, (x) => { if (x.k !== 'comment') n++ })
  return n
}
const countFuncs = (nodes: IrNode[]): number => {
  let n = 0
  walk(nodes, (x) => { if (x.k === 'func') n++ })
  return n
}
const hasReturn = (nodes: IrNode[]): boolean => {
  let r = false
  walk(nodes, (x) => { if (x.k === 'return') r = true })
  return r
}
const containsInput = (nodes: IrNode[]): boolean => {
  let yes = false
  walk(nodes, (x) => {
    const t = x.k === 'assign' ? x.expr : x.k === 'print' ? x.args : x.k === 'if' ? x.cond : x.k === 'while' ? x.cond : x.k === 'expr' ? x.expr : x.k === 'return' ? (x.expr ?? '') : ''
    if (t.includes('INPUT(')) yes = true
  })
  return yes
}

/* ─────────────────────────── parser Python (indentación) ─────────────────────────── */

interface Parsed {
  body: IrNode[]
  issues: TranslateIssue[]
}

function parsePython(src: string): Parsed {
  const issues: TranslateIssue[] = []
  const lines = src.split('\n')
  let idx = 0

  const indentOf = (raw: string): number => (raw.match(/^[ \t]*/)![0].replace(/\t/g, '    ')).length

  const parsePyLine = (line: string, indent: number): IrNode => {
    let m: RegExpMatchArray | null
    if ((m = line.match(/^#(.*)$/))) return { k: 'comment', text: m[1].trim() }
    if ((m = line.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:$/))) {
      const params = m[2].split(',').map((p) => p.trim().split(/[:=]/)[0].trim()).filter(Boolean)
      idx++
      return { k: 'func', name: m[1], params, body: parseBlock(indent + 4) }
    }
    if ((m = line.match(/^for\s+([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s+in\s+enumerate\((.+)\)\s*:$/))) {
      idx++
      return { k: 'foreach', iv: m[1], v: m[2], iter: canonArg(m[3]), body: parseBlock(indent + 4) }
    }
    if ((m = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\(([^)]+)\)\s*:$/))) {
      const parts = splitTop(m[2], ',')
      if (parts.length === 1) { idx++; return { k: 'forr', v: m[1], start: '0', end: canonArg(parts[0]), body: parseBlock(indent + 4) } }
      if (parts.length === 2) { idx++; return { k: 'forr', v: m[1], start: canonArg(parts[0]), end: canonArg(parts[1]), body: parseBlock(indent + 4) } }
      issues.push({ line: idx + 1, text: 'range() con paso no soportado: línea marcada como no traducida' })
      return { k: 'raw', text: line, line: idx + 1 }
    }
    if ((m = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+)\s*:$/))) {
      idx++
      return { k: 'foreach', v: m[1], iter: canonArg(m[2]), body: parseBlock(indent + 4) }
    }
    if ((m = line.match(/^while\s+(.+)\s*:$/))) {
      idx++
      return { k: 'while', cond: canonArg(m[1]), body: parseBlock(indent + 4) }
    }
    if ((m = line.match(/^if\s+(.+)\s*:$/))) {
      idx++
      return parseIfChain(m[1], indent)
    }
    if (/^(elif|else)\b/.test(line)) {
      // elif/else huérfano (no consumido por una cadena if): se marca
      issues.push({ line: idx + 1, text: 'elif/else sin if asociado: línea marcada como no traducida' })
      return { k: 'raw', text: line, line: idx + 1 }
    }
    if ((m = line.match(/^return\b\s*(.*)$/))) return { k: 'return', expr: m[1] ? canonArg(m[1]) : undefined }
    if (/^break$/.test(line)) return { k: 'break' }
    if (/^continue$/.test(line)) return { k: 'continue' }
    if ((m = line.match(/^print\((.*)\)$/))) return { k: 'print', args: splitTop(m[1], ',').map(canonArg).join(', ') }
    // asignación compuesta: i += 1 → i = i + 1
    if ((m = line.match(/^([A-Za-z_]\w*)\s*(\+|-|\*|\/|\/\/)=\s*(.+)$/)))
      return { k: 'assign', name: m[1], expr: canonArg(`${m[1]} ${m[2] === '//' ? '/' : m[2]} ${m[3]}`), decl: false }
    if ((m = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)))
      return { k: 'assign', name: m[1], expr: canonArg(m[2]), decl: true }
    if ((m = line.match(/^([A-Za-z_][\w.]*)\s*\(.*\)$/))) return { k: 'expr', expr: canonArg(line) }
    issues.push({ line: idx + 1, text: `línea no reconocida: "${line.slice(0, 48)}"` })
    return { k: 'raw', text: line, line: idx + 1 }
  }

  const parseIfChain = (cond: string, indent: number): IrNode => {
    const then = parseBlock(indent + 4)
    const elifs: { cond: string; body: IrNode[] }[] = []
    let els: IrNode[] = []
    while (idx < lines.length) {
      const rawLine = lines[idx]
      const line = stripComments(rawLine, 'python')
      if (!line) { idx++; continue }
      if (indentOf(rawLine) !== indent) break
      let mm: RegExpMatchArray | null
      if ((mm = line.match(/^elif\s+(.+)\s*:$/))) {
        idx++
        elifs.push({ cond: canonArg(mm[1]), body: parseBlock(indent + 4) })
      } else if (/^else\s*:/.test(line)) {
        idx++
        els = parseBlock(indent + 4)
        break
      } else break
    }
    return { k: 'if', cond: canonArg(cond), then, elifs, els }
  }

  const parseBlock = (indent: number): IrNode[] => {
    const body: IrNode[] = []
    while (idx < lines.length) {
      const rawLine = lines[idx]
      const line = stripComments(rawLine, 'python')
      if (!line) { idx++; continue }
      const cur = indentOf(rawLine)
      if (cur < indent) break
      if (cur > indent) { issues.push({ line: idx + 1, text: 'indentación inesperada: línea ignorada' }); idx++; continue }
      // parsePyLine solo avanza idx en sentencias de bloque (def/for/while/if);
      // las simples no lo hacen: si no avanzó, avanza aquí (evita bucle infinito)
      const before = idx
      body.push(parsePyLine(line, indent))
      if (idx === before) idx++
    }
    return body
  }

  const body = parseBlock(0)
  return { body, issues }
}

/* ─────────────────────────── parser llaves / Ruby ─────────────────────────── */

function parseBraces(src: string, lang: TransLang): Parsed {
  const issues: TranslateIssue[] = []
  const cleaned = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const lines = cleaned
    .split('\n')
    .map((l) => (lang === 'ruby' ? l.replace(/#(?!{).*/, '') : stripComments(l, lang)))
  let idx = 0

  const isBlockClose = (line: string): boolean =>
    lang === 'ruby' ? /^end\b/.test(line) : /^[}\)]\s*;?$/.test(line)

  const parseBlock = (): IrNode[] => {
    const body: IrNode[] = []
    while (idx < lines.length) {
      let line = lines[idx].trim()
      if (!line) { idx++; continue }
      if (isBlockClose(line)) { idx++; break }
      // "} else if (...) {" → separar el cierre del encabezado
      if (line.startsWith('}')) {
        const rest = line.slice(1).trim()
        if (!rest) { idx++; continue }
        if (/^(else\b|elsif\b)/.test(rest)) break // lo gestiona la cadena del if
        line = rest
      }
      // preámbulos de lenguajes: ignorar
      if (/^<\?php$/.test(line) || /^#!/.test(line) || /^(package|using|import|namespace|from\s+\w+\s+import)\b/.test(line)) { idx++; continue }
      if (/^(?:(?:public|private|protected|internal)\s+)*(?:(?:final|abstract|sealed|static)\s+)*(?:class|interface|struct|enum)\s+\w+[^{]*\{$/.test(line)) { idx++; continue }
      if (lang === 'ruby' && /^(elsif|else)\b/.test(line)) break // cadena del if
      // parseLine solo avanza idx en sentencias de bloque; si no avanzó, avanza aquí (evita bucle infinito)
      const before = idx
      body.push(parseLine(line))
      if (idx === before) idx++
    }
    return body
  }

  const parseLine = (line: string): IrNode => {
    let m: RegExpMatchArray | null
    if (line.startsWith('//') || line.startsWith('#')) return { k: 'comment', text: line.replace(/^\/\/+\s*|^#+\s*/, '').trim() }

    /* --- if / elsif / else if --- */
    if (lang === 'ruby' && (m = line.match(/^if\s+(.+?)\s*$/))) {
      idx++
      return finishIfChain(m[1])
    }
    if ((m = line.match(/^if\s*\((.+?)\)\s*\{$/)) || (m = line.match(/^if\s*\((.+?)\)\s*$/))) {
      idx++
      return finishIfChain(m[1])
    }
    if (/^(else\s+if|elsif)/.test(line)) { issues.push({ line: idx + 1, text: 'else if huérfano: marcado como no traducido' }); return { k: 'raw', text: line, line: idx + 1 } }

    /* --- while --- */
    if (lang === 'ruby' && (m = line.match(/^while\s+(.+?)\s*$/))) { idx++; return { k: 'while', cond: canonArg(m[1]), body: parseBlock() } }
    if ((m = line.match(/^while\s*\((.+?)\)\s*\{$/)) || (m = line.match(/^while\s*\((.+?)\)\s*$/))) {
      idx++
      return { k: 'while', cond: canonArg(m[1]), body: parseBlock() }
    }

    /* --- for clásico → forr --- */
    if ((m = line.match(/^for\s*\(([^)]*)\)\s*\{$/)) || (m = line.match(/^for\s*\(([^)]*)\)\s*$/))) {
      const parts = m[1].split(';').map((s) => s.trim())
      if (parts.length === 3) {
        const initm = parts[0].match(/(?:(?:let|var|const|int|long|double|float|string|String)\s+)?([A-Za-z_]\w*)\s*:?=\s*(.+)/)
        const condm = parts[1].match(/([A-Za-z_]\w*)\s*(<=|<|>=|>)\s*(.+)/)
        if (initm && condm && (condm[2] === '<' || condm[2] === '<=')) {
          idx++
          let endv = canonArg(condm[3])
          if (condm[2] === '<=') endv = `(${endv} + 1)`
          return { k: 'forr', v: initm[1], start: canonArg(initm[2]), end: endv, body: parseBlock() }
        }
      }
    }

    /* --- foreach: for-of, for-in java, foreach php/c#, range go, each ruby, times ruby --- */
    if ((m = line.match(/^for\s*\(\s*(?:const|let|var|final)?\s*[\w<>\[\], ]*\s*([A-Za-z_]\w*)\s+(?:of|in)\s+(.+?)\s*\)\s*\{$/))) {
      idx++
      return { k: 'foreach', v: m[1], iter: canonArg(m[2]), body: parseBlock() }
    }
    if (lang === 'php' && (m = line.match(/^foreach\s*\(\s*\$(\w+)\s+as\s+\$(\w+)\s*=>\s*\$(\w+)\s*\)\s*\{$/))) {
      idx++
      return { k: 'foreach', iv: m[2], v: m[3], iter: canonArg(m[1]), body: parseBlock() }
    }
    if (lang === 'php' && (m = line.match(/^foreach\s*\(\s*\$(\w+)\s+as\s+\$(\w+)\s*\)\s*\{$/))) {
      idx++
      return { k: 'foreach', v: m[2], iter: canonArg(m[1]), body: parseBlock() }
    }
    if (lang === 'go' && (m = line.match(/^for\s+([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*:=\s*range\s+(.+?)\s*\{$/))) {
      idx++
      return { k: 'foreach', iv: m[1], v: m[2], iter: canonArg(m[3]), body: parseBlock() }
    }
    if (lang === 'go' && (m = line.match(/^for\s+([A-Za-z_]\w*)\s*:=\s*range\s+(.+?)\s*\{$/))) {
      idx++
      return { k: 'foreach', v: m[1], iter: canonArg(m[2]), body: parseBlock() }
    }
    if (lang === 'ruby' && (m = line.match(/^(.+?)\.each_with_index\s+do\s*\|([^|]+)\|\s*$/))) {
      idx++
      const vars = m[2].split(',').map((s) => s.trim())
      return { k: 'foreach', iv: vars[0], v: vars[1] ?? 'i', iter: canonArg(m[1]), body: parseBlock() }
    }
    if (lang === 'ruby' && (m = line.match(/^(.+?)\.each(?:_with_index)?\s*\{\s*\|([^|]+)\|\s*$/))) {
      idx++
      return { k: 'foreach', v: m[2].trim(), iter: canonArg(m[1]), body: parseBlock() }
    }
    if (lang === 'ruby' && (m = line.match(/^(.+?)\.each\s+do\s*\|([^|]+)\|\s*$/))) {
      idx++
      return { k: 'foreach', v: m[2].trim(), iter: canonArg(m[1]), body: parseBlock() }
    }
    if (lang === 'ruby' && (m = line.match(/^(.+?)\.times\s+do\s*\|([^|]+)\|\s*$/))) {
      idx++
      return { k: 'forr', v: m[2].trim(), start: '0', end: canonArg(m[1]), body: parseBlock() }
    }

    /* --- funciones --- */
    if ((m = line.match(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{$/))) {
      idx++
      return { k: 'func', name: m[1], params: splitParams(m[2]), body: parseBlock() }
    }
    if ((lang === 'javascript' || lang === 'typescript') && (m = line.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{$/))) {
      idx++
      return { k: 'func', name: m[1], params: splitParams(m[2]), body: parseBlock() }
    }
    if (lang === 'ruby' && (m = line.match(/^def\s+([A-Za-z_]\w*)\s*\(?\s*([^)]*?)\s*\)?\s*$/))) {
      idx++
      return { k: 'func', name: m[1], params: m[2] ? m[2].split(',').map((p) => p.trim()).filter(Boolean) : [], body: parseBlock() }
    }
    if ((m = line.match(/^(?:def|fn)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{$/))) {
      idx++
      return { k: 'func', name: m[1], params: splitParams(m[2]), body: parseBlock() }
    }
    if ((lang === 'java' || lang === 'csharp') && (m = line.match(/^(?:(?:public|private|protected)\s+)?(?:static\s+)?[\w<>\[\],\s]+?\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\{$/))) {
      idx++
      return { k: 'func', name: m[1], params: m[2].split(',').map((p) => (p.trim().split(/\s+/).pop() ?? '').replace(/^\$/, '')).filter(Boolean), body: parseBlock() }
    }

    /* --- return / break / continue --- */
    if ((m = line.match(/^return\b\s*(.*?);?\s*$/))) return { k: 'return', expr: m[1] ? canonArg(m[1]) : undefined }
    if (/^break;?\s*$/.test(line)) return { k: 'break' }
    if (/^continue;?\s*$/.test(line)) return { k: 'continue' }

    /* --- prints --- */
    if ((m = line.match(/^(?:console\.log|fmt\.Println|System\.out\.println|Console\.WriteLine|puts|echo)\s*\(?(.*?)\)?;?\s*$/)) && line) {
      let args = m[1] ?? ''
      if (lang === 'ruby') args = args.replace(/^\((.*)\)$/, '$1')
      const parts = splitTop(args, ',').filter((s) => s && s !== ';')
      return { k: 'print', args: parts.map((p) => canonArgPhp(lang, p)).join(', ') }
    }

    /* --- asignaciones --- */
    if (lang === 'go' && (m = line.match(/^([A-Za-z_]\w*)\s*(\+|-|\*|\/)?=\s*(.+?);?\s*$/))) {
      const decl = !m[2] && line.includes(':=') || line.includes(':=')
      const name = m[1]
      const expr = m[2]
        ? canonArgPhp(lang, `${name} ${m[2]} ${m[3]}`)
        : canonArgPhp(lang, m[3])
      return { k: 'assign', name, expr, decl }
    }
    if ((lang === 'javascript' || lang === 'typescript') && (m = line.match(/^(?:let|const|var)\s+([A-Za-z_]\w*)\s*=\s*(.+?);?\s*$/)))
      return { k: 'assign', name: m[1], expr: canonArgPhp(lang, m[2]), decl: true }
    if (lang === 'php' && (m = line.match(/^\$(\w+)\s*(\+|-|\*|\/)?=\s*(.+?);?\s*$/))) {
      const name = m[1]
      const expr = m[2] ? canonArgPhp(lang, `${name} ${m[2]} ${m[3]}`) : canonArgPhp(lang, m[3])
      return { k: 'assign', name, expr, decl: !m[2] }
    }
    if ((lang === 'java' || lang === 'csharp') && (m = line.match(/^(?:(?:final\s+)?(?:var|[\w<>\[\]]+))\s+([A-Za-z_]\w*)\s*=\s*(.+?);?\s*$/)))
      return { k: 'assign', name: m[1], expr: canonArgPhp(lang, m[2]), decl: true }
    if ((m = line.match(/^([A-Za-z_]\w*)\s*(\+|-|\*|\/)=\s*(.+?);?\s*$/)))
      return { k: 'assign', name: m[1], expr: canonArgPhp(lang, `${m[1]} ${m[2]} ${m[3]}`), decl: false }
    if ((m = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+?);?\s*$/)))
      return { k: 'assign', name: m[1], expr: canonArgPhp(lang, m[2]), decl: false }

    /* --- expresiones sueltas --- */
    if ((m = line.match(/^([A-Za-z_][\w.]*)\s*\(.*\);?\s*$/))) return { k: 'expr', expr: canonArgPhp(lang, line.replace(/;$/, '')) }
    issues.push({ line: idx + 1, text: `línea no reconocida: "${line.slice(0, 48)}"` })
    return { k: 'raw', text: line, line: idx + 1 }
  }

  /* cadena if completa: then + elsif/else-if + else */
  const finishIfChain = (cond: string): IrNode => {
    const then = parseBlock()
    const elifs: { cond: string; body: IrNode[] }[] = []
    let els: IrNode[] = []
    while (idx < lines.length) {
      let l2 = lines[idx].trim()
      if (!l2) { idx++; continue }
      if (l2.startsWith('}')) {
        const rest = l2.slice(1).trim()
        if (!rest) { idx++; continue }
        if (!/^(else\b|elsif\b)/.test(rest)) break
        l2 = rest
      }
      if (lang === 'ruby' ? !/^(elsif|else)\b/.test(l2) : !/^(else\s+if|else)\b/.test(l2)) break
      let mm: RegExpMatchArray | null
      if ((mm = l2.match(/^else\s+if\s*\((.+?)\)\s*\{$/)) || (mm = l2.match(/^elsif\s+(.+?)\s*$/))) {
        idx++
        elifs.push({ cond: canonArg(mm[1]), body: parseBlock() })
      } else if (/^else\b\s*\{?$/.test(l2)) {
        idx++
        els = parseBlock()
        break
      } else break
    }
    return { k: 'if', cond: canonArg(cond), then, elifs, els }
  }

  const canonArgPhp = (lg: TransLang, e: string): string => {
    let x = canonArg(e)
    if (lg === 'php') x = x.replace(/\$(\w+)/g, '$1').replace(/\s*\.\s*/g, ' + ')
    return x
  }

  const body = parseBlock()
  return { body, issues }
}

const splitParams = (raw: string): string[] =>
  raw.split(',').map((p) => p.trim().split(/[:\s]/)[0].replace(/^\$/, '').replace(/^\w+\s+/, '')).filter(Boolean)

/* ─────────────────────────── emisores ─────────────────────────── */

const tmplParts = (expr: string): { is: boolean; parts: { s?: string; e?: string }[] } => {
  const full = expr.match(/^(["'`])([\s\S]*)\1$/)
  if (full && full[2].includes('${')) {
    const parts: { s?: string; e?: string }[] = []
    const re = /\$\{([^{}]+)\}/g
    let last = 0
    let g: RegExpExecArray | null
    while ((g = re.exec(full[2]))) {
      if (g.index > last) parts.push({ s: full[2].slice(last, g.index) })
      parts.push({ e: g[1] })
      last = g.index + g[0].length
    }
    if (last < full[2].length) parts.push({ s: full[2].slice(last) })
    return { is: true, parts }
  }
  return { is: false, parts: [] }
}

const emitTemplate = (expr: string, to: TransLang): string => {
  const { is, parts } = tmplParts(expr)
  if (!is || !parts.some((p) => p.e)) return expr
  switch (to) {
    case 'python': return `f"${parts.map((p) => (p.e ? `{${p.e}}` : p.s)).join('')}"`
    case 'javascript':
    case 'typescript': return '`' + parts.map((p) => (p.e ? `\${${p.e}}` : p.s)).join('') + '`'
    case 'ruby': return `"${parts.map((p) => (p.e ? `#{${p.e}}` : p.s)).join('')}"`
    case 'php': return `"${parts.map((p) => (p.e ? `{$${p.e}}` : p.s)).join('')}"`
    case 'go': {
      const fmt = parts.map((p) => (p.e ? '%v' : p.s)).join('')
      const args = parts.filter((p) => p.e).map((p) => p.e).join(', ')
      return args ? `fmt.Sprintf("${fmt}", ${args})` : `"${fmt}"`
    }
    case 'java': return parts.map((p) => (p.e ? p.e : `"${p.s}"`)).join(' + ')
    case 'csharp': return `$"${parts.map((p) => (p.e ? `{${p.e}}` : p.s)).join('')}"`
  }
}

/* expansión de canónicos con paréntesis balanceados: soporta anidación (INT(INPUT(x)))
   que los regex planos no pueden convertir. Respeta comillas al buscar el cierre. */
const CANON_KINDS = 'LEN|STR|INT|FLOAT|FLOOR|UP|LOW|ABS|INPUT'
const expandCanon = (s: string, f: (kind: string, inner: string) => string): string => {
  for (;;) {
    const m = s.match(new RegExp(`\\b(${CANON_KINDS})\\(`))
    if (!m || m.index === undefined) return s
    let depth = 0
    let inStr: string | null = null
    let end = -1
    for (let i = m.index + m[0].length - 1; i < s.length; i++) {
      const c = s[i]
      if (inStr) { if (c === inStr) inStr = null; continue }
      if (c === '"' || c === "'") { inStr = c; continue }
      if (c === '(') depth++
      else if (c === ')') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end < 0) return s
    const inner = expandCanon(s.slice(m.index + m[0].length, end), f)
    s = s.slice(0, m.index) + f(m[1], inner) + s.slice(end + 1)
  }
}

type CanonMap = Record<string, (v: string) => string>
const JS_CANON: CanonMap = {
  LEN: (v) => `(${v}).length`, STR: (v) => `String(${v})`, INT: (v) => `parseInt(${v})`, FLOAT: (v) => `parseFloat(${v})`,
  FLOOR: (v) => `Math.floor(${v})`, UP: (v) => `(${v}).toUpperCase()`, LOW: (v) => `(${v}).toLowerCase()`, ABS: (v) => `Math.abs(${v})`, INPUT: (v) => `(prompt(${v}) ?? "")`,
}
const CANON_MAPS: Record<TransLang, CanonMap> = {
  python: { LEN: (v) => `len(${v})`, STR: (v) => `str(${v})`, INT: (v) => `int(${v})`, FLOAT: (v) => `float(${v})`, FLOOR: (v) => `math.floor(${v})`, UP: (v) => `(${v}).upper()`, LOW: (v) => `(${v}).lower()`, ABS: (v) => `abs(${v})`, INPUT: (v) => `input(${v})` },
  javascript: JS_CANON,
  typescript: JS_CANON,
  java: { LEN: (v) => `(${v}).length()`, STR: (v) => `String.valueOf(${v})`, INT: (v) => `Integer.parseInt(${v})`, FLOAT: (v) => `Float.parseFloat(${v})`, FLOOR: (v) => `(int) Math.floor(${v})`, UP: (v) => `(${v}).toUpperCase()`, LOW: (v) => `(${v}).toLowerCase()`, ABS: (v) => `Math.abs(${v})`, INPUT: (v) => `input(${v})` },
  csharp: { LEN: (v) => `(${v}).Length`, STR: (v) => `Convert.ToString(${v})`, INT: (v) => `int.Parse(${v})`, FLOAT: (v) => `double.Parse(${v})`, FLOOR: (v) => `Math.Floor(${v})`, UP: (v) => `(${v}).ToUpper()`, LOW: (v) => `(${v}).ToLower()`, ABS: (v) => `Math.Abs(${v})`, INPUT: (v) => `Input(${v})` },
  go: { LEN: (v) => `len(${v})`, STR: (v) => `fmt.Sprintf("%v", ${v})`, INT: (v) => `strconv.Atoi(${v})`, FLOAT: (v) => `strconv.ParseFloat(${v}, 64)`, FLOOR: (v) => `math.Floor(${v})`, UP: (v) => `strings.ToUpper(${v})`, LOW: (v) => `strings.ToLower(${v})`, ABS: (v) => `math.Abs(${v})`, INPUT: (v) => `input(${v})` },
  ruby: { LEN: (v) => `(${v}).length`, STR: (v) => `(${v}).to_s`, INT: (v) => `(${v}).to_i`, FLOAT: (v) => `(${v}).to_f`, FLOOR: (v) => `(${v}).floor`, UP: (v) => `(${v}).upcase`, LOW: (v) => `(${v}).downcase`, ABS: (v) => `(${v}).abs`, INPUT: (v) => (v ? `input(${v})` : 'gets.chomp') },
  php: { LEN: (v) => `strlen(${v})`, STR: (v) => `strval(${v})`, INT: (v) => `intval(${v})`, FLOAT: (v) => `floatval(${v})`, FLOOR: (v) => `floor(${v})`, UP: (v) => `strtoupper(${v})`, LOW: (v) => `strtolower(${v})`, ABS: (v) => `abs(${v})`, INPUT: (v) => `readline(${v})` },
}

const emitCanon = (expr: string, to: TransLang): string => {
  let x = emitTemplate(expr, to)
  switch (to) {
    case 'python': x = x.replace(/\bNULL\b/g, 'None'); break
    case 'ruby': x = x.replace(/\bNULL\b/g, 'nil'); break
    case 'go': x = x.replace(/\bNULL\b/g, 'nil'); break
    default: x = x.replace(/\bNULL\b/g, 'null')
  }
  if (to === 'php') x = x.replace(/\$(\w+)/g, '$$$1') // (idempotente)
  const map = CANON_MAPS[to]
  return expandCanon(x, (kind, inner) => map[kind]?.(inner) ?? inner)
}

/* helpers de lectura por teclado para lenguajes que no tienen input() directo */
const INPUT_HELPERS: Partial<Record<TransLang, (ind: string) => string>> = {
  java: (ind) =>
    `${ind}static String input(String msg) {` +
    `${ind}    System.out.print(msg);${ind}    return new java.util.Scanner(System.in).nextLine();${ind}}${ind}`,
  csharp: (ind) =>
    `${ind}static string Input(string msg) {${ind}    Console.Write(msg);${ind}    return Console.ReadLine() ?? "";${ind}}${ind}`,
  go: (ind) =>
    `${ind}func input(msg string) string {\n${ind}\tfmt.Print(msg)\n${ind}\tvar s string\n${ind}\tfmt.Scanln(&s)\n${ind}\treturn s\n${ind}}\n`,
  ruby: (ind) =>
    `${ind}def input(msg)${ind}  print msg${ind}  gets.chomp${ind}end${ind}`,
}

interface EmitCtx {
  usesInput: boolean
  usesMath: boolean
  usesStrings: boolean
}

function emit(nodes: IrNode[], to: TransLang, indent: string, ctx: EmitCtx): string[] {
  const out: string[] = []
  const tab = indent + (to === 'go' ? '\t' : to === 'python' ? '    ' : '  ')
  const brace = to !== 'python' && to !== 'ruby'

  for (const n of nodes) {
    switch (n.k) {
      case 'comment':
        out.push(indent + (to === 'python' || to === 'ruby' ? '# ' : '// ') + n.text)
        break

      case 'assign': {
        if (/INPUT\(/.test(n.expr) && to !== 'python' && to !== 'javascript' && to !== 'typescript' && to !== 'php') ctx.usesInput = true
        if (/FLOOR\(|ABS\(/.test(n.expr)) ctx.usesMath = true
        if (/UP\(|LOW\(/.test(n.expr)) ctx.usesStrings = true
        let expr = emitCanon(n.expr, to)
        if (to === 'java' || to === 'csharp') expr = expr.replace(/\bFMT\((.+)\)/g, 'String.format($1)')
        switch (to) {
          case 'python':
          case 'ruby':
            out.push(indent + `${n.name} = ${expr}`)
            break
          case 'javascript':
          case 'typescript':
            out.push(indent + `${n.decl ? 'let ' : ''}${n.name} = ${expr};`)
            break
          case 'go':
            out.push(indent + (n.decl ? `${n.name} := ${expr}` : `${n.name} = ${expr}`))
            break
          case 'java':
          case 'csharp':
            out.push(indent + `${n.decl ? 'var ' : ''}${n.name} = ${expr};`)
            break
          case 'php':
            out.push(indent + `$${n.name} = ${expr};`)
            break
        }
        break
      }

      case 'print': {
        const args = splitTop(n.args, ',').map((a) => emitCanon(a, to))
        if (args.some((a) => /INPUT\(/.test(a)) && to !== 'python' && to !== 'javascript' && to !== 'typescript' && to !== 'php') ctx.usesInput = true
        switch (to) {
          case 'python': out.push(indent + `print(${args.join(', ')})`); break
          case 'javascript':
          case 'typescript': out.push(indent + `console.log(${args.join(', ')});`); break
          case 'java': out.push(indent + `System.out.println(${args.join(' + ')});`); break
          case 'csharp': out.push(indent + `Console.WriteLine(${args.join(' + ')});`); break
          case 'go': out.push(indent + `fmt.Println(${args.join(', ')})`); break
          case 'ruby': out.push(indent + `puts ${args.join(', ')}`); break
          case 'php': out.push(indent + `echo ${args.join(' . ')};`); break
        }
        break
      }

      case 'if': {
        const cond = emitCanon(n.cond, to)
        if (/INPUT\(/.test(n.cond) && to !== 'python' && to !== 'javascript' && to !== 'typescript' && to !== 'php') ctx.usesInput = true
        if (to === 'python') {
          out.push(indent + `if ${cond}:`)
          out.push(...emit(n.then, to, tab, ctx))
        } else if (to === 'ruby') {
          out.push(indent + `if ${cond}`)
          out.push(...emit(n.then, to, tab, ctx))
        } else {
          out.push(indent + `if (${cond}) {`)
          out.push(...emit(n.then, to, tab, ctx))
        }
        for (const el of n.elifs) {
          const c = emitCanon(el.cond, to)
          if (to === 'python') { out.push(indent + `elif ${c}:`); out.push(...emit(el.body, to, tab, ctx)) }
          else if (to === 'ruby') { out.push(indent + `elsif ${c}`); out.push(...emit(el.body, to, tab, ctx)) }
          else if (to === 'go') { out.push(indent + `} else if ${c} {`); out.push(...emit(el.body, to, tab, ctx)) }
          else { out.push(indent + `} else if (${c}) {`); out.push(...emit(el.body, to, tab, ctx)) }
        }
        if (n.els.length) {
          if (to === 'python') { out.push(indent + 'else:'); out.push(...emit(n.els, to, tab, ctx)) }
          else if (to === 'ruby') { out.push(indent + 'else'); out.push(...emit(n.els, to, tab, ctx)) }
          else { out.push(indent + '} else {'); out.push(...emit(n.els, to, tab, ctx)) }
        }
        if (brace) out.push(indent + '}')
        if (to === 'ruby') out.push(indent + 'end')
        break
      }

      case 'while': {
        const cond = emitCanon(n.cond, to)
        if (to === 'python') { out.push(indent + `while ${cond}:`); out.push(...emit(n.body, to, tab, ctx)) }
        else if (to === 'ruby') { out.push(indent + `while ${cond}`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + 'end') }
        else if (to === 'go') { out.push(indent + `for ${cond} {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        else { out.push(indent + `while (${cond}) {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        break
      }

      case 'forr': {
        const s = emitCanon(n.start, to)
        const e = emitCanon(n.end, to)
        if (to === 'python') { out.push(indent + `for ${n.v} in range(${s}, ${e}):`); out.push(...emit(n.body, to, tab, ctx)) }
        else if (to === 'ruby') { out.push(indent + `(${s}...${e}).each do |${n.v}|`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + 'end') }
        else if (to === 'go') { out.push(indent + `for ${n.v} := ${s}; ${n.v} < ${e}; ${n.v}++ {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        else if (to === 'javascript' || to === 'typescript') { out.push(indent + `for (let ${n.v} = ${s}; ${n.v} < ${e}; ${n.v}++) {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        else if (to === 'java') { out.push(indent + `for (int ${n.v} = ${s}; ${n.v} < ${e}; ${n.v}++) {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        else if (to === 'csharp') { out.push(indent + `for (int ${n.v} = ${s}; ${n.v} < ${e}; ${n.v}++) {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        else if (to === 'php') { out.push(indent + `for ($${n.v} = ${s}; $${n.v} < ${e}; $${n.v}++) {`); out.push(...emit(n.body, to, tab, ctx)); out.push(indent + '}') }
        break
      }

      case 'foreach': {
        const iter = emitCanon(n.iter, to)
        if (to === 'python') {
          out.push(indent + (n.iv ? `for ${n.iv}, ${n.v} in enumerate(${iter}):` : `for ${n.v} in ${iter}:`))
          out.push(...emit(n.body, to, tab, ctx))
        } else if (to === 'ruby') {
          out.push(indent + (n.iv ? `${iter}.each_with_index do |${n.iv}, ${n.v}|` : `${iter}.each do |${n.v}|`))
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + 'end')
        } else if (to === 'go') {
          out.push(indent + (n.iv ? `for ${n.iv}, ${n.v} := range ${iter} {` : `for _, ${n.v} := range ${iter} {`))
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'javascript' || to === 'typescript') {
          out.push(indent + `for (const ${n.v} of ${iter}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'java') {
          out.push(indent + `for (var ${n.v} : ${iter}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'csharp') {
          out.push(indent + `foreach (var ${n.v} in ${iter}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'php') {
          out.push(indent + (n.iv ? `foreach (${iter} as $${n.iv} => $${n.v}) {` : `foreach (${iter} as $${n.v}) {`))
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        }
        break
      }

      case 'func': {
        const params = n.params.map((p) => emitCanon(p, to))
        if (to === 'python') {
          out.push(indent + `def ${n.name}(${params.join(', ')}):`)
          out.push(...emit(n.body, to, tab, ctx))
        } else if (to === 'ruby') {
          out.push(indent + `def ${n.name}(${params.join(', ')})`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + 'end')
        } else if (to === 'go') {
          out.push(indent + `func ${n.name}(${params.map((p) => p + ' string').join(', ')}) string {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'javascript' || to === 'typescript') {
          out.push(indent + `function ${n.name}(${params.join(', ')}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'php') {
          out.push(indent + `function ${n.name}(${params.map((p) => '$' + p).join(', ')}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'java') {
          const ret = hasReturn(n.body) ? 'static Object' : 'static void'
          out.push(indent + `${ret} ${n.name}(${params.map((p) => 'Object ' + p).join(', ')}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        } else if (to === 'csharp') {
          const ret = hasReturn(n.body) ? 'static object' : 'static void'
          out.push(indent + `${ret} ${n.name}(${params.map((p) => 'object ' + p).join(', ')}) {`)
          out.push(...emit(n.body, to, tab, ctx))
          out.push(indent + '}')
        }
        break
      }

      case 'return': {
        const e = n.expr ? emitCanon(n.expr, to) : ''
        if (to === 'python' || to === 'ruby' || to === 'go') out.push(indent + (e ? `return ${e}` : 'return'))
        else out.push(indent + (e ? `return ${e};` : 'return;'))
        break
      }

      case 'break': out.push(indent + (to === 'python' || to === 'ruby' ? 'break' : 'break;')); break
      case 'continue': out.push(indent + (to === 'python' || to === 'ruby' ? 'continue' : 'continue;')); break
      case 'expr': out.push(indent + emitCanon(n.expr, to) + (to === 'python' || to === 'ruby' || to === 'go' ? '' : ';')); break
      case 'raw':
        out.push(indent + (to === 'python' || to === 'ruby' ? `# TODO (línea ${n.line}): traducir a mano → ${n.text}` : `// TODO (línea ${n.line}): traducir a mano → ${n.text}`))
        break
    }
  }
  return out
}

/* ─────────────────────────── API principal ─────────────────────────── */

const TARGET_NOTES: Record<TransLang, string[]> = {
  python: ['Los tipos son dinámicos: no hace falta declarar nada.', 'Si se usa math.floor() se añade "import math" automáticamente.'],
  javascript: ['Los literales con interpolación se emiten como template strings (backticks).', 'LEN() se emite como .length: vale para strings y arrays.'],
  typescript: ['El código se emite sin anotaciones de tipos: añade las tuyas si quieres strict mode.'],
  java: ['Se genera el esqueleto public class Main + main() automáticamente.', 'Las funciones usan parámetros Object: ajusta tipos si haces aritmética.', 'Si hay lectura de teclado se añade un helper input() con Scanner.'],
  csharp: ['Se genera el esqueleto class Program + Main() automáticamente.', 'Las funciones usan parámetros object: ajusta tipos si haces aritmética.', 'LEN() → .Length (strings y arrays).'],
  go: ['Los parámetros de funciones se emiten como string: Go exige tipos reales, ajústalos.', 'Los bucles foreach usan range: el índice va con _ si no se usa.', 'Si hay lectura de teclado se añade un helper input() con fmt.Scanln.'],
  ruby: ['puts añade salto de línea; para imprimir sin salto usa print a mano.', 'range(a, b) de Python se emite como (a...b) (exclusivo, igual que Python).'],
  php: ['Las variables se anteponen con $ automáticamente.', 'La concatenación se emite con punto (.) en echo.', 'LEN() → strlen(): para arrays usa count() a mano.'],
}

export function translate(src: string, from: TransLang, to: TransLang): TranslateResult {
  if (from === to) {
    return {
      code: src,
      stats: { statements: 0, translated: 0, raw: 0, funcs: 0, lines: src.split('\n').length },
      confidence: 100,
      issues: [],
      notes: ['Origen y destino son el mismo lenguaje: se devuelve el código tal cual.'],
    }
  }

  const parsed = from === 'python' ? parsePython(src) : parseBraces(src, from)
  const ctx: EmitCtx = { usesInput: false, usesMath: false, usesStrings: false }
  const bodyLines: string[] = []
  const funcs = parsed.body.filter((n) => n.k === 'func')
  const mainBody = parsed.body.filter((n) => n.k !== 'func')

  if (to === 'java') {
    const main = emit(mainBody, to, '    ', ctx)
    const fnDefs = funcs.flatMap((f) => emit([f], to, '    ', ctx))
    bodyLines.push('public class Main {', '    public static void main(String[] args) {')
    bodyLines.push(...main)
    bodyLines.push('    }')
    if (fnDefs.length) bodyLines.push('')
    bodyLines.push(...fnDefs)
    if (ctx.usesInput) bodyLines.push(...(INPUT_HELPERS.java?.('    ') ?? '').split('\n').filter(Boolean).flatMap((l) => l.split('    ').length ? [l] : [l]))
    bodyLines.push('}')
  } else if (to === 'csharp') {
    const main = emit(mainBody, to, '    ', ctx)
    const fnDefs = funcs.flatMap((f) => emit([f], to, '    ', ctx))
    bodyLines.push('using System;', '', 'class Program {', '    static void Main() {')
    bodyLines.push(...main)
    bodyLines.push('    }')
    if (fnDefs.length) bodyLines.push('')
    bodyLines.push(...fnDefs)
    if (ctx.usesInput) bodyLines.push(...(INPUT_HELPERS.csharp?.('    ') ?? '').replace(/ {4}Console/g, '    Console').split('\n'))
    bodyLines.push('}')
  } else if (to === 'go') {
    const main = emit(mainBody, to, '\t', ctx)
    const fnDefs = funcs.flatMap((f) => emit([f], to, '', ctx))
    const joined = main.join('\n') + fnDefs.join('\n')
    const imps = ['fmt']
    if (/math\.(Floor|Abs)/.test(joined)) imps.push('math')
    if (/strings\.(ToUpper|ToLower)/.test(joined)) imps.push('strings')
    if (/strconv\./.test(joined)) imps.push('strconv')
    bodyLines.push('package main', '', 'import (', ...imps.map((i) => `\t"${i}"`), ')', '')
    bodyLines.push('func main() {', ...main, '}')
    if (ctx.usesInput) bodyLines.push('', ...(INPUT_HELPERS.go?.('') ?? '').split('\n').filter(Boolean))
    if (fnDefs.length) bodyLines.push('', ...fnDefs)
  } else if (to === 'ruby' && ctx) {
    const main = emit(mainBody, to, '', ctx)
    const fnDefs = funcs.flatMap((f) => emit([f], to, '', ctx))
    bodyLines.push(...fnDefs)
    if (fnDefs.length) bodyLines.push('')
    bodyLines.push(...main)
    if (ctx.usesInput) bodyLines.push('', ...(INPUT_HELPERS.ruby?.('') ?? '').split('\n').filter(Boolean))
  } else {
    bodyLines.push(...emit(parsed.body, to, '', ctx))
  }

  if (to === 'python') {
    const joined = bodyLines.join('\n')
    if (/\bmath\.floor\(/.test(joined)) bodyLines.unshift('import math', '')
  }

  const code = bodyLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
  const statements = countAll(parsed.body)
  const raws = countRaw(parsed.body)
  const translated = statements - raws
  const confidence = statements === 0 ? 0 : Math.round((translated / statements) * 100)

  const notes = [...TARGET_NOTES[to]]
  if (raws > 0) notes.unshift(`${raws} sentencia(s) NO se han podido traducir automáticamente: aparecen como TODO con su línea original.`)
  if (from === 'java' || from === 'csharp') notes.push('Origen Java/C#: solo se traduce el cuerpo de los métodos; clases y tipos se simplifican.')
  if (from === 'go') notes.push('Origen Go: el manejo de errores (valores de retorno múltiples) no se traduce.')

  return {
    code,
    stats: { statements, translated, raw: raws, funcs: countFuncs(parsed.body), lines: code.split('\n').length },
    confidence,
    issues: parsed.issues,
    notes,
  }
}

/* ejemplos listos para cargar en la UI (uno por lenguaje de origen) */
export const TRANS_EXAMPLES: Record<TransLang, string> = {
  python: `# Escáner didáctico: saluda y lista protocolos\ndef saluda(nombre, veces):\n    mensaje = f"Hola, {nombre}!"\n    for i in range(0, veces):\n        print(mensaje)\n    return mensaje\n\nusuario = input("¿Cómo te llamas? ")\nsaluda(usuario, 3)\n\nprotocolos = ["SSH", "HTTP", "DNS"]\nfor p in protocolos:\n    if p == "SSH":\n        print("22/tcp " + p)\n    else:\n        print("¿? " + p)\n\ni = 0\nwhile i < len(protocolos):\n    print(str(i) + " → " + protocolos[i])\n    i += 1`,
  javascript: `// Escáner didáctico: saluda y lista protocolos\nfunction saluda(nombre, veces) {\n  const mensaje = \`Hola, \${nombre}!\`;\n  for (let i = 0; i < veces; i++) {\n    console.log(mensaje);\n  }\n  return mensaje;\n}\n\nconst usuario = prompt("¿Cómo te llamas? ") ?? "ADA";\nsaluda(usuario, 3);\n\nconst protocolos = ["SSH", "HTTP", "DNS"];\nfor (const p of protocolos) {\n  if (p == "SSH") {\n    console.log("22/tcp " + p);\n  } else {\n    console.log("¿? " + p);\n  }\n}`,
  typescript: `function saluda(nombre: string, veces: number): string {\n  const mensaje = \`Hola, \${nombre}!\`;\n  for (let i = 0; i < veces; i++) {\n    console.log(mensaje);\n  }\n  return mensaje;\n}\n\nconst protocolos = ["SSH", "HTTP", "DNS"];\nsaluda("ADA", 2);\nfor (const p of protocolos) {\n  console.log(p);\n}`,
  java: `public class Demo {\n    public static void saluda(String nombre, int veces) {\n        String mensaje = "Hola, " + nombre + "!";\n        for (int i = 0; i < veces; i++) {\n            System.out.println(mensaje);\n        }\n    }\n\n    public static void main(String[] args) {\n        saluda("ADA", 3);\n        String[] protocolos = {"SSH", "HTTP", "DNS"};\n        for (String p : protocolos) {\n            System.out.println(p);\n        }\n    }\n}`,
  csharp: `using System;\n\nclass Program {\n    static void Saluda(string nombre, int veces) {\n        var mensaje = $"Hola, {nombre}!";\n        for (int i = 0; i < veces; i++) {\n            Console.WriteLine(mensaje);\n        }\n    }\n\n    static void Main() {\n        Saluda("ADA", 3);\n        var protocolos = new[] {"SSH", "HTTP", "DNS"};\n        foreach (var p in protocolos) {\n            Console.WriteLine(p);\n        }\n    }\n}`,
  go: `package main\n\nimport "fmt"\n\nfunc saluda(nombre string, veces int) {\n\tmensaje := fmt.Sprintf("Hola, %v!", nombre)\n\tfor i := 0; i < veces; i++ {\n\t\tfmt.Println(mensaje)\n\t}\n}\n\nfunc main() {\n\tprotocolos := []string{"SSH", "HTTP", "DNS"}\n\tsaluda("ADA", 3)\n\tfor _, p := range protocolos {\n\t\tfmt.Println(p)\n\t}\n}`,
  ruby: `def saluda(nombre, veces)\n  mensaje = "Hola, #{nombre}!"\n  veces.times do |i|\n    puts mensaje\n  end\n  mensaje\nend\n\nprotocolos = ["SSH", "HTTP", "DNS"]\nsaluda("ADA", 3)\nprotocolos.each do |p|\n  puts p\nend`,
  php: `<?php\nfunction saluda($nombre, $veces) {\n  $mensaje = "Hola, {$nombre}!";\n  for ($i = 0; $i < $veces; $i++) {\n    echo $mensaje . "\\n";\n  }\n}\n\n$protocolos = ["SSH", "HTTP", "DNS"];\nsaluda("ADA", 3);\nforeach ($protocolos as $p) {\n  echo $p . "\\n";\n}`,
}
