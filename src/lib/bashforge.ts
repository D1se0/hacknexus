/* Generador de scripts Bash por bloques — 100% local.
   Cada bloque se compone de forma declarativa y se emite bash POSIX-friendly
   (con shebang, set -Eeuo pipefail y trap opcional). Cada bloque trae su
   explicación para aprender mientras construyes. */

export interface ForgeBlock {
  id: string
  kind: BlockKind
  params: Record<string, string | number | boolean>
}

export type BlockKind =
  | 'shebang' | 'header' | 'var' | 'array' | 'args' | 'prompt' | 'checkcmd' | 'checkfile'
  | 'confirm' | 'ifcond' | 'forlist' | 'forrange' | 'while' | 'func' | 'case'
  | 'command' | 'nccheck' | 'loopports' | 'logfile' | 'trap' | 'colorlog'

export interface ForgeResult {
  script: string
  lines: number
  warnings: string[]
}

const esc = (s: string): string => s.replace(/"/g, '\\"')

interface BlockDef {
  label: string
  icon: string
  desc: string
  fields: { key: string; label: string; ph?: string; area?: boolean; type?: 'text' | 'number' | 'toggle' | 'select'; options?: string[]; def?: string | number | boolean }[]
  defaults: Record<string, string | number | boolean>
  emit: (p: Record<string, string | number | boolean>) => string
  learn: string
  warn?: (p: Record<string, string | number | boolean>) => string | null
}

/* ─────────────── catálogo de bloques ─────────────── */

export const BLOCK_DEFS: Record<BlockKind, BlockDef> = {
  shebang: {
    label: 'Shebang + modo estricto', icon: '🌱',
    desc: 'La primera línea y el activador de seguridad: el script aborta en errores, variables sin definir y pipes fallidos.',
    fields: [{ key: 'strict', label: 'set -Eeuo pipefail', type: 'toggle', def: true }],
    defaults: { strict: true },
    emit: (p) => `#!/usr/bin/env bash${p.strict ? '\nset -Eeuo pipefail' : ''}`,
    learn: 'set -e aborta al primer error; -u da error si usas una variable no definida; -o pipefail hace que un pipe falle si cualquier comando del pipe falla (no solo el último). El modo estricto evita el 90% de los bugs clásicos de bash.',
  },
  header: {
    label: 'Cabecera / comentarios', icon: '📋',
    desc: 'Comentario de cabecera con nombre, autor, propósito y fecha.',
    fields: [
      { key: 'name', label: 'nombre del script', ph: 'recon.sh', def: 'recon.sh' },
      { key: 'author', label: 'autor', ph: 'tu-nick', def: 'D1se0' },
      { key: 'purpose', label: 'propósito', ph: 'Qué hace el script', area: true, def: 'Recon básico de un host' },
    ],
    defaults: { name: 'recon.sh', author: 'D1se0', purpose: 'Recon básico de un host' },
    emit: (p) => `#\n# ${p.name} — ${p.purpose}\n# autor: ${p.author}\n# generado con HackNexus Bash Forge\n#`,
    learn: 'Una cabecera decente te ahorra releer el script entero dentro de 6 meses. Incluye SIEMPRE qué hace y qué necesita (permisos, binarios, red).',
  },
  var: {
    label: 'Variable', icon: '📦',
    desc: 'Asignación con validación opcional de valor vacío.',
    fields: [
      { key: 'name', label: 'nombre', ph: 'TARGET', def: 'TARGET' },
      { key: 'value', label: 'valor', ph: '10.10.10.5', def: '10.10.10.5' },
      { key: 'required', label: 'abortar si queda vacía', type: 'toggle', def: false },
    ],
    defaults: { name: 'TARGET', value: '10.10.10.5', required: false },
    emit: (p) => {
      const req = p.required ? `\n[ -n "\${${p.name}}" ] || { echo "[!] ${p.name} no puede estar vacío"; exit 1; }` : ''
      return `${p.name}="${esc(String(p.value))}"${req}`
    },
    learn: 'Siempre entre comillas: "$VAR" evita word-splitting y globbing. Las mayúsculas se reservan por convención para variables de entorno/exportadas.',
    warn: (p) => (/\s/.test(String(p.name)) ? 'el nombre de variable contiene espacios: bash no lo permite' : null),
  },
  array: {
    label: 'Array', icon: '🗂️',
    desc: 'Lista de elementos y bucle implícito de ejemplo.',
    fields: [
      { key: 'name', label: 'nombre', ph: 'HOSTS', def: 'HOSTS' },
      { key: 'values', label: 'elementos (uno por línea)', area: true, ph: '10.10.10.5\n10.10.10.6', def: '10.10.10.5\n10.10.10.6' },
    ],
    defaults: { name: 'HOSTS', values: '10.10.10.5\n10.10.10.6' },
    emit: (p) => {
      const items = String(p.values).split('\n').map((v) => v.trim()).filter(Boolean).map((v) => `  "${esc(v)}"`)
      return `${p.name}=(\n${items.join('\n')}\n)\n\nfor item in "\${${p.name}[@]}"; do\n  echo "[*] procesando $item"\ndone`
    },
    learn: '"${arr[@]}" entre comillas itera respetando espacios dentro de cada elemento. Los arrays de bash son 0-indexados y sparse.',
  },
  args: {
    label: 'Argumentos CLI', icon: '⌨️',
    desc: 'Parseo de $1 con valor por defecto y flag -h de ayuda.',
    fields: [
      { key: 'name', label: 'variable', ph: 'TARGET', def: 'TARGET' },
      { key: 'desc', label: 'descripción del argumento', ph: 'host objetivo', def: 'host objetivo' },
      { key: 'default', label: 'valor por defecto', ph: '127.0.0.1', def: '127.0.0.1' },
    ],
    defaults: { name: 'TARGET', desc: 'host objetivo', default: '127.0.0.1' },
    emit: (p) => `${p.name}="\${1:-${esc(String(p.default))}}"\n\nif [ "\${1:-}" = "-h" ] || [ "\${1:-}" = "--help" ]; then\n  echo "uso: $0 <${p.desc}> (por defecto: ${p.default})"\n  exit 0\nfi`,
    learn: '${1:-default} da valor por defecto sin abortar. $0 es el nombre del script. Para flags avanzados usa getopts (integrado) o getopt (GNU).',
  },
  prompt: {
    label: 'Preguntar al usuario', icon: '❓',
    desc: 'read con prompt, valor opcional y modo silencioso para secretos.',
    fields: [
      { key: 'var', label: 'variable', ph: 'TOKEN', def: 'TOKEN' },
      { key: 'msg', label: 'pregunta', ph: 'Introduce el token', def: 'Introduce el token' },
      { key: 'secret', label: 'modo secreto (-s)', type: 'toggle', def: false },
      { key: 'default', label: 'valor por defecto (vacío = obligatorio)', ph: '', def: '' },
    ],
    defaults: { var: 'TOKEN', msg: 'Introduce el token', secret: false, default: '' },
    emit: (p) => {
      const def = p.default ? `\${${p.var}:-${esc(String(p.default))}}` : ''
      const read = p.secret ? `read -rsp "${esc(String(p.msg))}: " ${p.var}` : `read -rp "${esc(String(p.msg))}${p.default ? ` [${p.default}]` : ''}: " ${p.var}`
      const echo = p.secret ? `\necho` : ''
      const req = p.default ? '' : `\n[ -n "$${p.var}" ] || { echo "[!] obligatorio"; exit 1; }`
      return `${read}${echo}${def ? `\n${p.var}=\${${p.var}:-${esc(String(p.default))}}` : ''}${req}`
    },
    learn: 'read -s oculta lo tecleado (ideal para tokens); -p pone el prompt; -r evita que backslash escape. NUNCA uses read sin -r.',
  },
  checkcmd: {
    label: 'Comprobar binario', icon: '🔍',
    desc: 'Verifica que un comando existe antes de usarlo.',
    fields: [{ key: 'cmd', label: 'comando', ph: 'nmap', def: 'nmap' }],
    defaults: { cmd: 'nmap' },
    emit: (p) => `if ! command -v ${p.cmd} &>/dev/null; then\n  echo "[!] '${p.cmd}' no está instalado"\n  exit 127\nfi`,
    learn: 'command -v es POSIX y más fiable que which. Fallar pronto con exit 127 (código estándar de "comando no encontrado") es mucho mejor que fallar a mitad del script.',
  },
  checkfile: {
    label: 'Comprobar fichero/dir', icon: '📄',
    desc: 'Test de existencia: -f fichero, -d directorio, -r legible, -w escribible.',
    fields: [
      { key: 'path', label: 'ruta', ph: '/etc/passwd', def: '/etc/passwd' },
      { key: 'test', label: 'test', type: 'select', options: ['-f existe y es fichero', '-d existe y es directorio', '-r es legible', '-w es escribible', '-x es ejecutable', '-s no está vacío'], def: '-f existe y es fichero' },
    ],
    defaults: { path: '/etc/passwd', test: '-f existe y es fichero' },
    emit: (p) => {
      const t = String(p.test).split(' ')[0]
      return `if [ ${t} "${p.path}" ]; then\n  echo "[✓] ${p.path} OK (${t})"\nelse\n  echo "[!] ${p.path} falla el test ${t}"\nfi`
    },
    learn: '[ -f ] fichero, [ -d ] directorio, [ -r ]/-w/-x permisos, [ -s ] tamaño > 0, [ -L ] symlink. Los corchetes dobles [[ ]] de bash permiten && y || dentro.',
  },
  confirm: {
    label: 'Confirmación sí/no', icon: '⚖️',
    desc: 'Pide confirmación interactiva antes de una acción destructiva.',
    fields: [{ key: 'msg', label: 'acción a confirmar', ph: '¿Borrar los logs?', def: '¿Continuar con la acción?' }],
    defaults: { msg: '¿Continuar con la acción?' },
    emit: (p) => `read -rp "${esc(String(p.msg))} [s/N]: " resp\ncase "$resp" in\n  [sS]|[sS][iI]) echo "[*] confirmado" ;;\n  *) echo "[!] abortado"; exit 1 ;;\nesac`,
    learn: 'El patrón [s/N] pone el seguro por defecto: si el usuario da a Enter, se aborta. case es más limpio que if para comparar varios valores.',
  },
  ifcond: {
    label: 'If / elif / else', icon: '🔀',
    desc: 'Condicional de comparación numérica o de strings.',
    fields: [
      { key: 'left', label: 'izquierda', ph: '$COUNT', def: '$COUNT' },
      { key: 'op', label: 'operador', type: 'select', options: ['-gt mayor que', '-lt menor que', '-ge mayor o igual', '-le menor o igual', '-eq igual', '-ne distinto', '= string igual', '!= string distinto', '-z string vacío', '-n string no vacío'], def: '-gt mayor que' },
      { key: 'right', label: 'derecha', ph: '10', def: '10' },
      { key: 'then', label: 'entonces (línea(s) de código)', area: true, def: 'echo "se cumple"' },
      { key: 'els', label: 'si no (opcional)', area: true, ph: 'vacío = sin else', def: '' },
    ],
    defaults: { left: '$COUNT', op: '-gt mayor que', right: '10', then: 'echo "se cumple"', els: '' },
    emit: (p) => {
      const op = String(p.op).split(' ')[0]
      const cond = op === '-z' || op === '-n' ? `${op} ${p.left}` : `${p.left} ${op} ${p.right}`
      const els = p.els ? String(p.els).split('\n').map((l) => `  ${l}`).join('\n') : null
      return `if [ ${cond} ]; then\n${String(p.then).split('\n').map((l) => `  ${l}`).join('\n')}${els ? `\nelse\n${els}` : ''}\nfi`
    },
    learn: 'Para números: -gt -lt -ge -le -eq -ne. Para strings: = != -z (vacío) -n (no vacío). < > en [ ] comparan strings alfabéticamente: usa (( )) para aritmética.',
  },
  forlist: {
    label: 'For sobre lista', icon: '🔁',
    desc: 'Bucle for sobre palabras, IPs o cualquier lista.',
    fields: [
      { key: 'var', label: 'variable', ph: 'host', def: 'host' },
      { key: 'list', label: 'lista (una por línea)', area: true, ph: '80\n443\n22', def: '80\n443\n22' },
      { key: 'body', label: 'cuerpo', area: true, def: 'echo "puerto $host"' },
    ],
    defaults: { var: 'host', list: '80\n443\n22', body: 'echo "puerto $host"' },
    emit: (p) => {
      const list = String(p.list).split('\n').map((v) => v.trim()).filter(Boolean).join(' ')
      return `for ${p.var} in ${list}; do\n${String(p.body).split('\n').map((l) => `  ${l}`).join('\n')}\ndone`
    },
    learn: 'for itera sobre PALABRAS separadas por IFS. Si tu lista viene de un comando con espacios raros, usa un array o while read.',
  },
  forrange: {
    label: 'For numérico (secuencia)', icon: '🔢',
    desc: 'Bucle de rango estilo C o seq.',
    fields: [
      { key: 'var', label: 'variable', ph: 'i', def: 'i' },
      { key: 'start', label: 'desde', ph: '1', def: '1' },
      { key: 'end', label: 'hasta (incluido)', ph: '10', def: '10' },
      { key: 'body', label: 'cuerpo', area: true, def: 'echo "vuelta $i"' },
    ],
    defaults: { var: 'i', start: '1', end: '10', body: 'echo "vuelta $i"' },
    emit: (p) => `for (( ${p.var}=${p.start}; ${p.var}<=${p.end}; ${p.var}++ )); do\n${String(p.body).split('\n').map((l) => `  ${l}`).join('\n')}\ndone`,
    learn: 'for (( )) es aritmética pura de bash (sin $ delante de las variables). Equivale a seq pero sin fork: mucho más rápido en bucles grandes.',
  },
  while: {
    label: 'While + read (líneas)', icon: '🌊',
    desc: 'Lee un fichero o pipe línea a línea de forma segura.',
    fields: [
      { key: 'source', label: 'fichero o comando', ph: 'hosts.txt', def: 'hosts.txt' },
      { key: 'var', label: 'variable línea', ph: 'line', def: 'line' },
      { key: 'body', label: 'cuerpo', area: true, def: 'echo "línea: $line"' },
    ],
    defaults: { source: 'hosts.txt', var: 'line', body: 'echo "línea: $line"' },
    emit: (p) => `while IFS= read -r ${p.var}; do\n${String(p.body).split('\n').map((l) => `  ${l}`).join('\n')}\ndone < "${p.source}"`,
    learn: 'IFS= preserva espacios al inicio/fin; -r evita el escape de backslashes. La redirección done < fichero evita el subshell de cat fichero | while (cuyas variables desaparecerían).',
  },
  func: {
    label: 'Función', icon: '🧩',
    desc: 'Función con parámetros y valor de retorno.',
    fields: [
      { key: 'name', label: 'nombre', ph: 'escanear', def: 'escanear' },
      { key: 'params', label: 'parámetros (documentación)', ph: '$1 = host', def: '$1 = host' },
      { key: 'body', label: 'cuerpo', area: true, def: 'echo "escaneando $1"' },
    ],
    defaults: { name: 'escanear', params: '$1 = host', body: 'echo "escaneando $1"' },
    emit: (p) => `${p.name}() {\n  # ${p.params}\n${String(p.body).split('\n').map((l) => `  ${l}`).join('\n')}\n}\n\n# llamada: ${p.name} "10.10.10.5"`,
    learn: 'Los "parámetros" son posicionales ($1, $2...) dentro de la función. return devuelve un código de salida (0-255); para devolver datos, usa echo y captura con $(func).',
    warn: (p) => (/\s/.test(String(p.name)) ? 'el nombre de función contiene espacios' : null),
  },
  case: {
    label: 'Case / switch', icon: '🎛️',
    desc: 'Disparo por valor: perfecto para menús o SOs.',
    fields: [
      { key: 'var', label: 'variable', ph: '$SO', def: '$SO' },
      { key: 'cases', label: 'casos (patrón=código, uno por línea)', area: true, ph: 'linux=echo "es linux"\n*win*=echo "es windows"', def: 'linux=echo "es linux"\n*win*=echo "es windows"' },
      { key: 'def', label: 'caso por defecto', ph: 'echo "desconocido"', def: 'echo "desconocido"' },
    ],
    defaults: { var: '$SO', cases: 'linux=echo "es linux"\n*win*=echo "es windows"', def: 'echo "desconocido"' },
    emit: (p) => {
      const cases = String(p.cases).split('\n').map((l) => l.trim()).filter(Boolean)
        .map((l) => { const i = l.indexOf('='); return `  ${l.slice(0, i)})\n${l.slice(i + 1).split(';').map((c) => `    ${c.trim()}`).filter(Boolean).join('\n')}\n    ;;` })
        .join('\n')
      return `case "${p.var}" in\n${cases}\n  *)\n    ${p.def}\n    ;;\nesac`
    },
    learn: 'Los patrones de case son globs: *win* casa con cualquier string que contenga "win". *) es el catch-all. Siempre termina cada rama con ;;.',
  },
  command: {
    label: 'Comando libre', icon: '⚡',
    desc: 'Cualquier comando crudo, tal cual.',
    fields: [{ key: 'cmd', label: 'comando', area: true, ph: 'nmap -sV -p- $TARGET', def: 'echo "hola mundo"' }],
    defaults: { cmd: 'echo "hola mundo"' },
    emit: (p) => String(p.cmd).split('\n').map((l) => l.trim()).filter(Boolean).join('\n'),
    learn: 'Si el comando puede fallar y el script está en modo estricto, añade || true donde el fallo sea aceptable (p. ej. un ping opcional).',
  },
  nccheck: {
    label: 'Puerto abierto (nc)', icon: '🔌',
    desc: 'Comprueba un puerto TCP con netcat y timeout.',
    fields: [
      { key: 'host', label: 'host', ph: '$TARGET', def: '$TARGET' },
      { key: 'port', label: 'puerto', ph: '443', def: '443' },
      { key: 'timeout', label: 'timeout (s)', ph: '2', def: '2' },
    ],
    defaults: { host: '$TARGET', port: '443', timeout: '2' },
    emit: (p) => `if timeout ${p.timeout} bash -c "echo >/dev/tcp/${p.host}/${p.port}" 2>/dev/null; then\n  echo "[✓] ${p.host}:${p.port} abierto"\nelse\n  echo "[x] ${p.host}:${p.port} cerrado/filtrado"\nfi`,
    learn: '/dev/tcp/HOST/PORT es una_feature de bash (no de POSIX sh): abre TCP sin nc. timeout limita el intento. Si el host tiene variables, van SIN comillas dentro de bash -c "..." para que se expandan.',
  },
  loopports: {
    label: 'Escáner de puertos', icon: '📡',
    desc: 'Bucle que escanea un rango de puertos en paralelo con /dev/tcp.',
    fields: [
      { key: 'host', label: 'host', ph: '$TARGET', def: '$TARGET' },
      { key: 'from', label: 'puerto inicial', ph: '1', def: '1' },
      { key: 'to', label: 'puerto final', ph: '1024', def: '1024' },
      { key: 'parallel', label: 'paralelismo (background &)', type: 'toggle', def: true },
    ],
    defaults: { host: '$TARGET', from: '1', to: '1024', parallel: true },
    emit: (p) => {
      const body = `if timeout 1 bash -c "echo >/dev/tcp/${p.host}/$port" 2>/dev/null; then echo "[✓] $port abierto"; fi`
      if (!p.parallel) return `for port in $(seq ${p.from} ${p.to}); do\n  ${body}\ndone`
      return `for port in $(seq ${p.from} ${p.to}); do\n  ( ${body} ) &\ndone\nwait\necho "[*] escaneo de ${p.from}-${p.to} terminado"`
    },
    learn: 'Lanzar el check con & lo manda a background: escaneas 1024 puertos en ~1s en vez de en minutos. wait espera a todos los hijos. Úsalo con cabeza en redes reales: puede parecer un escaneo agresivo.',
  },
  logfile: {
    label: 'Log a fichero', icon: '🧾',
    desc: 'Redirección tee para guardar salida manteniendo consola.',
    fields: [
      { key: 'file', label: 'fichero de log', ph: 'salida.log', def: 'salida.log' },
      { key: 'stamp', label: 'timestamp en el log', type: 'toggle', def: true },
    ],
    defaults: { file: 'salida.log', stamp: true },
    emit: (p) => `LOG="${p.file}"\nexec > >(tee -a "$LOG") 2>&1${p.stamp ? `\necho "=== inicio: $(date -Is) ==="` : ''}`,
    learn: 'exec > >(tee -a) redirige TODO el stdout del script a tee, que escribe en consola y fichero a la vez. 2>&1 mete también el stderr. La salida va a un process substitution: bash puro.',
  },
  trap: {
    label: 'Trap de limpieza', icon: '🪤',
    desc: 'Función que se ejecuta al salir (Ctrl+C, error o fin).',
    fields: [
      { key: 'body', label: 'código de limpieza', area: true, def: 'rm -f "$TMP"\necho "[*] limpieza hecha"' },
      { key: 'tmp', label: 'crear TMP file temporal', type: 'toggle', def: true },
    ],
    defaults: { body: 'rm -f "$TMP"\necho "[*] limpieza hecha"', tmp: true },
    emit: (p) => `${p.tmp ? 'TMP="$(mktemp)"\n' : ''}cleanup() {\n${String(p.body).split('\n').map((l) => `  ${l}`).join('\n')}\n}\ntrap cleanup EXIT INT TERM`,
    learn: 'trap EXIT se dispara SIEMPRE al terminar (normal, error o Ctrl+C). mktemp crea ficheros en /tmp con nombre impredecible: nunca hagas touch /tmp/mifichero fijo.',
  },
  colorlog: {
    label: 'Función de log coloreado', icon: '🎨',
    desc: 'Funciones info/ok/warn/err con colores ANSI y timestamp.',
    fields: [{ key: 'withtime', label: 'timestamp en cada línea', type: 'toggle', def: true }],
    defaults: { withtime: true },
    emit: (p) => {
      const ts = p.withtime ? "'$(date +%H:%M:%S) '" : ''
      return `# funciones de log con color ANSI (verde ok, amarillo warn, rojo err)\ninfo()  { echo -e "\\e[36m[\\e[0m\\e[1;36m*\\e[0m\\e[36m]\\e[0m ${ts}$*"; }\nok()    { echo -e "\\e[32m[✓]\\e[0m ${ts}$*"; }\nwarn()  { echo -e "\\e[33m[!]\\e[0m ${ts}$*"; }\nerr()   { echo -e "\\e[31m[x]\\e[0m ${ts}$*" >&2; }`
    },
    learn: '\\e[XXm activa color, \\e[0m resetea. >&2 manda err() al stderr: así puedes filtrar errores aunque el stdout vaya a un pipe. $* expande todos los argumentos de la función.',
  },
}

/* orden lógico por defecto para un script nuevo */
export const DEFAULT_SCRIPT: BlockKind[] = ['shebang', 'header', 'colorlog', 'args', 'checkcmd', 'logfile']

export const KIND_ORDER: BlockKind[] = [
  'shebang', 'header', 'colorlog', 'var', 'array', 'args', 'prompt', 'checkcmd', 'checkfile',
  'confirm', 'ifcond', 'forlist', 'forrange', 'while', 'func', 'case', 'command',
  'nccheck', 'loopports', 'logfile', 'trap',
]

/* ─────────────── composición ─────────────── */

export function buildScript(blocks: ForgeBlock[]): ForgeResult {
  const warnings: string[] = []
  const parts: string[] = []
  let blankAfter: BlockKind | null = null

  for (const b of blocks) {
    const def = BLOCK_DEFS[b.kind]
    if (!def) continue
    const w = def.warn?.(b.params)
    if (w) warnings.push(`${def.label}: ${w}`)
    const code = def.emit(b.params).trimEnd()
    parts.push(code)
    blankAfter = b.kind
  }
  void blankAfter

  const script = parts.join('\n\n') + '\n'
  return { script, lines: script.split('\n').length, warnings }
}

export const newBlock = (kind: BlockKind, i: number): ForgeBlock => ({
  id: `${kind}-${Date.now()}-${i}`,
  kind,
  params: { ...BLOCK_DEFS[kind].defaults },
})
