/* Generador de informes de pentest/auditoría: estructuras un hallazgo
   con severidad, evidencia, impacto, remediación y referencias, y exporta
   Markdown profesional listo para entregar (o pegar en GitLab issues). */

export type Severity = 'crítica' | 'alta' | 'media' | 'baja' | 'info'

export const SEVERITY_ORDER: Record<Severity, number> = { crítica: 0, alta: 1, media: 2, baja: 3, info: 4 }
export const SEVERITY_COLOR: Record<Severity, string> = {
  crítica: '#f87171',
  alta: '#fb923c',
  media: '#facc15',
  baja: '#38bdf8',
  info: '#9ca3af',
}
export const SEVERITY_CVSS_HINT: Record<Severity, string> = {
  crítica: 'CVSS 9.0-10.0 · RCE sin auth, bypass total',
  alta: 'CVSS 7.0-8.9 · privesc, fuga de datos, RCE con condiciones',
  media: 'CVSS 4.0-6.9 · XSS almacenado, CSRF sensible, info leak',
  baja: 'CVSS 0.1-3.9 · disclosure menor, misconfig no explotable',
  info: 'mejora, hardening, buena práctica',
}

export interface Finding {
  id: string
  title: string
  severity: Severity
  category: string // web, red, active directory, cloud, físico…
  target: string // host/app/ámbito
  description: string
  impact: string
  poc: string // pasos o evidencia (comandos, request, screenshot ref)
  remediation: string[]
  references: string[] // URLs CVE, CWE, guía
  cwe?: string
}

export interface ReportMeta {
  client: string
  scope: string
  tester: string
  period: string
  methodology: string
  executive: string
}

export const FINDING_CATEGORIES = ['web', 'API', 'red', 'active directory', 'cloud', 'móvil', 'físico', 'OSINT', 'social engineering', ' wireless']

export const EXEC_TEMPLATE = `Durante el periodo evaluado se han identificado {TOTAL} hallazgos: {POR_SEVERIDAD}. El riesgo global es {RIESGO_GLOBAL}. Las vulnerabilidades de severidad {MAX_SEV} deberían remediarse con carácter prioritario antes de {PLAZO_SUGERIDO}.`

export function severityCounts(findings: Finding[]): Record<Severity, number> {
  const c: Record<Severity, number> = { crítica: 0, alta: 0, media: 0, baja: 0, info: 0 }
  for (const f of findings) c[f.severity]++
  return c
}

export function globalRisk(findings: Finding[]): { label: string; color: string } {
  if (findings.some((f) => f.severity === 'crítica')) return { label: 'CRÍTICO', color: SEVERITY_COLOR.crítica }
  if (findings.some((f) => f.severity === 'alta')) return { label: 'ALTO', color: SEVERITY_COLOR.alta }
  if (findings.some((f) => f.severity === 'media')) return { label: 'MEDIO', color: SEVERITY_COLOR.media }
  if (findings.some((f) => f.severity === 'baja')) return { label: 'BAJO', color: SEVERITY_COLOR.baja }
  return { label: 'INFORMATIVO', color: SEVERITY_COLOR.info }
}

const mdEsc = (s: string) => s.replace(/\|/g, '\\|')

/** Informe completo en Markdown (formato estándar de la industria). */
export function buildReportMarkdown(meta: ReportMeta, findings: Finding[]): string {
  const L: string[] = []
  const counts = severityCounts(findings)
  const risk = globalRisk(findings)
  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  L.push(`# Informe de prueba de intrusión — ${meta.client}`)
  L.push('')
  L.push(`> **Alcance:** ${meta.scope}  `)
  L.push(`> **Auditor:** ${meta.tester}  `)
  L.push(`> **Periodo:** ${meta.period}  `)
  L.push(`> **Metodología:** ${meta.methodology}`)
  L.push('')
  L.push('---')
  L.push('')
  L.push('## 1. Resumen ejecutivo')
  L.push('')
  L.push(meta.executive || EXEC_TEMPLATE.replace('{TOTAL}', String(findings.length)).replace('{POR_SEVERIDAD}', Object.entries(counts).filter(([, n]) => n > 0).map(([s, n]) => `${n} de severidad ${s}`).join(', ') || 'ningún hallazgo').replace('{RIESGO_GLOBAL}', risk.label).replace('{MAX_SEV}', sorted[0]?.severity ?? 'n/a').replace('{PLAZO_SUGERIDO}', '30 días'))
  L.push('')
  L.push('## 2. Resumen de hallazgos')
  L.push('')
  L.push('| ID | Hallazgo | Severidad | Categoría | Objetivo |')
  L.push('|----|----------|-----------|-----------|----------|')
  for (const f of sorted) {
    L.push(`| ${mdEsc(f.id)} | ${mdEsc(f.title)} | **${f.severity.toUpperCase()}** | ${mdEsc(f.category)} | ${mdEsc(f.target)} |`)
  }
  L.push('')
  L.push('## 3. Hallazgos detallados')
  L.push('')
  for (const f of sorted) {
    L.push(`### ${f.id} — ${f.title}`)
    L.push('')
    L.push(`- **Severidad:** ${f.severity.toUpperCase()} (${SEVERITY_CVSS_HINT[f.severity]})`)
    L.push(`- **Categoría:** ${f.category}`)
    L.push(`- **Objetivo:** ${f.target}`)
    if (f.cwe) L.push(`- **CWE:** [${f.cwe}](https://cwe.mitre.org/data/definitions/${f.cwe.replace('CWE-', '')}.html)`)
    L.push('')
    L.push('#### Descripción')
    L.push(f.description)
    L.push('')
    L.push('#### Impacto')
    L.push(f.impact)
    L.push('')
    L.push('#### Prueba de concepto')
    L.push('```')
    L.push(f.poc)
    L.push('```')
    L.push('')
    L.push('#### Remediación')
    f.remediation.forEach((r, i) => L.push(`${i + 1}. ${r}`))
    L.push('')
    if (f.references.length) {
      L.push('#### Referencias')
      f.references.forEach((r) => L.push(`- ${r}`))
      L.push('')
    }
    L.push('---')
    L.push('')
  }
  L.push('## 4. Metodología y limitaciones')
  L.push('')
  L.push('Prueba realizada en black/grey-box según alcance acordado. No se ha explotado ninguna vulnerabilidad con potencial de denegación de servicio. Los sistemas evaluados estaban fuera de producción salvo indicación expresa.')
  L.push('')
  L.push('_Generado con HackNexus Report Builder._')
  return L.join('\n')
}

/** Plantillas de hallazgos frecuentes para arrancar rápido. */
export const FINDING_TEMPLATES: { label: string; f: Omit<Finding, 'id'> }[] = [
  {
    label: 'SQL Injection (autenticación nula)',
    f: {
      title: 'Inyección SQL sin autenticación en formulario de búsqueda',
      severity: 'crítica',
      category: 'web',
      target: 'https://objetivo.com/search',
      description: 'El parámetro q se concatena directamente en una consulta SQL sin parametrizar. Es posible extraer el contenido completo de la base de datos con sqlmap.',
      impact: 'Acceso total a los datos: usuarios, hashes, PII. Posible RCE vía secure_file_priv en MySQL.',
      poc: 'sqlmap -u "https://objetivo.com/search?q=test" -p q --batch --dbs',
      remediation: ['Consultas parametrizadas (prepared statements) en TODA la aplicación', 'Validar y sanear entrada con lista blanca', 'Usuario de BD con privilegios mínimos', 'WAF como mitigación temporal'],
      references: ['https://owasp.org/Top10/A03_2021-Injection/', 'https://cwe.mitre.org/data/definitions/89.html'],
      cwe: 'CWE-89',
    },
  },
  {
    label: 'Contraseñas débiles / sin lockout',
    f: {
      title: 'Ausencia de bloqueo por intentos fallidos en login',
      severity: 'alta',
      category: 'web',
      target: 'https://objetivo.com/login',
      description: 'El formulario no implementa bloqueo ni CAPTCHA tras N intentos. Se validó con 500 intentos de credential stuffing sin bloqueo.',
      impact: 'Fuerza bruta viable contra cuentas reales; riesgo de account takeover.',
      poc: 'hydra -L users.txt -P rockyou.txt objetivo.com https-post-form "/login:user=^USER^&pass=^PASS^:F=incorrect"',
      remediation: ['Bloqueo temporal progresivo (5 intentos → 15 min)', 'CAPTCHA/2FA en segundos intentos', 'Alertar al usuario de logins desde dispositivos nuevos'],
      references: ['https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks'],
      cwe: 'CWE-307',
    },
  },
  {
    label: 'SMBv1 habilitado',
    f: {
      title: 'SMBv1 habilitado en servidor de producción',
      severity: 'alta',
      category: 'red',
      target: '10.0.0.15',
      description: 'El host responde en 445/tcp con dialecto NT LM 0.12 (SMB1), vulnerable a EternalBlue (MS17-010) y vulnerable a relay.',
      impact: 'RCE sin credenciales (EternalBlue) y movimiento lateral trivial en redes planas.',
      poc: 'nmap --script smb-vuln-ms17-010 -p445 10.0.0.15',
      remediation: ['Desactivar SMBv1 (Disable-WindowsOptionalFeature SMB1Protocol)', 'Habilitar firma SMB y cifrado', 'Segmentar red: SMB no debe cruzar VLANs'],
      references: ['https://learn.microsoft.com/en-us/windows-server/storage/file-server/smbv1-enable-and-disable'],
      cwe: 'CWE-1104',
    },
  },
  {
    label: 'Cabeceras de seguridad ausentes',
    f: {
      title: 'Faltan cabeceras de seguridad HTTP',
      severity: 'baja',
      category: 'web',
      target: 'https://objetivo.com',
      description: 'No se detectan Content-Security-Policy, X-Content-Type-Options ni Strict-Transport-Security en ninguna respuesta.',
      impact: 'Facilita XSS, clickjacking y downgrade de TLS; explotable combinado con otras fallas.',
      poc: 'curl -sI https://objetivo.com | grep -iE "security|csp|hsts"',
      remediation: ['Añadir CSP restrictiva en modo report-only primero', 'HSTS con max-age de 1 año y preload', 'X-Frame-Options DENY y X-Content-Type-Options nosniff'],
      references: ['https://owasp.org/www-project-secure-headers/'],
    },
  },
]
