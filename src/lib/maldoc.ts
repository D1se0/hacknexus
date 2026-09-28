/* ── MalDoc Autopsy · Ronda 18 ────────────────────────────────────────────
   Anatomía de un documento malicioso, sin ejecutarlo NUNCA: un PDF con
   /   Launch no abre una calculadora al analizarlo, un DOCX con macros no
   ejecuta nada porque sí. Análisis estático de la cadena de ataque real
   (vector → gatillo → payload → persistencia) + generadores de muestras
   para entrenar la vista y probar sandboxes. 100% offline. */

/* ---------- 1. PDF: gatillos y estructuras ---------- */

export interface PdfTrigger {
  key: string
  name: string
  risk: 'critical' | 'high' | 'medium' | 'info'
  why: string
}

/** Los objetos PDF que convierten un documento en un vector de ataque. */
export const PDF_TRIGGERS: PdfTrigger[] = [
  { key: '/OpenAction', name: 'OpenAction', risk: 'critical', why: 'Se ejecuta automáticamente al ABRIR el PDF: aquí vive el primer código que corre sin interacción' },
  { key: '/AA', name: 'Additional Actions', risk: 'high', why: 'Acciones en eventos (al cerrar, al imprimir, al cambiar el foco): la vía alternativa cuando OpenAction está vigilado' },
  { key: '/Launch', name: 'Launch Action', risk: 'critical', why: 'EJECUTA un comando o archivo del sistema: el famoso «abre calc.exe» de los PoC' },
  { key: '/JS', name: 'JavaScript', risk: 'high', why: 'JS embebido del lector (Adobe): exploits de vulnerabilidades, drop de payloads, llamadas a app.launchURL' },
  { key: '/JavaScript', name: 'JavaScript (nombre largo)', risk: 'high', why: 'Variante de /JS: mismo peligro, otra clave de diccionario' },
  { key: '/GoToR', name: 'GoTo Remote', risk: 'medium', why: 'Salta a OTRO PDF (posible remoto): ataques de doble documento y NTLM leak vía SMB' },
  { key: '/EmbeddedFile', name: 'Embedded File', risk: 'high', why: 'Adjunto DENTRO del PDF: el payload suele viajar aquí (exe, js, lnk)' },
  { key: '/RichMedia', name: 'RichMedia', risk: 'high', why: 'Flash/ vídeo embebido: históricamente el vector de exploits CVE-2010-1297 y similares' },
  { key: '/AcroForm', name: 'AcroForm / XFA', risk: 'medium', why: 'Formularios: XFA permite XML ejecutable y es raro en documentos legítimos' },
  { key: '/Names', name: 'Names tree', risk: 'info', why: 'Registro de acciones nombradas: aquí apuntan OpenAction y AA — contexto para el análisis' },
  { key: '/URI', name: 'URI Action', risk: 'info', why: 'Enlaces web: phishing con PDF. Con file:// o UNC (\\\\servidor) es crítico: fuga NTLM' },
  { key: '/Encrypt', name: 'Encryption', risk: 'info', why: 'PDF cifrado: táctica de evasión clásica para que el antivirus no lea el resto' },
]

export interface MaldocFinding {
  trigger: string
  name: string
  risk: 'critical' | 'high' | 'medium' | 'info'
  why: string
  matches: number
  context: string
}

export interface PdfReport {
  looksPdf: boolean
  version: string
  objects: number
  streams: number
  encrypted: boolean
  findings: MaldocFinding[]
  verdict: 'malicioso' | 'muy sospechoso' | 'sospechoso' | 'limpio' | 'no es un PDF'
  verdictWhy: string
  chain: string[]
}

function extractContext(text: string, key: string): string {
  const i = text.indexOf(key)
  if (i < 0) return ''
  return text.slice(Math.max(0, i - 20), i + 60).replace(/\s+/g, ' ').trim()
}

/** Análisis estático de un PDF: nunca ejecuta nada, solo lee bytes. */
export function analyzePdf(text: string): PdfReport {
  const looksPdf = text.trimStart().startsWith('%PDF-')
  if (!looksPdf) {
    return { looksPdf: false, version: '', objects: 0, streams: 0, encrypted: false, findings: [], verdict: 'no es un PDF', verdictWhy: 'El contenido no empieza por %PDF-: los lectores reales a veces reparan ficheros rotos, un atacante lo aprovecha', chain: [] }
  }
  const version = /^%PDF-(\d+\.\d+)/.exec(text)?.[1] ?? '?'
  const objects = (text.match(/\b\d+\s+0\s+obj\b/g) ?? []).length
  const streams = (text.match(/stream\b/gi) ?? []).length
  const encrypted = text.includes('/Encrypt')

  const findings: MaldocFinding[] = []
  for (const t of PDF_TRIGGERS) {
    const matches = text.split(t.key).length - 1
    if (matches > 0) {
      findings.push({ trigger: t.key, name: t.name, risk: t.risk, why: t.why, matches, context: extractContext(text, t.key) })
    }
  }
  // Indicadores extra
  if (/calc\.exe|cmd\.exe|powershell|mshta|rundll32|regsvr32/i.test(text)) {
    findings.push({ trigger: '(binario)', name: 'Comando de sistema embebido', risk: 'critical', why: 'Nombres de ejecutables de Windows dentro del PDF: el payload del /Launch es visible a simple vista', matches: 1, context: /[^\s]{0,40}(calc\.exe|powershell|mshta)[^\s]{0,40}/i.exec(text)?.[0] ?? '' })
  }
  if (/file:\/\/|\\\\[a-z0-9_-]+\\/i.test(text)) {
    findings.push({ trigger: '/URI (UNC)', name: 'Ruta UNC o file://', risk: 'critical', why: 'Recurso de red/SMB: al abrir el enlace Windows autentica y filtra el hash NTLM del usuario', matches: 1, context: '' })
  }

  const crit = findings.filter((f) => f.risk === 'critical').length
  const high = findings.filter((f) => f.risk === 'high').length
  const medium = findings.filter((f) => f.risk === 'medium').length
  let verdict: PdfReport['verdict'] = 'limpio'
  let verdictWhy = 'Sin gatillos de ejecución: un PDF que solo muestra páginas'
  if (crit > 0 && high > 0) {
    verdict = 'malicioso'
    verdictWhy = `${crit} gatillo(s) crítico(s) + ${high} de riesgo alto: cadena completa de ejecución automática (muestra de laboratorio o arma real)`
  } else if (crit > 0) {
    verdict = 'muy sospechoso'
    verdictWhy = `${crit} gatillo(s) crítico(s): ejecución o lanzamiento de procesos, necesita revisión manual inmediata`
  } else if (high > 0) {
    verdict = 'sospechoso'
    verdictWhy = `${high} elemento(s) de riesgo alto (JS, adjuntos, RichMedia): común en exploits históricos`
  } else if (medium > 0 || encrypted) {
    verdict = 'sospechoso'
    verdictWhy = 'Elementos menores o cifrado: puede ser legítimo, pero el cifrado también oculta contenido del antivirus'
  }

  const chain: string[] = []
  if (text.includes('/OpenAction') || text.includes('/AA')) chain.push('Al abrir (o cerrar/imprimir) el lector ejecuta la acción del documento')
  if (text.includes('/JS') || text.includes('/JavaScript')) chain.push('JavaScript del lector prepara el exploit o descodifica el payload')
  if (text.includes('/Launch')) chain.push('Launch entrega el control al SO: ejecuta el comando embebido')
  if (text.includes('/EmbeddedFile')) chain.push('El adjunto embebido viaja dentro del PDF hasta que la víctima o el exploit lo suelta en disco')
  if (chain.length === 0) chain.push('Sin cadena de ejecución: el PDF solo renderiza contenido')

  return { looksPdf: true, version, objects, streams, encrypted, findings, verdict, verdictWhy, chain }
}

/** Genera el PDF de laboratorio: portada inocente + OpenAction/JS + Launch a calc.exe + adjunto embebido. */
export function generateSuspiciousPdf(): string {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /OpenAction 4 0 R /AA << /WC 7 0 R >> >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R /Annots 9 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Action /S /JavaScript /JS 5 0 R >>\nendobj',
    '5 0 obj\n<< /Length 118 >>\nstream\napp.alert({ cMsg: "Factura vencida: revise el anexo", nIcon: 3 });\nthis.print({ bUI: true, bSilent: false });\nendstream\nendobj',
    '6 0 obj\n<< /Type /Action /S /Launch /Win << /F (cmd.exe) /P (C:\\\\Windows\\\\System32) /D (calc.exe) >> >>\nendobj',
    '7 0 obj\n<< /Type /Action /S /JavaScript /JS 10 0 R >>\nendobj',
    '8 0 obj\n<< /Length 62 >>\nstream\nBT /F1 14 Tf 72 720 Td (CORPORACION IMPORTANTE S.A.) Tj ET\nendstream\nendobj',
    '9 0 obj\n<< /Type /Annot /Subtype /Link /A << /Type /Action /S /URI /URI (file://\\\\\\\\servidor-corp\\\\compartido\\\\pagos.iso) >> >>\nendobj',
    '10 0 obj\n<< /Length 46 >>\nstream\nthis.exportDataObject({ cName: "anexo.xdp", nLaunch: 2 });\nendstream\nendobj',
    '11 0 obj\n<< /Type /Filespec /F (anexo_falso.pdf) /EF << /F 12 0 R >> >>\nendobj',
    '12 0 obj\n<< /Type /EmbeddedFile /Subtype (application#2Fx-msdownload) /Length 26 >>\nstream\nMZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFFpayload\x00\nendstream\nendobj',
  ]
  const body = objects.join('\n')
  const xrefPos = body.length + 9
  let xref = 'xref\n0 13\n0000000000 65535 f \n'
  let off = 9
  for (const o of objects) {
    xref += off.toString().padStart(10, '0') + ' 00000 n \n'
    off += o.length + 1
  }
  return `%PDF-1.7\n${body}\n${xref}trailer\n<< /Size 13 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
}

/* ---------- 2. OOXML: relaciones externas y VBA ---------- */

export interface OoxmlCheck {
  name: string
  risk: 'critical' | 'high' | 'medium' | 'info'
  why: string
}

export const OOXML_CHECKS: OoxmlCheck[] = [
  { name: 'vbaProject.bin', risk: 'critical', why: 'Proyecto VBA embebido: las macros de Office siguen siendo el vector inicial nº1 según todas las métricas de phishing' },
  { name: 'external target', risk: 'critical', why: 'Relación con TargetMode="External": el documento llama a un recurso externo (plantilla remota, UNC, web)' },
  { name: 'ActiveX', risk: 'high', why: 'Controles ActiveX: ejecución de código sin las limitaciones de las macros, con advertencia propia' },
  { name: 'macroEnabled', risk: 'high', why: 'Content type de documento habilitado para macros (.docm/.xlsm): declara intención macro' },
  { name: 'External Data / LinkUpdate', risk: 'medium', why: 'actualización de campos y vínculos: exfiltración o NTLM leak sin VBA' },
]

export interface OoxmlFinding {
  name: string
  risk: OoxmlCheck['risk']
  why: string
  detail: string
}

export interface OoxmlReport {
  findings: OoxmlFinding[]
  verdict: 'malicioso' | 'muy sospechoso' | 'sospechoso' | 'limpio'
}

/** Analiza el INVENTARIO de un OOXML (nombres de fichero + contenido XML textual), no hace falta el ZIP real. */
export function analyzeOoxml(files: { name: string; content: string }[]): OoxmlReport {
  const findings: OoxmlFinding[] = []
  const names = files.map((f) => f.name)
  const all = files.map((f) => f.content).join('\n')

  if (names.some((n) => n.endsWith('vbaProject.bin'))) {
    findings.push({ name: 'vbaProject.bin', risk: 'critical', why: OOXML_CHECKS[0].why, detail: 'Proyecto VBA presente: las cadenas de la macro (AutoOpen, Shell, WriteProcessMemory) se extraen con olevba/oletools' })
  }
  if (/TargetMode="External"/i.test(all)) {
    const targets = Array.from(all.matchAll(/Target="([^"]+)"\s+TargetMode="External"/gi)).map((m) => m[1])
    const dangerous = targets.filter((t) => /^file:|^\\\\|^ms-|^mailto:|\.exe|\.hta|\.chm/i.test(t))
    findings.push({
      name: 'external target',
      risk: dangerous.length ? 'critical' : 'medium',
      why: OOXML_CHECKS[1].why,
      detail: dangerous.length ? `Destinos peligrosos: ${dangerous.slice(0, 4).join(', ')}` : `Destinos externos: ${targets.slice(0, 5).join(', ')}`,
    })
  }
  if (names.some((n) => n.includes('activeX'))) {
    findings.push({ name: 'ActiveX', risk: 'high', why: OOXML_CHECKS[2].why, detail: 'Directorio activeX/ presente' })
  }
  if (/macroEnabled/i.test(all)) {
    findings.push({ name: 'macroEnabled', risk: 'high', why: OOXML_CHECKS[3].why, detail: 'El content type declara documento habilitado para macros' })
  }
  if (/w:updateFields|w:link|w:includePicture/i.test(all)) {
    findings.push({ name: 'External Data / LinkUpdate', risk: 'medium', why: OOXML_CHECKS[4].why, detail: 'Campos que se actualizan al abrir: canary o fuga de datos' })
  }

  const crit = findings.filter((f) => f.risk === 'critical').length
  const high = findings.filter((f) => f.risk === 'high').length
  const medium = findings.filter((f) => f.risk === 'medium').length
  const verdict: OoxmlReport['verdict'] = crit > 0 ? 'malicioso' : high > 0 ? 'muy sospechoso' : medium > 0 ? 'sospechoso' : 'limpio'
  return { findings, verdict }
}

/* ---------- 3. ZIP real en el navegador (para generar el .docm de laboratorio) ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function strBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

function u16(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff]
}

function u32(v: number): number[] {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]
}

/** Construye un ZIP válido sin compresión (store) — suficiente para el laboratorio. */
export function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const parts: number[] = []
  const central: number[] = []
  let offset = 0
  for (const f of files) {
    const name = strBytes(f.name)
    const data = strBytes(f.content)
    const crc = crc32(data)
    const localHeader = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
      ...name,
    ]
    parts.push(...localHeader, ...data)
    central.push(
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length),
      ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ...name,
    )
    offset += localHeader.length + data.length
  }
  const cdStart = parts.length
  const cdSize = central.length
  const eocd = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(cdStart), ...u16(0)]
  return new Uint8Array([...parts, ...central, ...eocd])
}

/** Genera un .docm de laboratorio: content-type macroEnabled + vbaProject.bin falso + hyperlink externo a UNC. */
export function generateMacroDocx(): { filename: string; bytes: Uint8Array } {
  const files = [
    {
      name: '[Content_Types].xml',
      content: '<?xml version="1.0"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/>'
        + '<Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/>'
        + '</Types>',
    },
    {
      name: '_rels/.rels',
      content: '<?xml version="1.0"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      name: 'word/document.xml',
      content: '<?xml version="1.0"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        + '<w:body><w:p><w:r><w:t>Poliza de seguros 2026 — documento de ejemplo para el laboratorio de macros.</w:t></w:r></w:p></w:body></w:document>',
    },
    {
      name: 'word/_rels/document.xml.rels',
      content: '<?xml version="1.0"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="file://\\\\intranet-corp\\\\pagos\\\\actualizar.hta" TargetMode="External"/></Relationships>',
    },
    {
      name: 'word/vbaProject.bin',
      content: '\xd0\xcf\x11\xe0A\x1b\x1a\xe1 (firma OLE2 simulada: un vbaProject real se desensambla con olevba; aquí basta la presencia del fichero para disparar la detección estática)',
    },
  ]
  return { filename: 'poliza_2026_macro.docm', bytes: buildZip(files) }
}

/* ---------- 4. EML: cabeceras de phishing ---------- */

const DANGEROUS_ATTACH_RE = /\.(exe|scr|js|jse|vbs|hta|chm|lnk|iso|img|cmd|bat|ps1|jar|apk|one|docm|xlsm)$/i

export interface EmlFinding {
  header: string
  risk: 'critical' | 'high' | 'medium' | 'info'
  why: string
  detail: string
}

export interface EmlReport {
  from: string
  returnPath: string
  received: string[]
  subject: string
  spf: string
  dkim: 'pass' | 'fail' | 'none'
  dmarc: string
  attachments: string[]
  findings: EmlFinding[]
  verdict: 'malicioso' | 'sospechoso' | 'limpio'
}

function parseHeaderBlock(eml: string): Record<string, string[]> {
  const headerBlock = eml.split(/\r?\n\r?\n/)[0] ?? eml
  const lines = headerBlock.split(/\r?\n/)
  const headers: Record<string, string[]> = {}
  let current = ''
  for (const line of lines) {
    if (/^[A-Za-z-]+:/.test(line)) {
      const idx = line.indexOf(':')
      current = line.slice(0, idx).toLowerCase()
      headers[current] = [...(headers[current] ?? []), line.slice(idx + 1).trim()]
    } else if (current && (line.startsWith(' ') || line.startsWith('\t'))) {
      headers[current]![headers[current]!.length - 1] += ' ' + line.trim()
    }
  }
  return headers
}

/** Análisis de cabeceras de un .eml: suplantación, autenticidad y adjuntos. */
export function analyzeEml(eml: string): EmlReport {
  const headers = parseHeaderBlock(eml)
  const from = headers['from']?.[0] ?? ''
  const returnPath = headers['return-path']?.[0] ?? ''
  const received = headers['received'] ?? []
  const subject = headers['subject']?.[0] ?? ''
  const spfRaw = headers['authentication-results']?.join(' ') ?? headers['received-spf']?.join(' ') ?? ''
  const spf = /spf\s*=\s*(pass|softfail|softpass|fail|neutral|none)/i.exec(spfRaw)?.[1] ?? (headers['received-spf'] ? /pass|softfail|fail|neutral|none/i.exec(headers['received-spf'].join(' '))?.[0] ?? 'none' : 'none')
  const dkim = /dkim\s*=\s*(pass|fail|none)/i.exec(spfRaw)?.[1]?.toLowerCase() as EmlReport['dkim'] ?? 'none'
  const dmarc = /dmarc\s*=\s*(pass|fail|none)/i.exec(spfRaw)?.[1] ?? 'none'

  // Adjuntos: cabeceras Content-Disposition filename
  const attachments = Array.from(eml.matchAll(/filename="?([^"\r\n;]+)"?/gi)).map((m) => m[1])

  const findings: EmlFinding[] = []

  const fromAddr = /<([^>]+)>/.exec(from)?.[1] ?? from
  const returnAddr = returnPath.replace(/[<>]/g, '')
  if (returnAddr && fromAddr && !fromAddr.toLowerCase().endsWith(returnAddr.toLowerCase().replace(/^@/, '').split('@').pop()!)) {
    findings.push({ header: 'From vs Return-Path', risk: 'high', why: 'El dominio del remitente visible NO coincide con el del sobre SMTP: suplantación del remitente (el From es libre de escribir)', detail: `From: ${fromAddr} · Return-Path: ${returnAddr}` })
  }
  if (spf.toLowerCase() === 'fail') {
    findings.push({ header: 'SPF: fail', risk: 'critical', why: 'El servidor que envió NO está autorizado por el dominio del remitente: correo falsificado salvo errata de configuración', detail: spfRaw.slice(0, 120) })
  } else if (spf.toLowerCase() === 'softpass' || spf.toLowerCase() === 'neutral') {
    findings.push({ header: `SPF: ${spf}`, risk: 'medium', why: 'Autorización débil: no descarta suplantación', detail: spfRaw.slice(0, 120) })
  }
  if (dmarc.toLowerCase() === 'fail') {
    findings.push({ header: 'DMARC: fail', risk: 'critical', why: 'Falla la política combinada SPF/DKIM con alineación: el dominio visible no autentica', detail: spfRaw.slice(0, 120) })
  }
  const badAttach = attachments.filter((a) => DANGEROUS_ATTACH_RE.test(a.trim()))
  if (badAttach.length) {
    findings.push({ header: 'Adjunto peligroso', risk: 'critical', why: 'Extensión ejecutable/scriptable: el payload clásico de la cadena de infección por email', detail: badAttach.join(', ') })
  }
  const doubleExt = attachments.filter((a) => /\.(pdf|jpg|png|docx?|xlsx?)\.[a-z]{2,4}$/i.test(a.trim()))
  if (doubleExt.length) {
    findings.push({ header: 'Doble extensión', risk: 'high', why: '«factura.pdf.exe»: la extensión real es la última; Windows la oculta por defecto', detail: doubleExt.join(', ') })
  }
  // Enlaces cuyo href no coincide con el texto visible
  const hrefs = Array.from(eml.matchAll(/<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]{0,80})</gi))
  const mismatched = hrefs.filter(([, href, text]) => {
    const dom = /https?:\/\/([^/]+)/.exec(href)?.[1] ?? ''
    return text.trim() && dom && !text.toLowerCase().includes(dom.toLowerCase().replace(/^www\./, '').split('.')[0])
  })
  if (mismatched.length) {
    findings.push({ header: 'Link mismatch', risk: 'high', why: 'El texto del enlace no coincide con su destino: phishing clásico de HTML', detail: mismatched.slice(0, 3).map((m) => `«${m[2].trim().slice(0, 30)}» → ${m[1].slice(0, 60)}`).join(' | ') })
  }
  if (received.length >= 2) {
    findings.push({ header: `Ruta Received (${received.length} saltos)`, risk: 'info', why: 'Se lee de ABAJO hacia ARRIBA: el primero es el servidor del remitente real. Busca países/proveedores incoherentes con el From', detail: `${received[received.length - 1]?.slice(0, 100)}…` })
  }

  const crit = findings.filter((f) => f.risk === 'critical').length
  const high = findings.filter((f) => f.risk === 'high').length
  const verdict: EmlReport['verdict'] = crit > 0 ? 'malicioso' : high > 0 ? 'sospechoso' : 'limpio'
  return { from, returnPath, received, subject, spf, dkim, dmarc, attachments, findings, verdict }
}

/* ---------- 5. Catálogo didáctico ---------- */

export const MALDOC_LIMITS: string[] = [
  'El análisis es estático y textual: un PDF ofuscado con streams FlateDecode comprimidos exige extraer y descomprimir los streams (aquí se ven los triggers sin comprimir o en metadatos).',
  'La ausencia de gatillos NO garantiza seguridad: exploits de memoria contra el propio lector no dejan cadenas visibles en el PDF.',
  'El vbaProject.bin generado es una firma simulada para pruebas estáticas: para VBA real usa oletools (olevba) en un entorno controlado.',
  'Nada se ejecuta jamás al analizar: no abras las muestras fuera de una sandbox si tu intención es aprender ofensiva.',
]

export const MALDOC_LESSONS: { title: string; lesson: string }[] = [
  { title: 'La cadena completa', lesson: 'Documento malicioso = cebo (texto legítimo) + gatillo (OpenAction, macro AutoOpen) + payload (Launch, JS, shellcode) + destino (C2, fichero dropeado). El análisis estático busca cada eslabón por separado.' },
  { title: 'Por qué Office gana', lesson: 'Las macros convierten un documento en un programa con las APIs de Windows: no hay exploit necesario, solo un usuario que pulse «Habilitar contenido». Por eso Microsoft bloquea macros de Internet por defecto desde 2022.' },
  { title: 'Evasión por cifrado', lesson: 'PDF cifrado o DOCX con contraseña: el antivirus no puede leer el contenido. La contraseña viaja en el CUERPO del email o en un correo previo («la clave es 1234»). Busca /Encrypt y menciones de password.' },
  { title: 'El .eml miente en el From', lesson: 'La cabecera From es texto libre: la identidad real está en Return-Path (sobre SMTP) y en Received (leído de abajo a arriba). SPF/DKIM/DMARC autentican el dominio del sobre, no lo que ves.' },
  { title: 'Defensa operativa', lesson: 'Marcar como externo los emails, bloquear macros con firma obligatoria, desactivar Launch en lectores PDF, sandbox que abre documentos en VM y registro de procesos hijos de WINWORD.EXE / ACROBAT.EXE.' },
]
