import { useMemo, useState } from 'react'
import { MailWarning, FileText, ShieldCheck, Route } from 'lucide-react'
import { ToolHeader, Badge, Button, Reveal, KV, CopyBlock, InfoBanner } from '../components/ui'
import { analyzeMailHeaders, type MailHeaderReport } from '../lib/phishing'

const DEMO = `Received: from mail-out.attacker.net (mail-out.attacker.net [203.0.113.88])
	by mx.empresa.com (Postfix) with ESMTPS id 4XkQ2v1Z
	for <empleado@empresa.com>; Fri, 13 Mar 2026 09:14:22 +0100 (CET)
Received: from [10.0.0.5] (unknown [198.51.100.7])
	by mail-out.attacker.net (Postfix) with ESMTPA id 9F3D11
	; Fri, 13 Mar 2026 09:14:20 +0100 (CET)
Authentication-Results: mx.empresa.com; spf=softfail (domain owner discourages this sender) smtp.mailfrom=banca-segura.net; dkim=none; dmarc=fail action=quarantine header.from=bbva.es
X-Mailer: PHPMailer 6.8.0 (https://github.com/PHPMailer)
Return-Path: <bounce@banca-segura.net>
Reply-To: soporte.recuperacion@banca-segura.net
From: "BBVA Seguridad" <seguridad@bbva.es>
To: <empleado@empresa.com>
Subject: Urgente: su cuenta ha sido bloqueada
Date: Fri, 13 Mar 2026 09:14:21 +0100
Message-ID: <20260313091421.9F3D11@mail-out.attacker.net>

Su cuenta será suspendida en 24 horas. Verifique su identidad.`

const verdictBadge = (v: string) =>
  v === 'pass' ? <Badge tone="ok">{v}</Badge>
  : v === 'sin cabecera' ? <Badge tone="neutral">{v}</Badge>
  : v === 'fail' || v === 'hardfail' ? <Badge tone="bad">{v}</Badge>
  : <Badge tone="warn">{v}</Badge>

export default function Mailheader() {
  const [raw, setRaw] = useState('')

  const rep: MailHeaderReport | null = useMemo(() => {
    if (!raw.trim()) return null
    try { return analyzeMailHeaders(raw) } catch { return null }
  }, [raw])

  const scoreTone = rep ? (rep.score >= 50 ? 'bad' : rep.score >= 20 ? 'warn' : 'ok') : 'neutral'
  const scoreLabel = rep ? (rep.score >= 50 ? 'phishing muy probable' : rep.score >= 20 ? 'sospechoso' : 'sin señales fuertes') : ''

  return (
    <div>
      <ToolHeader icon={MailWarning} title="Email Header Analyzer" desc="Analiza cabeceras de email: cadena Received, SPF/DKIM/DMARC, Return-Path vs From, Reply-To y puntuación de spoofing — 100% local" />

      <InfoBanner>
        Pega las cabeceras completas del correo sospechoso (Gmail: ⋮ → <b>Mostrar original</b>; Outlook: Propiedades → <b>Encabezados de internet</b>). El análisis es heurístico y local: perfecto para triage rápido del equipo de seguridad o formación.
      </InfoBanner>

      <Reveal>
        <div className="card p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setRaw(DEMO)} className="gap-2"><FileText size={14} /> cargar ejemplo (spoofing bancario)</Button>
            {raw && <Button variant="ghost" onClick={() => setRaw('')}>limpiar</Button>}
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            placeholder={'Received: from …\nAuthentication-Results: …\nFrom: "Nombre" <correo@dominio>\nSubject: …'}
            className="min-h-52 w-full resize-y rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-acento/60"
          />
        </div>
      </Reveal>

      {rep && (
        <>
          <Reveal>
            <div className="card mt-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-grey">veredicto</h3>
                <Badge tone={scoreTone}>riesgo {rep.score}/100 — {scoreLabel}</Badge>
              </div>
              <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-black/60">
                <div className={`h-full transition-all duration-500 ${rep.score >= 50 ? 'bg-bad' : rep.score >= 20 ? 'bg-warn' : 'bg-ok'}`} style={{ width: `${Math.max(4, rep.score)}%` }} />
              </div>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="Subject" v={rep.subject || '—'} mono={false} />
                  <KV k="From" v={rep.from || '—'} />
                  <KV k="Return-Path" v={rep.returnPath || '—'} />
                  <KV k="Reply-To" v={rep.replyTo || '—'} />
                </div>
                <div className="divide-y divide-edge/60 overflow-hidden rounded-xl border border-edge">
                  <KV k="To" v={rep.to || '—'} />
                  <KV k="Date" v={rep.date || '—'} />
                  <KV k="Message-ID" v={rep.messageId || '—'} />
                  <KV k="saltos Received" v={String(rep.hops.length)} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {rep.auth.map((a) => (
                  <div key={a.label} className="rounded-xl border border-edge bg-black/30 p-4 text-center">
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-grey">{a.label}</p>
                    {verdictBadge(a.value)}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {rep.findings.length > 0 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-grey">hallazgos ({rep.findings.length})</h3>
                <div className="space-y-2">
                  {rep.findings.map((f, i) => (
                    <div key={i} className={`rounded-lg border px-3 py-2 font-mono text-[11px] ${
                      f.sev === 'bad' ? 'border-bad/40 bg-bad/5 text-ink/90'
                      : f.sev === 'warn' ? 'border-warn/30 bg-warn/5 text-ink/90'
                      : f.sev === 'ok' ? 'border-ok/30 bg-ok/5 text-ok/90'
                      : 'border-edge bg-black/30 text-grey'}`}>
                      <Badge tone={f.sev === 'info' ? 'neutral' : f.sev} className="mr-2">{f.sev === 'bad' ? 'crítico' : f.sev === 'warn' ? 'aviso' : f.sev === 'ok' ? 'ok' : 'info'}</Badge>
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {rep.hops.length > 0 && (
            <Reveal>
              <div className="card mt-6 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><Route size={13} /> ruta del mensaje (del origen a tu servidor)</h3>
                <div className="space-y-2">
                  {rep.hops.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-edge bg-black/30 px-3 py-2 font-mono text-[11px]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-acento/15 text-[10px] text-acento">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink">from <span className="text-acento">{h.from}</span> → by <span className="text-info">{h.by}</span>{h.with ? <> · with <span className="text-grey">{h.with}</span></> : null}</p>
                        {h.date && <p className="mt-0.5 text-grey/70">{h.date}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] text-grey">El salto 1 es el servidor emisor original: comprueba su país/ASN con IP Info. Saltos con "with ESMTP" (sin S) viajaron sin TLS.</p>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="card mt-6 p-6">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-grey"><ShieldCheck size={13} /> qué comprobar manualmente</h3>
              <CopyBlock
                label="checklist anti-spoofing"
                maxH="max-h-56"
                text={[
                  '1. ¿From visible ≠ Return-Path (envelope)? → spoofing directo, prioriza DMARC del dominio',
                  '2. ¿Reply-To distinto de From? → las respuestas van al atacante (BEC clásico)',
                  '3. ¿SPF/DKIM/DMARC = pass? Si alguno falla y From es tu dominio → revisa tu política DMARC (p=reject)',
                  '4. Salto 1 de Received: ¿ASN/paés esperado para ese remitente? (crúzalo con IP Info)',
                  '5. ¿X-Mailer de script (PHPMailer, swaks, python)? → enviado a mano, no por un MTA legítimo',
                  '6. ¿Display name suplanta a alguien interno? Verifica por otro canal antes de actuar',
                ].join('\n')}
              />
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
