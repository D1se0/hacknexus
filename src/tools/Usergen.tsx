import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { ToolHeader, Badge, CopyBtn, CopyBlock, Field, TextInput, Reveal, InfoBanner, Button } from '../components/ui'
import { buildUserList, userVariants, USERGEN_USE, USERGEN_NOTES, EMAIL_CONVENTIONS, type NamePair } from '../lib/usergen'
import { download } from '../lib/util'

export default function Usergen() {
  const [raw, setRaw] = useState('John Smith\nMaría García\nCarlos López')
  const [domain, setDomain] = useState('empresa.com')
  const [services, setServices] = useState(true)
  const [extraDomains, setExtraDomains] = useState('')

  const names = useMemo<NamePair[]>(() =>
    raw.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const parts = l.split(/\s+/)
      return { first: parts[0] ?? '', last: parts.slice(1).join('') ?? parts[0] ?? '' }
    }), [raw])

  const result = useMemo(() => {
    const extras = extraDomains.split(/[\s,]+/).filter(Boolean)
    return buildUserList(names, domain, services, extras)
  }, [names, domain, services, extraDomains])

  const variants = useMemo(() => userVariants(names.slice(0, 1), domain), [names, domain])

  const dl = (what: 'users' | 'emails') => {
    const list = what === 'users' ? result.users : result.emails
    download(`${what}-hacknexus.txt`, list.join('\n'), 'text/plain')
  }

  return (
    <>
      <ToolHeader icon={Users} title="Usuario Generator" desc="Genera las variaciones de usernames y emails corporativos de una lista de nombres: 9 convenciones (jsmith, j.smith, john.smith…), service accounts típicas y listas listas para kerbrute, spraying y OWA" />

      <InfoBanner>
        <b>¿Por qué las convenciones importan?</b> Password spraying contra AD necesita USERNAMES; OWA/M365 necesita EMAILS.
        Descubrir la convención real (LinkedIn, un email filtrado, firmas) multiplica el éxito de la enumeración — y
        <span className="font-mono"> kerbrute userenum</span> no bloquea cuentas, es siempre el primer paso.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          <Field label="Nombres (uno por línea)" hint="primero apellido — o solo nombre">
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={7} className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs" />
          </Field>
          <Field label="Dominio de email">
            <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} className="font-mono" />
          </Field>
          <Field label="Dominios extra (opcional)" hint="separados por espacio">
            <TextInput value={extraDomains} onChange={(e) => setExtraDomains(e.target.value)} className="font-mono" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-grey">
            <input type="checkbox" checked={services} onChange={(e) => setServices(e.target.checked)} className="accent-[var(--acento)]" />
            añadir service accounts típicas (admin, svc-*, backup…)
          </label>

          <div className="flex gap-2">
            <Button variant="primary" className="flex-1 justify-center" onClick={() => dl('users')}>Descargar users ({result.users.length})</Button>
            <Button variant="ghost" className="flex-1 justify-center" onClick={() => dl('emails')}>Emails ({result.emails.length})</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge tone="ok">{result.users.length} usernames</Badge>
              <Badge tone="info">{result.emails.length} emails</Badge>
            </div>
            <CopyBtn text={result.users.join('\n')} label="Copiar usernames" />
          </div>
          <CopyBlock text={result.users.join('\n')} label="usernames.txt" maxH="20rem" />

          <h4 className="pt-1 text-sm font-semibold">Convenciones generadas (del primer nombre)</h4>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {variants.map((v) => (
              <Reveal key={v.user}>
                <div className="flex items-baseline gap-2 rounded border border-edge px-2 py-1.5">
                  <code className="font-mono text-[12px] text-acento">{v.user}</code>
                  <span className="font-mono text-[10px] text-grey">{v.email}</span>
                  <span className="ml-auto text-[10px] text-grey/60">{v.convention}</span>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="rounded border border-edge bg-black/30 p-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-acento">Cómo usar las listas</h4>
            <ul className="space-y-2 text-[11px]">
              {USERGEN_USE.map(([k, v]) => (
                <li key={k}><span className="font-medium text-ink">{k}:</span> <code className="break-all font-mono text-grey">{v}</code></li>
              ))}
            </ul>
          </div>

          <div className="rounded border border-warn/30 bg-warn/5 p-3">
            <ul className="space-y-1.5 text-[11px] text-grey">
              {USERGEN_NOTES.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
