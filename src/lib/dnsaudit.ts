/* Auditoría de seguridad de dominio vía registros DNS:
   email spoofing (SPF/DKIM/DMARC), emisores de certs (CAA),
   delegación segura (DSA/DNSSEC), zona transfers (AXFR probable si NS expuestos sin DNSSEC...),
   y puntuación de riesgo 0-100 con hallazgos accionables. */

export interface DnsSecRecord {
  spf?: string
  dmarc?: string
  dkim: boolean
  caa: string[]
  dnskey: boolean
  ds: boolean
  mx: string[]
  ns: string[]
}

export interface Finding {
  id: string
  title: string
  detail: string
  level: 'critico' | 'alto' | 'medio' | 'bajo' | 'ok'
  weight: number // puntos de riesgo que añade
}

export interface DnsAuditResult {
  riskScore: number // 0-100 (100 = tirado a la calle)
  riskLabel: 'crítico' | 'alto' | 'medio' | 'bajo' | 'endurecido'
  grade: string // A+..F
  findings: Finding[]
  positives: string[]
}

function parseSpf(spf: string): { all: string; includes: number; redirect: boolean; plusAll: boolean } {
  const mechs = spf.toLowerCase().split(/\s+/)
  const all = mechs.find((m) => m.startsWith('all')) ?? ''
  const includes = mechs.filter((m) => m.startsWith('include:') || m.startsWith('ip4:') || m.startsWith('ip6:')).length
  const redirect = mechs.some((m) => m.startsWith('redirect='))
  const plusAll = /\+all\b/.test(spf.toLowerCase())
  return { all, includes, redirect, plusAll }
}

function parseDmarc(dmarc: string): { p: string; pct?: string; rua: boolean; sp?: string } {
  const tags = Object.fromEntries(
    dmarc.split(';').map((t) => t.trim().split('=').map((x) => x.trim().toLowerCase())).filter((p) => p.length === 2),
  )
  return { p: tags['p'] ?? 'none', pct: tags['pct'], rua: 'rua' in tags, sp: tags['sp'] }
}

/** Puntuación de riesgo: 0 (endurecido) → 100 (suplantación trivial). */
export function auditDns(rec: DnsSecRecord): DnsAuditResult {
  const findings: Finding[] = []
  const positives: string[] = []
  let risk = 0

  /* ── SPF ── */
  if (!rec.spf) {
    risk += 35
    findings.push({ id: 'spf-missing', title: 'Sin SPF', detail: 'Cualquiera puede enviar email fingiendo ser este dominio. Publica un v=spf1 con tus remitentes reales y termina en -all.', level: 'critico', weight: 35 })
  } else {
    const spf = parseSpf(rec.spf)
    if (spf.plusAll) {
      risk += 40
      findings.push({ id: 'spf-plus-all', title: 'SPF con +all (permisivo total)', detail: '+all permite CUALQUIER servidor: el SPF existe pero no protege nada. Suele ser un error de sintaxis; cámbialo por -all.', level: 'critico', weight: 40 })
    } else if (spf.all === 'all' || spf.all === '?all') {
      risk += 25
      findings.push({ id: 'spf-soft-all', title: `SPF termina en ${spf.all || 'all'} (sin cualificador)`, detail: 'Sin -all o ~all el mecanismo all acepta todo. Usa ~all (softfail) como mínimo y -all para strict.', level: 'alto', weight: 25 })
    } else if (spf.all === '~all') {
      risk += 8
      findings.push({ id: 'spf-softfail', title: 'SPF softfail (~all)', detail: 'Los fallos se marcan pero no se rechazan. Válido en migraciones; si tu infraestructura es estable, sube a -all.', level: 'medio', weight: 8 })
    } else {
      positives.push('SPF con hardfail (-all): los receptores pueden rechazar suplantaciones')
    }
    if (spf.includes > 10) {
      risk += 5
      findings.push({ id: 'spf-many', title: `SPF con ${spf.includes} includes/IPs`, detail: 'Los lookups de SPF tienen límite de 10 DNS: con más, algunos receptores lo ignoran (permfail). Consolida includes.', level: 'bajo', weight: 5 })
    }
  }

  /* ── DMARC ── */
  if (!rec.dmarc) {
    risk += 30
    findings.push({ id: 'dmarc-missing', title: 'Sin DMARC', detail: 'SPF/DKIM sin DMARC no dan política: los receptores deciden por ti. Publica al menos p=quarantine con rua de reportes.', level: 'critico', weight: 30 })
  } else {
    const dm = parseDmarc(rec.dmarc)
    if (dm.p === 'none') {
      risk += 20
      findings.push({ id: 'dmarc-none', title: 'DMARC p=none (solo monitoriza)', detail: 'Los correos falsificados SE ENTREGAN. Es el primer paso legítimo, pero no el destino: sube a quarantine o reject cuando los reportes confirmen tus remitentes.', level: 'alto', weight: 20 })
    } else if (dm.p === 'quarantine') {
      risk += 6
      findings.push({ id: 'dmarc-quarantine', title: 'DMARC p=quarantine', detail: 'Los fallos van a spam. Buen equilibrio; p=reject lo cierra del todo.', level: 'medio', weight: 6 })
    } else {
      positives.push('DMARC p=reject: la política más dura contra suplantación')
    }
    if (!dm.rua) {
      risk += 3
      findings.push({ id: 'dmarc-no-rua', title: 'DMARC sin rua', detail: 'Sin dirección de reportes no ves quién intenta suplantarte. Añade rua=mailto:dmarc@tudominio.', level: 'bajo', weight: 3 })
    }
    if (dm.pct && parseInt(dm.pct) < 100) {
      findings.push({ id: 'dmarc-pct', title: `DMARC pct=${dm.pct}`, detail: `Solo el ${dm.pct}% de los correos recibe la política: despliegue gradual en curso.`, level: 'bajo', weight: 0 })
    }
  }

  /* ── DKIM (presencia heurística en TXT genéricos) ── */
  if (!rec.dkim) {
    risk += 8
    findings.push({ id: 'dkim-unknown', title: 'DKIM no detectado con consulta estándar', detail: 'No se encontró clave en selectores comunes (default/google/_domainkey). Puede existir con otro selector: verifica con tu proveedor de email. DKIM firma el mensaje íntegro.', level: 'medio', weight: 8 })
  } else {
    positives.push('DKIM público visible: los mensajes pueden firmarse criptográficamente')
  }

  /* ── CAA ── */
  if (rec.caa.length === 0) {
    risk += 10
    findings.push({ id: 'caa-missing', title: 'Sin CAA', detail: 'Cualquier CA pública puede emitir certificados para el dominio. Publica CAA con tus CAs (p.ej. letsencrypt.org) para acotar la emisoria.', level: 'medio', weight: 10 })
  } else {
    positives.push(`CAA presente: emisión restringida a ${rec.caa.length} entrada(s)`)
  }

  /* ── DNSSEC ── */
  if (!rec.dnskey && !rec.ds) {
    risk += 12
    findings.push({ id: 'dnssec-missing', title: 'Sin DNSSEC', detail: 'Las respuestas DNS pueden falsificarse en tránsito (cache poisoning). Firma la zona con DNSSEC en tu registrador.', level: 'medio', weight: 12 })
  } else {
    positives.push('DNSSEC activo: las respuestas de la zona están firmadas')
  }

  /* ── NS múltiples ── */
  if (rec.ns.length === 1) {
    risk += 6
    findings.push({ id: 'ns-single', title: 'Un solo nameserver', detail: 'Sin redundancia: si ese NS cae, el dominio entero (web + email) desaparece de internet.', level: 'medio', weight: 6 })
  } else if (rec.ns.length >= 2) {
    positives.push(`${rec.ns.length} nameservers: redundancia de resolución`)
  }

  risk = Math.max(0, Math.min(100, risk))
  const riskLabel = risk >= 70 ? 'crítico' : risk >= 45 ? 'alto' : risk >= 25 ? 'medio' : risk > 0 ? 'bajo' : 'endurecido'
  const grade = risk >= 70 ? 'F' : risk >= 45 ? 'D' : risk >= 25 ? 'C' : risk > 0 ? 'B' : 'A+'
  const order = { critico: 0, alto: 1, medio: 2, bajo: 3, ok: 4 } as const
  findings.sort((a, b) => order[a.level] - order[b.level] || b.weight - a.weight)
  return { riskScore: risk, riskLabel, grade, findings, positives }
}

/** Barras para el resumen por protección (0-100 de calidad de cada control). */
export function controlQuality(rec: DnsSecRecord): { label: string; quality: number; hint: string; present: boolean }[] {
  const spfOk = !!rec.spf && !/\+all\b/.test(rec.spf.toLowerCase()) && /[-~]\s*all\b|-all|~all/.test(rec.spf.toLowerCase())
  const dm = rec.dmarc ? parseDmarc(rec.dmarc) : null
  return [
    { label: 'SPF', present: !!rec.spf, quality: !rec.spf ? 0 : spfOk ? 100 : 35, hint: !rec.spf ? 'no publicado' : spfOk ? 'remitentes acotados' : 'existe pero permisivo' },
    { label: 'DKIM', present: rec.dkim, quality: rec.dkim ? 100 : 25, hint: rec.dkim ? 'clave pública visible' : 'selector estándar no encontrado' },
    { label: 'DMARC', present: !!rec.dmarc, quality: !dm ? 0 : dm.p === 'reject' ? 100 : dm.p === 'quarantine' ? 75 : 30, hint: !dm ? 'no publicado' : `p=${dm.p}` },
    { label: 'CAA', present: rec.caa.length > 0, quality: rec.caa.length ? 100 : 0, hint: rec.caa.length ? 'emisión limitada' : 'cualquier CA puede emitir' },
    { label: 'DNSSEC', present: rec.dnskey || rec.ds, quality: rec.dnskey || rec.ds ? 100 : 0, hint: rec.dnskey || rec.ds ? 'zona firmada' : 'respuestas sin firmar' },
  ]
}

export const RISK_COLORS: Record<DnsAuditResult['riskLabel'], string> = {
  'crítico': '#f43f5e',
  'alto': '#fb923c',
  'medio': '#f59e0b',
  'bajo': '#38bdf8',
  'endurecido': '#2ee88a',
}
