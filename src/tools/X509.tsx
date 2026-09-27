import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, AlertTriangle, CheckCircle2, FileKey2 } from 'lucide-react'
import { ToolHeader, Button, Badge, Reveal, CopyBlock } from '../components/ui'
import { decodePem, parseCertificate, type CertInfo } from '../lib/x509'

const SAMPLE = `-----BEGIN CERTIFICATE-----
MIIB2zCCAWGgAwIBAgIUKYRLvN5PZ1+2W0LZz2V3 example: pega aquí un PEM real
-----END CERTIFICATE-----`

const FLAG_TONE = { ok: 'ok', aviso: 'warn', peligro: 'bad' } as const

export default function X509() {
  const [pem, setPem] = useState('')
  const cert: CertInfo | null = useMemo(() => {
    if (!pem.trim()) return null
    const der = decodePem(pem)
    return der ? parseCertificate(der) : null
  }, [pem])

  return (
    <div className="min-w-0">
      <ToolHeader
        icon={BadgeCheck}
        title="Certificado X.509 Decoder"
        desc="Pega un PEM y desglosa todo: subject/issuer, validez, SAN, EKU, keyUsage, BasicConstraints y flags de sospecha (CA:TRUE inesperada, SHA1, wildcards, auto-firmados)"
        badge="pki"
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[420px_1fr]">
        <Reveal>
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><FileKey2 size={15} className="text-acento" /> certificado PEM</h3>
            <textarea
              value={pem}
              onChange={(e) => setPem(e.target.value)}
              spellCheck={false}
              placeholder={SAMPLE}
              className="min-h-[240px] w-full resize-y rounded-lg border border-edge bg-black/40 px-3.5 py-2.5 font-mono text-[11px] text-ink outline-none transition-all placeholder:text-grey/40 focus:border-acento/60"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">todo se parsea localmente</Badge>
              <Badge tone="neutral">PEM o base64 DER</Badge>
              <Badge tone="neutral">público: el PEM no es secreto</Badge>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-grey">
              Consíguelo con: <code className="text-acento">openssl s_client -connect host:443 -showcerts 2&lt;/dev/null | sed -n '/BEGIN/,/END/p'</code> o exporta cualquiera de tu almacén.
            </p>
          </div>
        </Reveal>

        <div className="min-w-0 space-y-4">
          {!cert && !pem && (
            <Reveal>
              <div className="card p-8 text-center">
                <BadgeCheck size={28} className="mx-auto text-acento" />
                <p className="mt-3 font-mono text-sm text-ink">pega un certificado PEM a la izquierda</p>
                <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-grey">
                  Verás la anatomía completa: quién firma a quién, para qué sirve la clave y las banderas que un auditor mira antes que nadie — como un <b className="text-ink">CA:TRUE escondido en un cert de servidor</b> o un wildcard que tumba el dominio entero si filtran la clave.
                </p>
              </div>
            </Reveal>
          )}

          {cert?.error && (
            <p className="rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 font-mono text-xs text-bad">{cert.error}</p>
          )}

          {cert && !cert.error && (
            <>
              {cert.flags.length > 0 && (
                <Reveal>
                  <div className="card p-5">
                    <h3 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold text-white"><AlertTriangle size={15} className="text-warn" /> flags de sospecha</h3>
                    <div className="space-y-2">
                      {cert.flags.map((f, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-lg border px-3.5 py-2.5 text-[12px] leading-snug ${f.level === 'peligro' ? 'border-bad/40 bg-bad/5 text-bad' : 'border-warn/30 bg-warn/5 text-warn/90'}`}>
                          <Badge tone={FLAG_TONE[f.level]} className="mr-2">{f.level}</Badge>{f.text}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}
              {cert.flags.length === 0 && (
                <Reveal>
                  <p className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok/5 px-4 py-3 font-mono text-xs text-ok">
                    <CheckCircle2 size={14} /> sin flags de sospecha: algoritmos modernos, validez razonable y sin permisos sorpresa
                  </p>
                </Reveal>
              )}

              <Reveal delay={0.05}>
                <div className="card p-5">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['subject', cert.subject || '—'],
                      ['issuer', cert.issuer || '—'],
                      ['versión', `v${cert.version}`],
                      ['serial', cert.serial || '—'],
                      ['algoritmo de firma', cert.sigAlg],
                      ['clave pública', `${cert.keyAlg}${cert.keyBits ? ` · ${cert.keyBits} bits` : ''}`],
                      ['válido desde', cert.notBefore ?? '—'],
                      ['válido hasta', cert.notAfter ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-edge bg-black/30 px-3 py-2">
                        <p className="font-mono text-[9.5px] uppercase tracking-wider text-grey">{k}</p>
                        <p className="break-all font-mono text-[11.5px] text-ink">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={cert.selfSigned ? 'warn' : 'ok'}>{cert.selfSigned ? 'auto-firmado' : 'firmado por CA'}</Badge>
                    {cert.isCA !== null && <Badge tone={cert.isCA ? 'bad' : 'ok'}>CA: {cert.isCA ? 'TRUE' : 'FALSE'}</Badge>}
                    {cert.expired !== null && <Badge tone={cert.expired ? 'bad' : 'ok'}>{cert.expired ? 'expirado' : 'vigente'}</Badge>}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="card p-5">
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">SAN (subjectAltName)</h3>
                  {cert.sans.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cert.sans.map((s) => <Badge key={s} tone={s.startsWith('DNS:*') ? 'warn' : 'accent'}>{s}</Badge>)}
                    </div>
                  ) : (
                    <p className="font-mono text-[11.5px] text-grey">sin SAN declarada</p>
                  )}
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="card p-5">
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">extensiones ({cert.exts.length})</h3>
                  <div className="space-y-1">
                    {cert.exts.map((e, i) => (
                      <div key={i} className="rounded border border-edge bg-black/20 px-3 py-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <code className="font-mono text-[10.5px] text-acento">{e.oid}</code>
                          <span className="font-mono text-[11.5px] font-bold text-white">{e.name}</span>
                          {e.critical && <Badge tone="bad">critical</Badge>}
                        </div>
                        <p className="mt-1 break-all font-mono text-[11px] text-grey">{e.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.12}>
                <CopyBlock
                  text={JSON.stringify(
                    {
                      subject: cert.subject, issuer: cert.issuer, serial: cert.serial, sigAlg: cert.sigAlg,
                      key: `${cert.keyAlg} ${cert.keyBits ?? ''}`.trim(), notBefore: cert.notBefore, notAfter: cert.notAfter,
                      sans: cert.sans, isCA: cert.isCA, selfSigned: cert.selfSigned, flags: cert.flags.map((f) => f.text),
                      extensions: cert.exts,
                    },
                    null,
                    2,
                  )}
                  label="cert.json"
                  maxH="max-h-64"
                />
              </Reveal>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
