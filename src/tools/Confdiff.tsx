import { useMemo, useState } from 'react'
import { SnapshotButtons } from '../components/SnapshotButtons'
import { FileDiff } from 'lucide-react'
import { ToolHeader, Badge, Field, Reveal, InfoBanner } from '../components/ui'
import { diffConfigs, securityHits, CONFDIFF_NOTES, CONFDIFF_USECASES } from '../lib/confdiff'

const EXAMPLE_A = `#Port 22
AddressFamily any
ListenAddress 0.0.0.0
PermitRootLogin yes
PasswordAuthentication yes
MaxAuthTries 6
X11Forwarding yes`

const EXAMPLE_B = `Port 2222
AddressFamily any
ListenAddress 0.0.0.0
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
AllowUsers admin

`

export default function Confdiff() {
  const [a, setA] = useState(EXAMPLE_A)
  const [b, setB] = useState(EXAMPLE_B)

  const { entries, stats } = useMemo(() => diffConfigs(a, b), [a, b])
  const secHits = useMemo(() => securityHits(entries), [entries])

  return (
    <>
      <ToolHeader icon={FileDiff} title="Config Diff" desc="Compara ficheros de configuración como un profesional: diff SEMÁNTICO que ignora comentarios, espacios y orden, resalta las directivas de seguridad que cambiaron y cuenta qué se añadió, quitó o modificó" />
      <SnapshotButtons
        toolId="confdiff"
        label="los dos textos"
        getData={() => ({ a, b })}
        onLoad={(d) => { if (d.a) setA(d.a); if (d.b) setB(d.b) }}
      />

      <InfoBanner>
        <b>Ideal para auditoría:</b> pega la config de fábrica (o un backup) y la config actual del servidor.
        Un <span className="font-mono">PermitRootLogin yes</span> que nadie explica o un <span className="font-mono">AuthorizedKeysFile</span> raro
        son backdoors clásicos que este diff te pone delante.
      </InfoBanner>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="ok">+{stats.added} añadidas</Badge>
        <Badge tone="bad">−{stats.removed} eliminadas</Badge>
        <Badge tone="warn">~{stats.changed} cambiadas</Badge>
        <Badge tone="neutral">{stats.same} intactas</Badge>
        {secHits.length > 0 && <Badge tone="accent">{secHits.length} de seguridad ⚡</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Config A (antes / fábrica)">
          <textarea value={a} onChange={(e) => setA(e.target.value)} rows={12} className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs" />
        </Field>
        <Field label="Config B (ahora / servidor)">
          <textarea value={b} onChange={(e) => setB(e.target.value)} rows={12} className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs" />
        </Field>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold">Diferencias ({entries.length})</h3>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <Reveal key={e.key} delay={i * 0.02}>
            <div className={`rounded border px-3 py-2 font-mono text-xs ${e.kind === 'added' ? 'border-ok/40 bg-ok/5' : e.kind === 'removed' ? 'border-bad/40 bg-bad/5' : 'border-warn/40 bg-warn/5'}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge tone={e.kind === 'added' ? 'ok' : e.kind === 'removed' ? 'bad' : 'warn'}>
                  {e.kind === 'added' ? '+' : e.kind === 'removed' ? '−' : '~'} {e.key}
                </Badge>
                <span className="text-grey">
                  {e.kind === 'removed' ? (
                    <><span className="text-bad line-through">{e.oldValue}</span> (línea {e.oldLine})</>
                  ) : e.kind === 'added' ? (
                    <><span className="text-ok">{e.newValue}</span> (línea {e.newLine})</>
                  ) : (
                    <><span className="text-bad line-through">{e.oldValue}</span> → <span className="text-ok">{e.newValue}</span> <span className="text-grey/60">({e.oldLine}→{e.newLine})</span></>
                  )}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
        {entries.length === 0 && (
          <div className="rounded border border-edge py-6 text-center font-mono text-xs text-grey">
            configs semánticamente idénticas (el orden y los comentarios no cuentan)
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-edge bg-black/30 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Casos de uso reales</h4>
          <ul className="space-y-2 text-xs">
            {CONFDIFF_USECASES.map(([t, d]) => (
              <li key={t}><span className="font-medium text-ink">{t}:</span> <span className="text-grey">{d}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-edge bg-black/30 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-acento">Cómo funciona</h4>
          <ul className="space-y-1.5 text-xs text-grey">
            {CONFDIFF_NOTES.map((n) => <li key={n}>• {n}</li>)}
          </ul>
        </div>
      </div>
    </>
  )
}
