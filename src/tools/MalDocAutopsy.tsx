import { useMemo, useState } from 'react'
import { FileWarning, FileText, FileCode2, MailWarning, FlaskConical, Download } from 'lucide-react'
import {
  Badge,
  Button,
  CopyBlock,
  InfoBanner,
  KV,
  Reveal,
  TextArea,
  ToolHeader,
} from '../components/ui'
import {
  MALDOC_LESSONS,
  MALDOC_LIMITS,
  OOXML_CHECKS,
  PDF_TRIGGERS,
  analyzeEml,
  analyzeOoxml,
  analyzePdf,
  generateMacroDocx,
  generateSuspiciousPdf,
} from '../lib/maldoc'
import type { MaldocFinding, OoxmlFinding, EmlFinding } from '../lib/maldoc'

type Tab = 'pdf' | 'ooxml' | 'eml' | 'samples'
const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'ooxml', label: 'OOXML', icon: FileCode2 },
  { id: 'eml', label: 'EML', icon: MailWarning },
  { id: 'samples', label: 'Muestras', icon: FlaskConical },
]

const EML_DEMO = `Del: "Soporte IT Corp" <soporte@it-corp-seguridad.com>
Return-Path: <bounce@mailer-sec.ru>
Subject: URGENTE: Tu cuenta sera desactivada en 24h
Authentication-Results: mx.destino.com; spf=fail smtp.mail=mailer-sec.ru; dkim=none; dmarc=fail
Received: from mail-out3.mailer-sec.ru (unknown [185.220.101.3])
	by mx.destino.com with ESMTPS id 8a2b1c;
Received: from localhost (HELO pc-usuario) by mail-out3.mailer-sec.ru
Content-Type: multipart/mixed; boundary="BOUND"

--BOUND
Content-Type: text/html

<p>Estimado usuario,</p>
<p>Su buzon sera <a href="https://it-corp-verify.top/login">DESACTIVADO</a> si no verifica sus credenciales aqui.</p>

--BOUND
Content-Disposition: attachment; filename="factura_pendiente.pdf.exe"
Content-Type: application/octet-stream

MZ90...
--BOUND--`

function riskTone(r: 'critical' | 'high' | 'medium' | 'info'): 'bad' | 'warn' | 'info' | 'ok' {
  if (r === 'critical') return 'bad'
  if (r === 'high') return 'warn'
  if (r === 'info') return 'ok'
  return 'info'
}

function verdictTone(v: string): 'bad' | 'warn' | 'info' | 'ok' {
  if (v === 'malicioso' || v === 'muy sospechoso') return 'bad'
  if (v === 'sospechoso') return 'warn'
  return 'ok'
}

function FindingRow({ f }: { f: MaldocFinding | OoxmlFinding | EmlFinding }) {
  const why = 'why' in f ? f.why : ''
  const detail: string = 'detail' in f ? String(f.detail) : 'context' in f ? String(f.context) : ''
  const label: string = 'name' in f ? String(f.name) : 'trigger' in f ? String(f.trigger) : 'header' in f ? String(f.header) : '?'
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={riskTone(f.risk)}>{f.risk}</Badge>
        <span className="font-mono text-sm font-semibold">{label}</span>
        {'matches' in f && f.matches > 1 && <span className="text-xs text-white/40">×{f.matches}</span>}
      </div>
      <p className="mt-1 text-xs text-white/60">{why}</p>
      {detail && <p className="mt-1 break-all font-mono text-xs text-info">{detail}</p>}
    </div>
  )
}

export default function MalDocAutopsy() {
  const [tab, setTab] = useState<Tab>('pdf')

  /* PDF */
  const [pdfText, setPdfText] = useState('')
  const pdf = useMemo(() => (pdfText.trim() ? analyzePdf(pdfText) : null), [pdfText])

  /* OOXML (inventario textual) */
  const [ooxmlText, setOoxmlText] = useState('')
  const ooxml = useMemo(() => {
    if (!ooxmlText.trim()) return null
    const files = ooxmlText
      .split(/(?=\[?\/?(?:\[Content_Types\]|_rels|word|xl|ppt|docProps|customXml)[/.\]])/i)
      .map((chunk) => {
        const m = /^([\[\]\/\w.\- ]{1,80})\n?/.exec(chunk)
        return { name: m?.[1]?.trim() ?? 'fragmento', content: chunk }
      })
    return analyzeOoxml(files.length ? files : [{ name: 'inventario', content: ooxmlText }])
  }, [ooxmlText])

  /* EML */
  const [emlText, setEmlText] = useState('')
  const eml = useMemo(() => (emlText.trim() ? analyzeEml(emlText) : null), [emlText])

  function download(bytes: Uint8Array, filename: string, mime = 'application/octet-stream') {
    const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <ToolHeader
        icon={FileWarning}
        title="MalDoc Autopsy"
        desc="Autopsia de documentos maliciosos sin ejecutar nada: gatillos de PDF (/OpenAction, /Launch, /JS), relaciones externas y VBA de Office, cabeceras .eml de phishing y muestras de laboratorio para entrenar la vista"
        badge="Ronda 18"
      />

      <InfoBanner>
        Un documento malicioso <b>no ejecuta nada durante el análisis</b>: aquí solo se leen bytes. La cadena de ataque
        (gatillo → payload → persistencia) se reconstruye buscando estructuras, no ejecutándolas. Pega el contenido{' '}
        <b>de una muestra de laboratorio</b>, nunca de una campaña real sin tratar.
      </InfoBanner>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} variant={tab === t.id ? 'primary' : 'ghost'} onClick={() => setTab(t.id)} className="gap-2">
            <t.icon size={14} /> {t.label}
          </Button>
        ))}
      </div>

      {tab === 'pdf' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Contenido del PDF (texto crudo o hex-dump decodificado)
              </label>
              <TextArea
                value={pdfText}
                onChange={(e) => setPdfText(e.target.value)}
                rows={8}
                placeholder={'%PDF-1.7\n1 0 obj\n<< /Type /Catalog /OpenAction 4 0 R >>\nendobj …'}
              />
              <p className="mt-2 text-xs text-white/50">
                Consejo: extrae el texto con <code className="font-mono">strings malicioso.pdf | head -200</code> o usa la
                muestra del generador (pestaña Muestras).
              </p>
            </div>
            {pdf && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Badge tone={verdictTone(pdf.verdict)}>{pdf.verdict}</Badge>
                    <span className="text-xs text-white/60">{pdf.verdictWhy}</span>
                  </div>
                  <div className="grid gap-x-6 sm:grid-cols-4">
                    <KV k="Versión" v={pdf.version} />
                    <KV k="Objetos" v={String(pdf.objects)} />
                    <KV k="Streams" v={String(pdf.streams)} />
                    <KV k="Cifrado" v={pdf.encrypted ? 'SÍ (evasión AV)' : 'no'} />
                  </div>
                </div>
                {pdf.findings.length > 0 && (
                  <div className="space-y-2">
                    {pdf.findings.map((f, i) => (
                      <FindingRow key={i} f={f} />
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <h4 className="mb-2 text-sm font-semibold">Cadena de ejecución reconstruida</h4>
                  <ol className="list-decimal space-y-1 pl-5 text-xs text-white/70">
                    {pdf.chain.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
            <Reveal delay={0.05}>
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h4 className="mb-3 text-sm font-semibold">Catálogo de gatillos PDF</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {PDF_TRIGGERS.map((t) => (
                    <div key={t.key} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={riskTone(t.risk)}>{t.key}</Badge>
                        <span className="text-sm font-semibold">{t.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/60">{t.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Reveal>
      )}

      {tab === 'ooxml' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
                Inventario del OOXML (nombres de fichero + XML: unzip -l + cat de los .rels)
              </label>
              <TextArea
                value={ooxmlText}
                onChange={(e) => setOoxmlText(e.target.value)}
                rows={8}
                placeholder={'[Content_Types].xml\n<Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/>\nword/_rels/document.xml.rels\n<Relationship Target="file://\\\\servidor\\plant.dotm" TargetMode="External"/>'}
              />
            </div>
            {ooxml && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={verdictTone(ooxml.verdict)}>{ooxml.verdict}</Badge>
                    <span className="text-xs text-white/60">
                      {ooxml.findings.length === 0 ? 'Sin indicadores en el inventario' : `${ooxml.findings.length} indicador(es)`}
                    </span>
                  </div>
                </div>
                {ooxml.findings.map((f, i) => (
                  <FindingRow key={i} f={f} />
                ))}
              </div>
            )}
            <Reveal delay={0.05}>
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h4 className="mb-3 text-sm font-semibold">Qué busca la autopsia de Office</h4>
                <div className="space-y-2">
                  {OOXML_CHECKS.map((c) => (
                    <div key={c.name} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <Badge tone={riskTone(c.risk)}>{c.name}</Badge>
                      <p className="mt-1 text-xs text-white/60">{c.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Reveal>
      )}

      {tab === 'eml' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/50">Código fuente del .eml</label>
                <Button variant="ghost" className="text-xs" onClick={() => setEmlText(EML_DEMO)}>
                  Cargar ejemplo de phishing
                </Button>
              </div>
              <TextArea value={emlText} onChange={(e) => setEmlText(e.target.value)} rows={10} placeholder={'Del: …\nReturn-Path: …\nReceived: …\nAuthentication-Results: …'} />
            </div>
            {eml && (
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-panel p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <Badge tone={verdictTone(eml.verdict)}>{eml.verdict}</Badge>
                    <span className="text-xs text-white/60">{eml.findings.length === 0 ? 'Cabeceras coherentes' : `${eml.findings.length} hallazgo(s)`}</span>
                  </div>
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <KV k="From" v={eml.from || '—'} />
                    <KV k="Return-Path (sobre real)" v={eml.returnPath || '—'} />
                    <KV k="SPF / DKIM / DMARC" v={`${eml.spf} / ${eml.dkim} / ${eml.dmarc}`} />
                    <KV k="Asunto" v={eml.subject || '—'} />
                    <KV k="Adjuntos" v={eml.attachments.length ? eml.attachments.join(', ') : 'ninguno'} />
                    <KV k="Saltos Received" v={String(eml.received.length)} />
                  </div>
                </div>
                {eml.findings.map((f, i) => (
                  <FindingRow key={i} f={f} />
                ))}
                <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-xs text-info">
                  Las cabeceras <b>Received se leen de abajo hacia arriba</b>: la última añadida (arriba) es la de tu
                  servidor; la de más abajo, la del remitente real. Compara esa IP con el dominio del From.
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {tab === 'samples' && (
        <Reveal>
          <div className="space-y-4">
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
              Muestras <b>inertes de laboratorio</b>: el PDF no ejecuta nada (los lectores modernos bloquean /Launch a
              cmd.exe) y el vbaProject.bin del DOCX es una firma simulada. Sirven para practicar el análisis estático de
              esta misma tool y calibrar sandboxes.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h4 className="text-sm font-semibold">PDF con cadena completa</h4>
                <p className="mt-1 text-xs text-white/60">OpenAction + JS + Launch + adjunto embebido + URI UNC: veredicto esperado «malicioso».</p>
                <div className="mt-3 space-y-2">
                  <CopyBlock text={generateSuspiciousPdf()} label="suspicious.pdf" maxH="12rem" />
                  <Button variant="ghost" className="w-full gap-2 text-xs" onClick={() => download(new TextEncoder().encode(generateSuspiciousPdf()), 'suspicious.pdf', 'application/pdf')}>
                    <Download size={14} /> Descargar suspicious.pdf
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-panel p-4">
                <h4 className="text-sm font-semibold">DOCX con macros + hyperlink externo</h4>
                <p className="mt-1 text-xs text-white/60">Content-type macroEnabled, vbaProject.bin simulado y relación External a un .hta en UNC.</p>
                <div className="mt-3 space-y-2">
                  <Button variant="ghost" className="w-full gap-2 text-xs" onClick={() => download(generateMacroDocx().bytes, generateMacroDocx().filename)}>
                    <Download size={14} /> Descargar {generateMacroDocx().filename}
                  </Button>
                  <Button variant="ghost" className="w-full gap-2 text-xs" onClick={() => { setTab('ooxml'); setOoxmlText('[Content_Types].xml\n<Override ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/>\nword/_rels/document.xml.rels\n<Relationship Target="file://\\\\intranet-corp\\pagos\\actualizar.hta" TargetMode="External"/>\nword/vbaProject.bin') }}>
                    Analizar su inventario en la pestaña OOXML
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical size={16} className="text-acento" />
            <h3 className="text-sm font-semibold">Lecciones de la autopsia</h3>
          </div>
          <div className="space-y-2">
            {MALDOC_LESSONS.map((l) => (
              <div key={l.title} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <span className="text-sm font-semibold">{l.title}</span>
                <p className="mt-1 text-xs text-white/60">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="rounded-xl border border-white/10 bg-panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Límites honestos</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-white/60">
            {MALDOC_LIMITS.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}
